from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import os
from pathlib import Path
import asyncio

from git_analyzer import GitAnalyzer, CommitInfo
from ai_explainer import AIExplainer

app = FastAPI(
    title="Code Time Machine API",
    description="AI-powered Git history analyzer",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state
analyzers = {}
explainer = AIExplainer()

# Request/Response models
class AnalyzeRequest(BaseModel):
    repo_path: str
    limit: int = 100

class AnalyzeResponse(BaseModel):
    repo_path: str
    total_commits: int
    total_authors: int
    timeline: List[CommitInfo]

class CommitDetailsResponse(BaseModel):
    sha: str
    message: str
    author: str
    date: str
    changed_files: list
    stats: dict
    explanation: dict

class FileHistoryResponse(BaseModel):
    file_path: str
    history: List[dict]
    narrative: str

class PatternsResponse(BaseModel):
    total_commits: int
    total_authors: int
    patterns: dict

# Helper functions
def get_analyzer(repo_path: str) -> GitAnalyzer:
    """Get or create analyzer for repository."""
    if repo_path not in analyzers:
        analyzers[repo_path] = GitAnalyzer(repo_path)
    return analyzers[repo_path]

# API Endpoints

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "Code Time Machine"}

@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_repository(request: AnalyzeRequest):
    """Analyze a git repository and return timeline."""
    try:
        repo_path = Path(request.repo_path).resolve()
        
        if not repo_path.exists():
            raise HTTPException(status_code=404, detail="Repository path not found")
        
        analyzer = get_analyzer(str(repo_path))
        timeline = analyzer.get_timeline(limit=request.limit)
        patterns = analyzer.detect_patterns()
        
        return AnalyzeResponse(
            repo_path=str(repo_path),
            total_commits=patterns['total_commits'],
            total_authors=patterns['total_authors'],
            timeline=timeline
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing repository: {e}")

@app.get("/timeline/{repo_id}")
async def get_timeline(repo_id: str, limit: int = 100):
    """Get commit timeline for a repository."""
    try:
        # For now, repo_id is the path (URL encoded)
        repo_path = Path(repo_id).resolve()
        analyzer = get_analyzer(str(repo_path))
        timeline = analyzer.get_timeline(limit=limit)
        
        return {
            "repo_path": str(repo_path),
            "commits": timeline,
            "total": len(timeline)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/commit/{repo_id}/{sha}", response_model=CommitDetailsResponse)
async def get_commit_details(repo_id: str, sha: str):
    """Get detailed information about a specific commit with AI explanation."""
    try:
        repo_path = Path(repo_id).resolve()
        analyzer = get_analyzer(str(repo_path))
        
        commit_data = analyzer.get_commit_details(sha)
        explanation = await explainer.explain_commit(commit_data)
        
        return CommitDetailsResponse(
            sha=commit_data['sha'],
            message=commit_data['message'],
            author=commit_data['author'],
            date=commit_data['date'],
            changed_files=commit_data['changed_files'],
            stats=commit_data['stats'],
            explanation=explanation
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/file-history/{repo_id}")
async def get_file_history(repo_id: str, file_path: str, limit: int = 50):
    """Get history of changes for a specific file."""
    try:
        repo_path = Path(repo_id).resolve()
        analyzer = get_analyzer(str(repo_path))
        
        history = analyzer.get_file_history(file_path, limit=limit)
        narrative = await explainer.explain_file_evolution(history)
        
        return FileHistoryResponse(
            file_path=file_path,
            history=history,
            narrative=narrative
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/patterns/{repo_id}", response_model=PatternsResponse)
async def detect_patterns(repo_id: str):
    """Detect code patterns and changes over time."""
    try:
        repo_path = Path(repo_id).resolve()
        analyzer = get_analyzer(str(repo_path))
        
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
        
        return PatternsResponse(
            total_commits=patterns_data['total_commits'],
            total_authors=patterns_data['total_authors'],
            patterns=patterns
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/diff/{repo_id}")
async def get_diff(repo_id: str, sha1: str, sha2: str):
    """Get diff between two commits."""
    try:
        repo_path = Path(repo_id).resolve()
        analyzer = get_analyzer(str(repo_path))
        
        diff = analyzer.get_diff(sha1, sha2)
        
        return {
            "sha1": sha1,
            "sha2": sha2,
            "diff": diff[:5000]  # Limit diff size
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/rewind/{repo_id}/{sha}")
async def rewind_to_commit(repo_id: str, sha: str):
    """Get state at a specific commit (metadata only)."""
    try:
        repo_path = Path(repo_id).resolve()
        analyzer = get_analyzer(str(repo_path))
        
        commit_data = analyzer.get_commit_details(sha)
        explanation = await explainer.explain_commit(commit_data)
        
        return {
            "commit": commit_data,
            "explanation": explanation,
            "message": f"Rewound to commit {sha}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    """Root endpoint with API documentation."""
    return {
        "service": "Code Time Machine",
        "version": "1.0.0",
        "description": "AI-powered Git history analyzer",
        "endpoints": {
            "POST /analyze": "Analyze a repository",
            "GET /timeline/{repo_id}": "Get commit timeline",
            "GET /commit/{repo_id}/{sha}": "Get commit details with AI explanation",
            "GET /file-history/{repo_id}": "Get file evolution history",
            "GET /patterns/{repo_id}": "Detect code patterns",
            "GET /diff/{repo_id}": "Get diff between commits",
            "GET /rewind/{repo_id}/{sha}": "Rewind to specific commit",
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
