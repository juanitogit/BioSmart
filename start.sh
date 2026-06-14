#!/bin/bash
# Start Node server in background
node_modules/.bin/tsx client/src/server/index.ts &
SERVER_PID=$!

# Start Vite frontend
cd client && npx vite --host 0.0.0.0 --port 5000

# If vite exits, kill server too
kill $SERVER_PID
