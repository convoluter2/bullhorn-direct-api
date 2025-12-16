import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { bullhornAPI } from '@/lib/bullhorn-api'

export interface EntityField {
  name: string
  label: string
  type: string
  dataType: string
  dataSpecialization?: string
  confidential?: boolean
  optional?: boolean
  optionsType?: string
  optionsUrl?: string
  options?: Array<{ value: any; label: string }>
  associatedEntity?: {
    entity: string
    entityMetaUrl: string
  }
}

export interface EntityMetadata {
  entity: string
  label: string
  fields: EntityField[]
  fieldsMap: Record<string, EntityField>
  lastUpdated: number
}

const CACHE_DURATION = 1000 * 60 * 60

export function useEntityMetadata(entity: string | undefined) {
  const [metadata, setMetadata] = useState<EntityMetadata | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [metadataCache, setMetadataCache] = useKV<Record<string, EntityMetadata>>('entity-metadata-cache', {})

  useEffect(() => {
    if (!entity) {
      setMetadata(null)
      setError(null)
      return
    }

    const loadMetadata = async () => {
      setLoading(true)
      setError(null)

      try {
        const currentCache = metadataCache || {}
        const cached = currentCache[entity]
        if (cached && Date.now() - cached.lastUpdated < CACHE_DURATION) {
          setMetadata(cached)
          setLoading(false)
          return
        }

        const response = await bullhornAPI.getMetadata(entity)
        
        const fields: EntityField[] = []
        const fieldsMap: Record<string, EntityField> = {}

        if (response.fields) {
          for (const field of response.fields) {
            const fieldInfo: EntityField = {
              name: field.name,
              label: field.label || field.name,
              type: field.type,
              dataType: field.dataType,
              dataSpecialization: field.dataSpecialization,
              confidential: field.confidential,
              optional: field.optional,
              optionsType: field.optionsType,
              optionsUrl: field.optionsUrl
            }

            if (field.associatedEntity) {
              fieldInfo.associatedEntity = {
                entity: field.associatedEntity.entity,
                entityMetaUrl: field.associatedEntity.entityMetaUrl
              }
            }

            if (field.options && Array.isArray(field.options)) {
              fieldInfo.options = field.options.map((opt: any) => ({
                value: opt.value,
                label: opt.label || String(opt.value)
              }))
            }

            fields.push(fieldInfo)
            fieldsMap[field.name] = fieldInfo
          }
        }

        const newMetadata: EntityMetadata = {
          entity,
          label: response.label || entity,
          fields,
          fieldsMap,
          lastUpdated: Date.now()
        }

        setMetadata(newMetadata)
        
        setMetadataCache((current) => ({
          ...(current || {}),
          [entity]: newMetadata
        }))
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load metadata'
        setError(errorMessage)
        setMetadata(null)
      } finally {
        setLoading(false)
      }
    }

    loadMetadata()
  }, [entity])

  return { metadata, loading, error }
}
