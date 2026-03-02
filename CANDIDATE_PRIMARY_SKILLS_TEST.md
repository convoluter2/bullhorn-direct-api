# Candidate.primarySkills Field Test in CSV Loader

## Test Objective
Test the `Candidate.primarySkills` field mapping in CSV Loader to verify:
1. Field type detection (TO_MANY vs SCALAR)
2. Console output showing field metadata
3. To-Many configuration options
4. CSV processing behavior

## Test Instructions

### Step 1: Prepare Test Data
Create a CSV file named `candidate_skills_test.csv` with the following content:

```csv
id,firstName,lastName,primarySkills
12345,John,Doe,"JavaScript, React, TypeScript"
67890,Jane,Smith,"Python, Django"
```

### Step 2: Load CSV in CSV Loader
1. Navigate to the **CSV Loader** tab
2. Select **Candidate** as the entity type
3. Upload the test CSV file

### Step 3: Map the primarySkills Field
1. Map the `primarySkills` CSV column to the `primarySkills` Bullhorn field
2. **IMPORTANT**: Open browser Developer Console (F12)
3. Observe the console output

## Expected Console Output

When you select `primarySkills` in the field mapping dropdown, you should see:

```javascript
CSV Loader Field Mapping Debug: {
  csvColumn: "primarySkills",
  bullhornField: "primarySkills",
  fieldMeta: {
    name: "primarySkills",
    type: "SCALAR",              // or "TO_MANY" depending on API response
    dataType: "String",           // or other type
    associationType: undefined,   // or "TO_MANY"
    associatedEntity: undefined   // or { entity: "Skill" }
  },
  isToMany: false,  // or true
  isToOne: false
}
```

## Field Information Display

In the UI, below the field mapping selector, you should see a metadata box showing:

- **Field Type**: SCALAR (or TO_MANY)
- **Association Type**: N/A (or TO_MANY)
- **Data Type**: String
- **Associated Entity**: N/A (or Skill)
- **Is TO_MANY**: ❌ NO (or ✅ YES)
- **Is TO_ONE**: ❌ NO

## Testing Different Scenarios

### Scenario A: If primarySkills is SCALAR (comma-separated string)
- No To-Many configuration selector will appear
- CSV value will be imported as-is: "JavaScript, React, TypeScript"
- The field is treated as a plain text field

### Scenario B: If primarySkills is TO_MANY (association to Skill entity)
- A To-Many configuration selector will appear
- You can choose:
  - **Operation**: Add / Remove / Replace
  - **Sub-field**: id (default) or other lookup field
- CSV values should be IDs or lookup values depending on sub-field selection

## Console Logging Locations

The following console logs are triggered in `CSVLoader.tsx`:

1. **Line 1329-1342**: Field mapping debug output
   - Shows complete field metadata
   - Triggered when a Bullhorn field is selected in dropdown
   
2. **Line 1419**: To-Many config change
   - Shows when To-Many operation/sub-field is changed

## Troubleshooting

### No console output appearing
- Ensure Developer Console is open (F12 → Console tab)
- Check that you're actually selecting a field (not leaving it as "Skip")
- Verify the field name is exactly `primarySkills`

### Field shows as SCALAR but should be TO_MANY
- This indicates the Bullhorn API metadata reports it as SCALAR
- The field may be a simple text field, not an association
- Check the Bullhorn API documentation for your instance

### No To-Many configuration appearing
- Confirms the field is SCALAR type
- You can still import comma-separated text values
- The values will be stored as plain text, not entity associations

## Additional Debug Commands

Open the browser console and run these commands for more information:

```javascript
// Check if metadata is loaded
const metadata = // (access via React DevTools or component state)

// Check specific field
console.log('primarySkills field:', metadata?.fieldsMap?.primarySkills)

// Check all TO_MANY fields
Object.entries(metadata?.fieldsMap || {})
  .filter(([name, field]) => field.associationType === 'TO_MANY')
  .forEach(([name, field]) => console.log(name, field))
```

## Test Results Template

Fill out after testing:

```
Date: _______________
Bullhorn Instance: _______________

primarySkills Field Metadata:
- Type: _______________
- Data Type: _______________
- Association Type: _______________
- Associated Entity: _______________

Console Output (paste screenshot or text):
_______________

To-Many Config Visible: Yes / No

Import Test Result:
- Dry Run Status: _______________
- Actual Import Status: _______________
- Field Value in Bullhorn: _______________

Notes:
_______________
```

## Related Files

- `/src/components/CSVLoader.tsx` - Main component with console logging
- `/src/hooks/use-entity-metadata.ts` - Metadata fetching
- `/src/components/ToManyConfigSelector.tsx` - To-Many configuration UI
- `/src/lib/bullhorn-api.ts` - API calls

## Summary

This test helps verify that:
1. ✅ Console logging is working for field mapping
2. ✅ Field metadata is correctly retrieved from Bullhorn API
3. ✅ Field type detection (SCALAR vs TO_MANY) is accurate
4. ✅ UI responds appropriately to field type
5. ✅ CSV import processes the field correctly
