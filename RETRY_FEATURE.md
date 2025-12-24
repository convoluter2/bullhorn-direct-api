# Retry Failed Operations Feature

## Overview
The Bullhorn Data Manager now includes one-click retry functionality for failed operations from previous runs. This feature allows users to retry operations that may have failed due to API overload or temporary connectivity issues.

## How It Works

### 1. Failed Operations Tracking
When batch operations are executed in:
- **QueryBlast**
- **CSV Loader**
- **SmartStack**
- **QueryStack**

Any operations that fail are automatically tracked with:
- Entity ID
- Operation type (update/add)
- Data that was attempted
- Error message
- To-Many field updates (if applicable)

### 2. Viewing Failed Operations
Failed operations appear in the **Logs** tab with:
- ⚠️ Amber-colored section showing "X Operation(s) Available for Retry"
- Details of each failed operation including:
  - Entity ID
  - Operation type
  - Error message

### 3. Retry Process
1. Navigate to the **Logs** tab
2. Find a log entry with failed operations (look for the amber "Retry" button)
3. Click the **Retry (X)** button where X is the number of failed operations
4. Confirm the retry in the dialog
5. The system will:
   - Attempt to re-execute all failed operations
   - Track successes and failures separately
   - Update the log with retry history
   - Remove successfully retried operations from the failed list
   - Keep track of operations that still fail

### 4. Retry History
Each log maintains a complete retry history showing:
- Timestamp of each retry attempt
- Number of successes in each attempt
- Number of failures in each attempt
- Detailed error messages for failures

## Benefits

### For API Overload Scenarios
The Bullhorn API may occasionally get overloaded during bulk operations. Instead of manually identifying and re-running failed records, users can:
- Complete their initial bulk operation
- Review which records failed
- Retry failed operations with one click
- Repeat the retry if needed until all operations succeed

### Complete Audit Trail
Every retry attempt is logged with:
- Original operation details
- Retry timestamp
- Success/failure counts
- Specific errors for failed retries

### Efficient Recovery
- No need to re-upload CSVs or rebuild queries
- No risk of duplicating successful operations
- Precise targeting of only failed operations
- Support for complex operations including To-Many field updates

## Example Workflow

1. **Initial Operation**: User executes a SmartStack operation updating 1000 JobSubmission records
   - 950 succeed
   - 50 fail due to API rate limiting

2. **Review Logs**: User checks the Logs tab and sees:
   ```
   SmartStack Execution
   ✓ 950 success  ✗ 50 failed
   ⚠️ 50 Operation(s) Available for Retry
   [Retry (50)] button available
   ```

3. **First Retry**: User clicks Retry (50)
   - 45 succeed
   - 5 still fail

4. **Second Retry**: User waits a moment and clicks Retry (5)
   - All 5 succeed

5. **Final Result**: All 1000 records successfully updated with complete audit trail

## Technical Details

### Stored Information
Each failed operation stores:
```typescript
{
  entityId: number
  operation: 'update' | 'add'
  data: Record<string, any>
  error: string
  toManyUpdates?: Array<{
    field: string
    operation: string
    ids: number[]
    subField?: string
  }>
}
```

### Retry History Format
```typescript
{
  timestamp: number
  successCount: number
  failedCount: number
  errors?: string[]
}
```

## Limitations
- Retry functionality is only available for operations that were tracked with the failed operations structure
- Legacy logs without failed operation details cannot be retried
- Retry attempts use the same data as the original operation (if business logic has changed, manual intervention may be required)
