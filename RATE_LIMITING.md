# API Rate Limiting & Throttling

## Overview

The Bullhorn Data Manager implements intelligent API request throttling to prevent 429 (Too Many Requests) errors and respect Bullhorn's rate limits. The system automatically monitors rate limit headers, queues requests when necessary, and provides real-time visibility into API usage.

## How It Works

### Rate Limit Detection

The system parses rate limit information from Bullhorn API response headers:

- `X-RateLimit-Limit` or `X-Rate-Limit-Limit`: Maximum requests allowed per minute
- `X-RateLimit-Remaining` or `X-Rate-Limit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset` or `X-Rate-Limit-Reset`: Timestamp when the limit resets

This information is tracked in real-time and used to make intelligent throttling decisions.

### Throttling Strategy

The rate limiter implements several strategies to avoid hitting limits:

1. **Conservative Buffer**: When remaining requests fall below 20% of the limit, throttling activates
2. **Request Queuing**: Requests are queued when limits are approached or concurrent request limits are reached
3. **Intelligent Delays**: Calculates optimal delays between requests based on remaining quota and time until reset
4. **Priority System**: Requests can be prioritized (0-3, with 3 being highest priority)
5. **Backoff on Errors**: Consecutive errors trigger exponential backoff (up to 5x multiplier)

### Request Priority Levels

Different API operations are assigned different priority levels:

- **Priority 0**: Metadata and settings (lowest - can be delayed)
- **Priority 1**: Search and query operations
- **Priority 2**: Read operations (getEntity, getToManyAssociation)
- **Priority 3**: Write operations (create, update, delete - highest priority)

### Automatic 429 Handling

If a 429 error is received despite throttling:

1. Parse `Retry-After` header (if present)
2. Set remaining requests to 0
3. Calculate retry delay (default 60 seconds if no header)
4. Increase backoff multiplier
5. Automatically retry the request after the delay

### Queue Management

When requests are queued:

1. Requests are sorted by priority (higher priority first)
2. Within same priority, FIFO ordering is maintained
3. Queue processes requests as rate limits allow
4. Maximum concurrent requests is configurable (default: 20, max: 30)
5. Minimum delay between requests is calculated dynamically based on target calls per minute (default: 0-40ms)

## Visual Monitoring

### Rate Limit Status Indicator

Located in the application header when connected, the rate limit status shows:

- **Badge Color Coding**:
  - Green/Normal: Plenty of requests remaining
  - Yellow: Usage high (< 20% remaining)
  - Red: Rate limit exhausted

- **Badge Content**: `remaining/limit` (e.g., "45/60")
- **Queue Indicator**: Shows number of queued requests when active

### Status Popover

Click the rate limit indicator to see detailed information:

- Requests remaining vs limit
- Progress bar showing usage percentage
- Time until rate limit resets
- Number of active requests
- Number of queued requests
- Backoff multiplier (if errors occurred)
- Warning messages when limits are approached or exhausted

## Configuration

The rate limiter can be configured programmatically or via the Speed Control UI:

```typescript
import { bullhornAPI } from '@/lib/bullhorn-api'

// Set target calls per minute (60-1500)
bullhornAPI.setTargetCallsPerMinute(1500)

// Set speed multiplier (0.1-2.0)
bullhornAPI.setSpeedMultiplier(1.0)

// Set maximum concurrent requests (1-30)
bullhornAPI.setMaxConcurrentRequests(20)

// Set minimum delay between requests (milliseconds) - auto-calculated based on speed settings
bullhornAPI.setMinDelay(40)

// Get current speed settings
const settings = bullhornAPI.getSpeedSettings()
// Returns: { targetCallsPerMinute, speedMultiplier, effectiveCallsPerMinute, minDelay, maxConcurrent }

// Get current status
const status = bullhornAPI.getRateLimiterStatus()
// Returns: { queueLength, requestsInProgress, rateLimitInfo, backoffMultiplier }

// Get rate limit info
const info = bullhornAPI.getRateLimitInfo()
// Returns: { limitPerMinute, remaining, resetTime, lastUpdated } | null

// Reset to defaults (1500 calls/min, 1.0x speed)
bullhornAPI.resetRateLimiter()
```

### Speed Control UI

The Speed Control component allows users to adjust processing speed in real-time:

- **Target Calls Per Minute**: Set the base rate (60-1500 calls/min)
- **Speed Multiplier**: Fine-tune speed from 0.1x (Very Slow) to 2.0x (Maximum)
- **Effective Rate**: Displays the actual calls/min after applying multiplier (capped at 1500)
- **Auto-calculation**: Automatically adjusts concurrent requests and delays based on settings

Speed multiplier effects:
- **0.1x-0.5x**: Very Slow/Slower - for testing or conservative loads
- **0.5x-1.2x**: Normal - balanced throughput
- **1.2x-1.5x**: Faster - increased concurrency
- **1.5x-2.0x**: Fast/Very Fast - maximum throughput with higher concurrency

