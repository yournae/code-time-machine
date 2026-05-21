#!/bin/bash
# Local demo deployment script

echo "🚀 Starting Code Time Machine Demo..."

# Check if backend venv exists
if [ ! -d "backend/venv" ]; then
    echo "📦 Creating virtual environment..."
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    cd ..
else
    echo "✅ Virtual environment exists"
fi

# Start backend
echo "🔧 Starting backend server..."
cd backend
source venv/bin/activate
uvicorn api:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

echo "⏳ Waiting for backend to start..."
sleep 5

# Test backend
echo "🧪 Testing backend..."
HEALTH=$(curl -s http://localhost:8000/health | jq -r '.status')
if [ "$HEALTH" = "ok" ]; then
    echo "✅ Backend is healthy!"
else
    echo "❌ Backend health check failed"
    kill $BACKEND_PID
    exit 1
fi

# Test analyze endpoint
echo "🧪 Testing analyze endpoint..."
RESULT=$(curl -s -X POST http://localhost:8000/analyze \
    -H "Content-Type: application/json" \
    -d '{"repo_path": "/tmp/code-time-machine", "limit": 3}' \
    | jq -r '.total_commits')

if [ "$RESULT" -gt 0 ]; then
    echo "✅ Analyze endpoint working! Found $RESULT commits"
else
    echo "❌ Analyze endpoint failed"
    kill $BACKEND_PID
    exit 1
fi

echo ""
echo "🎉 Demo is running!"
echo ""
echo "📍 Backend API: http://localhost:8000"
echo "📍 API Docs: http://localhost:8000/docs"
echo "📍 Health Check: http://localhost:8000/health"
echo ""
echo "🧪 Test with:"
echo "  curl -X POST http://localhost:8000/analyze \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"repo_path\": \"/tmp/code-time-machine\", \"limit\": 5}'"
echo ""
echo "Press Ctrl+C to stop..."

# Wait for user interrupt
trap "echo ''; echo '🛑 Stopping demo...'; kill $BACKEND_PID; exit 0" INT
wait $BACKEND_PID
