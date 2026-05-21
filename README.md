# Code Time Machine 🕰️

AI-powered Git history analyzer that tells the **story** of your code evolution.

## Features

- 📊 **Interactive Timeline**: Visualize code evolution over time
- 🔍 **Smart Rewind**: Jump to any commit and see what changed + why
- 🤖 **AI Explanations**: Understand the reasoning behind changes
- 🎯 **Pattern Detection**: Identify dead code, performance shifts, architectural changes
- 📈 **Evolution Narrative**: Not just blame/log, but the *story* of your code

## Architecture

```
code-time-machine/
├── backend/           # Python FastAPI server
│   ├── git_analyzer.py    # Git history parsing
│   ├── ai_explainer.py    # LLM-powered change analysis
│   ├── pattern_detector.py # Code pattern recognition
│   └── api.py             # REST API endpoints
├── frontend/          # Next.js + D3.js visualization
│   ├── components/
│   │   ├── Timeline.tsx   # Interactive timeline
│   │   ├── CodeDiff.tsx   # Side-by-side diff viewer
│   │   └── Narrative.tsx  # AI-generated story
│   └── pages/
└── docker/            # Deployment configs
```

## Tech Stack

**Backend**:
- Python 3.11+ (FastAPI)
- GitPython (git history parsing)
- Tree-sitter (AST parsing)
- LLM API (change explanation)

**Frontend**:
- Next.js 14 (React framework)
- D3.js (timeline visualization)
- Monaco Editor (code viewer)
- TailwindCSS (styling)

**Database**:
- SQLite (cache analysis results)

## Quick Start

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn api:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

## API Endpoints

```
POST /analyze          # Analyze a git repository
GET  /timeline/:repo   # Get commit timeline
GET  /commit/:sha      # Get commit details + AI explanation
GET  /patterns/:repo   # Detect code patterns
GET  /rewind/:repo/:sha # Rewind to specific commit
```

## Usage

1. Point to a git repository
2. Code Time Machine analyzes commit history
3. Interactive timeline shows evolution
4. Click any point → see changes + AI explanation
5. Detect patterns: dead code, performance regressions, architectural shifts

## Example Output

```
📅 2024-03-15 | Commit abc123
🔧 Refactored authentication logic

AI Analysis:
"This commit replaced JWT tokens with session-based auth.
Performance improved 2.3x due to reduced token validation overhead.
Security posture strengthened with HttpOnly cookies."

Files Changed: 8 files, +234 -189 lines
Impact: High (core authentication)
Pattern: Architectural shift (stateless → stateful)
```

## Roadmap

- [x] Git history parsing
- [x] AI-powered change explanation
- [ ] Interactive timeline visualization
- [ ] Pattern detection (dead code, regressions)
- [ ] Multi-repo comparison
- [ ] Export reports (PDF/Markdown)

## License

MIT
