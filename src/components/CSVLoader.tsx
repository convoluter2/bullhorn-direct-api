import { useState, useRef, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Upload, Lightning, CheckCircle, XCircle, MagnifyingGlass, Plus, Eye, ArrowsClockwise, ArrowCounterClockwise, Pause, Play, Stop, DownloadSimple, Gauge, Trash, Clock } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { parseCSV, exportToCSV, exportToJSON } from '@/lib/csv-utils'
import { formatFieldLabel, formatFieldValue } from '@/lib/utils'
import { useEntityMetadata } from '@/hooks/use-entity-metadata'
import { useEntities } from '@/hooks/use-entities'
import { ManualEntityDialog } from '@/components/ManualEntityDialog'
import { LookupFieldSelector } from '@/components/LookupFieldSelector'
import { SpeedControl } from '@/components/SpeedControl'
import { ToManyConfigSelector } from '@/components/ToManyConfigSelector'
import { AutoRefreshControl } from '@/components/AutoRefreshControl'
import type { CSVMapping, UpdateSnapshot, ExecutionState } from '@/lib/types'

interface CSVLoaderProps {
  onLog: (operation: string, status: 'success' | 'error', message: string, details?: any) => void
}

interface ImportResult {
  row: number
  status: 'success' | 'error'
  message: string
  action?: string
  data?: any
  rowData?: string[]
  error?: string
}

interface ToManyConfig {
  operation: 'add' | 'remove' | 'replace'
  subField: string
}

interface PersistedImportState {
  entity: string
  csvData: { headers: string[]; rows: string[][] }
  mappings: CSVMapping[]
  toManyConfigs: Record<string, ToManyConfig>
  lookupField: string
  updateExisting: boolean
  createNew: boolean
  dryRun: boolean
  currentIndex: number
  results: ImportResult[]
  progress: number
  timestamp: number
}

