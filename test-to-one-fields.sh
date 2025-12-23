#!/bin/bash

# To-One Field Testing Script
# Tests the unified to-one field handling across SmartStack, QueryStack, and CSV Loader

echo "=================================================="
echo "TO-ONE FIELD TESTING CHECKLIST"
echo "=================================================="
echo ""

echo "This script will guide you through testing to-one field functionality."
echo "You'll need to be connected to a Bullhorn instance with test data."
echo ""

read -p "Press Enter to begin testing..."

# Test 1: ToOneFieldInput Component
echo ""
echo "TEST 1: ToOneFieldInput Component"
echo "-----------------------------------"
echo "1. Navigate to the 'To-One Test' tab in the app"
echo "2. Click 'Run All Tests' button"
echo "3. Verify each field shows:"
echo "   - Input accepts numeric IDs only"
echo "   - After entering ID, entity title appears below"
echo "   - Badge shows 'ID: XXXX - Title'"
echo "   - Clear button works"
echo "   - Invalid IDs show error message"
echo ""
read -p "Did all ToOneFieldInput tests pass? (y/n): " test1
if [ "$test1" != "y" ]; then
  echo "❌ TEST 1 FAILED"
  exit 1
fi
echo "✅ TEST 1 PASSED"

# Test 2: ValidatedFieldInput Auto-Detection
echo ""
echo "TEST 2: ValidatedFieldInput Auto-Detection"
echo "--------------------------------------------"
echo "1. Still in 'To-One Test' tab"
echo "2. Verify that ValidatedFieldInput section shows the same behavior"
echo "3. Both components should be identical in functionality"
echo ""
read -p "Did ValidatedFieldInput auto-detect TO_ONE fields? (y/n): " test2
if [ "$test2" != "y" ]; then
  echo "❌ TEST 2 FAILED"
  exit 1
fi
echo "✅ TEST 2 PASSED"

# Test 3: SmartStack To-One Updates
echo ""
echo "TEST 3: SmartStack To-One Field Updates"
echo "-----------------------------------------"
echo "Setup:"
echo "1. Navigate to SmartStack tab"
echo "2. Upload a CSV with IDs of entities that have to-one associations"
echo "   Example CSV for Placements:"
echo "   id"
echo "   646963"
echo "   646964"
echo ""
echo "3. Select the appropriate entity (e.g., Placement)"
echo "4. Add a field update for a to-one field (e.g., jobOrder)"
echo "5. Enter a valid JobOrder ID (e.g., 1426785)"
echo "6. Enable Dry Run mode"
echo "7. Click 'Preview Changes'"
echo ""
echo "Expected Results:"
echo "✓ Preview table should show:"
echo "  Current Values: jobOrder: {id: 919540, title: 'Old Job'}"
echo "  New Values: jobOrder: {id: 1426785, title: 'New Job'}"
echo "  NOT: jobOrder: '1426785' (string)"
echo ""
echo "8. Disable Dry Run"
echo "9. Execute SmartStack"
echo "10. Check logs - should show successful update"
echo ""
read -p "Did SmartStack to-one updates work correctly? (y/n): " test3
if [ "$test3" != "y" ]; then
  echo "❌ TEST 3 FAILED"
  exit 1
fi
echo "✅ TEST 3 PASSED"

# Test 4: QueryStack To-One Updates
echo ""
echo "TEST 4: QueryStack To-One Field Updates"
echo "-----------------------------------------"
echo "Setup:"
echo "1. Navigate to QueryStack tab"
echo "2. Build a query to select entities (e.g., Placement with status='Submitted')"
echo "3. Execute query to load records"
echo "4. In Step 2, add a field update for a to-one field"
echo "5. Enter a valid entity ID"
echo "6. Enable Dry Run mode"
echo "7. Click 'Preview Changes'"
echo ""
echo "Expected Results:"
echo "✓ Preview should show to-one with title:"
echo "  New Values: jobOrder: {id: 1426785, title: '...'}"
echo ""
echo "8. Disable Dry Run and execute"
echo "9. Verify updates in logs"
echo ""
read -p "Did QueryStack to-one updates work correctly? (y/n): " test4
if [ "$test4" != "y" ]; then
  echo "❌ TEST 4 FAILED"
  exit 1
fi
echo "✅ TEST 4 PASSED"

