import { useState, useEffect, useCallback } from 'react'
import { useKV } from '@github/spark/hooks'
import { EntitySidebar } from './EntitySidebar'
import { EntityDocViewer } from './EntityDocViewer'
import { entityMetadataService, type EntityMetadata } from '@/lib/entity-metadata'
import type { BullhornSession } from '@/lib/types'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Database, WarningCircle, ArrowsClockwise } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface EntityDocumentationProps {
  session: BullhornSession | null
}

interface CachedMetadata {
  metadata: EntityMetadata
  cachedAt: number
  corporationId: string
}

export function EntityDocumentation({ session }: EntityDocumentationProps) {
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null)
  const [metadata, setMetadata] = useState<EntityMetadata | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableEntities, setAvailableEntities] = useState<string[]>([])
  const [loadingEntities, setLoadingEntities] = useState(false)
  const [metadataCache, setMetadataCache] = useKV<Record<string, CachedMetadata>>('entity-metadata-cache-v2', {})
  const [refreshingAll, setRefreshingAll] = useState(false)

  useEffect(() => {
    const loadAvailableEntities = async () => {
      if (!session) {
        setAvailableEntities([])
        return
      }

      setLoadingEntities(true)
      try {
        console.log('🔍 Loading all entities from /meta endpoint...')
        const entities = await bullhornAPI.getAllEntitiesMeta()
        
        console.log('📊 Raw entities response type:', typeof entities, 'isArray:', Array.isArray(entities))
        console.log('📊 Raw entities response length:', Array.isArray(entities) ? entities.length : 'N/A')
        console.log('📊 First 5 entities:', Array.isArray(entities) ? entities.slice(0, 5) : entities)
        
        if (!Array.isArray(entities)) {
          console.error('❌ getAllEntitiesMeta did not return an array, got:', typeof entities, entities)
          throw new Error('getAllEntitiesMeta did not return an array')
        }
        
        const entityNames = entities
          .filter(e => {
            const isValid = e && typeof e === 'object' && typeof e.entity === 'string'
            if (!isValid) {
              console.warn('⚠️ Invalid entity item:', e)
            }
            return isValid
          })
          .map(e => e.entity)
          .filter(name => {
            const isValid = name && name.length > 0
            if (!isValid) {
              console.warn('⚠️ Invalid entity name:', name)
            }
            return isValid
          })
        
        console.log(`✅ Extracted ${entityNames.length} entity names`)
        console.log(`📋 First 20 entity names:`, entityNames.slice(0, 20))
        console.log(`📋 Entity names data type check:`, entityNames.map(n => typeof n).slice(0, 5))
        
        if (entityNames.length === 0) {
          throw new Error('No valid entity names found in response')
        }
        
        const sortedEntityNames = [...entityNames].sort((a, b) => a.localeCompare(b))
        console.log(`📋 Setting ${sortedEntityNames.length} sorted entity names`)
        
        setAvailableEntities(sortedEntityNames)
        toast.success(`Loaded ${sortedEntityNames.length} entities from your tenant`)
      } catch (error) {
        console.error('❌ Failed to load entities:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        toast.error(`Failed to load entities: ${errorMessage}`)
        setAvailableEntities([])
      } finally {
        setLoadingEntities(false)
      }
    }

    loadAvailableEntities()
  }, [session])

  const loadMetadata = useCallback(async (entityName: string, forceRefresh = false, silent = false) => {
    if (!session) {
      if (!silent) {
        setError('Not connected to Bullhorn. Please authenticate first.')
      }
      return
    }

    if (!silent) {
      setLoading(true)
      setError(null)
    }

    try {
      const cacheKey = `${entityName}-${session.corporationId}`
      const cache = metadataCache || {}
      
      const cachedData = cache[cacheKey]
      if (!forceRefresh && cachedData && cachedData.corporationId === String(session.corporationId)) {
        if (!silent) {
          setMetadata(cachedData.metadata)
          setLoading(false)
        }
        return
      }

      const entityMetadata = await entityMetadataService.fetchMetadata(entityName, session, forceRefresh)
      
      if (!silent) {
        setMetadata(entityMetadata)
      }
      
      const cachedMetadata: CachedMetadata = {
        metadata: entityMetadata,
        cachedAt: Date.now(),
        corporationId: String(session.corporationId)
      }
      
      setMetadataCache((current) => ({
        ...(current || {}),
        [cacheKey]: cachedMetadata
      }))

      if (!silent) {
        toast.success(`Loaded metadata for ${entityMetadata.label}`)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load entity metadata'
      if (!silent) {
        setError(errorMessage)
        toast.error(errorMessage)
      }
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }, [session, metadataCache, setMetadataCache])

  useEffect(() => {
    if (selectedEntity) {
      loadMetadata(selectedEntity)
    }
  }, [selectedEntity])

  const handleSelectEntity = (entityId: string) => {
    setSelectedEntity(entityId)
  }

  const handleRefresh = () => {
    if (selectedEntity) {
      loadMetadata(selectedEntity, true)
    }
  }

  const handleRefreshAll = async () => {
    if (!session) {
      toast.error('Not connected to Bullhorn')
      return
    }

    setRefreshingAll(true)
    try {
      const entitiesToRefresh = availableEntities.slice(0, 50)
      toast.info(`Refreshing metadata for ${entitiesToRefresh.length} entities...`)
      
      let successCount = 0
      let failCount = 0
      
      for (const entityName of entitiesToRefresh) {
        try {
          const entityMetadata = await entityMetadataService.fetchMetadata(entityName, session, true)
          const cacheKey = `${entityName}-${session.corporationId}`
          const cachedMetadata: CachedMetadata = {
            metadata: entityMetadata,
            cachedAt: Date.now(),
            corporationId: String(session.corporationId)
          }
          
          setMetadataCache((current) => ({
            ...(current || {}),
            [cacheKey]: cachedMetadata
          }))
          
          successCount++
          
          if (successCount % 10 === 0) {
            toast.info(`Refreshed ${successCount}/${entitiesToRefresh.length} entities...`, { id: 'refresh-progress' })
          }
        } catch (err) {
          console.error(`Failed to refresh ${entityName}:`, err)
          failCount++
        }
      }
      
      toast.success(`Refreshed ${successCount} entities${failCount > 0 ? `, ${failCount} failed` : ''}`, { id: 'refresh-progress' })
    } catch (error) {
      toast.error('Failed to refresh metadata')
    } finally {
      setRefreshingAll(false)
    }
  }

  const handleClearCache = () => {
    if (confirm('Are you sure you want to clear all cached metadata? You will need to reload metadata for each entity you view.')) {
      setMetadataCache(() => ({}))
      toast.success('Metadata cache cleared')
    }
  }

  const metadataMap = new Map<string, EntityMetadata>()
  Object.entries(metadataCache || {}).forEach(([key, cachedData]) => {
    const entityName = key.split('-')[0]
    metadataMap.set(entityName, cachedData.metadata)
  })

  const cachedEntityCount = Object.keys(metadataCache || {}).length

  if (!session) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center space-y-4 max-w-md">
          <Database size={64} className="mx-auto text-muted-foreground opacity-50" />
          <div>
            <h3 className="text-lg font-semibold">Not Connected</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Please connect to Bullhorn to view entity documentation
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (loadingEntities) {
    return (
      <div className="flex h-[calc(100vh-200px)] border border-border rounded-lg overflow-hidden bg-background">
        <div className="w-80 shrink-0 border-r border-border bg-card p-4 space-y-4">
          <Skeleton className="h-10 w-full" />
          <div className="space-y-2">
            {[...Array(15)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Database size={64} className="mx-auto text-accent animate-pulse" weight="duotone" />
            <div>
              <h3 className="text-lg font-semibold">Loading Entities</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Fetching all available entities from your tenant...
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  console.log('📊 EntityDocumentation render - availableEntities:', {
    type: typeof availableEntities,
    isArray: Array.isArray(availableEntities),
    length: availableEntities?.length,
    first10: availableEntities?.slice(0, 10)
  })

  return (
    <div className="flex h-[calc(100vh-200px)] border border-border rounded-lg overflow-hidden bg-background">
      <div className="w-80 shrink-0">
        <EntitySidebar
          selectedEntity={selectedEntity}
          onSelectEntity={handleSelectEntity}
          customEntities={availableEntities}
          entityMetadata={metadataMap}
          onRefreshAll={handleRefreshAll}
          refreshingAll={refreshingAll}
          onClearCache={handleClearCache}
          cachedCount={cachedEntityCount}
        />
      </div>
      <div className="flex-1">
        <EntityDocViewer
          entityName={selectedEntity || ''}
          metadata={metadata}
          loading={loading}
          error={error}
          session={session}
          onRefresh={handleRefresh}
        />
      </div>
    </div>
  )
}
