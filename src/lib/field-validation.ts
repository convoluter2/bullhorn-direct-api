import { fieldValueCache } from './field-value-cache'

export interface ValidationResult {
  isValid: boolean
  error?: string
  validatedValue?: any
  lookupData?: any
  validIds?: number[]
  invalidIds?: (string | number)[]
}

export async function validateToOneField(
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
      numericId,
      ['id', 'name', 'title', 'firstName', 'lastName']
    )

    if (result) {
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
    } else {
      return {
        isValid: false,
        error: `No ${field.associatedEntity.entity} found with ID ${numericId}`
      }
    }
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Validation failed'
    }
  }
}

export async function validateToManyField(
  field: any,
  value: string
): Promise<ValidationResult> {
  if (!field.associatedEntity?.entity) {
    return {
      isValid: false,
      error: 'Field is not a TO_MANY association',
      validIds: [],
      invalidIds: [],
      lookupData: []
    }
  }

  let ids: any[]
  try {
    const parsed = JSON.parse(value)
    
    if (Array.isArray(parsed)) {
      ids = parsed
    } else if (parsed && Array.isArray(parsed.ids)) {
      ids = parsed.ids
    } else {
      return {
        isValid: false,
        error: 'Invalid TO_MANY format. Expected JSON array or {ids: [...]}',
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

export interface AddressValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  validatedAddress: Record<string, any>
}

export function validateAddressField(
  addressData: Record<string, any>,
  fieldName: string = 'address',
  allowPartial: boolean = false
): AddressValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const validatedAddress: Record<string, any> = {}

  if (!addressData || typeof addressData !== 'object') {
    return {
      isValid: false,
      errors: [`${fieldName} must be an object`],
      warnings: [],
      validatedAddress: {}
    }
  }

  const hasAnyAddressField = Object.keys(addressData).some(key => 
    ['address1', 'address2', 'city', 'state', 'zip', 'countryID', 'countryCode', 'countryName'].includes(key)
  )

  if (!hasAnyAddressField) {
    if (!allowPartial) {
      return {
        isValid: false,
        errors: [`${fieldName} has no valid address fields`],
        warnings: [],
        validatedAddress: {}
      }
    }
    return {
      isValid: true,
      errors: [],
      warnings: [`${fieldName} is empty but allowed`],
      validatedAddress: {}
    }
  }

  for (const [key, value] of Object.entries(addressData)) {
    if (value === null || value === undefined || value === '') {
      continue
    }

    switch (key) {
      case 'address1':
      case 'address2':
      case 'city':
      case 'state':
      case 'countryCode':
      case 'countryName':
      case 'timezone':
        validatedAddress[key] = String(value).trim()
        break

      case 'zip':
        validatedAddress[key] = String(value).trim()
        break

      case 'countryID':
        const countryId = parseInt(String(value), 10)
        if (isNaN(countryId)) {
          errors.push(`${fieldName}.countryID must be a valid integer`)
        } else {
          validatedAddress[key] = countryId
        }
        break

      default:
        warnings.push(`${fieldName}.${key} is not a standard address field`)
        validatedAddress[key] = value
        break
    }
  }

  const hasMinimumFields = validatedAddress.address1 || validatedAddress.city || validatedAddress.state

  if (!hasMinimumFields && !allowPartial) {
    errors.push(`${fieldName} must contain at least one of: address1, city, or state`)
  }

  if (Object.keys(validatedAddress).length === 0 && !allowPartial) {
    errors.push(`${fieldName} has no valid data after validation`)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    validatedAddress: Object.keys(validatedAddress).length > 0 ? validatedAddress : addressData
  }
}

export interface AddressValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  validatedAddress: Record<string, any>
}

export function validateAddressField(
  addressData: Record<string, any>,
  fieldName: string = 'address',
  allowPartial: boolean = false
): AddressValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const validatedAddress: Record<string, any> = {}

  if (!addressData || typeof addressData !== 'object') {
    return {
      isValid: false,
      errors: [`${fieldName} must be an object`],
      warnings: [],
      validatedAddress: {}
    }
  }

  const hasAnyAddressField = Object.keys(addressData).some(key => 
    ['address1', 'address2', 'city', 'state', 'zip', 'countryID', 'countryCode', 'countryName'].includes(key)
  )

  if (!hasAnyAddressField) {
    if (!allowPartial) {
      return {
        isValid: false,
        errors: [`${fieldName} has no valid address fields`],
        warnings: [],
        validatedAddress: {}
      }
    }
    return {
      isValid: true,
      errors: [],
      warnings: [`${fieldName} is empty but allowed`],
      validatedAddress: {}
    }
  }

  for (const [key, value] of Object.entries(addressData)) {
    if (value === null || value === undefined || value === '') {
      continue
    }

    switch (key) {
      case 'address1':
      case 'address2':
      case 'city':
      case 'state':
      case 'countryCode':
      case 'countryName':
      case 'timezone':
        validatedAddress[key] = String(value).trim()
        break

      case 'zip':
        validatedAddress[key] = String(value).trim()
        break

      case 'countryID':
        const countryId = parseInt(String(value), 10)
        if (isNaN(countryId)) {
          errors.push(`${fieldName}.countryID must be a valid integer`)
        } else {
          validatedAddress[key] = countryId
        }
        break

      default:
        warnings.push(`${fieldName}.${key} is not a standard address field`)
        validatedAddress[key] = value
        break
    }
  }

  const hasMinimumFields = validatedAddress.address1 || validatedAddress.city || validatedAddress.state

  if (!hasMinimumFields && !allowPartial) {
    errors.push(`${fieldName} must contain at least one of: address1, city, or state`)
  }

  if (Object.keys(validatedAddress).length === 0 && !allowPartial) {
    errors.push(`${fieldName} has no valid data after validation`)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    validatedAddress: Object.keys(validatedAddress).length > 0 ? validatedAddress : addressData
  }
}
