import { fieldValueCache } from './field-value-cache'


export interface ValidationResult {
  isValid: boolean
  error?: string

  lookupData?: any
 

export interface ToManyValidationResult {
  isValid: boolean
export async fun
    }

  if (isNaN(numericId)) {
 


    const result = await fiel
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
      lookupData
      ['id', 'name', 'title', 'firstName', 'lastName']
     

    console.error(
      return {
        isValid: false,
        error: `${field.associatedEntity.entity} with ID ${numericId} not found`
}
     

    const title = result.title || 
                 result.name || 
                 (result.firstName && result.lastName 
                   ? `${result.firstName} ${result.lastName}` 
                   : undefined)

        inva
      isValid: true,
      validatedValue: numericId,
      lookupData: {
        id: numericId,
        title
    
     
    }
    console.error('TO_ONE validation error:', error)
    return {
      isValid: false,
      error: `Failed to validate ${field.associatedEntity.entity} ID: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}

export async function validateToManyField(
    } catch (error) {
  value: string
  }
  if (!field.associatedEntity?.entity) {
    error: i
      isValid: false,
        : undefined,
      validIds: [],
      invalidIds: [],
      lookupData: []
    }
  }

  let ids: (string | number)[] = []
  
  try {
    const parsed = JSON.parse(value)
    if (parsed.ids && Array.isArray(parsed.ids)) {

    } else if (Array.isArray(parsed)) {
      ids = parsed
    } else {
      return {
        isValid: false,
        error: 'Invalid TO_MANY format. Expected JSON with ids array',
        validIds: [],























































  return {









































    isValid: true,
    validatedValue: value
  }
}
