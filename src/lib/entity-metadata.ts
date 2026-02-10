import type { BullhornSession } from './types'
import { bullhornAPI } from './bullhorn-api'
import { entityCacheService } from './entity-cache-service'

export interface EntityFieldMetadata {
  name: string
  label: string
  type: string
  dataType: string
  dataSpecialization?: string
  maxLength?: number
  required?: boolean
  readonly?: boolean
  multiValue?: boolean
  optionsType?: string
  optionsUrl?: string
  associatedEntity?: {
    entity: string
    label: string
  }
  description?: string
  confidential?: 'Candidate' | 'Client' | 'Both' | null
  sortOrder?: number
  hideFromSearch?: boolean
}

export interface EntityMetadata {
  entity: string
  label: string
  fields: EntityFieldMetadata[]
  dateLastModified?: number
  trackTitleChanges?: boolean
  associations?: Record<string, {
    associatedEntity: string
    label: string
  }>
}

export class EntityMetadataService {
  async fetchMetadata(entityName: string, session: BullhornSession, forceRefresh = false): Promise<EntityMetadata> {
    if (!forceRefresh) {
      const cached = await entityCacheService.loadMetadataCache(entityName)
      if (cached) {
        console.log('📦 Using persistent cached metadata for:', entityName)
        return cached.metadata as EntityMetadata
      }
    }

    console.log('📚 Fetching fresh metadata for:', entityName)
    
    const data = await bullhornAPI.getMetadata(entityName)
    
    console.log('📊 Metadata response for', entityName, ':', {
      entity: data.entity,
      label: data.label,
      fieldCount: data.fields?.length || 0,
      hasFields: !!data.fields,
      firstFewFields: data.fields?.slice(0, 5).map((f: any) => f.name) || []
    })
    
    if (!data.fields || data.fields.length === 0) {
      console.warn(`⚠️ No fields returned for ${entityName}`)
      throw new Error(`No fields found for entity ${entityName}. This entity may not be accessible or may not exist.`)
    }
    
    const fields: EntityFieldMetadata[] = data.fields.map((field: any) => ({
      name: field.name,
      label: field.label || field.name,
      type: field.type,
      dataType: field.dataType,
      dataSpecialization: field.dataSpecialization,
      maxLength: field.maxLength,
      required: field.required,
      readonly: field.readonly,
      multiValue: field.multiValue,
      optionsType: field.optionsType,
      optionsUrl: field.optionsUrl,
      associatedEntity: field.associatedEntity ? {
        entity: field.associatedEntity.entity,
        label: field.associatedEntity.label
      } : undefined,
      description: field.description,
      confidential: field.confidential,
      sortOrder: field.sortOrder,
      hideFromSearch: field.hideFromSearch
    }))

    const metadata: EntityMetadata = {
      entity: entityName,
      label: data.label || entityName,
      fields: fields.sort((a, b) => {
        if (a.name === 'id') return -1
        if (b.name === 'id') return 1
        return a.name.localeCompare(b.name)
      }),
      dateLastModified: data.dateLastModified,
      trackTitleChanges: data.trackTitleChanges,
      associations: data.associations
    }

    console.log('✅ Processed metadata for', entityName, ':', {
      totalFields: metadata.fields.length,
      label: metadata.label
    })

    await entityCacheService.saveMetadataCache(entityName, metadata)
    
    return metadata
  }

  async getCached(entityName: string): Promise<EntityMetadata | undefined> {
    const cached = await entityCacheService.loadMetadataCache(entityName)
    return cached?.metadata as EntityMetadata | undefined
  }

  async clearCache(entityName?: string): Promise<void> {
    if (entityName) {
      const allKeys = await window.spark.kv.keys()
      const keysToDelete = allKeys.filter(key => key === `metadata-cache-${entityName}`)
      for (const key of keysToDelete) {
        await window.spark.kv.delete(key)
      }
      console.log(`🧹 Cleared cache for entity: ${entityName}`)
    } else {
      const allKeys = await window.spark.kv.keys()
      const metadataKeys = allKeys.filter(key => key.startsWith('metadata-cache-'))
      for (const key of metadataKeys) {
        await window.spark.kv.delete(key)
      }
      console.log('🧹 Cleared all metadata cache')
    }
  }
}

export const entityMetadataService = new EntityMetadataService()
