#!/bin/bash

# start_server.sh - Start the local development server for LetMeTryAI

PORT=8080
echo "Starting LetMeTryAI local development server..."

# Check if port is in use
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; then
    echo "Warning: Port $PORT is already in use."
fi

# Check if npm is available and package.json exists
if command -v npm >/dev/null 2>&1 && [ -f "package.json" ]; then
    echo "Using npm run serve..."
    echo "Server will be available at http://localhost:$PORT"
    npm run serve
elif command -v python3 >/dev/null 2>&1; then
    echo "npm not found or package.json missing. Using python3..."
    echo "Server will be available at http://localhost:$PORT"
    python3 -m http.server $PORT
else
    echo "Error: Neither npm nor python3 found. Please install Python 3 or Node.js."
    exit 1
fi
