import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { Database, Warning, CheckCircle, X, Upload, ArrowClockwise, Eye, FileArrowUp } from '@phosphor-icons/react'
import { bullhornAPI } from '@/lib/bullhorn-api'
import Papa from 'papaparse'

interface FieldInfo {
  label: string
 

interface PreviewRecord 
  currentValues
  status: 'pend
}

  success: boolean
}
const COMMON_EN
  { value: 'Client
  { value: 'JobOrder
  required?: boolean
 
  required?: boolean
 

interface PreviewRecord {
export funct
  currentValues: Record<string, any>
  newValues: Record<string, any>
  status: 'pending' | 'success' | 'error'
  const [parsedI
}

interface UpdateResult {
  id: number
  success: boolean
  error?: string
}


    setAvailableFields([])
    try {
      
        const fieldList = Object.entries(res
            return field.dataType === 'String
                   field.dataType =
                   field.dataType === 'Boolean' |
          })
            name,
            dataType: field.dataType,
 

        setAvailableFields(fieldList)
  const [updateFields, setUpdateFields] = useState<Array<{ field: string; value: string }>>([{ field: '', value: '' }])
      }
      const errorMessage = error instanceof Error ? error.m
      onLog('Load Fields', 'error', 'Failed to load entity
      setIsLoadingFields(false)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)

    const file = event.target.files?.[0]
  const [previewRecords, setPreviewRecords] = useState<PreviewRecord[]>([])
    setCsvFile(file)
  const [showPreview, setShowPreview] = useState(false)
  const [useStandardUpdate, setUseStandardUpdate] = useState(false)

        const idColumn = results.m
        )

          setCsvFile(null)
        }
    
         
          })

        toast.success(`Loaded ${ids.leng
      error: (error: any) => {
      }
  }
  const handleIdsInputChange = (value: string) => {
    setCsvFile(null)
                   field.dataType === 'BigDecimal' ||
                   field.dataType === 'Boolean' ||
                   field.dataType === 'Timestamp'
          })
    } else {
            name,

            dataType: field.dataType,
    setParsedIds([])
            required: field.required
          }))



    setUpdateFields(updateFields.filter((_, i) => i !== index))

    const updated = [...updateFields]
          entity: selectedEntity,

        })
      return

    if 
    } catch (error) {

      toast.error('Please provide record IDs')
    }
    } finally {

     


        const batchPromises = batch.map(async (id) => {
            const currentData = await bu
            const cur

              curren

    Papa.parse(file, {
              statu
      skipEmptyLines: true,
              id,
        const idColumn = results.meta.fields?.find(
              error: error instanceof Error ? error.messa
        )

        preview.push(...
      }
      setShowPreview(true)
      
        }

    } catch (error) {
      toast.error(`Failed to l
            const id = row[idColumn]
    }
          })
    if (!selectedEntity) {


    if (validFields.length === 0) {
      re

      toast.error('Please provide record IDs')
    }
    co
  }

    )) {
    }
    setIsProcessing(
    
    try {
      validFields.forEa
        if (fieldInfo?.d
        } else if (fieldInfo?.dataType === 
        } else if (fieldInfo?.dat
      
        }


     
   

  const clearIds = () => {

    setCsvFile(null)
          const batc
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
      } else {
          const fieldsToFetch = validFields.
          fo
     

    const validFields = updateFields.filter(uf => uf.field)
    if (validFields.length === 0) {
      toast.error('Please select at least one field to update')
      return
    }

    if (parsedIds.length === 0) {
            ids: parsedIds,
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
    
        fields: v
      })
      `Fields to update:\n${fieldsList}\n\n` +
      `${useStandardUpdate ? 'Using Standard Update (one by one)' : 'Using Mass Update endpoint'}`
  const 

    <

            <Database siz
          </CardTi
    setResults([])

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

                    setShowPreview(false)
        entity: selectedEntity,
        fields: validFields.map(f => f.field),
                  </SelectTrigger>
        updatePayload,
        method: useStandardUpdate ? 'standard' : 'massupdate'
      })

                </Select>

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
              
            const batchRollback = await Promise.all(batchRollbackPromises)
            rollbackData.push(...batchRollback)
           

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


                        {parsedIds.length} IDs ready
                      <Button variant="ghost" size="sm" onClick={clea

                  )}


                  <div clas
                      id="use-standard"
       

                      Use Standard Update (one by one)
                  </div>
                    <Button
          fields: validFields.map(f => ({ field: f.field, value: f.value })),
                       
                     
          rollbackData: rollbackData.length > 0 ? rollbackData : undefined,
          failedOperations: updateResults.filter(r => !r.success).map(r => ({ id: r.id, error: r.error }))
          
                    <
                      onClick={executeMassUpdate}
                        !selectedEntity ||
                        parsedIds.length === 0 ||
                      }
        fields: validFields.map(f => f.field),
                      {isPro
        
               
              </>
     
   

                Processing mass update: {progress}% complete
            </div>

          
         
            
                    
                </div>
            <Database size={24} weight="duotone" />
                      <
                      
                           
            Bulk update multiple fields across multiple records using the Bullhorn Mass Update API
                    </TableH
                     
                          <TableCell classN
                 
                                <div classN
                              
              This tool updates records directly via the Bullhorn API with rollback data captured. Always preview and test with a small batch first.
                              <
                  

                  </Table>
              </div>
          )}
          {results.length > 0 && (
              <Separato
                <div className="flex ite
                  <div className="flex items-
                      <CheckCircle size={14}
                    setUpdateFields([{ field: '', value: '' }])
                      <Badge variant="dest
                    setPreviewRecords([])
                    setShowPreview(false)
                    
                </div>
                 
                      <div
                        className={`flex items-center justify-betwee
                            ? 'bor
                        }`}
                        <div className="flex items-cen
                            <CheckCircle className="text-accent" size={16}
                            <Warning c
                          <span cla
                       
                            {resul
                        )
                    

            </div>
        </CardContent>
    </div>
}












                <Separator />
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Fields to Update</Label>
                    <Button onClick={addFieldUpdate} size="sm" variant="outline" disabled={isProcessing}>
                      Add Field
                    </Button>


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


                    ))}
                  </div>
                </ScrollArea>








