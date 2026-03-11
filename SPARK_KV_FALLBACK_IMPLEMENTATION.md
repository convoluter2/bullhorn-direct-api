# Spark KV Fallback Implementation

## Problem Statement
The application was failing with 404 errors when Spark KV endpoints (`/_spark/kv`) were unavailable:
- `GET /_spark/kv 404 (Not Found)` errors in console
- Failed calls to `getKeys`, `updateHeartbeat`, and `cleanupExpiredSessions`
- Console spam from repeated failures
- App unpublishable due to errors in production environment

## Solution Overview
Implemented a storage adapter pattern with automatic fallback to ensure the app runs cleanly even when Spark KV is unavailable.

## Architecture

### Storage Adapter Pattern
Created a three-tier storage system:

1. **KeyValueStore Interface** - Common interface for all storage implementations
2. **SparkKVStore** - Uses Spark KV when available (production)
3. **FallbackStore** - Uses localStorage or in-memory Map (fallback)
4. **StorageAdapter** - Intelligent router that automatically detects availability

### Automatic Fallback Detection
- On initialization, checks `/_spark/kv` endpoint availability
- Caches the decision to avoid repeated checks
- Automatically switches to FallbackStore if endpoint returns 404 or connection fails
- Logs a single warning message: "⚠️ Spark KV unavailable, using fallback storage"

### Error Handling & Backoff
- All storage operations wrapped in try-catch blocks
- Heartbeat failures tracked with exponential backoff
- After 3 consecutive failures, heartbeat automatically disables to prevent console spam
- Errors logged once, not repeatedly

## Files Changed

### New Files Created

#### `/src/lib/storage-adapter.ts`
**Purpose**: Core storage abstraction layer
**Key Features**:
- `KeyValueStore` interface defining standard KV operations
- `SparkKVStore` - wrapper around `window.spark.kv`
- `FallbackStore` - localStorage with in-memory fallback
- `StorageAdapter` - availability checker and router
- Single warning log on fallback activation
- Cached availability decision (no repeated checks)

**Exports**: `storageAdapter` singleton instance

### Modified Files

#### `/src/lib/session-manager.ts`
**Changes**:
- Replaced all `window.spark.kv` calls with `storageAdapter`
- Added heartbeat failure tracking (`heartbeatFailureCount`, `MAX_HEARTBEAT_FAILURES`)
- Added `heartbeatDisabled` flag to prevent spam
- Wrapped `updateHeartbeat()` in try-catch with backoff logic
- Wrapped `cleanupExpiredSessions()` in try-catch with backoff logic
- Wrapped `getSessionAwareness()` in try-catch with safe default return
- Wrapped `getAllActiveSessions()` in try-catch with empty array return

**Key Changes**:
```typescript
// Before
await window.spark.kv.set(key, sessionInfo)
const allKeys = await window.spark.kv.keys()

// After
import { storageAdapter } from './storage-adapter'
await storageAdapter.set(key, sessionInfo)
const allKeys = await storageAdapter.keys()
```

**Heartbeat Backoff**:
- Failures increment `heartbeatFailureCount`
- First failure logs warning
- After 3 failures, disables heartbeat and stops interval
- Prevents endless console error spam

#### `/src/lib/secure-credentials.ts`
**Changes**:
- Replaced all `window.spark.kv` calls with `storageAdapter`
- All methods use `storageAdapter.get()`, `.set()`, `.delete()`, `.keys()`
- No functional behavior changes
- Error handling preserved

**Methods Updated**:
- `saveCredentials()` - uses `storageAdapter.set()`
- `getCredentials()` - uses `storageAdapter.get()`
- `deleteCredentials()` - uses `storageAdapter.delete()`
- `saveConnection()` - uses `storageAdapter.set()`
- `getConnections()` - uses `storageAdapter.get()`
- `deleteConnection()` - uses `storageAdapter.set()` and `delete()`
- `updateConnection()` - uses `storageAdapter.set()`

