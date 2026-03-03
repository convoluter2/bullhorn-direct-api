# Field Value Cache Implementation

## Overview
Added a comprehensive field value caching system to reduce API calls when loading TO_MANY and TO_ONE field values. This significantly improves performance when working with associated entities like Skills, Categories, ClientCorporations, etc.

## Key Features

### 1. In-Memory Cache (`field-value-cache.ts`)
- **LRU (Least Recently Used) eviction**: Automatically removes oldest cached entries when limit is reached
- **Time-based expiration**: Cache entries expire after 5 minutes
- **Size limits**: Maximum 100 cache entries to prevent memory issues
- **Search optimization**: Separate cache keys for full lists vs. search results
- **Smart caching**: Caches by entity type and search term for optimal reuse

### 2. React Hook (`use-field-values.ts`)
- **`useFieldValues`**: Hook for loading field values with automatic caching
- **`useFieldValueById`**: Hook for loading single records by ID
- **Auto-refresh support**: Can force refresh to bypass cache
- **Loading states**: Proper loading and error state management

### 3. Automatic Prefetching
Common entities are automatically prefetched on login:
- Skill
- Category
- Specialty
- ClientCorporation
- ClientContact
- JobOrder
- BusinessSector
- Country
- State

### 4. Cache Integration
Updated components to use the cache:
- **ToManyFieldInput**: Uses cache for search and record loading
- **ToOneFieldInput**: Uses cache for lookups and search
- **App.tsx**: Prefetches on authentication, clears on disconnect/switch

### 5. Cache Monitoring
**CacheStatus** component (visible in Diagnostic Panel) shows:
- Number of cache entries
- Number of entities cached
- Age of oldest/newest entries
- List of cached entities
- Manual prefetch and clear controls

## Performance Benefits

### Before (Without Cache)
- Every search triggers a new API call
- Every TO_MANY field load triggers a new API call
- Every TO_ONE lookup triggers a new API call
- High API usage during CSV mapping and SmartStack configuration

### After (With Cache)
- First search/load fetches from API and caches result
- Subsequent searches/loads use cached data (instant response)
- Cache expires after 5 minutes to ensure data freshness
- Common entities pre-loaded on login
- Significantly reduced API calls (estimated 60-80% reduction for typical workflows)

## Usage Examples

### In Components (Using Hook)
```typescript
import { useFieldValues } from '@/hooks/use-field-values'

const { values, isLoading, refresh } = useFieldValues({
  entityType: 'Skill',
  fields: ['id', 'name'],
  searchTerm: searchQuery, // optional
  enabled: true,
  autoLoad: true
})
```

### Direct Cache Access
```typescript
import { fieldValueCache } from '@/lib/field-value-cache'

// Get values (with caching)
const skills = await fieldValueCache.getFieldValues(
  'Skill',
  ['id', 'name'],
  searchTerm // optional
)

// Get single record by ID
const skill = await fieldValueCache.getFieldValueById(
  'Skill',
  123,
  ['id', 'name']
)

// Invalidate cache for entity
fieldValueCache.invalidateEntity('Skill')

// Clear all cache
fieldValueCache.invalidateAll()
```

## Cache Management

### Automatic Management
- Cache automatically expires entries after 5 minutes
- LRU eviction when cache size exceeds 100 entries
- Cache is cleared on disconnect
- Cache is cleared and repopulated on connection switch

### Manual Management
Users can:
- View cache statistics in Diagnostic Panel
- Manually clear cache
- Manually trigger prefetch
- See which entities are cached

## Technical Details

### Cache Key Structure
```
{entityType}:all          // Full entity list
{entityType}:search:{term} // Search results for specific term
```

### Memory Footprint
- Maximum 100 cache entries
- Each entry limited to ~500 records
- Estimated maximum memory: 5-10 MB

### Cache Hit Scenarios
1. ✅ Same entity, same search term, within 5 minutes
2. ✅ Same entity, no search, within 5 minutes
3. ❌ Different search term (new API call, new cache entry)
4. ❌ Cache entry older than 5 minutes (new API call, refreshes cache)
5. ❌ Force refresh requested (new API call, updates cache)

## Error Handling
- Falls back to stale cache if API call fails
- Returns empty array if no cache and API fails
- Logs errors without breaking user experience

## Future Enhancements
Potential improvements for future iterations:
1. Persistent cache (localStorage/IndexedDB) for cross-session caching
2. Configurable cache duration per entity type
3. Smart cache warming based on user patterns
4. Cache preloading for predictive workflows
5. Compression for large cache entries
