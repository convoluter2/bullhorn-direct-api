import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MagnifyingGlass, Plus, Trash, Lightning, DownloadSimple, X, CaretLeft, CaretRight, ArrowsClockwise, ListBullets, TreeStructure, FloppyDisk, PencilSimple, Warning } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { exportToCSV, exportToJSON } from '@/lib/csv-utils'
import { formatFieldLabel } from '@/lib/utils'
import { useEntityMetadata } from '@/hooks/use-entity-metadata'
import { useEntities } from '@/hooks/use-entities'
import { FieldSelector } from '@/components/FieldSelector'
import { ValidatedFieldInput } from '@/components/ValidatedFieldInput'
import { ManualEntityDialog } from '@/components/ManualEntityDialog'
import { FilterGroupBuilder } from '@/components/FilterGroupBuilder'
import type { QueryFilter, QueryConfig, FilterGroup } from '@/lib/types'

interface QueryBlastProps {
  onLog: (operation: string, status: 'success' | 'error', message: string, details?: any) => void
}

interface FieldUpdate {
  field: string
  value: string
}

export function QueryBlast({ onLog }: QueryBlastProps) {
  const [entity, setEntity] = useState('')
  const [selectedFields, setSelectedFields] = useState<string[]>([])
  const [filters, setFilters] = useState<QueryFilter[]>([])
  const [filterGroups, setFilterGroups] = useState<FilterGroup[]>([])
  const [groupLogic, setGroupLogic] = useState<'AND' | 'OR'>('AND')
  const [filterMode, setFilterMode] = useState<'simple' | 'grouped'>('simple')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [count, setCount] = useState(500)
  const [orderBy, setOrderBy] = useState('')
  const [totalCount, setTotalCount] = useState<number>(0)
  const [currentStart, setCurrentStart] = useState(0)
  const [allResults, setAllResults] = useState<any[]>([])
  const [loadingAll, setLoadingAll] = useState(false)
  const [manualEntityDialogOpen, setManualEntityDialogOpen] = useState(false)
  
  const [operationMode, setOperationMode] = useState<'update' | 'create'>('update')
  const [fieldUpdates, setFieldUpdates] = useState<FieldUpdate[]>([])
  const [dryRunResults, setDryRunResults] = useState<any[] | null>(null)
  const [showDryRun, setShowDryRun] = useState(false)

  const { entities, loading: entitiesLoading, error: entitiesError, refresh: refreshEntities, addEntity } = useEntities()
  const { metadata, loading: metadataLoading, error: metadataError } = useEntityMetadata(entity || undefined)

  const availableFields = metadata?.fields || []
  const fieldsMap = metadata?.fieldsMap || {}

  const addFilter = () => {
    setFilters([...filters, { field: '', operator: 'equals', value: '' }])
  }

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index))
  }

  const updateFilter = (index: number, key: keyof QueryFilter, value: string) => {
    const newFilters = [...filters]
    newFilters[index][key] = value
    setFilters(newFilters)
  }

  const toggleField = (field: string) => {
    if (selectedFields.includes(field)) {
      setSelectedFields(selectedFields.filter(f => f !== field))
    } else {
      setSelectedFields([...selectedFields, field])
    }
  }

  const executeQuery = async (start = 0) => {
    if (!entity) {
      toast.error('Please select an entity')
      return
    }

    if (selectedFields.length === 0) {
      toast.error('Please select at least one field')
      return
    }

    setLoading(true)
    const startTime = Date.now()

    try {
      const currentCorporationId = bullhornAPI.getCurrentCorporationId()
      
      const config: QueryConfig = {
        entity,
        fields: selectedFields,
        filters: filterMode === 'simple' ? filters.filter(f => f.field && f.value) : [],
        filterGroups: filterMode === 'grouped' ? filterGroups : undefined,
        groupLogic: filterMode === 'grouped' ? groupLogic : undefined,
        count,
        start,
        orderBy: orderBy && orderBy !== '__none__' ? orderBy : undefined
      }

      const result = await bullhornAPI.search(config, undefined, currentCorporationId)
      setResults(result.data)
      setTotalCount(result.total)
      setCurrentStart(start)
      
      const duration = Date.now() - startTime
      toast.success(`Query completed: ${result.data.length} of ${result.total} records in ${duration}ms`)
      
      onLog(
        'QueryBlast',
        'success',
        `Queried ${entity}: ${result.data.length} of ${result.total} records`,
        { entity, fields: selectedFields, filterMode, filters: filterMode === 'simple' ? filters : filterGroups, count: result.data.length, total: result.total }
      )
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Query failed'
      toast.error(errorMessage)
      onLog('QueryBlast', 'error', errorMessage, { entity, filters })
    } finally {
      setLoading(false)
    }
  }

  const loadAllResults = async () => {
    if (!entity || selectedFields.length === 0) {
      toast.error('Please execute a query first')
      return
    }

    if (totalCount === 0) {
      toast.error('No results to load')
      return
    }

    const confirmLoad = confirm(`This will fetch all ${totalCount} records. This may take some time. Continue?`)
    if (!confirmLoad) return

    setLoadingAll(true)
    const startTime = Date.now()
    const batchSize = 500
    const allData: any[] = []

    try {
      const currentCorporationId = bullhornAPI.getCurrentCorporationId()
      const totalBatches = Math.ceil(totalCount / batchSize)
      
      for (let i = 0; i < totalBatches; i++) {
        const start = i * batchSize
        const config: QueryConfig = {
          entity,
          fields: selectedFields,
          filters: filterMode === 'simple' ? filters.filter(f => f.field && f.value) : [],
          filterGroups: filterMode === 'grouped' ? filterGroups : undefined,
          groupLogic: filterMode === 'grouped' ? groupLogic : undefined,
          count: batchSize,
          start,
          orderBy: orderBy && orderBy !== '__none__' ? orderBy : undefined
        }

        const result = await bullhornAPI.search(config, undefined, currentCorporationId)
        allData.push(...result.data)
        
        toast.loading(`Loading batch ${i + 1} of ${totalBatches}...`, { id: 'batch-load' })
      }

      setAllResults(allData)
      const duration = Date.now() - startTime
      toast.success(`Loaded all ${allData.length} records in ${duration}ms`, { id: 'batch-load' })
      
      onLog(
        'QueryBlast - Load All',
        'success',
        `Loaded all ${allData.length} records`,
        { entity, total: allData.length }
      )
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load all results'
      toast.error(errorMessage, { id: 'batch-load' })
      onLog('QueryBlast - Load All', 'error', errorMessage, { entity })
    } finally {
      setLoadingAll(false)
    }
  }

  const handlePrevPage = () => {
    const newStart = Math.max(0, currentStart - count)
    executeQuery(newStart)
  }

  const handleNextPage = () => {
    const newStart = currentStart + count
    if (newStart < totalCount) {
      executeQuery(newStart)
    }
  }

  const handleExportCSV = () => {
    const dataToExport = allResults.length > 0 ? allResults : results
    if (dataToExport.length === 0) {
      toast.error('No results to export')
      return
    }
    try {
      exportToCSV(dataToExport, `${entity}_export_${Date.now()}.csv`)
      toast.success(`Exported ${dataToExport.length} records to CSV`)
      onLog('Export', 'success', `Exported ${dataToExport.length} records to CSV`, { entity, count: dataToExport.length })
    } catch (error) {
      console.error('CSV export error:', error)
      toast.error(`Failed to export CSV: ${error}`)
      onLog('Export', 'error', `CSV export failed`, { entity, error: String(error) })
    }
  }

  const handleExportJSON = () => {
    const dataToExport = allResults.length > 0 ? allResults : results
    if (dataToExport.length === 0) {
      toast.error('No results to export')
      return
    }
    try {
      exportToJSON(dataToExport, `${entity}_export_${Date.now()}.json`)
      toast.success(`Exported ${dataToExport.length} records to JSON`)
      onLog('Export', 'success', `Exported ${dataToExport.length} records to JSON`, { entity, count: dataToExport.length })
    } catch (error) {
      console.error('JSON export error:', error)
      toast.error(`Failed to export JSON: ${error}`)
      onLog('Export', 'error', `JSON export failed`, { entity, error: String(error) })
    }
  }

  const addFieldUpdate = () => {
    setFieldUpdates([...fieldUpdates, { field: '', value: '' }])
  }

  const removeFieldUpdate = (index: number) => {
    setFieldUpdates(fieldUpdates.filter((_, i) => i !== index))
  }

  const updateFieldUpdate = (index: number, key: keyof FieldUpdate, value: string) => {
    const newUpdates = [...fieldUpdates]
    newUpdates[index][key] = value
    setFieldUpdates(newUpdates)
  }

  const handleDryRun = async () => {
    if (!entity) {
      toast.error('Please select an entity')
      return
    }

    if (operationMode === 'update' && results.length === 0) {
      toast.error('Please execute a query first to find records to update')
      return
    }

    if (fieldUpdates.length === 0 || fieldUpdates.some(u => !u.field)) {
      toast.error('Please add at least one field to update/create')
      return
    }

    const updateData: Record<string, any> = {}
    fieldUpdates.forEach(update => {
      if (update.field && update.value !== '') {
        const fieldMeta = fieldsMap[update.field]
        if (fieldMeta?.type === 'Integer' || fieldMeta?.type === 'Double') {
          updateData[update.field] = Number(update.value)
        } else if (fieldMeta?.type === 'Boolean') {
          updateData[update.field] = update.value === 'true' || update.value === '1'
        } else {
          updateData[update.field] = update.value
        }
      }
    })

    if (operationMode === 'create') {
      setDryRunResults([{
        operation: 'CREATE',
        entity,
        data: updateData,
        preview: updateData
      }])
      setShowDryRun(true)
      toast.success('Dry run complete - review the changes below')
    } else {
      const recordsToUpdate = results.slice(0, Math.min(results.length, 100))
      const dryRun = recordsToUpdate.map(record => ({
        id: record.id,
        operation: 'UPDATE',
        entity,
        current: record,
        changes: updateData,
        preview: { ...record, ...updateData }
      }))
      
      setDryRunResults(dryRun)
      setShowDryRun(true)
      toast.success(`Dry run complete - showing preview of ${recordsToUpdate.length} records (max 100)`)
    }

    onLog(
      'Dry Run',
      'success',
      `Dry run completed for ${operationMode} operation`,
      { entity, mode: operationMode, recordCount: operationMode === 'create' ? 1 : results.length }
    )
  }

  const handleExecuteOperation = async () => {
    if (!dryRunResults || dryRunResults.length === 0) {
      toast.error('Please run a dry run first')
      return
    }

    const confirmMessage = operationMode === 'create' 
      ? `Are you sure you want to CREATE 1 new ${entity} record?`
      : `Are you sure you want to UPDATE ${results.length} ${entity} records? This action cannot be undone.`

    if (!confirm(confirmMessage)) {
      return
    }

    setLoading(true)
    const startTime = Date.now()

    try {
      const currentCorporationId = bullhornAPI.getCurrentCorporationId()
      
      if (operationMode === 'create') {
        const updateData: Record<string, any> = {}
        fieldUpdates.forEach(update => {
          if (update.field && update.value !== '') {
            const fieldMeta = fieldsMap[update.field]
            if (fieldMeta?.type === 'Integer' || fieldMeta?.type === 'Double') {
              updateData[update.field] = Number(update.value)
            } else if (fieldMeta?.type === 'Boolean') {
              updateData[update.field] = update.value === 'true' || update.value === '1'
            } else {
              updateData[update.field] = update.value
            }
          }
        })

        const result = await bullhornAPI.createEntity(entity, updateData, currentCorporationId)
        const duration = Date.now() - startTime
        
        toast.success(`Created new ${entity} record with ID ${result.changedEntityId} in ${duration}ms`)
        onLog(
          'Create Record',
          'success',
          `Created new ${entity} record`,
          { entity, id: result.changedEntityId, data: updateData }
        )
        
        setDryRunResults(null)
        setShowDryRun(false)
        setFieldUpdates([])
      } else {
        const updateData: Record<string, any> = {}
        fieldUpdates.forEach(update => {
          if (update.field && update.value !== '') {
            const fieldMeta = fieldsMap[update.field]
            if (fieldMeta?.type === 'Integer' || fieldMeta?.type === 'Double') {
              updateData[update.field] = Number(update.value)
            } else if (fieldMeta?.type === 'Boolean') {
              updateData[update.field] = update.value === 'true' || update.value === '1'
            } else {
              updateData[update.field] = update.value
            }
          }
        })

        let successCount = 0
        let errorCount = 0
        const errors: any[] = []

        for (const record of results) {
          try {
            await bullhornAPI.updateEntity(entity, record.id, updateData, currentCorporationId)
            successCount++
          } catch (error) {
            errorCount++
            errors.push({ id: record.id, error: error instanceof Error ? error.message : 'Unknown error' })
          }
        }

        const duration = Date.now() - startTime
        
        if (errorCount === 0) {
          toast.success(`Updated ${successCount} ${entity} records in ${duration}ms`)
          onLog(
            'Bulk Update',
            'success',
            `Updated ${successCount} ${entity} records`,
            { entity, successCount, data: updateData }
          )
        } else {
          toast.warning(`Updated ${successCount} records, ${errorCount} failed`)
          onLog(
            'Bulk Update',
            errorCount === results.length ? 'error' : 'success',
            `Updated ${successCount} records, ${errorCount} failed`,
            { entity, successCount, errorCount, errors, data: updateData }
          )
        }

        setDryRunResults(null)
        setShowDryRun(false)
        
        executeQuery(currentStart)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Operation failed'
      toast.error(errorMessage)
      onLog(
        operationMode === 'create' ? 'Create Record' : 'Bulk Update',
        'error',
        errorMessage,
        { entity, mode: operationMode }
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MagnifyingGlass className="text-accent" size={24} />
            Query Builder
          </CardTitle>
          <CardDescription>Build and execute advanced queries against Bullhorn entities</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Entity Type</Label>
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
              ) : entitiesError ? (
                <div className="space-y-2">
                  <div className="text-sm text-destructive">{entitiesError}</div>
                  <Button size="sm" variant="outline" onClick={refreshEntities}>
                    <ArrowsClockwise size={16} />
                    Retry
                  </Button>
                </div>
              ) : entities.length === 0 ? (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">No entities available</div>
                  <Button size="sm" variant="outline" onClick={refreshEntities}>
                    <ArrowsClockwise size={16} />
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
              />
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
                      <Label className="text-base">Filters</Label>
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
                          <Button size="sm" variant="outline" onClick={addFilter}>
                            <Plus size={16} />
                            Add Filter
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {filters.map((filter, index) => (
                            <div key={index} className="flex gap-2 items-end">
                              <div className="flex-1 space-y-1">
                                <Label className="text-xs">Field</Label>
                                <Select value={filter.field || undefined} onValueChange={(v) => updateFilter(index, 'field', v)}>
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
                              <div className="w-40 space-y-1">
                                <Label className="text-xs">Operator</Label>
                                <Select value={filter.operator} onValueChange={(v) => updateFilter(index, 'operator', v)}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-[300px]">
                                    <SelectItem value="equals">= Equals</SelectItem>
                                    <SelectItem value="not_equals">≠ Not Equals</SelectItem>
                                    <SelectItem value="greater_than">&gt; Greater Than</SelectItem>
                                    <SelectItem value="less_than">&lt; Less Than</SelectItem>
                                    <SelectItem value="greater_equal">≥ Greater or Equal</SelectItem>
                                    <SelectItem value="less_equal">≤ Less or Equal</SelectItem>
                                    <SelectItem value="contains">⊃ Contains</SelectItem>
                                    <SelectItem value="starts_with">⊐ Starts With</SelectItem>
                                    <SelectItem value="ends_with">⊏ Ends With</SelectItem>
                                    <SelectItem value="is_null">∅ Is Null</SelectItem>
                                    <SelectItem value="is_not_null">∃ Is Not Null</SelectItem>
                                    <SelectItem value="in_list">∈ In List [...]</SelectItem>
                                    <SelectItem value="in_list_parens">∈ In List (...)</SelectItem>
                                    <SelectItem value="between_inclusive">⊆ Between [...]</SelectItem>
                                    <SelectItem value="between_exclusive">⊂ Between (...)</SelectItem>
                                    <SelectItem value="lucene">🔍 Lucene Query</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex-1 space-y-1">
                                <Label className="text-xs">Value</Label>
                                <ValidatedFieldInput
                                  field={fieldsMap[filter.field] || null}
                                  value={filter.value}
                                  onChange={(v) => updateFilter(index, 'value', v)}
                                  disabled={filter.operator === 'is_null' || filter.operator === 'is_not_null'}
                                  placeholder={
                                    filter.operator === 'in_list' || filter.operator === 'in_list_parens'
                                      ? 'value1,value2,value3'
                                      : filter.operator === 'between_inclusive' || filter.operator === 'between_exclusive'
                                      ? 'start,end'
                                      : 'Value'
                                  }
                                />
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => removeFilter(index)}
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
                        groups={filterGroups}
                        onGroupsChange={setFilterGroups}
                        groupLogic={groupLogic}
                        onGroupLogicChange={setGroupLogic}
                        availableFields={availableFields}
                        fieldsMap={fieldsMap}
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
                    <Button onClick={() => executeQuery(0)} disabled={loading || selectedFields.length === 0} className="flex-1">
                      <Lightning />
                      {loading ? 'Executing...' : 'Execute Query'}
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {entity && metadata && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FloppyDisk className="text-accent" size={24} />
              Update or Create Records
            </CardTitle>
            <CardDescription>
              {operationMode === 'update' 
                ? 'Update fields on records from your query results'
                : 'Create a new record with specified field values'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Operation Mode</Label>
              <div className="flex gap-2">
                <Button
                  variant={operationMode === 'update' ? 'default' : 'outline'}
                  onClick={() => {
                    setOperationMode('update')
                    setDryRunResults(null)
                    setShowDryRun(false)
                  }}
                  className="flex-1 gap-2"
                >
                  <PencilSimple />
                  Update Records
                </Button>
                <Button
                  variant={operationMode === 'create' ? 'default' : 'outline'}
                  onClick={() => {
                    if (operationMode !== 'create') {
                      toast.warning('Creating new records - please ensure all required fields are filled', {
                        duration: 4000
                      })
                    }
                    setOperationMode('create')
                    setDryRunResults(null)
                    setShowDryRun(false)
                  }}
                  className="flex-1 gap-2"
                >
                  <Plus />
                  Create New Record
                </Button>
              </div>
            </div>

            {operationMode === 'create' && (
              <Alert>
                <Warning className="h-4 w-4" />
                <AlertDescription>
                  You are creating a new record. Make sure to include all required fields for the {entity} entity.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base">Field Values to {operationMode === 'update' ? 'Update' : 'Set'}</Label>
                <Button size="sm" variant="outline" onClick={addFieldUpdate}>
                  <Plus size={16} />
                  Add Field
                </Button>
              </div>
              
              <div className="space-y-2">
                {fieldUpdates.map((update, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Field</Label>
                      <Select value={update.field || undefined} onValueChange={(v) => updateFieldUpdate(index, 'field', v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select field" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableFields.map((field) => (
                            <SelectItem key={field.name} value={field.name}>
                              {formatFieldLabel(field.label, field.name)} ({field.type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Value</Label>
                      <ValidatedFieldInput
                        field={fieldsMap[update.field] || null}
                        value={update.value}
                        onChange={(v) => updateFieldUpdate(index, 'value', v)}
                        placeholder="Enter value"
                      />
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeFieldUpdate(index)}
                      className="text-destructive"
                    >
                      <Trash size={18} />
                    </Button>
                  </div>
                ))}
                
                {fieldUpdates.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No fields added yet. Click "Add Field" to begin.
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                onClick={handleDryRun} 
                disabled={loading || fieldUpdates.length === 0 || (operationMode === 'update' && results.length === 0)}
                variant="outline"
                className="flex-1"
              >
                <MagnifyingGlass />
                Dry Run Preview
              </Button>
              
              {showDryRun && dryRunResults && (
                <Button 
                  onClick={handleExecuteOperation} 
                  disabled={loading}
                  className="flex-1"
                >
                  <Lightning />
                  {loading ? 'Executing...' : `Execute ${operationMode === 'create' ? 'Create' : 'Updates'}`}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {showDryRun && dryRunResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MagnifyingGlass className="text-accent" size={24} />
              Dry Run Preview
            </CardTitle>
            <CardDescription>
              {operationMode === 'create' 
                ? 'Preview of the new record that will be created'
                : `Preview of changes that will be applied to ${results.length} records (showing first ${Math.min(100, results.length)})`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] w-full">
              {operationMode === 'create' ? (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">New {entity} Record:</h4>
                  <div className="bg-muted/50 rounded-lg p-4 space-y-1 font-mono text-xs">
                    {Object.entries(dryRunResults[0].preview).map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <span className="text-muted-foreground">{key}:</span>
                        <span className="text-accent font-semibold">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">ID</TableHead>
                      <TableHead>Field</TableHead>
                      <TableHead>Current Value</TableHead>
                      <TableHead>New Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dryRunResults.slice(0, 100).map((record) => (
                      fieldUpdates.map((update, idx) => (
                        <TableRow key={`${record.id}-${idx}`}>
                          {idx === 0 && (
                            <TableCell rowSpan={fieldUpdates.length} className="font-mono text-xs">
                              {record.id}
                            </TableCell>
                          )}
                          <TableCell className="font-mono text-xs">{update.field}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {record.current[update.field] !== null && record.current[update.field] !== undefined 
                              ? String(record.current[update.field]) 
                              : '-'}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-accent font-semibold">
                            {update.value}
                          </TableCell>
                        </TableRow>
                      ))
                    ))}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Results</CardTitle>
                  <CardDescription>
                    Showing {currentStart + 1}-{Math.min(currentStart + results.length, totalCount)} of {totalCount} records
                    {allResults.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {allResults.length} records loaded for export
                      </Badge>
                    )}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={loadAllResults}
                    disabled={loadingAll || allResults.length === totalCount}
                  >
                    <ArrowsClockwise className={loadingAll ? 'animate-spin' : ''} />
                    {loadingAll ? 'Loading...' : 'Load All'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleExportCSV}>
                    <DownloadSimple />
                    Export CSV {allResults.length > 0 && `(${allResults.length})`}
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleExportJSON}>
                    <DownloadSimple />
                    Export JSON {allResults.length > 0 && `(${allResults.length})`}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => {
                    setResults([])
                    setAllResults([])
                    setTotalCount(0)
                    setCurrentStart(0)
                  }}>
                    <X />
                  </Button>
                </div>
              </div>

              {totalCount > count && (
                <div className="flex items-center justify-between border-t pt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handlePrevPage}
                    disabled={loading || currentStart === 0}
                  >
                    <CaretLeft />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {Math.floor(currentStart / count) + 1} of {Math.ceil(totalCount / count)}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleNextPage}
                    disabled={loading || currentStart + count >= totalCount}
                  >
                    Next
                    <CaretRight />
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    {selectedFields.map((field) => (
                      <TableHead key={field} className="font-mono text-xs">{field}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((row, i) => (
                    <TableRow key={i}>
                      {selectedFields.map((field) => (
                        <TableCell key={field} className="font-mono text-xs">
                          {row[field] !== null && row[field] !== undefined ? String(row[field]) : '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
