# To-Many Field Testing Guide

## Purpose
This guide explains how to test the bugfix for **Candidate.primarySkills** and other to-many fields to ensure they display the correct `ToManyFieldInput` component with operation options (add/remove/replace).

---

## How to Access the Test Page

1. **Launch the application** and authenticate with your Bullhorn connection
2. **Navigate to the "To-Many Test" tab** in the main navigation
   - Look for the tab with the test tube icon (🧪)
   - It's located between "Documentation" and "Logs" tabs

---

## What You Should See

### Test Page Layout

The test page displays **three test cases**:

1. **Candidate.primarySkills (TO_MANY)**
   - Tests to-many association with `Skill` entity
   - Type: `TO_MANY`
   - Data Type: `Integer`

2. **ClientCorporation.requirements (TO_MANY)**
   - Tests to-many association with `SpecialtyCategory` entity
   - Type: `TO_MANY`
   - Data Type: `Integer`

3. **JobOrder.categories (TO_MANY)**
   - Tests to-many association with `Category` entity
   - Type: `TO_MANY`
   - Data Type: `Integer`

### Each Test Case Shows

- **Field name and description** at the top
- **Field type badges** showing Type and Data Type
- **ToManyFieldInput component** (the main component being tested)
- **Quick Test buttons** (Test ADD, Test REMOVE, Test REPLACE)
- **Current value display** showing the raw JSON
- **Parsed value display** showing operation, IDs, and sub-field
- **Expected API format** example

---

## Testing Steps

### Step 1: Test with Quick Buttons

1. **Click "Test ADD"** on the first test case (Candidate.primarySkills)
2. **Observe the following:**
   - ✅ The `ToManyFieldInput` component should appear (NOT a plain text input)
   - ✅ You should see a card with "To-Many Association Configuration" header
   - ✅ The card mentions "associates with Skill"

### Step 2: Verify Component Elements

Check that the ToManyFieldInput component displays:

1. **Operation Type Dropdown**
   - ✅ Should show three options: ➕ Add, ➖ Remove, 🔄 Replace
   - ✅ Each option has a description
   - ✅ "Add" should be selected by default

2. **Association Mode Dropdown**
   - ✅ Should show "Select Field from Skill"
   - ✅ Default selection should be "id - Direct Association"
   - ✅ Should display other fields from the Skill entity

3. **ID Input Field**
   - ✅ Shows "Skill IDs" label
   - ✅ Has placeholder text like "e.g., 12345, 67890, 11111"
   - ✅ Has an "Add" button next to it

4. **Selected IDs Display**
   - ✅ Shows "3 Skill Record(s) Selected" (or similar count)
   - ✅ IDs appear as badges (ID: 100, ID: 200, ID: 300)
   - ✅ Each badge has an X button to remove
   - ✅ Has a "Clear all" button

5. **Operation Summary**
   - ✅ Shows description of what the operation will do
   - ✅ Mentions "Add Operation" and preserving existing associations
   - ✅ Lists affected Skill IDs

### Step 3: Test Interaction

1. **Change the operation** to "Remove"
   - ✅ Operation summary should update to describe removal
   - ✅ Badges should remain visible

2. **Change the operation** to "Replace"
   - ✅ Operation summary should show warning about destructive operation
   - ✅ Should mention "All existing associations will be removed first"

3. **Add a new ID**
   - Type "500" in the input field
   - Click "Add" or press Enter
   - ✅ A new badge "ID: 500" should appear
   - ✅ Count should update to "4 Skill Record(s) Selected"

4. **Remove an ID**
   - Click the X on one of the badges
   - ✅ Badge should disappear
   - ✅ Count should decrease

5. **Change Association Mode**
   - Select a different field from the dropdown (e.g., "name")
   - ✅ IDs should clear
   - ✅ Input placeholder should change
   - ✅ Operation summary should update

### Step 4: Check Console Logs

Open your browser's Developer Tools console and look for debug logs:

#### When the page renders:
```
🧪 ToManyFieldTest - Render State: {
  testValue1Length: ...,
  testValue2Length: ...,
  testValue3Length: ...,
  ...
}
```

#### When clicking "Test ADD" button:
```
🔧 Setting testValue1 (primarySkills): {"operation":"add","ids":[100,200,300],"subField":"id"}
```

#### When ToManyFieldInput renders:
```
🎯 ToManyFieldInput - Render: {
  fieldName: "primarySkills",
  fieldType: "TO_MANY",
  associatedEntity: "Skill",
  hasMetadata: true/false,
  metadataLoading: true/false,
  currentValue: ...,
  currentOperation: "add",
  currentIds: [100, 200, 300],
  currentSubField: "id"
}
```

