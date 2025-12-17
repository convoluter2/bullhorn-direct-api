#!/bin/bash

echo "🔄 Restarting OAuth Proxy Server..."

# Kill existing proxy process on port 3001
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
  echo "⚠️  Killing existing proxy process on port 3001..."
  lsof -ti:3001 | xargs kill -9 2>/dev/null
  sleep 2
fi

# Start the proxy server
echo "🎯 Starting proxy on port 3001..."
node server/proxy.js &
PROXY_PID=$!

# Save PID to file for future reference
mkdir -p pids
echo $PROXY_PID > pids/proxy.pid
echo "💾 Saved proxy PID: $PROXY_PID"

# Wait for proxy to be ready
echo "⏳ Waiting for proxy to be ready..."
for i in {1..15}; do
  if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Proxy server restarted successfully!"
    echo "📍 Callback URL: http://localhost:3001/oauth/callback"
    echo "💚 Health check: http://localhost:3001/health"
    echo "🆔 Process ID: $PROXY_PID"
    exit 0
  fi
  echo "   Attempt $i/15..."
  sleep 1
done

echo "❌ Proxy server failed to start after restart"
kill $PROXY_PID 2>/dev/null
rm -f pids/proxy.pid
exit 1
