import { useState, useEffect, useCallback } from 'react'
import { useKV } from '@github/spark/hooks'
import { EntitySidebar } from './EntitySidebar'
import { EntityDocViewer } from './EntityDocViewer'
import { entityMetadataService, type EntityMetadata } from '@/lib/entity-metadata'
import type { BullhornSession } from '@/lib/types'
import { toast } from 'sonner'

interface EntityDocumentationProps {
  session: BullhornSession | null
}

export function EntityDocumentation({ session }: EntityDocumentationProps) {
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null)
  const [metadata, setMetadata] = useState<EntityMetadata | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customEntities, setCustomEntities] = useKV<string[]>('custom-entities', [])
  const [metadataCache, setMetadataCache] = useKV<Record<string, EntityMetadata>>('entity-metadata-cache', {})

  useEffect(() => {
    const handleEntityUsage = (event: CustomEvent<{ entityName: string }>) => {
      const { entityName } = event.detail
      const entities = customEntities || []
      
      if (!entities.includes(entityName)) {
        setCustomEntities((current) => [...(current || []), entityName])
        
        if (session) {
          loadMetadata(entityName, false, true)
        }
      }
    }

    window.addEventListener('entity-usage', handleEntityUsage as EventListener)
    return () => {
      window.removeEventListener('entity-usage', handleEntityUsage as EventListener)
    }
  }, [session, customEntities, setCustomEntities])

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
      
      if (!forceRefresh && cache[cacheKey]) {
        if (!silent) {
          setMetadata(cache[cacheKey])
          setLoading(false)
        }
        return
      }

      const entityMetadata = await entityMetadataService.fetchMetadata(entityName, session)
      
      if (!silent) {
        setMetadata(entityMetadata)
      }
      
      setMetadataCache((current) => ({
        ...(current || {}),
        [cacheKey]: entityMetadata
      }))

      const entities = customEntities || []
      if (!entities.includes(entityName)) {
        setCustomEntities((current) => [...(current || []), entityName])
      }

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
  }, [session, metadataCache, setMetadataCache, customEntities, setCustomEntities])

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

  const metadataMap = new Map<string, EntityMetadata>()
  Object.entries(metadataCache || {}).forEach(([key, value]) => {
    const entityName = key.split('-')[0]
    metadataMap.set(entityName, value)
  })

  return (
    <div className="flex h-[calc(100vh-200px)] border border-border rounded-lg overflow-hidden bg-background">
      <div className="w-80 shrink-0">
        <EntitySidebar
          selectedEntity={selectedEntity}
          onSelectEntity={handleSelectEntity}
          customEntities={customEntities || []}
          entityMetadata={metadataMap}
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
