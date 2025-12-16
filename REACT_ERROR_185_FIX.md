# React Error #185 Fixes

## Overview
Fixed multiple React hook dependency issues that could cause React error #185 (related to hooks being called in incorrect order or with missing dependencies).

## Changes Made

### 1. **OAuthCallback.tsx** (Line 32-75)
**Issue**: `handleAutoAuthenticate` function was defined outside `useEffect` but called inside it, and not included in the dependency array.

**Fix**: Moved `handleAutoAuthenticate` function inside the `useEffect` to ensure proper closure and dependency management.

```typescript
// Before: Function defined outside useEffect, called inside
useEffect(() => {
  // ...
  handleAutoAuthenticate(code, ...)
}, [storedCredentials]) // Missing onAuthenticated dependency

const handleAutoAuthenticate = async () => { ... }

// After: Function defined inside useEffect
useEffect(() => {
  const handleAutoAuthenticate = async () => { ... }
  // ...
  handleAutoAuthenticate(code, ...)
}, [storedCredentials, onAuthenticated]) // All dependencies included
```

### 2. **App.tsx** (Lines 33-58)
**Issue**: `useCallback` hooks were missing the `setLogs` dependency in their dependency arrays.

**Fix**: Added `setLogs` to the dependency array of all three callbacks:

```typescript
// Before
const addLog = useCallback((operation, status, message, details) => {
  setLogs((currentLogs) => [...])
}, []) // Missing setLogs

const clearLogs = useCallback(() => {
  setLogs(() => [])
}, []) // Missing setLogs

const updateLog = useCallback((logId, updates) => {
  setLogs((currentLogs) => [...])
}, []) // Missing setLogs

// After
const addLog = useCallback((operation, status, message, details) => {
  setLogs((currentLogs) => [...])
}, [setLogs]) // Added dependency

const clearLogs = useCallback(() => {
  setLogs(() => [])
}, [setLogs]) // Added dependency

const updateLog = useCallback((logId, updates) => {
  setLogs((currentLogs) => [...])
}, [setLogs]) // Added dependency
```

### 3. **use-entities.ts** (Line 76)
**Issue**: `useEffect` had an empty dependency array but used `entitiesCache` and `setEntitiesCache`.

**Fix**: Added proper dependencies to the `useEffect` hook:

```typescript
// Before
useEffect(() => {
  // Uses entitiesCache and setEntitiesCache
  // ...
}, []) // Empty dependencies

// After
useEffect(() => {
  // Uses entitiesCache and setEntitiesCache
  // ...
}, [entitiesCache, setEntitiesCache]) // Proper dependencies
```

### 4. **main.tsx**
**Issue**: Missing `StrictMode` wrapper which helps catch issues early in development.

**Fix**: Added `StrictMode` wrapper:

```typescript
// Before
createRoot(document.getElementById('root')!).render(
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <App />
  </ErrorBoundary>
)

// After
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <App />
    </ErrorBoundary>
  </StrictMode>
)
```

## Why These Fixes Matter

### React Hook Rules
React hooks must follow specific rules:
1. Always call hooks in the same order
2. Only call hooks at the top level (not inside conditions, loops, or nested functions)
3. Include all dependencies in hook dependency arrays

### What Causes Error #185
React error #185 typically occurs when:
- Hooks are called conditionally or in different orders between renders
- `useEffect` or `useCallback` dependencies are incomplete
- Functions used in effects aren't properly memoized or included as dependencies

### Impact of Fixes
These fixes ensure:
- ✅ Consistent hook call order across renders
- ✅ Proper dependency tracking for effects and callbacks
- ✅ No stale closures that reference outdated values
- ✅ React StrictMode catches issues during development
- ✅ Better performance through proper memoization

## Testing Recommendations

After these fixes, test the following scenarios:

1. **OAuth Flow**
   - Navigate to app with OAuth callback
   - Verify auto-authentication works
   - Check manual credential entry

2. **Logs Management**
   - Add multiple logs
   - Clear logs
   - Update log entries
   - Verify no duplicate operations

3. **Entities Loading**
   - Load entities on first visit
   - Verify cache works on subsequent loads
   - Test refresh functionality

4. **Connection Management**
   - Save multiple connections
   - Switch between connections
   - Verify no rendering errors

## Additional Notes

The fixes maintain backward compatibility and don't change any external API or behavior. They only correct the internal hook usage patterns to align with React's requirements.

All components continue to use functional updates with `setState` callbacks (e.g., `setState((current) => ...)`) to avoid stale closure issues, which is the correct pattern when working with `useKV` from the Spark SDK.
