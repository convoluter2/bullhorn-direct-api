# Testing Guide: Bulk File Download Fix

## Overview
This guide helps verify that the "pending status" issue in the Bulk File Downloader has been resolved.

## Pre-Test Setup

1. **Navigate to File Manager tab**
2. **Ensure you're authenticated** to a Bullhorn instance
3. **Prepare test data**:
   - A CSV file with 5-10 Candidate IDs (mix of IDs with files and without)
   - OR manually enter 5-10 comma-separated Candidate IDs

## Test Scenarios

### Test 1: Normal Successful Download
**Objective**: Verify all items show final status (success or error), no pending items

**Steps**:
1. Select "Candidate" entity type
2. Load CSV or enter manual IDs (use IDs you know have files)
3. Click "Download All Files"
4. Wait for completion
5. **Expected Result**: 
   - All items show either ✅ Success or ❌ Error status
   - No items remain in "pending" state
   - Toast notification matches the results table

### Test 2: Entities with No Files
**Objective**: Verify entities without files are marked as error, not pending

**Steps**:
1. Select "Candidate" entity type
2. Load IDs that you know have NO files attached
3. Click "Download All Files"
4. Wait for completion
5. **Expected Result**:
   - All items show ❌ Error status with "No files found" message
   - No items remain in "pending" state
   - Toast shows "All X downloads failed"

### Test 3: Mixed Results (Some Success, Some Failures)
**Objective**: Verify mixed results display correctly

**Steps**:
1. Select "Candidate" entity type
2. Load a mix of IDs: some with files, some without
3. Click "Download All Files"
4. Wait for completion
5. **Expected Result**:
   - Success items show ✅ with file count and ZIP filename
   - Failed items show ❌ with error message
   - No items remain in "pending" state
   - Toast shows "X successful, Y failed"

### Test 4: User Cancellation
**Objective**: Verify cancel button properly marks remaining items

**Steps**:
1. Select "Candidate" entity type
2. Load 10+ IDs
3. Click "Download All Files"
4. **Immediately** click "Cancel" button after 2-3 entities process
5. **Expected Result**:
   - Processed items show their actual status (success/error)
   - Remaining items show ❌ Error with "Cancelled by user" message
   - No items remain in "pending" state
   - Toast shows cancellation message

### Test 5: Pause and Resume
**Objective**: Verify pause/resume doesn't leave items pending

**Steps**:
1. Select "Candidate" entity type
2. Load 10+ IDs
3. Click "Download All Files"
4. Click "Pause" after 2-3 entities process
5. Wait 5 seconds
6. Click "Resume"
7. Let it complete
8. **Expected Result**:
   - All items show final status after resume
   - No items remain in "pending" state
   - Download continues from where it paused

### Test 6: Invalid Entity IDs
**Objective**: Verify API errors are handled properly

**Steps**:
1. Select "Candidate" entity type
2. Enter invalid/non-existent IDs manually: 999999999, 888888888, 777777777
3. Click "Download All Files"
4. Wait for completion
5. **Expected Result**:
   - All items show ❌ Error status with error message
   - No items remain in "pending" state
   - Toast shows "All X downloads failed"

### Test 7: Network Interruption Simulation
**Objective**: Verify unexpected errors are handled

**Steps**:
1. Open browser DevTools
2. Go to Network tab
3. Select "Candidate" entity type
4. Load 5+ IDs
5. Click "Download All Files"
6. **While downloading**, set network to "Offline" in DevTools
7. **Expected Result**:
   - Some items may succeed before offline
   - Remaining items show ❌ Error status
   - No items remain in "pending" state
   - Toast shows error message

### Test 8: Retry Failed Downloads
**Objective**: Verify retry functionality works correctly

**Steps**:
1. Run Test 6 (invalid IDs) to generate failures
2. Click "Retry Failed Downloads" button
3. Wait for completion
4. **Expected Result**:
   - All items attempt download again
   - All show final status (success/error)
   - No items remain in "pending" state

## Success Criteria

✅ **All tests pass if**:
- No items ever remain in "pending" state after process completion
- Status messages are clear and accurate
- Toast notifications match the results table
- UI is responsive and updates in real-time
- Cancel/pause/resume work without leaving pending items

## Known Acceptable Behaviors

- ✅ Items showing "pending" DURING active download is normal
- ✅ Error status for "No files found" is expected behavior
- ✅ Error status for invalid IDs is expected behavior
- ✅ Partial success (some succeed, some fail) is valid

## Console Logging

Check browser console for:
- ✅ `"⚠️ Download cancelled by user"` - when user cancels
- ✅ `"⚠️ Download cancelled during file processing"` - when cancelled mid-file
- ✅ `"✅ Downloaded X/Y files for Entity Z"` - on successful download
- ❌ Any unhandled promise rejections or errors
- ❌ Any "pending" references after completion

## Audit Logs

Check the Logs tab for:
- ✅ "Bulk Download Complete" entries with success/error counts
- ✅ Individual entity download success/error logs
- ✅ Clear error messages for failures
- ❌ Missing or incomplete log entries

## Reporting Issues

If any test fails, please report:
1. **Which test failed** (Test number and name)
2. **Actual result** (what you saw)
3. **Console errors** (copy from DevTools console)
4. **Screenshot** of the results table
5. **Audit logs** (export from Logs tab)
6. **Entity type and IDs used** for testing
