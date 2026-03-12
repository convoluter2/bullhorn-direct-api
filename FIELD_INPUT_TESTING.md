# Field Input Testing Guide

## Overview
This document describes the comprehensive testing suite for To-Many and To-One field inputs in the Bullhorn Data Manager.

## Test Suite Components

### 1. Automated Unit Tests
Location: `src/__tests__/field-inputs.test.tsx`

Run with:
```bash
npm test field-inputs.test.tsx
```

**Tests Included:**
- ToManyFieldInput component rendering
- Operation type selection (Add/Remove/Replace)
- JSON value parsing and display
- ID addition and removal
- Operation type updates
- Operation summary display
- ToOneFieldInput component rendering
- ID validation and lookup
- Search functionality
- Record selection

### 2. Integration Test Suite
Location: `src/components/FieldInputIntegrationTests.tsx`

Access: Navigate to the "Field Tests" tab in the application

**Features:**
- Interactive test runner with visual feedback
- Automated test execution
- Real-time component validation
- Test result reporting
- Step-by-step verification

**Test Cases:**
1. **To-Many Add Operation**
   - Tests adding associations
   - Verifies JSON format
   - Validates badge display
   - Checks operation summary

2. **To-Many Remove Operation**
   - Tests removing associations
   - Verifies operation selection
   - Validates removal behavior

3. **To-One Field Lookup**
   - Tests ID validation
   - Verifies lookup functionality
   - Checks error handling

4. **To-One Search Functionality**
   - Tests search interface
   - Verifies result display
   - Validates selection

### 3. Manual Test Harness
Location: `src/components/ToManyFieldTest.tsx` and `src/components/ToOneFieldTest.tsx`

Access: Navigate to the "To-Many Test" tab in the application

**Purpose:**
- Visual inspection of components
- Manual interaction testing
- Field type debugging
- Console output monitoring

## Running the Tests

### Automated Tests
```bash
# Run all tests
npm test

# Run specific test file
npm test field-inputs.test.tsx

# Run tests in watch mode
npm test -- --watch
```

### Integration Tests
1. Connect to your Bullhorn instance
2. Navigate to the "Field Tests" tab
3. Click "Run All Tests" or run individual tests
4. Review test results and component behavior

### Manual Tests
1. Connect to your Bullhorn instance
2. Navigate to the "To-Many Test" tab
3. Click test buttons to populate components
4. Verify behavior matches expected checklist
5. Inspect console for debugging information

## Expected Behavior

### To-Many Field Input

#### Required Features:
✅ Custom ToManyFieldInput component renders (not plain text input)
✅ Operation dropdown with Add/Remove/Replace options
✅ Each operation has description text
✅ Sub-field selector for association mode
✅ Manual ID entry with comma separation
✅ IDs display as removable badges
✅ Search functionality for record lookup
✅ Multi-select interface for batch selection
✅ ID validation with visual feedback
✅ Operation summary describing the action
✅ JSON format: `{"operation":"add","ids":[100,200],"subField":"id"}`

#### Operations:
- **Add**: Associates new records while keeping existing ones
- **Remove**: Disassociates specific records only
- **Replace**: Removes all existing associations and adds new ones

### To-One Field Input

#### Required Features:
✅ Custom ToOneFieldInput component renders
✅ Search field for finding records
✅ Direct ID input field
✅ Real-time ID validation
✅ Lookup displays record name/title
✅ Visual feedback (spinner → checkmark/error)
✅ Clear button to reset value
✅ Error messages for invalid IDs
✅ Search results in dropdown

## API Format

### To-Many Update Format
```json
{
  "changedEntityType": "Candidate",
  "changedEntityId": 123,
  "changeType": "UPDATE",
  "data": {
    "primarySkills": {
      "add": [100, 200, 300]
    }
  }
}
```

### To-One Update Format
```json
{
  "changedEntityType": "JobSubmission",
  "changedEntityId": 456,
  "changeType": "UPDATE",
  "data": {
    "jobOrder": {
      "id": 919540
    }
  }
}
```

## Validation

### To-Many Field Validation
- Validates each ID against the associated entity
- Shows green checkmarks for valid IDs
- Shows red warnings for invalid IDs
- Displays lookup data (ID + title) for valid records
- Batches validation requests for efficiency

### To-One Field Validation
- Validates ID exists in associated entity
- Shows loading spinner during validation
- Displays checkmark when valid
- Shows error message when invalid
- Caches lookup results

## Common Issues and Solutions

### Issue: Component not rendering
**Solution**: Verify field has `type: 'TO_MANY'` or `type: 'TO_ONE'` and `associatedEntity.entity` is set

### Issue: IDs not validating
**Solution**: Check that you're connected to Bullhorn and the entity cache is populated

### Issue: Search not working
**Solution**: Ensure field value cache is initialized and entity metadata is loaded

### Issue: JSON parsing errors
**Solution**: Verify value format matches `{"operation":"add","ids":[...],"subField":"id"}`

## Test Coverage

### Unit Tests
- ✅ Component rendering
- ✅ Props handling
- ✅ Event handlers
- ✅ State management
- ✅ Value parsing
- ✅ JSON formatting

### Integration Tests
- ✅ End-to-end workflows
- ✅ API integration
- ✅ Cache interaction
- ✅ Validation flow
- ✅ Search functionality
- ✅ Multi-select behavior

### Manual Tests
- ✅ Visual appearance
- ✅ User interactions
- ✅ Edge cases
- ✅ Error states
- ✅ Performance

## Debugging

### Enable Verbose Logging
The components include extensive console logging:
- `🎯` Component render state
- `🔄` Value changes
- `📤` Parent updates
- `🔍` Search operations
- `📋` Record loading
- `✅` Successful operations
- `❌` Errors

### Check Console Output
Navigate to browser DevTools → Console to see detailed logging

### Use Test Harness
The To-Many Test tab includes a `FieldTypeDebugger` component that displays:
- Field name and label
- Field type and data type
- Associated entity
- All field properties
- Current value

## Success Criteria

All tests pass when:
1. ✅ Automated unit tests run without errors
2. ✅ Integration tests show all green checkmarks
3. ✅ Manual inspection confirms UI matches specifications
4. ✅ Operations produce correct JSON format
5. ✅ Validation works for both valid and invalid IDs
6. ✅ Search and selection functions properly
7. ✅ Add/Remove/Replace operations behave correctly
8. ✅ Components handle edge cases gracefully

## Next Steps

After confirming tests pass:
1. Test with real Bullhorn data in CSV Loader
2. Test with SmartStack and QueryStack
3. Verify API updates succeed
4. Test with various entity types
5. Validate performance with large datasets
