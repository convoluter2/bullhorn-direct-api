import { bullhornAPI } from './bullhorn-api'

export interface CachedEntity {
  entity: string
  label: string
  metaUrl: string
  isManual?: boolean
}

export interface EntityCacheData {
  entities: CachedEntity[]
  lastFullRefresh: number
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
      
      return cache.entities.map(e => ({
        entity: e.entity,
        label: e.label,
        metaUrl: e.metaUrl,
        isManual: e.isManual
      }))
    } catch (error) {
      console.error('Failed to get entity list from cache:', error)
      return []
    }
  }

  async refreshEntityList(silent = false): Promise<CachedEntity[]> {
    try {
      const session = bullhornAPI.getSession()
      if (!session) {
        console.log('⚠️ No active session, cannot refresh entity list')
        return []
      }

      if (!silent) {
        console.log('🔄 Refreshing entity list from API...')
      }

      const response = await bullhornAPI.getMetadata('AllEntities')
      const entities: CachedEntity[] = response.AllEntities.map((entity: string) => ({
        entity,
        label: entity,
        metaUrl: `/meta/${entity}?meta=full`,
        isManual: false
      }))

      const cache = await window.spark.kv.get<EntityCacheData>('entity-cache-v2')
      const manualEntities = cache?.entities.filter(e => e.isManual) || []
      
      const allEntities = [
        ...entities,
        ...manualEntities
      ].sort((a, b) => a.entity.localeCompare(b.entity))

      const cacheData: EntityCacheData = {
        entities: allEntities,
        lastFullRefresh: Date.now(),
        metadata: response,
        lastUpdated: Date.now()
      }

      await this.saveEntityCache(cacheData)

      if (!silent) {
        console.log(`✅ Refreshed ${allEntities.length} entities (${entities.length} from API, ${manualEntities.length} manual)`)
      }

      return allEntities
    } catch (error) {
      console.error('Failed to refresh entity list:', error)
      return []
    }
  }

  async loadMetadataCache(entityName: string): Promise<any | null> {
    try {
      const cacheKey = `metadata-cache-${entityName}`
      const cache = await window.spark.kv.get<{ metadata: any; timestamp: number }>(cacheKey)
      if (!cache) {
        return null
      }
      
      return cache
    } catch (error) {
      console.error('Failed to load metadata cache:', error)
      return null
    }
  }

  async saveMetadataCache(entityName: string, metadata: any): Promise<void> {
    try {
      const cacheKey = `metadata-cache-${entityName}`
      await window.spark.kv.set(cacheKey, {
        metadata,
        timestamp: Date.now()
      })
    } catch (error) {
      console.error('Failed to save metadata cache:', error)
    }
  }

  async addManualEntity(entityName: string): Promise<boolean> {
    try {
      const cache = await window.spark.kv.get<EntityCacheData>('entity-cache-v2')
      
      const existingEntities = cache?.entities || []
      if (existingEntities.some(e => e.entity === entityName)) {
        console.log(`Entity ${entityName} already exists`)
        return false
      }

      const newEntity: CachedEntity = {
        entity: entityName,
        label: entityName,
        metaUrl: `/meta/${entityName}?meta=full`,
        isManual: true
      }

      const updatedCache: EntityCacheData = {
        entities: [
          ...existingEntities,
          newEntity
        ].sort((a, b) => a.entity.localeCompare(b.entity)),
        lastFullRefresh: cache?.lastFullRefresh || Date.now(),
        metadata: cache?.metadata || {},
        lastUpdated: Date.now()
      }

      await this.saveEntityCache(updatedCache)
      console.log(`✅ Added manual entity: ${entityName}`)
      return true
    } catch (error) {
      console.error(`Failed to add manual entity ${entityName}:`, error)
      return false
    }
  }

  async startBackgroundRefresh() {
    try {
      const cache = await window.spark.kv.get<EntityCacheData>('entity-cache-v2')
      if (!cache) {
        return
      }
      
      const shouldRefreshNow = Date.now() - cache.lastFullRefresh > REFRESH_INTERVAL
      
      if (shouldRefreshNow) {
        console.log('🔄 Cache is stale, refreshing immediately...')
        await this.refreshEntityList(true)
      }
    } catch (error) {
      console.error('Failed to check cache freshness:', error)
    }

    this.refreshTimer = setInterval(async () => {
      try {
        const cache = await window.spark.kv.get<EntityCacheData>('entity-cache-v2')
        if (!cache) {
          return
        }
        
        const shouldRefreshNow = Date.now() - cache.lastFullRefresh > REFRESH_INTERVAL
        
        if (shouldRefreshNow) {
          console.log('🔄 Background refresh triggered...')
          await this.refreshEntityList(true)
        }
      } catch (error) {
        console.error('Background refresh error:', error)
      }
    }, REFRESH_INTERVAL)
  }

  stopBackgroundRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = null
    }
  }

  async getCacheStatus(): Promise<{
    lastRefresh: number | null
    nextRefresh: number | null
    entityCount: number
    manualCount: number
    apiCount: number
  }> {
    try {
      const cache = await window.spark.kv.get<EntityCacheData>('entity-cache-v2')
      if (!cache) {
        return {
          lastRefresh: null,
          nextRefresh: null,
          entityCount: 0,
          manualCount: 0,
          apiCount: 0
        }
      }
      
      const manualCount = cache.entities.filter(e => e.isManual).length
      const apiCount = cache.entities.length - manualCount
      const nextRefresh = cache.lastFullRefresh + REFRESH_INTERVAL

      return {
        lastRefresh: cache.lastFullRefresh,
        nextRefresh,
        entityCount: cache.entities.length,
        manualCount,
        apiCount
      }
    } catch (error) {
      console.error('Failed to get cache status:', error)
      return {
        lastRefresh: null,
        nextRefresh: null,
        entityCount: 0,
        manualCount: 0,
        apiCount: 0
      }
    }
  }

  private async saveEntityCache(data: EntityCacheData) {
    await window.spark.kv.set('entity-cache-v2', data)
  }
}

export const entityCacheService = new EntityCacheService()
