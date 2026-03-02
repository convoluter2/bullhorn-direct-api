# Visual Console Output Examples

## Example 1: SCALAR Field (Most Common Scenario)

### When Candidate Entity is Selected

```
📚 Fetching fresh metadata for: Candidate
✅ Metadata loaded and cached for: Candidate - Fields: 247
🎯 CANDIDATE METADATA LOADED 🎯
primarySkills field found: {
  name: 'primarySkills',
  label: 'Primary Skills',
  type: 'SCALAR',
  dataType: 'String',
  dataSpecialization: 'EDITABLE_PICKER',
  confidential: false,
  optional: true,
  associatedEntity: undefined,
  associationType: undefined
}
  - Type: SCALAR
  - DataType: String
  - AssociationType: None
  - AssociatedEntity: None

All TO_MANY fields in Candidate:
  - businessSectors → BusinessSector
  - categories → Category
  - secondarySkills → Skill
  - specialties → Specialty
=========================================
```

**Note:** `primarySkills` is NOT in the TO_MANY list above.

### When primarySkills is Mapped in CSV Loader

```
CSV Loader Field Mapping Debug: {
  csvColumn: 'primarySkills',
  bullhornField: 'primarySkills',
  fieldMeta: {
    name: 'primarySkills',
    type: 'SCALAR',
    dataType: 'String',
    associationType: undefined,
    associatedEntity: undefined
  },
  isToMany: false,
  isToOne: false
}

🎯 CANDIDATE.PRIMARYSKILLS FIELD DETECTED 🎯
Field Metadata Full Details: {
  name: 'primarySkills',
  label: 'Primary Skills',
  type: 'SCALAR',
  dataType: 'String',
  dataSpecialization: 'EDITABLE_PICKER',
  confidential: false,
  optional: true,
  associatedEntity: undefined,
  associationType: undefined
}
Is TO_MANY? ❌ NO - Plain field
Is TO_ONE? ❌ NO
Current To-Many Config: Not configured
All available fields in metadata: 247
=========================================
```

### UI Appearance (SCALAR)

```
┌─────────────────────────────────────────────────────┐
│ CSV Column: primarySkills                           │
│            ↓                                         │
│ Bullhorn Field: [primarySkills ▼]                  │
│ Transform: [Trim ▼]                                 │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ Field Type: SCALAR                                  │
│ Association Type: N/A                               │
│ Data Type: String                                   │
│ Associated Entity: N/A                              │
│ Is TO_MANY: ❌ NO                                   │
│ Is TO_ONE: ❌ NO                                    │
└─────────────────────────────────────────────────────┘

(No To-Many configuration box)
```

---

## Example 2: TO_MANY Field (Alternate Scenario)

### When Candidate Entity is Selected

```
📚 Fetching fresh metadata for: Candidate
✅ Metadata loaded and cached for: Candidate - Fields: 247
🎯 CANDIDATE METADATA LOADED 🎯
primarySkills field found: {
  name: 'primarySkills',
  label: 'Primary Skills',
  type: 'TO_MANY',
  dataType: undefined,
  associatedEntity: {
    entity: 'Skill',
    entityMetaUrl: 'https://rest.bullhornstaffing.com/rest-services/12345/meta/Skill'
  },
  associationType: 'TO_MANY'
}
  - Type: TO_MANY
  - DataType: undefined
  - AssociationType: TO_MANY
  - AssociatedEntity: Skill

All TO_MANY fields in Candidate:
  - businessSectors → BusinessSector
  - categories → Category
  - primarySkills → Skill
  - secondarySkills → Skill
  - specialties → Specialty
=========================================
```

**Note:** `primarySkills → Skill` IS in the TO_MANY list.

### When primarySkills is Mapped in CSV Loader

```
CSV Loader Field Mapping Debug: {
  csvColumn: 'primarySkills',
  bullhornField: 'primarySkills',
  fieldMeta: {
    name: 'primarySkills',
    type: 'TO_MANY',
    dataType: undefined,
    associationType: 'TO_MANY',
    associatedEntity: {
      entity: 'Skill',
      entityMetaUrl: 'https://rest.bullhornstaffing.com/rest-services/12345/meta/Skill'
    }
  },
  isToMany: true,
  isToOne: false
}

🎯 CANDIDATE.PRIMARYSKILLS FIELD DETECTED 🎯
Field Metadata Full Details: {
  name: 'primarySkills',
  label: 'Primary Skills',
  type: 'TO_MANY',
  dataType: undefined,
  associatedEntity: {
    entity: 'Skill',
    entityMetaUrl: 'https://rest.bullhornstaffing.com/rest-services/12345/meta/Skill'
  },
  associationType: 'TO_MANY'
}
Is TO_MANY? ✅ YES - Will show To-Many config selector
Is TO_ONE? ❌ NO
Current To-Many Config: { operation: 'add', subField: 'id' }
All available fields in metadata: 247
=========================================
```

