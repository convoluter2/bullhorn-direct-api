import { bullhornAPI } from './bullhorn-api'

  label: string
  isManual?: boo

  entities: Cache
  metadata: any
}


  private refreshTimer: No
  async getEntityList(): 
      const cac
        return []
 

        metaUrl: e.metaUrl,
      }))

    }


      if (!session) {
        r

        console.log

      c
      
        isManual: false

      const manualEntit
        ...manualEntities
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
      c

      if (!silent) {
        console.log('🔄 Refreshing entity list from API...')
      }

      const response = await bullhornAPI.request('/meta?type=AllEntities&meta=full')
      const entities: CachedEntity[] = response.data.AllEntities.map((entity: string) => ({
        entity,
        label: entity,
        metaUrl: `/meta/${entity}?meta=full`,
        isManual: false
      }))

      const cache = await spark.kv.get<EntityCacheData>('entity-cache-v2')
      const manualEntities = cache?.entities.filter(e => e.isManual) || []
      
      const allEntities = [
        ...entities,
        ...manualEntities
      console.error('Failed to save metadata cache:', er

      const cacheData: EntityCacheData = {
        entities: allEntities,
        lastFullRefresh: Date.now(),
        metadata: response.data,
        lastUpdated: Date.now()
       

      await this.saveEntityCache(cacheData)

      if (!silent) {
        console.log(`✅ Refreshed ${allEntities.length} entities (${entities.length} from API, ${manualEntities.length} manual)`)
      }

      return allEntities

      console.error('Failed to refresh entity list:', error)
      return []
     
  }

  async loadMetadataCache(entityName: string): Promise<any | null> {
        r
      const cache = await spark.kv.get<EntityCacheData>('entity-cache-v2')
      const shouldR
        return null
      }
      
      return cache.metadata
        }
      console.error('Failed to load metadata cache:', error)
      return null
    }
   

  async addManualEntity(entityName: string): Promise<boolean> {
    try {
      const cache = await spark.kv.get<EntityCacheData>('entity-cache-v2')
      
      const existingEntities = cache?.entities || []
      if (existingEntities.some(e => e.entity === entityName)) {
        console.log(`Entity ${entityName} already exists`)
        return false
      }

        entityCount: cache.entities.len
        entity: entityName,
    } catch (error) {
        metaUrl: `/meta/${entityName}?meta=full`,
        isManual: true
       

  }
        entities: [
          ...existingEntities,
          newEntity
        ].sort((a, b) => a.entity.localeCompare(b.entity)),
        lastFullRefresh: cache?.lastFullRefresh || Date.now(),
        metadata: cache?.metadata || {},
        lastUpdated: Date.now()



      console.log(`✅ Added manual entity: ${entityName}`)
      return true
    } catch (error) {
      console.error(`Failed to add manual entity ${entityName}:`, error)
      return false

  }

  async startBackgroundRefresh() {
    try {






      
      if (shouldRefreshNow) {
        console.log('🔄 Cache is stale, refreshing immediately...')
        await this.refreshEntityList(true)
      }
    } catch (error) {
      console.error('Failed to check cache freshness:', error)
    }

    this.refreshTimer = setInterval(async () => {
      try {
        const cache = await spark.kv.get<EntityCacheData>('entity-cache-v2')
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

  }

  stopBackgroundRefresh() {

      clearInterval(this.refreshTimer)




  async getCacheStatus(): Promise<{

    nextRefresh: number | null
    entityCount: number

    apiCount: number
  }> {
    try {
      const cache = await spark.kv.get<EntityCacheData>('entity-cache-v2')
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


        lastRefresh: cache.lastFullRefresh,
        nextRefresh,
        entityCount: cache.entities.length,
        manualCount,
        apiCount
      }
    } catch (error) {
      console.error('Failed to get cache status:', error)
      return {

        nextRefresh: null,
        entityCount: 0,
        manualCount: 0,
        apiCount: 0


  }

  private async saveEntityCache(data: EntityCacheData) {
    await spark.kv.set('entity-cache-v2', data)
  }


export const entityCacheService = new EntityCacheService()
