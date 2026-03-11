import { fieldValueCache } from './field-value-cache'


  validatedValue?: any
    id: number
  }

  isValid: boole
  validIds: nu
  lookupData: Arra

 

export interface ToManyValidationResult {
  isValid: boolean
  error?: string
  validIds: number[]
  invalidIds: number[]
  lookupData: Array<{ id: number; title?: string }>
}

export async function validateToOneField(
  field: EntityField,
  value: string | number
): Promise<ValidationResult> {
  if (!field.associatedEntity?.entity) {
  }
  const numericId = /
  if (!numericId) {
     
   

    const result = await fieldValueCache.getFieldValueById(
  
    )
    if (!res
        isValid: fal
      }

   



      lookupData: {
        titl
    }
    console.error('TO_ONE validation error:', error)
     
   

export 
  value: string
  if (!field.associatedEntity?.entit
      isValid: f
      validIds: [],
     

  let ids: (string
    const pars
      ids = parsed.ids
      ids = parsed
      r
     

      }
  } catch {
  }
  const numericIds = ids
      const str = String(id).tr


    return {
      error: 'No valid integer IDs found
      invalidIds: [
    }

  const

    try {
        field.associatedEntity.entity,
        ['id

        validIds.push(id)
     
   
 

    } catch (error) {
      invalidIds.push
  }
  return {
    error: invalidIds.length > 0 
      : unde
    invalidIds,
  }

  field: EntityField,
): Promise<Validatio
    r
   

  if (field.associationType ==
  }
  if (field.associationType === 'TO_
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
  field: EntityField,
  value: string | number
): Promise<ValidationResult> {
  if (!field) {
    return {
      isValid: false,
      error: 'Field metadata not found'
    }
  }

  if (field.associationType === 'TO_ONE') {
    return validateToOneField(field, value)
  }

  if (field.associationType === 'TO_MANY') {
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
