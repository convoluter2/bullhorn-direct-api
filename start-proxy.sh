#!/bin/bash

echo "🚀 Starting OAuth Proxy Server..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Check if port 3001 is in use
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
  echo "⚠️  Port 3001 is already in use. Killing existing process..."
  lsof -ti:3001 | xargs kill -9
  sleep 1
fi

# Start the proxy server
echo "🎯 Starting proxy on port 3001..."
node server/proxy.js &
PROXY_PID=$!

# Wait for proxy to be ready
echo "⏳ Waiting for proxy to be ready..."
for i in {1..10}; do
  if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Proxy server is ready!"
    echo "📍 Callback URL: http://localhost:3001/oauth/callback"
    echo "💚 Health check: http://localhost:3001/health"
    echo ""
    echo "🎉 You can now run: npm run dev:vite"
    exit 0
  fi
  echo "   Attempt $i/10..."
  sleep 1
done

echo "❌ Proxy server failed to start"
kill $PROXY_PID 2>/dev/null
exit 1
