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
│   └── api.py             # REST API endpoints
├── frontend/          # Next.js + D3.js visualization
│   ├── components/
│   │   ├── Timeline.tsx   # Interactive timeline
│   │   └── CommitDetails.tsx # Commit details view
│   └── pages/
└── docker/            # Deployment configs
```

## Tech Stack

**Backend**:
- Python 3.11+ (FastAPI)
- GitPython (git history parsing)
- LLM API (change explanation)

**Frontend**:
- Next.js 14 (React framework)
- D3.js (timeline visualization)
- TailwindCSS (styling)

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
GET  /timeline?repo_path=...         # Get commit timeline
GET  /commit?repo_path=...&sha=...   # Get commit details + AI explanation
GET  /file-history?repo_path=...&file_path=... # Get file evolution
GET  /patterns?repo_path=...         # Detect code patterns
GET  /diff?repo_path=...&sha1=...&sha2=...  # Get diff between commits
GET  /rewind?repo_path=...&sha=...   # Rewind to specific commit
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
- [x] Interactive timeline visualization
- [ ] Pattern detection (dead code, regressions)
- [ ] Multi-repo comparison
- [ ] Export reports (PDF/Markdown)

## License

MIT - see [LICENSE](LICENSE)
