# Candidate.primarySkills Testing Documentation

## 📋 Overview

This test suite helps verify how the `Candidate.primarySkills` field behaves in the CSV Loader component, with enhanced console logging to show field metadata, type detection, and import behavior.

## 🎯 Purpose

Determine whether `primarySkills` is:
- **SCALAR**: A plain text field (comma-separated string)
- **TO_MANY**: An entity association to Skill records

This affects how CSV data should be formatted and how imports are processed.

## 📚 Documentation Files

| File | Purpose | Use When |
|------|---------|----------|
| **QUICK_REFERENCE.md** | Fast 30-second test guide | You need quick steps |
| **CANDIDATE_PRIMARY_SKILLS_TEST.md** | Complete test procedure | First time testing |
| **CONSOLE_OUTPUT_GUIDE.md** | Console output reference | Interpreting results |
| **candidate_skills_test.csv** | Sample test data | Running the test |

## 🚀 Quick Start

**For experienced users** (30 seconds):
1. Read: `QUICK_REFERENCE.md`
2. Use CSV: `candidate_skills_test.csv`
3. Check console for `🎯` markers

**For first-time users** (5 minutes):
1. Read: `CANDIDATE_PRIMARY_SKILLS_TEST.md`
2. Follow step-by-step instructions
3. Refer to: `CONSOLE_OUTPUT_GUIDE.md` for output interpretation

## 🔍 What This Test Does

### Code Changes Made

1. **Enhanced CSVLoader.tsx** (lines 1344-1359)
   - Added special detection for `primarySkills` field
   - Logs complete field metadata when mapped
   - Shows To-Many configuration status
   - Displays field type indicators (✅/❌)

2. **Enhanced use-entity-metadata.ts** (lines 135-157)
   - Logs when Candidate metadata is loaded
   - Shows primarySkills field details
   - Lists all TO_MANY fields in Candidate
   - Helps identify field type immediately

### Console Markers

Look for these special console indicators:

```
🎯 CANDIDATE METADATA LOADED 🎯
🎯 CANDIDATE.PRIMARYSKILLS FIELD DETECTED 🎯
```

These markers make it easy to find relevant output in the console.

## 📊 Test Scenarios

### Scenario 1: SCALAR Field (Expected)
```csv
id,primarySkills
12345,"JavaScript, React, TypeScript"
```
- Values imported as plain text
- No entity associations created
- Stored exactly as entered

### Scenario 2: TO_MANY Field (Possible)
```csv
id,primarySkills
12345,"101,102,103"
```
- Values must be Skill entity IDs
- Creates associations to Skill records
- Requires To-Many configuration

## 🎬 Step-by-Step Test Procedure

### Preparation
1. Open the application
2. Open browser DevTools (F12)
3. Navigate to Console tab
4. Ensure you're authenticated to Bullhorn

### Test Execution
1. Go to **CSV Loader** tab
2. Select **Candidate** from Entity Type dropdown
   - ✅ Console logs: "CANDIDATE METADATA LOADED"
3. Upload **candidate_skills_test.csv**
   - ✅ Console logs: CSV loaded message
4. Map the **primarySkills** field
   - ✅ Console logs: "PRIMARYSKILLS FIELD DETECTED"
5. Review console output and UI

### Verification
- [ ] Console shows field type
- [ ] Console shows association type
- [ ] UI field info box displays correctly
- [ ] To-Many config appears (or doesn't) as expected
- [ ] Test import works with dry run

## 📸 What to Capture

Take screenshots or copy text of:

1. **Console output** when Candidate is selected
2. **Console output** when primarySkills is mapped
3. **UI field mapping section** showing the field info box
4. **UI To-Many configuration** (if it appears)

## 🔎 Key Information to Document

From console output, record:

```
Field: primarySkills
Type: _____________ (SCALAR / TO_MANY)
DataType: _____________ (String / other)
AssociationType: _____________ (undefined / TO_MANY)
AssociatedEntity: _____________ (undefined / Skill)
```

## 📈 Expected Results

### Most Common: SCALAR Field

**Console Output:**
```javascript
type: "SCALAR"
dataType: "String"
associationType: undefined
Is TO_MANY? ❌ NO - Plain field
```

**UI Behavior:**
- Field info shows "Is TO_MANY: ❌ NO"
- No To-Many configuration selector
- Transform dropdown available

### Less Common: TO_MANY Field

**Console Output:**
```javascript
type: "TO_MANY"
associationType: "TO_MANY"
associatedEntity: { entity: "Skill" }
Is TO_MANY? ✅ YES - Will show To-Many config selector
```

**UI Behavior:**
- Field info shows "Is TO_MANY: ✅ YES"
- To-Many configuration selector appears
- Transform dropdown disabled

## 🐛 Troubleshooting

### No Console Output
- Ensure DevTools Console is open
- Check console filters (show all levels)
- Verify field name is exactly `primarySkills`

### Field Not Found
- Click refresh icon next to Entity Type
- Check that Candidate entity is selected
- Verify authentication is active

### Unexpected Behavior
- Different Bullhorn instances have different configs
- Custom fields may behave differently
- Consult your Bullhorn administrator

## 🔗 Related Files

**Source Code:**
- `/src/components/CSVLoader.tsx` - Main CSV import component
- `/src/hooks/use-entity-metadata.ts` - Metadata loading hook
- `/src/components/ToManyConfigSelector.tsx` - To-Many config UI

**Test Files:**
- `/candidate_skills_test.csv` - Sample test data

**Documentation:**
- `/QUICK_REFERENCE.md` - Quick start guide
- `/CANDIDATE_PRIMARY_SKILLS_TEST.md` - Detailed test procedure
- `/CONSOLE_OUTPUT_GUIDE.md` - Console output reference

## ✅ Success Criteria

A successful test should produce:

1. ✅ Clear console output showing field metadata
2. ✅ Correct field type detection (SCALAR or TO_MANY)
3. ✅ UI displays appropriate configuration options
4. ✅ Dry run import processes correctly
5. ✅ Documentation of results

## 📞 Next Steps

After completing the test:

1. Document the field type in your instance
2. Update CSV templates accordingly
3. Train users on correct data format
4. Test actual import with real data
5. Monitor results in Bullhorn

## 🎓 Learning Outcomes

This test demonstrates:

- How field metadata is loaded from Bullhorn API
- How field types are detected and displayed
- How CSV Loader adapts to different field types
- How console logging aids in debugging
- How To-Many associations are configured

---

**Quick Links:**
- [Quick Reference](QUICK_REFERENCE.md) - 30-second guide
- [Full Test Guide](CANDIDATE_PRIMARY_SKILLS_TEST.md) - Complete procedure
- [Console Guide](CONSOLE_OUTPUT_GUIDE.md) - Output interpretation
