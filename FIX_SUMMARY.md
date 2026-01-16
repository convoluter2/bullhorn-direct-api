# Fix Summary: candidateSource Field Error

## Changes Made

### 1. Updated JobSubmission Entity Definition
**File:** `src/lib/entities.ts`
- Added more common fields to the JobSubmission default field list
- Included: `source`, `isDeleted`, `salary`, `billRate`, `payRate`
- This provides better default fields when metadata can't be fetched

### 2. Created Diagnostic Panel Component
**File:** `src/components/DiagnosticPanel.tsx`
- Scans all KV storage for problematic data
- Identifies keys containing `candidateSource` references
- Provides auto-fix functionality to remove invalid field references
- Allows manual deletion of problematic keys
- Shows detailed information about each stored item

**Access:** Testing Tools → Diagnostics tab

### 3. Created Entity Help Alert Component
**File:** `src/components/EntityHelpAlert.tsx`
- Shows contextual help when JobSubmission entity is selected
- Explains that `candidateSource` doesn't exist
- Suggests correct alternatives: `candidate` or `source`
- Can be extended to provide help for other entities

### 4. Integrated Help Alerts
**Files:** 
- `src/components/QueryBlast.tsx`
- `src/components/SmartStack.tsx`
- Added EntityHelpAlert component to both query builders
- Displays automatically when JobSubmission is selected
- Prevents future errors by educating users upfront

### 5. Added Diagnostic Panel to App
**File:** `src/App.tsx`
- Added DiagnosticPanel import
- Created new "Diagnostics" tab in Testing Tools section
- Tab appears first in the testing tools for easy access

### 6. Created Documentation
**File:** `FIELD_ERROR_FIX.md`
- Comprehensive guide explaining the error
- Multiple solution approaches
- Field name reference guide
- Prevention tips

## How to Fix Your Current Error

### Quick Fix (Recommended):
1. Navigate to **Testing Tools** → **Diagnostics** tab
2. Click **Rescan** button
3. Look for items with ⚠ warning icons
4. Click **Auto-Fix Issues** button
5. Return to QueryBlast or SmartStack and try your query again

### Manual Fix:
1. Go to Diagnostics tab
2. Find keys that contain `candidateSource` (marked with warnings)
3. Click the trash icon to delete those keys
4. Reconfigure your query from scratch

### Nuclear Option:
1. Click **Clear Data Storage** button in the header
2. This removes ALL stored data
3. You'll need to reconfigure everything

## Understanding the Error

The field `candidateSource` **does not exist** on the JobSubmission entity in Bullhorn's API.

### Correct field names:
- ✅ `candidate` - Returns the Candidate ID (TO_ONE association)
- ✅ `jobOrder` - Returns the JobOrder ID (TO_ONE association)  
- ✅ `source` - Returns the JobSubmission's source field (if it exists on your instance)
- ❌ `candidateSource` - DOES NOT EXIST

### To get a candidate's source:
You need to either:
1. Query JobSubmission for the `candidate` field (gets the ID)
2. Then separately query Candidate entity with that ID to get the `source` field

OR use field expansion (if supported):
- `candidate(id,firstName,lastName,source)` in your field list

## Prevention

Going forward:
- Always use the Field Selector which validates against real API metadata
- Check the blue info alert when selecting JobSubmission
- Test queries before saving them
- Use the Diagnostics tab if you encounter field errors

## Technical Details

The error occurred because:
1. A query configuration was saved with `candidateSource` as a selected field
2. This was stored in the KV store (browser storage)
3. When you tried to view job and candidate on JobSubmission, the app loaded this saved config
4. The Bullhorn API rejected the query because the field doesn't exist
5. Error: `{"errorMessage":"Invalid field 'candidateSource' at position 1.","errorCode":400}`

The Diagnostic Panel finds and fixes these stored configurations.
