export interface FieldEndpointCapability {
  field: string
  label: string
  searchSupported: boolean
  entitySupported: boolean
  recommendation: 'search' | 'entity' | 'both' | 'none'
  notes?: string
}

const SEARCH_ONLY_FIELDS = [
  'email',
  'firstName',
  'lastName',
  'name',
  'username',
  'phone',
  'mobile',
  'status',
  'title',
  'companyName',
  'occupation',
  'category',
  'type',
  'description',
  'comments',
  'externalID',
  'customText1',
  'customText2',
  'customText3',
  'customText4',
  'customText5',
  'customText6',
  'customText7',
  'customText8',
  'customText9',
  'customText10',
  'customText11',
  'customText12',
  'customText13',
  'customText14',
  'customText15',
  'customText16',
  'customText17',
  'customText18',
  'customText19',
  'customText20',
  'customText21',
  'customText22',
  'customText23',
  'customText24',
  'customText25',
  'customText26',
  'customText27',
  'customText28',
  'customText29',
  'customText30',
  'customText31',
  'customText32',
  'customText33',
  'customText34',
  'customText35',
  'customText36',
  'customText37',
  'customText38',
  'customText39',
  'customText40',
  'customText41',
  'customText42',
  'customText43',
  'customText44',
  'customText45',
  'customText46',
  'customText47',
  'customText48',
  'customText49',
  'customText50',
  'customText51',
  'customText52',
  'customText53',
  'customText54',
  'customText55',
  'customText56',
  'customText57',
  'customText58',
  'customText59',
  'customText60',
  'isDeleted',
  'enabled',
  'source',
  'industry',
  'salary',
  'dateAdded',
  'dateLastModified',
  'dateBegin',
  'dateEnd',
  'startDate',
  'endDate',
  'employmentType',
  'salaryUnit',
  'subject',
  'location',
  'priority',
  'taskType',
  'estimatedCloseDate',
  'estimatedAmount',
  'address1',
  'address2',
  'city',
  'state',
  'zip',
  'country',
  'countryID'
]

const ENTITY_ONLY_FIELDS = [
  'id'
]

const BOTH_SUPPORTED_FIELDS: string[] = [
]

export function getFieldEndpointCapability(
  fieldName: string,
  fieldLabel: string,
  dataType?: string
): FieldEndpointCapability {
  const lowerFieldName = fieldName.toLowerCase()
  
  if (lowerFieldName === 'id') {
    return {
      field: fieldName,
      label: fieldLabel,
      searchSupported: false,
      entitySupported: true,
      recommendation: 'entity',
      notes: 'ID lookups must use /entity endpoint for direct record retrieval'
    }
  }
  
  const isSearchOnly = SEARCH_ONLY_FIELDS.some(f => f.toLowerCase() === lowerFieldName)
  
  if (isSearchOnly) {
    return {
      field: fieldName,
      label: fieldLabel,
      searchSupported: true,
      entitySupported: false,
      recommendation: 'search',
      notes: 'Use /search endpoint with query filters for text-based lookups'
    }
  }
  
  const isBothSupported = BOTH_SUPPORTED_FIELDS.some(f => f.toLowerCase() === lowerFieldName)
  
  if (isBothSupported) {
    return {
      field: fieldName,
      label: fieldLabel,
      searchSupported: true,
      entitySupported: true,
      recommendation: 'both',
      notes: 'Can use either /search or /entity endpoint'
    }
  }
  
  if (dataType === 'Integer' || dataType === 'Long' || dataType === 'BigDecimal') {
    return {
      field: fieldName,
      label: fieldLabel,
      searchSupported: true,
      entitySupported: true,
      recommendation: 'both',
      notes: 'Numeric fields typically support both endpoints'
    }
  }
  
  if (dataType === 'String' || dataType === 'Textarea') {
    return {
      field: fieldName,
      label: fieldLabel,
      searchSupported: true,
      entitySupported: false,
      recommendation: 'search',
      notes: 'Text fields require /search endpoint with query filters'
    }
  }
  
  return {
    field: fieldName,
    label: fieldLabel,
    searchSupported: true,
    entitySupported: false,
    recommendation: 'search',
    notes: 'Default: use /search endpoint for lookups'
  }
}

export function validateLookupFieldForEndpoint(
  fieldName: string,
  endpoint: 'search' | 'entity',
  dataType?: string
): { valid: boolean; warning?: string; error?: string } {
  const capability = getFieldEndpointCapability(fieldName, fieldName, dataType)
  
  if (endpoint === 'search') {
    if (!capability.searchSupported) {
      return {
        valid: false,
        error: `Field "${fieldName}" does not support /search endpoint. ${capability.notes || 'Use /entity endpoint instead.'}`
      }
    }
    return { valid: true }
  }
  
  if (endpoint === 'entity') {
    if (!capability.entitySupported) {
      if (fieldName.toLowerCase() === 'id') {
        return { valid: true }
      }
      return {
        valid: false,
        error: `Field "${fieldName}" does not support /entity endpoint for lookups. ${capability.notes || 'Use /search endpoint instead.'}`
      }
    }
    return { valid: true }
  }
  
  return { valid: false, error: 'Unknown endpoint type' }
}

export function getAllFieldCapabilities(
  fields: Array<{ name: string; label: string; dataType?: string }>
): FieldEndpointCapability[] {
  return fields.map(field => 
    getFieldEndpointCapability(field.name, field.label, field.dataType)
  )
}

export function filterFieldsByEndpoint(
  fields: Array<{ name: string; label: string; dataType?: string }>,
  endpoint: 'search' | 'entity'
): Array<{ name: string; label: string; dataType?: string }> {
  return fields.filter(field => {
    const capability = getFieldEndpointCapability(field.name, field.label, field.dataType)
    return endpoint === 'search' ? capability.searchSupported : capability.entitySupported
  })
}
