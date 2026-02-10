import { bullhornAPI } from './bullhorn-api'

export type CachedEntity = {
  entity: string
  label?: string
  metaUrl?: string
  isManual?: boolean
  lastUpdated: number
e

}
export type CachedMetadata
  metadata: any
}
c

  private refreshTimer: NodeJS

    try {
      return cached |
 


    try {

      console.error('Faile
  }
  async loadMetadataCache(enti

        return cached
      ret
      console.error(`Failed to load metadata cache for ${entityName}:`, err
      return cached || null
    } catch (error) {
      console.error('Failed to load entity cache:', error)
      return null
    }
  }

  async saveEntityCache(cache: EntityCacheData): Promise<void> {
    try {
      await spark.kv.set('entity-cache-v2', cache)
      console.log('✅ Entity cache saved:', cache.entities.length, 'entities')
    } catch (error) {
      console.error('Failed to save entity cache:', error)
    }
  }

  async loadMetadataCache(entityName: string): Promise<CachedMetadata | null> {
    try {
      const cached = await spark.kv.get<CachedMetadata>(`metadata-cache-${entityName}`)
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
      if (!session) {
        return []

      
      const manualEntities = existingCache?.entities.filter(e => e.
      const apiEntities: CachedEntity[] = metaEntities.map(e 
        label: e.enti
        isManual: false,
     
   

      ].sort((a, b) => a.entity.localeCompare(b.entity))
      const cacheData: Entit
        lastFullRefresh: Date.now(),
      }
     


    } catch (error) {

      thi
  }
  async addManualEntity(entityName: string): Promise<bool
      c

        console.log(`Entity ${entityName} alre
      }
      const newEntity: CachedEntity = {
        isManual:
      }

      const updatedCache: EntityCacheData = {
      
      }
      await this.saveEntityCache(updatedCache)

      console.error(`Failed to add manual entity ${entityName}:`, 
    }

    if (this.refreshTimer) 
    }
    const cache = await this.lo
    const

    if (shouldRefreshNow) {
      await this.refreshEntity

      console.log('⏰ Scheduled entity refresh triggered')
    }, REFRESH_INTERVAL)


    if (this.refreshTimer) {
      this.refreshTimer = null
    }


  }

    lastRefresh: number | null
    manualCount: number

    
      return {
        lastRefresh: null,
        manualC
      }

    c
   

      manualCount,
    }
}
export const entityCacheService = new Entity



































































































