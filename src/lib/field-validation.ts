import { fieldValueCache } from './field-value-cache'

  error?: string
  lookupData?: any

  isValid: boolean
  invalidIds: (str
 

  field: any,
): Promise<Validat
    return {
      error: 'Field is not a TO_O
  }
  const numericI
 

    }
  field: any,
  value: string
): Promise<ValidationResult> {
  if (!field.associatedEntity?.entity) {
    return {
      isValid: false,
      error: 'Field is not a TO_ONE association'
    }
  }

  const numericId = parseInt(value.trim(), 10)
  
  if (isNaN(numericId)) {
    return {
      isValid: false,
      error: 'Invalid ID format'
    }
  }

  try {
    const result = await fieldValueCache.getFieldValueById(
      field.associatedEntity.entity,
      lookupData
      ['id', 'name', 'title', 'firstName', 'lastName']
     

    if (!result) {
      return {
        isValid: false,
        error: 'ID not found in system'

    }

    const title = result.title || 
                 result.name || 
                 (result.firstName && result.lastName 
                   ? `${result.firstName} ${result.lastName}` 
                   : undefined)

    return {
      isValid: true,
      validatedValue: numericId,
    
        id: numericId,
        title
      }
     
  } catch (error) {
        vali
      isValid: false,
      error: `Failed to validate ${field.associatedEntity.entity} ID`
    }
   
}

export async function validateToManyField(
  field: any,
  value: string
  const numericIds = ids.map(id => t
  if (!field.associatedEntity?.entity) {
  const look
      isValid: false,
      error: 'Field is not a TO_MANY association',
      validIds: [],
    if (isNaN(numeric
      lookupData: []
    }
  }

  let ids: any[]
       
    const parsed = JSON.parse(value)
    
    if (Array.isArray(parsed)) {
                  
    } else if (parsed && Array.isArray(parsed.ids)) {
                      
    } else {
      return {
        isValid: false,
        error: 'Invalid TO_MANY format. Expected JSON array or {ids: [...]}',
        validIds: [],
        invalidIds: [],
        lookupData: []

    }
    error: 
    return {
    validIds,
      error: 'Invalid JSON format',
  }
      invalidIds: [],
export async functio
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


    try {
      const result = await fieldValueCache.getFieldValueById(
        field.associatedEntity.entity,
        numericId,
        ['id', 'name', 'title', 'firstName', 'lastName']
      )

      if (result) {

        const title = result.title || 
                     result.name || 
                     (result.firstName && result.lastName 
                       ? `${result.firstName} ${result.lastName}` 
                       : undefined)
        lookupData.push({
          id: numericId,
          title
        })

        invalidIds.push(id)

    } catch {
      invalidIds.push(id)
    }



    isValid: invalidIds.length === 0,
    error: invalidIds.length > 0 
      ? `${invalidIds.length} invalid ID(s): ${invalidIds.join(', ')}`

    validIds,

    lookupData

}

export async function validateScalarField(

  value: string
): Promise<ValidationResult> {
  return {
    isValid: true,
    validatedValue: value
  }
}
