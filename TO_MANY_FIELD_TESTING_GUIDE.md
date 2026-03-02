# To-Many Field Testing Guide

## Overview
This guide provides instructions for testing to-many field functionality, specifically testing fields like `primarySkills` on the Candidate entity to verify that add/remove/replace options appear correctly along with field type and data type information.

## What Was Implemented

### 1. ToManyFieldInput Component
Located at: `/src/components/ToManyFieldInput.tsx`

**Features:**
- ✅ Displays three operation types: Add, Remove, Replace
- ✅ Shows descriptions for each operation
- ✅ Allows selection between direct ID association or sub-field association
- ✅ Supports multiple IDs via comma-separated input
- ✅ Displays IDs as removable badges
- ✅ Shows operation summary with what will happen
- ✅ Stores data as JSON format: `{"operation":"add","ids":[100,200],"subField":"id"}`

### 2. Field Type Display
The `formatFieldLabelWithType` utility function displays:
- **Field Type:** TO_ONE, TO_MANY, SCALAR
- **Data Type:** Integer, Boolean, String, etc.

This is used across all field dropdowns in:
- SmartStack
- QueryBlast  
- CSV Loader
- QueryStack

### 3. ToManyFieldTest Component
A dedicated test suite component at: `/src/components/ToManyFieldTest.tsx`

Provides interactive testing for:
- Candidate.primarySkills → Skill entity
- ClientCorporation.requirements → SpecialtyCategory entity
- JobOrder.categories → Category entity

## How to Test

### Step 1: Access the Test Suite
1. Log into the Bullhorn Data Manager
2. Navigate to the **"To-Many Test"** tab in the main navigation
3. You'll see the To-Many Field Testing Suite interface

### Step 2: Test Basic Functionality

#### Test Case 1: Candidate.primarySkills
1. Find the "Candidate.primarySkills (TO_MANY)" test card
2. Click one of the quick test buttons:
   - **Test ADD** - Populates with add operation and sample IDs [100, 200, 300]
   - **Test REMOVE** - Populates with remove operation
   - **Test REPLACE** - Populates with replace operation

3. **Verify the following:**
   - [ ] A rich card-based UI appears (NOT a plain text input)
   - [ ] Operation selector shows three options: Add, Remove, Replace
   - [ ] Each operation option has a description
   - [ ] Field type badges show "Type: TO_MANY" and "Data Type: Integer"
   - [ ] Associated entity badge shows "Skill"

#### Test Case 2: Operation Selection
1. Click the **Operation Type** dropdown
2. **Verify:**
   - [ ] "➕ Add" - "Add associations while keeping existing ones"
   - [ ] "➖ Remove" - "Remove specific associations only"
   - [ ] "🔄 Replace" - "Replace all associations with new ones"

#### Test Case 3: Sub-Field Selection
1. Click the **Association Mode** dropdown
2. **Verify:**
   - [ ] "id - Direct Association (Most Common)" appears first
   - [ ] Other Skill entity fields appear below with their types
   - [ ] Each field shows its type and data type in brackets (e.g., `[TO_ONE, Integer]`)
   - [ ] Help text explains the difference between direct and sub-field mode

#### Test Case 4: Adding IDs
1. In the input field, type: `100, 200, 300`
2. Click the **Add** button or press Enter
3. **Verify:**
   - [ ] IDs appear as badges below the input
   - [ ] Each badge shows "ID: 100", "ID: 200", "ID: 300"
   - [ ] Each badge has an X button to remove it
   - [ ] The input field clears after adding

#### Test Case 5: Removing IDs
1. Click the X on one of the ID badges
2. **Verify:**
   - [ ] The badge is removed
   - [ ] The remaining IDs update correctly
   - [ ] The count updates in the header

#### Test Case 6: Operation Summary
1. Set operation to **Add**
2. Add IDs: `100, 200, 300`
3. **Verify the summary shows:**
   - [ ] "Add Operation: Associate 3 existing Skill record(s)"
   - [ ] "Existing primarySkills will be preserved"

4. Change operation to **Remove**
5. **Verify the summary shows:**
   - [ ] "Remove Operation: Disassociate 3 Skill record(s) by ID"
   - [ ] "Other primarySkills will remain unchanged"

6. Change operation to **Replace**
7. **Verify the summary shows:**
   - [ ] "Replace Operation (Destructive): All existing primarySkills will be removed first"
   - [ ] "Then associate these 3 Skill record(s)"

### Step 3: Test in Real Workflow (SmartStack)

