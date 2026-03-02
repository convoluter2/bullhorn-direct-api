# TO_MANY Field Debugging Enhancement

## Summary
Added comprehensive debugging output to diagnose TO_MANY field UI rendering issues in CSV Loader, SmartStack, and QueryStack.

## Changes Made

### 1. CSV Loader (`src/components/CSVLoader.tsx`)
- Added console logging for each field mapping to show:
  - CSV column name
  - Bullhorn field name
  - Field metadata (type, dataType, associationType, associatedEntity)
  - Computed `isToMany` and `isToOne` flags
- Enhanced visual indicators in the field metadata display:
  - TO_MANY fields now have accent-colored background
  - Boolean indicators show ✅/❌ for easier visual scanning
  - Bold text for positive TO_MANY/TO_ONE matches

### 2. SmartStack (`src/components/SmartStack.tsx`)
- Added console logging for each field update configuration
- Shows the same metadata structure for debugging

### 3. QueryStack (`src/components/QueryStack.tsx`)
- Added console logging for field updates
- Includes targetEntity information for cross-entity updates

## How to Test Candidate.primarySkills

### Step 1: Open CSV Loader
1. Navigate to the CSV Loader tab
2. Select "Candidate" as the entity
3. Upload a CSV file with a column for primarySkills

### Step 2: Map the Field
1. Map the CSV column to "primarySkills" field
2. **Check the console output** for debug information
3. **Check the visual indicator** below the field mapping

### Expected Console Output
```javascript
{
  csvColumn: "primarySkills",
  bullhornField: "primarySkills",
  fieldMeta: {
    name: "primarySkills",
    type: "TO_MANY",
    dataType: "...",
    associationType: "TO_MANY",
    associatedEntity: {
      entity: "Skill",  // or "Category" depending on Bullhorn config
      entityMetaUrl: "..."
    }
  },
  isToMany: true,
  isToOne: false
}
```

### Expected Visual Behavior
If `isToMany: true`:
1. The field metadata box should have an **accent-colored background**
2. "Is TO_MANY" should show **✅ YES** in bold accent text
3. **ToManyConfigSelector component should render** below the field mapping with:
   - Operation dropdown (Add/Remove/Replace)
   - Match Field dropdown (id or other fields)
   - Helpful explanatory text

If `isToMany: false`:
- The ToManyConfigSelector will NOT render
- This indicates the field metadata does not have the correct type

## Diagnosis Steps

### If TO_MANY UI Does Not Appear:

1. **Check Console Logs**
   - Look for the debug output when you select primarySkills
   - Verify `isToMany` value
   - Verify `fieldMeta.type` and `fieldMeta.associationType`

2. **Check Field Metadata Display**
   - Does it show "Is TO_MANY: ✅ YES"?
   - Does it have the accent background?
   - What does "Field Type" show?
   - What does "Association Type" show?

3. **Possible Issues and Solutions:**

   **Issue A: `fieldMeta` is undefined**
   - The field is not in the metadata
   - Try refreshing entity metadata
   - Check if Candidate entity metadata loaded correctly

   **Issue B: `type` is not "TO_MANY"**
   - The Bullhorn API may be returning different type info
   - Check what the actual type value is
   - May need to update the condition in `use-entity-metadata.ts`

   **Issue C: `associationType` is not set**
   - Check lines 103-107 in `src/hooks/use-entity-metadata.ts`
   - The logic should set `associationType` based on `field.type`

## Testing in SmartStack

1. Navigate to SmartStack tab
2. Select "Candidate" entity
3. Add a field update
4. Select "primarySkills" from the dropdown
5. Check console for debug output
6. Verify ToManyFieldInput renders

## Testing in QueryStack

1. Navigate to QueryStack tab
2. Execute a query for Candidate
3. In Step 2, add a field update
4. Select "primarySkills"
5. Check console for debug output
6. Verify ToManyFieldInput renders

## Component Rendering Conditions

### CSV Loader (line 1396)
```typescript
{isToMany && mapping.bullhornField && mapping.bullhornField !== '__skip__' && (
  <ToManyConfigSelector ... />
)}
```

### SmartStack (line 1127)
```typescript
{isToMany ? (
  <ToManyFieldInput ... />
) : (
  <ValidatedFieldInput ... />
)}
```

### QueryStack (line 1245)
```typescript
{isToMany ? (
  <ToManyFieldInput ... />
) : (
  <ValidatedFieldInput ... />
)}
```

## Next Steps

1. **Test with Candidate.primarySkills** and capture console output
2. **Share the console output** to diagnose why `isToMany` might be false
3. **Check if the Bullhorn API** returns `type: "TO_MANY"` for this field
4. **Verify the metadata cache** isn't serving stale data

## Quick Debug Commands

Open browser console and run:
```javascript
// Check if metadata is loaded
const metadata = await bullhornAPI.getMetadata('Candidate')
const primarySkillsField = metadata.fields.find(f => f.name === 'primarySkills')
console.log('primarySkills metadata:', primarySkillsField)
```

## Files Modified
- `/workspaces/spark-template/src/components/CSVLoader.tsx`
- `/workspaces/spark-template/src/components/SmartStack.tsx`
- `/workspaces/spark-template/src/components/QueryStack.tsx`
