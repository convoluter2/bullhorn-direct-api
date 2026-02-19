const SEARCH_ONLY_ENTITIES = [
  'Candidate',
  'ClientContact',
  'ClientCorporation',
  'JobOrder',
  'Lead',
  'Opportunity',
  'Placement'
]

const QUERY_ONLY_ENTITIES = [
  'Appointment',
  'AppointmentAttendee',
  'BusinessSector',
  'Category',
  'CertificationRequirement',
  'ClientContactCertification',
  'CorporateUser',
  'CorporationDepartment',
  'Country',
  'JobSubmission',
  'Note',
  'NoteEntity',
  'PlacementCertification',
  'PlacementChangeRequest',
  'PlacementCommission',
  'Skill',
  'Specialty',
  'State',
  'Task',
  'Tearsheet',
  'TimeUnit',
  'UserType'
]

export type QueryMethod = 'search' | 'query' | 'both'

export function getQueryMethod(entityName: string): QueryMethod {
  if (SEARCH_ONLY_ENTITIES.includes(entityName)) {
    return 'search'
  }
  
  if (QUERY_ONLY_ENTITIES.includes(entityName)) {
    return 'query'
  }
  
  return 'both'
}

export function supportsSearch(entityName: string): boolean {
  const method = getQueryMethod(entityName)
  return method === 'search' || method === 'both'
}

export function supportsQuery(entityName: string): boolean {
  const method = getQueryMethod(entityName)
  return method === 'query' || method === 'both'
}

export function getRecommendedMethod(entityName: string): 'search' | 'query' {
  const method = getQueryMethod(entityName)
  
  if (method === 'search') return 'search'
  if (method === 'query') return 'query'
  
  return 'search'
}

export function getQueryMethodDescription(entityName: string): string {
  const method = getQueryMethod(entityName)
  
  switch (method) {
    case 'search':
      return 'This entity only supports Search with Lucene query syntax'
    case 'query':
      return 'This entity only supports Query with SQL-like WHERE syntax'
    case 'both':
      return 'This entity supports both Search (Lucene) and Query (SQL WHERE) methods'
  }
}

export function getCSVImportWarning(entityName: string): string | null {
  const method = getQueryMethod(entityName)
  
  switch (method) {
    case 'search':
      return `⚠️ ${entityName} only supports Search (Lucene syntax). CSV import uses Query for lookups, which may have limitations. For best results, use exact ID matches as your lookup field.`
    case 'query':
      return `ℹ️ ${entityName} only supports Query (SQL WHERE syntax). Search is not available for this entity.`
    case 'both':
      return null
  }
}

export function hasLimitedQuerySupport(entityName: string): boolean {
  const method = getQueryMethod(entityName)
  return method === 'search' || method === 'query'
}
