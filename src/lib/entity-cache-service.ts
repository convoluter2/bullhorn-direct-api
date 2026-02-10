import { bullhornAPI } from './bullhorn-api'

export interface CachedEntity {
  entity: string
  label?: string
  metaUrl?: string
  isManual?: boolean
  lastUpdated: number
}

export interface EntityCacheData {
  entities: CachedEntity[]
  lastFullRefresh: number
}

export interface MetadataCache {
  metadata: any
  lastUpdated: number
}

const CACHE_DURATION = 24 * 60 * 60 * 1000
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

  async saveEntityCache(cacheData: EntityCacheData): Promise<void> {
    try {
      await window.spark.kv.set('entity-cache-v2', cacheData)
    } catch (error) {
      console.error('Failed to save entity cache:', error)
    }
  }

  async refreshEntityList(silent: boolean = false): Promise<CachedEntity[]> {
    try {
      const session = bullhornAPI.getSession()
      if (!session) {
        console.log('⚠️ No active session, cannot refresh entity list')
        return []
      }

      if (!silent) {
        console.log('🔄 Refreshing entity list from API...')
      }

      const response = await bullhornAPI.getAllEntitiesMeta()
      const apiEntities: CachedEntity[] = response.map((e: any) => ({
        entity: e.entity,
        label: e.label,
        metaUrl: e.metaUrl,
        isManual: false,
        lastUpdated: Date.now()
      }))

      const cache = await window.spark.kv.get<EntityCacheData>('entity-cache-v2')
      const manualEntities = cache?.entities.filter(e => e.isManual) || []

      const allEntities = [
        ...apiEntities,
        ...manualEntities
      ].sort((a, b) => a.entity.localeCompare(b.entity))

      const updatedCache: EntityCacheData = {
        entities: allEntities,
        lastFullRefresh: Date.now()
      }

      await this.saveEntityCache(updatedCache)

      if (!silent) {
        console.log('✅ Entity list refreshed:', allEntities.length, 'entities')
      }

      return allEntities
    } catch (error) {
      console.error('Failed to refresh entity list:', error)
      return []
    }
  }

  async getMetadataCache(entityName: string): Promise<any | null> {
    try {
      const cache = await window.spark.kv.get<MetadataCache>(`metadata-cache-${entityName}`)
      if (!cache) {
        return null
      }
      
      if (Date.now() - cache.lastUpdated > CACHE_DURATION) {
        console.log(`⚠️ Metadata cache expired for ${entityName}`)
        return null
      }
      
      return cache.metadata
    } catch (error) {
      console.error(`Failed to load metadata cache for ${entityName}:`, error)
      return null
    }
  }

  async saveMetadataCache(entityName: string, metadata: any): Promise<void> {
    try {
      const cacheData: MetadataCache = {
        metadata,
        lastUpdated: Date.now()
      }
      await window.spark.kv.set(`metadata-cache-${entityName}`, cacheData)
    } catch (error) {
      console.error(`Failed to save metadata cache for ${entityName}:`, error)
    }
  }

  async loadMetadataCache(entityName: string): Promise<any | null> {
    return this.getMetadataCache(entityName)
  }

  async addManualEntity(entityName: string): Promise<boolean> {
    try {
      const cache = await window.spark.kv.get<EntityCacheData>('entity-cache-v2')
      if (!cache) {
        return false
      }

      if (cache.entities.some(e => e.entity === entityName)) {
        console.log(`⚠️ Entity ${entityName} already exists`)
        return false
      }

      const newEntity: CachedEntity = {
        entity: entityName,
        label: entityName,
        isManual: true,
        lastUpdated: Date.now()
      }

      const updatedCache: EntityCacheData = {
        entities: [...cache.entities, newEntity].sort((a, b) => a.entity.localeCompare(b.entity)),
        lastFullRefresh: cache.lastFullRefresh
      }

      await this.saveEntityCache(updatedCache)
      console.log(`✅ Manual entity ${entityName} added`)
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
      const cache = await window.spark.kv.get<EntityCacheData>('entity-cache-v2')
      if (!cache) {
        return
      }
      
      const shouldRefreshNow = Date.now() - cache.lastFullRefresh > REFRESH_INTERVAL
      if (shouldRefreshNow) {
        console.log('🔄 Background refresh triggered')
        await this.refreshEntityList(true)
      }
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
    try {
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
        apiCount
      }
    } catch (error) {
      console.error('Failed to get cache status:', error)
      return {
        entityCount: 0,
        lastRefresh: null,
        nextRefresh: null,
        manualCount: 0,
        apiCount: 0
      }
    }
  }
}

export const entityCacheService = new EntityCacheService()
