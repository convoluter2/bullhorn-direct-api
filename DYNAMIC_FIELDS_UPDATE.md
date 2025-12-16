# Dynamic Fields Update

## Changes Made

### 1. Entity Metadata Hook (`use-entity-metadata.ts`)
- Fetches all available fields for an entity from Bullhorn API `/meta/{entity}` endpoint
- Caches metadata for 1 hour to reduce API calls
- Returns field information including:
  - Field name and label
  - Data type and specialization
  - Options (if available) for dropdown fields
  - Associated entities for relationship fields

### 2. Field Selector Component (`FieldSelector.tsx`)
- Displays all available fields as clickable badges
- Shows search input when there are more than 15 fields
- Allows users to select/deselect fields easily
- Shows count of selected fields

### 3. Smart Field Input Component (`SmartFieldInput.tsx`)
- Automatically detects if a field has predefined options
- For fields with few options (<20): Shows standard dropdown
- For fields with many options (>20): Shows searchable combobox with autocomplete
- For fields without options: Shows standard text input
- Always allows custom/free text input even when options exist

### 4. Updated Components

#### QueryBlast
- Now uses `useEntityMetadata` to load all fields dynamically
- Uses `FieldSelector` for field selection with search
- Uses `SmartFieldInput` for filter values (supports options + free text)
- Shows loading skeleton while fetching metadata

#### SmartStack
- Loads dynamic fields for selected entity
- Filter fields use dropdown with all available fields
- Update fields use dropdown with all available fields
- Both filter values and update values use `SmartFieldInput` for smart options handling

#### CSVLoader
- Loads dynamic fields for mapping
- Shows field labels instead of just field names
- Supports all available fields from the API

## Bullhorn API Search Behavior

The Bullhorn API `/search` endpoint handles field queries according to its documentation:
- When too many fields are requested, it automatically handles pagination and batching
- The `query` parameter supports Lucene-style syntax
- Complex queries with multiple filters are joined with `AND`
- Operators are mapped correctly (`:`, `:<>`, `:*`, `:>`, `:<`, `:IS NULL`, `:IS NOT NULL`)

## Benefits

1. **Always up-to-date**: Fields are fetched from API, not hardcoded
2. **User-friendly**: Shows field labels and proper options
3. **Flexible**: Allows both selecting from options and entering custom values
4. **Performant**: Caches metadata to minimize API calls
5. **Scalable**: Handles entities with many fields through search functionality
