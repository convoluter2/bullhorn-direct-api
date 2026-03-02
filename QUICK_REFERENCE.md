# Quick Reference: Testing Candidate.primarySkills

## 🚀 Quick Start (30 seconds)

1. **Open Console**: Press `F12` → Click `Console` tab
2. **Navigate**: Go to CSV Loader tab in the app
3. **Select Entity**: Choose "Candidate" from Entity Type dropdown
4. **Upload CSV**: Use `/candidate_skills_test.csv` from project root
5. **Map Field**: Select `primarySkills` in the mapping dropdown

## 🎯 What to Look For

### In Console (Browser DevTools)

Look for these markers:
```
🎯 CANDIDATE METADATA LOADED 🎯          ← When Candidate is selected
🎯 CANDIDATE.PRIMARYSKILLS FIELD DETECTED 🎯  ← When field is mapped
```

### Key Information to Capture

From the console output, note these values:

| Property | Example Value | Meaning |
|----------|---------------|---------|
| `type` | "SCALAR" or "TO_MANY" | How Bullhorn treats this field |
| `dataType` | "String" | Data format |
| `associationType` | undefined or "TO_MANY" | Association relationship |
| `associatedEntity` | undefined or "Skill" | Related entity type |
| `Is TO_MANY?` | "❌ NO" or "✅ YES" | Quick visual indicator |

## 🔍 Expected Behavior

### If SCALAR (most common):
- ✅ No To-Many config box appears
- ✅ Transform dropdown is available
- ✅ CSV value stored as plain text
- ✅ Example: "JavaScript, React" → stored as-is

### If TO_MANY (less common):
- ✅ To-Many config box appears
- ✅ Transform dropdown is disabled
- ✅ CSV value must be IDs
- ✅ Example: "123,456" → links to Skill IDs

## 📸 Screenshot Checklist

Capture these views:

1. **Console when Candidate selected**
   - Shows: "CANDIDATE METADATA LOADED"
   
2. **Console when primarySkills mapped**
   - Shows: "CANDIDATE.PRIMARYSKILLS FIELD DETECTED"
   
3. **UI field info box**
   - Shows: Field Type, Is TO_MANY, etc.
   
4. **UI mapping configuration**
   - Shows: Whether To-Many selector appears

## ⚡ One-Liner Test

Run this exact sequence:
```
F12 → Console → Select "Candidate" → Upload CSV → Map primarySkills → Check Console
```

## 📊 Quick Decision Tree

```
Does console show "Is TO_MANY? ✅ YES"?
│
├─ YES → Field is TO_MANY
│         - Look for To-Many config selector in UI
│         - CSV should contain Skill IDs
│         - Will create entity associations
│
└─ NO  → Field is SCALAR  
          - No To-Many config in UI
          - CSV contains text values
          - Will store as comma-separated string
```

## 🐛 Troubleshooting (1 minute)

| Problem | Solution |
|---------|----------|
| No console output | Verify DevTools is open, try refresh |
| Field not found | Click refresh icon, check Bullhorn config |
| Wrong field type | This reflects your instance setup |
| No metadata loaded | Check authentication, reconnect |

## 📝 Report Template

```
FIELD TYPE: [SCALAR / TO_MANY]
CONSOLE SHOWS TO_MANY: [YES / NO]
UI SHOWS TO_MANY CONFIG: [YES / NO]
ASSOCIATED ENTITY: [None / Skill / Other]

✅ Test Complete
```

## 🔗 Full Documentation

- Complete guide: `/CANDIDATE_PRIMARY_SKILLS_TEST.md`
- Console details: `/CONSOLE_OUTPUT_GUIDE.md`
- Test CSV: `/candidate_skills_test.csv`
