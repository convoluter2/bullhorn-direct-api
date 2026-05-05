# Automatic Retry with Exponential Backoff - Implementation Summary

## Overview
Enhanced the Bullhorn API rate limiter with comprehensive automatic retry functionality using exponential backoff for failed API calls. This ensures robust handling of transient errors, rate limits, and server issues during large-scale data operations.

## Key Features Implemented

### 1. **Automatic Retry for Multiple Error Types**

#### HTTP 429 (Rate Limit Exceeded)
- **Behavior**: Automatically backs off for 60 seconds (minimum) with exponential multiplier
- **Retry After Header**: Respects `Retry-After` header from server if provided
- **Backoff Multiplier**: Increases with consecutive 429 errors (1x → 1.5x → 2x → 2.5x → 3x up to 5x max)
- **Global Backoff**: Pauses ALL requests during backoff period to prevent further rate limit violations
- **Rate Limit Reset**: Updates internal tracking to reflect zero remaining requests until backoff expires

#### HTTP 502/503/504 (Server Errors)
- **Behavior**: Retries with exponential backoff
- **Initial Delay**: 1 second
- **Max Delay**: 30 seconds
- **Retry Strategy**: 2^retryCount * 1000ms (1s → 2s → 4s → 8s → 16s → 30s cap)
- **Default Max Retries**: 3 attempts

#### HTTP 5xx (General Server Errors)
- **Behavior**: Retries with longer exponential backoff
- **Initial Delay**: 2 seconds
- **Max Delay**: 60 seconds
- **Retry Strategy**: 2^retryCount * 2000ms (2s → 4s → 8s → 16s → 32s → 60s cap)
- **Default Max Retries**: 3 attempts

#### Network Errors (TypeError/fetch failures)
- **Behavior**: Retries on connection failures, timeouts, DNS errors
- **Initial Delay**: 1 second
- **Max Delay**: 30 seconds
- **Retry Strategy**: 2^retryCount * 1000ms
- **Default Max Retries**: 3 attempts
- **Examples**: `Failed to fetch`, connection timeout, DNS resolution failure

### 2. **Configurable Retry Settings**

New methods added to `BullhornAPI` and `BullhornRateLimiter`:

```typescript
// Set maximum retry attempts (0-10)
bullhornAPI.setMaxRetries(3)

// Enable/disable retry functionality
bullhornAPI.setEnableRetry(true)

// Get current retry configuration
const settings = bullhornAPI.getRetrySettings()
// Returns: { maxRetries: 3, enableRetry: true }
```

### 3. **Enhanced Rate Limiting**

#### Hard Limits
- **HARD_LIMIT_PER_MINUTE**: 1500 calls (Bullhorn absolute max)
- **SAFE_LIMIT_PER_MINUTE**: 1400 calls (safe operational limit with buffer)
- **Default Target**: 1000 calls/minute

#### Request Tracking
- Tracks all requests in a rolling 60-second window
- Automatically cleans up old timestamps
- Prevents exceeding safe limits even without API headers

#### Smart Throttling
- Queues requests when approaching limits
- Pauses queue during backoff periods
- Priority-based queue processing
- Automatic queue resumption after backoff expires

### 4. **Improved Error Recovery**

#### Consecutive Error Tracking
- Tracks consecutive failures across all error types
- Applies backoff multiplier to delay calculations
- Resets to normal operation after successful request

#### Backoff Multiplier Logic
```
multiplier = min(5, 1 + (consecutiveErrors * 0.5))
```
- 0 errors: 1x (normal)
- 1 error: 1.5x
- 2 errors: 2x
- 3 errors: 2.5x
- 4+ errors: 3x-5x (capped at 5x)

### 5. **Request Queue Management**

#### Features
- Priority-based queuing (0 = lowest, higher = more urgent)
- Automatic queue processing with concurrency control
- Pauses during backoff periods
- FIFO within same priority level
- Real-time queue status reporting

