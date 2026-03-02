# To-Many Field Testing Guide

## Purpose
This guide explains how to test the bugfix for **Candidate.primarySkills** and other to-many fields to ensure they display the correct `ToManyFieldInput` component with operation options (add/remove/replace).

2. 

---

### Test Page Layout
The test page displays **three test cases**:
1. **Candidate.primarySkills (TO_MANY)**
   - Type: `TO_MANY`

   

3. **JobOrder.categori



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
   - ✅ IDs appear as badges (ID: 100, ID: 200, ID:
   - ✅ Has a "Clear all" button
5. **Operation Summary**
   - ✅ Mentions "Add Operation" and preserving e







   - ✅ A new badge "ID: 500" should

   - Click the X on one of the badges
   - ✅ Count should decrease
5. **Change Association Mode**
   - ✅ IDs should clear
   - ✅ Operation summary should update

Open your browser's Developer Tools c

🧪 ToManyFieldTest - Render State: {

  ...
```
#### When clicking "Test ADD" button
🔧 Setting testValue1 (primarySkills): {"o

```
  fieldName: "primarySkills",
  associatedEntity: "Skill",
  metadataLoading: true/false,

  currentSubField: "i
```
#### When value is parsed:
🔄 ToManyFieldInput - Value changed: 

#### When updating the comp
📤 ToManyFieldInput - Updating parent with: {operation: "add
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












































































































