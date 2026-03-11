import { fieldValueCache } from './field-value-cache'
import type { EntityFieldMetadata } from './entity-metadata'

export interface ValidationResult {
  isValid: boolean
  error?: string
  validatedValue?: any
}

export interface ToManyValidationResult {
  isValid: boolean
  error?: string
  validIds: number[]
  invalidIds: number[]
  lookupData: Array<{ id: number; title?: string }>
}

export async function validateToOneField(
  field: EntityFieldMetadata,
  value: string | number
): Promise<ValidationResult> {
  if (!field.associatedEntity?.entity) {
    return {
      isValid: false,
      error: 'Field is not a TO_ONE association'
    }
  }

  const numericId = typeof value === 'number' ? value : parseInt(String(value).trim(), 10)
  if (isNaN(numericId)) {
    return {
      isValid: false,
      error: 'Invalid ID format. Must be a valid integer.'
    }
  }

  try {
    const result = await fieldValueCache.getFieldValueById(
      field.associatedEntity.entity,
      numericId,
      ['id', 'name', 'title', 'firstName', 'lastName']
    )

    if (!result) {
      return {
        isValid: false,
        error: `${field.associatedEntity.entity} with ID ${numericId} not found`
      }
    }

    const title = result.title || 
                 result.name || 
                 (result.firstName && result.lastName 
                   ? `${result.firstName} ${result.lastName}` 
                   : undefined)

    return {
      isValid: true,
      validatedValue: numericId,
      lookupData: {
        id: numericId,
        title
      }
    } as any
  } catch (error) {
    console.error('TO_ONE validation error:', error)
    return {
      isValid: false,
      error: `Failed to validate ${field.associatedEntity.entity} ID: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}

export async function validateToManyField(
  field: EntityFieldMetadata,
  value: string
): Promise<ToManyValidationResult> {
  if (!field.associatedEntity?.entity) {
    return {
      isValid: false,
      error: 'Field is not a TO_MANY association',
      validIds: [],
      invalidIds: [],
      lookupData: []
    }
  }

  let ids: (string | number)[] = []
  
  try {
    const parsed = JSON.parse(value)
    if (parsed.ids && Array.isArray(parsed.ids)) {
      ids = parsed.ids
    } else if (Array.isArray(parsed)) {
      ids = parsed
    } else {
      return {
        isValid: false,
        error: 'Invalid TO_MANY format. Expected JSON with ids array',
        validIds: [],
        invalidIds: [],
        lookupData: []
      }
    }
  } catch {
    ids = value.split(',').map(v => v.trim()).filter(v => v)
  }

  const numericIds = ids
    .map(id => {
      const str = String(id).trim()
      return /^\d+$/.test(str) ? parseInt(str, 10) : null
    })
    .filter((id): id is number => id !== null)

  if (numericIds.length === 0) {
    return {
      isValid: false,
      error: 'No valid integer IDs found. Provide comma-separated IDs like: 123, 456, 789',
      validIds: [],
      invalidIds: [],
      lookupData: []
    }
  }

  const validIds: number[] = []
  const invalidIds: number[] = []
  const lookupData: Array<{ id: number; title?: string }> = []

  for (const id of numericIds) {
    try {
      const result = await fieldValueCache.getFieldValueById(
        field.associatedEntity.entity,
        id,
        ['id', 'name', 'title', 'firstName', 'lastName']
      )

      if (result) {
        validIds.push(id)
        const title = result.title || 
                     result.name || 
                     (result.firstName && result.lastName 
                       ? `${result.firstName} ${result.lastName}` 
                       : undefined)
        lookupData.push({ id, title })
      } else {
        invalidIds.push(id)
      }
    } catch (error) {
      console.error(`Failed to validate ${field.associatedEntity.entity} ID ${id}:`, error)
      invalidIds.push(id)
    }
  }

  return {
    isValid: invalidIds.length === 0,
    error: invalidIds.length > 0 
      ? `${invalidIds.length} invalid ${field.associatedEntity.entity} ID(s): ${invalidIds.join(', ')}`
      : undefined,
    validIds,
    invalidIds,
    lookupData
  }
}

export async function validateFieldValue(
  field: EntityFieldMetadata,
  value: string | number
): Promise<ValidationResult> {
  if (!field) {
    return {
      isValid: false,
      error: 'Field metadata not found'
    }
  }

  if (field.type === 'TO_ONE') {
    return validateToOneField(field, value)
  }

  if (field.type === 'TO_MANY') {
    const toManyResult = await validateToManyField(field, String(value))
    return {
      isValid: toManyResult.isValid,
      error: toManyResult.error,
      validatedValue: toManyResult.validIds
    }
  }

  return {
    isValid: true,
    validatedValue: value
  }
}
