# Conditional Association Logic

## Overview

Conditional Association Logic allows you to apply different to-many association operations (add, remove, replace) based on field values of individual records. This powerful feature enables sophisticated bulk update scenarios where association changes depend on the current state of each record.

## Key Concepts

### Conditional Rules
A conditional rule consists of:
- **Conditions**: One or more field-based conditions that must be met
- **Condition Logic**: How conditions are combined (AND/OR)
- **Association Field**: The to-many field to modify
- **Operation**: What to do (add, remove, or replace)
- **IDs**: Which association IDs to apply

### Operators

The following operators are available for conditions:

| Operator | Description | Example |
|----------|-------------|---------|
| `equals` | Exact match | status equals "Active" |
| `notEquals` | Not equal to | status notEquals "Inactive" |
| `contains` | String contains substring | notes contains "VIP" |
| `notContains` | String does not contain | notes notContains "blocked" |
| `greaterThan` | Numeric greater than | salary greaterThan 100000 |
| `lessThan` | Numeric less than | age lessThan 30 |
| `isEmpty` | Field is null/empty | middleName isEmpty |
| `isNotEmpty` | Field has a value | email isNotEmpty |
| `in` | Value in comma-separated list | state in "CA,NY,TX" |
| `notIn` | Value not in list | department notIn "HR,Legal" |

### Operations

Three operations are supported for to-many associations:

1. **Add**: Adds specified IDs to existing associations (keeps existing associations)
2. **Remove**: Removes specified IDs from existing associations (keeps other associations)
3. **Replace**: Removes all existing associations and replaces with specified IDs

## Use Cases

### Example 1: Certifications Based on Status

**Scenario**: Add specific certifications when a candidate becomes active, remove them when inactive.

**Rule 1**: When status equals "Active"
- **Action**: Add certification IDs [101, 102, 103] to `certifications`

**Rule 2**: When status equals "Inactive"
- **Action**: Remove certification IDs [101, 102, 103] from `certifications`

### Example 2: Specialties Based on Experience

**Scenario**: Assign different specialties based on years of experience.

**Rule 1**: When yearsExperience greaterThan 10
- **Action**: Add specialty IDs [201, 202] to `specialties`

**Rule 2**: When yearsExperience lessThan 5
- **Action**: Replace specialties with ID [203] only

### Example 3: Complex Multi-Condition Logic

**Scenario**: Apply certifications based on both status and location.

**Rule**: When status equals "Active" AND state in "CA,NY,TX"
- **Action**: Add certification IDs [301, 302] to `certifications`

**Rule**: When status equals "Active" OR isPreferred equals "true"
- **Action**: Add specialty ID [401] to `specialties`

## How to Use

### In SmartStack

1. Upload a CSV file with entity IDs
2. Select the entity type
3. Add any query filters (optional)
4. Define field updates
5. **Enable "Use Conditional Association Logic"**
6. Click "Add Rule" to create a conditional association
7. Configure conditions:
   - Select field
   - Choose operator
   - Enter value
   - Add more conditions with AND/OR logic
8. Configure association action:
   - Select association field (to-many field)
   - Choose operation (add/remove/replace)
   - Enter association IDs
9. Add more rules as needed
10. Preview changes with dry run mode
11. Execute the operation

### In QueryStack

1. Build and execute a query to find records
2. Review query results
3. Optionally select a different target entity
4. Add update filters (optional)
5. Define field updates
6. **Enable "Use Conditional Association Logic"**
7. Create conditional association rules (same as SmartStack)
8. Preview changes with dry run mode
9. Execute the operation

## Rule Evaluation Logic

### Condition Evaluation

Within a single rule, conditions are evaluated based on the **Condition Logic**:

- **AND**: ALL conditions must be true for the rule to apply
- **OR**: ANY condition being true will trigger the rule

### Multiple Rules

When multiple conditional rules are active:

1. Each rule is evaluated independently against the record data
2. All rules that match will apply their associations
3. If multiple rules target the same association field:
   - **Replace** operations take precedence
   - **Add** operations are merged (union of all IDs)
   - **Remove** operations are applied after adds

### Conflict Resolution Example

If you have:
- Rule 1: Add IDs [1, 2, 3] to `certifications`
- Rule 2: Add IDs [3, 4, 5] to `certifications`
- Both rules match

Result: IDs [1, 2, 3, 4, 5] will be added (duplicates removed)

If you have:
- Rule 1: Add IDs [1, 2, 3] to `certifications`
- Rule 2: Replace with IDs [4, 5] in `certifications`
- Both rules match

Result: IDs [4, 5] only (replace takes precedence)

