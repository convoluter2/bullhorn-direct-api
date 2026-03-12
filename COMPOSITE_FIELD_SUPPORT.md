# Composite Field Support for SmartStack

## Overview

Added comprehensive support for composite address fields in SmartStack v2, enabling bulk updates to address fields on Candidate, ClientCorporation, ClientContact, JobOrder, and other entities that have composite address fields.

## What Are Composite Fields?

Composite fields in Bullhorn are structured fields that contain multiple sub-fields. The most common example is address fields, which typically include:

- `address1` (street1)
- `address2` (street2)
- `city`
- `state`
- `zip` (postal code)
- `countryID`

Common composite address fields across entities:
- **Candidate**: `address`, `secondaryAddress`
- **ClientCorporation**: `address`, `billingAddress`
- **ClientContact**: `address`, `address2`
- **JobOrder**: `address`

## Features Added

### 1. CompositeAddressInput Component

Created a new specialized input component (`/src/components/CompositeAddressInput.tsx`) that provides:

- **Visual Field Breakdown**: Shows all sub-fields in a clean grid layout
- **Individual Sub-Field Inputs**: Each address component gets its own labeled input field
- **Required Field Indicators**: Clearly marks which sub-fields are required
- **JSON Preview**: Real-time preview of the JSON structure being created
- **Type Information**: Displays data type for each sub-field

**Example Usage:**
```tsx
<CompositeAddressInput
  field={fieldMetadata}
  value={jsonString}
  onChange={(newValue) => updateFieldUpdate(id, { value: newValue })}
  disabled={loading}
/>
```

### 2. SmartStack Integration

Updated SmartStack to automatically detect and handle composite fields:

#### Detection Logic
```typescript
const isComposite = fieldMeta?.composite || fieldMeta?.type === 'COMPOSITE'
```

#### Rendering Priority
SmartStack now checks fields in this order:
1. **Composite** → Use `CompositeAddressInput`
2. **TO_MANY** → Use `ToManyFieldInput`
3. **TO_ONE** → Use `ToOneFieldInput`
4. **Scalar** → Use `ValidatedFieldInput`

#### Field Type Badges
Updated the field selector dropdown to show `[COMPOSITE]` badge next to composite fields for easy identification.

### 3. Enhanced Field Label Formatting

Updated `formatFieldLabelWithType()` utility function to include composite field detection:

```typescript
formatFieldLabelWithType(label, fieldName, type, dataType, composite)
```

Now displays fields like:
- `Address [COMPOSITE]`
- `Billing Address [COMPOSITE]`

### 4. Informational Alert

Added a helpful alert that appears in SmartStack when composite fields are available:

```
📍 Composite Address Fields Available

This entity includes composite address fields (address, secondaryAddress). 
When you select these fields, you'll get a specialized interface to update 
individual address components like street1, city, state, zip, etc.
```

### 5. Execution Logic

The existing composite field handling in SmartStack's execution logic already supports JSON parsing:

```typescript
if (fieldMeta?.composite) {
  try {
    updateData[update.field] = JSON.parse(update.value)
  } catch {
    updateData[update.field] = update.value
  }
}
```

This means updates are sent to the Bullhorn API with proper structure:

```json
{
  "address": {
    "address1": "123 Main St",
    "city": "Boston",
    "state": "MA",
    "zip": "02101"
  }
}
```

## User Workflow

### Updating Address Fields in SmartStack

1. **Upload CSV** with entity IDs
2. **Select Entity** (e.g., Candidate, ClientCorporation)
3. **Add Field Update** and select a composite field (e.g., `address`)
4. **Fill Sub-Fields** in the CompositeAddressInput interface:
   - Enter street address in `address1`
   - Enter city in `city`
   - Enter state in `state`
   - Enter zip code in `zip`
5. **Preview JSON** to verify structure
6. **Execute** (Dry Run or Live)

### Example Scenarios

#### Scenario 1: Update All Candidate Addresses to a New Office
- Upload CSV with 500 candidate IDs
- Select "Candidate" entity
- Add filter: `status = 'Active'`
- Add field update: `address`
- Fill in composite fields:
  - address1: "100 New Office Blvd"
  - city: "San Francisco"
  - state: "CA"
  - zip: "94102"
- Run in dry-run mode to preview
- Execute live update

#### Scenario 2: Clear Secondary Addresses
- Upload CSV with candidate IDs
- Select "Candidate" entity
- Add field update: `secondaryAddress`
- Leave all sub-fields empty
- Execute to clear the addresses

#### Scenario 3: Update Client Corporation Billing Addresses
- Upload CSV with client corporation IDs
- Select "ClientCorporation" entity
- Add field update: `billingAddress`
- Fill in new billing address details
- Execute update

## Technical Details

### Metadata Structure

Composite fields are identified in metadata by:
```typescript
{
  name: "address",
  type: "COMPOSITE",
  composite: true,
  fields: [
    { name: "address1", dataType: "String", required: false },
    { name: "address2", dataType: "String", required: false },
    { name: "city", dataType: "String", required: false },
    { name: "state", dataType: "String", required: false },
    { name: "zip", dataType: "String", required: false },
    { name: "countryID", dataType: "Integer", required: false }
  ]
}
```

### JSON Format

Updates are stored and transmitted as JSON strings:
```json
"{\"address1\":\"123 Main St\",\"city\":\"Boston\",\"state\":\"MA\",\"zip\":\"02101\"}"
```

Which parses to:
```javascript
{
  address1: "123 Main St",
  city: "Boston",
  state: "MA",
  zip: "02101"
}
```

### Console Logging

Enhanced debug logging to track composite field detection:
```javascript
console.log('🔍 SmartStack Field Update Render:', {
  isComposite,
  willShowCompositeInput: isComposite && fieldMeta,
  fieldMeta: {
    composite: fieldMeta.composite,
    subFieldCount: fieldMeta.fields?.length
  }
})
```

## Files Modified

1. **Created**: `/src/components/CompositeAddressInput.tsx` - New specialized input component
2. **Modified**: `/src/components/SmartStack.tsx` - Added composite field detection and rendering
3. **Modified**: `/src/lib/utils.ts` - Updated `formatFieldLabelWithType()` to include composite parameter
4. **Existing**: Execution logic already supported composite fields via JSON parsing

## Benefits

- ✅ **User-Friendly**: No need to manually construct JSON
- ✅ **Type-Safe**: Sub-fields are validated by data type
- ✅ **Visual**: Clear interface shows all address components
- ✅ **Flexible**: Can update all or some sub-fields
- ✅ **Discoverable**: Alert and badges make feature obvious
- ✅ **Consistent**: Same pattern used in CSVLoader

## Testing Checklist

- [ ] Load Candidate entity and verify `address` shows COMPOSITE badge
- [ ] Select `address` field and verify CompositeAddressInput renders
- [ ] Fill in address sub-fields and verify JSON preview updates
- [ ] Execute dry-run and verify address structure in preview
- [ ] Execute live update and verify address updated in Bullhorn
- [ ] Test with ClientCorporation `billingAddress`
- [ ] Test with ClientContact `address`
- [ ] Test with JobOrder `address`
- [ ] Test clearing address by leaving all fields empty
- [ ] Test partial updates (only some sub-fields filled)

## Related Components

This feature follows the same pattern as:
- **CSVLoader**: Already has `CompositeFieldMapper` for CSV imports
- **ToManyFieldInput**: Specialized input for TO_MANY associations
- **ToOneFieldInput**: Specialized input for TO_ONE associations

All three follow the pattern of detecting special field types and rendering appropriate specialized input components.
