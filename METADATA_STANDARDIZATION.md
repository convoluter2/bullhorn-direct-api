# Metadata API Standardization

## Overview
Updated QueryBlast, CSVLoader, SmartStack, and QueryStack to use the same metadata API endpoints as the Documentation tab for retrieving entity lists and field information.

## Changes Made

### Entity List Retrieval
**Previous Approach:**
- Used `/settings` endpoint via `bullhornAPI.getAllEntities()`
- Returned limited entity list or fallback to hardcoded entities
- Inconsistent across different tenants

**New Approach:**
- Uses `/meta` endpoint via `bullhornAPI.getAllEntitiesMeta()`
- Returns complete list of all entities available in the tenant
- Same method used by Documentation tab
- Consistent and comprehensive across all tenants

### Field Metadata Retrieval
**No Change Required:**
- Already using `/meta/{entity}` endpoint via `bullhornAPI.getMetadata(entity)`
- Returns complete field information including types, labels, associations
- Consistent across all components

## Technical Implementation

### Updated Hook: `use-entities.ts`
```typescript
// Before
const fetchedEntities = await bullhornAPI.getAllEntities()

// After
const metaEntities = await bullhornAPI.getAllEntitiesMeta()
const fetchedEntities = metaEntities.map(e => e.entity).sort()
```

### API Methods Used
1. **`bullhornAPI.getAllEntitiesMeta()`**
   - Endpoint: `GET {restUrl}/meta?fields=*&meta=full&BhRestToken={token}`
   - Returns: Array of `{ entity: string, metaUrl: string, dateLastModified: string | null }`
   - Used for: Entity list dropdown population

2. **`bullhornAPI.getMetadata(entityName)`**
   - Endpoint: `GET {restUrl}/meta/{entity}?fields=*&meta=full&BhRestToken={token}`
   - Returns: Complete entity metadata including all fields with types, labels, associations
   - Used for: Field selection, validation, type information

## Components Affected
All four major data operation components now use the same metadata APIs:
- **QueryBlast**: Query and update records
- **CSVLoader**: Import/export CSV data
- **SmartStack**: Bulk update operations
- **QueryStack**: Multi-stage query operations
- **Documentation**: Entity/field reference (unchanged)

## Benefits
1. **Consistency**: All components see the same entities and fields
2. **Completeness**: Access to full tenant entity list, not limited subset
3. **Accuracy**: Real-time metadata reflects actual tenant configuration
4. **Maintainability**: Single source of truth for metadata retrieval
5. **Custom Entities**: Automatically includes custom entities without code changes

## Testing Recommendations
1. Verify entity dropdowns show complete list in all components
2. Confirm custom entities appear in all entity selectors
3. Test field metadata loads correctly for all entity types
4. Validate caching still works efficiently
5. Check performance with large entity lists (100+ entities)

## Cache Strategy
- Entity list cached for 24 hours in `useKV` storage
- Field metadata cached for 1 hour in memory
- Cache invalidated on component refresh action
- Corporation-specific caching prevents cross-tenant data leaks
