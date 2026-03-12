# Connection Switch Test - Data Bleed Verification

## Overview

This test verifies that switching between VistaVital and TruStaff connections properly isolates data with no bleed-through. The test validates that:

1. Corporation IDs change correctly
2. Tenant identifiers are distinct
3. No data overlap occurs between connections
4. Caches are properly cleared on connection switch
5. Datacenter and super cluster information is tracked

## Test Location

Navigate to the **Switch Test** tab in the Bullhorn Data Manager application (available when connected to a session).

## How to Run the Test

### Prerequisites

- Have saved connections for both VistaVital and TruStaff in the Connection Manager
- Be authenticated to one of the connections before starting

### Step-by-Step Instructions

1. **Connect to Initial Connection**
   - Use the Connection Switcher or Connection Manager to connect to either VistaVital or TruStaff
   - Wait for authentication to complete and verify you see the connection name in the header

2. **Navigate to Switch Test Tab**
   - Click on the "Switch Test" tab in the main navigation
   - You should see the Connection Switch Data Bleed Test interface

3. **Start the Test**
   - Click the **"Start Test"** button
   - The test will capture the initial state including:
     - Corporation ID
     - Tenant name
     - Datacenter and Super Cluster IDs
     - Current cache state
     - Sample data from Skill and Candidate entities

4. **Switch Connections**
   - Use the connection switcher in the header to switch to the OTHER connection
   - For example, if you started on VistaVital, switch to TruStaff
   - Wait for the connection switch to complete

5. **Verify the Switch**
   - Click the **"Verify Switch"** button
   - The test will capture the post-switch state and compare it to the initial state
   - Review the test results table for any failures or warnings

## What Gets Tested

### Critical Tests (Must Pass)

1. **Corporation ID Change**
   - ✅ PASS: Corporation ID is different after switch
   - ❌ FAIL: Corporation ID is the same (connection didn't actually switch)

2. **Tenant Change**
   - ✅ PASS: Tenant identifier changed
   - ❌ FAIL: Tenant is the same (connection switch failed)

3. **Data Isolation - Skills**
   - ✅ PASS: No skill data overlap between connections
   - ❌ FAIL: Skill IDs appear in both connections (DATA BLEED!)

4. **Data Isolation - Candidates**
   - ✅ PASS: No candidate data overlap between connections
   - ❌ FAIL: Candidate IDs appear in both connections (DATA BLEED!)

### Warning Tests (Should Review)

1. **Datacenter Information**
   - ⚠️ If datacenter/super cluster IDs are the same, connections may be in the same region (this is normal)

2. **Cache Clearing**
   - ⚠️ If cache entities overlap, the field value cache may not have been fully cleared

## Understanding Test Results

### Test Result Statuses

- **✅ PASS (Green)**: Test passed successfully, no issues detected
- **❌ FAIL (Red)**: Critical issue detected, requires immediate attention
- **⚠️ WARNING (Yellow)**: Potential issue or informational alert

### Connection Snapshots

The test captures snapshots of each connection showing:

```
Corp ID: 500
Tenant: vistavital
DC: 4 / SC: 43
Cache Size: 12
Sample Skills: 5
Sample Candidates: 5
```

Compare these snapshots to verify the connections are truly distinct.

## Common Issues and Solutions

### Issue: "Corporation ID did not change"

**Cause**: The connection switch didn't actually occur or failed silently.

**Solution**:
1. Check that you actually selected a different connection
2. Wait for the connection to fully authenticate before verifying
3. Look for error messages in the browser console
4. Verify the connection name in the header changed

### Issue: "CRITICAL: Skill data overlaps between connections"

**Cause**: Data from the previous connection is bleeding through to the new connection. This is a serious bug.

**Solution**:
1. Click "Clear All Caches" button
2. Disconnect and reconnect to the desired connection
3. Check the Logs tab for any cache clearing errors
4. Report this issue immediately as it indicates data isolation failure

### Issue: "Cache was not fully cleared on switch"

**Cause**: The field value cache still contains entities from the previous connection.

**Solution**:
1. This is usually not critical if the actual data doesn't overlap
2. Click "Clear All Caches" to manually clear
3. The cache will eventually refresh with correct data

## Manual Cache Clearing

If you encounter any data bleed issues, you can manually clear all caches:

1. Click the **"Clear All Caches"** button in the test interface
2. This will:
   - Clear the field value cache (in-memory)
   - Clear the entity metadata cache (KV storage)
   - Force fresh data fetches on next operation

## Expected Behavior

### Normal Connection Switch

When switching connections correctly, you should see:

1. ✅ All "Data Isolation" tests pass
2. ✅ Corporation ID and Tenant change
3. ⚠️ Datacenter info may or may not change (both are valid)
4. Cache size may vary but entities should be different

### Data Bleed Issue

If data bleed is occurring, you will see:

1. ❌ Data Isolation tests fail
2. ❌ Sample data IDs appear in both snapshots
3. 🚨 This is a critical bug requiring immediate fix

## Technical Details

### What Gets Captured

The test captures:

```typescript
{
  connectionName: string
  corporationId: number
  restUrl: string
  tenant: string
  dataCenterId: number
  superClusterId: number
  browserId: string
  timestamp: number
  fieldCacheStats: {
    size: number
    entities: string[]
  }
  sampleSkillData: Array<{id: number, name: string}>
  sampleCandidateData: Array<{id: number, firstName: string, lastName: string}>
}
```

### Cache Isolation Mechanisms

The app uses several mechanisms to prevent data bleed:

1. **BullhornAPI Session Clearing**: `bullhornAPI.clearSession()`
2. **Field Value Cache Invalidation**: `fieldValueCache.invalidateAll()`
3. **Entity Cache Clearing**: `entityCacheService.clearAllCaches()`
4. **Session Manager Cleanup**: `sessionManager.clearSession(connectionId)`

All of these are called during connection switch in `App.tsx`.

### Key Code Locations

- **Test Component**: `/src/components/ConnectionSwitchTest.tsx`
- **Connection Switch Handler**: `/src/App.tsx` → `handleQuickSwitchConnection()`
- **Field Value Cache**: `/src/lib/field-value-cache.ts`
- **Entity Cache**: `/src/lib/entity-cache-service.ts`
- **Session Manager**: `/src/lib/session-manager.ts`
- **Bullhorn API**: `/src/lib/bullhorn-api.ts`

## Reporting Results

When reporting test results, include:

1. Screenshot of the test results table
2. Both connection snapshots
3. Browser console output (if errors occurred)
4. Which connection you started with and switched to
5. Any error messages from the Logs tab

## Automation Considerations

This test is currently manual due to:

1. Need for user to authenticate to both connections
2. OAuth flow requires user interaction
3. Different users may have different access levels

Future enhancements could include:

- Automated connection switching with stored credentials
- Scheduled regression tests
- Integration with CI/CD pipeline
- Automated alerting on data bleed detection

## Success Criteria

A successful test run should show:

- ✅ All critical tests passing (green)
- ✅ No data isolation failures
- ✅ Clear distinction between connection snapshots
- ⚠️ Warnings are acceptable and informational

If any critical tests fail, **do not proceed with data operations** until the issue is resolved.
