import { useState, useRef, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Stack, Upload, Plus, Trash, Lightning, FileArrowUp, ArrowsClockwise, Eye, ArrowCounterClockwise, ListBullets, TreeStructure, Pause, Play, Stop } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { parseCSV } from '@/lib/csv-utils'
import { formatFieldLabel } from '@/lib/utils'
import { useEntityMetadata } from '@/hooks/use-entity-metadata'
import { useEntities } from '@/hooks/use-entities'
import { ValidatedFieldInput } from '@/components/ValidatedFieldInput'
import { ToManyFieldInput } from '@/components/ToManyFieldInput'
import { ManualEntityDialog } from '@/components/ManualEntityDialog'
import { ConditionalAssociationBuilder, type ConditionalAssociation } from '@/components/ConditionalAssociationBuilder'
import { getAssociationsForRecord, mergeAssociationActions, describeAssociation } from '@/lib/conditional-logic'
import { FilterGroupBuilder } from '@/components/FilterGroupBuilder'
import type { QueryFilter, UpdateSnapshot, FilterGroup, ExecutionState } from '@/lib/types'

interface SmartStackProps {
  onLog: (operation: string, status: 'success' | 'error', message: string, details?: any) => void
}

interface FieldUpdate {
  id: string
  field: string
  value: string
}

interface PreviewRecord {
  id: string
  willUpdate: boolean
  reason?: string
  currentValues: Record<string, any>
  newValues: Record<string, any>
}

interface PersistedSmartStackState {
  csvIds: string[]
  csvFileName: string
  selectedEntity: string
  filters: QueryFilter[]
  filterGroups: FilterGroup[]
  groupLogic: 'AND' | 'OR'
  filterMode: 'simple' | 'grouped'
  fieldUpdates: FieldUpdate[]
  dryRun: boolean
  currentIndex: number
  results: { success: number; failed: number; errors: string[] }
  previewData: PreviewRecord[]
  progress: number
  conditionalAssociations: ConditionalAssociation[]
  useConditionalLogic: boolean
  timestamp: number
}

