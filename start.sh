#!/bin/bash

# Kill all child processes (backend) when this script exits
trap "kill 0" EXIT

echo "🚀 Starting Jimeng Demo..."

# Function to kill process on port
# Function to kill process on port
kill_port() {
    local port=$1
    # Use -t for terse output (pid only), -i for port
    # Redirect stderr to /dev/null to hide errors if lsof is missing or matches nothing
    local pid=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$pid" ]; then
        echo "🧹 Killing process on port $port (PID: $pid)..."
        kill -9 $pid 2>/dev/null || true
    fi
}

# Cleanup existing processes
kill_port 3000
kill_port 5173

# Start Backend in background
echo "📦 Starting Backend Server (Port 3000)..."
(cd jimeng-demo/server && node index.js) &

# Wait a moment for backend to warm up
sleep 2

# Start Frontend in foreground
echo "🎨 Starting Frontend (Vite)..."
(cd jimeng-demo && pnpm dev)
