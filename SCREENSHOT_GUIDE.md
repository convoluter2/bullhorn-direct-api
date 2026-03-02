# Screenshot Capture Guide for To-Many Field Testing

## Overview
This document provides a checklist of specific screenshots to capture when testing the Candidate.primarySkills bugfix.

---

## Required Screenshots

### 📸 Screenshot 1: Test Page Overview
**File Name:** `01-test-page-overview.png`

**What to capture:**
- Full page view of the "To-Many Test" tab
- All three test cases visible
- Expected Behavior Checklist section visible
- Testing Instructions section visible

**How to capture:**
1. Navigate to the "To-Many Test" tab
2. Scroll to the top of the page
3. Capture the full viewport

**Purpose:** Shows that the test page exists and is accessible

---

### 📸 Screenshot 2: Field Type Debugger - Candidate.primarySkills
**File Name:** `02-field-type-debugger-primary-skills.png`

**What to capture:**
- The "Field Type Debug" card for Candidate.primarySkills
- Showing:
  - Field Name: `primarySkills`
  - Type: `TO_MANY`
  - Associated Entity: `Skill`
  - Green checkmark with "✅ Correctly Detected as TO_MANY"

**How to capture:**
1. Click "Test ADD" on the first test case
2. Scroll to the "Field Type Debug" section
3. Capture just this card

**Purpose:** Proves the field is being correctly detected as TO_MANY

---

### 📸 Screenshot 3: ToManyFieldInput Component - Initial State
**File Name:** `03-tomany-input-initial.png`

**What to capture:**
- The full ToManyFieldInput component after clicking "Test ADD"
- Showing:
  - "To-Many Association Configuration" header
  - "(associates with Skill)" text
  - Operation Type dropdown showing "➕ Add"
  - Association Mode showing "id - Direct Association"
  - Three ID badges: ID: 100, ID: 200, ID: 300
  - "3 Skill Record(s) Selected" label
  - Operation Summary section

**How to capture:**
1. Click "Test ADD" on the first test case
2. Scroll to show the entire ToManyFieldInput card
3. Ensure all sections are visible

**Purpose:** Shows the component renders correctly with all expected elements

---

### 📸 Screenshot 4: Operation Dropdown Expanded
**File Name:** `04-operation-dropdown-expanded.png`

**What to capture:**
- Operation Type dropdown menu expanded
- Showing all three options:
  - ➕ Add - "Add associations while keeping existing ones"
  - ➖ Remove - "Remove specific associations only"
  - 🔄 Replace - "Replace all associations with new ones"

**How to capture:**
1. With test data loaded, click the Operation Type dropdown
2. Capture the expanded dropdown menu
3. Ensure all three options and descriptions are visible

**Purpose:** Verifies all operation types are available

---

### 📸 Screenshot 5: Association Mode Dropdown Expanded
**File Name:** `05-association-mode-dropdown.png`

**What to capture:**
- "Association Mode - Select Field from Skill" dropdown expanded
- Showing:
  - "id - Direct Association (Most Common)"
  - Other fields from the Skill entity with their types
  - Field type information in square brackets (e.g., [TO_ONE], [SCALAR, String])

**How to capture:**
1. With test data loaded, click the "Association Mode" dropdown
2. Capture the expanded dropdown
3. Show multiple field options

**Purpose:** Shows that associated entity metadata loads correctly

---

### 📸 Screenshot 6: Replace Operation Selected
**File Name:** `06-replace-operation-warning.png`

**What to capture:**
- ToManyFieldInput with "Replace" operation selected
- Showing:
  - Operation dropdown showing "🔄 Replace"
  - Operation Summary section with destructive warning in red/orange
  - "Replace Operation (Destructive):" text
  - "All existing associations will be removed first"

**How to capture:**
1. Change operation to "Replace"
2. Scroll to show the Operation Summary section
3. Ensure warning text is visible

**Purpose:** Shows that operation summaries update based on selection

---

### 📸 Screenshot 7: Adding a New ID
**File Name:** `07-adding-new-id.png`

**What to capture:**
- ToManyFieldInput with:
  - Input field showing a new ID typed in (e.g., "500")
  - Existing badges visible
  - "Add" button highlighted or being clicked

**How to capture:**
1. Type "500" in the Skill IDs input field
2. Before or just as you click "Add"
3. Capture the input area and badge area

**Purpose:** Demonstrates interactive functionality

---

### 📸 Screenshot 8: New ID Added as Badge
**File Name:** `08-new-id-badge.png`

**What to capture:**
- Badge area showing:
  - Original three badges (ID: 100, ID: 200, ID: 300)
  - New badge added (ID: 500)
  - Updated count: "4 Skill Record(s) Selected"
  - Each badge with its X button visible

**How to capture:**
1. After adding ID 500
2. Scroll to show all badges
3. Ensure the count is updated

**Purpose:** Shows that IDs are correctly added and displayed

---

### 📸 Screenshot 9: Console Logs - Field Detection
**File Name:** `09-console-field-detection.png`

**What to capture:**
- Browser console showing debug logs:
  - `🔍 FieldTypeDebugger - Candidate.primarySkills (TO_MANY):`
  - Object showing: `isToMany: true`, `hasAssociatedEntity: true`
  - `🎯 ToManyFieldInput - Render:`
  - Object showing: `fieldType: "TO_MANY"`, `associatedEntity: "Skill"`

**How to capture:**
1. Open Developer Tools (F12)
2. Go to Console tab
3. Click "Test ADD" on first test case
4. Capture the debug output
5. Filter for logs with 🔍 and 🎯 emojis

