export type BullhornCredentials = {
  clientId: string
  clientSecret: string
  username: string
  password: string
  restUrl?: string
  bhRestToken?: string
}

export type BullhornSession = {
  BhRestToken: string
  restUrl: string
  corporationId?: number
  userId?: number
  refreshToken?: string
  accessToken?: string
  expiresAt?: number
}

export type BullhornEntity = {
  id: string
  label: string
  fields: string[]
}

export type QueryFilter = {
  field: string
  operator: string
  value: string
}

export type FilterGroup = {
  id: string
  logic: 'AND' | 'OR'
  filters: QueryFilter[]
}

export type QueryConfig = {
  entity: string
  fields: string[]
  filters: QueryFilter[]
  filterGroups?: FilterGroup[]
  groupLogic?: 'AND' | 'OR'
  orderBy?: string
  count?: number
  start?: number
}

export type QueryResult = {
  data: any[]
  total: number
  count: number
  start: number
}

export type AuditLog = {
  id: string
  timestamp: number
  operation: string
  entity?: string
  status: 'success' | 'error' | 'pending'
  message: string
  details?: any
  recordCount?: number
  rollbackData?: {
    updates: Array<{
      entityId: number
      previousValues: Record<string, any>
    }>
  }
  rolledBack?: boolean
  rollbackHistory?: Array<{
    timestamp: number
    successCount: number
    errorCount: number
    errors?: string[]
  }>
  originalLogId?: string
  failedOperations?: Array<{
    entityId: number
    operation: 'update' | 'add'
    data: Record<string, any>
    error: string
    toManyUpdates?: Array<{
      field: string
      operation: string
      ids: number[]
      subField?: string
    }>
  }>
  retryHistory?: Array<{
    timestamp: number
    successCount: number
    failedCount: number
    errors?: string[]
  }>
}

export type CSVMapping = {
  csvColumn: string
  bullhornField: string
  transform?: string
}

export type CSVImportConfig = {
  entity: string
  mappings: CSVMapping[]
  lookupField?: string
  updateExisting: boolean
  createNew: boolean
}

export type StackOperation = {
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

export type UpdateSnapshot = {
  id: string
  timestamp: number
  operation: 'csv-import' | 'smartstack'
  entity: string
  description: string
  updates: Array<{
    entityId: number
    previousValues: Record<string, any>
    newValues: Record<string, any>
  }>
}

export type ExecutionState = 'idle' | 'running' | 'paused' | 'stopping' | 'stopped'

export type ExecutionControl = {
  state: ExecutionState
  currentIndex: number
  totalRecords: number
  successCount: number
  failedCount: number
  canResume: boolean
}
