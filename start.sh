#!/bin/bash

# Kill all child processes (backend) when this script exits
trap "kill 0" EXIT

echo "🚀 Starting Jimeng Demo..."

# Function to kill process on port
kill_port() {
    local port=$1
    local pid=$(lsof -ti:$port)
    if [ -n "$pid" ]; then
        echo "🧹 Killing process on port $port (PID: $pid)..."
        kill -9 $pid
    fi
}

# Cleanup existing processes
kill_port 3001
kill_port 5173

# Start Backend in background
echo "📦 Starting Backend Server (Port 3001)..."
(cd jimeng-demo/server && node index.js) &

# Wait a moment for backend to warm up
sleep 2

# Start Frontend in foreground
echo "🎨 Starting Frontend (Vite)..."
(cd jimeng-demo && pnpm dev)
