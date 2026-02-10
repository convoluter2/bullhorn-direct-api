# Metadata API Standardization

## Overview
Updated QueryBlast, CSVLoader, SmartStack, and QueryStack to use the same metadata API endpoints as the Documentation tab for retrieving entity lists and field information.

## Changes Made

### Entity List Retrieval
**Previous Approach:**
- Used `/settings` endpoint via `bullhornAPI.getAllEntities()`
**New Approach:**
- Returns complete list of all entities

### Field Metadat
- Already using `/meta/{entity}` endpoint via `bullhornAPI.get
- Consistent across all components
## Technical Implementation
### Updated Hook: `use-entities.ts`


const metaEntities = aw
```
### API Methods Used
   - Endpoint: `GET {restUrl}/meta

2. **`bullhornAPI.getMetada


All four majo
- **CSVLo
- **QueryStack**: Multi-stage query operations

1. **Con
3. **Accuracy**: Real-time metadata reflects actual tenant 
5. **Custom Entities**: Automatically includes custom entities
## 

4. Validate caching 

- Entity list cached for 24 hours in `useKV` storage
- Cache invalidated on component refresh action


































