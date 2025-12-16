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
import { Stack, Upload, Plus, Trash, Lightning, FileArrowUp, ArrowsClockwise } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { BULLHORN_ENTITIES } from '@/lib/entities'
import { parseCSV } from '@/lib/csv-utils'
import type { QueryFilter } from '@/lib/types'

interface SmartStackProps {
  onLog: (operation: string, status: 'success' | 'error', message: string, details?: any) => void
}

interface FieldUpdate {
  id: string
  field: string
  value: string
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

    const startTime = Date.now()
    let successCount = 0
    let failedCount = 0
    const errors: string[] = []

    try {
      for (let i = 0; i < csvIds.length; i++) {
        const id = csvIds[i]
        const numericId = parseInt(id)

        if (isNaN(numericId)) {
          errors.push(`Invalid ID: ${id}`)
          failedCount++
          continue
        }

        try {
          const entity = await bullhornAPI.getEntity(selectedEntity, numericId, ['id'])
          
          if (!entity || !entity.data) {
            errors.push(`Entity not found: ${id}`)
            failedCount++
            continue
          }

          const validFilters = filters.filter(f => f.field && f.value)
          if (validFilters.length > 0) {
            const entityData = await bullhornAPI.getEntity(
              selectedEntity, 
              numericId, 
              validFilters.map(f => f.field)
            )

            const passesFilters = validFilters.every(filter => {
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
              continue
            }
          }

          const updateData: any = {}
          fieldUpdates.forEach(update => {
            updateData[update.field] = update.value
          })

          await bullhornAPI.updateEntity(selectedEntity, numericId, updateData)
          successCount++
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Update failed'
          errors.push(`ID ${id}: ${errorMessage}`)
          failedCount++
        }

        setProgress(((i + 1) / csvIds.length) * 100)
        setResults({ success: successCount, failed: failedCount, errors })
      }

      const duration = Date.now() - startTime

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
              <Select value={selectedEntity} onValueChange={setSelectedEntity} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select entity type" />
                </SelectTrigger>
                <SelectContent>
                  {BULLHORN_ENTITIES.map((entity) => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {entity.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Step 3: Add Query Filters (Optional)</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addFilter}
                  disabled={loading}
                >
                  <Plus size={16} />
                  Add Filter
                </Button>
              </div>
              {filters.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No filters - all IDs from CSV will be updated
                </p>
              ) : (
                <div className="space-y-2">
                  {filters.map((filter, index) => (
                    <Card key={index} className="p-3">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Field name"
                          value={filter.field}
                          onChange={(e) => updateFilter(index, { field: e.target.value })}
                          disabled={loading}
                          className="flex-1"
                        />
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
                        <Input
                          placeholder="Value"
                          value={filter.value}
                          onChange={(e) => updateFilter(index, { value: e.target.value })}
                          disabled={loading || filter.operator === 'is_null' || filter.operator === 'is_not_null'}
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
                  disabled={loading}
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
                  {fieldUpdates.map((update) => (
                    <Card key={update.id} className="p-3">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Field name (e.g., status)"
                          value={update.field}
                          onChange={(e) => updateFieldUpdate(update.id, { field: e.target.value })}
                          disabled={loading}
                          className="flex-1"
                        />
                        <Input
                          placeholder="New value"
                          value={update.value}
                          onChange={(e) => updateFieldUpdate(update.id, { value: e.target.value })}
                          disabled={loading}
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

            <div className="flex gap-2">
              <Button
                onClick={executeSmartStack}
                disabled={loading || csvIds.length === 0 || !selectedEntity || fieldUpdates.length === 0}
                className="flex-1"
                size="lg"
              >
                {loading ? (
                  <>
                    <ArrowsClockwise className="animate-spin" />
                    Processing...
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
                      Success: {results.success}
                    </Badge>
                    <Badge variant="destructive">
                      Failed: {results.failed}
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
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

