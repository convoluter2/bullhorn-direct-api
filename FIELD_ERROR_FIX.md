# Field Error Fix: candidateSource

## Problem
You're getting this error when querying JobSubmission:
```
Search failed: {"errorMessage":"Invalid field 'candidateSource' at position 1.","errorCode":400}
```

## Root Cause
The field `candidateSource` **does not exist** on the JobSubmission entity in the Bullhorn API. This field name is invalid.

## Why This Happened
- You likely have saved query configurations, field selections, or filters that reference `candidateSource`
- This data is persisted in the browser's storage (via the KV store)
- When you try to query JobSubmission with these saved settings, the API rejects the invalid field

## Solution

### Option 1: Use the Diagnostic Tool (Recommended)
1. Go to **Testing Tools** → **Diagnostics** tab
2. Click **Rescan** to scan all stored data
3. The tool will identify any keys containing `candidateSource`
4. Click **Auto-Fix Issues** to automatically remove the invalid field references
5. Retry your query

### Option 2: Manual Cleanup
1. Go to **Testing Tools** → **Diagnostics** tab
2. Find any items marked with a warning (⚠)
3. Click the trash icon to delete the problematic stored data
4. Re-configure your query from scratch

### Option 3: Clear All Storage
1. Use the **Clear Data Storage** button in the header (next to Disconnect)
2. This will clear ALL saved data including queries, filters, and configurations
3. You'll need to reconfigure everything from scratch

## Correct Field Names for JobSubmission

If you want to access related entity data:

- ✅ `candidate` - Gets the Candidate ID (TO_ONE association)
- ✅ `jobOrder` - Gets the JobOrder ID (TO_ONE association)
- ✅ `source` - Gets the JobSubmission's own source field (if it exists)
- ❌ `candidateSource` - INVALID, does not exist

### To Access the Candidate's Source Field:
You cannot directly query `candidate.source` in the Bullhorn REST API. You need to:
1. Query JobSubmission with field `candidate` to get the candidate ID
2. Make a separate query to get the Candidate entity by ID with field `source`

OR

Use the field expansion syntax if supported:
- Try: `candidate(id,firstName,lastName,source)` in your field list

## Updated Default Fields
The JobSubmission entity now includes these default fields:
- id, candidate, jobOrder, status, dateAdded, dateLastModified, sendingUser, dateWebResponse, source, isDeleted, salary, billRate, payRate

## Prevention
- Always verify field names using the entity metadata before saving queries
- Use the field selector which validates against actual API metadata
- Test queries before saving them as templates
