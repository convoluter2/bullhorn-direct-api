# Rate Limit & Concurrent Connection Updates

## Summary
Removed artificial concurrent connection limits to allow the application to hit the Bullhorn API limit of 1000-1500 calls per minute.

## Changes Made

### 1. Rate Limiter (`src/lib/rate-limiter.ts`)
- **Default max concurrent requests**: Increased from 30 to 500
- **Default target calls/minute**: Changed from 15,000 to 1,500
- **Max concurrent limit**: Increased from 30 to 500 (in setter validation)
- **Concurrency calculation**: Now uses range of 50-500 (was 20-30)
  - Formula: `Math.ceil(effectiveCallsPerMinute / 10)` with min 50, max 500
- **Default rate limit fallback**: Changed from 15,000 to 1,500

### 2. Speed Test (`src/components/SpeedTest.tsx`)
- **Concurrent connections**: Increased from 100 to 500
- **Test configuration**: Now uses 500 concurrent connections for speed tests
- **Description updated**: Reflects "up to 500 concurrent connections"

### 3. Configuration Values
```typescript
// Old values
maxConcurrentRequests = 30
targetCallsPerMinute = 15000
baseConcurrency = Math.min(30, Math.ceil(effectiveCallsPerMinute / 100))

// New values
maxConcurrentRequests = 500
targetCallsPerMinute = 1500
baseConcurrency = Math.min(500, Math.ceil(effectiveCallsPerMinute / 10))
```

## Impact

### Performance
- Can now make up to 500 concurrent API requests
- Theoretical max throughput: Much higher than 1500/min
- Actual throughput: Limited by API's 1500 calls/min rate limit
- Automatically backs off when receiving 429 errors

### Throttling Behavior
- Still respects API rate limit headers (X-RateLimit-Remaining, etc.)
- Automatically queues requests when limit is exhausted
- Exponential backoff on 429 errors (multiplier 1.0 to 5.0x)
- Conservative throttling when remaining < 20% of limit

### Safety
- API response headers still control actual rate
- 429 errors trigger automatic backoff
- Queue system prevents overwhelming the API
- Rate limit info updated from every API response

## Testing Recommendations

1. **Run Speed Test**
   - Navigate to Speed Test tab
   - Execute 1500-call test with 500 concurrent connections
   - Verify throughput reaches 1400-1500 calls/min

2. **Monitor Rate Limits**
   - Check Rate Limits tab during heavy operations
   - Verify no 429 errors under normal load
   - Confirm backoff activates appropriately

3. **Large CSV Imports**
   - Test with 1000+ record CSV files
   - Monitor processing speed in CSV Loader
   - Verify completion without errors

## Notes

- The API will still enforce its 1000-1500 calls/min limit via 429 responses
- Higher concurrency means faster bursts until rate limit is hit
- The system will automatically throttle based on API headers
- No changes needed to user-facing controls - they still max at 1500/min
