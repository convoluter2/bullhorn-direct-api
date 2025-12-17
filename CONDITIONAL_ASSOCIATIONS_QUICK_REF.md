# Conditional Associations - Quick Reference

## What Is It?

Apply different to-many association operations (add/remove/replace) based on field values in each record.

## When to Use

✅ Add certifications when candidates become active  
✅ Assign specialties based on experience level  
✅ Update tags based on location or department  
✅ Manage categories based on multiple conditions  
✅ Automate association changes during bulk updates  

## Available In

- **SmartStack**: CSV upload → filters → field updates → conditional associations
- **QueryStack**: Query records → field updates → conditional associations

## Quick Start

1. Enable "Use Conditional Association Logic" toggle
2. Click "Add Rule"
3. Set up conditions (what to check)
4. Set up action (what to do)
5. Preview with dry run
6. Execute

## Operators Reference

| Operator | Use When | Example |
|----------|----------|---------|
| `equals` | Exact match needed | `status equals "Active"` |
| `notEquals` | Exclude specific value | `status notEquals "Inactive"` |
| `contains` | Partial text match | `notes contains "VIP"` |
| `notContains` | Text doesn't have substring | `tags notContains "exclude"` |
| `greaterThan` | Number comparison | `salary greaterThan 100000` |
| `lessThan` | Number comparison | `age lessThan 30` |
| `isEmpty` | Field is blank/null | `middleName isEmpty` |
| `isNotEmpty` | Field has value | `email isNotEmpty` |
| `in` | Match any in list | `state in "CA,NY,TX"` |
| `notIn` | Exclude list values | `dept notIn "HR,Legal"` |

## Operations Reference

| Operation | What It Does | Example |
|-----------|--------------|---------|
| **Add** | Adds IDs, keeps existing | Add cert 101 to existing certs |
| **Remove** | Removes IDs, keeps others | Remove cert 102, keep rest |
| **Replace** | Removes all, adds only these | Replace all certs with 103 only |

## Condition Logic

**AND** - All conditions must be true:
```
status equals "Active" AND state equals "CA"
→ Only CA active records
```

**OR** - Any condition can be true:
```
status equals "Active" OR isPreferred equals "true"
→ Active records OR preferred records
```

## Multiple Rules

When multiple rules match:
- All matching rules apply
- **Replace** beats **Add**/**Remove**
- Multiple **Add** operations merge IDs
- Multiple **Remove** operations combine

## Example Rules

### Simple: Status-Based
**When**: `status equals "Active"`  
**Do**: `Add` IDs `[101, 102, 103]` to `certifications`

### Complex: Multi-Condition
**When**: `status equals "Active"` AND `state in "CA,NY,TX"` AND `yearsExperience greaterThan 5`  
**Do**: `Add` IDs `[201, 202]` to `specialties`

### Removal: Cleanup
**When**: `status equals "Inactive"`  
**Do**: `Remove` IDs `[101, 102]` from `certifications`

### Replacement: Reset
**When**: `department equals "Sales"`  
**Do**: `Replace` with IDs `[301]` in `categories`

## Best Practices

✅ **Always dry run first** - Preview before executing  
✅ **Add descriptions** - "Add VIP certs for active CA candidates"  
✅ **Verify IDs** - Ensure association IDs exist in Bullhorn  
✅ **Start simple** - Test with one rule before adding more  
✅ **Check logs** - Review audit logs after execution  

❌ **Don't use Replace lightly** - It removes ALL existing associations  
❌ **Don't skip validation** - Invalid IDs will fail  
❌ **Don't forget to disable dry run** - Must disable to actually apply changes  

## Troubleshooting

**Rule not applying?**
- Check if rule is enabled (toggle)
- Verify conditions match the data
- Check operator (equals vs contains)

**Wrong associations?**
- Review AND vs OR logic
- Check for multiple matching rules
- Look for Replace operations

**Changes not saving?**
- Disable dry run mode
- Check audit logs for errors
- Verify permissions

## Field Value Tips

### String Comparisons
- Case-insensitive for `contains`, `notContains`
- Case-sensitive for `equals`, `notEquals`

### Number Comparisons
- Auto-converts strings to numbers
- Use `greaterThan`, `lessThan` for numeric fields

### List Matching
- Use comma-separated values: `"CA,NY,TX"`
- Spaces are trimmed automatically
- Use `in` or `notIn` operators

### Empty Checks
- `isEmpty` matches null, undefined, or empty string
- `isNotEmpty` requires a non-empty value

## Common Patterns

### Pattern 1: Status-Based Management
```
Active → Add active-only certs
Inactive → Remove active-only certs
Archived → Replace with archived-only tags
```

### Pattern 2: Tiered Assignments
```
Experience > 10 years → Senior specialties
Experience 5-10 years → Mid-level specialties
Experience < 5 years → Junior specialties
```

### Pattern 3: Geographic Rules
```
State in CA,NY,TX → High-cost-of-living tags
State not in CA,NY,TX → Standard tags
```

### Pattern 4: Combination Rules
```
Active AND Preferred → VIP certifications
Active AND Experience > 5 → Professional certs
Preferred OR Executive → Premium specialties
```

## Performance Notes

- Each record evaluated individually
- Multiple rules = multiple evaluations per record
- Use query filters to reduce record count
- Replace operations are faster than multiple adds/removes

## Integration Notes

- Works with existing field updates
- Conditional associations apply after field updates
- Can use both regular updates and conditional logic together
- Supports all to-many association fields

## Documentation

For detailed documentation, see `CONDITIONAL_ASSOCIATIONS.md`

## Support

Check audit logs for operation details and errors. Enable dry run mode to preview changes before applying.