#### Queue Status Information
```typescript
const status = bullhornAPI.getRateLimiterStatus()
// Returns:
{
  queueLength: number,           // Requests waiting
  requestsInProgress: number,    // Currently executing
  rateLimitInfo: {...},          // API rate limit data
  backoffMultiplier: number,     // Current backoff multiplier
  requestsInLastMinute: number,  // Rolling minute count
  backoffUntil: timestamp,       // When backoff ends
  safeLimit: 1400                // Safe calls/minute limit
}
```

## Technical Implementation

### Rate Limiter Changes (`src/lib/rate-limiter.ts`)

1. **Added Retry Configuration**
   ```typescript
   private maxRetries = 3
   private enableRetry = true
   ```

2. **Enhanced executeRequestInternal Method**
   - Added `retryCount` and `maxRetries` parameters
   - Implements exponential backoff for each error type
   - Properly manages request counter during retries
   - Calls `processQueue()` before and after retry delays

3. **New Configuration Methods**
   ```typescript
   setMaxRetries(maxRetries: number): void
   setEnableRetry(enable: boolean): void
   getRetrySettings(): { maxRetries, enableRetry }
   ```

4. **Updated resetToDefaults**
   - Now resets retry settings to defaults (enabled, max 3 attempts)

### BullhornAPI Changes (`src/lib/bullhorn-api.ts`)

Added proxy methods to expose retry configuration:
```typescript
setMaxRetries(maxRetries: number)
setEnableRetry(enable: boolean)
getRetrySettings()
```

## Usage Examples

### Basic Usage (Automatic)
No changes required - all API calls automatically benefit from retry logic:

```typescript
// Any API call will automatically retry on failure
const result = await bullhornAPI.search({
  entity: 'Candidate',
  fields: ['id', 'name'],
  filters: []
})
```

### Configuring Retry Behavior

```typescript
// Increase retry attempts for critical operations
bullhornAPI.setMaxRetries(5)

// Disable retry for time-sensitive operations
bullhornAPI.setEnableRetry(false)

// Re-enable with default settings
bullhornAPI.resetRateLimiter()
```

### Monitoring Rate Limits

```typescript
// Check queue and rate limit status
const status = bullhornAPI.getRateLimiterStatus()

if (status.backoffUntil > Date.now()) {
  console.log(`In backoff period for ${Math.round((status.backoffUntil - Date.now()) / 1000)}s`)
}

console.log(`Queue: ${status.queueLength} waiting, ${status.requestsInProgress} active`)
console.log(`Last minute: ${status.requestsInLastMinute}/${status.safeLimit} calls`)
```

### CSV Loader Integration

The CSV Loader and other bulk operations automatically benefit from these enhancements:

1. **Rate Limit Protection**: Automatically stops before hitting 1500 calls/minute
2. **429 Handling**: Backs off for 60+ seconds on rate limit errors
3. **Server Error Recovery**: Retries failed creates/updates automatically
4. **Network Resilience**: Handles transient network failures gracefully

## Logging & Visibility

### Console Logging

The implementation provides detailed console logging for troubleshooting:

**Rate Limit Warnings**:
```
🚫 Received 429 Too Many Requests!
⏳ 429 received - backing off for 60s (attempt 1, multiplier: 1.5x)
```

**Retry Attempts**:
```
⚠️ Server error 503, retrying in 2000ms (attempt 1/3)
⚠️ Network error, retrying in 1000ms (attempt 1/3): Failed to fetch
```

**Queue Management**:
```
📥 Queuing request (priority: 2, queue size: 15)
📤 Processing queued request (waited: 1250ms, remaining queue: 14)
⏳ Queue paused: waiting 45s for rate limit reset
```

**Success Recovery**:
```
✅ Request successful after retry
♻️ Rate limit window reset
```

## Performance Characteristics

