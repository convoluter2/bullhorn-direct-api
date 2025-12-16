#!/bin/bash

echo "=== Bullhorn Data Manager - Test Runner ==="
echo "=========================================="
echo ""

ITERATION=1
MAX_ITERATIONS=10
TOTAL_ERRORS=0

run_tests() {
    echo "🔄 Iteration $ITERATION of $MAX_ITERATIONS"
    echo "-------------------------------------------"
    
    echo "📝 Running TypeScript checks..."
    npx tsc --noEmit 2>&1 | tee /tmp/tsc-output.txt
    TSC_EXIT_CODE=${PIPESTATUS[0]}
    
    echo ""
    echo "🧪 Running Vitest..."
    npm test 2>&1 | tee /tmp/vitest-output.txt
    VITEST_EXIT_CODE=${PIPESTATUS[0]}
    
    echo ""
    echo "🔍 Running ESLint..."
    npm run lint 2>&1 | tee /tmp/eslint-output.txt
    ESLINT_EXIT_CODE=${PIPESTATUS[0]}
    
    CURRENT_ERRORS=$((TSC_EXIT_CODE + VITEST_EXIT_CODE + ESLINT_EXIT_CODE))
    
    echo ""
    echo "📊 Results for Iteration $ITERATION:"
    echo "  - TypeScript: $([ $TSC_EXIT_CODE -eq 0 ] && echo '✅ PASS' || echo '❌ FAIL')"
    echo "  - Vitest: $([ $VITEST_EXIT_CODE -eq 0 ] && echo '✅ PASS' || echo '❌ FAIL')"
    echo "  - ESLint: $([ $ESLINT_EXIT_CODE -eq 0 ] && echo '✅ PASS' || echo '❌ FAIL')"
    echo ""
    
    return $CURRENT_ERRORS
}

for ((i=1; i<=MAX_ITERATIONS; i++)); do
    ITERATION=$i
    run_tests
    ERRORS=$?
    
    if [ $ERRORS -eq 0 ]; then
        echo "✅ ✅ ✅ ALL TESTS PASSED! ✅ ✅ ✅"
        echo "No errors found after $ITERATION iteration(s)!"
        exit 0
    else
        echo "⚠️  Found $ERRORS error(s) in iteration $ITERATION"
        TOTAL_ERRORS=$((TOTAL_ERRORS + ERRORS))
        
        if [ $i -lt $MAX_ITERATIONS ]; then
            echo "🔧 Continuing to next iteration..."
            echo ""
        fi
    fi
done

echo ""
echo "=========================================="
echo "❌ Tests completed with errors after $MAX_ITERATIONS iterations"
echo "Total error count: $TOTAL_ERRORS"
echo "Please review the output above for details."
exit 1
