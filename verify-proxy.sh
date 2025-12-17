#!/bin/bash

echo "🔍 Verifying OAuth Proxy Server Setup..."
echo ""

PROXY_URL="http://localhost:3001"
SUCCESS=true

echo "1️⃣  Checking if proxy server is running..."
if curl -s --max-time 5 "$PROXY_URL/health" > /dev/null 2>&1; then
  echo "   ✅ Proxy server is responding"
  
  HEALTH_JSON=$(curl -s "$PROXY_URL/health")
  echo "   📊 Health Status:"
  echo "$HEALTH_JSON" | jq '.' 2>/dev/null || echo "$HEALTH_JSON"
else
  echo "   ❌ Proxy server is not responding on port 3001"
  echo "   💡 Run: npm run dev:proxy"
  SUCCESS=false
fi
echo ""

echo "2️⃣  Checking port 3001 availability..."
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
  PID=$(lsof -ti:3001)
  echo "   ✅ Port 3001 is in use by process $PID"
else
  echo "   ❌ Nothing is listening on port 3001"
  echo "   💡 Start the proxy: npm run dev:proxy"
  SUCCESS=false
fi
echo ""

echo "3️⃣  Checking environment configuration..."
if [ -f ".env" ]; then
  echo "   ✅ .env file exists"
  
  if grep -q "VITE_PROXY_URL" .env; then
    PROXY_VAR=$(grep "VITE_PROXY_URL" .env)
    echo "   ✅ $PROXY_VAR"
  else
    echo "   ⚠️  VITE_PROXY_URL not found in .env"
    echo "   💡 Add: VITE_PROXY_URL=http://localhost:3001"
  fi
else
  echo "   ❌ .env file not found"
  echo "   💡 Create .env with: VITE_PROXY_URL=http://localhost:3001"
  SUCCESS=false
fi
echo ""

echo "4️⃣  Checking server files..."
if [ -f "server/proxy.js" ]; then
  echo "   ✅ server/proxy.js exists"
else
  echo "   ❌ server/proxy.js not found"
  SUCCESS=false
fi
echo ""

echo "5️⃣  Checking package.json scripts..."
if grep -q "dev:proxy" package.json; then
  echo "   ✅ dev:proxy script configured"
else
  echo "   ❌ dev:proxy script missing"
  SUCCESS=false
fi
echo ""

if [ "$SUCCESS" = true ]; then
  echo "═══════════════════════════════════════════════════"
  echo "✅ All checks passed! Proxy is ready."
  echo "═══════════════════════════════════════════════════"
  echo ""
  echo "📍 Proxy endpoints:"
  echo "   Health:    $PROXY_URL/health"
  echo "   Callback:  $PROXY_URL/oauth/callback"
  echo ""
  exit 0
else
  echo "═══════════════════════════════════════════════════"
  echo "❌ Some checks failed. Please fix the issues above."
  echo "═══════════════════════════════════════════════════"
  echo ""
  echo "Quick fix:"
  echo "  npm run dev"
  echo ""
  exit 1
fi
