#!/bin/sh
set -e

# Ensure data directory exists (volume mount point)
mkdir -p ./data

echo "[start] launching scanner..."
node scanner.js &
SCANNER_PID=$!

echo "[start] launching web server..."
node server.js &
SERVER_PID=$!

# If either process exits, kill the other and exit
wait -n 2>/dev/null || true
echo "[start] a process exited, shutting down..."
kill $SCANNER_PID $SERVER_PID 2>/dev/null
wait
