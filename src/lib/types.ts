export interface BullhornCredentials {
  clientId: string
  clientSecret: string
  username: string
  password: string
  restUrl?: string
  bhRestToken?: string
}

export interface BullhornSession {
  BhRestToken: string
  restUrl: string
  corporationId?: number
  userId?: number
  refreshToken?: string
  accessToken?: string
  expiresAt?: number
}

export interface BullhornEntity {
  id: string
  label: string
  fields: string[]
}

export interface QueryFilter {
  field: string
  operator: string
  value: string
}

export interface QueryConfig {
  entity: string
  fields: string[]
  filters: QueryFilter[]
  orderBy?: string
  count?: number
  start?: number
}

export interface QueryResult {
  data: any[]
  total: number
  count: number
  start: number
}

export interface AuditLog {
  id: string
  timestamp: number
  operation: string
  entity?: string
  status: 'success' | 'error' | 'pending'
  message: string
  details?: any
  recordCount?: number
}

export interface CSVMapping {
  csvColumn: string
  bullhornField: string
  transform?: string
}

export interface CSVImportConfig {
  entity: string
  mappings: CSVMapping[]
  lookupField?: string
  updateExisting: boolean
  createNew: boolean
}

export interface StackOperation {
  id: string
  type: 'create' | 'update' | 'delete' | 'query'
  entity: string
  data: any
  dependsOn?: string[]
  status: 'pending' | 'running' | 'completed' | 'failed'
  result?: any
  error?: string
  description?: string
}
