import { useState, useEffect, useCallback } from 'react'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { getCustomFieldLabel } from '@/lib/custom-field-labels'
import { entityCacheService } from '@/lib/entity-cache-service'

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

export function useEntityMetadata(entity: string | undefined) {
  const [metadata, setMetadata] = useState<EntityMetadata | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const refresh = useCallback(() => {
    if (entity) {
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

    const loadMetadata = async () => {
      setLoading(true)
      setError(null)

      try {
        const cached = await entityCacheService.loadMetadataCache(entity)
        if (cached && refreshTrigger === 0) {
          console.log('📦 Using cached metadata for:', entity)
          setMetadata(cached.metadata)
          setLoading(false)
          return
        }

        console.log('📚 Fetching fresh metadata for:', entity)
        const response = await bullhornAPI.getMetadata(entity)

        if (!response) {
          throw new Error('No metadata response received')
        }

        const fields: EntityField[] = []
        const fieldsMap: Record<string, EntityField> = {}

        if (response.fields && Array.isArray(response.fields)) {
          const fieldPromises = response.fields.map(async (field) => {
            if (!field || !field.name) {
              return null
            }
            
            const defaultLabel = field.label || field.name
            const customLabel = getCustomFieldLabel(entity, field.name, defaultLabel)
            
            const fieldInfo: EntityField = {
              name: field.name,
              label: customLabel,
              type: field.type || 'String',
              dataType: field.dataType || 'String',
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
              
              if (field.dataType === 'TO_MANY' || field.type === 'TO_MANY') {
                fieldInfo.associationType = 'TO_MANY'
              } else if (field.dataType === 'TO_ONE' || field.type === 'TO_ONE') {
                fieldInfo.associationType = 'TO_ONE'
              }
            } else {
              if (field.type === 'TO_MANY' || field.dataType === 'TO_MANY') {
                fieldInfo.associationType = 'TO_MANY'
              } else if (field.type === 'TO_ONE' || field.dataType === 'TO_ONE') {
                fieldInfo.associationType = 'TO_ONE'
              }
            }

            if (field.options && Array.isArray(field.options)) {
              fieldInfo.options = field.options.map((opt: any) => ({
                value: opt.value,
                label: opt.label || String(opt.value)
              }))
            } else if (field.optionsUrl && (field.optionsType === 'SpecializedOptionsLookup' || field.optionsType === 'OptionsLookup')) {
              try {
                console.log(`📋 Fetching options for ${entity}.${field.name} from API...`)
                const fetchedOptions = await bullhornAPI.getFieldOptions(entity, field.name)
                if (fetchedOptions && fetchedOptions.length > 0) {
                  fieldInfo.options = fetchedOptions.map((opt: any) => ({
                    value: opt.value,
                    label: opt.label || String(opt.value)
                  }))
                  console.log(`✅ Loaded ${fieldInfo.options.length} options for ${entity}.${field.name}`)
                }
              } catch (error) {
                console.warn(`⚠️ Failed to load options for ${entity}.${field.name}:`, error)
              }
            }

            return fieldInfo
          })

          const resolvedFields = await Promise.all(fieldPromises)
          
          for (const fieldInfo of resolvedFields) {
            if (fieldInfo) {
              fields.push(fieldInfo)
              fieldsMap[fieldInfo.name] = fieldInfo
            }
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
        
        await entityCacheService.saveMetadataCache(entity, newMetadata)
        
        console.log('✅ Metadata loaded and cached for:', entity, '- Fields:', fields.length)
        
        if (entity === 'Candidate') {
          console.log('🎯 CANDIDATE METADATA LOADED 🎯')
          const primarySkillsField = fieldsMap['primarySkills']
          if (primarySkillsField) {
            console.log('primarySkills field found:', primarySkillsField)
            console.log('  - Type:', primarySkillsField.type)
            console.log('  - DataType:', primarySkillsField.dataType)
            console.log('  - AssociationType:', primarySkillsField.associationType || 'None')
            console.log('  - AssociatedEntity:', primarySkillsField.associatedEntity?.entity || 'None')
          } else {
            console.log('⚠️ primarySkills field NOT FOUND in Candidate metadata')
          }
          
          console.log('All TO_MANY fields in Candidate:')
          Object.entries(fieldsMap)
            .filter(([_, field]) => field.associationType === 'TO_MANY')
            .forEach(([name, field]) => {
              console.log(`  - ${name} → ${field.associatedEntity?.entity || 'Unknown'}`)
            })
          console.log('=========================================')
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load metadata'
        console.error('❌ Metadata loading failed for', entity, ':', err)
        setError(errorMessage)
        setMetadata(null)
      } finally {
        setLoading(false)
      }
    }

    loadMetadata().catch(err => {
      console.error('❌ Unexpected error in loadMetadata:', err)
      setLoading(false)
      setError(err instanceof Error ? err.message : 'Unexpected error')
    })
  }, [entity, refreshTrigger])

  return { metadata, loading, error, refresh }
}
