# CSV Upload Test Guide

## Fixes Applied

### Error Prevention
1. Added null/undefined checks for `mappings` array throughout the component
2. Added null/undefined checks for `availableFields` array
3. Added error handling for CSV file parsing
4. Added try-catch wrapper around entire `executeImport` function
5. Added validation for empty CSV files and missing headers
6. Added safety checks for field metadata access

### Changes Made
- Line 77: Changed `mappings.map((mapping) =>` to `(mappings || []).map((mapping) =>`
- Line 78-79: Added null check for mapping and safe field meta access
- Line 145-176: Enhanced `handleFileUpload` with comprehensive error handling
- Line 156-166: Added safety checks to `updateMapping` and `updateTransform` functions
- Line 251-814: Wrapped `executeImport` in try-catch block
- Line 257-260: Added mappings null check before filtering
- Line 262: Added null check in mapping filter
- Line 1065: Added safety check for availableFields
- Line 1171: Added safety check for mappings in button disabled logic

## How to Test CSV Upload

### Test CSV File Content
Create a file named `test_candidates.csv` with this content:

```csv
id,firstName,lastName,email
12345,John,Doe,john.doe@example.com
67890,Jane,Smith,jane.smith@example.com
```

### Testing Steps

1. **Connect to Bullhorn**
   - Open the app
   - Use Connection Manager or manual auth to connect

2. **Navigate to CSV Loader Tab**
   - Click on the "CSV Loader" tab

3. **Select Entity**
   - Choose "Candidate" from the Entity Type dropdown
   - Wait for metadata to load

4. **Upload CSV File**
   - Click "Choose File" button
   - Select your `test_candidates.csv` file
   - Verify toast notification shows "CSV loaded: 2 rows, 4 columns"

5. **Map Fields**
   - Map CSV columns to Bullhorn fields:
     - `id` → `id`
     - `firstName` → `firstName`
     - `lastName` → `lastName`
     - `email` → `email`
   - Or skip any columns by selecting "Skip"

6. **Configure Lookup**
   - Set "Lookup Field" to `id` (to find existing records)
   - Enable "Update Existing" switch
   - Optionally enable "Create New" switch

7. **Preview (Dry Run)**
   - Ensure "Dry Run Mode" is ON (default)
   - Click "Preview Import" button
   - Review results to see what would happen

8. **Execute Import**
   - If preview looks good, turn OFF "Dry Run Mode"
   - Click "Start Import/Update" button
   - Monitor progress bar
   - Review results after completion

### Expected Behavior

✅ **Success Indicators:**
- CSV file loads without errors
- Field mappings appear for each column
- Preview shows expected create/update actions
- Import completes successfully
- Results table shows status for each row

❌ **Error Cases Handled:**
- Empty CSV file → "CSV file is empty" error
- No headers → "CSV file has no headers" error
- No entity selected → "Please upload a CSV and select an entity" error
- No mapped fields → "Please map at least one field" error
- Invalid lookup field → "Lookup field must have a corresponding CSV column" error

### Troubleshooting

**Blank Page Issue:**
- Fixed by adding comprehensive null/undefined checks
- Error boundary now catches and displays errors properly
- Console will show detailed error information

**"Cannot read properties of undefined" Error:**
- Fixed by ensuring all array operations have fallback to `[]`
- All object property accesses use optional chaining (`?.`)
- Mapping operations validate data before processing

**CSV Not Loading:**
- Check browser console for detailed error messages
- Verify CSV file is properly formatted (comma-separated)
- Ensure CSV has at least one header row

**Fields Not Showing:**
- Wait for metadata to finish loading (skeleton loaders will appear)
- Check that entity is selected
- Try refreshing entity list with refresh button

## Additional Features

### Pause/Resume
- Click "Pause" during import to safely pause
- Progress is saved to KV storage
- Can resume after page refresh

### Rollback
- After successful import, "Rollback" button appears
- Restores previous values for updated records
- Only available for update operations (not creates)

### Export Results
- Export CSV or JSON of import results
- Useful for audit trail and troubleshooting

### Speed Control
- Adjust processing speed in settings
- Useful for rate limit management

## Advanced Testing

### Test To-Many Associations
```csv
id,specialties
12345,"123,456,789"
67890,"111,222"
```
- Map `specialties` field
- Configure To-Many operation (add/remove/replace)
- Specify whether IDs are numeric or need lookup

### Test To-One Associations
```csv
id,owner
12345,555
67890,666
```
- Map `owner` field
- CSV value should be the related entity ID

### Test Null Values
```csv
id,customText1,customText2
12345,null,
67890,"Some Value",null
```
- Empty values and "null" string both set field to null
- Useful for clearing field values

## Known Limitations

1. Large CSV files (>10,000 rows) may take time to process
2. Rate limits apply - adjust speed control if needed
3. Some entity types may not support all field types
4. Complex nested associations may require multiple imports

## Support

If you encounter issues:
1. Check browser console for detailed errors
2. Review audit logs tab for operation history
3. Export error results for analysis
4. Use dry run mode first to preview changes
