import logging
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any
from pathlib import Path

from git_analyzer import GitAnalyzer
from ai_explainer import AIExplainer

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Code Time Machine API",
    description="AI-powered Git history analyzer",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_REPO_ROOTS = [
    Path.home(),
    Path("/tmp"),
    Path("/var/repos"),
]

def validate_repo_path(repo_path: str) -> Path:
    """Validate and resolve repo path, preventing path traversal."""
    resolved = Path(repo_path).resolve()
    if not any(resolved == root or str(resolved).startswith(str(root) + "/") for root in ALLOWED_REPO_ROOTS):
        raise HTTPException(status_code=403, detail="Access to this path is not allowed")
    if not resolved.is_dir():
        raise HTTPException(status_code=400, detail="Path is not a directory")
    return resolved

# Global state
MAX_ANALYZERS = 50
analyzers: dict[str, GitAnalyzer] = {}
explainer = AIExplainer()

# Helper validation functions
def validate_analyze_request(data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate analyze request."""
    if not isinstance(data.get('repo_path'), str):
        raise ValueError("repo_path must be a string")
    limit = data.get('limit', 100)
    if not isinstance(limit, int) or limit < 1:
        raise ValueError("limit must be a positive integer")
    return {'repo_path': data['repo_path'], 'limit': limit}

# Helper functions
def get_analyzer(repo_path: str) -> GitAnalyzer:
    """Get or create analyzer for repository with LRU-style eviction."""
    if repo_path not in analyzers:
        if len(analyzers) >= MAX_ANALYZERS:
            # Remove oldest entry
            oldest_key = next(iter(analyzers))
            del analyzers[oldest_key]
        analyzers[repo_path] = GitAnalyzer(repo_path)
    return analyzers[repo_path]

# API Endpoints

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "Code Time Machine"}

@app.post("/analyze")
async def analyze_repository(request: Dict[str, Any]):
    """Analyze a git repository and return timeline."""
    try:
        validated = validate_analyze_request(request)
        repo_path = validate_repo_path(validated['repo_path'])
        
        if not (repo_path / ".git").exists():
            raise HTTPException(status_code=400, detail="Not a git repository")
        
        analyzer = get_analyzer(str(repo_path))
        timeline = analyzer.get_timeline(limit=validated['limit'])
        patterns = analyzer.detect_patterns()
        
        return {
            "repo_path": str(repo_path),
            "total_commits": patterns['total_commits'],
            "total_authors": patterns['total_authors'],
            "timeline": [
                {
                    "sha": c.sha,
                    "message": c.message,
                    "author": c.author,
                    "date": c.date,
                    "files_changed": c.files_changed,
                    "insertions": c.insertions,
                    "deletions": c.deletions
                }
                for c in timeline
            ]
        }
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail="Invalid request")
    except Exception as e:
        logger.error(f"Error analyzing repo: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/timeline")
async def get_timeline(repo_path: str, limit: int = 100):
    """Get commit timeline for a repository."""
    try:
        path = validate_repo_path(repo_path)
        analyzer = get_analyzer(str(path))
        timeline = analyzer.get_timeline(limit=limit)
        
        return {
            "repo_path": str(path),
            "commits": timeline,
            "total": len(timeline)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting timeline: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/commit")
async def get_commit_details(repo_path: str, sha: str):
    """Get detailed information about a specific commit with AI explanation."""
    try:
        path = validate_repo_path(repo_path)
        analyzer = get_analyzer(str(path))
        
        commit_data = analyzer.get_commit_details(sha)
        explanation = await explainer.explain_commit(commit_data)
        
        return {
            "sha": commit_data['sha'],
            "message": commit_data['message'],
            "author": commit_data['author'],
            "date": commit_data['date'],
            "changed_files": commit_data['changed_files'],
            "stats": commit_data['stats'],
            "explanation": explanation
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting commit details: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/file-history")
async def get_file_history(repo_path: str, file_path: str, limit: int = 50):
    """Get history of changes for a specific file."""
    try:
        path = validate_repo_path(repo_path)
        analyzer = get_analyzer(str(path))
        
        history = analyzer.get_file_history(file_path, limit=limit)
        narrative = await explainer.explain_file_evolution(history)
        
        return {
            "file_path": file_path,
            "history": history,
            "narrative": narrative
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting file history: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/patterns")
async def detect_patterns(repo_path: str):
    """Detect code patterns and changes over time."""
    try:
        path = validate_repo_path(repo_path)
        analyzer = get_analyzer(str(path))
        
        patterns_data = analyzer.detect_patterns()
        
        # Get recent commits for pattern analysis
        timeline = analyzer.get_timeline(limit=50)
        commits_data = [
            {
                'sha': c.sha,
                'message': c.message,
                'date': c.date,
                'files_changed': c.files_changed,
                'insertions': c.insertions,
                'deletions': c.deletions,
            }
            for c in timeline
        ]
        
        patterns = await explainer.detect_code_patterns(commits_data)
        
        return {
            "total_commits": patterns_data['total_commits'],
            "total_authors": patterns_data['total_authors'],
            "patterns": patterns
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error detecting patterns: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/diff")
async def get_diff(repo_path: str, sha1: str, sha2: str):
    """Get diff between two commits."""
    try:
        path = validate_repo_path(repo_path)
        analyzer = get_analyzer(str(path))
        
        diff = analyzer.get_diff(sha1, sha2)
        
        return {
            "sha1": sha1,
            "sha2": sha2,
            "diff": diff[:5000]  # Limit diff size
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting diff: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/rewind")
async def rewind_to_commit(repo_path: str, sha: str):
    """Get state at a specific commit (metadata only)."""
    try:
        path = validate_repo_path(repo_path)
        analyzer = get_analyzer(str(path))
        
        commit_data = analyzer.get_commit_details(sha)
        explanation = await explainer.explain_commit(commit_data)
        
        return {
            "commit": commit_data,
            "explanation": explanation,
            "message": f"Rewound to commit {sha}"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rewinding: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/code-dna")
async def get_code_dna(repo_path: str):
    """Get phylogenetic DNA tree of the codebase."""
    try:
        path = validate_repo_path(repo_path)
        analyzer = get_analyzer(str(path))
        tree = analyzer.get_file_tree_for_dna()
        narrative = await explainer.generate_dna_narrative(tree)
        tree["narrative"] = narrative
        return tree
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting code DNA: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/blame")
async def get_blame(repo_path: str, file_path: str):
    """Get AI-enhanced blame for a file."""
    try:
        path = validate_repo_path(repo_path)
        analyzer = get_analyzer(str(path))
        blame_data = analyzer.supercharged_blame(file_path)
        ai_context = await explainer.explain_blame_context(blame_data)
        blame_data["ai_context"] = ai_context
        return blame_data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting blame: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/dead-code")
async def get_dead_code(repo_path: str):
    """Detect dead/abandoned code in the repository."""
    try:
        path = validate_repo_path(repo_path)
        analyzer = get_analyzer(str(path))
        dead_code = analyzer.detect_dead_code()
        ai_recs = await explainer.explain_dead_code(dead_code)
        dead_code["ai_recommendations"] = ai_recs
        return dead_code
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error detecting dead code: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@app.websocket("/ws/explain")
async def websocket_explain(websocket: WebSocket):
    """WebSocket endpoint for streaming AI explanations."""
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("action")
            repo_path = data.get("repo_path", "")
            
            if action == "explain_commit":
                path = validate_repo_path(repo_path)
                analyzer = get_analyzer(str(path))
                commit_data = analyzer.get_commit_details(data["sha"])
                
                # Stream the explanation
                await websocket.send_json({"status": "processing", "message": "Analyzing commit..."})
                explanation = await explainer.explain_commit(commit_data)
                await websocket.send_json({"status": "complete", "data": explanation})
            
            elif action == "blame":
                path = validate_repo_path(repo_path)
                analyzer = get_analyzer(str(path))
                await websocket.send_json({"status": "processing", "message": "Running blame analysis..."})
                blame_data = analyzer.supercharged_blame(data["file_path"])
                await websocket.send_json({"status": "processing", "message": "Generating AI context..."})
                ai_context = await explainer.explain_blame_context(blame_data)
                blame_data["ai_context"] = ai_context
                await websocket.send_json({"status": "complete", "data": blame_data})
            
            elif action == "dead_code":
                path = validate_repo_path(repo_path)
                analyzer = get_analyzer(str(path))
                await websocket.send_json({"status": "processing", "message": "Scanning for dead code..."})
                dead_code = analyzer.detect_dead_code()
                await websocket.send_json({"status": "processing", "message": "Generating recommendations..."})
                ai_recs = await explainer.explain_dead_code(dead_code)
                dead_code["ai_recommendations"] = ai_recs
                await websocket.send_json({"status": "complete", "data": dead_code})
            
            elif action == "dna":
                path = validate_repo_path(repo_path)
                analyzer = get_analyzer(str(path))
                await websocket.send_json({"status": "processing", "message": "Building DNA tree..."})
                tree = analyzer.get_file_tree_for_dna()
                await websocket.send_json({"status": "processing", "message": "Generating evolution narrative..."})
                narrative = await explainer.generate_dna_narrative(tree)
                tree["narrative"] = narrative
                await websocket.send_json({"status": "complete", "data": tree})
            
            else:
                await websocket.send_json({"status": "error", "message": f"Unknown action: {action}"})
    
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
        try:
            await websocket.send_json({"status": "error", "message": "Internal error"})
        except Exception:
            pass

@app.get("/")
async def root():
    """Root endpoint with API documentation."""
    return {
        "service": "Code Time Machine",
        "version": "1.0.0",
        "description": "AI-powered Git history analyzer",
        "endpoints": {
            "POST /analyze": "Analyze a repository",
            "GET /timeline": "Get commit timeline (params: repo_path, limit)",
            "GET /commit": "Get commit details with AI explanation (params: repo_path, sha)",
            "GET /file-history": "Get file evolution (params: repo_path, file_path, limit)",
            "GET /patterns": "Detect code patterns (params: repo_path)",
            "GET /diff": "Get diff between commits (params: repo_path, sha1, sha2)",
            "GET /rewind": "Rewind to specific commit (params: repo_path, sha)",
            "GET /code-dna": "Get phylogenetic DNA tree (params: repo_path)",
            "GET /blame": "AI-enhanced file blame (params: repo_path, file_path)",
            "GET /dead-code": "Detect dead/abandoned code (params: repo_path)",
            "WS /ws/explain": "WebSocket for streaming AI (actions: explain_commit, blame, dead_code, dna)",
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