### UI Appearance (TO_MANY)

```
┌─────────────────────────────────────────────────────┐
│ CSV Column: primarySkills                           │
│            ↓                                         │
│ Bullhorn Field: [primarySkills ▼]                  │
│ Transform: [No transform] (disabled)                │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ Field Type: TO_MANY                     (colored)   │
│ Association Type: TO_MANY                           │
│ Data Type: undefined                                │
│ Associated Entity: Skill                            │
│ Is TO_MANY: ✅ YES                                  │
│ Is TO_ONE: ❌ NO                                    │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ To-Many Configuration: primarySkills (Skill)        │
│                                                     │
│ Operation:  [Add ▼]                                 │
│             - Add: Add to existing associations     │
│             - Remove: Remove from associations      │
│             - Replace: Replace all associations     │
│                                                     │
│ Sub-field:  [id ▼]                                  │
│             - id: Match by entity ID                │
│             - name: Match by name                   │
│                                                     │
│ Format: Comma-separated values                      │
│ Example: 123,456,789                                │
└─────────────────────────────────────────────────────┘
```

---

## Example 3: Field Not Found

### When Candidate Entity is Selected (Field Doesn't Exist)

```
📚 Fetching fresh metadata for: Candidate
✅ Metadata loaded and cached for: Candidate - Fields: 247
🎯 CANDIDATE METADATA LOADED 🎯
⚠️ primarySkills field NOT FOUND in Candidate metadata

All TO_MANY fields in Candidate:
  - businessSectors → BusinessSector
  - categories → Category
  - secondarySkills → Skill
  - specialties → Specialty
=========================================
```

**This means:** The `primarySkills` field doesn't exist in your Bullhorn instance.

---

## Example 4: Cached Metadata

### When Using Cached Data

```
📦 Using cached metadata for: Candidate
```

**No additional console output** unless you:
1. Click the refresh icon, OR
2. Map the primarySkills field (which still triggers the field detection log)

To force fresh metadata:
- Click the refresh icon (⟳) next to "Entity Type"
- This will show "📚 Fetching fresh metadata for: Candidate"

---

## Comparison Table

| Indicator | SCALAR | TO_MANY |
|-----------|---------|---------|
| `type` | "SCALAR" | "TO_MANY" |
| `associationType` | undefined | "TO_MANY" |
| `associatedEntity` | undefined | { entity: "Skill" } |
| `Is TO_MANY?` | ❌ NO | ✅ YES |
| TO_MANY in list | Not listed | Listed as "primarySkills → Skill" |
| UI: To-Many config | Not shown | Shown |
| UI: Transform dropdown | Enabled | Disabled |
| CSV format | Text values | ID values |
| CSV example | "Java, Python" | "101,102,103" |

---

## Console Filtering Tips

In Chrome DevTools Console:

1. **Filter by emoji:**
   - Type `🎯` in the filter box
   - Shows only the enhanced debug output

2. **Filter by text:**
   - Type `CANDIDATE.PRIMARY` in filter
   - Shows primarySkills-specific output

3. **Clear console:**
   - Click 🚫 icon or press Ctrl+L (Cmd+L on Mac)
   - Start fresh before test

---

## Timeline of Console Messages

```
User Action                     Console Output
═══════════════════════════════════════════════════════════════
Select "Candidate"        →     📚 Fetching metadata...
                          →     ✅ Metadata loaded...
                          →     🎯 CANDIDATE METADATA LOADED
                          →     primarySkills field found: {...}
                          →     All TO_MANY fields...

Upload CSV                →     CSV loaded: 3 rows, 4 columns

Map primarySkills         →     CSV Loader Field Mapping Debug: {...}
                          →     🎯 PRIMARYSKILLS FIELD DETECTED
                          →     Field Metadata Full Details: {...}
                          →     Is TO_MANY? [YES/NO]
                          →     Current To-Many Config: ...

Click Preview/Import      →     (Import process logs)
```

---

## Browser Compatibility

Console output should work in:
- ✅ Chrome/Edge (DevTools)
- ✅ Firefox (Developer Tools)
- ✅ Safari (Web Inspector)

Emojis may not display in older browsers, but text output will still be visible.

---

## Saving Console Output

### Method 1: Right-click → Save As
1. Right-click in Console
2. Select "Save as..."
3. Save as `.log` file

### Method 2: Copy/Paste
1. Click in Console
2. Ctrl+A (Cmd+A on Mac) to select all
3. Ctrl+C (Cmd+C) to copy
4. Paste into text editor

### Method 3: Screenshot
1. Select Console content
2. Use OS screenshot tool
3. Capture visible output
