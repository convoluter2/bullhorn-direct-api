import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { ArrowsClockwise, Upload, Database, Warning, CheckCircle, X } from '@phosphor-icons/react'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { toast } from 'sonner'
import Papa from 'papaparse'

interface MassUpdateProps {
  onLog: (operation: string, status: 'success' | 'error', message: string, details?: any) => void
}

interface EntityInfo {
  entity: string
  label: string
}

interface FieldInfo {
  name: string
  label: string
  type: string
  dataType: string
  required?: boolean
  maxLength?: number
  options?: Array<{ value: string; label: string }>
}

interface MassUpdateResult {
  changedEntityId: number
  changeType: string
  data: any
  errorMessage?: string
}

export function MassUpdate({ onLog }: MassUpdateProps) {
  const [entities, setEntities] = useState<EntityInfo[]>([])
  const [selectedEntity, setSelectedEntity] = useState<string>('')
  const [availableFields, setAvailableFields] = useState<FieldInfo[]>([])
  const [selectedField, setSelectedField] = useState<string>('')
  const [fieldValue, setFieldValue] = useState<string>('')
  const [idsInput, setIdsInput] = useState<string>('')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [parsedIds, setParsedIds] = useState<number[]>([])
  const [isLoadingEntities, setIsLoadingEntities] = useState(false)
  const [isLoadingFields, setIsLoadingFields] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<MassUpdateResult[]>([])

  useEffect(() => {
    loadEntities()
  }, [])

  useEffect(() => {
    if (selectedEntity) {
      loadFields()
    } else {
      setAvailableFields([])
      setSelectedField('')
    }
  }, [selectedEntity])

  useEffect(() => {
    if (idsInput.trim()) {
      const ids = idsInput
        .split(/[,\s\n]+/)
        .map(id => id.trim())
        .filter(id => id && /^\d+$/.test(id))
        .map(id => parseInt(id, 10))
      setParsedIds([...new Set(ids)])
    } else if (csvFile) {
    } else {
      setParsedIds([])
    }
  }, [idsInput])

  const loadEntities = async () => {
    setIsLoadingEntities(true)
    try {
      console.log('🔍 Fetching mass update entities...')
      const response = await bullhornAPI.massUpdateGetEntities()
      console.log('✅ Mass update entities:', response)
      
      if (response && Array.isArray(response.entities)) {
        const entityList: EntityInfo[] = response.entities.map((entity: string) => ({
          entity,
          label: entity
        }))
        setEntities(entityList)
        toast.success(`Loaded ${entityList.length} entities`)
        onLog('Mass Update', 'success', `Loaded ${entityList.length} mass update entities`, {
          entityCount: entityList.length
        })
      } else {
        throw new Error('Invalid response format')
      }
    } catch (error) {
      console.error('❌ Failed to load mass update entities:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Failed to load entities: ${errorMessage}`)
      onLog('Mass Update', 'error', 'Failed to load mass update entities', {
        error: errorMessage
      })
    } finally {
      setIsLoadingEntities(false)
    }
  }

  const loadFields = async () => {
    if (!selectedEntity) return

    setIsLoadingFields(true)
    setAvailableFields([])
    setSelectedField('')
    
    try {
      console.log(`🔍 Fetching mass update fields for ${selectedEntity}...`)
      const response = await bullhornAPI.massUpdateGetFields(selectedEntity)
      console.log('✅ Mass update fields:', response)
      
      if (response && Array.isArray(response.fields)) {
        const fieldList: FieldInfo[] = response.fields.map((field: any) => ({
          name: field.name,
          label: field.label || field.name,
          type: field.type,
          dataType: field.dataType,
          required: field.required,
          maxLength: field.maxLength,
          options: field.options
        }))
        setAvailableFields(fieldList)
        toast.success(`Loaded ${fieldList.length} fields for ${selectedEntity}`)
        onLog('Mass Update', 'success', `Loaded ${fieldList.length} mass update fields`, {
          entity: selectedEntity,
          fieldCount: fieldList.length
        })
      } else {
        throw new Error('Invalid response format')
      }
    } catch (error) {
      console.error('❌ Failed to load mass update fields:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Failed to load fields: ${errorMessage}`)
      onLog('Mass Update', 'error', 'Failed to load mass update fields', {
        entity: selectedEntity,
        error: errorMessage
      })
    } finally {
      setIsLoadingFields(false)
    }
  }

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setCsvFile(file)
    setIdsInput('')

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        console.log('📄 CSV parsed:', results)
        
        const idColumn = results.meta.fields?.find(
          field => field.toLowerCase() === 'id' || field.toLowerCase() === 'entityid'
        )
        
        if (!idColumn) {
          toast.error('CSV must contain an "id" or "entityid" column')
          setCsvFile(null)
          return
        }

        const ids = results.data
          .map((row: any) => {
            const id = row[idColumn]
            return id && /^\d+$/.test(String(id).trim()) ? parseInt(String(id).trim(), 10) : null
          })
          .filter((id): id is number => id !== null)

        setParsedIds([...new Set(ids)])
        toast.success(`Parsed ${ids.length} unique IDs from CSV`)
      },
      error: (error) => {
        console.error('❌ CSV parse error:', error)
        toast.error(`Failed to parse CSV: ${error.message}`)
        setCsvFile(null)
      }
    })
  }

  const clearIds = () => {
    setIdsInput('')
    setCsvFile(null)
    setParsedIds([])
  }

  const executeMassUpdate = async () => {
    if (!selectedEntity) {
      toast.error('Please select an entity')
      return
    }

    if (!selectedField) {
      toast.error('Please select a field to update')
      return
    }

    if (fieldValue.trim() === '') {
      toast.error('Please enter a value for the field')
      return
    }

    if (parsedIds.length === 0) {
      toast.error('Please provide at least one ID')
      return
    }

    const confirmed = confirm(
      `Are you sure you want to update ${parsedIds.length} ${selectedEntity} record(s)?\n\n` +
      `Field: ${selectedField}\n` +
      `Value: ${fieldValue}\n\n` +
      `This action cannot be undone.`
    )

    if (!confirmed) return

    setIsProcessing(true)
    setProgress(0)
    setResults([])

    try {
      console.log('🚀 Starting mass update:', {
        entity: selectedEntity,
        field: selectedField,
        value: fieldValue,
        idCount: parsedIds.length
      })

      const updateData = {
        [selectedField]: fieldValue
      }

      const response = await bullhornAPI.massUpdate(selectedEntity, parsedIds, updateData)
      console.log('✅ Mass update response:', response)

      setProgress(100)

      if (response && Array.isArray(response.results)) {
        setResults(response.results)
        
        const successCount = response.results.filter((r: MassUpdateResult) => r.changeType === 'UPDATE').length
        const errorCount = response.results.filter((r: MassUpdateResult) => r.errorMessage).length

        if (errorCount > 0) {
          toast.warning(`Updated ${successCount} records, ${errorCount} failed`)
        } else {
          toast.success(`Successfully updated ${successCount} records`)
        }

        onLog('Mass Update', errorCount > 0 ? 'error' : 'success', 
          `Mass update completed: ${successCount} success, ${errorCount} failed`, {
          entity: selectedEntity,
          field: selectedField,
          value: fieldValue,
          totalIds: parsedIds.length,
          successCount,
          errorCount,
          results: response.results
        })
      } else {
        throw new Error('Invalid response format')
      }
    } catch (error) {
      console.error('❌ Mass update failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Mass update failed: ${errorMessage}`)
      onLog('Mass Update', 'error', 'Mass update failed', {
        entity: selectedEntity,
        field: selectedField,
        value: fieldValue,
        idCount: parsedIds.length,
        error: errorMessage
      })
      setProgress(0)
    } finally {
      setIsProcessing(false)
    }
  }

  const selectedFieldInfo = availableFields.find(f => f.name === selectedField)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="text-accent" size={24} weight="duotone" />
            Mass Update
          </CardTitle>
          <CardDescription>
            Bulk update a single field across multiple records using the Bullhorn Mass Update API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Warning className="h-4 w-4" />
            <AlertDescription>
              Mass updates are permanent and cannot be undone. Always verify your entity, field selection, and IDs before executing.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="entity-select">Entity Type</Label>
              <div className="flex gap-2">
                <Select
                  value={selectedEntity}
                  onValueChange={setSelectedEntity}
                  disabled={isLoadingEntities || isProcessing}
                >
                  <SelectTrigger id="entity-select">
                    <SelectValue placeholder="Select an entity type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {entities.map(entity => (
                      <SelectItem key={entity.entity} value={entity.entity}>
                        {entity.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={loadEntities}
                  disabled={isLoadingEntities || isProcessing}
                >
                  <ArrowsClockwise className={isLoadingEntities ? 'animate-spin' : ''} />
                </Button>
              </div>
              {entities.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {entities.length} entities available for mass update
                </p>
              )}
            </div>

            {selectedEntity && (
              <>
                <Separator />
                
                <div className="space-y-2">
                  <Label htmlFor="field-select">Field to Update</Label>
                  <Select
                    value={selectedField}
                    onValueChange={setSelectedField}
                    disabled={isLoadingFields || isProcessing}
                  >
                    <SelectTrigger id="field-select">
                      <SelectValue placeholder={
                        isLoadingFields 
                          ? 'Loading fields...' 
                          : availableFields.length === 0 
                            ? 'No fields available' 
                            : 'Select a field to update...'
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFields.map(field => (
                        <SelectItem key={field.name} value={field.name}>
                          {field.label} ({field.name})
                          {field.required && <Badge variant="destructive" className="ml-2">Required</Badge>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {availableFields.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {availableFields.length} fields available for mass update
                    </p>
                  )}
                </div>

                {selectedFieldInfo && (
                  <div className="rounded-lg bg-muted p-4 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{selectedFieldInfo.type}</Badge>
                      <Badge variant="outline">{selectedFieldInfo.dataType}</Badge>
                      {selectedFieldInfo.required && (
                        <Badge variant="destructive">Required</Badge>
                      )}
                      {selectedFieldInfo.maxLength && (
                        <Badge variant="secondary">Max: {selectedFieldInfo.maxLength}</Badge>
                      )}
                    </div>
                    <p className="text-sm">
                      <span className="font-semibold">Field:</span> {selectedFieldInfo.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold">Name:</span> {selectedFieldInfo.name}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="field-value">New Value</Label>
                  <Input
                    id="field-value"
                    value={fieldValue}
                    onChange={(e) => setFieldValue(e.target.value)}
                    placeholder="Enter the new value for this field..."
                    disabled={!selectedField || isProcessing}
                    maxLength={selectedFieldInfo?.maxLength}
                  />
                  {selectedFieldInfo?.maxLength && (
                    <p className="text-xs text-muted-foreground">
                      {fieldValue.length} / {selectedFieldInfo.maxLength} characters
                    </p>
                  )}
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label>Record IDs to Update</Label>
                  
                  <div className="space-y-2">
                    <Label htmlFor="csv-upload" className="text-sm font-normal">
                      Upload CSV (must contain an "id" or "entityid" column)
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="csv-upload"
                        type="file"
                        accept=".csv"
                        onChange={handleCsvUpload}
                        disabled={isProcessing}
                      />
                      {csvFile && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            setCsvFile(null)
                            setParsedIds([])
                          }}
                        >
                          <X />
                        </Button>
                      )}
                    </div>
                    {csvFile && (
                      <p className="text-xs text-muted-foreground">
                        Loaded: {csvFile.name}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <Separator className="flex-1" />
                    <span className="text-xs text-muted-foreground">OR</span>
                    <Separator className="flex-1" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ids-input" className="text-sm font-normal">
                      Paste comma-separated IDs
                    </Label>
                    <Textarea
                      id="ids-input"
                      value={idsInput}
                      onChange={(e) => setIdsInput(e.target.value)}
                      placeholder="123, 456, 789 or one per line..."
                      disabled={isProcessing || !!csvFile}
                      rows={4}
                    />
                  </div>

                  {parsedIds.length > 0 && (
                    <div className="rounded-lg bg-accent/10 border border-accent/20 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold">
                          Parsed {parsedIds.length} unique ID{parsedIds.length !== 1 ? 's' : ''}
                        </p>
                        <Button variant="ghost" size="sm" onClick={clearIds}>
                          <X className="mr-1" size={16} />
                          Clear
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground max-h-32 overflow-y-auto">
                        {parsedIds.slice(0, 50).join(', ')}
                        {parsedIds.length > 50 && ` ... and ${parsedIds.length - 50} more`}
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                <Button
                  onClick={executeMassUpdate}
                  disabled={
                    !selectedEntity ||
                    !selectedField ||
                    !fieldValue.trim() ||
                    parsedIds.length === 0 ||
                    isProcessing
                  }
                  className="w-full"
                  size="lg"
                >
                  <Upload className="mr-2" />
                  {isProcessing
                    ? 'Processing...'
                    : `Update ${parsedIds.length} Record${parsedIds.length !== 1 ? 's' : ''}`}
                </Button>
              </>
            )}
          </div>

          {isProcessing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-center text-muted-foreground">
                Processing mass update...
              </p>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-4">
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-3">Update Results</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {results.map((result, index) => (
                    <div
                      key={index}
                      className={`rounded-lg border p-3 ${
                        result.errorMessage
                          ? 'bg-destructive/10 border-destructive/20'
                          : 'bg-accent/10 border-accent/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {result.errorMessage ? (
                              <Warning className="text-destructive" size={16} />
                            ) : (
                              <CheckCircle className="text-accent" size={16} />
                            )}
                            <span className="text-sm font-semibold">
                              ID: {result.changedEntityId}
                            </span>
                            <Badge variant={result.errorMessage ? 'destructive' : 'default'}>
                              {result.changeType}
                            </Badge>
                          </div>
                          {result.errorMessage && (
                            <p className="text-xs text-destructive mt-1 ml-6">
                              {result.errorMessage}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