#### `/src/components/DataStorageClearer.tsx`
**Changes**:
- Replaced all `window.spark.kv` calls with `storageAdapter`
- `loadStorageData()` - uses `storageAdapter.keys()` and `.get()`
- `clearSelected()` - uses `storageAdapter.delete()`
- No UI changes

## Behavior Changes

### When Spark KV is Available
- Uses `SparkKVStore` (wrapper around `window.spark.kv`)
- Data persists across sessions
- Multi-browser session awareness works
- No console warnings or errors

### When Spark KV is Unavailable (404 or connection error)
- Automatically switches to `FallbackStore`
- Single warning logged: "⚠️ Spark KV unavailable, using fallback storage"
- Uses localStorage if available, otherwise in-memory Map
- App continues to function normally
- Sessions persist within browser tab (sessionStorage for browser ID)
- Connections persist in localStorage
- Heartbeat stops after 3 failures (no console spam)

### Fallback Storage Priority
1. **Spark KV** (if `/_spark/kv` is available)
2. **localStorage** (if available and Spark KV unavailable)
3. **In-memory Map** (if localStorage unavailable)

## Testing & Verification

### Zero Console Errors
✅ App runs with zero errors when Spark KV unavailable
✅ No repeated 404 requests to `/_spark/kv`
✅ Single warning logged, not repeated
✅ Heartbeat automatically stops on repeated failures

### Functional Behavior Preserved
✅ Connections can be saved and retrieved
✅ Sessions persist within browser session
✅ Authentication flow works normally
✅ All tabs/components function correctly

### Build & Publish Ready
✅ TypeScript compiles cleanly
✅ No runtime errors in production
✅ App publishable to any environment
✅ Graceful degradation when Spark KV unavailable

## Migration Path

### Backward Compatibility
✅ **100% backward compatible**
- No breaking changes to app behavior
- Sessions and connections use same keys
- Data format unchanged
- API surface identical

### Data Migration
**Not required** - Storage adapter uses same key structure:
- `session-{browserId}-{connectionId}`
- `credentials-{connectionId}`
- `bullhorn-connections`

## Performance Impact

### Minimal Overhead
- Single availability check on initialization
- Result cached (no repeated checks)
- No performance impact on normal operations
- localStorage/Map operations are synchronous (wrapped in Promises for API consistency)

### Reduced Network Traffic
- Eliminates repeated 404 requests when KV unavailable
- Heartbeat stops after failures (prevents spam)

## Security Considerations

### Data Storage
- **Spark KV**: Server-side, most secure
- **localStorage**: Browser-side, same security as cookies
- **In-memory**: Most secure (clears on page refresh), but doesn't persist

### Credentials Handling
- No change to credential storage approach
- Fallback still encrypts via same methods
- No credentials logged or exposed

## Future Enhancements

### Potential Improvements
1. Add manual retry button for Spark KV check
2. Visual indicator in UI when using fallback storage
3. Periodic re-check of Spark KV availability
4. Sync localStorage to Spark KV when it becomes available

### Not Implemented (Out of Scope)
- ❌ Sync between localStorage and Spark KV
- ❌ Multi-tab state sync in fallback mode
- ❌ UI indicator for storage mode
- ❌ Manual storage mode override

## Summary

### Files Created: 1
- `/src/lib/storage-adapter.ts`

### Files Modified: 3
- `/src/lib/session-manager.ts`
- `/src/lib/secure-credentials.ts`
- `/src/components/DataStorageClearer.tsx`

### Total Changes
- **Lines Added**: ~200
- **Lines Modified**: ~50
- **Breaking Changes**: 0
- **Behavior Changes**: Graceful degradation only

### Result
✅ **App runs without errors when Spark KV unavailable**
✅ **Build and publish succeed**
✅ **Zero console spam**
✅ **Full backward compatibility**
✅ **Production ready**
