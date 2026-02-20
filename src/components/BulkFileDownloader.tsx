import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { FileZip, FileCsv, Download, CheckCircle, XCircle, Info, Upload, Trash, Faders, Pause, Play, ArrowClockwise } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { useEntities } from '@/hooks/use-entities'
import Papa from 'papaparse'
import JSZip from 'jszip'

interface BulkFileDownloaderProps {
  onLog: (operation: string, status: 'success' | 'error', message: string, details?: any) => void
}

interface DownloadResult {
  entityId: string
  status: 'success' | 'error' | 'pending'
  message?: string
  fileCount?: number
  zipSize?: number
  fileName?: string
  currentFile?: string
  filesDownloaded?: number
  totalFiles?: number
  retryCount?: number
}

export function BulkFileDownloader({ onLog }: BulkFileDownloaderProps) {
  const [entity, setEntity] = useState('')
  const [entityIds, setEntityIds] = useState<string[]>([])
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [manualInput, setManualInput] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [currentEntityIndex, setCurrentEntityIndex] = useState(0)
  const [downloadResults, setDownloadResults] = useState<DownloadResult[]>([])
  const [concurrentDownloads, setConcurrentDownloads] = useState(5)
  const [isPaused, setIsPaused] = useState(false)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pauseRef = useRef(false)

  const { entities, loading: entitiesLoading } = useEntities()

  const fileAttachmentEntities = [
    'Placement',
    'Placement',
    'Opportunity',
    'Certification',
    'JobOrder',
    'ClientContact'
  ]

  const filteredEntities = entities.filter(entity => 
    fileAttachmentEntities.includes(entity)
  )

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      toast.error('Please select a CSV file')
      return
    }

    setCsvFile(file)
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        console.log('📊 CSV parsed:', results)
        
        const ids: string[] = []
        
        if (results.data && results.data.length > 0) {
          const firstRow = results.data[0] as any
          
          const possibleIdFields = ['id', 'entityId', 'entity_id', 'entityID', 'ID', 'Id']
          let idField = possibleIdFields.find(field => field in firstRow)
          
          if (!idField) {
            const fields = Object.keys(firstRow)
            if (fields.length > 0) {
              idField = fields[0]
              console.log(`⚠️ No standard ID field found, using first column: "${idField}"`)
            }
          }
          
          if (idField) {
            for (const row of results.data as any[]) {
              const id = row[idField]
              if (id && String(id).trim()) {
                ids.push(String(id).trim())
              }
            }
          }
        }
        
        if (ids.length === 0) {
          toast.error('No valid IDs found in CSV. Ensure the file has an "id" or "entityId" column.')
          setCsvFile(null)
          if (fileInputRef.current) {
            fileInputRef.current.value = ''
          }
          return
        }
        
        setEntityIds(ids)
        setDownloadResults([])
        toast.success(`Loaded ${ids.length} entity ID(s) from CSV`)
        onLog('CSV Upload', 'success', `Loaded ${ids.length} entity IDs from CSV`, {
          fileName: file.name,
          idCount: ids.length
        })
      },
      error: (error) => {
        console.error('CSV parse error:', error)
        toast.error(`Failed to parse CSV: ${error.message}`)
        setCsvFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    })
  }

  const handleManualInput = () => {
    if (!manualInput.trim()) {
      toast.error('Please enter entity IDs')
      return
    }

    const ids = manualInput
      .split(',')
      .map(id => id.trim())
      .filter(id => id && /^\d+$/.test(id))

    if (ids.length === 0) {
      toast.error('No valid numeric IDs found. Please enter comma-separated IDs (e.g., 12345, 67890)')
      return
    }

    setEntityIds(ids)
    setDownloadResults([])
    setCsvFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    toast.success(`Loaded ${ids.length} entity ID(s)`)
    onLog('Manual Input', 'success', `Loaded ${ids.length} entity IDs manually`, {
      idCount: ids.length
    })
  }

  const fetchEntityName = async (entityType: string, entityId: string): Promise<string> => {
    try {
      const entityData = await bullhornAPI.query(
        entityType,
        ['id', 'name', 'title', 'firstName', 'lastName'],
        `id=${entityId}`
      )
      
      if (entityData?.data?.[0]) {
        const entity = entityData.data[0]
        if (entity.name) {
          return entity.name.replace(/[^a-zA-Z0-9_-]/g, '_')
        } else if (entity.title) {
          return entity.title.replace(/[^a-zA-Z0-9_-]/g, '_')
        } else if (entity.firstName && entity.lastName) {
          return `${entity.firstName}_${entity.lastName}`.replace(/[^a-zA-Z0-9_-]/g, '_')
        } else if (entity.firstName) {
          return entity.firstName.replace(/[^a-zA-Z0-9_-]/g, '_')
        } else if (entity.lastName) {
          return entity.lastName.replace(/[^a-zA-Z0-9_-]/g, '_')
        }
      }
    } catch (error) {
      console.warn(`Could not fetch name for ${entityType} ${entityId}:`, error)
    }
    return entity
  }

  const formatTimeRemaining = (seconds: number): string => {
    if (!seconds || seconds < 1) return 'Calculating...'
    if (seconds < 60) return `${Math.ceil(seconds)}s`
    const minutes = Math.floor(seconds / 60)
    const secs = Math.ceil(seconds % 60)
    if (minutes < 60) return `${minutes}m ${secs}s`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const handlePauseResume = () => {
    if (isPaused) {
      setIsPaused(false)
      pauseRef.current = false
      toast.info('Resuming downloads...')
    } else {
      setIsPaused(true)
      pauseRef.current = true
      toast.info('Download paused')
    }
  }

  const handleCancelDownload = () => {
    pauseRef.current = true
    setIsPaused(false)
    setIsDownloading(false)
    setDownloadProgress(0)
    setStartTime(null)
    setEstimatedTimeRemaining(null)
    toast.info('Download cancelled')
  }

  const handleRetryFailed = async () => {
    const failedDownloads = downloadResults.filter(r => r.status === 'error')
    
    if (failedDownloads.length === 0) {
      toast.info('No failed downloads to retry')
      return
    }

    const failedIds = failedDownloads.map(r => r.entityId)
    toast.info(`Retrying ${failedIds.length} failed download(s)...`)
    
    setEntityIds(failedIds)
    setDownloadResults([])
    
    setTimeout(() => {
      handleBulkDownload()
    }, 500)
  }

  const handleBulkDownload = async () => {
    if (entityIds.length === 0) {
      toast.error('Please load entity IDs first')
      return
    }

    if (!entity) {
      toast.error('Please select an entity type')
      return
    }

    try {
      setIsDownloading(true)
      setIsPaused(false)
      pauseRef.current = false
      setDownloadProgress(0)
      setCurrentEntityIndex(0)
      setStartTime(Date.now())
      setEstimatedTimeRemaining(null)
      
      const results: DownloadResult[] = entityIds.map(id => ({
        entityId: id,
        status: 'pending',
        message: 'Pending...'
      }))
      setDownloadResults(results)

      let successCount = 0
      let errorCount = 0

      for (let i = 0; i < entityIds.length; i++) {
        while (pauseRef.current) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }

        if (!isDownloading) {
          break
        }

        const entityId = entityIds[i]
        setCurrentEntityIndex(i + 1)
        
        const elapsedTime = (Date.now() - (startTime || Date.now())) / 1000
        const entitiesProcessed = i
        if (entitiesProcessed > 0) {
          const averageTimePerEntity = elapsedTime / entitiesProcessed
          const remainingEntities = entityIds.length - i
          const estimatedSeconds = remainingEntities * averageTimePerEntity
          setEstimatedTimeRemaining(estimatedSeconds)
        }
        
        try {
          console.log(`📥 Processing entity ${i + 1}/${entityIds.length}: ${entity} ID ${entityId}`)
          
          const filesResponse = await bullhornAPI.getEntityFiles(entity, parseInt(entityId), '')
          
          let filesArray: any[] = []
          if (filesResponse?.EntityFiles && Array.isArray(filesResponse.EntityFiles)) {
            filesArray = filesResponse.EntityFiles
          } else if (filesResponse?.data && Array.isArray(filesResponse.data)) {
            filesArray = filesResponse.data
          } else if (Array.isArray(filesResponse)) {
            filesArray = filesResponse
          }

          if (filesArray.length === 0) {
            results[i] = {
              entityId,
              status: 'error',
              message: 'No files found',
              fileCount: 0
            }
            errorCount++
            setDownloadResults([...results])
            setDownloadProgress(Math.round(((i + 1) / entityIds.length) * 100))
            continue
          }

          const entityName = await fetchEntityName(entity, entityId)
          
          const zip = new JSZip()
          let downloadedCount = 0
          const totalFiles = filesArray.length

          const downloadFile = async (file: any, fileIndex: number) => {
            results[i] = {
              ...results[i],
              currentFile: file.name,
              filesDownloaded: downloadedCount,
              totalFiles: totalFiles
            }
            setDownloadResults([...results])
            
            try {
              const blob = await bullhornAPI.downloadFile(entity, parseInt(entityId), file.id)
              const newFileName = `${entityId}-${file.name}`
              zip.file(newFileName, blob)
              downloadedCount++
              
              results[i] = {
                ...results[i],
                filesDownloaded: downloadedCount,
                totalFiles: totalFiles
              }
              setDownloadResults([...results])
              
              return { success: true, fileName: file.name }
            } catch (fileError) {
              console.error(`❌ Failed to download file ${file.id} (${file.name}):`, fileError)
              return { success: false, fileName: file.name, error: fileError }
            }
          }

          for (let fileIndex = 0; fileIndex < filesArray.length; fileIndex += concurrentDownloads) {
            while (pauseRef.current) {
              await new Promise(resolve => setTimeout(resolve, 100))
            }

            if (!isDownloading) {
              break
            }

            const batch = filesArray.slice(fileIndex, fileIndex + concurrentDownloads)
            const batchPromises = batch.map((file, batchIdx) => 
              downloadFile(file, fileIndex + batchIdx)
            )
            
            await Promise.all(batchPromises)
          }

          if (downloadedCount === 0) {
            results[i] = {
              entityId,
              status: 'error',
              message: 'Failed to download all files',
              fileCount: 0
            }
            errorCount++
            setDownloadResults([...results])
            setDownloadProgress(Math.round(((i + 1) / entityIds.length) * 100))
            continue
          }

          const zipBlob = await zip.generateAsync({ 
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: {
              level: 6
            }
          })

          const zipFileName = `${entityId}-${entity}-${entityName}.zip`

          const url = window.URL.createObjectURL(zipBlob)
          const a = document.createElement('a')
          a.href = url
          a.download = zipFileName
          a.style.display = 'none'
          document.body.appendChild(a)
          a.click()

          setTimeout(() => {
            document.body.removeChild(a)
            window.URL.revokeObjectURL(url)
          }, 100)

          results[i] = {
            entityId,
            status: 'success',
            message: `Downloaded ${downloadedCount} file(s)`,
            fileCount: downloadedCount,
            zipSize: zipBlob.size,
            fileName: zipFileName
          }
          successCount++

          onLog('Bulk Download', 'success', `Downloaded files for ${entity} ID ${entityId}`, {
            entity,
            entityId,
            fileCount: downloadedCount,
            zipFileName,
            zipSize: zipBlob.size
          })
        } catch (error) {
          console.error(`❌ Failed to process ${entity} ${entityId}:`, error)
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          results[i] = {
            entityId,
            status: 'error',
            message: errorMessage
          }
          errorCount++

          onLog('Bulk Download', 'error', `Failed to download files for ${entity} ID ${entityId}`, {
            entity,
            entityId,
            error: errorMessage
          })
        }

        setDownloadResults([...results])
        setDownloadProgress(Math.round(((i + 1) / entityIds.length) * 100))
      }

      if (errorCount === 0) {
        toast.success(`Successfully downloaded files for all ${successCount} entities!`)
      } else if (successCount === 0) {
        toast.error(`All ${errorCount} downloads failed`)
      } else {
        toast.warning(`${successCount} successful, ${errorCount} failed`)
      }

      onLog('Bulk Download Complete', successCount > 0 ? 'success' : 'error', 
        `Bulk download complete: ${successCount} successful, ${errorCount} failed`, {
        entity,
        totalEntities: entityIds.length,
        successCount,
        errorCount
      })

    } catch (error) {
      console.error('Bulk download error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Bulk download failed'
      toast.error(`Bulk download failed: ${errorMessage}`)
      onLog('Bulk Download', 'error', errorMessage, { error: errorMessage })
    } finally {
      setIsDownloading(false)
      setIsPaused(false)
      pauseRef.current = false
      setTimeout(() => {
        setDownloadProgress(0)
        setCurrentEntityIndex(0)
        setStartTime(null)
        setEstimatedTimeRemaining(null)
      }, 3000)
    }
  }

  const handleClear = () => {
    setEntityIds([])
    setDownloadResults([])
    setCsvFile(null)
    setManualInput('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    toast.info('Cleared all data')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileZip size={24} className="text-accent" weight="duotone" />
          Bulk File Download
        </CardTitle>
        <CardDescription>
          Download files for multiple entities at once. Each entity's files will be zipped separately and named: EntityID-EntityType-EntityName.zip
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>How It Works</AlertTitle>
          <AlertDescription>
            <ol className="list-decimal list-inside space-y-1 mt-2">
              <li>Select the entity type (Candidate, Placement, etc.)</li>
              <li>Upload a CSV with entity IDs OR paste comma-separated IDs</li>
              <li>Click "Download All Files" to create individual ZIP files for each entity</li>
              <li>ZIP files are named: <code className="text-xs bg-muted px-1 py-0.5 rounded">EntityID-EntityType-EntityName.zip</code></li>
            </ol>
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="bulk-entity">Entity Type</Label>
          <Select value={entity} onValueChange={setEntity} disabled={entitiesLoading || isDownloading}>
            <SelectTrigger id="bulk-entity">
              <SelectValue placeholder="Select entity type" />
            </SelectTrigger>
            <SelectContent>
              {filteredEntities.map((entityType) => (
                <SelectItem key={entityType} value={entityType}>
                  {entityType}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Only entities with FileAttachment support are shown
          </p>
        </div>

        <div className="space-y-4 p-4 border rounded-lg bg-accent/5">
          <div className="flex items-center gap-2">
            <div className="h-8 w-1 bg-accent rounded-full" />
            <Label className="text-base font-semibold">Option 1: Upload CSV File</Label>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="csv-file-upload">CSV File (with "id" or "entityId" column)</Label>
            <Input
              id="csv-file-upload"
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              disabled={isDownloading}
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground">
              CSV should have a column named "id" or "entityId" containing the entity IDs
            </p>
          </div>

          {csvFile && (
            <Alert className="bg-green-500/10 border-green-500/20">
              <CheckCircle className="h-4 w-4 text-green-600" weight="fill" />
              <AlertTitle className="text-green-600">CSV Loaded</AlertTitle>
              <AlertDescription className="text-green-600 text-sm">
                File: <strong>{csvFile.name}</strong> | {entityIds.length} entity ID(s) found
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex items-center gap-2 my-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-sm text-muted-foreground font-medium">OR</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="space-y-4 p-4 border rounded-lg bg-accent/5">
          <div className="flex items-center gap-2">
            <div className="h-8 w-1 bg-accent rounded-full" />
            <Label className="text-base font-semibold">Option 2: Paste Comma-Separated IDs</Label>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="manual-ids">Entity IDs (comma-separated)</Label>
            <Textarea
              id="manual-ids"
              placeholder="Example: 12345, 67890, 24680, 13579"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              disabled={isDownloading}
              rows={4}
              className="font-mono text-sm"
            />
            <Button
              onClick={handleManualInput}
              disabled={!manualInput.trim() || isDownloading}
              variant="outline"
              size="sm"
            >
              <Upload size={16} />
              Load IDs
            </Button>
          </div>

          {entityIds.length > 0 && !csvFile && (
            <Alert className="bg-green-500/10 border-green-500/20">
              <CheckCircle className="h-4 w-4 text-green-600" weight="fill" />
              <AlertTitle className="text-green-600">IDs Loaded</AlertTitle>
              <AlertDescription className="text-green-600 text-sm">
                <strong>{entityIds.length}</strong> entity ID(s) ready for download
              </AlertDescription>
            </Alert>
          )}
        </div>

        {entityIds.length > 0 && (
          <>
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-2">
                <Faders size={20} className="text-accent" weight="duotone" />
                <Label className="text-base font-semibold">Concurrency Settings</Label>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="concurrent-downloads" className="text-sm">
                    Simultaneous Downloads
                  </Label>
                  <Badge variant="outline" className="font-mono text-sm">
                    {concurrentDownloads} {concurrentDownloads === 1 ? 'file' : 'files'} at once
                  </Badge>
                </div>
                
                <Slider
                  id="concurrent-downloads"
                  min={1}
                  max={10}
                  step={1}
                  value={[concurrentDownloads]}
                  onValueChange={(values) => setConcurrentDownloads(values[0])}
                  disabled={isDownloading}
                  className="cursor-pointer"
                />
                
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Slower (1)</span>
                  <span>Faster (10)</span>
                </div>
                
                <Alert className="bg-blue-500/5 border-blue-500/20">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-xs text-blue-600">
                    Higher concurrency = faster downloads but may trigger rate limits. Start with 5 and adjust as needed.
                  </AlertDescription>
                </Alert>
              </div>
            </div>

            <div className="space-y-3 p-4 border rounded-lg bg-blue-500/5 border-blue-500/20">
              <div className="flex items-center justify-between">
                <Label className="text-blue-600 font-semibold">Ready to Download</Label>
                <Badge className="bg-blue-600">{entityIds.length} entities</Badge>
              </div>
              <ScrollArea className="h-[120px] border rounded-md bg-background p-3">
                <div className="flex flex-wrap gap-2">
                  {entityIds.map((id, index) => (
                    <Badge key={index} variant="outline" className="font-mono">
                      {id}
                    </Badge>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </>
        )}

        {isDownloading && (
          <div className="space-y-3 p-4 border rounded-lg bg-accent/5">
            <div className="flex items-center justify-between">
              <Label>Download Progress</Label>
              <Badge variant={isPaused ? 'secondary' : 'default'}>
                {isPaused ? 'Paused' : `${currentEntityIndex} of ${entityIds.length} entities`}
              </Badge>
            </div>
            <Progress value={downloadProgress} className="h-3" />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Completion</p>
                <p className="font-semibold text-accent">{downloadProgress}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Entities Remaining</p>
                <p className="font-semibold text-accent">
                  {entityIds.length - currentEntityIndex}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Time Remaining</p>
                <p className="font-semibold text-accent">
                  {estimatedTimeRemaining ? formatTimeRemaining(estimatedTimeRemaining) : 'Calculating...'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="font-semibold text-accent">
                  {isPaused ? 'Paused' : 'Downloading...'}
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handlePauseResume}
                className="flex-1"
              >
                {isPaused ? (
                  <>
                    <Play size={16} weight="fill" />
                    Resume Download
                  </>
                ) : (
                  <>
                    <Pause size={16} weight="fill" />
                    Pause Download
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleCancelDownload}
              >
                <Trash size={16} />
                Cancel
              </Button>
            </div>
          </div>
        )}

        {downloadResults.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Download Results</Label>
              {downloadResults.some(r => r.status === 'error') && !isDownloading && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRetryFailed}
                  className="gap-2"
                >
                  <ArrowClockwise size={16} />
                  Retry Failed Downloads
                </Button>
              )}
            </div>
            <ScrollArea className="h-[300px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entity ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {downloadResults.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono font-medium">
                        {result.entityId}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {result.status === 'success' ? (
                            <CheckCircle size={16} className="text-green-600" weight="fill" />
                          ) : result.status === 'error' ? (
                            <XCircle size={16} className="text-destructive" weight="fill" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 border-t-accent animate-spin" />
                          )}
                          <span
                            className={
                              result.status === 'success'
                                ? 'text-green-600'
                                : result.status === 'error'
                                ? 'text-destructive'
                                : 'text-muted-foreground'
                            }
                          >
                            {result.status === 'success' ? 'Success' : result.status === 'error' ? 'Failed' : 'Pending'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {result.status === 'pending' && result.totalFiles !== undefined ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {result.filesDownloaded || 0}/{result.totalFiles}
                              </Badge>
                            </div>
                            {result.currentFile && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {result.currentFile}
                              </p>
                            )}
                          </div>
                        ) : result.fileCount !== undefined ? (
                          <Badge variant="secondary">{result.fileCount} files</Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[250px]">
                        {result.fileName ? (
                          <code className="text-xs bg-muted px-1 py-0.5 rounded block truncate">{result.fileName}</code>
                        ) : (
                          result.message || '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleBulkDownload}
            disabled={entityIds.length === 0 || !entity || isDownloading}
            className="flex-1"
          >
            <Download />
            {isDownloading 
              ? `Downloading ${currentEntityIndex} of ${entityIds.length}...` 
              : `Download All Files (${entityIds.length} ${entityIds.length === 1 ? 'Entity' : 'Entities'})`
            }
          </Button>
          {entityIds.length > 0 && !isDownloading && (
            <Button
              variant="outline"
              onClick={handleClear}
            >
              <Trash size={16} />
              Clear
            </Button>
          )}
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>File Naming Convention</AlertTitle>
          <AlertDescription className="text-sm space-y-2">
            <p><strong>ZIP file names:</strong></p>
            <code className="block bg-muted px-3 py-2 rounded text-xs mt-1 mb-3">
              [EntityID]-[EntityType]-[EntityName].zip
            </code>
            <p className="text-xs">
              Example: <code className="bg-muted px-1 py-0.5 rounded">19641937-Candidate-John_Doe.zip</code>
            </p>
            
            <p className="mt-3"><strong>Files inside each ZIP:</strong></p>
            <code className="block bg-muted px-3 py-2 rounded text-xs mt-1 mb-3">
              [EntityID]-[OriginalFileName]
            </code>
            <p className="text-xs">
              Example: <code className="bg-muted px-1 py-0.5 rounded">19641937-Resume.pdf</code>
            </p>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
