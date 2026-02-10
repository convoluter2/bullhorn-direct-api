import { useState } from 'react'
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
import { 
  Stack, Plus, Trash, Lightning, MagnifyingGlass, 
  ArrowsClockwise, Eye, ArrowCounterClockwise, 
  ListBullets, TreeStructure, DownloadSimple, Clock
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { formatFieldLabel, formatFieldValue } from '@/lib/utils'
import { exportToCSV, exportToJSON } from '@/lib/csv-utils'
import { useEntityMetadata } from '@/hooks/use-entity-metadata'
import { useEntities } from '@/hooks/use-entities'
import { ValidatedFieldInput } from '@/components/ValidatedFieldInput'
import { ToManyFieldInput } from '@/components/ToManyFieldInput'
import { ManualEntityDialog } from '@/components/ManualEntityDialog'
import { FieldSelector } from '@/components/FieldSelector'
import { FilterGroupBuilder } from '@/components/FilterGroupBuilder'
import { ConditionalAssociationBuilder, type ConditionalAssociation } from '@/components/ConditionalAssociationBuilder'
import { AutoRefreshControl } from '@/components/AutoRefreshControl'
import { getAssociationsForRecord, mergeAssociationActions, describeAssociation } from '@/lib/conditional-logic'
import type { QueryFilter, QueryConfig, FilterGroup, UpdateSnapshot } from '@/lib/types'

interface QueryStackProps {
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

export function QueryStack({ onLog }: QueryStackProps) {
  const [entity, setEntity] = useState('')
  const [selectedFields, setSelectedFields] = useState<string[]>([])
  const [queryFilters, setQueryFilters] = useState<QueryFilter[]>([])
  const [queryFilterGroups, setQueryFilterGroups] = useState<FilterGroup[]>([])
  const [groupLogic, setGroupLogic] = useState<'AND' | 'OR'>('AND')
  const [filterMode, setFilterMode] = useState<'simple' | 'grouped'>('simple')
  const [count, setCount] = useState(500)
  const [orderBy, setOrderBy] = useState('')
  const [queryResults, setQueryResults] = useState<any[]>([])
  const [queryLoading, setQueryLoading] = useState(false)
  const [totalCount, setTotalCount] = useState<number>(0)
  const [showQueryPreview, setShowQueryPreview] = useState(false)
  
  const [targetEntity, setTargetEntity] = useState('')
  const [updateFilters, setUpdateFilters] = useState<QueryFilter[]>([])
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
  const [snapshots, setSnapshots] = useKV<UpdateSnapshot[]>('querystack-snapshots', [])
  const [lastSnapshotId, setLastSnapshotId] = useState<string | null>(null)
  const [conditionalAssociations, setConditionalAssociations] = useState<ConditionalAssociation[]>([])
  const [useConditionalLogic, setUseConditionalLogic] = useState(false)

  const { entities, loading: entitiesLoading, error: entitiesError, refresh: refreshEntities, refreshInBackground, addEntity, lastRefresh } = useEntities()
  const { metadata, loading: metadataLoading, error: metadataError } = useEntityMetadata(entity || undefined)
  const { metadata: targetMetadata, loading: targetMetadataLoading, error: targetMetadataError } = useEntityMetadata(targetEntity || undefined)

  const availableFields = metadata?.fields || []
  const fieldsMap = metadata?.fieldsMap || {}
  const targetAvailableFields = targetMetadata?.fields || []
  const targetFieldsMap = targetMetadata?.fieldsMap || {}

  const addQueryFilter = () => {
    setQueryFilters([...queryFilters, { field: '', operator: 'equals', value: '' }])
  }

  const removeQueryFilter = (index: number) => {
    setQueryFilters(queryFilters.filter((_, i) => i !== index))
  }

  const updateQueryFilter = (index: number, key: keyof QueryFilter, value: string) => {
    const newFilters = [...queryFilters]
    newFilters[index][key] = value
    setQueryFilters(newFilters)
  }

  const toggleField = (field: string) => {
    if (selectedFields.includes(field)) {
      setSelectedFields(selectedFields.filter(f => f !== field))
    } else {
      setSelectedFields([...selectedFields, field])
    }
  }

  const executeQuery = async () => {
    if (!entity) {
      toast.error('Please select an entity')
      return
    }

    if (selectedFields.length === 0) {
      toast.error('Please select at least one field')
      return
    }

    setQueryLoading(true)
    const startTime = Date.now()

    try {
      const config: QueryConfig = {
        entity,
        fields: [...selectedFields, 'id'],
        filters: filterMode === 'simple' ? queryFilters.filter(f => f.field && f.value) : [],
        filterGroups: filterMode === 'grouped' ? queryFilterGroups : undefined,
        groupLogic: filterMode === 'grouped' ? groupLogic : undefined,
        count: 5000,
        start: 0,
        orderBy: orderBy && orderBy !== '__none__' ? orderBy : undefined
      }

      const allData: any[] = []
      let start = 0
      const batchSize = 500
      let hasMore = true

      while (hasMore && allData.length < 5000) {
        config.start = start
        config.count = batchSize
        
        const result = await bullhornAPI.search(config)
        allData.push(...result.data)
        
        if (result.data.length < batchSize || allData.length >= result.total) {
          hasMore = false
        }
        
        start += batchSize
        
        if (result.total > batchSize) {
          toast.loading(`Loading batch: ${allData.length} of ${result.total}...`, { id: 'query-batch' })
        }
      }

      setQueryResults(allData)
      setTotalCount(allData.length)
      
      const duration = Date.now() - startTime
      toast.success(`Query completed: ${allData.length} records loaded in ${duration}ms`, { id: 'query-batch' })
      
      onLog(
        'QueryStack - Query',
        'success',
        `Queried ${entity}: ${allData.length} records`,
        { entity, fields: selectedFields, filterMode, filters: filterMode === 'simple' ? queryFilters : queryFilterGroups, count: allData.length }
      )
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Query failed'
      toast.error(errorMessage, { id: 'query-batch' })
      onLog('QueryStack - Query', 'error', errorMessage, { entity, filters: queryFilters })
    } finally {
      setQueryLoading(false)
    }
  }

  const addUpdateFilter = () => {
    setUpdateFilters([...updateFilters, { field: '', operator: 'equals', value: '' }])
  }

  const removeUpdateFilter = (index: number) => {
    setUpdateFilters(updateFilters.filter((_, i) => i !== index))
  }

  const updateUpdateFilter = (index: number, updates: Partial<QueryFilter>) => {
    setUpdateFilters(updateFilters.map((filter, i) => 
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

  const executeQueryStack = async () => {
    if (queryResults.length === 0) {
      toast.error('Please execute a query first to load records')
      return
    }

    const effectiveEntity = targetEntity || entity
    if (!effectiveEntity) {
      toast.error('Please select a target entity type')
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

    setLoading(true)
    setProgress(0)
    setResults({ success: 0, failed: 0, errors: [] })
    setPreviewData([])
    setShowPreview(false)

    const startTime = Date.now()
    let successCount = 0
    let failedCount = 0
    const errors: string[] = []
    const preview: PreviewRecord[] = []
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
        ...updateFilters.filter(f => f.field).map(f => f.field),
        ...fieldUpdates.map(u => u.field)
      ]))

      for (let i = 0; i < queryResults.length; i++) {
        const record = queryResults[i]
        const id = record.id
        const numericId = parseInt(id)
        
        let updateData: any = {}
        let toManyUpdates: Array<{ field: string; operation: string; ids: number[]; subField?: string }> = []

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

        try {
          const entityData = await bullhornAPI.getEntity(effectiveEntity, numericId, fieldsToFetch)
          
          if (!entityData || !entityData.data) {
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

          const validFilters = updateFilters.filter(f => f.field && f.value)
          let passesFilters = true
          
          if (validFilters.length > 0) {
            passesFilters = validFilters.every(filter => {
              const fieldValue = entityData.data[filter.field]
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

            if (!passesFilters) {
              if (dryRun) {
                preview.push({
                  id,
                  willUpdate: false,
                  reason: 'Does not match update filters',
                  currentValues: entityData.data,
                  newValues: {}
                })
              }
              continue
            }
          }

          fieldUpdates.forEach(update => {
            const fieldMeta = targetMetadata?.fieldsMap[update.field]
            
            if (update.value === '' || update.value.toLowerCase() === 'null') {
              updateData[update.field] = null
            } else if (fieldMeta?.associationType === 'TO_MANY') {
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
            } else if (fieldMeta?.type === 'Integer' || fieldMeta?.type === 'Double') {
              updateData[update.field] = Number(update.value)
            } else if (fieldMeta?.type === 'Boolean') {
              updateData[update.field] = update.value === 'true' || update.value === '1'
            } else {
              updateData[update.field] = update.value
            }
          })

          if (useConditionalLogic && conditionalAssociations.length > 0) {
            const conditionalActions = getAssociationsForRecord(conditionalAssociations, entityData.data)
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
              const fieldMeta = targetFieldsMap[key]
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
              currentValues: entityData.data,
              newValues: previewNewValues
            })
            successCount++
          } else {
            snapshotUpdates.push({
              entityId: numericId,
              previousValues: entityData.data,
              newValues: updateData
            })
            
            if (Object.keys(updateData).length > 0) {
              await bullhornAPI.updateEntity(effectiveEntity, numericId, updateData)
            }
            
            for (const toManyUpdate of toManyUpdates) {
              const result = await bullhornAPI.updateToManyAssociation(
                effectiveEntity,
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

        setProgress(((i + 1) / queryResults.length) * 100)
        setResults({ success: successCount, failed: failedCount, errors })
      }

      const duration = Date.now() - startTime

      if (dryRun) {
        setPreviewData(preview)
        setShowPreview(true)
        toast.success(`Dry run complete: ${successCount} records would be updated`)
        onLog(
          'QueryStack Dry Run',
          'success',
          `Preview complete: ${successCount} would update, ${failedCount} would fail/skip in ${duration}ms`,
          {
            queryEntity: entity,
            targetEntity: effectiveEntity,
            totalRecords: queryResults.length,
            wouldUpdate: successCount,
            wouldSkip: failedCount,
            updateFilters,
            updates: fieldUpdates
          }
        )
      } else {
        if (snapshotUpdates.length > 0) {
          const snapshot: UpdateSnapshot = {
            id: `snapshot-${Date.now()}`,
            timestamp: Date.now(),
            operation: 'smartstack',
            entity: effectiveEntity,
            description: `QueryStack: ${successCount} updated records`,
            updates: snapshotUpdates
          }
          setSnapshots((current) => [snapshot, ...(current || [])].slice(0, 50))
          setLastSnapshotId(snapshot.id)
        }

        onLog(
          'QueryStack Execution',
          successCount > 0 ? 'success' : 'error',
          `Completed: ${successCount} success, ${failedCount} failed in ${duration}ms`,
          {
            queryEntity: entity,
            targetEntity: effectiveEntity,
            totalRecords: queryResults.length,
            success: successCount,
            failed: failedCount,
            updateFilters,
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
      toast.error('QueryStack execution failed')
      onLog(
        'QueryStack Execution',
        'error',
        error instanceof Error ? error.message : 'Execution failed',
        { queryEntity: entity, targetEntity: effectiveEntity }
      )
    } finally {
      setLoading(false)
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
        'QueryStack Rollback',
        'success',
        `Rolled back ${successCount} records`,
        { snapshotId, entity: snapshot.entity }
      )
    } else {
      toast.error(`Rollback completed with ${errorCount} errors. ${successCount} records restored.`)
      onLog(
        'QueryStack Rollback',
        'error',
        `Partial rollback: ${successCount} success, ${errorCount} errors`,
        { snapshotId, entity: snapshot.entity }
      )
    }
  }

  const resetStack = () => {
    setQueryResults([])
    setTotalCount(0)
    setShowQueryPreview(false)
    setTargetEntity('')
    setUpdateFilters([])
    setFieldUpdates([])
    setProgress(0)
    setResults({ success: 0, failed: 0, errors: [] })
    setPreviewData([])
    setShowPreview(false)
  }

  return (
    <div className="space-y-6">
      <AutoRefreshControl 
        onRefresh={refreshInBackground} 
        configKey="querystack-entities-auto-refresh"
        compact={true}
      />
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stack className="text-accent" size={24} />
            QueryStack
          </CardTitle>
          <CardDescription>
            Build a query to select records, then apply bulk updates with filters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-base font-semibold">Step 1: Build Query to Select Records</Label>
              <Separator />
            </div>

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
                ) : entitiesError ? (
                  <div className="space-y-2">
                    <div className="text-sm text-destructive">{entitiesError}</div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        toast.loading('Retrying entity fetch...', { id: 'retry-entities' })
                        refreshEntities()
                        setTimeout(() => {
                          toast.success('Entity list loaded', { id: 'retry-entities' })
                        }, 500)
                      }}
                    >
                      <ArrowsClockwise size={16} className={entitiesLoading ? 'animate-spin' : ''} />
                      Retry
                    </Button>
                  </div>
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
                      <ArrowsClockwise size={16} className={entitiesLoading ? 'animate-spin' : ''} />
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
                <Label>Results Limit</Label>
                <Input
                  type="number"
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  min={1}
                  max={5000}
                  disabled
                />
                <p className="text-xs text-muted-foreground">Max 5000 records for bulk updates</p>
              </div>
            </div>

            {entity && (
              <>
                {metadataLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-32 w-full" />
                  </div>
                ) : metadataError ? (
                  <div className="text-destructive text-sm">
                    Failed to load entity metadata: {metadataError}
                  </div>
                ) : (
                  <>
                    <FieldSelector
                      fields={availableFields}
                      selectedFields={selectedFields}
                      onToggleField={toggleField}
                    />

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-base">Query Filters</Label>
                        <Tabs value={filterMode} onValueChange={(v) => setFilterMode(v as 'simple' | 'grouped')} className="w-auto">
                          <TabsList className="h-8">
                            <TabsTrigger value="simple" className="gap-1.5 text-xs px-3">
                              <ListBullets size={14} />
                              Simple
                            </TabsTrigger>
                            <TabsTrigger value="grouped" className="gap-1.5 text-xs px-3">
                              <TreeStructure size={14} />
                              Grouped
                            </TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </div>

                      {filterMode === 'simple' ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">All filters combined with AND</p>
                            <Button size="sm" variant="outline" onClick={addQueryFilter}>
                              <Plus size={16} />
                              Add Filter
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {queryFilters.map((filter, index) => (
                              <div key={index} className="flex gap-2 items-end">
                                <div className="flex-1 space-y-1">
                                  <Label className="text-xs">Field</Label>
                                  <Select value={filter.field || undefined} onValueChange={(v) => updateQueryFilter(index, 'field', v)}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Field" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {availableFields.map((field) => (
                                        <SelectItem key={field.name} value={field.name}>
                                          {formatFieldLabel(field.label, field.name)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="w-32 space-y-1">
                                  <Label className="text-xs">Operator</Label>
                                  <Select value={filter.operator} onValueChange={(v) => updateQueryFilter(index, 'operator', v)}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="equals">Equals</SelectItem>
                                      <SelectItem value="in_list_parens">In List (...)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex-1 space-y-1">
                                  <Label className="text-xs">Value</Label>
                                  <ValidatedFieldInput
                                    field={fieldsMap[filter.field] || null}
                                    value={filter.value}
                                    onChange={(v) => updateQueryFilter(index, 'value', v)}
                                    disabled={filter.operator === 'is_null' || filter.operator === 'is_not_null'}
                                    placeholder="Value"
                                  />
                                </div>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => removeQueryFilter(index)}
                                  className="text-destructive"
                                >
                                  <Trash size={18} />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <FilterGroupBuilder
                          groups={queryFilterGroups}
                          onGroupsChange={setQueryFilterGroups}
                          groupLogic={groupLogic}
                          onGroupLogicChange={setGroupLogic}
                          availableFields={availableFields}
                          fieldsMap={fieldsMap}
                          useProductionOperators={true}
                        />
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Order By (optional)</Label>
                      <Select value={orderBy || undefined} onValueChange={setOrderBy}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select field" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {availableFields.map((field) => (
                            <SelectItem key={field.name} value={field.name}>
                              {formatFieldLabel(field.label, field.name)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button 
                        onClick={executeQuery} 
                        disabled={queryLoading || selectedFields.length === 0 || loading} 
                        className="flex-1"
                      >
                        <MagnifyingGlass />
                        {queryLoading ? 'Querying...' : 'Execute Query'}
                      </Button>
                    </div>

                    {queryResults.length > 0 && (
                      <>
                        <Card className="bg-muted/50 border-accent">
                          <CardContent className="pt-6 space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="default" className="bg-green-600 text-base px-3 py-1">
                                  {totalCount} records loaded
                                </Badge>
                                <span className="text-sm text-muted-foreground">Ready for updates</span>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    try {
                                      exportToCSV(queryResults, `querystack_results_${Date.now()}.csv`)
                                      toast.success(`Exported ${queryResults.length} query results to CSV`)
                                      onLog('Export', 'success', `Exported ${queryResults.length} query results to CSV`, { count: queryResults.length })
                                    } catch (error) {
                                      console.error('CSV export error:', error)
                                      toast.error(`Failed to export CSV: ${error}`)
                                      onLog('Export', 'error', `CSV export failed`, { error: String(error) })
                                    }
                                  }}
                                >
                                  <DownloadSimple size={16} />
                                  CSV
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    try {
                                      exportToJSON(queryResults, `querystack_results_${Date.now()}.json`)
                                      toast.success(`Exported ${queryResults.length} query results to JSON`)
                                      onLog('Export', 'success', `Exported ${queryResults.length} query results to JSON`, { count: queryResults.length })
                                    } catch (error) {
                                      console.error('JSON export error:', error)
                                      toast.error(`Failed to export JSON: ${error}`)
                                      onLog('Export', 'error', `JSON export failed`, { error: String(error) })
                                    }
                                  }}
                                >
                                  <DownloadSimple size={16} />
                                  JSON
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setShowQueryPreview(!showQueryPreview)}
                                >
                                  <Eye size={16} />
                                  {showQueryPreview ? 'Hide' : 'Show'} Preview
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setQueryResults([])
                                    setTotalCount(0)
                                    setShowQueryPreview(false)
                                  }}
                                >
                                  Clear
                                </Button>
                              </div>
                            </div>
                            
                            {showQueryPreview && (
                              <div className="border rounded-lg bg-background">
                                <ScrollArea className="h-[300px]">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="w-20">ID</TableHead>
                                        {selectedFields.slice(0, 5).map(field => (
                                          <TableHead key={field}>{field}</TableHead>
                                        ))}
                                        {selectedFields.length > 5 && (
                                          <TableHead className="text-muted-foreground">
                                            +{selectedFields.length - 5} more
                                          </TableHead>
                                        )}
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {queryResults.slice(0, 100).map((record) => (
                                        <TableRow key={record.id}>
                                          <TableCell className="font-mono text-xs">{record.id}</TableCell>
                                          {selectedFields.slice(0, 5).map(field => (
                                            <TableCell key={field} className="text-xs max-w-[200px] truncate">
                                              {JSON.stringify(record[field]) || '-'}
                                            </TableCell>
                                          ))}
                                          {selectedFields.length > 5 && (
                                            <TableCell className="text-xs text-muted-foreground">...</TableCell>
                                          )}
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </ScrollArea>
                                {queryResults.length > 100 && (
                                  <div className="p-2 text-xs text-center text-muted-foreground border-t">
                                    Showing first 100 of {queryResults.length} records
                                  </div>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </>
                    )}
                  </>
                )}
              </>
            )}

            {queryResults.length > 0 && (
              <>
                <div className="space-y-2 pt-4">
                  <Label className="text-base font-semibold">Step 2: Configure Updates</Label>
                  <Separator />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Target Entity for Updates</Label>
                    {targetEntity && targetEntity !== entity && (
                      <Badge variant="outline" className="gap-1">
                        Cross-entity update
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Select value={targetEntity || entity} onValueChange={setTargetEntity}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select target entity" />
                      </SelectTrigger>
                      <SelectContent>
                        {entities.map((e) => (
                          <SelectItem key={e} value={e}>
                            {e}
                            {e === entity && ' (same as query)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {targetEntity && targetEntity !== entity && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setTargetEntity('')}
                      >
                        Reset
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {targetEntity && targetEntity !== entity
                      ? `Updates will be applied to ${targetEntity} entities using IDs from ${entity} query results`
                      : 'Updates will be applied to the same entity type as the query'}
                  </p>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Additional Update Filters (Optional)</Label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={addUpdateFilter}
                      disabled={loading || !targetEntity && !entity || (targetEntity ? targetMetadataLoading : metadataLoading)}
                    >
                      <Plus size={16} />
                      Add Filter
                    </Button>
                  </div>
                  {updateFilters.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No additional filters - all queried records will be updated
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {updateFilters.map((filter, index) => (
                        <Card key={index} className="p-3">
                          <div className="flex gap-2">
                            <Select
                              value={filter.field || undefined}
                              onValueChange={(v) => updateUpdateFilter(index, { field: v })}
                              disabled={loading}
                            >
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Field name" />
                              </SelectTrigger>
                              <SelectContent>
                                {(targetEntity ? targetAvailableFields : availableFields).map((field) => (
                                  <SelectItem key={field.name} value={field.name}>
                                    {formatFieldLabel(field.label, field.name)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select
                              value={filter.operator}
                              onValueChange={(v) => updateUpdateFilter(index, { operator: v })}
                              disabled={loading}
                            >
                              <SelectTrigger className="w-[150px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="equals">Equals</SelectItem>
                                <SelectItem value="in_list_parens">In List (...)</SelectItem>
                              </SelectContent>
                            </Select>
                            <ValidatedFieldInput
                              field={(targetEntity ? targetFieldsMap : fieldsMap)[filter.field] || null}
                              value={filter.value}
                              onChange={(v) => updateUpdateFilter(index, { value: v })}
                              disabled={loading || filter.operator === 'is_null' || filter.operator === 'is_not_null'}
                              placeholder="Value"
                              className="flex-1"
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => removeUpdateFilter(index)}
                              disabled={loading}
                              className="text-destructive"
                            >
                              <Trash size={18} />
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Field Updates</Label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={addFieldUpdate}
                      disabled={loading || !targetEntity && !entity || (targetEntity ? targetMetadataLoading : metadataLoading)}
                    >
                      <Plus size={16} />
                      Add Field
                    </Button>
                  </div>
                  {fieldUpdates.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Add fields to update
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {fieldUpdates.map((update) => {
                        const fieldMeta = (targetEntity ? targetFieldsMap : fieldsMap)[update.field]
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
                                    <SelectValue placeholder="Field name" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(targetEntity ? targetAvailableFields : availableFields).map((field) => (
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
                      disabled={loading || (!targetEntity && !entity) || (targetEntity ? targetMetadataLoading : metadataLoading)}
                    />
                  </div>

                  {useConditionalLogic && (targetEntity || entity) && !(targetEntity ? targetMetadataLoading : metadataLoading) && (
                    <ConditionalAssociationBuilder
                      fields={targetEntity ? targetAvailableFields : availableFields}
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
                  <Button
                    onClick={executeQueryStack}
                    disabled={loading || queryResults.length === 0 || fieldUpdates.length === 0}
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
                        Execute Updates
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
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">Preview Results</CardTitle>
                          <CardDescription>
                            Showing what would change if executed
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => {
                              try {
                                exportToCSV(previewData, `querystack_preview_${Date.now()}.csv`)
                                toast.success(`Exported ${previewData.length} preview records to CSV`)
                                onLog('Export', 'success', `Exported ${previewData.length} preview records to CSV`, { count: previewData.length })
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
                                exportToJSON(previewData, `querystack_preview_${Date.now()}.json`)
                                toast.success(`Exported ${previewData.length} preview records to JSON`)
                                onLog('Export', 'success', `Exported ${previewData.length} preview records to JSON`, { count: previewData.length })
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
                                          <span className="font-mono">{formatFieldValue(record.currentValues[field])}</span>
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
                                          <span className="font-mono text-accent font-semibold">{formatFieldValue(value)}</span>
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
                            executeQueryStack()
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
              </>
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
          setEntity(entityName)
        }}
        existingEntities={entities}
      />
    </div>
  )
}
