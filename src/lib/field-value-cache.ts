import { bullhornAPI } from './bullhorn-api'

const CACHE_DURATION = 5 * 60 * 1000
const MAX_CACHE_SIZE = 100

export interface CachedFieldValue {
  id: number
  name: string
  label?: string
  [key: string]: any
}

export interface FieldValueCacheEntry {
  entityType: string
  values: CachedFieldValue[]
  cachedAt: number
  count: number
  fields: string
}

export class FieldValueCache {
  private memoryCache: Map<string, FieldValueCacheEntry> = new Map()
  private cacheAccessLog: Map<string, number> = new Map()

  private getCacheKey(entityType: string, searchTerm?: string): string {
    return searchTerm ? `${entityType}:search:${searchTerm}` : `${entityType}:all`
  }

  private isExpired(entry: FieldValueCacheEntry): boolean {
    return Date.now() - entry.cachedAt > CACHE_DURATION
  }

  private evictOldestEntry(): void {
    if (this.memoryCache.size < MAX_CACHE_SIZE) {
      return
    }

    let oldestKey: string | null = null
    let oldestAccess = Infinity

    for (const [key, lastAccess] of this.cacheAccessLog.entries()) {
      if (lastAccess < oldestAccess) {
        oldestAccess = lastAccess
        oldestKey = key
      }
    }

    if (oldestKey) {
      console.log(`🗑️ Evicting cache entry: ${oldestKey}`)
      this.memoryCache.delete(oldestKey)
      this.cacheAccessLog.delete(oldestKey)
    }
  }

  async getFieldValues(
    entityType: string,
    fields: string[] = ['id', 'name'],
    searchTerm?: string,
    forceRefresh: boolean = false
  ): Promise<CachedFieldValue[]> {
    const cacheKey = this.getCacheKey(entityType, searchTerm)
    const fieldsStr = fields.join(',')

    if (!forceRefresh) {
      const cached = this.memoryCache.get(cacheKey)
      if (cached && !this.isExpired(cached) && cached.fields === fieldsStr) {
        console.log(`📦 Cache hit for ${entityType}${searchTerm ? ` (search: ${searchTerm})` : ''}`)
        this.cacheAccessLog.set(cacheKey, Date.now())
        return cached.values
      }
    }

    console.log(`🔍 Fetching fresh data for ${entityType}${searchTerm ? ` (search: ${searchTerm})` : ''}`)

    try {
      let values: CachedFieldValue[]
      let count: number

      if (searchTerm) {
        const searchResult = await bullhornAPI.searchEntity(
          entityType,
          searchTerm,
          fieldsStr,
          { count: 100 }
        )
        values = searchResult.data || []
        count = searchResult.count || 0
      } else {
        const queryResult = await bullhornAPI.query(
          entityType,
          `id>0`,
          fieldsStr,
          { count: 500, orderBy: 'id' }
        )
        values = queryResult.data || []
        count = queryResult.count || 0
      }

      const entry: FieldValueCacheEntry = {
        entityType,
        values,
        cachedAt: Date.now(),
        count,
        fields: fieldsStr
      }

      this.evictOldestEntry()
      this.memoryCache.set(cacheKey, entry)
      this.cacheAccessLog.set(cacheKey, Date.now())

      console.log(`💾 Cached ${values.length} values for ${entityType}${searchTerm ? ` (search: ${searchTerm})` : ''}`)

      return values
    } catch (error) {
      console.error(`❌ Failed to fetch field values for ${entityType}:`, error)
      
      const cached = this.memoryCache.get(cacheKey)
      if (cached) {
        console.log(`⚠️ Returning stale cache for ${entityType}`)
        return cached.values
      }
      
      return []
    }
  }

  async getFieldValueById(
    entityType: string,
    id: number,
    fields: string[] = ['id', 'name']
  ): Promise<CachedFieldValue | null> {
    const cacheKey = this.getCacheKey(entityType)
    const cached = this.memoryCache.get(cacheKey)

    if (cached) {
      const found = cached.values.find(v => v.id === id)
      if (found) {
        console.log(`📦 Cache hit for ${entityType} id=${id}`)
        return found
      }
    }

    console.log(`🔍 Fetching single record for ${entityType} id=${id}`)

    try {
      const result = await bullhornAPI.getEntity(entityType, id, fields.join(','))
      return result as CachedFieldValue
    } catch (error) {
      console.error(`❌ Failed to fetch ${entityType} id=${id}:`, error)
      return null
    }
  }

  async prefetchCommonEntities(): Promise<void> {
    const commonEntities = [
      { entity: 'Skill', fields: ['id', 'name'] },
      { entity: 'Category', fields: ['id', 'name'] },
      { entity: 'Specialty', fields: ['id', 'name'] },
      { entity: 'ClientCorporation', fields: ['id', 'name'] },
      { entity: 'ClientContact', fields: ['id', 'firstName', 'lastName'] },
      { entity: 'JobOrder', fields: ['id', 'title'] },
      { entity: 'BusinessSector', fields: ['id', 'name'] },
      { entity: 'Country', fields: ['id', 'name'] },
      { entity: 'State', fields: ['id', 'name'] },
    ]

    console.log('🚀 Prefetching common entity values...')

    const prefetchPromises = commonEntities.map(({ entity, fields }) =>
      this.getFieldValues(entity, fields).catch(err => {
        console.warn(`⚠️ Failed to prefetch ${entity}:`, err)
      })
    )

    await Promise.allSettled(prefetchPromises)
    console.log('✅ Prefetch complete')
  }

  invalidateEntity(entityType: string): void {
    const keysToDelete: string[] = []
    
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(`${entityType}:`)) {
        keysToDelete.push(key)
      }
    }

    for (const key of keysToDelete) {
      this.memoryCache.delete(key)
      this.cacheAccessLog.delete(key)
    }

    console.log(`🗑️ Invalidated ${keysToDelete.length} cache entries for ${entityType}`)
  }

  invalidateAll(): void {
    this.memoryCache.clear()
    this.cacheAccessLog.clear()
    console.log('🗑️ Cleared all field value cache')
  }

  getCacheStats(): {
    size: number
    entities: string[]
    oldestEntry: number | null
    newestEntry: number | null
  } {
    const entities = new Set<string>()
    let oldestEntry: number | null = null
    let newestEntry: number | null = null

    for (const entry of this.memoryCache.values()) {
      entities.add(entry.entityType)
      
      if (oldestEntry === null || entry.cachedAt < oldestEntry) {
        oldestEntry = entry.cachedAt
      }
      
      if (newestEntry === null || entry.cachedAt > newestEntry) {
        newestEntry = entry.cachedAt
      }
    }

    return {
      size: this.memoryCache.size,
      entities: Array.from(entities),
      oldestEntry,
      newestEntry
    }
  }
}

export const fieldValueCache = new FieldValueCache()
