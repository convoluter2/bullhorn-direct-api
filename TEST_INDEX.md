# Testing Documentation Index

## 📖 About This Test Suite

This documentation helps you test and verify the `Candidate.primarySkills` field behavior in the CSV Loader component. Enhanced console logging has been added to provide detailed insights into field metadata, type detection, and import processing.

---

## 🚀 Where to Start

### Choose Your Path:

| If you want to... | Start here | Time |
|-------------------|------------|------|
| **Get started quickly** | [QUICK_REFERENCE.md](QUICK_REFERENCE.md) | 30 sec |
| **Run complete test** | [CANDIDATE_PRIMARY_SKILLS_TEST.md](CANDIDATE_PRIMARY_SKILLS_TEST.md) | 5 min |
| **Understand console output** | [CONSOLE_OUTPUT_GUIDE.md](CONSOLE_OUTPUT_GUIDE.md) | 10 min |
| **See output examples** | [CONSOLE_EXAMPLES.md](CONSOLE_EXAMPLES.md) | 5 min |
| **Get overview** | [README_TESTING.md](README_TESTING.md) | 5 min |

---

## 📚 Documentation Files

### Quick Reference Materials

#### 🏃 [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
**Fast 30-second test guide**
- One-liner test procedure
- Quick decision tree
- Essential checklist
- Troubleshooting table
- **Best for:** Experienced users, repeat testing

#### 📊 [CONSOLE_EXAMPLES.md](CONSOLE_EXAMPLES.md)
**Visual console output examples**
- Example output for SCALAR fields
- Example output for TO_MANY fields
- Side-by-side comparisons
- UI appearance mockups
- **Best for:** Visual learners, verification

### Complete Guides

#### 📘 [CANDIDATE_PRIMARY_SKILLS_TEST.md](CANDIDATE_PRIMARY_SKILLS_TEST.md)
**Complete test procedure**
- Detailed step-by-step instructions
- Test objectives and requirements
- Expected results documentation
- Full test results template
- **Best for:** First-time testing, thorough documentation

#### 📗 [CONSOLE_OUTPUT_GUIDE.md](CONSOLE_OUTPUT_GUIDE.md)
**Console output reference**
- Timeline of console messages
- Interpreting output patterns
- Common patterns and meanings
- Debugging commands
- **Best for:** Troubleshooting, deep analysis

#### 📕 [README_TESTING.md](README_TESTING.md)
**Testing overview and summary**
- Purpose and goals
- Code changes made
- Success criteria
- Learning outcomes
- **Best for:** Understanding context, planning

### Test Data

#### 📄 [candidate_skills_test.csv](candidate_skills_test.csv)
**Sample CSV file**
- 3 test records
- primarySkills field with various values
- Ready to upload
- **Best for:** Running actual tests

---

## 🎯 Common Use Cases

### Use Case 1: "I need to test this quickly"

```
1. Read: QUICK_REFERENCE.md
2. Open: Browser console (F12)
3. Use: candidate_skills_test.csv
4. Look for: 🎯 markers in console
```

**Time:** 30 seconds  
**Difficulty:** Easy

---

### Use Case 2: "First time testing, need detailed guidance"

```
1. Read: README_TESTING.md (overview)
2. Follow: CANDIDATE_PRIMARY_SKILLS_TEST.md (procedure)
3. Reference: CONSOLE_OUTPUT_GUIDE.md (interpretation)
4. Compare: CONSOLE_EXAMPLES.md (verification)
5. Use: candidate_skills_test.csv (data)
```

**Time:** 15 minutes  
**Difficulty:** Easy-Medium

---

### Use Case 3: "Console output looks wrong, need help"

```
1. Check: CONSOLE_EXAMPLES.md (expected output)
2. Compare: CONSOLE_OUTPUT_GUIDE.md (patterns)
3. Review: QUICK_REFERENCE.md (troubleshooting)
4. Try: Refresh metadata, clear cache
```

**Time:** 5 minutes  
**Difficulty:** Medium

---

### Use Case 4: "Need to document/report results"

```
1. Follow: CANDIDATE_PRIMARY_SKILLS_TEST.md
2. Capture: Screenshots of console
3. Fill: Test Results Template
4. Compare: CONSOLE_EXAMPLES.md
5. Report: Findings to team
```

**Time:** 10 minutes  
**Difficulty:** Easy

---

## 🔍 Key Concepts

### SCALAR Field
- Plain text field
- Values stored as-is
- Example: "JavaScript, React"
- No entity associations
- Most common type

