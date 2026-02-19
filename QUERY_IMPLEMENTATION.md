# Bullhorn Search vs Query Implementation

## Overview

Added comprehensive support for both Bullhorn Search (Lucene syntax) and Query (SQL WHERE syntax) methods across QueryBlast, CSVLoader, SmartStack, and QueryStack.

## Key Changes

### 1. Entity Query Support Detection (`/src/lib/entity-query-support.ts`)

New utility to determine which entities support which query methods:

- **Search-only entities**: Candidate, ClientContact, ClientCorporation, JobOrder, Lead, Opportunity, Placement
- **Query-only entities**: Appointment, AppointmentAttendee, BusinessSector, Category, Note, Task, etc.
- **Both**: Most other entities support both methods

Functions:
- `getQueryMethod(entityName)` - Returns 'search', 'query', or 'both'
- `supportsSearch(entityName)` - Boolean check
- `supportsQuery(entityName)` - Boolean check
- `getRecommendedMethod(entityName)` - Returns recommended method
- `getQueryMethodDescription(entityName)` - Returns user-friendly description

### 2. Query Builder Utility (`/src/lib/query-builder.ts`)

New utility for building SQL WHERE clauses:

- `buildSQLWhereClause(filters, logic)` - Builds complete WHERE clause
- `buildSQLCondition(filter)` - Builds individual SQL condition
- `getOperatorDisplayName(operator, forQuery)` - Get friendly operator names
- `getAvailableOperatorsForMethod(method)` - Returns valid operators for search/query

#### SQL WHERE Syntax Examples:

```sql
-- Simple comparisons
status = 'Active'
salary > 50000
dateAdded >= 1324579022

-- Compound properties
owner.lastName = 'Smith'
owner.corporation.name = 'Acme'

-- NULL checks
email IS NULL
phone IS NOT NULL

-- Empty checks (to-many only)
categories IS EMPTY
skills IS NOT EMPTY

-- IN clauses
status IN ('Active', 'Submitted')
id NOT IN (1, 2, 3)

-- MEMBER OF (to-many only)
123 MEMBER OF categories
456 NOT MEMBER OF skills

-- Logical expressions
status = 'Active' AND salary > 50000
(status = 'Active' OR status = 'Submitted') AND salary > 50000

-- Boolean values
enabled = true
willingToRelocate = false

-- DateTime values (UNIX milliseconds)
dateAdded > 1324579022
```

### 3. Enhanced Bullhorn API (`/src/lib/bullhorn-api.ts`)

Updated methods:

- Enhanced `query()` method to return `QueryResult` format
- Added logging and error handling
- Import entity query support utilities
- Both `search()` and `query()` now return consistent formats

## Lucene Search Syntax (for reference)

Used when entity supports Search:

```
-- Exact match
firstName:John

-- Wildcards
firstName:J*
lastName:*son

-- Ranges
salary:[50000,100000]
dateAdded:>1324579022

-- Boolean
isDeleted:1
enabled:true

-- Complex
firstName:John AND lastName:Smith
(firstName:John OR firstName:Jane) AND isDeleted:0
```

## Supported Operators by Method

### Search (Lucene) Operators:
- equals (:)
- not_equals (:<>)
- contains (:*)
- starts_with (*[)
- ends_with (])
- greater_than (>)
- less_than (<)
- greater_equal (>=)
- less_equal (<=)
- is_null (IS NULL)
- is_not_null (IS NOT NULL)
- in_list (IN)
- between_inclusive (..[])
- between_exclusive (..())
- lucene (~) - fuzzy matching

### Query (SQL WHERE) Operators:
- equals (=)
- not_equals (<>)
- greater_than (>)
- less_than (<)
- greater_equal (>=)
- less_equal (<=)
- is_null (IS NULL)
- is_not_null (IS NOT NULL)
- is_empty (IS EMPTY) - to-many only
- is_not_empty (IS NOT EMPTY) - to-many only
- in_list (IN)
- not_in_list (NOT IN)
- member_of (MEMBER OF) - to-many only
- not_member_of (NOT MEMBER OF) - to-many only

## Implementation Status

✅ **Completed:**
- Entity query support detection
- SQL WHERE clause builder
- Enhanced bullhorn-api query method
- Operator filtering by method

🚧 **Next Steps (to be implemented):**
- Update QueryBlast UI to show query method
- Add query method selector (when both supported)
- Filter operators based on selected method
- Update CSVLoader, SmartStack, QueryStack similarly
- Add syntax help/examples in UI
- Show warning when using incompatible operators

## Usage Examples

```typescript
import { getQueryMethod, supportsQuery } from '@/lib/entity-query-support'
import { buildSQLWhereClause } from '@/lib/query-builder'

// Check what methods an entity supports
const method = getQueryMethod('Candidate')  // Returns 'search'
const canQuery = supportsQuery('Note')  // Returns true

// Build SQL WHERE clause
const filters = [
  { field: 'status', operator: 'equals', value: 'Active' },
  { field: 'salary', operator: 'greater_than', value: '50000' }
]
const whereClause = buildSQLWhereClause(filters, 'AND')
// Returns: "status = 'Active' AND salary > 50000"

// Use with API
if (supportsQuery(entity)) {
  const result = await bullhornAPI.query(
    entity,
    fields,
    whereClause,
    { count: 500, start: 0 }
  )
} else {
  // Use search with Lucene syntax
  const result = await bullhornAPI.search(config)
}
```

## API Endpoints

### Search Endpoint:
```
GET /rest-services/{corpToken}/search/{entity}?query={luceneQuery}&fields={fields}&count={count}&start={start}
```

### Query Endpoint:
```
GET /rest-services/{corpToken}/query/{entity}?where={sqlWhere}&fields={fields}&count={count}&start={start}
```

## References

- [Bullhorn Search API](https://bullhorn.github.io/rest-api-docs/#search)
- [Bullhorn Query API](https://bullhorn.github.io/rest-api-docs/#query)
- [Query WHERE Parameter](https://bullhorn.github.io/rest-api-docs/#query-where-parameter)
- [Lucene Query Syntax](https://lucene.apache.org/core/4_10_4/queryparser/org/apache/lucene/queryparser/classic/package-summary.html#Overview)
