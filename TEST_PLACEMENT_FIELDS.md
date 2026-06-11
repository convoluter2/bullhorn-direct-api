# Test Plan: Placement dateBegin and dateEnd Fields in CSV Loader

## Goal
Verify that `dateBegin` and `dateEnd` fields are visible and usable in the CSV Loader for the Placement entity.

## Current Implementation

### 1. Hard-coded fields in `use-entity-metadata.ts` (lines 206-243)
- `dateBegin` (Start Date) - SCALAR, Timestamp, DATE, required
- `dateEnd` (End Date) - SCALAR, Timestamp, DATE, optional

### 2. Additional handling in `CSVLoader.tsx` (lines 136-172)
- Double-checks if dateBegin/dateEnd are in availableFields
- Adds them from metadata.fieldsMap if missing

## Test Steps

1. **Load Placement Entity**
   - Open the CSV Loader
   - Select "Placement" from the entity dropdown
   - Wait for metadata to load

2. **Upload Test CSV**
   - Create a CSV with columns: `PlacementID,StartDate,EndDate`
   - Upload the file

3. **Check Field Mapping Dropdown**
   - Open the dropdown for "StartDate" column mapping
   - Search for "dateBegin" or "Start Date"
   - Verify it appears in the list

4. **Check Field Mapping Dropdown**
   - Open the dropdown for "EndDate" column mapping
   - Search for "dateEnd" or "End Date"
   - Verify it appears in the list

5. **Map Fields**
   - Map StartDate → dateBegin
   - Map EndDate → dateEnd
   - Verify no error messages appear

6. **Check Field Metadata Display**
   - After mapping, verify the field metadata displays:
     - Field: dateBegin
     - Label: Start Date
     - Field Type: SCALAR
     - Data Type: Timestamp
     - Is TO_MANY: ❌ NO
     - Is TO_ONE: ❌ NO

## Expected Console Logs

When loading Placement metadata:
```
✨ Hard-coded field added: Placement.dateBegin (Start Date)
✨ Hard-coded field added: Placement.dateEnd (End Date)
🎯 PLACEMENT METADATA LOADED - CHECKING FOR DATE FIELDS 🎯
dateBegin field: FOUND { name: 'dateBegin', label: 'Start Date', ... }
dateEnd field: FOUND { name: 'dateEnd', label: 'End Date', ... }
```

When CSV file is loaded with Placement selected:
```
🔍 Placement dateBegin/dateEnd check: {
  hasDateBegin: true,
  hasDateEnd: true,
  ...
}
✅ Final Placement fields check: {
  totalFields: N,
  hasDateBegin: true,
  hasDateEnd: true,
  dateBeginField: { name: 'dateBegin', ... },
  dateEndField: { name: 'dateEnd', ... }
}
```

## Known Issues (From Previous Prompts)

User reported:
1. dateBegin and dateEnd do not show in the field dropdown
2. When trying to add them manually, error message: "A field with this name already exists"
3. These fields ARE in the Bullhorn documentation for Placement
4. These fields ARE timestamp/date fields
5. dateBegin is required, dateEnd is optional

## Solution Implemented

The fields are now:
1. Hard-coded in `use-entity-metadata.ts` for Placement entity
2. Double-checked and added in `CSVLoader.tsx` if somehow missing
3. Should appear in all field dropdowns for Placement entity
4. Should work with date/timestamp transforms

## Verification Needed

Run the application and follow test steps above to confirm the fields now appear correctly.