export function SmartStack({ onLog }: SmartStackProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [csvIds, setCsvIds] = useState<string[]>([])
  const [csvFileName, setCsvFileName] = useState<string>('')
  const [selectedEntity, setSelectedEntity] = useState<string>('')
  const [filters, setFilters] = useState<QueryFilter[]>([])
  const [filterGroups, setFilterGroups] = useState<FilterGroup[]>([])
  const [groupLogic, setGroupLogic] = useState<'AND' | 'OR'>('AND')
  const [filterMode, setFilterMode] = useState<'simple' | 'grouped'>('simple')
  const [fieldUpdates, setFieldUpdates] = useState<FieldUpdate[]>([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<{ success: number; failed: number; errors: string[] }>({
    success: 0,
    failed: 0,
    errors: []
  })
  const [dryRun, setDryRun] = useState(true)
  const [previewData, setPreviewData] = useState<PreviewRecord[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [manualEntityDialogOpen, setManualEntityDialogOpen] = useState(false)
  const [snapshots, setSnapshots] = useKV<UpdateSnapshot[]>('smartstack-snapshots', [])
  const [lastSnapshotId, setLastSnapshotId] = useState<string | null>(null)
  const [conditionalAssociations, setConditionalAssociations] = useState<ConditionalAssociation[]>([])
  const [useConditionalLogic, setUseConditionalLogic] = useState(false)
  
  const [executionState, setExecutionState] = useState<ExecutionState>('idle')
  const [currentIndex, setCurrentIndex] = useState(0)
  const executionControlRef = useRef<{ shouldPause: boolean; shouldStop: boolean }>({
    shouldPause: false,
    shouldStop: false
  })
  
  const [persistedState, setPersistedState, deletePersistedState] = useKV<PersistedSmartStackState | null>('smartstack-paused-state', null)
  const [showRestorePrompt, setShowRestorePrompt] = useState(false)

  const { entities, loading: entitiesLoading, refresh: refreshEntities, addEntity } = useEntities()
  const { metadata, loading: metadataLoading, error: metadataError } = useEntityMetadata(selectedEntity || undefined)
  
  const availableFields = metadata?.fields || []
  const fieldsMap = metadata?.fieldsMap || {}
  
  useEffect(() => {
    if (persistedState && csvIds.length === 0) {
      const ageInMinutes = (Date.now() - persistedState.timestamp) / 1000 / 60
      if (ageInMinutes < 1440) {
        setShowRestorePrompt(true)
      } else {
        deletePersistedState()
      }
    }
  }, [persistedState, csvIds, deletePersistedState])
  
  const restorePersistedState = () => {
    if (!persistedState) return
    
    setCsvIds(persistedState.csvIds)
    setCsvFileName(persistedState.csvFileName)
    setSelectedEntity(persistedState.selectedEntity)
    setFilters(persistedState.filters)
    setFilterGroups(persistedState.filterGroups)
    setGroupLogic(persistedState.groupLogic)
    setFilterMode(persistedState.filterMode)
    setFieldUpdates(persistedState.fieldUpdates)
    setDryRun(persistedState.dryRun)
    setCurrentIndex(persistedState.currentIndex)
    setResults(persistedState.results)
    setPreviewData(persistedState.previewData)
    setProgress(persistedState.progress)
    setConditionalAssociations(persistedState.conditionalAssociations)
    setUseConditionalLogic(persistedState.useConditionalLogic)
    setExecutionState('paused')
    setShowRestorePrompt(false)
    
    toast.success(`Restored paused SmartStack: ${persistedState.currentIndex} of ${persistedState.csvIds.length} records processed`)
  }
  
  const discardPersistedState = () => {
    deletePersistedState()
    setShowRestorePrompt(false)
    toast.info('Discarded paused SmartStack')
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setCsvFileName(file.name)

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const { headers, rows } = parseCSV(text)

      if (rows.length === 0) {
        toast.error('CSV file is empty')
        return
      }

      const ids: string[] = []
      rows.forEach(row => {
        if (row[0] && row[0].trim()) {
          ids.push(row[0].trim())
        }
      })

      if (ids.length === 0) {
        toast.error('No valid IDs found in CSV')
        return
      }

      setCsvIds(ids)
      toast.success(`Loaded ${ids.length} IDs from CSV`)
      
      onLog(
        'SmartStack CSV Upload',
        'success',
        `Loaded ${ids.length} IDs`,
        { filename: file.name, count: ids.length }
      )
    }

    reader.onerror = () => {
      toast.error('Failed to read CSV file')
    }

    reader.readAsText(file)
  }

  const addFilter = () => {
    setFilters([
      ...filters,
      { field: '', operator: 'equals', value: '' }
    ])
  }

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index))
  }

  const updateFilter = (index: number, updates: Partial<QueryFilter>) => {
    setFilters(filters.map((filter, i) => 
      i === index ? { ...filter, ...updates } : filter
    ))
  }

  const addFieldUpdate = () => {
    setFieldUpdates([
      ...fieldUpdates,
      { id: `field-${Date.now()}`, field: '', value: '' }
    ])
  }

  const removeFieldUpdate = (id: string) => {
    setFieldUpdates(fieldUpdates.filter(f => f.id !== id))
  }

  const updateFieldUpdate = (id: string, updates: Partial<FieldUpdate>) => {
    setFieldUpdates(fieldUpdates.map(f => 
      f.id === id ? { ...f, ...updates } : f
    ))
  }

  const handlePause = () => {
    executionControlRef.current.shouldPause = true
    setExecutionState('paused')
    toast.info('Pausing after current record completes...')
  }

  const handleResume = () => {
    executionControlRef.current.shouldPause = false
    setExecutionState('running')
    executeSmartStack(true)
  }

  const handleStop = () => {
    executionControlRef.current.shouldStop = true
    setExecutionState('stopping')
    toast.info('Stopping after current record completes...')
  }

  const executeSmartStack = async (isResume: boolean = false) => {
    if (csvIds.length === 0) {
      toast.error('Please upload a CSV file with IDs')
      return
    }

    if (!selectedEntity) {
      toast.error('Please select an entity type')
      return
    }

    if (fieldUpdates.length === 0) {
      toast.error('Please add at least one field to update')
      return
    }

    const invalidUpdates = fieldUpdates.filter(u => !u.field || !u.value)
    if (invalidUpdates.length > 0) {
      toast.error('All field updates must have both field and value')
      return
    }

    if (!isResume) {
      setCurrentIndex(0)
      setPreviewData([])
      setShowPreview(false)
      executionControlRef.current = { shouldPause: false, shouldStop: false }
    }
    
    setExecutionState('running')
    setLoading(true)
    if (!isResume) {
      setProgress(0)
      setResults({ success: 0, failed: 0, errors: [] })
    }

    const startTime = Date.now()
    let successCount = isResume ? results.success : 0
    let failedCount = isResume ? results.failed : 0
    const errors: string[] = isResume ? [...results.errors] : []
    const preview: PreviewRecord[] = isResume ? [...previewData] : []
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

    try {
      const fieldsToFetch = Array.from(new Set([
        'id',
        ...filters.filter(f => f.field).map(f => f.field),
        ...fieldUpdates.map(u => u.field)
      ]))

      const startIndex = isResume ? currentIndex : 0

      for (let i = startIndex; i < csvIds.length; i++) {
        if (executionControlRef.current.shouldStop) {
          setExecutionState('stopped')
          setLoading(false)
          deletePersistedState()
          toast.warning(`SmartStack stopped at record ${i + 1} of ${csvIds.length}`)
          onLog(
            'SmartStack Stopped',
            'success',
            `Stopped at record ${i + 1}: ${successCount} success, ${failedCount} failed`,
            { entity: selectedEntity, currentRecord: i + 1, totalRecords: csvIds.length }
          )
          return
        }

        if (executionControlRef.current.shouldPause) {
          setCurrentIndex(i)
          setResults({ success: successCount, failed: failedCount, errors })
          setPreviewData(preview)
          setLoading(false)
          
          const state: PersistedSmartStackState = {
            csvIds,
            csvFileName,
            selectedEntity,
            filters,
            filterGroups,
            groupLogic,
            filterMode,
            fieldUpdates,
            dryRun,
            currentIndex: i,
            results: { success: successCount, failed: failedCount, errors },
            previewData: preview,
            progress: ((i) / csvIds.length) * 100,
            conditionalAssociations,
            useConditionalLogic,
            timestamp: Date.now()
          }
          setPersistedState(() => state)
          
          toast.info(`SmartStack paused at record ${i + 1} of ${csvIds.length}. Progress saved - safe to refresh page.`)
          onLog(
            'SmartStack Paused',
            'success',
            `Paused at record ${i + 1}: ${successCount} success, ${failedCount} failed`,
            { entity: selectedEntity, currentRecord: i + 1, totalRecords: csvIds.length }
          )
          return
        }

        setCurrentIndex(i + 1)
        const id = csvIds[i]
        const numericId = parseInt(id)

        if (isNaN(numericId)) {
          errors.push(`Invalid ID: ${id}`)
          failedCount++
          if (dryRun) {
            preview.push({
              id,
              willUpdate: false,
              reason: 'Invalid ID',
              currentValues: {},
              newValues: {}
            })
          }
          continue
        }

        let updateData: any = {}
        let toManyUpdates: Array<{ field: string; operation: string; ids: number[]; subField?: string }> = []

        try {
          const entity = await bullhornAPI.getEntity(selectedEntity, numericId, fieldsToFetch)
          
          if (!entity || !entity.data) {
            errors.push(`Entity not found: ${id}`)
            failedCount++
            if (dryRun) {
              preview.push({
                id,
                willUpdate: false,
                reason: 'Entity not found',
                currentValues: {},
                newValues: {}
              })
            }
            continue
          }

          let passesFilters = true
          
          if (filterMode === 'simple') {
            const validFilters = filters.filter(f => f.field && f.value)
            
            if (validFilters.length > 0) {
              passesFilters = validFilters.every(filter => {
                const fieldValue = entity.data[filter.field]
                const filterValue = filter.value

                switch (filter.operator) {
                  case 'equals':
                    return String(fieldValue) === filterValue
                  case 'not_equals':
                    return String(fieldValue) !== filterValue
                  case 'contains':
                    return String(fieldValue).toLowerCase().includes(filterValue.toLowerCase())
                  case 'greater_than':
                    return Number(fieldValue) > Number(filterValue)
                  case 'less_than':
                    return Number(fieldValue) < Number(filterValue)
                  case 'is_null':
                    return fieldValue === null || fieldValue === undefined
                  case 'is_not_null':
                    return fieldValue !== null && fieldValue !== undefined
                  default:
                    return true
                }
              })
            }
          } else if (filterMode === 'grouped' && filterGroups.length > 0) {
            const groupResults = filterGroups.map(group => {
              return group.filters.every(filter => {
                if (!filter.field) return true
                
                const fieldValue = entity.data[filter.field]
                const filterValue = filter.value

                switch (filter.operator) {
                  case 'equals':
                    return String(fieldValue) === filterValue
                  case 'not_equals':
                    return String(fieldValue) !== filterValue
                  case 'contains':
                    return String(fieldValue).toLowerCase().includes(filterValue.toLowerCase())
                  case 'greater_than':
                    return Number(fieldValue) > Number(filterValue)
                  case 'less_than':
                    return Number(fieldValue) < Number(filterValue)
                  case 'is_null':
                    return fieldValue === null || fieldValue === undefined
                  case 'is_not_null':
                    return fieldValue !== null && fieldValue !== undefined
                  default:
                    return true
                }
              })
            })
            
            passesFilters = groupLogic === 'AND' 
              ? groupResults.every(r => r) 
              : groupResults.some(r => r)
          }

          if (!passesFilters) {
            if (dryRun) {
              preview.push({
                id,
                willUpdate: false,
                reason: 'Does not match filters',
                currentValues: entity.data,
                newValues: {}
              })
            }
            continue
          }
          
          fieldUpdates.forEach(update => {
            const fieldMeta = fieldsMap[update.field]
            
            if (fieldMeta?.associationType === 'TO_MANY') {
              try {
                const toManyValue = JSON.parse(update.value)
                if (toManyValue.operation && toManyValue.ids) {
                  toManyUpdates.push({
                    field: update.field,
                    operation: toManyValue.operation,
                    ids: toManyValue.ids,
                    subField: toManyValue.subField || 'id'
                  })
                }
              } catch {
                updateData[update.field] = update.value
              }
            } else if (fieldMeta?.associationType === 'TO_ONE') {
              const trimmedValue = update.value.trim()
              if (trimmedValue && /^\d+$/.test(trimmedValue)) {
                updateData[update.field] = { id: parseInt(trimmedValue, 10) }
              } else {
                updateData[update.field] = update.value
              }
            } else {
              updateData[update.field] = update.value
            }
          })

          if (useConditionalLogic && conditionalAssociations.length > 0) {
            const conditionalActions = getAssociationsForRecord(conditionalAssociations, entity.data)
            const mergedActions = mergeAssociationActions(conditionalActions)
            
            mergedActions.forEach((action, field) => {
              const existingUpdateIdx = toManyUpdates.findIndex(u => u.field === field)
              if (existingUpdateIdx >= 0) {
                toManyUpdates.splice(existingUpdateIdx, 1)
              }
              toManyUpdates.push({
                field: action.field,
                operation: action.operation,
                ids: action.ids,
                subField: 'id'
              })
            })
          }

          if (dryRun) {
            const previewNewValues: any = {}
            
            for (const key of Object.keys(updateData)) {
              const fieldMeta = fieldsMap[key]
              if (fieldMeta?.associationType === 'TO_ONE' && updateData[key]?.id) {
                try {
                  const associatedEntity = fieldMeta.associatedEntity?.entity
                  if (associatedEntity) {
                    const lookupResult = await bullhornAPI.getEntity(
                      associatedEntity, 
                      updateData[key].id, 
                      ['id', 'name', 'title', 'firstName', 'lastName']
                    )
                    if (lookupResult?.data) {
                      const title = lookupResult.data.title || 
                                   lookupResult.data.name || 
                                   (lookupResult.data.firstName && lookupResult.data.lastName 
                                     ? `${lookupResult.data.firstName} ${lookupResult.data.lastName}` 
                                     : undefined)
                      previewNewValues[key] = {
                        id: updateData[key].id,
                        title: title || '(No title)'
                      }
                    } else {
                      previewNewValues[key] = updateData[key]
                    }
                  } else {
                    previewNewValues[key] = updateData[key]
                  }
                } catch {
                  previewNewValues[key] = updateData[key]
                }
              } else {
                previewNewValues[key] = updateData[key]
              }
            }
            
            toManyUpdates.forEach(tmu => {
              const subFieldInfo = tmu.subField && tmu.subField !== 'id' ? ` (${tmu.subField})` : ''
              previewNewValues[tmu.field] = `${tmu.operation}: [${tmu.ids.join(', ')}]${subFieldInfo}`
            })
            
            preview.push({
              id,
              willUpdate: true,
              currentValues: entity.data,
              newValues: previewNewValues
            })
            successCount++
          } else {
            snapshotUpdates.push({
              entityId: numericId,
              previousValues: entity.data,
              newValues: updateData
            })
            
            if (Object.keys(updateData).length > 0) {
              await bullhornAPI.updateEntity(selectedEntity, numericId, updateData)
            }
            
            for (const toManyUpdate of toManyUpdates) {
              const result = await bullhornAPI.updateToManyAssociation(
                selectedEntity,
                numericId,
                toManyUpdate.field,
                toManyUpdate.ids,
                toManyUpdate.operation as 'add' | 'remove' | 'replace',
                toManyUpdate.subField || 'id'
              )
              
              if (result?.changeType === 'ASSOCIATE_INVERSE' || result?.changeType === 'DISASSOCIATE_INVERSE') {
                toast.success(result.message)
              }
            }
            
            successCount++
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Update failed'
          errors.push(`ID ${id}: ${errorMessage}`)
          failedCount++
          if (dryRun) {
            preview.push({
              id,
              willUpdate: false,
              reason: errorMessage,
              currentValues: {},
              newValues: {}
            })
          } else {
            failedOperations.push({
              entityId: numericId,
              operation: 'update',
              data: updateData,
              error: errorMessage,
              toManyUpdates: toManyUpdates.length > 0 ? toManyUpdates : undefined
            })
          }
        }

        setProgress(((i + 1) / csvIds.length) * 100)
        setResults({ success: successCount, failed: failedCount, errors })
      }

      const duration = Date.now() - startTime
      
      setExecutionState('idle')
      setCurrentIndex(0)

      if (dryRun) {
        setPreviewData(preview)
        setShowPreview(true)
        toast.success(`Dry run complete: ${successCount} records would be updated`)
        onLog(
          'SmartStack Dry Run',
          'success',
          `Preview complete: ${successCount} would update, ${failedCount} would fail/skip in ${duration}ms`,
          {
            entity: selectedEntity,
            totalIds: csvIds.length,
            wouldUpdate: successCount,
            wouldSkip: failedCount,
            filters,
            updates: fieldUpdates
          }
        )
      } else {
        if (snapshotUpdates.length > 0) {
          const snapshot: UpdateSnapshot = {
            id: `snapshot-${Date.now()}`,
            timestamp: Date.now(),
            operation: 'smartstack',
            entity: selectedEntity,
            description: `SmartStack: ${successCount} updated records`,
            updates: snapshotUpdates
          }
          setSnapshots((current) => [snapshot, ...(current || [])].slice(0, 50))
          setLastSnapshotId(snapshot.id)
        }

        onLog(
          'SmartStack Execution',
          successCount > 0 ? 'success' : 'error',
          `Completed: ${successCount} success, ${failedCount} failed in ${duration}ms`,
          {
            entity: selectedEntity,
            totalIds: csvIds.length,
            success: successCount,
            failed: failedCount,
            filters: filters,
            updates: fieldUpdates,
            errors: errors,
            rollbackData: snapshotUpdates.length > 0 ? {
              updates: snapshotUpdates.map(u => ({
                entityId: u.entityId,
                previousValues: u.previousValues
              }))
            } : undefined,
            failedOperations: failedOperations.length > 0 ? failedOperations : undefined
          }
        )

        if (successCount > 0) {
          toast.success(`Updated ${successCount} records successfully`)
        }
        if (failedCount > 0) {
          toast.error(`${failedCount} updates failed`)
        }
      }

    } catch (error) {
      toast.error('SmartStack execution failed')
      onLog(
        'SmartStack Execution',
        'error',
        error instanceof Error ? error.message : 'Execution failed',
        { entity: selectedEntity }
      )
    } finally {
      setLoading(false)
      setExecutionState('idle')
      setCurrentIndex(0)
      deletePersistedState()
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
        'SmartStack Rollback',
        'success',
        `Rolled back ${successCount} records`,
        { snapshotId, entity: snapshot.entity }
      )
    } else {
      toast.error(`Rollback completed with ${errorCount} errors. ${successCount} records restored.`)
      onLog(
        'SmartStack Rollback',
        'error',
        `Partial rollback: ${successCount} success, ${errorCount} errors`,
        { snapshotId, entity: snapshot.entity }
      )
    }
  }
  
  const resetStack = () => {
    setCsvIds([])
    setCsvFileName('')
    setSelectedEntity('')
    setFilters([])
    setFieldUpdates([])
    setProgress(0)
    setResults({ success: 0, failed: 0, errors: [] })
    setPreviewData([])
    setShowPreview(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6">
      {showRestorePrompt && persistedState && (
        <Card className="border-accent bg-accent/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-accent">
              <Play className="text-accent" size={24} />
              Resume Paused SmartStack
            </CardTitle>
            <CardDescription>
              Found a paused SmartStack operation from {new Date(persistedState.timestamp).toLocaleString()} - 
              {' '}{persistedState.currentIndex} of {persistedState.csvIds.length} records processed 
              ({Math.round((persistedState.currentIndex / persistedState.csvIds.length) * 100)}% complete)
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button onClick={restorePersistedState} className="flex-1">
              <Play />
              Resume SmartStack
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
            <Stack className="text-accent" size={24} />
            SmartStack v2
          </CardTitle>
          <CardDescription>
            Upload CSV with IDs, select entity, build filters, and bulk update fields
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Step 1: Upload CSV with IDs</Label>
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="flex-1"
                >
                  <Upload />
                  {csvFileName || 'Choose CSV File'}
                </Button>
                {csvIds.length > 0 && (
                  <Badge variant="secondary" className="px-4 py-2 text-base">
                    {csvIds.length} IDs loaded
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                CSV should have IDs in the first column
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Step 2: Select Entity Type</Label>
                {!entitiesLoading && entities.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">{entities.length} entities</Badge>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={refreshEntities}
                      className="h-6 px-2"
                      title="Refresh entity list"
                    >
                      <ArrowsClockwise size={14} />
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
                  <Button size="sm" variant="outline" onClick={refreshEntities}>
                    <ArrowsClockwise size={14} />
                    Load Entities
                  </Button>
                </div>
              ) : (
                <Select value={selectedEntity} onValueChange={setSelectedEntity} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select entity type" />
                  </SelectTrigger>
                  <SelectContent>
                    {entities.map((entity) => (
                      <SelectItem key={entity} value={entity}>
                        {entity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {metadataError && selectedEntity && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
                  Failed to load entity metadata: {metadataError}
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Step 3: Add Query Filters (Optional)</Label>
                <div className="flex items-center gap-2">
                  <Tabs value={filterMode} onValueChange={(v) => setFilterMode(v as 'simple' | 'grouped')}>
                    <TabsList className="h-8">
                      <TabsTrigger value="simple" className="gap-1 text-xs h-7 px-2">
                        <ListBullets size={14} />
                        Simple
                      </TabsTrigger>
                      <TabsTrigger value="grouped" className="gap-1 text-xs h-7 px-2">
                        <TreeStructure size={14} />
                        Grouped
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  {filterMode === 'simple' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={addFilter}
                      disabled={loading || !selectedEntity || metadataLoading}
                    >
                      <Plus size={16} />
                      Add Filter
                    </Button>
                  )}
                </div>
              </div>
              {metadataLoading && selectedEntity ? (
                <Skeleton className="h-20 w-full" />
              ) : filterMode === 'simple' ? (
                filters.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No filters - all IDs from CSV will be updated
                  </p>
                ) : (
                  <div className="space-y-2">
                    {filters.map((filter, index) => (
                      <Card key={index} className="p-3">
                        <div className="flex gap-2">
                          <Select
                            value={filter.field || undefined}
                            onValueChange={(v) => updateFilter(index, { field: v })}
                            disabled={loading}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Field name" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableFields.map((field) => (
                                <SelectItem key={field.name} value={field.name}>
                                  {formatFieldLabel(field.label, field.name)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={filter.operator}
                            onValueChange={(v) => updateFilter(index, { operator: v })}
                            disabled={loading}
                          >
                            <SelectTrigger className="w-[150px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="equals">Equals</SelectItem>
                              <SelectItem value="not_equals">Not Equals</SelectItem>
                              <SelectItem value="contains">Contains</SelectItem>
                              <SelectItem value="greater_than">Greater Than</SelectItem>
                              <SelectItem value="less_than">Less Than</SelectItem>
                              <SelectItem value="is_null">Is Null</SelectItem>
                              <SelectItem value="is_not_null">Is Not Null</SelectItem>
                            </SelectContent>
                          </Select>
                          <ValidatedFieldInput
                            field={fieldsMap[filter.field] || null}
                            value={filter.value}
                            onChange={(v) => updateFilter(index, { value: v })}
                            disabled={loading || filter.operator === 'is_null' || filter.operator === 'is_not_null'}
                            placeholder="Value"
                            className="flex-1"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeFilter(index)}
                            disabled={loading}
                            className="text-destructive"
                          >
                            <Trash size={18} />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )
              ) : (
                <FilterGroupBuilder
                  groups={filterGroups}
                  onGroupsChange={setFilterGroups}
                  groupLogic={groupLogic}
                  onGroupLogicChange={setGroupLogic}
                  availableFields={availableFields}
                  fieldsMap={fieldsMap}
                />
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Step 4: Field Updates</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addFieldUpdate}
                  disabled={loading || !selectedEntity || metadataLoading}
                >
                  <Plus size={16} />
                  Add Field
                </Button>
              </div>
              {metadataLoading && selectedEntity ? (
                <Skeleton className="h-20 w-full" />
              ) : fieldUpdates.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Add fields to update
                </p>
              ) : (
                <div className="space-y-2">
                  {fieldUpdates.map((update) => {
                    const fieldMeta = fieldsMap[update.field]
                    const isToMany = fieldMeta?.associationType === 'TO_MANY'
                    
                    return (
                      <Card key={update.id} className="p-3">
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <Select
                              value={update.field || undefined}
                              onValueChange={(v) => updateFieldUpdate(update.id, { field: v })}
                              disabled={loading}
                            >
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Field name (e.g., status)" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableFields.map((field) => (
                                  <SelectItem key={field.name} value={field.name}>
                                    {formatFieldLabel(field.label, field.name)} {field.associationType === 'TO_MANY' ? '(To-Many)' : ''}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => removeFieldUpdate(update.id)}
                              disabled={loading}
                              className="text-destructive"
                            >
                              <Trash size={18} />
                            </Button>
                          </div>
                          {isToMany ? (
                            <ToManyFieldInput
                              field={fieldMeta}
                              value={update.value}
                              onChange={(v) => updateFieldUpdate(update.id, { value: v })}
                              disabled={loading}
                            />
                          ) : (
                            <ValidatedFieldInput
                              field={fieldMeta || null}
                              value={update.value}
                              onChange={(v) => updateFieldUpdate(update.id, { value: v })}
                              disabled={loading}
                              placeholder="New value"
                            />
                          )}
                        </div>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-md border bg-card">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">
                    Use Conditional Association Logic
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Apply different associations based on field values
                  </p>
                </div>
                <Switch
                  checked={useConditionalLogic}
                  onCheckedChange={setUseConditionalLogic}
                  disabled={loading || !selectedEntity || metadataLoading}
                />
              </div>

              {useConditionalLogic && selectedEntity && !metadataLoading && (
                <ConditionalAssociationBuilder
                  fields={availableFields}
                  value={conditionalAssociations}
                  onChange={setConditionalAssociations}
                  disabled={loading}
                />
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-md border bg-card">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Eye size={16} />
                    Dry Run Mode
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Preview what will be updated without making changes
                  </p>
                </div>
                <Switch
                  checked={dryRun}
                  onCheckedChange={setDryRun}
                  disabled={loading}
                />
              </div>
            </div>

            <Separator />

            <div className="flex gap-2">
              {executionState === 'idle' || executionState === 'stopped' ? (
                <>
                  <Button
                    onClick={() => executeSmartStack(false)}
                    disabled={loading || csvIds.length === 0 || !selectedEntity || fieldUpdates.length === 0}
                    className="flex-1"
                    size="lg"
                    variant={dryRun ? "secondary" : "default"}
                  >
                    {loading ? (
                      <>
                        <ArrowsClockwise className="animate-spin" />
                        {dryRun ? 'Previewing...' : 'Processing...'}
                      </>
                    ) : dryRun ? (
                      <>
                        <Eye />
                        Preview Changes
                      </>
                    ) : (
                      <>
                        <Lightning />
                        Execute SmartStack
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={resetStack}
                    variant="outline"
                    disabled={loading}
                    size="lg"
                  >
                    Reset
                  </Button>
                </>
              ) : null}
              
              {executionState === 'running' && (
                <>
                  <Button
                    onClick={handlePause}
                    variant="outline"
                    size="lg"
                    className="flex-1"
                  >
                    <Pause />
                    Pause
                  </Button>
                  <Button
                    onClick={handleStop}
                    variant="destructive"
                    size="lg"
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
                    size="lg"
                    className="flex-1"
                  >
                    <Play />
                    Resume ({currentIndex} / {csvIds.length})
                  </Button>
                  <Button
                    onClick={handleStop}
                    variant="destructive"
                    size="lg"
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
                  size="lg"
                  className="flex-1"
                >
                  <Stop />
                  Stopping...
                </Button>
              )}
            </div>

            {loading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} />
                <div className="flex gap-4 text-sm">
                  <span className="text-green-600">Success: {results.success}</span>
                  <span className="text-destructive">Failed: {results.failed}</span>
                </div>
              </div>
            )}

            {!loading && (results.success > 0 || results.failed > 0) && (
              <Card className="p-4 bg-muted/50">
                <div className="space-y-3">
                  <div className="flex gap-4">
                    <Badge variant="default" className="bg-green-600">
                      {dryRun ? 'Would Update' : 'Success'}: {results.success}
                    </Badge>
                    <Badge variant="destructive">
                      {dryRun ? 'Would Skip/Fail' : 'Failed'}: {results.failed}
                    </Badge>
                  </div>
                  {results.errors.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm">Errors (showing first 10):</Label>
                      <ScrollArea className="h-32 rounded border bg-background p-2">
                        {results.errors.slice(0, 10).map((error, idx) => (
                          <div key={idx} className="text-xs text-destructive mb-1">
                            {error}
                          </div>
                        ))}
                      </ScrollArea>
                    </div>
                  )}
                  {!dryRun && lastSnapshotId && results.success > 0 && (
                    <Button
                      onClick={() => rollbackSnapshot(lastSnapshotId)}
                      disabled={loading}
                      variant="destructive"
                      className="w-full"
                    >
                      <ArrowCounterClockwise />
                      Rollback Last Execution
                    </Button>
                  )}
                </div>
              </Card>
            )}

            {showPreview && previewData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Preview Results</CardTitle>
                  <CardDescription>
                    Showing what would change if executed
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-24">ID</TableHead>
                          <TableHead className="w-32">Status</TableHead>
                          <TableHead>Current Values</TableHead>
                          <TableHead>New Values</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell className="font-mono text-xs">{record.id}</TableCell>
                            <TableCell>
                              {record.willUpdate ? (
                                <Badge variant="default" className="bg-green-600">
                                  Will Update
                                </Badge>
                              ) : (
                                <Badge variant="outline">
                                  Skip
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="max-w-xs">
                              {record.willUpdate ? (
                                <div className="space-y-1">
                                  {Object.keys(record.newValues).map(field => (
                                    <div key={field} className="text-xs">
                                      <span className="font-mono text-muted-foreground">{field}:</span>{' '}
                                      <span className="font-mono">{JSON.stringify(record.currentValues[field])}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">{record.reason}</span>
                              )}
                            </TableCell>
                            <TableCell className="max-w-xs">
                              {record.willUpdate && (
                                <div className="space-y-1">
                                  {Object.entries(record.newValues).map(([field, value]) => (
                                    <div key={field} className="text-xs">
                                      <span className="font-mono text-muted-foreground">{field}:</span>{' '}
                                      <span className="font-mono text-accent font-semibold">{JSON.stringify(value)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                  <div className="mt-4 flex gap-2">
                    <Button
                      onClick={() => {
                        setDryRun(false)
                        executeSmartStack()
                      }}
                      disabled={loading}
                      className="flex-1"
                    >
                      <Lightning />
                      Execute Now
                    </Button>
                    <Button
                      onClick={() => setShowPreview(false)}
                      variant="outline"
                    >
                      Close Preview
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>

      {snapshots && snapshots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowCounterClockwise className="text-accent" size={20} />
              Rollback History
            </CardTitle>
            <CardDescription>
              Previous executions that can be rolled back (last 50 shown)
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
          setSelectedEntity(entityName)
        }}
        existingEntities={entities}
      />
    </div>
  )
}

