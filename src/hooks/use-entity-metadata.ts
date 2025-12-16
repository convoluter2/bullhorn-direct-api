import { useState, useEffect, useRef } from
import { bullhornAPI } from '@/lib/bullhorn
import { bullhornAPI } from '@/lib/bullhorn-api'

  dataType: string
  confidential
  optionsType?:
  options?: Ar
  dataType: string
  }

  entity: string
  fields: EntityField[
  lastUpdated: number


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
          loadingRef.current = false
        }
        const response = await bullhornAPI.getMetadata(en
        console.log('Metadata response for', entity, ':', response)


        
        
          const fiel
            
     

            optionsType: field.options
          }
          if (field.

           

            fieldInfo.options = field.options.map((opt: any) => ({
              label: opt.labe
          }
          fields
        }

        const newMetadata: EntityMetadata = {
        
          fieldsMap,
        }

        setMetadataCache((curr
          [entity]: newMetadata
      } catch (err) {
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
          ...current,
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
