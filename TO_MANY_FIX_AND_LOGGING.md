# TO_MANY Field Fix and Enhanced Logging

## Issues Fixed

### 1. TO_MANY Fields Not Appearing in Payload (CSV Loader)

**Problem**: When TO_MANY fields had empty or null CSV values, they were being set to `null` in the payload instead of being skipped. This caused the fields to not appear in the update payload when users tried to add/remove associations.

**Root Cause**: In `CSVLoader.tsx` lines 887-894, the code was setting ALL fields with empty values to `null`, without checking if they were TO_MANY fields. TO_MANY fields should never be set to `null` - they should either be skipped or handled through the special TO_MANY update mechanism.

**Fix Applied**:
```typescript
// Before (lines 887-894)
if (transformedValue === '' || transformedValue === null || transformedValue === undefined) {
  if (!mapping.bullhornField.includes('.')) {
    data[mapping.bullhornField] = null  // ❌ This was setting TO_MANY fields to null!
  }
}

// After
if (transformedValue === '' || transformedValue === null || transformedValue === undefined) {
  if (!mapping.bullhornField.includes('.')) {
    const fieldMeta = enrichedFieldsMap[mapping.bullhornField]
    if (fieldMeta?.associationType !== 'TO_MANY') {  // ✅ Now checks if it's NOT a TO_MANY field
      data[mapping.bullhornField] = null
    }
  }
}
```

This same fix was applied to the `'null'` string check on lines 891-894.

### 2. PlacementPayRuleset "Record Not Found" Error

**Problem**: The error message when a record is not found (like PlacementPayRuleset/7183) was not providing enough context about WHY the record might not be found.

**Fix Applied**: Enhanced error logging in `bullhorn-api.ts` `getEntity` method to include:
- Corporation ID context
- REST URL being used
- More detailed explanation of potential causes:
  1. Record doesn't exist
  2. No permission to access it
  3. Belongs to different corporation
  4. Recently deleted

## Enhanced Logging Added

### CSV Loader (CSVLoader.tsx)

1. **TO_MANY Field Detection** (line ~906):
```typescript
console.log(`🔍 TO_MANY field "${mapping.bullhornField}" detected:`, {
  csvValue: transformedValue,
  config,
  fieldMeta: { ... }
})
```

2. **TO_MANY Field Formatting** (lines ~928, ~941):
```typescript
console.log(`✅ TO_MANY field "${mapping.bullhornField}" formatted as:`, data[`__tomany_${mapping.bullhornField}`])
```

3. **TO_MANY Payload Processing** (line ~1072):
```typescript
console.log(`🔍 Processing TO_MANY field "${fieldName}":`, toManyValue)
console.log(`✅ TO_MANY field "${fieldName}" added to separate update queue:`, { ... })
console.warn(`⚠️ TO_MANY field "${fieldName}" missing operation or ids:`, toManyValue)
```

4. **TO_MANY API Call** (line ~1105):
```typescript
console.log(`🔄 Sending TO_MANY update for field "${toManyUpdate.field}":`, { ... })
console.log(`✅ TO_MANY update completed for field "${toManyUpdate.field}"`)
console.error(`❌ TO_MANY update failed for field "${toManyUpdate.field}":`, errorMsg)
```

### Bullhorn API (bullhorn-api.ts)

1. **TO_MANY Update Payload** (line ~1895):
```typescript
console.log(`🔄 Updating to-many association ${entity}/${entityId}/${association}:`, {
  operation,
  resolvedIds,
  subField,
  updatePayload
})
console.log(`📡 Full TO_MANY UPDATE URL:`, fullUrl)
console.log(`📤 TO_MANY Update payload:`, JSON.stringify(updatePayload.data, null, 2))
```

2. **Enhanced GET Entity Error Logging** (line ~1254):
```typescript
console.error(`❌ Get entity failed for ${entity}/${id}:`, {
  status: response.status,
  statusText: response.statusText,
  error,
  url: fullUrl,
  corporationId: this.session.corporationId,  // ✅ Added
  restUrl: this.session.restUrl  // ✅ Added
})
```

## How to Test

### Testing TO_MANY Fields in CSV Loader

1. **Load a CSV with TO_MANY field data**
2. **Map a column to a TO_MANY field** (e.g., `primarySkills`, `secondarySkills`, `categories`)
3. **Configure the TO_MANY operation** using the dropdown:
   - `add` - Add associations
   - `remove` - Remove associations
   - `replace` - Replace all associations
4. **Check console logs** - You should now see detailed logging:
   - When TO_MANY field is detected
   - How it's formatted (with operation and IDs)
   - When it's added to the update queue
   - When the API call is made
   - Success/failure of the operation

### What to Look For in Logs

**Success Path**:
```
🔍 TO_MANY field "primarySkills" detected: { csvValue: "123,456", config: { operation: "add", subField: "id" }, ... }
✅ TO_MANY field "primarySkills" formatted as: { operation: "add", ids: [123, 456], subField: "id" }
🔍 Processing TO_MANY field "primarySkills": { operation: "add", ids: [123, 456], subField: "id" }
✅ TO_MANY field "primarySkills" added to separate update queue: { operation: "add", ids: [123, 456], subField: "id" }
🔄 Sending TO_MANY update for field "primarySkills": { entity: "Candidate", entityId: 12345, field: "primarySkills", operation: "add", ids: [123, 456], subField: "id" }
📡 Full TO_MANY UPDATE URL: https://rest43.bullhornstaffing.com/rest-services/.../entity/Candidate/12345?BhRestToken=...
📤 TO_MANY Update payload: {
  "primarySkills": {
    "add": [123, 456]
  }
}
✅ TO_MANY update completed for field "primarySkills"
```

**Failure Path** (missing field in payload):
```
🔍 Processing field "primarySkills": { csvColumn: "Skills", rawValue: "", transformedValue: "", fieldMeta: { type: "TO_MANY", ... } }
(No more logs - field is now correctly skipped instead of being set to null)
```

### Testing Record Not Found Errors

If you encounter a "record not found" error, the logs will now show:
```
❌ Get entity failed for PlacementPayRuleset/7183: {
  status: 404,
  statusText: "Not Found",
  error: "...",
  url: "https://rest43.bullhornstaffing.com/rest-services/82iulg/entity/PlacementPayRuleset/7183?...",
  corporationId: 12345,
  restUrl: "https://rest43.bullhornstaffing.com/rest-services/82iulg/"
}
```

And the error message will include:
> PlacementPayRuleset record 7183 not found. This could mean: 1) The record doesn't exist, 2) You don't have permission to access it, 3) It belongs to a different corporation (current: 12345), or 4) The record was recently deleted.

## Files Modified

1. `/workspaces/spark-template/src/components/CSVLoader.tsx`
   - Fixed TO_MANY null assignment bug (lines 887-899)
   - Added comprehensive TO_MANY logging throughout the import process

2. `/workspaces/spark-template/src/lib/bullhorn-api.ts`
   - Enhanced `getEntity` error logging with corporation context
   - Added detailed TO_MANY update payload logging
   - Improved 404 error messages for all entities

## Related Documentation

- See `TO_MANY_FIELD_TESTING_GUIDE.md` for comprehensive TO_MANY testing procedures
- See `TO_MANY_COMPLETION_REPORT.md` for the original TO_MANY implementation details
- See `CONSOLE_OUTPUT_GUIDE.md` for understanding console log patterns