## Best Practices

### 1. Test with Dry Run First

Always use dry run mode to preview what associations will be applied before executing:
```
✅ Enable "Dry Run Mode"
✅ Execute to see preview
✅ Review which associations will be applied
✅ Disable dry run and execute for real
```

### 2. Use Descriptive Rule Descriptions

Add clear descriptions to your rules:
```
❌ "Rule 1"
✅ "Add VIP certifications for active candidates in CA"
```

### 3. Order Rules Logically

Although all matching rules apply, organizing them logically helps with maintenance:
1. Status-based rules
2. Location-based rules  
3. Experience-based rules
4. Complex multi-condition rules

### 4. Be Careful with Replace Operations

Replace operations remove all existing associations. Use with caution:
```
⚠️ Replace will remove ALL existing associations
✅ Use Add/Remove to modify incrementally
```

### 5. Validate IDs Before Using

Ensure the association IDs you enter are valid in Bullhorn:
```
✅ Check ID exists in target entity
✅ Test with a small sample first
❌ Don't assume IDs without verification
```

## Limitations and Considerations

### Performance

- Each record is evaluated individually against all active rules
- Large rulesets on many records may take time to process
- Use query filters to reduce the number of records processed

### Field Access

- Conditional logic can only evaluate fields that are fetched from the entity
- Ensure required fields are included in the query or field updates section
- The system automatically fetches fields used in conditions

### Association Ownership

- Some associations are owned by the related entity (inverse associations)
- The system will automatically handle inverse associations
- Check audit logs if associations don't apply as expected

### API Rate Limits

- Each association update is an API call
- Large numbers of conditional rules and records may hit rate limits
- The system implements retry logic but be mindful of volume

## Troubleshooting

### Rule Not Applying

**Problem**: Conditional rule isn't applying associations

**Check**:
1. Is the rule enabled? (toggle switch)
2. Do the conditions actually match the record data?
3. Are the field values in the expected format?
4. Are association IDs valid?

### Wrong Associations Applied

**Problem**: Different associations applied than expected

**Check**:
1. Review condition logic (AND vs OR)
2. Check for multiple matching rules
3. Verify operator usage (equals vs contains, etc.)
4. Check for replace operations overriding add operations

### Associations Not Persisting

**Problem**: Associations appear in preview but don't persist

**Check**:
1. Is dry run mode disabled?
2. Check audit logs for API errors
3. Verify association ownership (may need inverse update)
4. Ensure you have permission to modify the association field

## API Integration

The conditional logic system integrates with the Bullhorn REST API:

```typescript
// Evaluation happens locally
const actions = getAssociationsForRecord(conditionalRules, recordData)

// Actions are merged and conflicts resolved
const mergedActions = mergeAssociationActions(actions)

// Each action is applied via API
for (const [field, action] of mergedActions) {
  await bullhornAPI.updateToManyAssociation(
    entity,
    recordId,
    field,
    action.ids,
    action.operation
  )
}
```

## Examples in Code

### Simple Status-Based Rule

```typescript
const rule: ConditionalAssociation = {
  id: 'rule-1',
  enabled: true,
  conditions: [
    {
      id: 'cond-1',
      field: 'status',
      operator: 'equals',
      value: 'Active'
    }
  ],
  conditionLogic: 'AND',
  associationField: 'certifications',
  operation: 'add',
  ids: [101, 102, 103],
  description: 'Add standard certifications for active candidates'
}
```

### Multi-Condition Rule

```typescript
const rule: ConditionalAssociation = {
  id: 'rule-2',
  enabled: true,
  conditions: [
    {
      id: 'cond-1',
      field: 'status',
      operator: 'equals',
      value: 'Active'
    },
    {
      id: 'cond-2',
      field: 'state',
      operator: 'in',
      value: 'CA,NY,TX'
    },
    {
      id: 'cond-3',
      field: 'yearsExperience',
      operator: 'greaterThan',
      value: '5'
    }
  ],
  conditionLogic: 'AND',
  associationField: 'specialties',
  operation: 'add',
  ids: [201, 202],
  description: 'Senior candidates in target states get premium specialties'
}
```

## Summary

Conditional Association Logic provides powerful, flexible control over to-many associations during bulk operations. By combining field-based conditions with association operations, you can implement complex business rules that would otherwise require manual processing or custom scripts.

Key benefits:
- ✅ Automate complex association updates
- ✅ Apply different logic to different records
- ✅ Combine multiple conditions with AND/OR logic
- ✅ Preview changes before applying
- ✅ Audit trail of all changes
- ✅ Rollback capability via snapshots
