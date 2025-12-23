# To-One Field Handling Guide

## Overview

To-One associations in Bullhorn represent a relationship where one entity is associated with exactly one instance of another entity (e.g., a Placement has one JobOrder, a Candidate has one owner).

## How It Works Across All Tools

### SmartStack, QueryStack, and CSV Loader

All three tools now handle to-one associations consistently:

1. **Input**: Enter just the numeric ID of the associated entity
2. **Preview**: See both the ID and the title/name of the associated entity  
3. **API Update**: Send `{ id: <number> }` format to Bullhorn

### Example Flow

#### User Input
```
Field: jobOrder
Value: 919540
```

#### What You See in Preview
```json
{
  "jobOrder": {
    "id": 919540,
    "title": "Allied - Radiology - CT Technician"
  }
}
```

#### What Gets Sent to Bullhorn API
```json
{
  "jobOrder": { "id": 919540 }
}
```

## Component: ToOneFieldInput

The new `ToOneFieldInput` component provides:

- ✅ Numeric ID input with validation
- ✅ Automatic entity lookup on blur/after typing
- ✅ Display of entity title/name below input
- ✅ Error handling for not-found IDs
- ✅ Clear button to reset value
- ✅ Loading indicator during lookup

### Usage

```tsx
import { ToOneFieldInput } from '@/components/ToOneFieldInput'

<ToOneFieldInput
  field={fieldMetadata}  // EntityField with associationType === 'TO_ONE'
  value={value}          // String containing the numeric ID
  onChange={setValue}    // Function to update the value
/>
```

## Component: ValidatedFieldInput

The `ValidatedFieldInput` component now automatically detects to-one fields and renders the `ToOneFieldInput` component.

```tsx
import { ValidatedFieldInput } from '@/components/ValidatedFieldInput'

// Automatically uses ToOneFieldInput if field.associationType === 'TO_ONE'
<ValidatedFieldInput
  field={fieldMetadata}
  value={value}
  onChange={setValue}
/>
```

## Preview Display Logic

When showing previews in dry run mode, all three tools now fetch the associated entity's details to display:

```typescript
// Preview logic for to-one fields
if (fieldMeta?.associationType === 'TO_ONE' && updateData[key]?.id) {
  const associatedEntity = fieldMeta.associatedEntity?.entity
  const lookupResult = await bullhornAPI.getEntity(
    associatedEntity, 
    updateData[key].id, 
    ['id', 'name', 'title', 'firstName', 'lastName']
  )
  
  const title = lookupResult.data.title || 
               lookupResult.data.name || 
               `${lookupResult.data.firstName} ${lookupResult.data.lastName}`
  
  previewNewValues[key] = {
    id: updateData[key].id,
    title: title || '(No title)'
  }
}
```

## Update Logic

When actually updating entities (not dry run), all three tools convert numeric ID strings to the proper format:

```typescript
// Update logic for to-one fields
if (fieldMeta?.associationType === 'TO_ONE') {
  const trimmedValue = update.value.trim()
  if (trimmedValue && /^\d+$/.test(trimmedValue)) {
    updateData[update.field] = { id: parseInt(trimmedValue, 10) }
  }
}
```

## Testing

Use the **To-One Test** tab to verify:

1. Enter a valid JobOrder ID (e.g., 919540)
2. Verify the entity title appears below the input
3. Check that both `ToOneFieldInput` and `ValidatedFieldInput` work the same
4. Verify error handling with an invalid ID

## Common Use Cases

### SmartStack
```
1. Upload CSV with Placement IDs
2. Select Placement entity
3. Add field update: jobOrder = 1426785
4. Run dry run to see: jobOrder: { id: 1426785, title: "..." }
5. Execute to update all placements
```

### QueryStack
```
1. Query Placements with status = "Submitted"
2. Add field update: jobOrder = 1426785
3. Preview shows proper to-one with title
4. Execute to update matching records
```

### CSV Loader
```
CSV:
id,jobOrder
646963,1426785

1. Upload CSV
2. Map "jobOrder" column to jobOrder field
3. Dry run shows: jobOrder: { id: 1426785, title: "..." }
4. Import updates the placement
```

## Troubleshooting

### Issue: Preview shows `jobOrder: "1426785"` instead of object
**Solution**: This was the old behavior. After the fix, it should show `{ id: 1426785, title: "..." }`

### Issue: API error "Invalid format for to-one association"
**Solution**: The update logic should automatically convert to `{ id: number }` format. Check that the field is properly detected as `TO_ONE`.

### Issue: Lookup shows "Failed to lookup"
**Solution**: 
- Verify you're connected to Bullhorn
- Verify the ID exists
- Check that you have permission to view that entity type

### Issue: No title shown in lookup
**Solution**: The entity might not have a `title`, `name`, `firstName/lastName` field. The ID will still work for updates.

## API Reference

### bullhornAPI.getEntity()
Used for looking up to-one associations:

```typescript
const result = await bullhornAPI.getEntity(
  'JobOrder',          // Entity type
  919540,              // Entity ID
  ['id', 'title']      // Fields to fetch
)

// Returns: { data: { id: 919540, title: "..." } }
```

### bullhornAPI.updateEntity()
Accepts to-one associations in the proper format:

```typescript
await bullhornAPI.updateEntity(
  'Placement',
  646963,
  {
    jobOrder: { id: 1426785 }  // Proper format
  }
)
```

## Implementation Checklist

- ✅ Created ToOneFieldInput component with lookup functionality
- ✅ Updated ValidatedFieldInput to use ToOneFieldInput for TO_ONE fields
- ✅ Updated SmartStack preview to show to-one with titles
- ✅ Updated QueryStack preview to show to-one with titles  
- ✅ Updated CSV Loader preview to show to-one with titles
- ✅ All three tools convert numeric IDs to `{ id: number }` format
- ✅ Created test suite in To-One Test tab
- ✅ Documentation complete
