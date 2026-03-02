# To-Many Field Testing Guide

## Overview
This guide provides instructions for testing to-many field functionality, specifically testing fields like `primarySkills` on the Candidate entity to verify that add/remove/replace options appear correctly along with field type and data type information.

## What Was Implemented

### 1. ToManyFieldInput Component
Located at: `/src/components/ToManyFieldInput.tsx`

- ✅ Allows se
- ✅ Displays IDs as removable badges
- ✅ Stores data as JSON format: `{"operat
### 2. Field Type Display
- **Field Type:** TO_ONE, TO_MANY, SCALAR

- SmartStack
- CSV Loader

A dedicated test suite co
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


   - [ ] A rich card-based UI appears
   - [ ] Each operation option has a description
   - [ ] Associated entity badge shows "Skill"

2. **Verify:**


1. Click the **Association Mode** dropdown
   - [ ] "id - Direct Association (Most
   - [ ] Each field shows its type and data type in brackets (e.g., `[TO_ONE, I

1. In the input field, type: `100, 200, 300`

   - [ ] Each badge shows "I
   - [ ] The input field clears after adding
#### Test Case 5: Removing IDs
2. **Verify:**
   - [ ] The remaining IDs update correctly


3. **Verify the summary shows:**
   - [ ] "Existing primarySkills will be
4. Change oper
   - [ ] "Remove Operation: Disassociate 3 Skill record(s) by ID"

7. **Verify the summary shows:**

### Step 3: Test in Real Workflow (Sm
1. Go to the **SmartStack** tab
3. Select enti
5. Click the field dropdown
**Verify:**
- [ ] `primarySkills` shows as `Primary Skills (primarySkills) [TO_MANY, Integer]`
- [ ] Scalar fields show [SCALAR] and their data type


- [ ] The ToManyFieldInput component appears
- [ ] The component shows "associates with

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

  value
/


1. Selecting a to-many fi
3. Field dr
5. Individual IDs can 
7. The JSON value format is 


-
- *

The test suite is accessi
- **Rou
#
If you want
1. Import and use in a
import { ToManyFieldTest } from
// In
```
2
## 













































































