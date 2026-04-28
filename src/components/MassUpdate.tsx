import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { Database, Warning, CheckCircle, X, Upload, ArrowClockwise, Eye, FileArrowUp } from '@phosphor-icons/react'
import { bullhornAPI } from '@/lib/bullhorn-api'
import Papa from 'papaparse'

interface FieldInfo {
  label: string
  name: string
  dataType: string
  required?: boolean
}

interface UpdateResult {
  id: number
  success: boolean
  error?: string
}

interface PreviewRecord {
  id: number
  currentValues: Record<string, any>
  newValues: Record<string, any>
  status: 'pending' | 'error'
  error?: string
}

const COMMON_ENTITIES = [
  { value: 'ClientContact', label: 'Client Contact' },
  { value: 'JobOrder', label: 'Job Order' },
  { value: 'Candidate', label: 'Candidate' },
  { value: 'Placement', label: 'Placement' },
  { value: 'ClientCorporation', label: 'Client Corporation' },
  { value: 'Lead', label: 'Lead' },
  { value: 'Opportunity', label: 'Opportunity' },
  { value: 'JobSubmission', label: 'Job Submission' },
  { value: 'Appointment', label: 'Appointment' },
  { value: 'Task', label: 'Task' },
  { value: 'Note', label: 'Note' }
]