**Purpose:** Proves field type detection is working in code

---

### 📸 Screenshot 10: Console Logs - Value Parsing
**File Name:** `10-console-value-parsing.png`

**What to capture:**
- Browser console showing:
  - `🔧 Setting testValue1 (primarySkills):` with JSON value
  - `🔄 ToManyFieldInput - Value changed:` with the same JSON
  - `✅ ToManyFieldInput - Parsed value successfully:` with parsed object
  - `📤 ToManyFieldInput - Updating parent with:` when you interact

**How to capture:**
1. Keep console open
2. Perform an action (click Test ADD, then add a new ID)
3. Scroll console to show the value change flow
4. Capture multiple related log lines

**Purpose:** Shows the data flow is working correctly

---

### 📸 Screenshot 11: Raw JSON Value Display
**File Name:** `11-raw-json-value.png`

**What to capture:**
- The "Current Value (Raw JSON)" section showing:
  ```json
  {"operation":"add","ids":[100,200,300],"subField":"id"}
  ```
- The "Parsed Value" section showing badges:
  - Operation: add
  - IDs: [100, 200, 300]
  - Sub-Field: id

**How to capture:**
1. With test data loaded
2. Scroll to the bottom of a test case
3. Capture the "Current Value" and "Parsed Value" sections

**Purpose:** Verifies the data format is correct

---

### 📸 Screenshot 12: All Three Test Cases
**File Name:** `12-all-three-test-cases.png`

**What to capture:**
- All three test cases with different test data:
  - Candidate.primarySkills with test data
  - ClientCorporation.requirements with test data
  - JobOrder.categories with test data

**How to capture:**
1. Click "Test ADD" on all three test cases
2. Zoom out if needed to fit all three
3. Or capture as a tall scrolling screenshot

**Purpose:** Shows the bugfix works for multiple to-many fields

---

## Quick Screenshot Checklist

Use this checklist while capturing screenshots:

- [ ] 📸 Screenshot 1: Test Page Overview
- [ ] 📸 Screenshot 2: Field Type Debugger - Candidate.primarySkills
- [ ] 📸 Screenshot 3: ToManyFieldInput Component - Initial State
- [ ] 📸 Screenshot 4: Operation Dropdown Expanded
- [ ] 📸 Screenshot 5: Association Mode Dropdown Expanded
- [ ] 📸 Screenshot 6: Replace Operation Selected
- [ ] 📸 Screenshot 7: Adding a New ID
- [ ] 📸 Screenshot 8: New ID Added as Badge
- [ ] 📸 Screenshot 9: Console Logs - Field Detection
- [ ] 📸 Screenshot 10: Console Logs - Value Parsing
- [ ] 📸 Screenshot 11: Raw JSON Value Display
- [ ] 📸 Screenshot 12: All Three Test Cases

---

## Screenshot Tips

### For UI Screenshots:
- Use full browser viewport (not just browser window)
- Ensure good contrast (use light mode if dark mode text is hard to read)
- Zoom to 100% (not zoomed in or out)
- Clear any notification popups that might obscure content

### For Console Screenshots:
- Filter console to show only relevant logs
- Expand collapsed objects to show details
- Use "Preserve log" to keep logs when navigating
- Consider using console's timestamp feature
- Highlight or circle important log lines

### For Expanded Dropdowns:
- Capture immediately after clicking to expand
- Ensure the entire dropdown menu is visible
- Don't let the dropdown get cut off at screen edge
- Show the selected value in the trigger

---

## Annotation Suggestions

After capturing screenshots, consider adding annotations:

- **Red boxes** around key elements being tested
- **Green checkmarks** next to correct behavior
- **Arrows** pointing to specific UI elements
- **Text labels** explaining what each section does
- **Numbers** showing sequence of actions

---

## Organizing Screenshots

Suggested folder structure:
```
screenshots/
├── 01-ui/
│   ├── 01-test-page-overview.png
│   ├── 02-field-type-debugger-primary-skills.png
│   ├── 03-tomany-input-initial.png
│   ├── 04-operation-dropdown-expanded.png
│   ├── 05-association-mode-dropdown.png
│   ├── 06-replace-operation-warning.png
│   ├── 07-adding-new-id.png
│   ├── 08-new-id-badge.png
│   ├── 11-raw-json-value.png
│   └── 12-all-three-test-cases.png
└── 02-console/
    ├── 09-console-field-detection.png
    └── 10-console-value-parsing.png
```

---

## Final Verification

Before considering the screenshot capture complete:

✅ All 12 screenshots captured  
✅ Screenshots are clear and readable  
✅ Console logs show expected debug output  
✅ UI shows ToManyFieldInput component (not text input)  
✅ Field type detection shows TO_MANY  
✅ Associated entity shows "Skill"  
✅ Operation dropdown shows all three options  
✅ IDs display as badges with X buttons  
✅ JSON format matches expected structure  

---

## Questions to Answer with Screenshots

Your screenshots should clearly answer:

1. **Does the field get detected as TO_MANY?** → Screenshot 2, 9
2. **Does the ToManyFieldInput component render?** → Screenshot 3
3. **Are all operation options available?** → Screenshot 4
4. **Does associated entity metadata load?** → Screenshot 5
5. **Do IDs appear as badges?** → Screenshot 8
6. **Does the JSON format match expectations?** → Screenshot 11
7. **Are console logs showing correct values?** → Screenshot 9, 10
8. **Does it work for multiple to-many fields?** → Screenshot 12
