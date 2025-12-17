#!/bin/bash

echo ""
echo "========================================="
echo "  OAuth Automated Authentication Tests  "
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "📋 Running test suite..."
echo ""

# Run auth automation tests
echo "🔐 Test 1: OAuth Flow Automation"
echo "--------------------------------"
npm test -- src/__tests__/auth-automation.test.ts --reporter=verbose

AUTH_EXIT=$?

echo ""
echo "🌐 Test 2: Multi-Tenant Integration"
echo "------------------------------------"
npm test -- src/__tests__/oauth-integration.test.ts --reporter=verbose

INTEGRATION_EXIT=$?

echo ""
echo "🔧 Test 3: Bullhorn API Core"
echo "----------------------------"
npm test -- src/__tests__/bullhorn-api.test.ts --reporter=verbose

API_EXIT=$?

echo ""
echo "========================================="
echo "           Test Results Summary          "
echo "========================================="
echo ""

if [ $AUTH_EXIT -eq 0 ]; then
    echo -e "${GREEN}✅ OAuth Flow Automation: PASSED${NC}"
else
    echo -e "${RED}❌ OAuth Flow Automation: FAILED${NC}"
fi

if [ $INTEGRATION_EXIT -eq 0 ]; then
    echo -e "${GREEN}✅ Multi-Tenant Integration: PASSED${NC}"
else
    echo -e "${RED}❌ Multi-Tenant Integration: FAILED${NC}"
fi

if [ $API_EXIT -eq 0 ]; then
    echo -e "${GREEN}✅ Bullhorn API Core: PASSED${NC}"
else
    echo -e "${RED}❌ Bullhorn API Core: FAILED${NC}"
fi

echo ""

if [ $AUTH_EXIT -eq 0 ] && [ $INTEGRATION_EXIT -eq 0 ] && [ $API_EXIT -eq 0 ]; then
    echo -e "${GREEN}========================================="
    echo "  ✅ ALL TESTS PASSED!"
    echo "=========================================${NC}"
    echo ""
    echo "OAuth Authentication Coverage:"
    echo "  ✓ Credential storage and retrieval"
    echo "  ✓ Authorization URL generation"
    echo "  ✓ OAuth redirect callback handling"
    echo "  ✓ URL-encoded code decoding"
    echo "  ✓ Token exchange (code → tokens)"
    echo "  ✓ REST API login (token → session)"
    echo "  ✓ Session with refresh token"
    echo "  ✓ OAuth flow cleanup"
    echo "  ✓ End-to-end automation"
    echo "  ✓ Error scenarios"
    echo "  ✓ Token refresh"
    echo "  ✓ Multi-tenant connections"
    echo "  ✓ NPE and PROD environments"
    echo ""
    echo -e "${GREEN}🎉 The automated OAuth flow is ready!"${NC}
    echo ""
    echo "Next steps:"
    echo "  1. Test with real Bullhorn credentials"
    echo "  2. Use 'Start Automated OAuth Flow' button"
    echo "  3. Verify no blank screens or errors"
    echo "  4. Check session persists after reload"
    echo ""
    echo "See OAUTH_TESTING.md for detailed instructions."
    echo ""
    exit 0
else
    echo -e "${RED}========================================="
    echo "  ❌ SOME TESTS FAILED"
    echo "=========================================${NC}"
    echo ""
    echo "Please review the test output above."
    echo "Check OAUTH_TESTING.md for troubleshooting."
    echo ""
    exit 1
fi
