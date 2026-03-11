import { fieldValueCache } from './field-value-cache'

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
  invalidIds: (string | number)[]
  lookupData: any[]
}

export async function validateToOneField(
  field: any,
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
  field: any,
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
    return {
      isValid: false,
      error: 'Invalid JSON format',
      validIds: [],
      invalidIds: [],
      lookupData: []
    }
  }

  const numericIds = ids.map(id => typeof id === 'number' ? id : parseInt(String(id).trim(), 10))
  const validIds: number[] = []
  const invalidIds: (string | number)[] = []
  const lookupData: any[] = []

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i]
    const numericId = numericIds[i]
    
    if (isNaN(numericId)) {
      invalidIds.push(id)
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
        lookupData.push({
          id: numericId,
          title
        })
      } else {
        invalidIds.push(id)
      }
    } catch {
      invalidIds.push(id)
    }
  }

  return {
    isValid: invalidIds.length === 0,
    error: invalidIds.length > 0 
      ? `${invalidIds.length} invalid ID(s): ${invalidIds.join(', ')}`
      : undefined,
    validIds,
    invalidIds,
    lookupData
  }
}

export async function validateScalarField(
  field: any,
  value: string
): Promise<ValidationResult> {
  return {
    isValid: true,
    validatedValue: value
  }
}
