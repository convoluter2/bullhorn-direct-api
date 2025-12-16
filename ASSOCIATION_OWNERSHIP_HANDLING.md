# Association Ownership Auto-Redirect Feature

## Overview

The Bullhorn Data Manager now automatically handles association ownership errors by detecting when an association operation fails because it's owned by the inverse entity, and automatically redirecting the operation to the correct entity.

## Problem Solved

When attempting to add/remove to-many associations in Bullhorn, you may encounter errors like:

```
error persisting an entity of type: The association between ClientCorporation and 
ClientCorporationCertification is owned by ClientCorporationCertification.
```

This error occurs because Bullhorn enforces that certain associations can only be modified from the "owning" side of the relationship.

## Automatic Solution

The system now:

1. **Detects ownership errors** - Parses the error response to identify when an association is owned by the inverse entity
2. **Extracts the owning entity** - Determines which entity owns the association
3. **Auto-redirects the operation** - Automatically performs the operation on the owning entity instead
4. **Provides clear feedback** - Shows toast notifications explaining what happened

## How It Works

### Example Scenario

**Original Request:**
- Entity: `ClientCorporation` (ID: 595382)
- Operation: Add certifications
- Association field: `certifications`
- IDs to associate: `[12345, 67890]`

**What Happens:**

1. System attempts: `PUT /entity/ClientCorporation/595382/certifications/12345,67890`
2. Bullhorn returns error: "association is owned by ClientCorporationCertification"
3. System detects ownership pattern in error message
4. System auto-redirects to update each `ClientCorporationCertification` record instead:
   - `POST /entity/ClientCorporationCertification/12345` with `{ clientCorporation: { id: 595382 } }`
   - `POST /entity/ClientCorporationCertification/67890` with `{ clientCorporation: { id: 595382 } }`
5. Success message shown: "Successfully associated 2 ClientCorporationCertification records"

## Supported Operations

### Add (Associate)

When adding associations, the system updates each record in the association IDs list to point to the target entity.

**Original:** Add certifications to ClientCorporation
**Redirected:** Update each ClientCorporationCertification to reference the ClientCorporation

### Remove (Disassociate)

When removing associations, the system updates each record to clear the reference to the target entity.

**Original:** Remove certifications from ClientCorporation
**Redirected:** Update each ClientCorporationCertification to null out the ClientCorporation reference

### Replace

Replace operations work by:
1. First removing all existing associations (using disassociate logic)
2. Then adding the new associations (using associate logic)

## User Notifications

When auto-redirect occurs, users see two notifications:

1. **Info toast:** "Redirecting: Association is owned by [EntityName]. Updating those records instead..."
2. **Success toast:** "Successfully associated N [EntityName] records" (or "Successfully disassociated...")

These notifications help users understand:
- Why the direct operation wasn't possible
- What the system did instead
- How many records were affected

## Error Handling

The auto-redirect feature includes comprehensive error handling:

- **Partial failures:** If some records succeed and others fail, you get a detailed report
- **Complete failures:** If all records fail, the original error is thrown with details
- **Individual errors:** Each failed record includes its ID and specific error message

Example response with partial failures:
```json
{
  "message": "Successfully associated 8 ClientCorporationCertification records, 2 failed",
  "results": [...],
  "errors": [
    { "id": 12345, "error": "Record not found" },
    { "id": 67890, "error": "Insufficient permissions" }
  ]
}
```

## Implementation Details

### Pattern Detection

The system uses regex pattern matching to detect ownership errors:
```
/association between (\w+) and (\w+) is owned by (\w+)/i
```

This captures:
- Entity 1 (e.g., "ClientCorporation")
- Entity 2 (e.g., "ClientCorporationCertification")
- Owning Entity (e.g., "ClientCorporationCertification")

### Inverse Field Naming

The system automatically determines the inverse field name by:
1. Identifying the non-owning entity from the pattern
2. Converting it to camelCase (e.g., "ClientCorporation" → "clientCorporation")

This works for standard Bullhorn naming conventions where the inverse field is named after the entity it references.

## Where This Works

The auto-redirect feature is active in all modules that perform to-many operations:

- **SmartStack** - Bulk updates from CSV IDs
- **CSV Loader** - Import/update from CSV files
- **QueryStack** - Query-driven bulk updates

## Common Use Cases

### ClientCorporation Certifications
- **Problem:** Can't add certifications to ClientCorporation
- **Solution:** System updates ClientCorporationCertification records instead

### Candidate Certifications
- **Problem:** Can't add certifications to Candidate
- **Solution:** System updates CandidateCertification records instead

### Placement Certifications
- **Problem:** Can't add certifications to Placement
- **Solution:** System updates PlacementCertification records instead

### Any "Join Table" Associations
Many Bullhorn associations follow this pattern where a join entity (like XyzCertification) owns the relationship between two main entities.

## Benefits

1. **No manual intervention required** - Works automatically without user configuration
2. **Clear feedback** - Users know exactly what happened
3. **Handles batch operations** - Works seamlessly with bulk updates
4. **Error resilience** - Provides detailed feedback on partial failures
5. **Consistent behavior** - Same logic across all modules (SmartStack, CSV Loader, QueryStack)

## Technical Notes

- The feature is implemented in `bullhornAPI.associateToMany()` and `bullhornAPI.disassociateToMany()`
- Private helper methods handle the detection and inverse operations
- All existing code automatically benefits from this feature
- No breaking changes to the API

## Future Enhancements

Potential improvements for future versions:

1. **Metadata-driven detection** - Use Bullhorn metadata to proactively determine ownership before attempting operations
2. **User preferences** - Allow users to see what will happen before auto-redirect
3. **Batch optimization** - Combine multiple inverse updates into fewer API calls where possible
4. **Caching** - Remember ownership patterns to avoid repeated detection