# Test 5: CSV Loader To-One Updates
echo ""
echo "TEST 5: CSV Loader To-One Field Updates"
echo "-----------------------------------------"
echo "Setup:"
echo "1. Navigate to CSV Loader tab"
echo "2. Select entity type"
echo "3. Upload a CSV like:"
echo "   id,jobOrder"
echo "   646963,1426785"
echo "   646964,1426786"
echo ""
echo "4. Map columns:"
echo "   - id → id (or appropriate lookup field)"
echo "   - jobOrder → jobOrder"
echo ""
echo "5. Set lookup field to 'id'"
echo "6. Enable 'Update Existing'"
echo "7. Enable 'Dry Run Mode'"
echo "8. Click 'Preview Import'"
echo ""
echo "Expected Results:"
echo "✓ Results should show:"
echo "  Row 1: Would update existing record (ID: 646963)"
echo "  Changes: jobOrder: {id: 1426785, title: '...'}"
echo "  NOT: jobOrder: '1426785'"
echo ""
echo "9. Disable Dry Run"
echo "10. Execute import"
echo "11. Verify updates successful"
echo ""
read -p "Did CSV Loader to-one updates work correctly? (y/n): " test5
if [ "$test5" != "y" ]; then
  echo "❌ TEST 5 FAILED"
  exit 1
fi
echo "✅ TEST 5 PASSED"

# Test 6: Edge Cases
echo ""
echo "TEST 6: Edge Cases and Error Handling"
echo "---------------------------------------"
echo "Test the following scenarios:"
echo ""
echo "a) Invalid ID (non-existent)"
echo "   - Enter ID 99999999 in To-One Test tab"
echo "   - Should show 'Entity not found' error"
read -p "Did invalid ID show error? (y/n): " test6a
if [ "$test6a" != "y" ]; then
  echo "❌ TEST 6a FAILED"
  exit 1
fi
echo ""

echo "b) Non-numeric input"
echo "   - Enter 'abc' in To-One field"
echo "   - Should not perform lookup (only numeric IDs are valid)"
read -p "Did non-numeric input get ignored? (y/n): " test6b
if [ "$test6b" != "y" ]; then
  echo "❌ TEST 6b FAILED"
  exit 1
fi
echo ""

echo "c) Empty/cleared value"
echo "   - Clear a to-one field that had a value"
echo "   - Should remove the association preview"
read -p "Did clearing work correctly? (y/n): " test6c
if [ "$test6c" != "y" ]; then
  echo "❌ TEST 6c FAILED"
  exit 1
fi
echo ""

echo "d) Entity without title/name fields"
echo "   - Test with an entity that doesn't have title/name"
echo "   - Should still show ID and indicate '(No title)'"
read -p "Did entities without titles work? (y/n): " test6d
if [ "$test6d" != "y" ]; then
  echo "❌ TEST 6d FAILED"
  exit 1
fi
echo "✅ TEST 6 PASSED"

# Test 7: Cross-Entity Updates (QueryStack)
echo ""
echo "TEST 7: Cross-Entity To-One Updates (QueryStack Only)"
echo "-------------------------------------------------------"
echo "QueryStack supports updating a different entity than queried."
echo ""
echo "Setup:"
echo "1. Query one entity (e.g., JobOrder)"
echo "2. Set target entity to different type (e.g., Placement)"  
echo "3. Add to-one field update for target entity"
echo "4. The to-one field should use target entity's metadata"
echo ""
read -p "Did cross-entity to-one updates work? (y/n): " test7
if [ "$test7" != "y" ]; then
  echo "❌ TEST 7 FAILED"
  exit 1
fi
echo "✅ TEST 7 PASSED"

# Test 8: Verify Logs
echo ""
echo "TEST 8: Audit Log Verification"
echo "--------------------------------"
echo "1. Navigate to Logs tab"
echo "2. Find recent SmartStack/QueryStack/CSV Loader operations"
echo "3. Verify logs show:"
echo "   - Success status"
echo "   - Correct entity type"
echo "   - Number of updated records"
echo "   - Rollback data (if applicable)"
echo ""
read -p "Are logs showing correct information? (y/n): " test8
if [ "$test8" != "y" ]; then
  echo "❌ TEST 8 FAILED"
  exit 1
fi
echo "✅ TEST 8 PASSED"

# Final Summary
echo ""
echo "=================================================="
echo "TESTING COMPLETE - ALL TESTS PASSED! ✅"
echo "=================================================="
echo ""
echo "Summary:"
echo "✅ ToOneFieldInput component works correctly"
echo "✅ ValidatedFieldInput auto-detects TO_ONE fields"
echo "✅ SmartStack handles to-one updates with proper preview"
echo "✅ QueryStack handles to-one updates with proper preview"
echo "✅ CSV Loader handles to-one updates with proper preview"
echo "✅ Edge cases handled properly"
echo "✅ Cross-entity updates work"
echo "✅ Audit logs are correct"
echo ""
echo "Features Verified:"
echo "- Numeric ID input with validation"
echo "- Automatic entity lookup and title display"
echo "- Preview shows {id, title} format"
echo "- API receives {id: number} format"
echo "- Error handling for invalid/missing entities"
echo "- Consistent behavior across all three tools"
echo ""
echo "You can now use to-one fields confidently in:"
echo "- SmartStack (CSV bulk updates)"
echo "- QueryStack (Query-based bulk updates)"
echo "- CSV Loader (Import/update from CSV)"
echo ""
echo "See TO_ONE_FIELDS_GUIDE.md for detailed documentation."