### Throughput Protection
- **Maximum theoretical**: ~1400-1500 calls/minute (safe operation)
- **Typical sustained**: 1000 calls/minute (default target)
- **During backoff**: 0 calls (complete pause)

### Retry Timings
| Error Type | Attempt 1 | Attempt 2 | Attempt 3 | Max |
|------------|-----------|-----------|-----------|-----|
| 429 | 60s | 90s | 120s | 300s |
| 502/503/504 | 1s | 2s | 4s | 30s |
| 5xx | 2s | 4s | 8s | 60s |
| Network | 1s | 2s | 4s | 30s |

### Memory Impact
- Minimal: Only tracks timestamps for last 60 seconds
- Automatic cleanup of expired timestamps
- Queue size limited by available memory (typically non-issue)

## Best Practices

### For Large Bulk Operations

1. **Monitor Status**:
   ```typescript
   setInterval(() => {
     const status = bullhornAPI.getRateLimiterStatus()
     console.log(`Progress: ${status.requestsInLastMinute}/min, Queue: ${status.queueLength}`)
   }, 5000)
   ```

2. **Use Appropriate Priorities**:
   - Priority 0: Metadata, non-critical reads
   - Priority 1: Standard queries, searches
   - Priority 2: Entity reads, file operations
   - Priority 3: Creates, updates, deletes

3. **Check Backoff Status**:
   ```typescript
   const status = bullhornAPI.getRateLimiterStatus()
   if (status.backoffUntil > Date.now()) {
     // Wait or show user notification
     showNotification('Rate limit reached, pausing operations...')
   }
   ```

### For Error Handling

```typescript
try {
  const result = await bullhornAPI.createEntity('Candidate', data)
  // Success after any automatic retries
} catch (error) {
  // Only throws after exhausting all retries
  console.error('Failed after all retry attempts:', error)
  // Implement fallback or user notification
}
```

## Testing Recommendations

### Verify 429 Handling
1. Run CSV upload with 500+ records in batches of 100
2. Monitor console for 429 detection and backoff
3. Verify operations resume after backoff period

### Verify Server Error Retry
1. Use network throttling tools to simulate intermittent failures
2. Observe retry attempts in console
3. Confirm successful completion after transient errors

### Verify Rate Limit Tracking
1. Monitor `requestsInLastMinute` during bulk operations
2. Confirm it never exceeds 1400-1500
3. Verify queue builds up when approaching limits

## Configuration Reference

### Default Settings
```typescript
{
  maxRetries: 3,
  enableRetry: true,
  targetCallsPerMinute: 1000,
  speedMultiplier: 1.0,
  maxConcurrentRequests: 100,
  minDelayBetweenRequests: 60ms,
  SAFE_LIMIT_PER_MINUTE: 1400,
  HARD_LIMIT_PER_MINUTE: 1500
}
```

### Adjustment Guidelines
- **High-volume operations**: Keep defaults, monitor queue
- **Time-sensitive operations**: Disable retry, increase concurrency
- **Unreliable networks**: Increase maxRetries to 5
- **Development/testing**: Reduce targetCallsPerMinute to 500

## Related Documentation
- [RATE_LIMITING.md](./RATE_LIMITING.md) - Original rate limiting implementation
- [CSV_VALIDATION_PRD.md](./CSV_VALIDATION_PRD.md) - CSV Loader integration
- [BULK_OPERATIONS_FIXES.md](./BULK_OPERATIONS_FIXES.md) - Bulk operation optimizations

## Summary

This implementation provides:
✅ Automatic retry for 429, 5xx, and network errors
✅ Exponential backoff with configurable limits
✅ Hard limit protection (never exceed 1500 calls/min)
✅ Smart queue management with priority support
✅ Comprehensive logging and monitoring
✅ Zero-config operation with sensible defaults
✅ Configurable for advanced use cases

The system now handles large CSV uploads, bulk operations, and transient failures gracefully without manual intervention while preventing rate limit violations through intelligent request pacing and automatic backoff.
