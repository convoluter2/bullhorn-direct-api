# InvoiceTerm Entity Query Support Fix

## Problem
The `/search` endpoint for the `InvoiceTerm` entity was failing with errors, but the direct entity GET endpoint (`/entity/InvoiceTerm/{id}`) was working correctly. This caused issues when:
1. Performing CSV imports with InvoiceTerm lookups
2. Using the QueryBlast feature with InvoiceTerm searches
3. Any operation that attempted to use the search endpoint for InvoiceTerm

Example of failing call:
```
https://rest43.bullhornstaffing.com/rest-services/82iulg/search/InvoiceTerm?query=id%3A17619&fields=id%2CisDeleted&count=500&start=0
```

Example of working call:
```
https://bullhorn-middleware-trustaff.ingenovishealth.com/bullhorn/entity/InvoiceTerm/17619?fields=isDeleted,id
```

## Root Cause
The `InvoiceTerm` entity was not included in the `QUERY_ONLY_ENTITIES` list in `entity-query-support.ts`, which meant the system assumed it supported both the `/search` and `/query` endpoints. In reality, InvoiceTerm only supports the `/query` endpoint for lookups (in addition to direct GET by ID).

## Solution
1. **Added InvoiceTerm to QUERY_ONLY_ENTITIES list** (`src/lib/entity-query-support.ts`)
   - This tells the system to use the `/query` endpoint instead of `/search` for InvoiceTerm lookups
   - The query endpoint uses SQL-like WHERE clauses instead of Lucene syntax

2. **Improved CSV Loader lookup fallback** (`src/components/CSVLoader.tsx`)
   - Enhanced the WHERE clause generation to properly handle both numeric and string lookup values
   - Numeric values: `field=123`
   - String values: `field='value'` (with proper escaping of quotes)

3. **Restored EntityLookup component** (`src/components/EntityLookup.tsx`)
   - File was corrupted during investigation
   - Rebuilt with proper support for effective date entities including InvoiceTerm

## Files Modified
- `src/lib/entity-query-support.ts` - Added InvoiceTerm to QUERY_ONLY_ENTITIES
- `src/components/CSVLoader.tsx` - Improved WHERE clause generation for query fallback
- `src/components/EntityLookup.tsx` - Restored and added InvoiceTerm to EFFECTIVE_DATE_ENTITIES

## Testing Recommendations
1. Test CSV import with InvoiceTerm entity using ID lookups
2. Test QueryBlast with InvoiceTerm using query syntax (not search syntax)
3. Test direct entity lookup for InvoiceTerm records
4. Verify that updates to InvoiceTerm records work correctly

## Query vs Search
- **Query endpoint** (`/query/{entity}`): Uses SQL WHERE clause syntax, supports entities like InvoiceTerm
- **Search endpoint** (`/search/{entity}`): Uses Lucene query syntax, not available for all entities

## Other Query-Only Entities
The following entities also only support the query endpoint:
- Appointment
- AppointmentAttendee
- BusinessSector
- Category
- CertificationRequirement
- ClientContactCertification
- CorporateUser
- CorporationDepartment
- Country
- InvoiceTerm (newly added)
- JobSubmission
- Note
- NoteEntity
- PlacementCertification
- PlacementChangeRequest
- PlacementCommission
- Skill
- Specialty
- State
- Task
- Tearsheet
- TimeUnit
- UserType