#### When value is parsed:
```
🔄 ToManyFieldInput - Value changed: {"operation":"add","ids":[100,200,300],"subField":"id"}
✅ ToManyFieldInput - Parsed value successfully: {operation: "add", ids: [100, 200, 300], subField: "id"}
```

#### When updating the component:
```
📤 ToManyFieldInput - Updating parent with: {operation: "add", ids: [100, 200, 300, 500], subField: "id"} JSON: {"operation":"add","ids":[100,200,300,500],"subField":"id"}
```

### Step 5: Verify Field Type Information

Check that field type and data type information is displayed correctly:

1. **In the field badges** at the top of each test case:
   - ✅ Should show "Type: TO_MANY"
   - ✅ Should show "Data Type: Integer"

2. **In the Association Mode dropdown**:
   - ✅ Each field option should show type information in square brackets
   - ✅ Example: "name (Name) [SCALAR, String]"
   - ✅ TO_ONE fields should show the associated entity

---

## Expected Behavior Checklist

Use this checklist to verify the bugfix is working correctly:

- [ ] When selecting a to-many field, the **ToManyFieldInput** component appears (not a text box)
- [ ] The component displays three operation options: **Add**, **Remove**, and **Replace**
- [ ] Field dropdowns show field type (TO_MANY, TO_ONE, SCALAR) and data type (Integer, Boolean, etc.)
- [ ] The component shows a dropdown to select between "id" (direct association) or other sub-fields
- [ ] You can enter multiple IDs (comma-separated) and they appear as badges
- [ ] The operation summary at the bottom describes what will happen based on selected operation
- [ ] The value is stored as JSON: `{"operation":"add","ids":[100,200],"subField":"id"}`
- [ ] Console logs show field detection and value parsing working correctly
- [ ] For primarySkills on Candidate, it shows "Skill" as the associated entity
- [ ] Associated entity metadata loads and displays available fields

---

## Common Issues to Look For

### ❌ WRONG: Text input appears instead of ToManyFieldInput
**Issue:** The field type isn't being detected as TO_MANY  
**Check:** Console logs should show `fieldType: "TO_MANY"`  
**Expected:** See the debug log with the correct field type

### ❌ WRONG: Component shows but no operation options
**Issue:** Component render error or missing props  
**Check:** Console for React errors  
**Expected:** Three operation options visible in dropdown

### ❌ WRONG: Associated entity doesn't load
**Issue:** Metadata fetch failing or entity name incorrect  
**Check:** Console log should show `associatedEntity: "Skill"` and `hasMetadata: true`  
**Expected:** Dropdown shows fields from Skill entity

### ❌ WRONG: Adding IDs doesn't work
**Issue:** Value update not propagating  
**Check:** Console should show "📤 ToManyFieldInput - Updating parent with:" log  
**Expected:** Badges appear and JSON value updates

---

## Screenshots to Capture

Please capture the following screenshots:

1. **Initial State** - Test page showing all three test cases
2. **Candidate.primarySkills with ADD operation** - After clicking "Test ADD"
3. **Operation dropdown expanded** - Showing all three options (Add, Remove, Replace)
4. **Association Mode dropdown expanded** - Showing Skill entity fields
5. **IDs as badges** - Showing multiple IDs with X buttons
6. **Operation set to REPLACE** - Showing the warning message
7. **Console logs** - Showing the debug output for field detection and value parsing
8. **Raw JSON value** - The "Current Value (Raw JSON)" section showing the stored format

---

## Success Criteria

The bugfix is considered successful if:

1. ✅ **Candidate.primarySkills** displays the `ToManyFieldInput` component
2. ✅ The component shows "associates with Skill"
3. ✅ All three operations (Add, Remove, Replace) are selectable
4. ✅ IDs can be added, displayed as badges, and removed
5. ✅ Console logs show correct field type detection
6. ✅ JSON value format matches: `{"operation":"...","ids":[...],"subField":"..."}`
7. ✅ The same behavior works for the other two test cases

---

## Additional Notes

- The test page is **isolated** and doesn't require a live Bullhorn connection to test the UI
- All test data is hardcoded for consistency
- You can test as many times as needed using the "Clear All" button
- Console logs are **verbose** to help debug any issues

---

## Troubleshooting

**Q: I don't see the To-Many Test tab**  
A: Make sure you're logged into the application. The tab appears after authentication.

**Q: Console logs aren't showing**  
A: Make sure your browser console's log level includes "Info" and "Debug" messages.

**Q: The Skill entity fields aren't loading**  
A: This requires a live connection to Bullhorn. Check your network tab for metadata API calls.

**Q: Can I test this without authenticating?**  
A: The basic UI will render, but loading associated entity metadata requires authentication.