## Implementation Details

### Architecture

- **BullhornRateLimiter**: Centralized rate limiting service
- **throttledFetch**: Wrapper around native fetch that enforces throttling
- **Request Queue**: FIFO queue with priority support
- **Header Parsing**: Automatic detection and parsing of rate limit headers

### Integration Points

All Bullhorn API methods use throttled requests:

- `search()` - Priority 1
- `query()` - Priority 1
- `getEntity()` - Priority 2
- `createEntity()` - Priority 3
- `updateEntity()` - Priority 3
- `deleteEntity()` - Priority 3
- `associateToMany()` - Priority 2
- `disassociateToMany()` - Priority 2
- `getMetadata()` - Priority 0
- `getFieldOptions()` - Priority 0
- `getAllEntities()` - Priority 0

### Concurrent Request Management

- Default max concurrent requests: 20 (up to 30 for high-speed operations)
- Dynamically calculated based on target calls per minute:
  - At 1500 calls/min: 15-20 concurrent requests
  - At 750 calls/min: 8-10 concurrent requests
  - At 150 calls/min: 5-10 concurrent requests
- Prevents overwhelming the API while maximizing throughput
- Requests beyond limit are automatically queued

### Reset Window Handling

When a rate limit window expires:

- Remaining count is automatically reset to full limit
- Queued requests begin processing immediately
- Console log indicates reset occurred

## Best Practices

### For Normal Operations

The throttling system works automatically. No special handling is needed in most cases.

### For Bulk Operations

When performing bulk operations (CSV imports, mass updates):

1. The system will automatically queue requests
2. Monitor the queue status in the header
3. Large batches will process progressively as rate limits allow
4. Failed requests can be retried without re-submitting the entire batch

### Handling High Load

If you need to process thousands of records:

1. The queue will grow but requests will complete
2. Consider breaking very large operations into smaller batches
3. Monitor the rate limit status to understand throughput
4. The system will never send requests that would trigger 429 errors

### Troubleshooting

**Problem**: Requests are slow

- Check the rate limit status - you may be queued due to high usage
- Verify you haven't hit the rate limit (0 remaining)
- Check for high backoff multiplier (indicates recent errors)

**Problem**: Many requests queued

- Normal for bulk operations
- Queue will clear as rate limits allow
- Consider reducing max concurrent requests if needed

**Problem**: 429 errors still occurring

- Should not happen with throttling active
- Check console for rate limit header parsing
- Verify rate limit info is being captured
- May indicate Bullhorn API configuration issue

## Monitoring & Debugging

### Console Logging

The rate limiter provides detailed console logs:

- `📊 Rate limit info updated`: When headers are parsed
- `⚠️ API rate limit usage high`: When buffer threshold is reached
- `🚫 API rate limit exhausted`: When no requests remain
- `♻️ Rate limit window reset`: When limit resets
- `🔄 Throttling`: When requests are being throttled
- `📥 Queuing request`: When a request enters the queue
- `📤 Processing queued request`: When queue processes
- `⏰ Delaying request`: When artificial delay is applied
- `⏳ Rate limit exhausted`: When waiting for reset
- `⏱️ Conservative throttling`: When near limit

### Status API

Check status programmatically:

```typescript
const status = bullhornAPI.getRateLimiterStatus()

console.log('Queue:', status.queueLength)
console.log('In Progress:', status.requestsInProgress)
console.log('Remaining:', status.rateLimitInfo?.remaining)
console.log('Limit:', status.rateLimitInfo?.limitPerMinute)
console.log('Backoff:', status.backoffMultiplier)
```

## Technical Specifications

### Rate Limit Thresholds

- **Buffer Threshold**: 20% of limit or minimum 5 requests
- **Critical Threshold**: 0 requests remaining
- **Default Limit**: 60 requests/minute (if not provided by API)

### Timing

- **Min Request Delay**: Dynamically calculated (0-40ms at 1500 calls/min, configurable)
  - Calculated as: `Math.floor(60000 / effectiveCallsPerMinute)`
  - At 1500 calls/min: ~40ms
  - At 750 calls/min: ~80ms
  - At 60 calls/min: ~1000ms
- **Max Concurrent**: 20 requests (default), up to 30 (configurable)
- **Backoff Range**: 1x to 5x
- **Poll Interval**: Status updates every 1000ms in UI

### Queue Behavior

- **Ordering**: Priority (high to low), then FIFO
- **Processing**: Automatic when slots available
- **Pausing**: Automatic when rate limit exhausted
- **Resumption**: Automatic after reset window

## Future Enhancements

Potential improvements:

- User-configurable throttling aggressiveness
- Per-entity rate limit tracking
- Historical rate limit usage graphs
- Predictive throttling based on usage patterns
- Rate limit usage alerts/notifications
- Batch operation optimization based on available quota