export function MassUpdate({ onLog }: { onLog: (operation: string, status: 'success' | 'error', message: string, details?: any) => void }) {
  const [selectedEntity, setSelectedEntity] = useState('')
  const [customEntity, setCustomEntity] = useState('')
  const [availableFields, setAvailableFields] = useState<FieldInfo[]>([])
  const [isLoadingFields, setIsLoadingFields] = useState(false)
  const [idsInput, setIdsInput] = useState('')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [parsedIds, setParsedIds] = useState<number[]>([])
  const [updateFields, setUpdateFields] = useState<Array<{ field: string; value: string }>>([{ field: '', value: '' }])
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<UpdateResult[]>([])
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [previewRecords, setPreviewRecords] = useState<PreviewRecord[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [useStandardUpdate, setUseStandardUpdate] = useState(false)

  const loadEntityFields = async (entity: string) => {
    if (!entity) return
    
    setIsLoadingFields(true)
    setAvailableFields([])
    
    try {
      const response = await bullhornAPI.getEntityMeta(entity, '*')
      const fields = response.fields as Record<string, any>
      
      const fieldList = Object.entries(fields)
        .filter(([_, field]) => {
          return field.dataType === 'String' ||
                 field.dataType === 'Integer' ||
                 field.dataType === 'Double' ||
                 field.dataType === 'BigDecimal' ||
                 field.dataType === 'Boolean' ||
                 field.dataType === 'Timestamp'
        })
        .map(([name, field]) => ({
          name,
          label: field.label || name,
          dataType: field.dataType,
          required: field.required
        }))
        .sort((a, b) => a.label.localeCompare(b.label))

      setAvailableFields(fieldList)
      toast.success(`Loaded ${fieldList.length} updateable fields`)
      onLog('Load Fields', 'success', `Loaded fields for entity: ${entity}`, {
        entity,
        fieldCount: fieldList.length
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Failed to load fields: ${errorMessage}`)
      onLog('Load Fields', 'error', `Failed to load entity fields for ${entity}`, { error: errorMessage })
    } finally {
      setIsLoadingFields(false)
    }
  }

  const handleEntityChange = (value: string) => {
    setSelectedEntity(value)
    setCustomEntity('')
    loadEntityFields(value)
  }

  const handleCustomEntityChange = (value: string) => {
    setCustomEntity(value)
    setSelectedEntity('')
  }

  const handleLoadCustomEntity = () => {
    if (customEntity.trim()) {
      loadEntityFields(customEntity.trim())
      setSelectedEntity(customEntity.trim())
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setCsvFile(file)
      setIdsInput('')
      parseCsvFile(file)
    }
  }

  const parseCsvFile = (file: File) => {
    Papa.parse(file, {
      complete: (results: any) => {
        const idColumn = results.meta.fields?.find(
          (f: string) => f.toLowerCase() === 'id' || f.toLowerCase() === 'recordid'
        )

        if (!idColumn) {
          toast.error('CSV must have an "id" or "recordId" column')
          setCsvFile(null)
          return
        }

        const ids = results.data
          .filter((row: any) => row[idColumn])
          .map((row: any) => parseInt(row[idColumn], 10))
          .filter((id: number) => !isNaN(id))

        setParsedIds(ids)
        toast.success(`Loaded ${ids.length} IDs from CSV`)
      },
      header: true,
      skipEmptyLines: true,
      error: (error: any) => {
        toast.error(`Failed to parse CSV: ${error.message}`)
        setCsvFile(null)
      }
    })
  }

  const handleIdsInputChange = (value: string) => {
    setIdsInput(value)
    setCsvFile(null)
    
    if (value.trim()) {
      const ids = value
        .split(/[\s,;]+/)
        .map(id => parseInt(id.trim(), 10))
        .filter(id => !isNaN(id))
      setParsedIds(ids)
    } else {
      setParsedIds([])
    }
  }

  const clearIds = () => {
    setIdsInput('')
    setCsvFile(null)
    setParsedIds([])
    setPreviewRecords([])
    setResults([])
    setShowPreview(false)
  }

  const addFieldUpdate = () => {
    setUpdateFields([...updateFields, { field: '', value: '' }])
  }

  const removeFieldUpdate = (index: number) => {
    setUpdateFields(updateFields.filter((_, i) => i !== index))
  }

  const updateFieldAtIndex = (index: number, field: string, value: string) => {
    const updated = [...updateFields]
    updated[index] = { field, value }
    setUpdateFields(updated)
  }

  const loadPreview = async () => {
    if (!selectedEntity) {
      toast.error('Please select an entity')
      return
    }

    const validFields = updateFields.filter(uf => uf.field)
    if (validFields.length === 0) {
      toast.error('Please select at least one field to update')
      return
    }

    if (parsedIds.length === 0) {
      toast.error('Please provide record IDs')
      return
    }

    setIsLoadingPreview(true)
    setPreviewRecords([])

    try {
      const fieldsToFetch = validFields.map(uf => uf.field).join(',')
      const preview: PreviewRecord[] = []

      const batchSize = 50
      for (let i = 0; i < parsedIds.length; i += batchSize) {
        const batch = parsedIds.slice(i, i + batchSize)
        const batchPromises = batch.map(async (id) => {
          try {
            const currentData = await bullhornAPI.getEntity(selectedEntity, id, fieldsToFetch)
            
            const currentValues: Record<string, any> = {}
            const newValues: Record<string, any> = {}
            
            validFields.forEach(uf => {
              currentValues[uf.field] = currentData[uf.field]
              newValues[uf.field] = uf.value || null
            })

            return {
              id,
              currentValues,
              newValues,
              status: 'pending' as const
            }
          } catch (error) {
            return {
              id,
              currentValues: {},
              newValues: {},
              status: 'error' as const,
              error: error instanceof Error ? error.message : 'Failed to fetch'
            }
          }
        })

        const batchResults = await Promise.all(batchPromises)
        preview.push(...batchResults)
        setPreviewRecords([...preview])
      }

      setShowPreview(true)
      toast.success(`Loaded preview for ${preview.length} records`)
      
      onLog('Preview Load', 'success', `Loaded preview for ${parsedIds.length} ${selectedEntity} records`, {
        entity: selectedEntity,
        recordCount: preview.length,
        fields: validFields.map(f => f.field)
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Failed to load preview: ${errorMessage}`)
      onLog('Preview Load', 'error', 'Failed to load preview', { error: errorMessage })
    } finally {
      setIsLoadingPreview(false)
    }
  }

  const executeMassUpdate = async () => {
    if (!selectedEntity) {
      toast.error('Please select an entity')
      return
    }

    const validFields = updateFields.filter(uf => uf.field)
    if (validFields.length === 0) {
      toast.error('Please select at least one field to update')
      return
    }

    if (parsedIds.length === 0) {
      toast.error('Please provide record IDs')
      return
    }

    const fieldsList = validFields.map(uf => `${uf.field}: ${uf.value || '(empty)'}`).join(', ')
    
    if (!confirm(
      `Update ${parsedIds.length} ${selectedEntity} record(s)?\n\n` +
      `Fields to update:\n${fieldsList}\n\n` +
      `${useStandardUpdate ? 'Using Standard Update (one by one)' : 'Using Mass Update endpoint'}`
    )) {
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setResults([])

    const updateResults: UpdateResult[] = []

    try {
      const updatePayload: Record<string, any> = {}
      validFields.forEach(uf => {
        const fieldInfo = availableFields.find(f => f.name === uf.field)
        if (fieldInfo?.dataType === 'Integer') {
          updatePayload[uf.field] = uf.value ? parseInt(uf.value, 10) : null
        } else if (fieldInfo?.dataType === 'Double' || fieldInfo?.dataType === 'BigDecimal') {
          updatePayload[uf.field] = uf.value ? parseFloat(uf.value) : null
        } else if (fieldInfo?.dataType === 'Boolean') {
          updatePayload[uf.field] = uf.value.toLowerCase() === 'true'
        } else {
          updatePayload[uf.field] = uf.value || null
        }
      })

      const rollbackData: Array<{ id: number; originalData: Record<string, any> }> = []

      onLog('Mass Update', 'success', `Starting mass update for ${parsedIds.length} ${selectedEntity} records`, {
        entity: selectedEntity,
        fields: validFields.map(f => f.field),
        recordCount: parsedIds.length,
        updatePayload,
        method: useStandardUpdate ? 'standard' : 'massupdate'
      })

      if (useStandardUpdate) {
        const batchSize = 10
        for (let i = 0; i < parsedIds.length; i += batchSize) {
          const batch = parsedIds.slice(i, i + batchSize)
          const batchPromises = batch.map(async (id) => {
            try {
              const fieldsToFetch = validFields.map(uf => uf.field).join(',')
              const originalData = await bullhornAPI.getEntity(selectedEntity, id, fieldsToFetch)
              
              const originalValues: Record<string, any> = {}
              validFields.forEach(uf => {
                originalValues[uf.field] = originalData[uf.field]
              })
              rollbackData.push({ id, originalData: originalValues })

              await bullhornAPI.updateEntity(selectedEntity, id, updatePayload)
              return { id, success: true }
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error'
              return { id, success: false, error: errorMessage }
            }
          })

          const batchResults = await Promise.all(batchPromises)
          updateResults.push(...batchResults)
          
          setProgress(Math.round((updateResults.length / parsedIds.length) * 100))
          setResults([...updateResults])
        }
      } else {
        try {
          const fieldsToFetch = validFields.map(uf => uf.field).join(',')
          const batchSize = 50
          for (let i = 0; i < parsedIds.length; i += batchSize) {
            const batch = parsedIds.slice(i, i + batchSize)
            const batchRollbackPromises = batch.map(async (id) => {
              try {
                const originalData = await bullhornAPI.getEntity(selectedEntity, id, fieldsToFetch)
                const originalValues: Record<string, any> = {}
                validFields.forEach(uf => {
                  originalValues[uf.field] = originalData[uf.field]
                })
                return { id, originalData: originalValues }
              } catch (error) {
                return { id, originalData: {} }
              }
            })
            
            const batchRollback = await Promise.all(batchRollbackPromises)
            rollbackData.push(...batchRollback)
          }

          const massUpdatePayload = {
            ids: parsedIds,
            ...updatePayload
          }

          const session = bullhornAPI.getSession()
          if (!session) {
            throw new Error('Not authenticated')
          }

          const params = new URLSearchParams({
            BhRestToken: session.BhRestToken
          })

          const response = await fetch(
            `${session.restUrl}massUpdate/${encodeURIComponent(selectedEntity)}?${params.toString()}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(massUpdatePayload)
            }
          )

          if (!response.ok) {
            const error = await response.text()
            throw new Error(`Mass update failed: ${error}`)
          }

          const result = await response.json()
          console.log('Mass update result:', result)

          parsedIds.forEach(id => {
            updateResults.push({ id, success: true })
          })

          setProgress(100)
          setResults(updateResults)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          toast.error(`Mass update failed, falling back to standard updates: ${errorMessage}`)
          
          const batchSize = 10
          for (let i = 0; i < parsedIds.length; i += batchSize) {
            const batch = parsedIds.slice(i, i + batchSize)
            const batchPromises = batch.map(async (id) => {
              try {
                await bullhornAPI.updateEntity(selectedEntity, id, updatePayload)
                return { id, success: true }
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error'
                return { id, success: false, error: errorMessage }
              }
            })

            const batchResults = await Promise.all(batchPromises)
            updateResults.push(...batchResults)
            
            setProgress(Math.round((updateResults.length / parsedIds.length) * 100))
            setResults([...updateResults])
          }
        }
      }

      const successCount = updateResults.filter(r => r.success).length
      const failCount = updateResults.filter(r => !r.success).length

      if (failCount === 0) {
        toast.success(`Successfully updated all ${successCount} records`)
      } else {
        toast.warning(`Updated ${successCount} records, ${failCount} failed`)
      }

      onLog('Mass Update', successCount === updateResults.length ? 'success' : 'error', 
        `Mass update completed: ${successCount} success, ${failCount} failed`, {
        entity: selectedEntity,
        successCount,
        failCount,
        fields: validFields.map(f => ({ field: f.field, value: f.value })),
        recordCount: parsedIds.length,
        rollbackData: rollbackData.length > 0 ? rollbackData : undefined,
        failedOperations: updateResults.filter(r => !r.success).map(r => ({ id: r.id, error: r.error }))
      })

      setShowPreview(false)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Mass update failed: ${errorMessage}`)
      onLog('Mass Update', 'error', 'Mass update failed', { 
        error: errorMessage,
        entity: selectedEntity,
        fields: validFields.map(f => f.field),
        recordCount: parsedIds.length
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Database size={24} weight="duotone" />
            <div>
              <CardTitle>Mass Update</CardTitle>
              <CardDescription>
                Bulk update multiple fields across multiple records using the Bullhorn Mass Update API
              </CardDescription>
            </div>
          </div>
          <Alert>
            <Warning size={16} />
            <AlertDescription>
              This tool updates records directly via the Bullhorn API with rollback data captured. Always preview and test with a small batch first.
            </AlertDescription>
          </Alert>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="entity-select">Entity Type</Label>
              <Select value={selectedEntity} onValueChange={handleEntityChange} disabled={isProcessing}>
                <SelectTrigger id="entity-select">
                  <SelectValue placeholder="Select entity type" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_ENTITIES.map((entity) => (
                    <SelectItem key={entity.value} value={entity.value}>
                      {entity.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-entity">Or Enter Custom Entity</Label>
              <div className="flex gap-2">
                <Input
                  id="custom-entity"
                  value={customEntity}
                  onChange={(e) => handleCustomEntityChange(e.target.value)}
                  placeholder="e.g., CorporateUser"
                  disabled={isProcessing}
                />
                <Button
                  onClick={handleLoadCustomEntity}
                  disabled={!customEntity.trim() || isProcessing}
                  variant="secondary"
                >
                  <ArrowClockwise size={18} />
                  Load
                </Button>
              </div>
            </div>
          </div>

          {isLoadingFields && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ArrowClockwise size={16} className="animate-spin" />
              Loading available fields...
            </div>
          )}

          {selectedEntity && availableFields.length > 0 && (
            <>
              <Separator />
              
              <div className="space-y-4">
                <Label>Record IDs to Update</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ids-input">Paste IDs (comma or newline separated)</Label>
                    <Textarea
                      id="ids-input"
                      value={idsInput}
                      onChange={(e) => handleIdsInputChange(e.target.value)}
                      placeholder="123456, 789012, 345678"
                      rows={5}
                      disabled={isProcessing || !!csvFile}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="csv-upload">Or Upload CSV with ID Column</Label>
                    <div className="space-y-2">
                      <Input
                        id="csv-upload"
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        disabled={isProcessing || !!idsInput}
                      />
                      {csvFile && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <FileArrowUp size={16} />
                          {csvFile.name}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {parsedIds.length > 0 && (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <Badge variant="secondary" className="text-sm">
                      {parsedIds.length} IDs ready
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={clearIds} disabled={isProcessing}>
                      <X size={16} />
                      Clear
                    </Button>
                  </div>
                )}
              </div>

              <Separator />
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Fields to Update</Label>
                  <Button onClick={addFieldUpdate} size="sm" variant="outline" disabled={isProcessing}>
                    Add Field
                  </Button>
                </div>

                {updateFields.map((uf, index) => (
                  <div key={index} className="grid gap-4 md:grid-cols-2 items-end">
                    <div className="space-y-2">
                      <Label htmlFor={`field-select-${index}`}>Field {index + 1}</Label>
                      <Select
                        value={uf.field}
                        onValueChange={(value) => updateFieldAtIndex(index, value, uf.value)}
                        disabled={isProcessing}
                      >
                        <SelectTrigger id={`field-select-${index}`}>
                          <SelectValue placeholder="Select field to update" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableFields.map((field) => (
                            <SelectItem key={field.name} value={field.name}>
                              {field.label} ({field.dataType})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`field-value-${index}`}>New Value</Label>
                        {uf.field && (
                          <span className="text-xs text-muted-foreground">
                            {availableFields.find(f => f.name === uf.field)?.dataType}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          id={`field-value-${index}`}
                          value={uf.value}
                          onChange={(e) => updateFieldAtIndex(index, uf.field, e.target.value)}
                          disabled={isProcessing}
                          placeholder="Enter new value (leave empty for null)"
                        />
                        {updateFields.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFieldUpdate(index)}
                            disabled={isProcessing}
                          >
                            <X size={16} />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    id="use-standard"
                    checked={useStandardUpdate}
                    onCheckedChange={setUseStandardUpdate}
                    disabled={isProcessing}
                  />
                  <Label htmlFor="use-standard" className="cursor-pointer">
                    Use Standard Update (one by one)
                  </Label>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={loadPreview}
                    disabled={
                      !selectedEntity ||
                      updateFields.filter(uf => uf.field).length === 0 ||
                      parsedIds.length === 0 ||
                      isLoadingPreview ||
                      isProcessing
                    }
                    variant="secondary"
                  >
                    <Eye size={18} />
                    {isLoadingPreview ? 'Loading...' : 'Preview Changes'}
                  </Button>
                  <Button
                    onClick={executeMassUpdate}
                    disabled={
                      !selectedEntity ||
                      updateFields.filter(uf => uf.field).length === 0 ||
                      parsedIds.length === 0 ||
                      isProcessing
                    }
                    size="lg"
                  >
                    <Upload size={18} />
                    {isProcessing
                      ? 'Processing...'
                      : `Update ${parsedIds.length} Record${parsedIds.length !== 1 ? 's' : ''}`}
                  </Button>
                </div>
              </div>

              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Processing mass update...</span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}

              {showPreview && previewRecords.length > 0 && !isProcessing && results.length === 0 && (
                <div className="space-y-4">
                  <Separator />
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold">Preview Changes</h3>
                      <Badge variant="secondary">
                        {previewRecords.length} records
                      </Badge>
                    </div>
                    <ScrollArea className="h-96 border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            {updateFields.filter(uf => uf.field).map((uf, i) => (
                              <TableHead key={i}>
                                {availableFields.find(f => f.name === uf.field)?.label || uf.field}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewRecords.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell className="font-mono">{record.id}</TableCell>
                              {updateFields.filter(uf => uf.field).map((uf, i) => (
                                <TableCell key={i}>
                                  <div className="space-y-1">
                                    <div className="text-xs text-muted-foreground line-through">
                                      {String(record.currentValues[uf.field] ?? '-')}
                                    </div>
                                    <div className="text-sm font-medium text-accent">
                                      {String(record.newValues[uf.field] ?? '(null)')}
                                    </div>
                                  </div>
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                </div>
              )}

              {results.length > 0 && (
                <div className="space-y-4">
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle size={14} className="text-accent" />
                        <span className="text-sm">{results.filter(r => r.success).length} success</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Warning size={14} className="text-destructive" />
                        <span className="text-sm">{results.filter(r => !r.success).length} failed</span>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setResults([])
                        setParsedIds([])
                        setIdsInput('')
                        setCsvFile(null)
                        setUpdateFields([{ field: '', value: '' }])
                        setPreviewRecords([])
                        setShowPreview(false)
                      }}
                    >
                      Reset
                    </Button>
                  </div>
                  <ScrollArea className="max-h-96">
                    <div className="space-y-2">
                      {results.map((result) => (
                        <div
                          key={result.id}
                          className={`flex items-center justify-between p-2 rounded border ${
                            result.success
                              ? 'border-accent/20 bg-accent/5'
                              : 'border-destructive/20 bg-destructive/5'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {result.success ? (
                              <CheckCircle className="text-accent" size={16} />
                            ) : (
                              <Warning className="text-destructive" size={16} />
                            )}
                            <span className="text-sm font-mono">ID: {result.id}</span>
                          </div>
                          {result.error && (
                            <span className="text-xs text-destructive">
                              {result.error}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
