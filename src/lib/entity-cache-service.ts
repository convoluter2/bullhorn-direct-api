import { bullhornAPI } from './bullhorn-api'

  label?: string
  isManual?: boo
  label?: string
  metaUrl?: string
  isManual?: boolean
  lastUpdated: number
 

  entities: CachedEntity[]
}
const CACHE_DURATION 
c


    try {
      if (!cache) {
 

      }
      return cache.entities || []
      console.error('Failed to load ent


    try {

      console.error('Failed to save entity cache:'
    try {
      const cache = await spark.kv.get<EntityCacheData>('entity-cache-v2')
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
  a

  async saveEntityCache(cache: EntityCacheData): Promise<void> {
    try {
      await spark.kv.set('entity-cache-v2', cache)
      console.log('✅ Entity cache saved:', cache.entities.length, 'entities')
    } catch (error) {
      console.error('Failed to save entity cache:', error)
    }
  }

    if (!silent) {
    }
    try {
      if (!session) {
      }
      c
      const manua
      const metaEntit
        entity: e.entity,
        isManual:
     
   


        e
      }
        metadata,
        lastUpdated: Date.now()
      }
      await spark.kv.set(`metadata-cache-${entityName}`, cacheData)
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

        console.l
      }

      const existingCache = await spark.kv.get<EntityCacheData>('entity-cache-v2')
      
      const manualEntities = existingCache?.entities.filter(e => e.isManual) || []
      
      const metaEntities = await bullhornAPI.getEntities()
      const apiEntities: CachedEntity[] = metaEntities.map(e => ({
        entity: e.entity,
        label: e.entity,
      return true
        lastUpdated: Date.now()
      }))

      const allEntities = [
        ...apiEntities,
        ...manualEntities


      const cacheData: EntityCacheData = {
        entities: allEntities,
      if (shouldRefreshNow) {
      }

      await this.saveEntityCache(cacheData)

      if (!silent) {
        console.log('✅ Entity list refreshed:', allEntities.length, 'entities')
      }

      return allEntities
  async getCacheStatu
      console.error('Failed to refresh entity list:', error)
      throw error
    }
   

  async addManualEntity(entityName: string): Promise<boolean> {
    try {
      const cache = await spark.kv.get<EntityCacheData>('entity-cache-v2')

      if (cache?.entities.some(e => e.entity === entityName)) {
        console.log(`Entity ${entityName} already exists in cache`)
        return false


      lastRefresh: cache.lastFullRefres
        entity: entityName,
        isManual: true,
        lastUpdated: Date.now()
}


        entities: [...(cache?.entities || []), newEntity].sort((a, b) => a.entity.localeCompare(b.entity)),
        lastFullRefresh: cache?.lastFullRefresh || Date.now()



      console.log(`✅ Manual entity ${entityName} added to cache`)
      return true
    } catch (error) {
      console.error(`Failed to add manual entity ${entityName}:`, error)
      return false

  }

  startBackgroundRefresh(): void {
    if (this.refreshTimer) {
      return


    this.refreshTimer = setInterval(async () => {
      const cache = await this.getEntityList()
      const lastRefresh = cache.length > 0 ? cache[0].lastUpdated : 0
      const shouldRefreshNow = Date.now() - lastRefresh > REFRESH_INTERVAL

      if (shouldRefreshNow) {
        await this.refreshEntityList(true)
      }



  }

  stopBackgroundRefresh(): void {

      clearInterval(this.refreshTimer)




  async getCacheStatus(): Promise<{
    entityCount: number

    nextRefresh: number | null

    apiCount: number
  }> {
    const cache = await spark.kv.get<EntityCacheData>('entity-cache-v2')

    if (!cache) {

        entityCount: 0,

        nextRefresh: null,
        manualCount: 0,
        apiCount: 0

    }

    const manualCount = cache.entities.filter(e => e.isManual).length
    const apiCount = cache.entities.filter(e => !e.isManual).length

    return {
      entityCount: cache.entities.length,
      lastRefresh: cache.lastFullRefresh,
      nextRefresh: cache.lastFullRefresh + REFRESH_INTERVAL,

      apiCount,

  }


export const entityCacheService = new EntityCacheService()
