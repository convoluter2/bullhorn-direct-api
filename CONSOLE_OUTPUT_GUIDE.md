# Console Output Guide for Candidate.primarySkills Test

## Overview
This document describes the expected console output when testing the `Candidate.primarySkills` field in CSV Loader.

## Test Files
- **Test CSV**: `/candidate_skills_test.csv`
- **Test Documentation**: `/CANDIDATE_PRIMARY_SKILLS_TEST.md`

## Console Output Timeline

### 1. When Entity "Candidate" is Selected

```
📚 Fetching fresh metadata for: Candidate
```
OR (if cached):
```
📦 Using cached metadata for: Candidate
```

Then you should see:
```
✅ Metadata loaded and cached for: Candidate - Fields: [number]
🎯 CANDIDATE METADATA LOADED 🎯
primarySkills field found: {
  name: "primarySkills",
  label: "Primary Skills",
  type: "SCALAR" or "TO_MANY",
  dataType: "String" or other,
  associatedEntity: undefined or { entity: "Skill", entityMetaUrl: "..." }
}
  - Type: SCALAR (or TO_MANY)
  - DataType: String
  - AssociationType: None (or TO_MANY)
  - AssociatedEntity: None (or Skill)

All TO_MANY fields in Candidate:
  - [list of TO_MANY fields]
=========================================
```

### 2. When CSV File is Uploaded

```
CSV loaded: 3 rows, 4 columns
```

### 3. When primarySkills Field is Mapped

When you select "primarySkills" from the Bullhorn field dropdown, you'll see:

```
CSV Loader Field Mapping Debug: {
  csvColumn: "primarySkills",
  bullhornField: "primarySkills",
  fieldMeta: {
    name: "primarySkills",
    type: "SCALAR",
    dataType: "String",
    associationType: undefined,
    associatedEntity: undefined
  },
  isToMany: false,
  isToOne: false
}

🎯 CANDIDATE.PRIMARYSKILLS FIELD DETECTED 🎯
Field Metadata Full Details: {
  name: "primarySkills",
  label: "Primary Skills",
  type: "SCALAR",
  dataType: "String",
  dataSpecialization: undefined,
  confidential: false,
  optional: true,
  associatedEntity: undefined,
  associationType: undefined
}
Is TO_MANY? ❌ NO - Plain field
Is TO_ONE? ❌ NO
Current To-Many Config: Not configured
All available fields in metadata: [number]
=========================================
```

## Interpreting the Output

### Case 1: primarySkills is SCALAR (Most Common)

**Console shows:**
- `type: "SCALAR"`
- `associationType: undefined`
- `Is TO_MANY? ❌ NO - Plain field`

**UI shows:**
- Field info box with "Is TO_MANY: ❌ NO"
- No To-Many configuration selector
- Transform dropdown is enabled

**CSV Import Behavior:**
- Values imported as-is (comma-separated string)
- Example: "JavaScript, React, TypeScript" stored as text
- No entity association created

### Case 2: primarySkills is TO_MANY (Rare, but possible)

**Console shows:**
- `type: "TO_MANY"`
- `associationType: "TO_MANY"`
- `Is TO_MANY? ✅ YES - Will show To-Many config selector`
- `associatedEntity: { entity: "Skill", ... }`

**UI shows:**
- Field info box with "Is TO_MANY: ✅ YES"
- To-Many configuration selector appears
- Transform dropdown is disabled

**CSV Import Behavior:**
- Values must be IDs or lookup values
- Example: "123, 456, 789" (Skill IDs)
- Creates entity associations

## Testing Checklist

- [ ] Open browser DevTools (F12)
- [ ] Go to Console tab
- [ ] Clear console (optional, for clean output)
- [ ] Select "Candidate" entity
- [ ] Look for "🎯 CANDIDATE METADATA LOADED 🎯"
- [ ] Upload `candidate_skills_test.csv`
- [ ] Map "primarySkills" CSV column to "primarySkills" Bullhorn field
- [ ] Look for "🎯 CANDIDATE.PRIMARYSKILLS FIELD DETECTED 🎯"
- [ ] Capture/screenshot console output
- [ ] Note field type and behavior in UI

## Common Console Patterns

### Pattern A: Field Not Found
```
⚠️ primarySkills field NOT FOUND in Candidate metadata
```
**Meaning**: The field doesn't exist in this Bullhorn instance or API response

### Pattern B: Cached Metadata Used
```
📦 Using cached metadata for: Candidate
```
**Action**: Click refresh button to force fresh metadata fetch

### Pattern C: Multiple TO_MANY Fields Listed
```
All TO_MANY fields in Candidate:
  - businessSectors → BusinessSector
  - categories → Category
  - primarySkills → Skill
  - secondarySkills → Skill
  - specialties → Specialty
```
**Meaning**: Your instance has TO_MANY associations configured

## Debugging Tips

### No Console Output
1. Verify DevTools Console is open
2. Check console filters (should show "All levels")
3. Try refreshing the page
4. Check that you've authenticated to Bullhorn

### Unexpected Field Type
1. This reflects your Bullhorn instance configuration
2. Different instances may have different field types
3. Custom fields may behave differently than standard fields

### Missing Field Metadata
1. Click the refresh icon next to "Entity Type"
2. This forces a fresh metadata fetch
3. Check that field exists in Bullhorn UI

## Expected Output Examples

### Example 1: Standard SCALAR Field
```javascript
{
  name: "primarySkills",
  label: "Primary Skills",
  type: "SCALAR",
  dataType: "String",
  dataSpecialization: "EDITABLE_PICKER",
  associationType: undefined,
  associatedEntity: undefined
}
```

### Example 2: TO_MANY Association
```javascript
{
  name: "primarySkills",
  label: "Primary Skills",  
  type: "TO_MANY",
  dataType: undefined,
  associationType: "TO_MANY",
  associatedEntity: {
    entity: "Skill",
    entityMetaUrl: "https://rest.bullhornstaffing.com/rest-services/.../meta/Skill"
  }
}
```

## Next Steps After Testing

1. Document actual console output
2. Note field type (SCALAR vs TO_MANY)
3. Test import with sample CSV
4. Verify data in Bullhorn
5. Report findings

## Related Console Commands

Run these in browser console for additional debugging:

```javascript
// View all metadata
console.log(window.__REACT_DEVTOOLS_GLOBAL_HOOK__)

// Check session
console.log('Session:', bullhornAPI.getSession())
```

## Support

If console output differs significantly from this guide:
1. Capture full console output
2. Note your Bullhorn instance version
3. Check Bullhorn API documentation for your instance
4. Review field configuration in Bullhorn Admin
