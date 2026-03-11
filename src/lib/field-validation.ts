import { fieldValueCache } from './field-value-cache'
import type { EntityFieldMetadata } from './entity-metadata'

export interface ValidationResult {
  isValid: boolean
  error?: string
  validatedValue?: any
  lookupData?: any
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
    }
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
    const commaSeparated = value.split(',').map(s => s.trim()).filter(Boolean)
    if (commaSeparated.length > 0 && commaSeparated.every(str => /^\d+$/.test(str))) {
      ids = commaSeparated
    } else {
      return {
        isValid: false,
        error: 'Invalid format. Expected comma-separated IDs or JSON array',
        validIds: [],
        invalidIds: [],
        lookupData: []
      }
    }
  }

  const validIds: number[] = []
  const invalidIds: number[] = []
  const lookupData: Array<{ id: number; title?: string }> = []

  for (const id of ids) {
    const numericId = typeof id === 'number' ? id : parseInt(String(id), 10)
    
    if (isNaN(numericId)) {
      invalidIds.push(id as any)
      continue
    }

    try {
      const result = await fieldValueCache.getFieldValueById(
        field.associatedEntity.entity,
        numericId,
        ['id', 'name', 'title', 'firstName', 'lastName']
      )

      if (result) {
        validIds.push(numericId)
        const title = result.title || 
                     result.name || 
                     (result.firstName && result.lastName 
                       ? `${result.firstName} ${result.lastName}` 
                       : undefined)
        lookupData.push({ id: numericId, title })
      } else {
        invalidIds.push(numericId)
      }
    } catch (error) {
      console.error(`Error validating ID ${numericId}:`, error)
      invalidIds.push(numericId)
    }
  }

  return {
    isValid: invalidIds.length === 0 && validIds.length > 0,
    error: invalidIds.length > 0 
      ? `Invalid IDs: ${invalidIds.join(', ')}` 
      : validIds.length === 0 
        ? 'No valid IDs provided' 
        : undefined,
    validIds,
    invalidIds,
    lookupData
  }
}

export async function validateScalarField(
  field: EntityFieldMetadata,
  value: string
): Promise<ValidationResult> {
  if (field.required && (!value || value.trim() === '')) {
    return {
      isValid: false,
      error: 'This field is required'
    }
  }

  if (field.maxLength && value.length > field.maxLength) {
    return {
      isValid: false,
      error: `Value exceeds maximum length of ${field.maxLength} characters`
    }
  }

  if (field.dataType === 'Integer' || field.dataType === 'Double') {
    const numValue = parseFloat(value)
    if (isNaN(numValue)) {
      return {
        isValid: false,
        error: `Invalid ${field.dataType.toLowerCase()} value`
      }
    }
  }

  return {
    isValid: true,
    validatedValue: value
  }
}
