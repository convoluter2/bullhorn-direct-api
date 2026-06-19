import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FileZip, FileCsv, Download, CheckCircle, XCircle, Info, Upload, Pause, Play, ArrowClockwise } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { bullhornAPI } from '@/lib/bullhorn-api'
import * as Papa from 'papaparse'
import * as JSZip from 'jszip'

interface BulkDownloadByIdProps {
  onLog: (operation: string, status: 'success' | 'error', message: string, details?: any) => void
}

interface AttachmentDownloadResult {
  attachmentId: string
  entityId?: number
  entityType?: string
  entityName?: string
  status: 'success' | 'error' | 'pending'
  message?: string
  fileName?: string
  retryCount?: number
}

interface ParsedAttachment {
  id: string
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
        
        toast.success(`Loaded ${ids.length} unique attachment ID(s) from CSV`)
        
        onLog('CSV Upload', 'success', `Loaded ${ids.length} attachment IDs from CSV`, {
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
            entityId: attachmentInfo.entityId,
            entityType: attachmentInfo.entityType,
            entityName: attachmentInfo.entityName,
            fileName: attachmentInfo.fileName,
            status: 'success',
            message: 'Downloaded successfully'
          }
          successCount++
          setDownloadResults([...results])
          setDownloadProgress(Math.round(((i + 1) / attachmentIds.length) * 100))
        } catch (error) {
          console.error(`❌ Failed to process attachment ${attachmentId}:`, error)
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          results[i] = {
            attachmentId,
            status: 'error',
            message: errorMessage
          }
          errorCount++
          failedIds.push(attachmentId)
          setDownloadResults([...results])
          setDownloadProgress(Math.round(((i + 1) / attachmentIds.length) * 100))
        }
      }

      if (cancelledRef.current) {
        toast.info('Download cancelled')
        onLog('Bulk Download by ID', 'error', 'Download cancelled by user', {
          totalRequested: attachmentIds.length,
          successCount,
          errorCount
        })
        return
      }

      if (successCount === 0) {
        toast.error('Failed to download any files')
        onLog('Bulk Download by ID', 'error', 'All file downloads failed', {
          totalRequested: attachmentIds.length,
          failedIds
        })
        return
      }

      console.log('📦 Creating ZIP files for each entity...')
      toast.info('Creating ZIP files...', { id: 'zip-creation' })

      const masterZip = new JSZip.default()
      const entityZipCount = Object.keys(entityGroups).length

      for (const [groupKey, group] of Object.entries(entityGroups)) {
        const entityZip = new JSZip.default()
        
        for (const file of group.files) {
          entityZip.file(file.fileName, file.blob)
        }
        
        const entityZipBlob = await entityZip.generateAsync({
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: {
            level: 6
          }
        })
        
        const sanitizedEntityName = sanitizeFileName(group.entityName)
        const zipFileName = `${group.entityId}-${group.entityType}-${sanitizedEntityName}.zip`
        
        masterZip.file(zipFileName, entityZipBlob)
      }

      console.log('📦 Generating master ZIP file...')
      const masterZipBlob = await masterZip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: {
          level: 6
        }
      })

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]
      const masterZipFileName = `BulkDownloadByID_${entityZipCount}Entities_${timestamp}.zip`

      const url = window.URL.createObjectURL(masterZipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = masterZipFileName
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()

      setTimeout(() => {
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }, 100)

      if (errorCount === 0) {
        toast.success(`Successfully downloaded ${successCount} file(s) across ${entityZipCount} entit${entityZipCount === 1 ? 'y' : 'ies'}`, { 
          id: 'zip-creation',
          duration: 5000 
        })
      } else {
        toast.warning(`Downloaded ${successCount} file(s), ${errorCount} failed. Check results below.`, { 
          id: 'zip-creation',
          duration: 5000
        })
      }

      onLog('Bulk Download by ID', successCount > 0 ? 'success' : 'error', 
        `Downloaded ${successCount} files across ${entityZipCount} entities`, {
        totalRequested: attachmentIds.length,
        successCount,
        errorCount,
        entityCount: entityZipCount,
        zipFileName: masterZipFileName,
        zipSize: masterZipBlob.size,
        failedIds: failedIds.length > 0 ? failedIds : undefined
      })
    } catch (error) {
      console.error('Bulk download by ID error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to download files'
      toast.error(`Download failed: ${errorMessage}`)
      onLog('Bulk Download by ID', 'error', errorMessage, {
        error: errorMessage
      })
    } finally {
      setIsDownloading(false)
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
    
    toast.info(`Retrying ${failedIds.length} failed download(s)...`)
    
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
        <AlertTitle>Download Files by Attachment ID</AlertTitle>
        <AlertDescription>
          Upload a CSV containing file attachment IDs. Files will be automatically sorted by their parent entity and downloaded as separate ZIP files per entity, bundled into one master ZIP.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Upload CSV with Attachment IDs</CardTitle>
          <CardDescription>
            CSV should contain an "AttachmentID" column (case-insensitive). If no header is found, the first column will be used.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="csv-upload">Select CSV File</Label>
            <div className="flex gap-2">
              <Input
                id="csv-upload"
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                disabled={isDownloading}
                className="cursor-pointer flex-1"
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

          {csvFile && attachmentIds.length > 0 && (
            <Alert className="bg-green-500/10 border-green-500/20">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">
                <strong>{attachmentIds.length} attachment ID(s)</strong> loaded and de-duplicated from <strong>{csvFile.name}</strong>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleBulkDownload}
              disabled={attachmentIds.length === 0 || isDownloading}
              className="flex-1 gap-2"
            >
              <Download size={18} />
              {isDownloading ? 'Downloading...' : 'Start Bulk Download'}
            </Button>
            
            {isDownloading && (
              <>
                <Button
                  variant="outline"
                  onClick={handlePauseResume}
                  className="gap-2"
                >
                  {isPaused ? <Play size={18} /> : <Pause size={18} />}
                  {isPaused ? 'Resume' : 'Pause'}
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
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Progress</span>
                <span className="text-muted-foreground">
                  {currentFileIndex} / {attachmentIds.length} files
                </span>
              </div>
              <Progress value={downloadProgress} className="h-2" />
            </div>

            {estimatedTimeRemaining !== null && estimatedTimeRemaining > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Est. time remaining:</span>
                <Badge variant="outline">{formatTimeRemaining(estimatedTimeRemaining)}</Badge>
              </div>
            )}

            {isPaused && (
              <Alert className="bg-yellow-500/10 border-yellow-500/20">
                <Info className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-600">
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
                  {downloadResults.filter(r => r.status === 'success').length} succeeded, 
                  {' '}{downloadResults.filter(r => r.status === 'error').length} failed, 
                  {' '}{downloadResults.filter(r => r.status === 'pending').length} pending
                </CardDescription>
              </div>
              {downloadResults.some(r => r.status === 'error') && !isDownloading && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetryFailed}
                  className="gap-2"
                >
                  <ArrowClockwise size={16} />
                  Retry Failed
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead>Attachment ID</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>File Name</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {downloadResults.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {result.status === 'success' && (
                          <Badge variant="default" className="bg-green-600 gap-1">
                            <CheckCircle size={14} />
                            Success
                          </Badge>
                        )}
                        {result.status === 'error' && (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle size={14} />
                            Error
                          </Badge>
                        )}
                        {result.status === 'pending' && (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{result.attachmentId}</TableCell>
                      <TableCell>
                        {result.entityType && result.entityId ? (
                          <div className="space-y-0.5">
                            <div className="font-medium">{result.entityType}</div>
                            <div className="text-xs text-muted-foreground">ID: {result.entityId}</div>
                            {result.entityName && result.entityName !== 'Unknown' && (
                              <div className="text-xs text-muted-foreground">{result.entityName}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{result.fileName || '-'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{result.message}</TableCell>
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
