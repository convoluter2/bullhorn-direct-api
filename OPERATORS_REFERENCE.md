# Bullhorn API Query Operators Reference

This document lists all query operators supported by the Bullhorn REST API and implemented in the Bullhorn Data Manager application.

## Overview

The application now includes an **Operator Test Suite** tab where you can test all operators against your Bullhorn instance to verify which ones work with your specific data.

## Supported Operators

### Comparison Operators

| Operator | Symbol | Description | Example | Implementation |
|----------|--------|-------------|---------|----------------|
| **Equals** | `:` | Exact match (case-insensitive) | `status:Active` | `equals` |
| **Not Equals** | `:<>` | Does not equal | `status:<>Inactive` | `not_equals` |
| **Greater Than** | `:>` | Greater than (numeric/date) | `dateAdded:>1609459200000` | `greater_than` |
| **Less Than** | `:<` | Less than (numeric/date) | `dateAdded:<1609459200000` | `less_than` |
| **Greater or Equal** | `:>=` | Greater than or equal to | `salary:>=50000` | `greater_equal` |
| **Less or Equal** | `:<=` | Less than or equal to | `salary:<=100000` | `less_equal` |

### Text Search Operators

| Operator | Symbol | Description | Example | Implementation |
|----------|--------|-------------|---------|----------------|
| **Contains** | `:*` | Contains substring (wildcard) | `name:*smith*` | `contains` |
| **Starts With** | `:*[` | Starts with prefix | `name:*[John` | `starts_with` |
| **Ends With** | `:]` | Ends with suffix | `email:]@example.com` | `ends_with` |

### Null Check Operators

| Operator | Symbol | Description | Example | Implementation |
|----------|--------|-------------|---------|----------------|
| **Is Null** | `:IS NULL` | Field is null/empty | `customText1:IS NULL` | `is_null` |
| **Is Not Null** | `:IS NOT NULL` | Field has a value | `customText1:IS NOT NULL` | `is_not_null` |

### Range Operators

| Operator | Symbol | Description | Example | Implementation |
|----------|--------|-------------|---------|----------------|
| **Between (Inclusive)** | `:..[` | Value between range [start,end] | `dateAdded:..[1609459200000,1612137600000]` | `between_inclusive` |
| **Between (Exclusive)** | `:..()` | Value between range (start,end) | `salary:..(40000,60000)` | `between_exclusive` |

### List Operators

| Operator | Symbol | Description | Example | Implementation |
|----------|--------|-------------|---------|----------------|
| **In List (Brackets)** | `:[` | Value in list of values | `status:[Active,New]` | `in_list` |
| **In List (Parens)** | `:()` | Value in list using parentheses | `id:(1,2,3)` | `in_list_parens` |

### Special Operators

| Operator | Symbol | Description | Example | Implementation |
|----------|--------|-------------|---------|----------------|
| **Lucene Query** | `~` | Advanced Lucene syntax search | `name~"John AND Smith"` | `lucene` |

## Usage in Application

### Simple Filters

All filters are available in the "Simple" filter mode in:
- QueryBlast
- SmartStack
- QueryStack

Select the operator from the dropdown menu, and the application will automatically format the query correctly.

### Grouped Filters

Grouped filters allow you to combine multiple filter groups with AND/OR logic. All operators listed above are available in grouped mode.

### Special Value Formats

#### List Operators
When using `In List` operators, separate values with commas:
```
Active,New Lead,Qualified
```

#### Range Operators
When using `Between` operators, provide two comma-separated values:
```
1609459200000,1612137600000
```

#### Date Fields
Bullhorn uses Unix timestamps (milliseconds since epoch) for date fields:
```
dateAdded:>1609459200000
```

#### Text with Spaces
Text values containing spaces are automatically quoted:
```
status:"New Lead"
```

## Operator Test Suite

The **Operators** tab provides a comprehensive testing interface where you can:

1. Select an entity (e.g., `Candidate`)
2. Select a field (e.g., `status`)
3. Provide a test value (e.g., `Active`)
4. Run individual or batch tests on all operators

The test suite will show:
- ✅ Working operators (green badge)
- ❌ Failed operators (red badge)
- Query syntax used
- Number of records found
- Response time

### Testing Best Practices

1. **Start with Known Data**: Test with values you know exist in your database
2. **Test by Category**: Filter by operator category (comparison, text, null, etc.)
3. **Document Results**: Note which operators work best for your use cases
4. **Test Different Fields**: Some operators may work differently on different field types

## Implementation Details

### Query Building

The application automatically builds queries using the `buildFilterCondition` method in `bullhorn-api.ts`:

```typescript
// Example: Contains operator
field:*value*

// Example: In List operator
field:[value1,value2,value3]

// Example: Between operator
field:..[start,end]
```

### Operator Mapping

Internal operator names are mapped to Bullhorn API syntax:

```typescript
{
  'equals': ':',
  'not_equals': ':<>',
  'contains': ':*',
  'starts_with': ':*[',
  'ends_with': ':]',
  'greater_than': ':>',
  'less_than': ':<',
  'greater_equal': ':>=',
  'less_equal': ':<=',
  'is_null': ':IS NULL',
  'is_not_null': ':IS NOT NULL',
  'in_list': ':[',
  'in_list_parens': ':(',
  'between_inclusive': ':..[',
  'between_exclusive': ':..(',
  'lucene': '~'
}
```

## Combining Operators

### Simple Mode (AND Logic)
All filters are combined with AND:
```
status:Active AND dateAdded:>1609459200000
```

### Grouped Mode (AND/OR Logic)
Create complex queries with groups:
```
(status:Active OR status:New) AND dateAdded:>1609459200000
```

## Known Limitations

1. **Lucene Operator**: May not be available on all Bullhorn instances or fields
2. **Field Type Restrictions**: Some operators only work with specific field types:
   - Comparison operators (>, <, >=, <=) work with numeric and date fields
   - Text operators (contains, starts with, ends with) work with string fields
3. **Case Sensitivity**: Most text searches are case-insensitive
4. **Performance**: Complex queries with many OR conditions may be slower

## API Documentation

For more details, refer to the official Bullhorn REST API documentation:
- [Search Documentation](https://bullhorn.github.io/rest-api-docs/#search)
- [Entity Reference](https://bullhorn.github.io/rest-api-docs/entityref.html)

## Testing Your Instance

To verify which operators work on your specific Bullhorn instance:

1. Navigate to the **Operators** tab
2. Select a common entity (e.g., `Candidate`)
3. Select a field with known data (e.g., `status`)
4. Enter a value that exists in your data (e.g., `Active`)
5. Click **Run All Tests**
6. Review the results to see which operators return data

The working operators will be highlighted in green, making it easy to identify which operators are fully supported by your instance.
