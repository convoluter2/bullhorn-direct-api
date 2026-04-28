import { useState } from 'react'
import { Card, CardContent, CardDescription, Ca
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/tex
import { Separator } from '@/components/ui/se
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { bullhornAPI } from '@/lib/bullhorn-a

  onLog: (operation: string, status: 'success' | 'error', messa

  value: string
import { toast } from 'sonner'
import Papa from 'papaparse'
import { bullhornAPI } from '@/lib/bullhorn-api'
import type { AuditLog } from '@/lib/types'

interface MassUpdateProps {
  onLog: (operation: string, status: 'success' | 'error', message: string, details?: any) => void
}

interface EntityOption {
  value: string
  label: string
}

interface FieldInfo {
  name: string
  label: string
  dataType: string
  maxLength?: number
}

interface UpdateResult {
  id: number
  success: boolean
  error?: string
}

const COMMON_ENTITIES: EntityOption[] = [
  { value: 'Candidate', label: 'Candidate' },
  { value: 'ClientContact', label: 'Client Contact' },
  { value: 'ClientCorporation', label: 'Client Corporation' },
  { value: 'JobOrder', label: 'Job Order' },
  { value: 'Placement', label: 'Placement' },
  { value: 'Lead', label: 'Lead' },
  { value: 'Opportunity', label: 'Opportunity' },
  { value: 'Note', label: 'Note' },
  { value: 'Task', label: 'Task' },
  { value: 'Appointment', label: 'Appointment' },
]

export function MassUpdate({ onLog }: MassUpdateProps) {
  const [selectedEntity, setSelectedEntity] = useState('')
  const [availableFields, setAvailableFields] = useState<FieldInfo[]>([])
  const [selectedField, setSelectedField] = useState('')
  const [fieldValue, setFieldValue] = useState('')
  const [idsInput, setIdsInput] = useState('')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [parsedIds, setParsedIds] = useState<number[]>([])
  const [isLoadingFields, setIsLoadingFields] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<UpdateResult[]>([])

  const loadFields = async () => {
    if (!selectedEntity) return

    setIsLoadingFields(true)
      complete: (results
    setAvailableFields([])
    
        
      const response = await bullhornAPI.getEntityMetadata(selectedEntity)
      
      if (response && response.fields) {
        const fieldList = Object.entries(response.fields)
          .filter(([_, field]: [string, any]) => {
            return field.dataType === 'String' || 
                   field.dataType === 'Integer' || 
                   field.dataType === 'Double' ||
                   field.dataType === 'Boolean' ||
                   field.dataType === 'BigDecimal'
          })
          .map(([name, field]: [string, any]) => ({
            name,
            label: field.label || name,
            dataType: field.dataType,
            maxLength: field.maxLength,
          }))
          .sort((a, b) => a.label.localeCompare(b.label))

        setAvailableFields(fieldList)
        toast.success(`Loaded ${fieldList.length} updatable fields`)
        
        onLog('Load Fields', 'success', `Loaded fields for ${selectedEntity}`, {
      setParsedIds([...new Set(id
          fieldCount: fieldList.length,
    }
      } else {
        throw new Error('Invalid response format')
      }
    setParsedIds([])
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Failed to load fields: ${errorMessage}`)
      onLog('Load Fields', 'error', 'Failed to load entity fields', { error: errorMessage })

      setIsLoadingFields(false)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setCsvFile(file)
    )) {
    

      header: true,
    setResults([])
      complete: (results: any) => {
        entity: selectedEntity,
          (field: string) => field.toLowerCase() === 'id'
      })
        
        if (!idColumn) {
          toast.error('CSV must contain an "id" column')
          setCsvFile(null)
          return
         

        const ids = results.data
          .map((row: any) => {
            return { id, success: fa
            return id ? parseInt(id, 10) : null

          .filter((id: number | null) => id !== null && !isNaN(id))

        setParsedIds([...new Set(ids)])
        toast.success(`Loaded ${ids.length} IDs from CSV`)
      },
      error: (error: any) => {
        toast.error(`Failed to parse CSV: ${error.message}`)
      }
    })
   

  const handleIdsInputChange = (value: string) => {
    setIdsInput(value)
    setCsvFile(null)
    
    if (value.trim()) {
      const ids = value
        .split(/[\n,;]/)
        .map(id => parseInt(id.trim(), 10))
        .filter(id => !isNaN(id))
      
      setParsedIds([...new Set(ids)])
    } else {
      setParsedIds([])
    }
  }

    } finally {
    setIdsInput('')
  }
    setParsedIds([])
  c

    <div className="space-y-6">
    if (!selectedEntity) {
      toast.error('Please select an entity')
      return
     

    if (!selectedField) {
      toast.error('Please select a field to update')
          <A
    }

          <div className="space-y
      toast.error('Please provide record IDs')
            
    }

    if (!confirm(
      `Are you sure you want to update ${parsedIds.length} ${selectedEntity} records?\n\n` +
      `Field: ${selectedField}\n` +
      `Value: ${fieldValue || '(empty)'}`
    )) {
      return
    }

    setIsProcessing(true)
    setProgress(0)
                </

         
      onLog('Mass Update', 'success', `Starting mass update of ${selectedEntity}`, {
                    onClick={lo
        field: selectedField,
        idCount: parsedIds.length,
        

      const updateResults: UpdateResult[] = []
      const batchSize = 10

      for (let i = 0; i < parsedIds.length; i += batchSize) {
        const batch = parsedIds.slice(i, i + batchSize)
        const batchPromises = batch.map(async (id) => {
          try {
            await bullhornAPI.updateEntity(selectedEntity, id, {
              [selectedField]: fieldValue || null,
            })
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
       

      const successCount = updateResults.filter(r => r.success).length
      const errorCount = updateResults.filter(r => !r.success).length

      if (successCount > 0) {
        toast.success(`Successfully updated ${successCount} records`)
      }
      if (errorCount > 0) {
        toast.error(`Failed to update ${errorCount} records`)
      }

      onLog('Mass Update', successCount > 0 ? 'success' : 'error', 
        `Mass update completed: ${successCount} success, ${errorCount} failed`, {
          entity: selectedEntity,
                      </p>
                  </div>
          successCount,
          errorCount,
          
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Mass update failed: ${errorMessage}`)
                        onChange={handleFileUpload}
        entity: selectedEntity,
                      {csvFil
                          variant=
        error: errorMessage,
        
               
      setIsProcessing(false)
     
  }

  const successCount = results.filter(r => r.success).length
  const errorCount = results.filter(r => !r.success).length

  return (
                  <div classNam
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database size={24} />
            Mass Update
          </CardTitle>
          <CardDescription>
            Bulk update a single field across multiple records using the Bullhorn API
          </CardDescription>
                     
        <CardContent className="space-y-6">
                 
            <Warning className="h-4 w-4" />
            <AlertDescription>
              This tool updates records directly via the Bullhorn API. Always test with a small batch first.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="entity-select">Entity Type</Label>
                <Select
                  value={selectedEntity}
                  onValueChange={(value) => {
                    setSelectedEntity(value)
                    setSelectedField('')
                    setAvailableFields([])
                  }}
                  disabled={isProcessing}
                >
                  <SelectTrigger id="entity-select">
                    <SelectValue placeholder="Select entity type" />
              </>
                  <SelectContent>
                    {COMMON_ENTITIES.map((entity) => (
                      <SelectItem key={entity.value} value={entity.value}>
              <Progress value={progres
                      </SelectItem>
              </p>
                  </SelectContent>
                </Select>
              </div>

              {selectedEntity && (
                <div className="flex items-end">
                  <Button
                    onClick={loadFields}
                    disabled={isLoadingFields || isProcessing}
                    variant="outline"
                    className="w-full"
                  >
                    {isLoadingFields ? 'Loading...' : 'Load Fields'}
                  </Button>
                </div>
              )}
            </div>

            {availableFields.length > 0 && (
                
                <div className="space-y-2">
                        {result.success ? (
                  <Select
                    value={selectedField}
                    onValueChange={setSelectedField}
                    disabled={isLoadingFields || isProcessing}
                  >
                    <SelectTrigger id="field-select">
                      <SelectValue placeholder={
                    </div>
                          ? 'Loading fields...'
                          : availableFields.length === 0
                          ? 'No fields available'
                          : 'Select field to update'
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFields.map((field) => (
                        <SelectItem key={field.name} value={field.name}>

                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedField && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="field-value">New Value</Label>
                      <span className="text-xs text-muted-foreground">
                        {availableFields.find(f => f.name === selectedField)?.dataType}
                      </span>

                    <Input
                      id="field-value"
                      value={fieldValue}
                      onChange={(e) => setFieldValue(e.target.value)}
                      disabled={isProcessing}
                      placeholder="Enter new value (leave empty for null)"
                    />
                    {fieldValue.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Length: {fieldValue.length}
                      </p>
                    )}
                  </div>
                )}

                <Separator />

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="csv-upload">Upload CSV (must contain an "id" column)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="csv-upload"
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        disabled={isProcessing}
                      />

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCsvFile(null)
                            setParsedIds([])
                          }}
                        >
                          <X size={16} />
                        </Button>
                      )}

                    {csvFile && (
                      <p className="text-xs text-muted-foreground">
                        Loaded: {csvFile.name}
                      </p>
                    )}
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <Separator />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>


                    <Label htmlFor="ids-input">Paste comma or newline-separated IDs</Label>

                      id="ids-input"
                      value={idsInput}
                      onChange={(e) => handleIdsInputChange(e.target.value)}
                      placeholder="1234, 5678, 9012&#10;or one per line"
                      rows={6}
                      disabled={isProcessing}
                    />
                  </div>

                  {parsedIds.length > 0 && (
                    <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/50">
                      <span className="text-sm font-medium">
                        {parsedIds.length} IDs ready
                      </span>
                      <Button variant="ghost" size="sm" onClick={clearIds}>
                        Clear
                      </Button>
                    </div>
                  )}
                </div>

                <Button
                  onClick={executeMassUpdate}
                  disabled={

                    !selectedField ||
                    parsedIds.length === 0 ||
                    isProcessing
                  }
                  className="w-full"
                  size="lg"

                  <Upload size={18} />
                  {isProcessing
                    ? 'Processing...'
                    : `Update ${parsedIds.length} Record${parsedIds.length !== 1 ? 's' : ''}`}
                </Button>
              </>
            )}
          </div>


            <div className="space-y-2">

              <p className="text-xs text-center text-muted-foreground">
                Processing mass update: {progress}% complete
              </p>

          )}

          {results.length > 0 && (
            <div className="space-y-4">
              <Separator />

                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Results</h3>
                  <div className="flex items-center gap-4">
                    <Badge variant="default" className="gap-1">
                      <CheckCircle size={14} />
                      {successCount} Success
                    </Badge>
                    {errorCount > 0 && (
                      <Badge variant="destructive" className="gap-1">
                        <Warning size={14} />
                        {errorCount} Failed
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {results.map((result) => (

                      key={result.id}
                      className={`flex items-center justify-between p-2 rounded border ${
                        result.success
                          ? 'border-accent/20 bg-accent/5'
                          : 'border-destructive/20 bg-destructive/5'

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
              </div>
            </div>
          )}

      </Card>
    </div>
  )