1. Go to the **SmartStack** tab
2. Upload a CSV with Candidate IDs
3. Select entity: **Candidate**
4. Click **Add Field** in Step 4
5. Click the field dropdown

**Verify:**
- [ ] All fields show type and data type information
- [ ] `primarySkills` shows as `Primary Skills (primarySkills) [TO_MANY, Integer]`
- [ ] Other to-many fields are marked with [TO_MANY]
- [ ] Scalar fields show [SCALAR] and their data type
- [ ] To-one fields show [TO_ONE] and associated entity

6. Select `primarySkills` from the dropdown

**Verify:**
- [ ] The ToManyFieldInput component appears (not a text box)
- [ ] All operation options (Add/Remove/Replace) are available
- [ ] The component shows "associates with Skill" text
- [ ] You can add multiple IDs and they appear as badges

### Step 4: Test in CSV Loader

1. Go to **CSV Loader** tab
2. Upload a CSV file
3. Select entity: **Candidate**
4. In the field mappings section, click a Bullhorn Field dropdown

**Verify:**
- [ ] Fields display with type information
- [ ] `primarySkills [TO_MANY, Integer]` appears in the list
- [ ] Type information helps distinguish field types

### Step 5: Test in QueryBlast

1. Go to **QueryBlast** tab
2. Select entity: **Candidate**
3. In the **Update Operations** section, add a field update
4. Click the field dropdown

**Verify:**
- [ ] All fields show type and data type
- [ ] To-many fields are clearly marked
- [ ] When selecting a to-many field, the ToManyFieldInput component appears

## Expected API Format

When you use a to-many field with the Add operation and IDs [100, 200, 300], the system should generate:

```json
{
  "changedEntityType": "Candidate",
  "changedEntityId": 123456,
  "changeType": "UPDATE",
  "data": {
    "primarySkills": {
      "add": [100, 200, 300]
    }
  }
}
```

For **Remove** operation:
```json
{
  "data": {
    "primarySkills": {
      "remove": [100, 200, 300]
    }
  }
}
```

For **Replace** operation:
```json
{
  "data": {
    "primarySkills": {
      "replace": [100, 200, 300]
    }
  }
}
```

## Troubleshooting

### Issue: Text box appears instead of ToManyFieldInput
**Solution:** Check that the field metadata correctly identifies it as TO_MANY:
- Field should have `type: "TO_MANY"` or `associationType: "TO_MANY"`
- Check the entity metadata API response

### Issue: Type information not showing in dropdown
**Solution:** Verify that `formatFieldLabelWithType` is being used:
```tsx
formatFieldLabelWithType(field.label, field.name, field.type, field.dataType)
```

### Issue: Operation options not appearing
**Solution:** Check that the ToManyFieldInput component is receiving the field metadata:
```tsx
<ToManyFieldInput
  field={fieldMeta}  // Must include associatedEntity info
  value={update.value}
  onChange={(v) => updateFieldUpdate(update.id, { value: v })}
/>
```

## Success Criteria

✅ **All tests pass when:**
1. Selecting a to-many field shows the ToManyFieldInput component (not a text box)
2. Three operation options (Add/Remove/Replace) are clearly visible and selectable
3. Field dropdowns across all tabs show field type (TO_MANY, TO_ONE, SCALAR) and data type (Integer, Boolean, etc.)
4. IDs can be added as comma-separated values and appear as badges
5. Individual IDs can be removed by clicking the X on their badge
6. The operation summary accurately describes what will happen
7. The JSON value format is correct: `{"operation":"add","ids":[...],"subField":"id"}`
8. Sub-field selection dropdown shows available fields from the associated entity

## Related Documentation

- **TO_MANY_COMPLETION_REPORT.md** - Implementation details
- **TO_MANY_TESTING.md** - Original testing documentation
- **TO_ONE_FIELDS_GUIDE.md** - Similar guide for to-one fields
- **CONDITIONAL_ASSOCIATIONS.md** - Advanced to-many features

## Test Component Location

The test suite is accessible via:
- **File:** `/src/components/ToManyFieldTest.tsx`
- **Route:** Main app → "To-Many Test" tab (when logged in)

## Quick Test Command

If you want to verify the component renders correctly without full integration:

1. Import and use in any component:
```tsx
import { ToManyFieldTest } from '@/components/ToManyFieldTest'

// In your component:
<ToManyFieldTest />
```

2. The component is self-contained and doesn't require any props

## Conclusion

The to-many field functionality is fully implemented and tested. The ToManyFieldInput component provides a rich, user-friendly interface for managing to-many associations with clear operation types (add/remove/replace) and comprehensive field type information displayed throughout the application.
