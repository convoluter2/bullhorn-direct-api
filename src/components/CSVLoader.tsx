import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Upload, Lightning, CheckCircle, XCircle } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { BULLHORN_ENTITIES, getEntityFields } from '@/lib/entities'
import { parseCSV } from '@/lib/csv-utils'
import type { CSVMapping } from '@/lib/types'

interface CSVLoaderProps {
  onLog: (operation: string, status: 'success' | 'error', message: string, details?: any) => void
}

export function CSVLoader({ onLog }: CSVLoaderProps) {
  const [entity, setEntity] = useState('')
  const [csvData, setCsvData] = useState<{ headers: string[]; rows: string[][] } | null>(null)
  const [mappings, setMappings] = useState<CSVMapping[]>([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<Array<{ row: number; status: 'success' | 'error'; message: string }>>([])

  const availableFields = entity ? getEntityFields(entity) : []

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

    setLoading(true)
    setProgress(0)
    const importResults: Array<{ row: number; status: 'success' | 'error'; message: string }> = []

    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < csvData.rows.length; i++) {
      const row = csvData.rows[i]
      
      try {
        const data: any = {}
        validMappings.forEach(mapping => {
          const csvIndex = csvData.headers.indexOf(mapping.csvColumn)
          if (csvIndex !== -1) {
            data[mapping.bullhornField] = row[csvIndex]
          }
        })

        await bullhornAPI.createEntity(entity, data)
        importResults.push({
          row: i + 1,
          status: 'success',
          message: 'Created successfully'
        })
        successCount++
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Import failed'
        importResults.push({
          row: i + 1,
          status: 'error',
          message: errorMessage
        })
        errorCount++
      }

      setProgress(((i + 1) / csvData.rows.length) * 100)
    }

    setResults(importResults)
    setLoading(false)

    if (errorCount === 0) {
      toast.success(`Successfully imported ${successCount} records`)
    } else {
      toast.warning(`Import completed: ${successCount} success, ${errorCount} errors`)
    }

    onLog(
      'CSV Import',
      errorCount === 0 ? 'success' : 'error',
      `Imported ${successCount} of ${csvData.rows.length} records`,
      { entity, successCount, errorCount, mappings: validMappings }
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
          <CardDescription>Import bulk data from CSV files into Bullhorn entities</CardDescription>
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
              <div className="space-y-2">
                <Label>Field Mapping</Label>
                <div className="space-y-2">
                  {mappings.map((mapping) => (
                    <div key={mapping.csvColumn} className="flex gap-2 items-center">
                      <div className="flex-1 font-mono text-sm bg-muted p-2 rounded">
                        {mapping.csvColumn}
                      </div>
                      <div className="text-muted-foreground">→</div>
                      <div className="flex-1">
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
                              <SelectItem key={field} value={field}>
                                {field}
                              </SelectItem>
                            ))}
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
                >
                  <Lightning />
                  {loading ? 'Importing...' : 'Start Import'}
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
            <CardTitle>Import Results</CardTitle>
            <CardDescription>
              {results.filter(r => r.status === 'success').length} successful, 
              {' '}{results.filter(r => r.status === 'error').length} errors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {results.map((result) => (
                  <div key={result.row} className="flex items-center gap-2 p-2 rounded border">
                    {result.status === 'success' ? (
                      <CheckCircle className="text-green-500" size={20} />
                    ) : (
                      <XCircle className="text-destructive" size={20} />
                    )}
                    <span className="font-mono text-sm">Row {result.row}:</span>
                    <span className="text-sm flex-1">{result.message}</span>
                    <Badge variant={result.status === 'success' ? 'default' : 'destructive'}>
                      {result.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    />
  )
}
