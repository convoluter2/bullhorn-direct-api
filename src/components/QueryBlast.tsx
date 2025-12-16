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
import { MagnifyingGlass, Plus, Trash, Lightning, DownloadSimple, X, CaretLeft, CaretRight, ArrowsClockwise } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { exportToCSV, exportToJSON } from '@/lib/csv-utils'
import { useEntityMetadata } from '@/hooks/use-entity-metadata'
import { useEntities } from '@/hooks/use-entities'
import { FieldSelector } from '@/components/FieldSelector'
import { SmartFieldInput } from '@/components/SmartFieldInput'
import type { QueryFilter, QueryConfig } from '@/lib/types'

interface QueryBlastProps {
  onLog: (operation: string, status: 'success' | 'error', message: string, details?: any) => void
}

export function QueryBlast({ onLog }: QueryBlastProps) {
  const [entity, setEntity] = useState('')
  const [selectedFields, setSelectedFields] = useState<string[]>([])
  const [filters, setFilters] = useState<QueryFilter[]>([])
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [count, setCount] = useState(500)
  const [orderBy, setOrderBy] = useState('')
  const [totalCount, setTotalCount] = useState<number>(0)
  const [currentStart, setCurrentStart] = useState(0)
  const [allResults, setAllResults] = useState<any[]>([])
  const [loadingAll, setLoadingAll] = useState(false)

  const { entities, loading: entitiesLoading, error: entitiesError } = useEntities()
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
      const config: QueryConfig = {
        entity,
        fields: selectedFields,
        filters: filters.filter(f => f.field && f.value),
        count,
        start,
        orderBy: orderBy && orderBy !== '__none__' ? orderBy : undefined
      }

      const result = await bullhornAPI.search(config)
      setResults(result.data)
      setTotalCount(result.total)
      setCurrentStart(start)
      
      const duration = Date.now() - startTime
      toast.success(`Query completed: ${result.data.length} of ${result.total} records in ${duration}ms`)
      
      onLog(
        'QueryBlast',
        'success',
        `Queried ${entity}: ${result.data.length} of ${result.total} records`,
        { entity, fields: selectedFields, filters, count: result.data.length, total: result.total }
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
      const totalBatches = Math.ceil(totalCount / batchSize)
      
      for (let i = 0; i < totalBatches; i++) {
        const start = i * batchSize
        const config: QueryConfig = {
          entity,
          fields: selectedFields,
          filters: filters.filter(f => f.field && f.value),
          count: batchSize,
          start,
          orderBy: orderBy && orderBy !== '__none__' ? orderBy : undefined
        }

        const result = await bullhornAPI.search(config)
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
    exportToCSV(dataToExport, `${entity}_export_${Date.now()}.csv`)
    toast.success(`Exported ${dataToExport.length} records to CSV`)
    onLog('Export', 'success', `Exported ${dataToExport.length} records to CSV`, { entity, count: dataToExport.length })
  }

  const handleExportJSON = () => {
    const dataToExport = allResults.length > 0 ? allResults : results
    if (dataToExport.length === 0) {
      toast.error('No results to export')
      return
    }
    exportToJSON(dataToExport, `${entity}_export_${Date.now()}.json`)
    toast.success(`Exported ${dataToExport.length} records to JSON`)
    onLog('Export', 'success', `Exported ${dataToExport.length} records to JSON`, { entity, count: dataToExport.length })
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
              <Label>Entity Type</Label>
              {entitiesLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : entitiesError ? (
                <div className="text-sm text-destructive">{entitiesError}</div>
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

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Filters</Label>
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
                                    {field.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-32 space-y-1">
                            <Label className="text-xs">Operator</Label>
                            <Select value={filter.operator} onValueChange={(v) => updateFilter(index, 'operator', v)}>
                              <SelectTrigger>
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
                          </div>
                          <div className="flex-1 space-y-1">
                            <Label className="text-xs">Value</Label>
                            <SmartFieldInput
                              field={fieldsMap[filter.field] || null}
                              value={filter.value}
                              onChange={(v) => updateFilter(index, 'value', v)}
                              disabled={filter.operator === 'is_null' || filter.operator === 'is_not_null'}
                              placeholder="Value"
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
                            {field.label}
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
    </div>
  )
}
