#!/bin/bash

# AI Private Search Customer Manager Startup Script
# Ubuntu/macOS compatible version

cd "$(dirname "$0")"

echo "🚀 Starting AI Private Search Customer Manager..."

# Read ports from app.json - ONLY use config file values
if [ ! -f "client/c01_client-first-app/config/app.json" ]; then
    echo "❌ Config file not found: client/c01_client-first-app/config/app.json"
    exit 1
fi

FRONTEND_PORT=$(node -p "JSON.parse(require('fs').readFileSync('./client/c01_client-first-app/config/app.json', 'utf8')).ports.frontend")
BACKEND_PORT=$(node -p "JSON.parse(require('fs').readFileSync('./client/c01_client-first-app/config/app.json', 'utf8')).ports.backend")

if [ -z "$FRONTEND_PORT" ] || [ -z "$BACKEND_PORT" ]; then
    echo "❌ Failed to read ports from config file"
    exit 1
fi

# Kill any existing custmgr server processes to free up ports
lsof -ti :$BACKEND_PORT | xargs kill -9 2>/dev/null || true
lsof -ti :$FRONTEND_PORT | xargs kill -9 2>/dev/null || true
# Only kill custmgr specific processes (avoid killing AIPrivateSearch)
pkill -f "aiprivatesearchcustmgr" 2>/dev/null || true
sleep 2

# Start backend server
echo "🔧 Starting backend server..."
cd server/s01_server-first-app

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing server dependencies..."
    npm install --silent --no-audit --no-fund
fi

npm start > ../../logs/backend-startup.log 2>&1 &
BACKEND_PID=$!

# Wait for backend to start
sleep 3
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ Backend server failed to start"
    echo "📋 Backend startup log:"
    cat ../../logs/backend-startup.log 2>/dev/null || echo "No log file found"
    exit 1
fi
echo "✅ Backend server started"

# Start frontend client
cd ../../client/c01_client-first-app

echo "🔧 Starting frontend server..."
npx serve . -l $FRONTEND_PORT >/dev/null 2>&1 &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 3
if kill -0 $FRONTEND_PID 2>/dev/null; then
    echo "✅ Frontend server started"
else
    echo "❌ Frontend server failed to start"
fi

echo ""
echo "✅ Application started successfully!"
echo "🔗 Frontend: http://localhost:$FRONTEND_PORT"
echo "🔗 Backend API: http://localhost:$BACKEND_PORT"
echo ""

# Open browser only if not on Ubuntu server (detect GUI availability)
if [ -n "$DISPLAY" ] || [ "$(uname)" = "Darwin" ]; then
    echo "🌐 Opening browser..."
    if command -v open >/dev/null 2>&1; then
        open "http://localhost:$FRONTEND_PORT"
    elif command -v xdg-open >/dev/null 2>&1; then
        xdg-open "http://localhost:$FRONTEND_PORT"
    fi
else
    echo "Server mode detected - browser not opened"
    echo "Access application at: http://localhost:$FRONTEND_PORT"
fi

echo ""
echo "Press Ctrl+C to stop both servers"

# Cleanup function
cleanup() {
    echo "Stopping servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    sleep 1
    lsof -ti :$BACKEND_PORT | xargs kill -9 2>/dev/null || true
    lsof -ti :$FRONTEND_PORT | xargs kill -9 2>/dev/null || true
    exit 0
}

# Set trap for cleanup
trap cleanup SIGINT SIGTERM

# Wait for processes (Ubuntu compatible)
wait $BACKEND_PID $FRONTEND_PID