export function CSVLoader({ onLog }: CSVLoaderProps) {
  const [entity, setEntity] = useState('')
  const [csvData, setCsvData] = useState<{ headers: string[]; rows: string[][] } | null>(null)
  const [mappings, setMappings] = useState<CSVMapping[]>([])
  const [toManyConfigs, setToManyConfigs] = useState<Record<string, ToManyConfig>>({})
  const [lookupField, setLookupField] = useState<string>('')
  const [updateExisting, setUpdateExisting] = useState(true)
  const [createNew, setCreateNew] = useState(false)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<ImportResult[]>([])
  const [dryRun, setDryRun] = useState(true)
  const [manualEntityDialogOpen, setManualEntityDialogOpen] = useState(false)
  const [snapshots, setSnapshots] = useKV<UpdateSnapshot[]>('csv-import-snapshots', [])
  const [lastSnapshotId, setLastSnapshotId] = useState<string | null>(null)
  
  const [executionState, setExecutionState] = useState<ExecutionState>('idle')
  const [currentIndex, setCurrentIndex] = useState(0)
  const executionControlRef = useRef<{ shouldPause: boolean; shouldStop: boolean }>({
    shouldPause: false,
    shouldStop: false
  })
  
  const [persistedState, setPersistedState, deletePersistedState] = useKV<PersistedImportState | null>('csv-import-paused-state', null)
  const [showRestorePrompt, setShowRestorePrompt] = useState(false)

  const [processingSpeed, setProcessingSpeed] = useState(0)
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null)
  const processingStartTimeRef = useRef<number>(0)
  const lastProgressUpdateRef = useRef<{ time: number; index: number }>({ time: 0, index: 0 })

  const { entities, loading: entitiesLoading, refresh: refreshEntities, refreshInBackground, addEntity, lastRefresh } = useEntities()
  const { metadata, loading: metadataLoading, error: metadataError } = useEntityMetadata(entity || undefined)
  
  const availableFields = metadata?.fields || []
  
  useEffect(() => {
    if (persistedState && !csvData) {
      const ageInMinutes = (Date.now() - persistedState.timestamp) / 1000 / 60
      if (ageInMinutes < 1440) {
        setShowRestorePrompt(true)
      } else {
        deletePersistedState()
      }
    }
  }, [persistedState, csvData, deletePersistedState])
  
  const restorePersistedState = () => {
    if (!persistedState) return
    
    try {
      setEntity(persistedState.entity)
      setCsvData(persistedState.csvData)
      
      const validMappings = (persistedState.mappings || []).filter(m => 
        m && m.csvColumn && m.bullhornField !== undefined
      )
      setMappings(validMappings)
      
      setToManyConfigs(persistedState.toManyConfigs || {})
      setLookupField(persistedState.lookupField)
      setUpdateExisting(persistedState.updateExisting)
      setCreateNew(persistedState.createNew)
      setDryRun(persistedState.dryRun)
      setCurrentIndex(persistedState.currentIndex)
      setResults(persistedState.results || [])
      setProgress(persistedState.progress)
      setExecutionState('paused')
      setShowRestorePrompt(false)
      
      toast.success(`Restored paused import: ${persistedState.currentIndex} of ${persistedState.csvData.rows.length} rows processed`)
    } catch (error) {
      console.error('Error restoring persisted state:', error)
      toast.error('Failed to restore paused import state')
      deletePersistedState()
      setShowRestorePrompt(false)
    }
  }
  
  const discardPersistedState = () => {
    deletePersistedState()
    setShowRestorePrompt(false)
    toast.info('Discarded paused import')
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        if (!text || text.trim() === '') {
          toast.error('CSV file is empty')
          return
        }
        
        const parsed = parseCSV(text)
        
        if (!parsed.headers || parsed.headers.length === 0) {
          toast.error('CSV file has no headers')
          return
        }
        
        setCsvData(parsed)
        
        const initialMappings = parsed.headers
          .filter(header => header !== null && header !== undefined)
          .map(header => ({
            csvColumn: String(header) || '',
            bullhornField: '__skip__'
          }))
        
        if (initialMappings.length === 0) {
          toast.error('CSV file has invalid headers')
          return
        }
        
        setMappings(initialMappings)
        setResults([])
        toast.success(`CSV loaded: ${parsed.rows.length} rows, ${parsed.headers.length} columns`)
      } catch (error) {
        console.error('CSV parse error:', error)
        toast.error(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
    reader.onerror = () => {
      toast.error('Failed to read CSV file')
    }
    reader.readAsText(file)
  }

  const updateMapping = (csvColumn: string, bullhornField: string) => {
    setMappings((currentMappings) => 
      (currentMappings || []).map(m => 
        m && m.csvColumn === csvColumn ? { ...m, bullhornField } : m
      ).filter(m => m !== null && m !== undefined)
    )
  }

  const updateTransform = (csvColumn: string, transform?: string) => {
    setMappings((currentMappings) => 
      (currentMappings || []).map(m => 
        m && m.csvColumn === csvColumn ? { ...m, transform } : m
      ).filter(m => m !== null && m !== undefined)
    )
  }

  const transformValue = (value: string, transform?: string): any => {
    if (!value || value === null || value === undefined) return value

    try {
      switch (transform) {
        case 'number':
          const num = parseFloat(value)
          return isNaN(num) ? value : num
        case 'boolean':
          return value.toLowerCase() === 'true' || value === '1'
        case 'trim':
          return value.trim()
        case 'uppercase':
          return value.toUpperCase()
        case 'lowercase':
          return value.toLowerCase()
        default:
          return value
      }
    } catch (error) {
      console.error('Transform error:', error)
      return value
    }
  }

  const handlePause = () => {
    executionControlRef.current.shouldPause = true
    setExecutionState('paused')
    toast.info('Pausing after current record completes...')
  }
  
  const saveProgressState = () => {
    if (!csvData || !entity) return
    
    const state: PersistedImportState = {
      entity,
      csvData,
      mappings,
      toManyConfigs,
      lookupField,
      updateExisting,
      createNew,
      dryRun,
      currentIndex,
      results,
      progress,
      timestamp: Date.now()
    }
    
    setPersistedState(() => state)
  }

  const handleResume = () => {
    executionControlRef.current.shouldPause = false
    setExecutionState('running')
    executeImport(true)
  }

  const handleStop = () => {
    executionControlRef.current.shouldStop = true
    setExecutionState('stopping')
    toast.info('Stopping after current record completes...')
  }

  const executeImport = async (isResume: boolean = false) => {
    try {
      if (!csvData || !entity) {
        toast.error('Please upload a CSV and select an entity')
        return
      }

      if (!mappings || mappings.length === 0) {
        toast.error('No field mappings available')
        return
      }

      const validMappings = mappings.filter(m => m && m.csvColumn && m.bullhornField && m.bullhornField !== '__skip__')
      if (validMappings.length === 0) {
        toast.error('Please map at least one field')
        return
      }

      if (lookupField && lookupField !== '__none__') {
        const lookupMapping = mappings.find(m => m && (m.bullhornField === lookupField || m.csvColumn?.toLowerCase() === lookupField.toLowerCase()))
        if (!lookupMapping) {
          toast.error('Lookup field must have a corresponding CSV column')
          return
        }
      }

      if (!updateExisting && !createNew) {
        toast.error('Must enable either "Update Existing" or "Create New"')
        return
      }

    if (!isResume) {
      setCurrentIndex(0)
      setResults([])
      executionControlRef.current = { shouldPause: false, shouldStop: false }
      processingStartTimeRef.current = Date.now()
      lastProgressUpdateRef.current = { time: Date.now(), index: 0 }
      setProcessingSpeed(0)
      setEstimatedTimeRemaining(null)
    } else {
      processingStartTimeRef.current = Date.now() - ((currentIndex / csvData.rows.length) * 60000)
      lastProgressUpdateRef.current = { time: Date.now(), index: currentIndex }
    }
    
    setExecutionState('running')
    setLoading(true)
    if (!isResume) {
      setProgress(0)
    }
    
    const importResults: ImportResult[] = isResume ? [...results] : []
    const errorDetails: string[] = []

    let successCount = isResume ? results.filter(r => r.status === 'success').length : 0
    let errorCount = isResume ? results.filter(r => r.status === 'error').length : 0
    let createdCount = isResume ? results.filter(r => r.action === 'created').length : 0
    let updatedCount = isResume ? results.filter(r => r.action === 'updated').length : 0
    let skippedCount = isResume ? results.filter(r => r.action === 'skipped').length : 0

    const snapshotUpdates: Array<{
      entityId: number
      previousValues: Record<string, any>
      newValues: Record<string, any>
    }> = []
    const failedOperations: Array<{
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
    }> = []

    const startIndex = isResume ? currentIndex : 0
    const CONCURRENT_BATCH_SIZE = 100

    const processRecord = async (i: number, row: string[]) => {
      let existingRecord: any = null
      let data: any = {}
      
      let lookupValue: string | null = null

      if (lookupField && lookupField !== '__none__' && csvData && csvData.headers) {
        const lookupMapping = mappings.find(m => m && m.bullhornField === lookupField)
        if (lookupMapping && lookupMapping.csvColumn) {
          const csvIndex = csvData.headers.indexOf(lookupMapping.csvColumn)
          if (csvIndex !== -1 && row && row[csvIndex] !== undefined) {
            const rawValue = row[csvIndex]
            lookupValue = transformValue(rawValue, lookupMapping.transform)
          }
        } else {
          const csvIndex = csvData.headers.findIndex(h => h && h.toLowerCase() === lookupField.toLowerCase())
          if (csvIndex !== -1) {
            lookupValue = row[csvIndex]
          }
        }
      }

      validMappings.forEach(mapping => {
        if (!mapping || !mapping.csvColumn || !mapping.bullhornField || !csvData || !csvData.headers) {
          return
        }
        
        const csvIndex = csvData.headers.indexOf(mapping.csvColumn)
        if (csvIndex !== -1 && row && row[csvIndex] !== undefined) {
          const rawValue = row[csvIndex]
          const transformedValue = transformValue(rawValue, mapping.transform)
          
          if (transformedValue === '' || transformedValue === null || transformedValue === undefined) {
            data[mapping.bullhornField] = null
          } else if (typeof transformedValue === 'string' && transformedValue.toLowerCase() === 'null') {
            data[mapping.bullhornField] = null
          } else {
            const fieldMeta = metadata?.fieldsMap[mapping.bullhornField]
            if (fieldMeta?.associationType === 'TO_MANY') {
              const config = toManyConfigs[mapping.bullhornField] || { operation: 'add', subField: 'id' }
              
              const values = transformedValue.split(',').map((v: string) => v.trim()).filter((v: string) => v)
              
              if (config.subField === 'id') {
                const ids = values.map((v: string) => parseInt(v, 10)).filter((id: number) => !isNaN(id))
                if (ids.length > 0) {
                  data[`__tomany_${mapping.bullhornField}`] = {
                    operation: config.operation,
                    ids: ids,
                    subField: 'id'
                  }
                }
              } else {
                if (values.length > 0) {
                  data[`__tomany_${mapping.bullhornField}`] = {
                    operation: config.operation,
                    ids: values,
                    subField: config.subField
                  }
                }
              }
            } else if (fieldMeta?.associationType === 'TO_ONE') {
              const trimmedValue = transformedValue.trim()
              if (trimmedValue && /^\d+$/.test(trimmedValue)) {
                data[mapping.bullhornField] = { id: parseInt(trimmedValue, 10) }
              } else {
                data[mapping.bullhornField] = transformedValue
              }
            } else if (fieldMeta?.type === 'Integer' || fieldMeta?.type === 'Double') {
              data[mapping.bullhornField] = Number(transformedValue)
            } else if (fieldMeta?.type === 'Boolean') {
              data[mapping.bullhornField] = transformedValue === 'true' || transformedValue === '1'
            } else {
              data[mapping.bullhornField] = transformedValue
            }
          }
        }
      })

      if (lookupField && lookupField !== '__none__' && lookupValue) {
        try {
          const fieldsToFetch = ['id', ...validMappings.map(m => m.bullhornField).filter(f => f !== 'id')]
          const searchResult = await bullhornAPI.search({
            entity,
            fields: fieldsToFetch,
            filters: [{ field: lookupField, operator: 'equals', value: lookupValue }],
            count: 1,
            start: 0
          })
          
          if (searchResult.data && searchResult.data.length > 0) {
            existingRecord = searchResult.data[0]
          }
        } catch (searchError) {
          if (lookupField.toLowerCase() === 'id') {
            const recordId = parseInt(lookupValue, 10)
            if (!isNaN(recordId)) {
              try {
                const fieldsToFetch = ['id', ...validMappings.map(m => m.bullhornField).filter(f => f !== 'id')]
                const record = await bullhornAPI.getEntity(entity, recordId, fieldsToFetch)
                if (record && record.id) {
                  existingRecord = record
                }
              } catch (fallbackError) {
                console.error(`Fallback entity lookup failed:`, fallbackError)
              }
            }
          }
        }
      }

      if (existingRecord) {
        if (updateExisting) {
          if (!dryRun) {
            const regularData: any = {}
            const toManyUpdates: Array<{ field: string; operation: string; ids: number[]; subField?: string }> = []
            
            Object.keys(data).forEach(key => {
              if (key.startsWith('__tomany_')) {
                const fieldName = key.replace('__tomany_', '')
                const toManyValue = data[key]
                if (toManyValue.operation && toManyValue.ids) {
                  toManyUpdates.push({
                    field: fieldName,
                    operation: toManyValue.operation,
                    ids: toManyValue.ids,
                    subField: toManyValue.subField || 'id'
                  })
                }
              } else {
                regularData[key] = data[key]
              }
            })
            
            if (Object.keys(regularData).length > 0) {
              try {
                await bullhornAPI.updateEntity(entity, existingRecord.id, regularData)
              } catch (updateError) {
                const errorMsg = updateError instanceof Error ? updateError.message : String(updateError)
                throw new Error(`Failed to update record ID ${existingRecord.id}: ${errorMsg}`)
              }
            }
            
            for (const toManyUpdate of toManyUpdates) {
              try {
                await bullhornAPI.updateToManyAssociation(
                  entity,
                  existingRecord.id,
                  toManyUpdate.field,
                  toManyUpdate.ids,
                  toManyUpdate.operation as 'add' | 'remove' | 'replace',
                  toManyUpdate.subField || 'id'
                )
              } catch (toManyError) {
                const errorMsg = toManyError instanceof Error ? toManyError.message : String(toManyError)
                throw new Error(`Failed to update to-many field "${toManyUpdate.field}" for record ID ${existingRecord.id}: ${errorMsg}`)
              }
            }
            
            return {
              row: i + 1,
              status: 'success' as const,
              message: `Updated existing record (ID: ${existingRecord.id})`,
              action: 'updated' as const,
              snapshotData: {
                entityId: existingRecord.id,
                previousValues: { ...existingRecord },
                newValues: regularData
              }
            }
          } else {
            const displayData: any = {}
            
            for (const key of Object.keys(data)) {
              if (key.startsWith('__tomany_')) {
                const fieldName = key.replace('__tomany_', '')
                const toManyValue = data[key]
                if (toManyValue.operation && toManyValue.ids) {
                  displayData[fieldName] = `${toManyValue.operation}: [${toManyValue.ids.join(', ')}]`
                }
              } else {
                displayData[key] = data[key]
              }
            }
            
            return {
              row: i + 1,
              status: 'success' as const,
              message: `Would update existing record (ID: ${existingRecord.id})`,
              action: 'updated' as const,
              data: { existing: existingRecord, changes: displayData }
            }
          }
        } else {
          return {
            row: i + 1,
            status: 'success' as const,
            message: `Skipped existing record (ID: ${existingRecord.id})`,
            action: 'skipped' as const
          }
        }
      } else {
        if (createNew) {
          if (!dryRun) {
            const regularData: any = {}
            const toManyUpdates: Array<{ field: string; operation: string; ids: number[]; subField?: string }> = []
            
            Object.keys(data).forEach(key => {
              if (key.startsWith('__tomany_')) {
                const fieldName = key.replace('__tomany_', '')
                const toManyValue = data[key]
                if (toManyValue.operation && toManyValue.ids) {
                  toManyUpdates.push({
                    field: fieldName,
                    operation: toManyValue.operation,
                    ids: toManyValue.ids,
                    subField: toManyValue.subField || 'id'
                  })
                }
              } else {
                regularData[key] = data[key]
              }
            })
            
            if (Object.keys(regularData).length === 0 && toManyUpdates.length === 0) {
              throw new Error('No data to create - all mapped fields are empty')
            }
            
            let result
            try {
              result = await bullhornAPI.createEntity(entity, regularData)
            } catch (createError) {
              const errorMsg = createError instanceof Error ? createError.message : String(createError)
              throw new Error(`Failed to create ${entity}: ${errorMsg}`)
            }
            
            const newEntityId = result.changedEntityId
            
            if (!newEntityId) {
              throw new Error(`Create ${entity} returned no ID. Response: ${JSON.stringify(result)}`)
            }
            
            for (const toManyUpdate of toManyUpdates) {
              try {
                await bullhornAPI.updateToManyAssociation(
                  entity,
                  newEntityId,
                  toManyUpdate.field,
                  toManyUpdate.ids,
                  toManyUpdate.operation as 'add' | 'remove' | 'replace',
                  toManyUpdate.subField || 'id'
                )
              } catch (toManyError) {
                const errorMsg = toManyError instanceof Error ? toManyError.message : String(toManyError)
                console.warn(`Failed to update to-many field "${toManyUpdate.field}" for new record ID ${newEntityId}: ${errorMsg}`)
              }
            }
            
            return {
              row: i + 1,
              status: 'success' as const,
              message: `Created new record (ID: ${newEntityId})`,
              action: 'created' as const
            }
          } else {
            const displayData: any = {}
            
            for (const key of Object.keys(data)) {
              if (key.startsWith('__tomany_')) {
                const fieldName = key.replace('__tomany_', '')
                const toManyValue = data[key]
                if (toManyValue.operation && toManyValue.ids) {
                  displayData[fieldName] = `${toManyValue.operation}: [${toManyValue.ids.join(', ')}]`
                }
              } else {
                displayData[key] = data[key]
              }
            }
            
            return {
              row: i + 1,
              status: 'success' as const,
              message: 'Would create new record',
              action: 'created' as const,
              data: displayData
            }
          }
        } else {
          return {
            row: i + 1,
            status: 'error' as const,
            message: 'Record not found and create new is disabled',
            action: 'skipped' as const
          }
        }
      }
    }

    for (let batchStart = startIndex; batchStart < csvData.rows.length; batchStart += CONCURRENT_BATCH_SIZE) {
      if (executionControlRef.current.shouldStop) {
        setExecutionState('stopped')
        setLoading(false)
        deletePersistedState()
        toast.warning(`Import stopped at row ${batchStart + 1} of ${csvData.rows.length}`)
        onLog(
          'CSV Import Stopped',
          'success',
          `Stopped at row ${batchStart + 1}: ${successCount} success, ${errorCount} errors`,
          { entity, currentRow: batchStart + 1, totalRows: csvData.rows.length }
        )
        return
      }

      if (executionControlRef.current.shouldPause) {
        setCurrentIndex(batchStart)
        setResults(importResults)
        setLoading(false)
        
        const state: PersistedImportState = {
          entity,
          csvData,
          mappings,
          toManyConfigs,
          lookupField,
          updateExisting,
          createNew,
          dryRun,
          currentIndex: batchStart,
          results: importResults,
          progress: ((batchStart) / csvData.rows.length) * 100,
          timestamp: Date.now()
        }
        setPersistedState(() => state)
        
        toast.info(`Import paused at row ${batchStart + 1} of ${csvData.rows.length}. Progress saved - safe to refresh page.`)
        onLog(
          'CSV Import Paused',
          'success',
          `Paused at row ${batchStart + 1}: ${successCount} success, ${errorCount} errors`,
          { entity, currentRow: batchStart + 1, totalRows: csvData.rows.length }
        )
        return
      }

      const batchEnd = Math.min(batchStart + CONCURRENT_BATCH_SIZE, csvData.rows.length)
      const batch: Promise<any>[] = []
      
      for (let i = batchStart; i < batchEnd; i++) {
        const row = csvData.rows[i]
        batch.push(
          processRecord(i, row).catch(error => {
            console.error(`Row ${i + 1} processing error:`, error)
            const errorMessage = error instanceof Error ? error.message : String(error)
            errorDetails.push(`Row ${i + 1}: ${errorMessage}`)
            return {
              row: i + 1,
              status: 'error' as const,
              message: errorMessage,
              action: 'error' as const,
              error: errorMessage,
              failedData: { error: errorMessage }
            }
          })
        )
      }

      const batchResults = await Promise.all(batch)
      
      for (const result of batchResults) {
        importResults.push(result)
        
        if (result.status === 'success') {
          successCount++
          if (result.action === 'created') createdCount++
          if (result.action === 'updated') updatedCount++
          if (result.action === 'skipped') skippedCount++
          if (result.snapshotData && !dryRun) {
            snapshotUpdates.push(result.snapshotData)
          }
        } else {
          errorCount++
          if (result.failedData && !dryRun) {
            failedOperations.push({
              entityId: 0,
              operation: 'add',
              data: {},
              error: result.message
            })
          }
        }
      }

      setCurrentIndex(batchEnd)
      setProgress((batchEnd / csvData.rows.length) * 100)
      setResults([...importResults])
      
      const now = Date.now()
      const timeSinceLastUpdate = now - lastProgressUpdateRef.current.time
      
      if (timeSinceLastUpdate >= 500) {
        const recordsSinceLastUpdate = batchEnd - lastProgressUpdateRef.current.index
        const recordsPerSecond = recordsSinceLastUpdate / (timeSinceLastUpdate / 1000)
        const recordsPerMinute = Math.round(recordsPerSecond * 60)
        setProcessingSpeed(recordsPerMinute)
        
        const remainingRecords = csvData.rows.length - batchEnd
        if (recordsPerSecond > 0) {
          const secondsRemaining = remainingRecords / recordsPerSecond
          setEstimatedTimeRemaining(Math.round(secondsRemaining))
        }
        
        lastProgressUpdateRef.current = { time: now, index: batchEnd }
      }
    }

    setResults(importResults)
    setLoading(false)
    setExecutionState('idle')
    setCurrentIndex(0)
    setProcessingSpeed(0)
    setEstimatedTimeRemaining(null)
    
    deletePersistedState()

    if (!dryRun && snapshotUpdates.length > 0) {
      const snapshot: UpdateSnapshot = {
        id: `snapshot-${Date.now()}`,
        timestamp: Date.now(),
        operation: 'csv-import',
        entity,
        description: `CSV Import: ${updatedCount} updated records`,
        updates: snapshotUpdates
      }
      setSnapshots((current) => [snapshot, ...(current || [])].slice(0, 50))
      setLastSnapshotId(snapshot.id)
    }

    if (dryRun) {
      toast.success(`Dry run complete: ${createdCount} would create, ${updatedCount} would update, ${skippedCount} would skip`)
    } else {
      if (errorCount === 0) {
        toast.success(`Import complete: ${createdCount} created, ${updatedCount} updated, ${skippedCount} skipped`)
      } else {
        toast.warning(`Import completed: ${successCount} success, ${errorCount} errors`)
      }
    }

    onLog(
      dryRun ? 'CSV Import Dry Run' : 'CSV Import',
      errorCount === 0 ? 'success' : 'error',
      dryRun 
        ? `Dry run: ${createdCount} would create, ${updatedCount} would update, ${errorCount} errors`
        : `Processed ${csvData.rows.length} records: ${createdCount} created, ${updatedCount} updated, ${errorCount} errors`,
      { 
        entity, 
        successCount, 
        errorCount, 
        createdCount, 
        updatedCount, 
        skippedCount, 
        mappings: validMappings, 
        lookupField, 
        dryRun,
        errors: errorDetails.length > 0 ? errorDetails : undefined,
        rollbackData: !dryRun && snapshotUpdates.length > 0 ? {
          updates: snapshotUpdates.map(u => ({
            entityId: u.entityId,
            previousValues: u.previousValues
          }))
        } : undefined,
        failedOperations: !dryRun && failedOperations.length > 0 ? failedOperations : undefined
      }
    )
    } catch (error) {
      console.error('CSV Import fatal error:', error)
      setLoading(false)
      setExecutionState('idle')
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      toast.error(`Import failed: ${errorMessage}`)
      onLog(
        'CSV Import Error',
        'error',
        `Fatal error during import: ${errorMessage}`,
        { entity, error: errorMessage }
      )
    }
  }

  const rollbackSnapshot = async (snapshotId: string) => {
    const snapshot = snapshots?.find(s => s.id === snapshotId)
    if (!snapshot) {
      toast.error('Snapshot not found')
      return
    }

    if (!confirm(`Are you sure you want to rollback ${snapshot.updates.length} updates? This will restore previous values.`)) {
      return
    }

    setLoading(true)
    setProgress(0)
    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < snapshot.updates.length; i++) {
      const update = snapshot.updates[i]
      try {
        const restoreData: any = {}
        Object.keys(update.newValues).forEach(key => {
          if (key !== 'id') {
            restoreData[key] = update.previousValues[key]
          }
        })
        
        await bullhornAPI.updateEntity(snapshot.entity, update.entityId, restoreData)
        successCount++
      } catch (error) {
        console.error(`Failed to rollback entity ${update.entityId}:`, error)
        errorCount++
      }
      setProgress(((i + 1) / snapshot.updates.length) * 100)
    }

    setLoading(false)
    setProgress(0)

    if (errorCount === 0) {
      toast.success(`Rollback complete: ${successCount} records restored`)
      setSnapshots((current) => (current || []).filter(s => s.id !== snapshotId))
      if (lastSnapshotId === snapshotId) {
        setLastSnapshotId(null)
      }
      onLog(
        'CSV Import Rollback',
        'success',
        `Rolled back ${successCount} records`,
        { snapshotId, entity: snapshot.entity }
      )
    } else {
      toast.error(`Rollback completed with ${errorCount} errors. ${successCount} records restored.`)
      onLog(
        'CSV Import Rollback',
        'error',
        `Partial rollback: ${successCount} success, ${errorCount} errors`,
        { snapshotId, entity: snapshot.entity }
      )
    }
  }

  return (
    <div className="space-y-6">
      <AutoRefreshControl 
        onRefresh={refreshInBackground} 
        configKey="csvloader-entities-auto-refresh"
        compact={true}
      />
      
      {showRestorePrompt && persistedState && (
        <Card className="border-accent bg-accent/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-accent">
              <Play className="text-accent" size={24} />
              Resume Paused Import
            </CardTitle>
            <CardDescription>
              Found a paused import from {new Date(persistedState.timestamp).toLocaleString()} - 
              {' '}{persistedState.currentIndex} of {persistedState.csvData.rows.length} rows processed 
              ({Math.round((persistedState.currentIndex / persistedState.csvData.rows.length) * 100)}% complete)
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button onClick={restorePersistedState} className="flex-1">
              <Play />
              Resume Import
            </Button>
            <Button onClick={discardPersistedState} variant="outline">
              Discard
            </Button>
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="text-accent" size={24} />
            CSV Data Loader
          </CardTitle>
          <CardDescription>Import and update bulk data from CSV files into Bullhorn entities</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Entity Type</Label>
                {!entitiesLoading && entities.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">{entities.length} entities</Badge>
                    {lastRefresh && (
                      <Badge variant="outline" className="text-xs font-mono gap-1">
                        <Clock size={12} />
                        {new Date(lastRefresh).toLocaleTimeString()}
                      </Badge>
                    )}
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => {
                        toast.loading('Refreshing entity list...', { id: 'refresh-entities' })
                        refreshEntities()
                        setTimeout(() => {
                          toast.success('Entity list refreshed', { id: 'refresh-entities' })
                        }, 500)
                      }}
                      className="h-6 px-2"
                      title="Refresh entity list from API"
                    >
                      <ArrowsClockwise size={14} className={entitiesLoading ? 'animate-spin' : ''} />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => setManualEntityDialogOpen(true)}
                      className="h-6 px-2 gap-1"
                      title="Add manual entity"
                    >
                      <Plus size={14} />
                      Add
                    </Button>
                  </div>
                )}
              </div>
              {entitiesLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : entities.length === 0 ? (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">No entities available</div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      toast.loading('Loading entities...', { id: 'load-entities' })
                      refreshEntities()
                      setTimeout(() => {
                        toast.success('Entity list loaded', { id: 'load-entities' })
                      }, 500)
                    }}
                  >
                    <ArrowsClockwise size={14} className={entitiesLoading ? 'animate-spin' : ''} />
                    Load Entities
                  </Button>
                </div>
              ) : (
                <Select value={entity || undefined} onValueChange={setEntity}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select entity" />
                  </SelectTrigger>
                  <SelectContent>
                    {entities.map((e) => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label>CSV File</Label>
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={!entity}
                className="cursor-pointer"
              />
            </div>
          </div>

          {csvData && (
            <>
              {metadataError && entity && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
                  Failed to load entity metadata: {metadataError}
                </div>
              )}
              <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border">
                {metadataLoading ? (
                  <div className="space-y-2">
                    <Label>Lookup Field (for updates)</Label>
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <LookupFieldSelector
                    fields={availableFields}
                    selectedField={lookupField || '__none__'}
                    onSelectField={setLookupField}
                    label="Lookup Field (for updates)"
                    placeholder="Select a field to lookup existing records"
                    showEndpointInfo={true}
                  />
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between space-x-2 p-3 rounded-md border bg-card">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Update Existing</Label>
                      <p className="text-xs text-muted-foreground">Update records if found</p>
                    </div>
                    <Switch
                      checked={updateExisting}
                      onCheckedChange={setUpdateExisting}
                      disabled={!lookupField || lookupField === '__none__'}
                    />
                  </div>

                  <div className="flex items-center justify-between space-x-2 p-3 rounded-md border bg-card">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Create New</Label>
                      <p className="text-xs text-muted-foreground">Create records if not found</p>
                    </div>
                    <Switch
                      checked={createNew}
                      onCheckedChange={setCreateNew}
                      disabled={!lookupField || lookupField === '__none__'}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between space-x-2 p-3 rounded-md border bg-accent/10">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Eye size={16} />
                      Dry Run Mode
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Preview what will be imported/updated without making changes
                    </p>
                  </div>
                  <Switch
                    checked={dryRun}
                    onCheckedChange={setDryRun}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Field Mapping</Label>
                <div className="space-y-2">
                  {(mappings || []).filter(m => m && m.csvColumn).map((mapping) => {
                    const fieldMeta = mapping?.bullhornField ? metadata?.fieldsMap[mapping.bullhornField] : undefined
                    const isToMany = fieldMeta?.associationType === 'TO_MANY'
                    const isToOne = fieldMeta?.associationType === 'TO_ONE'
                    
                    return (
                      <Card key={mapping.csvColumn || Math.random()} className="p-3">
                        <div className="space-y-3">
                          <div className="flex gap-2 items-center">
                            <div className="flex-1 font-mono text-sm bg-muted p-2 rounded border">
                              {mapping.csvColumn}
                            </div>
                            <div className="text-muted-foreground">→</div>
                            <div className="flex-1">
                              {metadataLoading ? (
                                <Skeleton className="h-10 w-full" />
                              ) : (
                                <Select
                                  value={mapping?.bullhornField || '__skip__'}
                                  onValueChange={(value) => updateMapping(mapping.csvColumn, value)}
                                  disabled={loading}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select Bullhorn field" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__skip__">Skip</SelectItem>
                                    {(availableFields || []).map((field) => (
                                      <SelectItem key={field.name} value={field.name}>
                                        {formatFieldLabel(field.label, field.name)}
                                        {field.associationType === 'TO_MANY' && ' (To-Many)'}
                                        {field.associationType === 'TO_ONE' && ' (To-One)'}
                                        {lookupField === field.name && (
                                          <span className="ml-2 text-xs text-accent">
                                            (Lookup)
                                          </span>
                                        )}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                            <div className="w-32">
                              <Select
                                value={mapping?.transform || 'none'}
                                onValueChange={(v) => updateTransform(mapping.csvColumn, v === 'none' ? undefined : v)}
                                disabled={!mapping?.bullhornField || mapping.bullhornField === '__skip__' || isToMany || isToOne}
                              >
                                <SelectTrigger className="text-xs">
                                  <SelectValue placeholder="Transform" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">No transform</SelectItem>
                                  <SelectItem value="trim">Trim</SelectItem>
                                  <SelectItem value="number">To Number</SelectItem>
                                  <SelectItem value="boolean">To Boolean</SelectItem>
                                  <SelectItem value="uppercase">Uppercase</SelectItem>
                                  <SelectItem value="lowercase">Lowercase</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          {isToMany && mapping?.bullhornField && mapping.bullhornField !== '__skip__' && fieldMeta?.associatedEntity?.entity && (
                            <ToManyConfigSelector
                              fieldName={mapping.bullhornField}
                              fieldLabel={fieldMeta.label || mapping.bullhornField}
                              associatedEntity={fieldMeta.associatedEntity.entity}
                              config={toManyConfigs[mapping.bullhornField] || { operation: 'add', subField: 'id' }}
                              onChange={(config) => {
                                setToManyConfigs(prev => ({
                                  ...prev,
                                  [mapping.bullhornField!]: config
                                }))
                              }}
                            />
                          )}
                          
                          {isToOne && mapping?.bullhornField && mapping.bullhornField !== '__skip__' && (
                            <div className="pl-4 border-l-2 border-accent/30">
                              <Label className="text-xs text-muted-foreground mb-2">To-One Configuration</Label>
                              <p className="text-xs text-muted-foreground">
                                CSV value should be the {fieldMeta?.associatedEntity?.entity || 'entity'} ID (e.g., 12345)
                              </p>
                            </div>
                          )}
                        </div>
                      </Card>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Preview ({csvData.rows.length} rows)</Label>
                <ScrollArea className="h-[200px] border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {csvData.headers.map((header) => (
                          <TableHead key={header} className="font-mono text-xs">
                            {header}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {csvData.rows.slice(0, 10).map((row, i) => (
                        <TableRow key={i}>
                          {row.map((cell, j) => (
                            <TableCell key={j} className="font-mono text-xs">
                              {cell}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>

              <SpeedControl compact={true} />

              <div className="flex gap-2 pt-2">
                {executionState === 'idle' || executionState === 'stopped' ? (
                  <Button
                    onClick={() => executeImport(false)}
                    disabled={loading || !mappings || mappings.filter(m => m && m.bullhornField && m.bullhornField !== '__skip__').length === 0}
                    className="flex-1"
                    variant={dryRun ? "secondary" : "default"}
                  >
                    {dryRun ? <Eye /> : <Lightning />}
                    {loading ? (dryRun ? 'Previewing...' : 'Importing...') : dryRun ? 'Preview Import' : (lookupField && lookupField !== '__none__') ? 'Start Import/Update' : 'Start Import'}
                  </Button>
                ) : null}
                
                {executionState === 'running' && (
                  <>
                    <Button
                      onClick={handlePause}
                      variant="outline"
                      className="flex-1"
                    >
                      <Pause />
                      Pause
                    </Button>
                    <Button
                      onClick={handleStop}
                      variant="destructive"
                    >
                      <Stop />
                      Stop
                    </Button>
                  </>
                )}
                
                {executionState === 'paused' && (
                  <>
                    <Button
                      onClick={handleResume}
                      variant="default"
                      className="flex-1"
                    >
                      <Play />
                      Resume ({currentIndex} / {csvData?.rows.length || 0})
                    </Button>
                    <Button
                      onClick={handleStop}
                      variant="destructive"
                    >
                      <Stop />
                      Stop
                    </Button>
                  </>
                )}
                
                {executionState === 'stopping' && (
                  <Button
                    disabled
                    variant="destructive"
                    className="flex-1"
                  >
                    <Stop />
                    Stopping...
                  </Button>
                )}
              </div>

              {loading && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Import Progress</Label>
                    <div className="flex items-center gap-3">
                      {processingSpeed > 0 && (
                        <Badge variant="outline" className="flex items-center gap-1 font-mono">
                          <Gauge size={14} />
                          {processingSpeed} records/min
                        </Badge>
                      )}
                      {estimatedTimeRemaining !== null && estimatedTimeRemaining > 0 && (
                        <Badge variant="secondary" className="font-mono">
                          ~{estimatedTimeRemaining < 60 
                            ? `${estimatedTimeRemaining}s` 
                            : `${Math.floor(estimatedTimeRemaining / 60)}m ${estimatedTimeRemaining % 60}s`} remaining
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Progress value={progress} />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{Math.round(progress)}%</span>
                    <span>{currentIndex} / {csvData?.rows.length || 0} records</span>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{dryRun ? 'Preview Results' : 'Import Results'}</CardTitle>
                <CardDescription>
                  {results.filter(r => r.action === 'created').length} {dryRun ? 'would create' : 'created'}, 
                  {' '}{results.filter(r => r.action === 'updated').length} {dryRun ? 'would update' : 'updated'},
                  {' '}{results.filter(r => r.action === 'skipped').length} {dryRun ? 'would skip' : 'skipped'},
                  {' '}{results.filter(r => r.status === 'error').length} errors
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    try {
                      exportToCSV(results, `csv_import_results_${Date.now()}.csv`)
                      toast.success(`Exported ${results.length} import results to CSV`)
                      onLog('Export', 'success', `Exported ${results.length} import results to CSV`, { count: results.length })
                    } catch (error) {
                      console.error('CSV export error:', error)
                      toast.error(`Failed to export CSV: ${error}`)
                      onLog('Export', 'error', `CSV export failed`, { error: String(error) })
                    }
                  }}
                >
                  <DownloadSimple />
                  Export CSV
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    try {
                      exportToJSON(results, `csv_import_results_${Date.now()}.json`)
                      toast.success(`Exported ${results.length} import results to JSON`)
                      onLog('Export', 'success', `Exported ${results.length} import results to JSON`, { count: results.length })
                    } catch (error) {
                      console.error('JSON export error:', error)
                      toast.error(`Failed to export JSON: ${error}`)
                      onLog('Export', 'error', `JSON export failed`, { error: String(error) })
                    }
                  }}
                >
                  <DownloadSimple />
                  Export JSON
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {results.map((result) => (
                  <div key={result.row} className="space-y-2">
                    <div className="flex items-center gap-2 p-2 rounded border">
                      {result.status === 'success' ? (
                        result.action === 'updated' ? (
                          <CheckCircle className="text-blue-500" size={20} />
                        ) : result.action === 'created' ? (
                          <Plus className="text-green-500" size={20} />
                        ) : (
                          <CheckCircle className="text-muted-foreground" size={20} />
                        )
                      ) : (
                        <XCircle className="text-destructive" size={20} />
                      )}
                      <span className="font-mono text-sm">Row {result.row}:</span>
                      <span className="text-sm flex-1">{result.message}</span>
                      <Badge 
                        variant={
                          result.action === 'created' ? 'default' : 
                          result.action === 'updated' ? 'secondary' : 
                          result.status === 'error' ? 'destructive' : 
                          'outline'
                        }
                      >
                        {result.action || result.status}
                      </Badge>
                    </div>
                    {dryRun && result.data && (
                      <div className="ml-8 p-2 bg-muted/50 rounded text-xs font-mono">
                        {result.action === 'updated' && result.data.existing && result.data.changes ? (
                          <div className="space-y-1">
                            <div className="font-semibold text-muted-foreground">Changes:</div>
                            {Object.entries(result.data.changes).map(([key, value]) => (
                              <div key={key}>
                                <span className="text-muted-foreground">{key}:</span>{' '}
                                <span className="text-destructive line-through">{formatFieldValue(result.data.existing[key])}</span>
                                {' → '}
                                <span className="text-accent font-semibold">{formatFieldValue(value)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="font-semibold text-muted-foreground">New record data:</div>
                            {Object.entries(result.data).map(([key, value]) => (
                              <div key={key}>
                                <span className="text-muted-foreground">{key}:</span>{' '}
                                <span className="text-accent">{formatFieldValue(value)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
            {dryRun && results.length > 0 && (
              <Button
                onClick={() => {
                  setDryRun(false)
                  executeImport()
                }}
                disabled={loading}
                className="w-full"
              >
                <Lightning />
                Execute Import Now
              </Button>
            )}
            {!dryRun && lastSnapshotId && results.filter(r => r.action === 'updated').length > 0 && (
              <Button
                onClick={() => rollbackSnapshot(lastSnapshotId)}
                disabled={loading}
                variant="destructive"
                className="w-full"
              >
                <ArrowCounterClockwise />
                Rollback Last Import
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {snapshots && snapshots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowCounterClockwise className="text-accent" size={20} />
              Rollback History
            </CardTitle>
            <CardDescription>
              Previous imports that can be rolled back (last 50 shown)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {snapshots.map((snapshot) => (
                  <Card key={snapshot.id} className="p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            {snapshot.entity}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(snapshot.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm">{snapshot.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {snapshot.updates.length} record{snapshot.updates.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => rollbackSnapshot(snapshot.id)}
                        disabled={loading}
                      >
                        <ArrowCounterClockwise size={16} />
                        Rollback
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      <ManualEntityDialog
        open={manualEntityDialogOpen}
        onOpenChange={setManualEntityDialogOpen}
        onEntityAdded={(entityName) => {
          addEntity(entityName)
          setEntity(entityName)
        }}
        existingEntities={entities}
      />
    </div>
  )
}
