import { bullhornAPI } from './bullhorn-api'

export type CachedEntity = {
  entity: string
  label?: string
  metaUrl?: string
  isManual?: boolean
  lastUpdated: number
}

export type EntityCacheData = {
  entities: CachedEntity[]
  lastFullRefresh: number
  nextScheduledRefresh: number
}

export type CachedMetadata = {
  entity: string
  metadata: any
  lastUpdated: number
}

const REFRESH_INTERVAL = 12 * 60 * 60 * 1000
const METADATA_CACHE_DURATION = 24 * 60 * 60 * 1000

class EntityCacheService {
  private refreshTimer: NodeJS.Timeout | null = null
  private isRefreshing = false

  async loadEntityCache(): Promise<EntityCacheData | null> {
    try {
      const cached = await window.spark.kv.get<EntityCacheData>('entity-cache-v2')
      return cached || null
    } catch (error) {
      console.error('Failed to load entity cache:', error)
      return null
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
        entity: entityName,
        metadata,
        lastUpdated: Date.now()
      }
      await window.spark.kv.set(`metadata-cache-${entityName}`, cacheData)
      console.log(`✅ Metadata cache saved for ${entityName}`)
    } catch (error) {
      console.error(`Failed to save metadata cache for ${entityName}:`, error)
    }
  }

  async refreshEntityList(silent = false): Promise<CachedEntity[]> {
    if (this.isRefreshing) {
      console.log('🔄 Entity refresh already in progress, skipping...')
      return []
    }

    this.isRefreshing = true
    const startTime = Date.now()

    try {
      if (!silent) {
        console.log('🔄 Starting entity list refresh...')
      }

      const session = bullhornAPI.getSession()
      if (!session) {
        console.log('⚠️ No active session, cannot refresh entities')
        return []
      }

      const metaEntities = await bullhornAPI.getAllEntitiesMeta()
      
      const existingCache = await this.loadEntityCache()
      const manualEntities = existingCache?.entities.filter(e => e.isManual) || []

      const apiEntities: CachedEntity[] = metaEntities.map(e => ({
        entity: e.entity,
        label: e.entity,
        metaUrl: e.metaUrl,
        isManual: false,
        lastUpdated: Date.now()
      }))

      const manualEntityNames = new Set(manualEntities.map(e => e.entity))
      const mergedEntities = [
        ...apiEntities,
        ...manualEntities.filter(manual => !apiEntities.some(api => api.entity === manual.entity))
      ].sort((a, b) => a.entity.localeCompare(b.entity))

      const cacheData: EntityCacheData = {
        entities: mergedEntities,
        lastFullRefresh: Date.now(),
        nextScheduledRefresh: Date.now() + REFRESH_INTERVAL
      }

      await this.saveEntityCache(cacheData)

      const duration = Date.now() - startTime
      console.log(`✅ Entity refresh complete: ${mergedEntities.length} entities (${apiEntities.length} API + ${manualEntities.length} manual) in ${duration}ms`)

      return mergedEntities
    } catch (error) {
      console.error('❌ Entity refresh failed:', error)
      return []
    } finally {
      this.isRefreshing = false
    }
  }

  async addManualEntity(entityName: string): Promise<boolean> {
    try {
      const cache = await this.loadEntityCache()
      const entities = cache?.entities || []

      if (entities.some(e => e.entity === entityName)) {
        console.log(`Entity ${entityName} already exists in cache`)
        return false
      }

      const newEntity: CachedEntity = {
        entity: entityName,
        isManual: true,
        lastUpdated: Date.now()
      }

      const updatedEntities = [...entities, newEntity].sort((a, b) => a.entity.localeCompare(b.entity))

      const updatedCache: EntityCacheData = {
        entities: updatedEntities,
        lastFullRefresh: cache?.lastFullRefresh || Date.now(),
        nextScheduledRefresh: cache?.nextScheduledRefresh || Date.now() + REFRESH_INTERVAL
      }

      await this.saveEntityCache(updatedCache)
      console.log(`✅ Manual entity added: ${entityName}`)
      return true
    } catch (error) {
      console.error(`Failed to add manual entity ${entityName}:`, error)
      return false
    }
  }

  async startBackgroundRefresh(): Promise<void> {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
    }

    const cache = await this.loadEntityCache()
    
    const shouldRefreshNow = !cache || 
      !cache.lastFullRefresh || 
      Date.now() - cache.lastFullRefresh > REFRESH_INTERVAL

    if (shouldRefreshNow) {
      console.log('🔄 Initial entity refresh needed')
      await this.refreshEntityList(true)
    }

    this.refreshTimer = setInterval(async () => {
      console.log('⏰ Scheduled entity refresh triggered')
      await this.refreshEntityList(true)
    }, REFRESH_INTERVAL)

    console.log(`✅ Background refresh scheduled every ${REFRESH_INTERVAL / (60 * 60 * 1000)} hours`)
  }

  stopBackgroundRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = null
      console.log('🛑 Background refresh stopped')
    }
  }

  async getEntityList(): Promise<CachedEntity[]> {
    const cache = await this.loadEntityCache()
    return cache?.entities || []
  }

  async getCacheStatus(): Promise<{
    entityCount: number
    lastRefresh: number | null
    nextRefresh: number | null
    manualCount: number
    apiCount: number
  }> {
    const cache = await this.loadEntityCache()
    
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
      nextRefresh: cache.nextScheduledRefresh,
      manualCount,
      apiCount
    }
  }
}

export const entityCacheService = new EntityCacheService()
