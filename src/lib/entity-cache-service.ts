import { bullhornAPI } from './bullhorn-api'

export type CachedEntity = {
  entity: string
  label?: string
  metaUrl?: string
  isManual?: boolean
  lastUpdated: number
}

export type CachedMetadata = {
  metadata: any
  lastUpdated: number
}

export type EntityCacheData = {
  entities: CachedEntity[]
  lastFullRefresh: number
}

const CACHE_DURATION = 24 * 60 * 60 * 1000
const METADATA_CACHE_DURATION = 60 * 60 * 1000
const REFRESH_INTERVAL = 60 * 60 * 1000

class EntityCacheService {
  private refreshTimer: NodeJS.Timeout | null = null

  async getEntityList(): Promise<CachedEntity[]> {
    try {
      const cache = await window.spark.kv.get<EntityCacheData>('entity-cache-v2')
      if (!cache) {
        return []
      }
      
      if (Date.now() - cache.lastFullRefresh > CACHE_DURATION) {
        console.log('⚠️ Entity cache expired, returning cached data anyway')
      }
      
      return cache.entities || []
    } catch (error) {
      console.error('Failed to load entity cache:', error)
      return []
    }
  }

  async saveEntityCache(cache: EntityCacheData): Promise<void> {
    try {
      await window.spark.kv.set('entity-cache-v2', cache)
      console.log('✅ Entity cache saved:', cache.entities.length, 'entities')
    } catch (error) {
      console.error('Failed to save entity cache:', error)
    }
  }

  async loadMetadataCache(entityName: string): Promise<CachedMetadata | null> {
    try {
      const cached = await window.spark.kv.get<CachedMetadata>(`metadata-cache-${entityName}`)
      if (cached && Date.now() - cached.lastUpdated < METADATA_CACHE_DURATION) {
        return cached
      }
      return null
    } catch (error) {
      console.error(`Failed to load metadata cache for ${entityName}:`, error)
      return null
    }
  }

  async saveMetadataCache(entityName: string, metadata: any): Promise<void> {
    try {
      const cacheData: CachedMetadata = {
        metadata,
        lastUpdated: Date.now()
      }
      await window.spark.kv.set(`metadata-cache-${entityName}`, cacheData)
    } catch (error) {
      console.error(`Failed to save metadata cache for ${entityName}:`, error)
    }
  }

  async refreshEntityList(silent = false): Promise<CachedEntity[]> {
    if (!silent) {
      console.log('🔄 Refreshing entity list from API...')
    }

    try {
      const session = bullhornAPI.getSession()
      if (!session) {
        return []
      }

      const existingCache = await window.spark.kv.get<EntityCacheData>('entity-cache-v2')
      
      const manualEntities = existingCache?.entities.filter(e => e.isManual) || []
      
      const metaEntities = await bullhornAPI.getAllEntitiesMeta()
      const apiEntities: CachedEntity[] = metaEntities.map(e => ({
        entity: e.entity,
        label: e.entity,
        isManual: false,
        lastUpdated: Date.now()
      }))

      const allEntities = [
        ...apiEntities,
        ...manualEntities
      ].sort((a, b) => a.entity.localeCompare(b.entity))

      const cacheData: EntityCacheData = {
        entities: allEntities,
        lastFullRefresh: Date.now(),
      }

      await this.saveEntityCache(cacheData)

      if (!silent) {
        console.log('✅ Entity list refreshed:', allEntities.length, 'entities')
      }

      return allEntities
    } catch (error) {
      console.error('Failed to refresh entity list:', error)
      throw error
    }
  }

  async addManualEntity(entityName: string): Promise<boolean> {
    try {
      const cache = await window.spark.kv.get<EntityCacheData>('entity-cache-v2')

      if (cache?.entities.some(e => e.entity === entityName)) {
        console.log(`Entity ${entityName} already exists in cache`)
        return false
      }

      const newEntity: CachedEntity = {
        entity: entityName,
        isManual: true,
        lastUpdated: Date.now()
      }

      const updatedCache: EntityCacheData = {
        entities: [...(cache?.entities || []), newEntity].sort((a, b) => a.entity.localeCompare(b.entity)),
        lastFullRefresh: cache?.lastFullRefresh || Date.now()
      }

      await this.saveEntityCache(updatedCache)
      console.log(`✅ Manual entity ${entityName} added to cache`)
      return true
    } catch (error) {
      console.error(`Failed to add manual entity ${entityName}:`, error)
      return false
    }
  }

  startBackgroundRefresh(): void {
    if (this.refreshTimer) {
      return
    }

    this.refreshTimer = setInterval(async () => {
      const cache = await this.getEntityList()
      const lastRefresh = cache.length > 0 ? cache[0].lastUpdated : 0
      const shouldRefreshNow = Date.now() - lastRefresh > REFRESH_INTERVAL

      if (shouldRefreshNow) {
        await this.refreshEntityList(true)
      }

      console.log('⏰ Scheduled entity refresh triggered')
    }, REFRESH_INTERVAL)
  }

  stopBackgroundRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = null
    }
  }

  async getCacheStatus(): Promise<{
    entityCount: number
    lastRefresh: number | null
    nextRefresh: number | null
    manualCount: number
    apiCount: number
  }> {
    const cache = await window.spark.kv.get<EntityCacheData>('entity-cache-v2')
    
    if (!cache) {
      return {
        entityCount: 0,
        lastRefresh: null,
        nextRefresh: null,
        manualCount: 0,
        apiCount: 0
      }
    }

    const manualCount = cache.entities.filter(e => e.isManual).length
    const apiCount = cache.entities.filter(e => !e.isManual).length

    return {
      entityCount: cache.entities.length,
      lastRefresh: cache.lastFullRefresh,
      nextRefresh: cache.lastFullRefresh + REFRESH_INTERVAL,
      manualCount,
      apiCount,
    }
  }
}

export const entityCacheService = new EntityCacheService()