### TO_MANY Field
- Entity association
- Links to related records
- Example: Skill IDs "101,102,103"
- Requires configuration
- Less common type

### Field Metadata
Information about a field retrieved from Bullhorn API:
- `type`: Field type (SCALAR, TO_MANY, etc.)
- `dataType`: Data format (String, Integer, etc.)
- `associationType`: Relationship type
- `associatedEntity`: Related entity type

---

## 🛠️ What Was Changed

### Enhanced Components

#### CSVLoader.tsx (lines 1344-1359)
```javascript
// Added special detection for primarySkills
if (mapping.bullhornField === 'primarySkills') {
  console.log('🎯 CANDIDATE.PRIMARYSKILLS FIELD DETECTED 🎯')
  // Detailed field metadata logging
}
```

#### use-entity-metadata.ts (lines 135-157)
```javascript
// Added Candidate metadata logging
if (entity === 'Candidate') {
  console.log('🎯 CANDIDATE METADATA LOADED 🎯')
  // Show primarySkills details
  // List all TO_MANY fields
}
```

### Console Markers

Special markers added for easy identification:
- `🎯 CANDIDATE METADATA LOADED 🎯`
- `🎯 CANDIDATE.PRIMARYSKILLS FIELD DETECTED 🎯`

---

## ✅ Testing Checklist

Before you start:
- [ ] Review appropriate documentation
- [ ] Have test CSV ready
- [ ] Browser DevTools accessible
- [ ] Authenticated to Bullhorn

During test:
- [ ] Console is open
- [ ] Candidate entity selected
- [ ] CSV uploaded
- [ ] primarySkills field mapped
- [ ] Console output captured

After test:
- [ ] Field type documented
- [ ] Screenshots saved
- [ ] Results recorded
- [ ] Findings shared

---

## 📞 Support Resources

### In This Repository
- All `.md` files in root directory
- Source code in `/src/components/CSVLoader.tsx`
- Hooks in `/src/hooks/use-entity-metadata.ts`

### External Resources
- Bullhorn API Documentation
- Your instance administrator
- Bullhorn support portal

---

## 🎓 Learning Objectives

After completing this test, you will understand:

1. ✅ How to read Bullhorn field metadata
2. ✅ Difference between SCALAR and TO_MANY fields
3. ✅ How CSV Loader adapts to field types
4. ✅ How to use console logging for debugging
5. ✅ How to configure To-Many associations

---

## 📈 Typical Results

### Most Common Outcome
- **Field Type:** SCALAR
- **Console Shows:** "Is TO_MANY? ❌ NO"
- **UI Shows:** No To-Many configuration
- **CSV Format:** Comma-separated text

### Less Common Outcome
- **Field Type:** TO_MANY
- **Console Shows:** "Is TO_MANY? ✅ YES"
- **UI Shows:** To-Many configuration selector
- **CSV Format:** Entity IDs

---

## 🔄 Workflow Diagram

```
START
  ↓
Open Console (F12)
  ↓
Select Candidate Entity
  ↓
Watch Console → See "🎯 CANDIDATE METADATA LOADED"
  ↓
Upload CSV
  ↓
Map primarySkills Field
  ↓
Watch Console → See "🎯 PRIMARYSKILLS FIELD DETECTED"
  ↓
Review Field Info Box
  ↓
Verify UI Behavior
  ↓
Test Import (Dry Run)
  ↓
Document Results
  ↓
END
```

---

## 📋 Quick Links

| Document | Link |
|----------|------|
| Quick Start | [QUICK_REFERENCE.md](QUICK_REFERENCE.md) |
| Full Test | [CANDIDATE_PRIMARY_SKILLS_TEST.md](CANDIDATE_PRIMARY_SKILLS_TEST.md) |
| Console Guide | [CONSOLE_OUTPUT_GUIDE.md](CONSOLE_OUTPUT_GUIDE.md) |
| Examples | [CONSOLE_EXAMPLES.md](CONSOLE_EXAMPLES.md) |
| Overview | [README_TESTING.md](README_TESTING.md) |
| Test CSV | [candidate_skills_test.csv](candidate_skills_test.csv) |

---

## 💡 Pro Tips

1. **Use emoji filter** in console: Type `🎯` to show only test output
2. **Clear console first** for clean results
3. **Take screenshots** before and after
4. **Test dry run first** before actual import
5. **Document field type** for future reference

---

**Last Updated:** 2024  
**Version:** 1.0  
**Test Suite:** Candidate.primarySkills Field Detection
