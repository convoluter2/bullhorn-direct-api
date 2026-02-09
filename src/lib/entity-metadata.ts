import type { BullhornSession } from './types'

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
  private cache: Map<string, EntityMetadata> = new Map()

  async fetchMetadata(entityName: string, session: BullhornSession): Promise<EntityMetadata> {
    const cacheKey = `${entityName}-${session.corporationId}`
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!
    }

    const params = new URLSearchParams({
      BhRestToken: session.BhRestToken,
      meta: 'full'
    })

    const url = `${session.restUrl}meta/${entityName}?${params.toString()}`
    
    console.log('📚 Fetching metadata for:', entityName, url)

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to fetch metadata for ${entityName}: ${response.statusText}`)
    }

    const data = await response.json()
    
    const fields: EntityFieldMetadata[] = data.fields?.map((field: any) => ({
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
    })) || []

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

    this.cache.set(cacheKey, metadata)
    return metadata
  }

  getCached(entityName: string): EntityMetadata | undefined {
    for (const [key, value] of this.cache.entries()) {
      if (key.startsWith(entityName + '-')) {
        return value
      }
    }
    return undefined
  }

  clearCache(): void {
    this.cache.clear()
  }
}

export const entityMetadataService = new EntityMetadataService()
