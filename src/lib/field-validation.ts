import { fieldValueCache } from './field-value-cache'


export interface ValidationResult {
  isValid: boolean
  error?: string
  validIds: number[]
 

  field: EntityFieldMetadata,
): Promise<Validat
    return {
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
   

  const numericId = typeof value === 'number' ? value : parseInt(String(value).trim(), 10)
  if (isNaN(numericId)) {
    return {
      isValid: false,
      error: 'Invalid ID format. Must be a valid integer.'
    }
   

       
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


    const title = result.title || 
                 result.name || 
                 (result.firstName && result.lastName 
                   ? `${result.firstName} ${result.lastName}` 
                   : undefined)

    }
      isValid: true,
      validatedValue: numericId,
      lookupData: {
        id: numericId,
        title
    } e
    } as any
      return {
    console.error('TO_ONE validation error:', error)
    return {
      isValid: false,
      error: `Failed to validate ${field.associatedEntity.entity} ID: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}

export async function validateToManyField(
      return /^\d+$/.test(str
  value: string

  if (!field.associatedEntity?.entity) {
      isVali
      isValid: false,
      invalidIds: [],
      validIds: [],
      invalidIds: [],
      lookupData: []
    }
  }

  let ids: (string | number)[] = []
  
  try {
    const parsed = JSON.parse(value)
    if (parsed.ids && Array.isArray(parsed.ids)) {
        validIds.push(
    } else if (Array.isArray(parsed)) {
      ids = parsed
    } else {
      return {
        isValid: false,
        error: 'Invalid TO_MANY format. Expected JSON with ids array',
        validIds: [],
      invalidIds.push(i





















































  return {



































    isValid: true,
    validatedValue: value
  }
}
