import type { BullhornSession } from './types'
import { bullhornAPI } from './bullhorn-api'
import { entityCacheService } from './entity-cache-service'
import { kvRequestManager } from './kv-request-manager'

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
  composite?: boolean
  compositeFields?: Array<{
    name: string
    label: string
    type: string
    dataType: string
    optionsType?: string
    optionsUrl?: string
  }>
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
        console.log('📦 Using persistent cached metadata for:', entityName, {
          hasMetadata: !!cached.metadata,
          hasFields: !!cached.metadata?.fields,
          fieldCount: cached.metadata?.fields?.length || 0,
          cachedAt: cached.cachedAt,
          firstFewFields: cached.metadata?.fields?.slice(0, 3).map((f: any) => f.name) || []
        })
        
        if (cached.metadata && cached.metadata.fields && cached.metadata.fields.length > 0) {
          return cached.metadata as EntityMetadata
        } else {
          console.warn('⚠️ Cached metadata exists but has no fields, fetching fresh data')
        }
      }
    } else {
      console.log('🔄 Force refresh requested for:', entityName, '- clearing cache')
      await entityCacheService.clearMetadataCache(entityName)
    }

    console.log(`📚 Fetching fresh metadata for: ${entityName}${forceRefresh ? ' (forced)' : ''}`)
    
    let data
    try {
      data = await bullhornAPI.getMetadata(entityName)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`❌ Failed to fetch metadata for ${entityName}:`, errorMessage)
      
      if (errorMessage.includes('Authentication failed') || errorMessage.includes('401') || errorMessage.includes('403')) {
        throw new Error(`Authentication error while fetching ${entityName}. Your session may have expired. Please reconnect.`)
      }
      
      throw error
    }
    
    console.log('📊 Metadata response for', entityName, ':', {
      entity: data.entity,
      label: data.label,
      fieldCount: data.fields?.length || 0,
      hasFields: !!data.fields,
      firstFewFields: data.fields?.slice(0, 5).map((f: any) => f.name) || [],
      allFieldNames: data.fields?.map((f: any) => f.name) || []
    })
    
    if (!data.fields || data.fields.length === 0) {
      console.error(`❌ No fields returned for ${entityName}. Full response:`, data)
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
      hideFromSearch: field.hideFromSearch,
      composite: field.type === 'COMPOSITE' || field.dataType === 'Address',
      compositeFields: (field.type === 'COMPOSITE' || field.dataType === 'Address') && field.fields 
        ? field.fields.map((subField: any) => ({
            name: subField.name,
            label: subField.label || subField.name,
            type: subField.type,
            dataType: subField.dataType,
            optionsType: subField.optionsType,
            optionsUrl: subField.optionsUrl
          }))
        : undefined
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
      label: metadata.label,
      fieldNames: metadata.fields.map(f => f.name)
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
      const allKeys = await kvRequestManager.enqueueKVKeys(() => window.spark.kv.keys())
      const keysToDelete = allKeys.filter(key => key === `metadata-cache-${entityName}`)
      for (const key of keysToDelete) {
        await window.spark.kv.delete(key)
      }
      kvRequestManager.invalidateMemoryCache(`metadata-cache-${entityName}`)
      console.log(`🧹 Cleared cache for entity: ${entityName}`)
    } else {
      const allKeys = await kvRequestManager.enqueueKVKeys(() => window.spark.kv.keys())
      const metadataKeys = allKeys.filter(key => key.startsWith('metadata-cache-'))
      for (const key of metadataKeys) {
        await window.spark.kv.delete(key)
      }
      kvRequestManager.invalidateMemoryCache('metadata-cache-')
      console.log('🧹 Cleared all metadata cache')
    }
  }
}

export const entityMetadataService = new EntityMetadataService()
