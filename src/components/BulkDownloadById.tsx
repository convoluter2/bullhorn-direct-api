import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { FileZip, FileCsv, Download, CheckCircle, XCircle, Info, Upload, Pause, Play, ArrowClockwise } from '@phosphor-icons/react'
import { bullhornAPI } from '@/lib/bullhorn-api'
import * as Papa from 'papaparse'
import JSZip from 'jszip'

interface BulkDownloadByIdProps {
  onLog: (operation: string, status: 'success' | 'error', message: string, details?: any) => void
}

interface AttachmentDownloadResult {
  attachmentId: string
  status: 'pending' | 'success' | 'error'
  message: string
  entityType?: string
  entityId?: number
  fileName?: string
}

const ENTITY_TYPE_MAPPING: Record<string, string> = {
  'Candidate': 'Candidate',
  'ClientContact': 'ClientContact',
  'ClientCorporation': 'ClientCorporation',
  'Placement': 'Placement',
  'Opportunity': 'Opportunity',
  'JobOrder': 'JobOrder',
  'Certification': 'Certification',
  'CandidateCertification': 'CandidateCertification'
}

export function BulkDownloadById({ onLog }: BulkDownloadByIdProps) {
  const [attachmentIds, setAttachmentIds] = useState<string[]>([])
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [downloadResults, setDownloadResults] = useState<AttachmentDownloadResult[]>([])
  const [isPaused, setIsPaused] = useState(false)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null)
  const [currentFileIndex, setCurrentFileIndex] = useState(0)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pauseRef = useRef(false)
  const cancelledRef = useRef(false)

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
          
          const possibleIdFields = ['attachmentid', 'AttachmentID', 'attachment_id', 'id', 'ID', 'Id', 'fileId', 'FileID']
          let idField = possibleIdFields.find(field => field.toLowerCase() in Object.keys(firstRow).map(k => k.toLowerCase()))
          
          if (!idField) {
            const actualIdField = Object.keys(firstRow).find(k => 
              possibleIdFields.some(p => p.toLowerCase() === k.toLowerCase())
            )
            if (actualIdField) {
              idField = actualIdField
            }
          }
          
          if (!idField && Object.keys(firstRow).length > 0) {
            idField = Object.keys(firstRow)[0]
            console.log(`⚠️ No standard AttachmentID field found, using first column: "${idField}"`)
            toast.warning(`Using first column "${idField}" as attachment IDs`)
          }
          
          if (idField) {
            const seenIds = new Set<string>()
            
            for (const row of results.data as any[]) {
              const id = row[idField]
              if (id && String(id).trim()) {
                const attachmentId = String(id).trim()
                
                if (!seenIds.has(attachmentId)) {
                  ids.push(attachmentId)
                  seenIds.add(attachmentId)
                }
              }
            }
          }
        }
        
        if (ids.length === 0) {
          toast.error('No valid attachment IDs found in CSV. Ensure the file has an "AttachmentID" column or IDs in the first column.')
          setCsvFile(null)
          if (fileInputRef.current) {
            fileInputRef.current.value = ''
          }
          return
        }
        
        setAttachmentIds(ids)
        setDownloadResults([])
        toast.success(`Loaded ${ids.length} attachment IDs from CSV`)
      },
      error: (error) => {
        console.error('❌ CSV parsing error:', error)
        toast.error('Failed to parse CSV file')
        setCsvFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    })
  }

  const handleClearCSV = () => {
    setCsvFile(null)
    setAttachmentIds([])
    setDownloadResults([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    toast.info('CSV cleared')
  }

  const fetchAttachmentInfo = async (attachmentId: string): Promise<{
    entityId?: number
    entityType?: string
    entityName?: string
    fileName?: string
    blob?: Blob
  } | null> => {
    const entityFileTypes = ['CandidateFileAttachment', 'ClientContactFileAttachment', 'ClientCorporationFileAttachment', 
      'PlacementFileAttachment', 'OpportunityFileAttachment', 'JobOrderFileAttachment', 'CertificationFileAttachment']
    
    for (const fileEntityType of entityFileTypes) {
      try {
        console.log(`🔍 Trying ${fileEntityType} for attachment ${attachmentId}`)
        
        const response = await bullhornAPI.getEntity(
          fileEntityType,
          parseInt(attachmentId),
          ['id', 'name', 'candidate', 'clientContact', 'clientCorporation', 'placement', 'opportunity', 'jobOrder', 'certification']
        )
        
        if (response && response.data) {
          const fileData = response.data
          console.log(`✅ Found attachment in ${fileEntityType}:`, fileData)
          
          let entityId: number | undefined
          let entityType: string | undefined
          let entityName = 'Unknown'
          
          if (fileData.candidate && fileData.candidate.id) {
            entityId = fileData.candidate.id
            entityType = 'Candidate'
            
            try {
              const candidateData = await bullhornAPI.getEntity('Candidate', entityId, ['id', 'firstName', 'lastName', 'name'])
              if (candidateData?.data) {
                if (candidateData.data.firstName && candidateData.data.lastName) {
                  entityName = `${candidateData.data.firstName}_${candidateData.data.lastName}`
                } else if (candidateData.data.name) {
                  entityName = candidateData.data.name
                }
              }
            } catch (err) {
              console.warn('Could not fetch candidate name:', err)
            }
          } else if (fileData.clientContact && fileData.clientContact.id) {
            entityId = fileData.clientContact.id
            entityType = 'ClientContact'
          } else if (fileData.clientCorporation && fileData.clientCorporation.id) {
            entityId = fileData.clientCorporation.id
            entityType = 'ClientCorporation'
          } else if (fileData.placement && fileData.placement.id) {
            entityId = fileData.placement.id
            entityType = 'Placement'
          } else if (fileData.opportunity && fileData.opportunity.id) {
            entityId = fileData.opportunity.id
            entityType = 'Opportunity'
          } else if (fileData.jobOrder && fileData.jobOrder.id) {
            entityId = fileData.jobOrder.id
            entityType = 'JobOrder'
          } else if (fileData.certification && fileData.certification.id) {
            entityId = fileData.certification.id
            entityType = 'Certification'
          }
          
          if (!entityId || !entityType) {
            console.warn(`⚠️ Found attachment ${attachmentId} in ${fileEntityType} but couldn't determine parent entity`)
            continue
          }
          
          entityName = entityName.replace(/[^a-zA-Z0-9_-]/g, '_')
          
          const fileName = fileData.name || `file_${attachmentId}`
          
          try {
            const mappedEntityType = ENTITY_TYPE_MAPPING[entityType] || entityType
            console.log(`📥 Downloading file from ${mappedEntityType} ID ${entityId}, file ID ${attachmentId}`)
            const blob = await bullhornAPI.downloadFile(mappedEntityType, entityId, parseInt(attachmentId))
            
            return {
              entityId,
              entityType,
              entityName,
              fileName,
              blob
            }
          } catch (downloadError) {
            console.error(`❌ Failed to download file:`, downloadError)
            return {
              entityId,
              entityType,
              entityName,
              fileName
            }
          }
        }
      } catch (error) {
        continue
      }
    }
    
    console.warn(`❌ Attachment ${attachmentId} not found in any entity file attachment table`)
    return null
  }

  const sanitizeFileName = (name: string): string => {
    return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
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
    cancelledRef.current = true
    pauseRef.current = false
    setIsPaused(false)
    setIsDownloading(false)
    setDownloadProgress(0)
    setStartTime(null)
    setEstimatedTimeRemaining(null)
    toast.info('Download cancelled')
  }

  const handleBulkDownload = async () => {
    if (attachmentIds.length === 0) {
      toast.error('Please load attachment IDs first')
      return
    }

    try {
      cancelledRef.current = false
      setIsDownloading(true)
      setIsPaused(false)
      pauseRef.current = false
      setDownloadProgress(0)
      setCurrentFileIndex(0)
      setStartTime(Date.now())
      setEstimatedTimeRemaining(null)
      
      const results: AttachmentDownloadResult[] = attachmentIds.map(id => ({
        attachmentId: id,
        status: 'pending',
        message: 'Pending...'
      }))
      setDownloadResults(results)

      const entityGroups: Record<string, {
        entityId: number
        entityType: string
        entityName: string
        files: Array<{ fileName: string; blob: Blob; attachmentId: string }>
      }> = {}

      let successCount = 0
      let errorCount = 0
      const failedIds: string[] = []

      for (let i = 0; i < attachmentIds.length; i++) {
        while (pauseRef.current && !cancelledRef.current) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }

        if (cancelledRef.current) {
          console.log('⚠️ Download cancelled by user')
          for (let j = i; j < attachmentIds.length; j++) {
            if (results[j].status === 'pending') {
              results[j] = {
                ...results[j],
                status: 'error',
                message: 'Cancelled by user'
              }
            }
          }
          setDownloadResults([...results])
          break
        }

        const attachmentId = attachmentIds[i]
        setCurrentFileIndex(i + 1)
        
        const elapsedTime = (Date.now() - (startTime || Date.now())) / 1000
        const filesProcessed = i
        if (filesProcessed > 0) {
          const averageTimePerFile = elapsedTime / filesProcessed
          const remainingFiles = attachmentIds.length - i
          const estimatedSeconds = remainingFiles * averageTimePerFile
          setEstimatedTimeRemaining(estimatedSeconds)
        }
        
        try {
          console.log(`📥 Processing attachment ${i + 1}/${attachmentIds.length}: ID ${attachmentId}`)
          
          results[i] = {
            attachmentId,
            status: 'pending',
            message: 'Fetching file info...'
          }
          setDownloadResults([...results])
          
          const attachmentInfo = await fetchAttachmentInfo(attachmentId)
          
          if (!attachmentInfo || !attachmentInfo.entityId || !attachmentInfo.entityType || !attachmentInfo.blob) {
            results[i] = {
              attachmentId,
              status: 'error',
              message: attachmentInfo ? 'Failed to download file' : 'Attachment not found or malformed ID'
            }
            errorCount++
            failedIds.push(attachmentId)
            setDownloadResults([...results])
            setDownloadProgress(Math.round(((i + 1) / attachmentIds.length) * 100))
            continue
          }

          const groupKey = `${attachmentInfo.entityType}_${attachmentInfo.entityId}`
          
          if (!entityGroups[groupKey]) {
            entityGroups[groupKey] = {
              entityId: attachmentInfo.entityId,
              entityType: attachmentInfo.entityType,
              entityName: attachmentInfo.entityName || 'Unknown',
              files: []
            }
          }
          
          entityGroups[groupKey].files.push({
            fileName: attachmentInfo.fileName || `file_${attachmentId}`,
            blob: attachmentInfo.blob,
            attachmentId
          })

          results[i] = {
            attachmentId,
            status: 'success',
            message: 'Downloaded successfully',
            entityType: attachmentInfo.entityType,
            entityId: attachmentInfo.entityId,
            fileName: attachmentInfo.fileName
          }
          successCount++
          setDownloadResults([...results])
          setDownloadProgress(Math.round(((i + 1) / attachmentIds.length) * 100))
        } catch (error) {
          console.error(`❌ Error processing attachment ${attachmentId}:`, error)
          results[i] = {
            attachmentId,
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error'
          }
          errorCount++
          failedIds.push(attachmentId)
          setDownloadResults([...results])
          setDownloadProgress(Math.round(((i + 1) / attachmentIds.length) * 100))
        }
      }

      if (cancelledRef.current) {
        toast.info('Download cancelled')
        onLog('Bulk Download', 'error', 'Download cancelled by user', {
          totalRequested: attachmentIds.length,
          successCount,
          errorCount
        })
        return
      }

      console.log('📦 Creating ZIP files for each entity...')
      const masterZip = new JSZip()
      
      const entityZipCount = Object.keys(entityGroups).length
      for (const [groupKey, group] of Object.entries(entityGroups)) {
        const entityZip = new JSZip()
        
        for (const file of group.files) {
          const sanitizedFileName = sanitizeFileName(file.fileName)
          entityZip.file(sanitizedFileName, file.blob)
        }
        
        const entityZipBlob = await entityZip.generateAsync({
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: {
            level: 6
          }
        })
        
        const sanitizedEntityName = sanitizeFileName(group.entityName)
        const zipFileName = `${group.entityType}_${group.entityId}_${sanitizedEntityName}.zip`
        masterZip.file(zipFileName, entityZipBlob)
      }

      console.log('📦 Creating master ZIP file...')
      const masterZipBlob = await masterZip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: {
          level: 6
        }
      })

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
      const masterZipFileName = `bulk_download_${timestamp}.zip`

      const a = document.createElement('a')
      a.href = URL.createObjectURL(masterZipBlob)
      a.download = masterZipFileName
      document.body.appendChild(a)
      a.click()
      
      setTimeout(() => {
        URL.revokeObjectURL(a.href)
        document.body.removeChild(a)
      }, 100)

      if (errorCount === 0) {
        toast.success(`Successfully downloaded all ${successCount} files!`, {
          id: 'zip-creation',
        })
      } else {
        toast.warning(`Downloaded ${successCount} files with ${errorCount} errors`, {
          id: 'zip-creation',
        })
      }

      onLog('Bulk Download', errorCount === 0 ? 'success' : 'error', 
        `Bulk download completed: ${successCount} successful, ${errorCount} failed`, {
        totalRequested: attachmentIds.length,
        successCount,
        errorCount,
        zipFileName: masterZipFileName,
        failedIds: failedIds.length > 0 ? failedIds : undefined
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Failed to complete bulk download: ${errorMessage}`)
      onLog('Bulk Download', 'error', 'Bulk download failed', {
        error: errorMessage,
        totalRequested: attachmentIds.length
      })
    } finally {
      setIsDownloading(false)
      setIsPaused(false)
      pauseRef.current = false
      setDownloadProgress(0)
      setStartTime(null)
      setEstimatedTimeRemaining(null)
    }
  }

  const handleRetryFailed = () => {
    const failedDownloads = downloadResults.filter(r => r.status === 'error')
    if (failedDownloads.length === 0) {
      toast.info('No failed downloads to retry')
      return
    }
    
    const failedIds = failedDownloads.map(r => r.attachmentId)
    setAttachmentIds(failedIds)
    
    const nonFailedResults = downloadResults.filter(r => r.status !== 'error')
    setDownloadResults(nonFailedResults)
    
    setTimeout(() => {
      handleBulkDownload()
    }, 500)
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Bulk Download by Attachment ID</AlertTitle>
        <AlertDescription>
          Upload a CSV file with attachment IDs to bulk download files. Files will be organized by entity and packaged into a ZIP file.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCsv className="h-5 w-5" />
            CSV Upload
          </CardTitle>
          <CardDescription>
            Upload a CSV with an "AttachmentID" column or IDs in the first column
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="csv-upload">Select CSV File</Label>
            <div className="flex gap-2">
              <input
                id="csv-upload"
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                ref={fileInputRef}
                className="flex-1"
                disabled={isDownloading}
              />
              {csvFile && (
                <Button
                  variant="outline"
                  onClick={handleClearCSV}
                  disabled={isDownloading}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          {csvFile && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Loaded {attachmentIds.length} attachment IDs from {csvFile.name}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleBulkDownload}
              disabled={!csvFile || isDownloading || attachmentIds.length === 0}
              className="flex-1 gap-2"
            >
              <Download />
              Download All ({attachmentIds.length})
            </Button>
            {isDownloading && (
              <>
                <Button
                  variant="outline"
                  onClick={handlePauseResume}
                >
                  {isPaused ? <Play /> : <Pause />}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleCancelDownload}
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {isDownloading && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress: {currentFileIndex} / {attachmentIds.length}</span>
                <span>{downloadProgress}%</span>
              </div>
              <Progress value={downloadProgress} />
            </div>

            {estimatedTimeRemaining !== null && (
              <div className="text-sm text-muted-foreground">
                Estimated time remaining: {formatTimeRemaining(estimatedTimeRemaining)}
              </div>
            )}

            {isPaused && (
              <Alert>
                <Info className="h-4 w-4 text-yellow-600" />
                <AlertDescription>
                  Download paused. Click Resume to continue.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {downloadResults.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Download Results</CardTitle>
                <CardDescription>
                  {downloadResults.filter(r => r.status === 'success').length} successful,{' '}
                  {downloadResults.filter(r => r.status === 'error').length} failed
                </CardDescription>
              </div>
              {downloadResults.some(r => r.status === 'error') && !isDownloading && (
                <Button
                  variant="outline"
                  onClick={handleRetryFailed}
                  className="gap-2"
                >
                  <ArrowClockwise />
                  Retry Failed
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Attachment ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {downloadResults.map((result) => (
                    <TableRow key={result.attachmentId}>
                      <TableCell className="font-mono text-sm">
                        {result.attachmentId}
                      </TableCell>
                      <TableCell>
                        {result.status === 'success' && (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Success
                          </Badge>
                        )}
                        {result.status === 'error' && (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            Error
                          </Badge>
                        )}
                        {result.status === 'pending' && (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {result.fileName && (
                          <div className="space-y-1">
                            <div className="font-medium">{result.fileName}</div>
                            <div className="text-xs text-muted-foreground">
                              {result.entityType} ID: {result.entityId}
                            </div>
                          </div>
                        )}
                        {!result.fileName && (
                          <span className="text-sm text-muted-foreground">{result.message}</span>
                        )}
                      </TableCell>
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
