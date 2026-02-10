import { bullhornAPI } from './bullhorn-api'

export interface CachedEntity {
  entity: string
}
export interface E
  lastFullRefresh: n

 

const CACHE_DURATION = 24 * 60 * 6

  private refreshTimer: N
 

        return []
  metadata: any
  lastUpdated: number
}

const CACHE_DURATION = 24 * 60 * 60 * 1000
const REFRESH_INTERVAL = 60 * 60 * 1000

class EntityCacheService {
  private refreshTimer: NodeJS.Timeout | null = null

  async getEntityList(): Promise<CachedEntity[]> {
      con
      const cache = await spark.kv.get<EntityCacheData>('entity-cache-v2')
      if (!cache) {
        return []
      }
      
        entity: e.entity,
        metaUrl: e.metaUrl,
       

      const manualEntities = cach
    } catch (error) {
        ...manualEntities

    }
  }

      if (!silent) {
    try {
      return allEntities
      console.error('
    }
    }
  a

      }
      if 
        return null
      if (!session) {
        console.log('⚠️ No active session, cannot refresh entity list')
        return []
      c

      const cacheDat
        lastUpdated: Date.now()
      a

  }
  async loadMetadataCache(entityName: string): Promise<any | null> {
  }
  async addManualEntity
        metaUrl: e.metaUrl,
        return false

        c

      const newEntity: CachedEntity = {
        label: entityName,


        entities: [...c
      }
      ].sort((a, b) => a.entity.localeCompare(b.entity))

      console.error(`Failed to add manual ent
    }
        lastFullRefresh: Date.now()
    if 

    this.refreshTimer = setInterval(async () =

      }
      const shouldRefreshNow = Date.now() - cache.lastFullRefresh > REFRESH_INT
       

  }
    } catch (error) {
      clearInterval(this.refreshTimer)
    }

  }

    apiCount: number
    try {
      if (!cache) {
          entityCou
          nextRefre
      }
      
      const manualCount = cache.entities.filter(e => e.isMan

        entityCount
       
      
    } catch (error) {
      return {
        lastRefresh: null,
        manualCou
     
  }

























      const newEntity: CachedEntity = {

        label: entityName,


      }

      const updatedCache: EntityCacheData = {


      }

      await this.saveEntityCache(updatedCache)





    }





    }


      const cache = await spark.kv.get<EntityCacheData>('entity-cache-v2')
      if (!cache) {
        return
      }
      
      const shouldRefreshNow = Date.now() - cache.lastFullRefresh > REFRESH_INTERVAL




    }, REFRESH_INTERVAL)



    if (this.refreshTimer) {

      this.refreshTimer = null
    }
  }



    lastRefresh: number | null

    manualCount: number

















      return {










        lastRefresh: null,



      }
    }

}


