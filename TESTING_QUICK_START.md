# Field Input Test Suite - Quick Start Guide

## 🎯 Overview

This test suite ensures To-Many and To-One field inputs work correctly for managing Bullhorn entity associations.

## 🚀 Running Tests

### Option 1: Integration Tests (Recommended)
1. **Connect to Bullhorn** in the app
2. Navigate to **"Field Tests"** tab
3. Click **"Run All Tests"**
4. ✅ Verify all tests show green checkmarks

### Option 2: Manual Testing
1. **Connect to Bullhorn** in the app
2. Navigate to **"To-Many Test"** tab
3. Click test buttons (Test ADD, Test REMOVE, Test REPLACE)
4. Verify components match the expected behavior checklist

### Option 3: Automated Unit Tests
```bash
npm test field-inputs.test.tsx
```

## ✅ What Gets Tested

### To-Many Field Input
- ✓ Renders custom UI component (not plain text input)
- ✓ Shows Add/Remove/Replace operation dropdown
- ✓ Allows multiple ID entry (comma-separated)
- ✓ Displays IDs as removable badges
- ✓ Validates IDs in real-time
- ✓ Shows search interface
- ✓ Supports multi-select from list
- ✓ Displays operation summary
- ✓ Outputs correct JSON: `{"operation":"add","ids":[...],"subField":"id"}`

### To-One Field Input
- ✓ Renders search + direct ID input
- ✓ Validates ID in real-time
- ✓ Shows lookup result (ID + name/title)
- ✓ Displays visual feedback (spinner → checkmark/error)
- ✓ Shows error for invalid IDs
- ✓ Allows clearing the value
- ✓ Search functionality works
- ✓ Can select from search results

## 📋 Expected Results

### All Tests Pass When:
1. Integration tests show **all green checkmarks**
2. Components render with **correct UI elements**
3. Operations produce **valid JSON format**
4. ID validation shows **correct feedback**
5. Search and selection **function properly**
6. Add/Remove/Replace **operations work correctly**

## 🐛 Troubleshooting

### Component Not Rendering
- **Check**: Field has `type: 'TO_MANY'` or `type: 'TO_ONE'`
- **Check**: Field has `associatedEntity.entity` set
- **Check**: You're connected to Bullhorn

### IDs Not Validating
- **Check**: Connected to Bullhorn instance
- **Check**: Entity cache is populated
- **Check**: Associated entity exists and has records

### Search Not Working
- **Check**: Field value cache is initialized
- **Check**: Entity metadata is loaded
- **Check**: Network connection to Bullhorn API

## 📚 Documentation

See `FIELD_INPUT_TESTING.md` for detailed documentation including:
- Complete test descriptions
- API format specifications
- Debugging guide
- Common issues and solutions

## 🎉 Success!

When all tests pass, you'll see:
- ✅ **All Tests Passed! 🎉** message
- Green checkmarks on all test cards
- Components functioning correctly in CSV Loader, SmartStack, and QueryStack

## 🔗 Related Components

- `ToManyFieldInput.tsx` - Main to-many component
- `ToOneFieldInput.tsx` - Main to-one component
- `FieldInputIntegrationTests.tsx` - Integration test suite
- `ToManyFieldTest.tsx` - Manual test harness
- `field-validation.ts` - Validation logic

---

**Need Help?** Check the console for detailed logging (🎯 🔄 📤 🔍 ✅ ❌ emoji markers)
