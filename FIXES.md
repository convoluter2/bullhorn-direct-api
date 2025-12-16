# Error Fixes - Maximum Update Depth Exceeded

## Issue
The application was experiencing an infinite loop error: "Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate."

## Root Causes Identified

### 1. `use-entities.ts` Hook
**Problem**: The `useEffect` hook included `entitiesCache` and `setEntitiesCache` in its dependency array, but the effect itself calls `setEntitiesCache()`. This created an infinite loop:
- Effect runs → calls `setEntitiesCache()` → updates `entitiesCache` → triggers effect again

**Fix**: Removed dependencies from the useEffect array, leaving it empty `[]` so it only runs once on mount.

```typescript
// Before
useEffect(() => {
  // ... code that calls setEntitiesCache()
}, [entitiesCache, setEntitiesCache])  // ❌ Causes infinite loop

// After
useEffect(() => {
  // ... code that calls setEntitiesCache()
}, [])  // ✅ Runs only once
```

### 2. `ToManyFieldInput.tsx` Component
**Problem**: The `useEffect` hook included `onChange` in its dependency array and called `onChange()` inside. Since parent components typically create new function references on each render, this caused:
- Effect runs → calls `onChange()` → parent re-renders → new `onChange` ref → triggers effect again

**Fix**: 
1. Removed `onChange` from the dependency array
2. Added a check to only call `onChange` if the value actually changed

```typescript
// Before
useEffect(() => {
  const toManyValue = { operation, ids }
  onChange(JSON.stringify(toManyValue))
}, [operation, ids, onChange])  // ❌ onChange causes infinite loop

// After
useEffect(() => {
  const toManyValue = { operation, ids }
  const newValue = JSON.stringify(toManyValue)
  if (newValue !== value) {  // ✅ Only update if changed
    onChange(newValue)
  }
}, [operation, ids])  // ✅ No onChange in deps
```

## Verification
Both components now properly manage their state without causing infinite update loops. The fixes ensure:
- Effects run only when necessary
- State updates don't trigger the same effects that caused them
- Component re-renders are minimized and controlled

## Testing
Existing test suites validate the fixed components continue to work correctly:
- `src/__tests__/to-many-ui.test.tsx` - Comprehensive ToManyFieldInput tests
- All other integration tests pass without infinite loop errors
