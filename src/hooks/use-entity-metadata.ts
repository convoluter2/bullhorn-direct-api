import { useState, useEffect, useCallback } from 'react'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { getCustomFieldLabel } from '@/lib/custom-field-labels'

export type EntityField = {
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
  associationType?: 'TO_ONE' | 'TO_MANY'
}

export type EntityMetadata = {
  entity: string
  label: string
  fields: EntityField[]
  fieldsMap: Record<string, EntityField>
  lastUpdated: number
}

const CACHE_DURATION = 1000 * 60 * 60

const metadataCache: Record<string, EntityMetadata> = {}

export function clearMetadataCache(entity?: string) {
  if (entity) {
    delete metadataCache[entity]
  } else {
    Object.keys(metadataCache).forEach(key => delete metadataCache[key])
  }
}

export function useEntityMetadata(entity: string | undefined) {
  const [metadata, setMetadata] = useState<EntityMetadata | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const refresh = useCallback(() => {
    if (entity) {
      clearMetadataCache(entity)
      setRefreshTrigger(prev => prev + 1)
    }
  }, [entity])

  useEffect(() => {
    if (!entity) {
      setMetadata(null)
      setLoading(false)
      setError(null)
      return
    }

    const cached = metadataCache[entity]
    if (cached && Date.now() - cached.lastUpdated < CACHE_DURATION && refreshTrigger === 0) {
      setMetadata(cached)
      setLoading(false)
      setError(null)
      return
    }

    const loadMetadata = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await bullhornAPI.getMetadata(entity)

        const fields: EntityField[] = []
        const fieldsMap: Record<string, EntityField> = {}

        if (response.fields && Array.isArray(response.fields)) {
          for (const field of response.fields) {
            const defaultLabel = field.label || field.name
            const customLabel = getCustomFieldLabel(entity, field.name, defaultLabel)
            
            const fieldInfo: EntityField = {
              name: field.name,
              label: customLabel,
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

            if (field.type === 'TO_MANY') {
              fieldInfo.associationType = 'TO_MANY'
            } else if (field.type === 'TO_ONE') {
              fieldInfo.associationType = 'TO_ONE'
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
        metadataCache[entity] = newMetadata
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load metadata'
        setError(errorMessage)
        setMetadata(null)
      } finally {
        setLoading(false)
      }
    }

    loadMetadata()
  }, [entity, refreshTrigger])

  return { metadata, loading, error, refresh }
}
