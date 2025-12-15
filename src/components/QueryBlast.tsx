import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MagnifyingGlass, Plus, Trash, Lightning, DownloadSimple, X } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { BULLHORN_ENTITIES, getEntityFields } from '@/lib/entities'
import { exportToCSV, exportToJSON } from '@/lib/csv-utils'
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

  const availableFields = entity ? getEntityFields(entity) : []

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

  const executeQuery = async () => {
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
        orderBy: orderBy || undefined
      }

      const result = await bullhornAPI.search(config)
      setResults(result.data)
      
      const duration = Date.now() - startTime
      toast.success(`Query completed: ${result.data.length} records in ${duration}ms`)
      
      onLog(
        'QueryBlast',
        'success',
        `Queried ${entity}: ${result.data.length} records`,
        { entity, fields: selectedFields, filters, count: result.data.length }
      )
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Query failed'
      toast.error(errorMessage)
      onLog('QueryBlast', 'error', errorMessage, { entity, filters })
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = () => {
    if (results.length === 0) {
      toast.error('No results to export')
      return
    }
    exportToCSV(results, `${entity}_export_${Date.now()}.csv`)
    toast.success('Exported to CSV')
    onLog('Export', 'success', `Exported ${results.length} records to CSV`, { entity, count: results.length })
  }

  const handleExportJSON = () => {
    if (results.length === 0) {
      toast.error('No results to export')
      return
    }
    exportToJSON(results, `${entity}_export_${Date.now()}.json`)
    toast.success('Exported to JSON')
    onLog('Export', 'success', `Exported ${results.length} records to JSON`, { entity, count: results.length })
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
              <Select value={entity} onValueChange={setEntity}>
                <SelectTrigger>
                  <SelectValue placeholder="Select entity" />
                </SelectTrigger>
                <SelectContent>
                  {BULLHORN_ENTITIES.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <div className="space-y-2">
                <Label>Select Fields</Label>
                <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-muted/30">
                  {availableFields.map((field) => (
                    <Badge
                      key={field}
                      variant={selectedFields.includes(field) ? 'default' : 'outline'}
                      className="cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
                      onClick={() => toggleField(field)}
                    >
                      {field}
                    </Badge>
                  ))}
                </div>
              </div>

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
                        <Select value={filter.field} onValueChange={(v) => updateFilter(index, 'field', v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Field" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableFields.map((field) => (
                              <SelectItem key={field} value={field}>
                                {field}
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
                        <Input
                          value={filter.value}
                          onChange={(e) => updateFilter(index, 'value', e.target.value)}
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
                <Select value={orderBy} onValueChange={setOrderBy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select field" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {availableFields.map((field) => (
                      <SelectItem key={field} value={field}>
                        {field}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={executeQuery} disabled={loading || selectedFields.length === 0} className="flex-1">
                  <Lightning />
                  {loading ? 'Executing...' : 'Execute Query'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Results</CardTitle>
                <CardDescription>{results.length} records found</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleExportCSV}>
                  <DownloadSimple />
                  Export CSV
                </Button>
                <Button size="sm" variant="outline" onClick={handleExportJSON}>
                  <DownloadSimple />
                  Export JSON
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setResults([])}>
                  <X />
                </Button>
              </div>
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
