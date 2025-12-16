import { useState } from 'react'
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
import { Upload, Lightning, CheckCircle, XCircle, MagnifyingGlass, Plus, Eye } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { parseCSV } from '@/lib/csv-utils'
import { useEntityMetadata } from '@/hooks/use-entity-metadata'
import { useEntities } from '@/hooks/use-entities'
import type { CSVMapping } from '@/lib/types'

interface CSVLoaderProps {
  onLog: (operation: string, status: 'success' | 'error', message: string, details?: any) => void
}

interface ImportResult {
  row: number
  status: 'success' | 'error'
  message: string
  action?: string
  data?: any
}

export function CSVLoader({ onLog }: CSVLoaderProps) {
  const [entity, setEntity] = useState('')
  const [csvData, setCsvData] = useState<{ headers: string[]; rows: string[][] } | null>(null)
  const [mappings, setMappings] = useState<CSVMapping[]>([])
  const [lookupField, setLookupField] = useState<string>('')
  const [updateExisting, setUpdateExisting] = useState(true)
  const [createNew, setCreateNew] = useState(true)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<ImportResult[]>([])
  const [dryRun, setDryRun] = useState(false)

  const { entities, loading: entitiesLoading } = useEntities()
  const { metadata, loading: metadataLoading, error: metadataError } = useEntityMetadata(entity || undefined)
  
  const availableFields = metadata?.fields || []

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const parsed = parseCSV(text)
      setCsvData(parsed)
      
      const initialMappings = parsed.headers.map(header => ({
        csvColumn: header,
        bullhornField: '__skip__'
      }))
      setMappings(initialMappings)
      setResults([])
      toast.success(`CSV loaded: ${parsed.rows.length} rows`)
    }
    reader.readAsText(file)
  }

  const updateMapping = (csvColumn: string, bullhornField: string) => {
    setMappings(mappings.map(m => 
      m.csvColumn === csvColumn ? { ...m, bullhornField } : m
    ))
  }

  const updateTransform = (csvColumn: string, transform?: string) => {
    setMappings(mappings.map(m => 
      m.csvColumn === csvColumn ? { ...m, transform } : m
    ))
  }

  const transformValue = (value: string, transform?: string): any => {
    if (!transform || !value) return value

    try {
      switch (transform) {
        case 'number':
          return parseFloat(value) || 0
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
    } catch {
      return value
    }
  }

  const executeImport = async () => {
    if (!csvData || !entity) {
      toast.error('Please upload a CSV and select an entity')
      return
    }

    const validMappings = mappings.filter(m => m.bullhornField && m.bullhornField !== '__skip__')
    if (validMappings.length === 0) {
      toast.error('Please map at least one field')
      return
    }

    if (lookupField && lookupField !== '__none__') {
      const lookupMapping = mappings.find(m => m.bullhornField === lookupField || m.csvColumn.toLowerCase() === lookupField.toLowerCase())
      if (!lookupMapping) {
        toast.error('Lookup field must have a corresponding CSV column')
        return
      }
    }

    if (!updateExisting && !createNew) {
      toast.error('Must enable either "Update Existing" or "Create New"')
      return
    }

    setLoading(true)
    setProgress(0)
    const importResults: ImportResult[] = []

    let successCount = 0
    let errorCount = 0
    let createdCount = 0
    let updatedCount = 0
    let skippedCount = 0

    for (let i = 0; i < csvData.rows.length; i++) {
      const row = csvData.rows[i]
      
      try {
        const data: any = {}
        let lookupValue: string | null = null

        if (lookupField && lookupField !== '__none__') {
          const lookupMapping = mappings.find(m => m.bullhornField === lookupField)
          if (lookupMapping) {
            const csvIndex = csvData.headers.indexOf(lookupMapping.csvColumn)
            if (csvIndex !== -1) {
              const rawValue = row[csvIndex]
              lookupValue = transformValue(rawValue, lookupMapping.transform)
            }
          } else {
            const csvIndex = csvData.headers.findIndex(h => h.toLowerCase() === lookupField.toLowerCase())
            if (csvIndex !== -1) {
              lookupValue = row[csvIndex]
            }
          }
        }

        validMappings.forEach(mapping => {
          const csvIndex = csvData.headers.indexOf(mapping.csvColumn)
          if (csvIndex !== -1) {
            const rawValue = row[csvIndex]
            const transformedValue = transformValue(rawValue, mapping.transform)
            data[mapping.bullhornField] = transformedValue
          }
        })

        let existingRecord: any = null

        if (lookupField && lookupField !== '__none__' && lookupValue) {
          try {
            const searchResult = await bullhornAPI.search({
              entity,
              fields: ['id', ...validMappings.map(m => m.bullhornField)],
              filters: [{
                field: lookupField,
                operator: 'equals',
                value: lookupValue
              }],
              count: 1
            })

            if (searchResult.data && searchResult.data.length > 0) {
              existingRecord = searchResult.data[0]
            }
          } catch (lookupError) {
            console.warn(`Lookup failed for ${lookupField}=${lookupValue}:`, lookupError)
          }
        }

        if (existingRecord) {
          if (updateExisting) {
            if (!dryRun) {
              await bullhornAPI.updateEntity(entity, existingRecord.id, data)
            }
            importResults.push({
              row: i + 1,
              status: 'success',
              message: dryRun ? `Would update existing record (ID: ${existingRecord.id})` : `Updated existing record (ID: ${existingRecord.id})`,
              action: 'updated',
              data: dryRun ? { existing: existingRecord, changes: data } : undefined
            })
            updatedCount++
            successCount++
          } else {
            importResults.push({
              row: i + 1,
              status: 'success',
              message: `Skipped existing record (ID: ${existingRecord.id})`,
              action: 'skipped'
            })
            skippedCount++
          }
        } else {
          if (createNew) {
            if (!dryRun) {
              const result = await bullhornAPI.createEntity(entity, data)
              importResults.push({
                row: i + 1,
                status: 'success',
                message: `Created new record (ID: ${result.changedEntityId})`,
                action: 'created'
              })
            } else {
              importResults.push({
                row: i + 1,
                status: 'success',
                message: 'Would create new record',
                action: 'created',
                data
              })
            }
            createdCount++
            successCount++
          } else {
            importResults.push({
              row: i + 1,
              status: 'error',
              message: 'Record not found and create new is disabled',
              action: 'skipped'
            })
            skippedCount++
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Import failed'
        importResults.push({
          row: i + 1,
          status: 'error',
          message: errorMessage,
          action: 'error'
        })
        errorCount++
      }

      setProgress(((i + 1) / csvData.rows.length) * 100)
    }

    setResults(importResults)
    setLoading(false)

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
      { entity, successCount, errorCount, createdCount, updatedCount, skippedCount, mappings: validMappings, lookupField, dryRun }
    )
  }

  return (
    <div className="space-y-6">
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
              <Label>Entity Type</Label>
              {entitiesLoading ? (
                <Skeleton className="h-10 w-full" />
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
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MagnifyingGlass size={16} />
                    Lookup Field (for updates)
                  </Label>
                  {metadataLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select value={lookupField || undefined} onValueChange={setLookupField}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a field to lookup existing records" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None (Create only)</SelectItem>
                        {availableFields.map((field) => (
                          <SelectItem key={field.name} value={field.name}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <p className="text-xs text-muted-foreground">
                    If specified, the loader will search for existing records using this field and update them
                  </p>
                </div>

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
                  {mappings.map((mapping) => (
                    <div key={mapping.csvColumn} className="flex gap-2 items-center">
                      <div className="flex-1 font-mono text-sm bg-muted p-2 rounded border">
                        {mapping.csvColumn}
                      </div>
                      <div className="text-muted-foreground">→</div>
                      <div className="flex-1">
                        {metadataLoading ? (
                          <Skeleton className="h-10 w-full" />
                        ) : (
                          <Select
                            value={mapping.bullhornField}
                            onValueChange={(v) => updateMapping(mapping.csvColumn, v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select Bullhorn field" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__skip__">Skip</SelectItem>
                              {availableFields.map((field) => (
                                <SelectItem key={field.name} value={field.name}>
                                  {field.label}
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
                          value={mapping.transform || 'none'}
                          onValueChange={(v) => updateTransform(mapping.csvColumn, v === 'none' ? undefined : v)}
                          disabled={mapping.bullhornField === '__skip__'}
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
                  ))}
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

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={executeImport}
                  disabled={loading || mappings.filter(m => m.bullhornField && m.bullhornField !== '__skip__').length === 0}
                  className="flex-1"
                  variant={dryRun ? "secondary" : "default"}
                >
                  {dryRun ? <Eye /> : <Lightning />}
                  {loading ? (dryRun ? 'Previewing...' : 'Importing...') : dryRun ? 'Preview Import' : (lookupField && lookupField !== '__none__') ? 'Start Import/Update' : 'Start Import'}
                </Button>
              </div>

              {loading && (
                <div className="space-y-2">
                  <Label>Import Progress</Label>
                  <Progress value={progress} />
                  <p className="text-xs text-muted-foreground text-center">{Math.round(progress)}%</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{dryRun ? 'Preview Results' : 'Import Results'}</CardTitle>
            <CardDescription>
              {results.filter(r => r.action === 'created').length} {dryRun ? 'would create' : 'created'}, 
              {' '}{results.filter(r => r.action === 'updated').length} {dryRun ? 'would update' : 'updated'},
              {' '}{results.filter(r => r.action === 'skipped').length} {dryRun ? 'would skip' : 'skipped'},
              {' '}{results.filter(r => r.status === 'error').length} errors
            </CardDescription>
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
                                <span className="text-destructive line-through">{JSON.stringify(result.data.existing[key])}</span>
                                {' → '}
                                <span className="text-accent font-semibold">{JSON.stringify(value)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="font-semibold text-muted-foreground">New record data:</div>
                            {Object.entries(result.data).map(([key, value]) => (
                              <div key={key}>
                                <span className="text-muted-foreground">{key}:</span>{' '}
                                <span className="text-accent">{JSON.stringify(value)}</span>
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
          </CardContent>
        </Card>
      )}
    </div>
  )
}
