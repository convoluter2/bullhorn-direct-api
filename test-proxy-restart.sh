#!/bin/bash

echo "🧪 ═══════════════════════════════════════════════════"
echo "🧪 Testing Proxy Restart Functionality"
echo "═══════════════════════════════════════════════════"
echo ""

PROXY_URL="http://localhost:3001"
PASS_COUNT=0
FAIL_COUNT=0

test_step() {
  local description=$1
  local command=$2
  
  echo ""
  echo "▶ Testing: $description"
  
  if eval "$command"; then
    echo "✅ PASS: $description"
    ((PASS_COUNT++))
    return 0
  else
    echo "❌ FAIL: $description"
    ((FAIL_COUNT++))
    return 1
  fi
}

echo "1️⃣ Checking if proxy is running..."
if curl -s ${PROXY_URL}/health > /dev/null 2>&1; then
  echo "✅ Proxy is running"
  PROXY_WAS_RUNNING=true
else
  echo "⚠️  Proxy is not running, starting it..."
  PROXY_WAS_RUNNING=false
  bash start-proxy.sh
  sleep 3
fi

test_step "Health endpoint responds" \
  "curl -s ${PROXY_URL}/health | grep -q 'healthy'"

test_step "Health endpoint returns JSON with status" \
  "curl -s ${PROXY_URL}/health | jq -e '.status == \"healthy\"' > /dev/null 2>&1"

test_step "Restart endpoint accepts POST request" \
  "curl -X POST -s ${PROXY_URL}/restart | jq -e '.success == true' > /dev/null 2>&1"

echo ""
echo "⏳ Waiting for restart to complete..."
sleep 5

test_step "Proxy comes back online after restart" \
  "curl -s ${PROXY_URL}/health > /dev/null 2>&1"

test_step "Pending auth cache is cleared after restart" \
  "curl -s ${PROXY_URL}/health | jq -e '.pendingAuths == 0' > /dev/null 2>&1"

test_step "Start endpoint returns running status" \
  "curl -X POST -s ${PROXY_URL}/start | jq -e '.status == \"running\"' > /dev/null 2>&1"

echo ""
echo "═══════════════════════════════════════════════════"
echo "🧪 Test Results"
echo "═══════════════════════════════════════════════════"
echo "✅ Passed: $PASS_COUNT"
echo "❌ Failed: $FAIL_COUNT"
echo "📊 Total:  $((PASS_COUNT + FAIL_COUNT))"
echo "═══════════════════════════════════════════════════"

if [ $FAIL_COUNT -eq 0 ]; then
  echo "🎉 All tests passed!"
  exit 0
else
  echo "⚠️  Some tests failed"
  exit 1
fi
