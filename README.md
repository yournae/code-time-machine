# 🕰️ Code Time Machine

AI-powered Git history analyzer that visualizes code evolution and provides intelligent insights.

## ✨ Features

### Core
- **Commit Timeline** — Interactive D3.js visualization of commit history
- **AI Explanations** — LLM-powered analysis of why code changed
- **File History** — Track evolution of individual files
- **Pattern Detection** — Identify code patterns and architectural shifts

### New in v2.0
- **🧬 Code DNA** — Phylogenetic tree showing how files evolved, split, merged, and died
- **🔍 Git Blame AI** — Supercharged blame that explains WHY each line exists, not just who wrote it
- **🏚️ Dead Code Detector** — Find abandoned, stale, zombie, and orphaned files with AI cleanup recommendations
- **🌙 Dark Mode** — Full dark theme support
- **📥 Export** — Export visualizations as PNG, SVG, or PDF
- **⚡ WebSocket Streaming** — Real-time AI analysis via WebSocket

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 20+
- Git

### Backend
```bash
cd backend
pip install -r requirements.txt
python api.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Docker
```bash
REPO_PATH=/path/to/your/repos docker compose -f docker/docker-compose.yml up
```

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/analyze` | POST | Analyze a repository |
| `/timeline` | GET | Get commit timeline |
| `/commit` | GET | Get commit details with AI explanation |
| `/file-history` | GET | Get file evolution history |
| `/patterns` | GET | Detect code patterns |
| `/diff` | GET | Get diff between commits |
| `/rewind` | GET | Rewind to specific commit |
| `/code-dna` | GET | Get phylogenetic DNA tree |
| `/blame` | GET | AI-enhanced file blame |
| `/dead-code` | GET | Detect dead/abandoned code |
| `/health` | GET | Health check |
| `/ws/explain` | WS | WebSocket for streaming AI |

## 🏗️ Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Frontend   │────▶│   Backend    │────▶│  Git Repos  │
│  Next.js 15  │     │   FastAPI    │     │  (local)    │
│  D3.js       │     │  GitPython   │     └─────────────┘
│  Tailwind    │     │  AI/LLM      │
└─────────────┘     └──────────────┘
```

## 🧪 Testing

```bash
# Backend
cd backend && pytest -v

# Frontend
cd frontend && npm run build
```

## 🔒 Security

- Path traversal protection with allowlisted directories
- CORS restricted to specific origins
- Error messages sanitized (no internal paths)
- Docker runs as non-root user
- Health checks on all containers

## 📝 License

MIT License - see [LICENSE](LICENSE)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push and create a Pull Request
