import { fieldValueCache } from './field-value-cache'

export interface ValidationResult {
  isValid: boolean
  error?: string
  validatedValue?: any
  lookupData?: any
}

  validIds: number[]
  lookupData: any[
  error?: string
  validIds: number[]
  invalidIds: (string | number)[]
  lookupData: any[]
}

export async function validateToOneField(
  field: any,
      error: 'Invalid ID
  }
  try {
      field.
      ['id', 'name', 

     
   

    const title = result.title || 
                 (result.
            
    return {
      validatedValue: numericId,
     
   

    ret
      error: `Failed to validate ${field.associatedEntity.e
  }
      numericId,
  field: any,
    )

    if (!result) {
      invalidI
    }

      }
    }

      ids = parsed
      return {
        error: 'Invalid TO_MANY format. Expected JSON 
        invalidIds: [],
      }

    return {
      validIds: [],
      lookupData: []
  }
  const numericIds = i
  const inval
      }
    c
  } catch (error) {
      invalidIds.push(id)
    }
    try {
        field.associatedEntity.entity,
     

 

                       ? `${result.firstNa
  field: any,
          title
): Promise<ToManyValidationResult> {
      }
    return {
  }
      error: 'Field is not a TO_MANY association',
    error: invalidI
      : undefined,
    invalidIds,
  }


): Promise<ValidationResult> {
  
  }


      ids = parsed.ids







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




