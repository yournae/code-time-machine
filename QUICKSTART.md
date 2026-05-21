# Code Time Machine - Quick Start Guide

## Prerequisites

- Python 3.11+
- Node.js 18+
- Git

## Installation

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Edit .env and add your LLM API key (optional - will use mock responses if not set)
# LLM_API_KEY=your_api_key_here

# Run backend
uvicorn api:app --reload
```

Backend will be available at `http://localhost:8000`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

Frontend will be available at `http://localhost:3000`

## Docker Setup (Alternative)

```bash
# From project root
cd docker

# Copy environment file
cp ../backend/.env.example .env

# Edit .env with your API keys (optional)

# Start services
docker-compose up --build
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`

## Usage

1. Open `http://localhost:3000` in your browser
2. Enter a git repository path (e.g., `/home/user/projects/my-app`)
3. Click "Analyze"
4. Explore the interactive timeline
5. Click any commit to see AI-powered analysis

## Example Repositories to Try

```bash
# Clone a sample repo to analyze
git clone https://github.com/torvalds/linux /tmp/linux
# Then analyze: /tmp/linux

# Or use this project itself
# Analyze: /tmp/code-time-machine
```

## API Endpoints

- `POST /analyze` - Analyze a repository
- `GET /timeline/{repo_id}` - Get commit timeline
- `GET /commit/{repo_id}/{sha}` - Get commit details with AI explanation
- `GET /file-history/{repo_id}?file_path=...` - Get file evolution
- `GET /patterns/{repo_id}` - Detect code patterns
- `GET /rewind/{repo_id}/{sha}` - Rewind to specific commit

## Configuration

### Backend (.env)

```bash
LLM_API_KEY=your_api_key_here
LLM_API_URL=https://api.openai.com/v1/chat/completions
LLM_MODEL=gpt-4
HOST=0.0.0.0
PORT=8000
```

### Frontend

Set `NEXT_PUBLIC_API_URL` environment variable:

```bash
export NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

## Features

✅ **Interactive Timeline** - D3.js visualization of commit history
✅ **AI Explanations** - LLM-powered analysis of changes
✅ **Pattern Detection** - Identify dead code, regressions, architectural shifts
✅ **File Evolution** - Track how files changed over time
✅ **Commit Details** - Deep dive into any commit
✅ **Mock Mode** - Works without API keys for testing

## Troubleshooting

### Backend Issues

**Error: Invalid git repository**
- Ensure the path points to a valid git repository
- Check that `.git` folder exists

**Error: LLM API failed**
- Check your API key in `.env`
- Verify API URL is correct
- Mock responses will be used if API fails

### Frontend Issues

**Cannot connect to backend**
- Ensure backend is running on port 8000
- Check `NEXT_PUBLIC_API_URL` environment variable

**Timeline not rendering**
- Check browser console for errors
- Ensure D3.js loaded correctly

## Development

### Backend Testing

```bash
cd backend
python -c "from git_analyzer import GitAnalyzer; a = GitAnalyzer('.'); print(a.get_timeline(limit=5))"
```

### Frontend Development

```bash
cd frontend
npm run dev
# Edit components in real-time with hot reload
```

## Next Steps

- Add authentication for multi-user support
- Implement caching for faster analysis
- Add export functionality (PDF/Markdown reports)
- Support for remote repositories (GitHub, GitLab)
- Advanced pattern detection with ML models

## License

MIT
