import { useState, useRef } from 'react'
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
import { Stack, Upload, Plus, Trash, Lightning, FileArrowUp, ArrowsClockwise, Eye } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { parseCSV } from '@/lib/csv-utils'
import { useEntityMetadata } from '@/hooks/use-entity-metadata'
import { useEntities } from '@/hooks/use-entities'
import { SmartFieldInput } from '@/components/SmartFieldInput'
import type { QueryFilter } from '@/lib/types'

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

export function SmartStack({ onLog }: SmartStackProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [csvIds, setCsvIds] = useState<string[]>([])
  const [csvFileName, setCsvFileName] = useState<string>('')
  const [selectedEntity, setSelectedEntity] = useState<string>('')
  const [filters, setFilters] = useState<QueryFilter[]>([])
  const [fieldUpdates, setFieldUpdates] = useState<FieldUpdate[]>([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<{ success: number; failed: number; errors: string[] }>({
    success: 0,
    failed: 0,
    errors: []
  })
  const [dryRun, setDryRun] = useState(false)
  const [previewData, setPreviewData] = useState<PreviewRecord[]>([])
  const [showPreview, setShowPreview] = useState(false)

  const { entities, loading: entitiesLoading } = useEntities()
  const { metadata, loading: metadataLoading, error: metadataError } = useEntityMetadata(selectedEntity || undefined)
  
  const availableFields = metadata?.fields || []
  const fieldsMap = metadata?.fieldsMap || {}

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

  const executeSmartStack = async () => {
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

    try {
      const fieldsToFetch = Array.from(new Set([
        'id',
        ...filters.filter(f => f.field).map(f => f.field),
        ...fieldUpdates.map(u => u.field)
      ]))

      for (let i = 0; i < csvIds.length; i++) {
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

          const validFilters = filters.filter(f => f.field && f.value)
          let passesFilters = true
          
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
          }

          const updateData: any = {}
          fieldUpdates.forEach(update => {
            updateData[update.field] = update.value
          })

          if (dryRun) {
            preview.push({
              id,
              willUpdate: true,
              currentValues: entity.data,
              newValues: updateData
            })
            successCount++
          } else {
            await bullhornAPI.updateEntity(selectedEntity, numericId, updateData)
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
          }
        }

        setProgress(((i + 1) / csvIds.length) * 100)
        setResults({ success: successCount, failed: failedCount, errors })
      }

      const duration = Date.now() - startTime

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
            errors: errors.slice(0, 10)
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
              <Label>Step 2: Select Entity Type</Label>
              {entitiesLoading ? (
                <Skeleton className="h-10 w-full" />
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
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addFilter}
                  disabled={loading || !selectedEntity || metadataLoading}
                >
                  <Plus size={16} />
                  Add Filter
                </Button>
              </div>
              {metadataLoading && selectedEntity ? (
                <Skeleton className="h-20 w-full" />
              ) : filters.length === 0 ? (
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
                                {field.label}
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
                        <SmartFieldInput
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
                  {fieldUpdates.map((update) => (
                    <Card key={update.id} className="p-3">
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
                                {field.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <SmartFieldInput
                          field={fieldsMap[update.field] || null}
                          value={update.value}
                          onChange={(v) => updateFieldUpdate(update.id, { value: v })}
                          disabled={loading}
                          placeholder="New value"
                          className="flex-1"
                        />
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
                    </Card>
                  ))}
                </div>
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
                onClick={executeSmartStack}
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
    </div>
  )
}

