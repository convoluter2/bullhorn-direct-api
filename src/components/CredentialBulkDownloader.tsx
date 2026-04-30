import { useState, useRef } from 'react'
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
import { Slider } from '@/components/ui/slider'
import { FileZip, FileCsv, Download, CheckCircle, XCircle, Info, Upload, Trash, Pause, Play, ArrowClockwise } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { bullhornAPI } from '@/lib/bullhorn-api'
import Papa from 'papaparse'
import JSZip from 'jszip'

interface CredentialBulkDownloaderProps {
  onLog: (operation: string, status: 'success' | 'error', message: string, details?: any) => void
}

interface DownloadResult {
  candidateId: string
  mappedCandidateId?: string
  status: 'success' | 'error' | 'pending'
  message?: string
  credentialCount?: number
  fileCount?: number
  zipSize?: number
  fileName?: string
  currentCredential?: string
  credentialsProcessed?: number
  totalCredentials?: number
  retryCount?: number
  failedFiles?: Array<{ fileName: string; fileId: number; error: string }>
  successfulFiles?: string[]
}

interface CandidateMapping {
  candidateId: string
  migrateEntityID?: string
  migrateCertificationID?: string
  migrateCertificationName?: string
}

export function CredentialBulkDownloader({ onLog }: CredentialBulkDownloaderProps) {
  const [lookupField, setLookupField] = useState('id')
  const [csvColumn, setCsvColumn] = useState('')
  const [candidateMappings, setCandidateMappings] = useState<CandidateMapping[]>([])
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [manualInput, setManualInput] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [currentCandidateIndex, setCurrentCandidateIndex] = useState(0)
  const [downloadResults, setDownloadResults] = useState<DownloadResult[]>([])
  const [concurrentDownloads, setConcurrentDownloads] = useState(3)
  const [isPaused, setIsPaused] = useState(false)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null)
  const [availableColumns, setAvailableColumns] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pauseRef = useRef(false)
  const cancelledRef = useRef(false)

  const lookupFieldOptions = [
    { value: 'id', label: 'Candidate ID' },
    { value: 'externalID', label: 'External ID' },
    { value: 'email', label: 'Email' },
    { value: 'customText1', label: 'Custom Text 1' },
    { value: 'customText2', label: 'Custom Text 2' },
    { value: 'customText3', label: 'Custom Text 3' },
    { value: 'customText4', label: 'Custom Text 4' },
    { value: 'customText5', label: 'Custom Text 5' }
  ]

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setCsvFile(file)
      parseCSV(file)
    }
  }

  const parseCSV = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          const columns = Object.keys(results.data[0] as any)
          setAvailableColumns(columns)
          
          if (columns.length > 0 && !csvColumn) {
            setCsvColumn(columns[0])
          }

          const mappings: CandidateMapping[] = (results.data as any[]).map((row: any) => ({
            candidateId: row[csvColumn || columns[0]],
            migrateEntityID: row.MigrateEntityID || row.migrateEntityID,
            migrateCertificationID: row.MigrateCertificationID || row.migrateCertificationID,
            migrateCertificationName: row.MigrateCertificationName || row.migrateCertificationName
          }))

          setCandidateMappings(mappings)
          toast.success(`Loaded ${mappings.length} candidate identifiers from CSV`)
        }
      },
      error: (error) => {
        toast.error(`Failed to parse CSV: ${error.message}`)
      }
    })
  }

  const handleManualInputChange = (value: string) => {
    setManualInput(value)
    const ids = value
      .split(/[\n,]/)
      .map(id => id.trim())
      .filter(id => id.length > 0)
    
    const mappings: CandidateMapping[] = ids.map(id => ({ candidateId: id }))
    setCandidateMappings(mappings)
  }

  const handleClearAll = () => {
    setCsvFile(null)
    setManualInput('')
    setCandidateMappings([])
    setDownloadResults([])
    setDownloadProgress(0)
    setCurrentCandidateIndex(0)
    setCsvColumn('')
    setAvailableColumns([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleStartDownload = async () => {
    if (candidateMappings.length === 0) {
      toast.error('Please provide candidate identifiers')
      return
    }

    setIsDownloading(true)
    setIsPaused(false)
    pauseRef.current = false
    cancelledRef.current = false
    setStartTime(Date.now())
    setDownloadProgress(0)
    setCurrentCandidateIndex(0)

    const results: DownloadResult[] = candidateMappings.map(mapping => ({
      candidateId: mapping.candidateId,
      mappedCandidateId: mapping.migrateEntityID,
      status: 'pending' as const,
      credentialsProcessed: 0,
      totalCredentials: 0
    }))
    setDownloadResults(results)

    onLog('Credential Bulk Download', 'success', `Starting bulk credential download for ${candidateMappings.length} candidates`, {
      lookupField,
      candidateCount: candidateMappings.length,
      concurrentDownloads
    })

    try {
      await processDownloadsInBatches(candidateMappings, results)
      
      if (!cancelledRef.current) {
        toast.success('Bulk credential download completed!')
        onLog('Credential Bulk Download', 'success', 'Bulk credential download completed', {
          total: candidateMappings.length,
          successful: results.filter(r => r.status === 'success').length,
          failed: results.filter(r => r.status === 'error').length
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Bulk download failed: ${errorMessage}`)
      onLog('Credential Bulk Download', 'error', 'Bulk credential download failed', { error: errorMessage })
    } finally {
      setIsDownloading(false)
      setIsPaused(false)
      pauseRef.current = false
    }
  }

  const processDownloadsInBatches = async (mappings: CandidateMapping[], results: DownloadResult[]) => {
    const batches: CandidateMapping[][] = []
    for (let i = 0; i < mappings.length; i += concurrentDownloads) {
      batches.push(mappings.slice(i, i + concurrentDownloads))
    }

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      while (pauseRef.current && !cancelledRef.current) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      if (cancelledRef.current) {
        break
      }

      const batch = batches[batchIndex]
      const batchPromises = batch.map(async (mapping, indexInBatch) => {
        const globalIndex = batchIndex * concurrentDownloads + indexInBatch
        return await downloadCredentialsForCandidate(mapping, globalIndex, results)
      })

      await Promise.all(batchPromises)

      const completed = (batchIndex + 1) * concurrentDownloads
      const progress = Math.min((completed / mappings.length) * 100, 100)
      setDownloadProgress(progress)
      setCurrentCandidateIndex(Math.min(completed, mappings.length))

      if (startTime) {
        const elapsed = Date.now() - startTime
        const rate = completed / elapsed
        const remaining = mappings.length - completed
        const estimatedMs = remaining / rate
        setEstimatedTimeRemaining(estimatedMs)
      }
    }
  }

  const downloadCredentialsForCandidate = async (
    mapping: CandidateMapping,
    index: number,
    results: DownloadResult[]
  ) => {
    const updateResult = (updates: Partial<DownloadResult>) => {
      setDownloadResults(prev => {
        const newResults = [...prev]
        newResults[index] = { ...newResults[index], ...updates }
        return newResults
      })
    }

    try {
      updateResult({ status: 'pending', message: 'Looking up candidate...' })

      let candidateId: number
      if (lookupField === 'id') {
        candidateId = parseInt(mapping.candidateId)
        if (isNaN(candidateId)) {
          throw new Error('Invalid candidate ID')
        }
      } else {
        const searchResult = await bullhornAPI.query(
          'Candidate',
          ['id'],
          `${lookupField}:${mapping.candidateId}`
        )
        if (!searchResult.data || searchResult.data.length === 0) {
          throw new Error(`Candidate not found with ${lookupField}: ${mapping.candidateId}`)
        }
        candidateId = searchResult.data[0].id
      }

      updateResult({ message: 'Fetching certifications...' })

      const certificationsResult = await bullhornAPI.query(
        'CandidateCertification',
        ['id', 'certification(id,name)', 'status', 'dateBegin', 'dateEnd', 'dateCertified', 'dateExpires', 'fileAttachments', 'comments', 'customText1', 'customText2'],
        `candidate.id:${candidateId} AND isDeleted:0`
      )

      if (!certificationsResult.data || certificationsResult.data.length === 0) {
        updateResult({
          status: 'success',
          message: 'No active certifications found',
          credentialCount: 0,
          fileCount: 0
        })
        return
      }

      const certifications = certificationsResult.data
      updateResult({
        message: `Processing ${certifications.length} certifications...`,
        totalCredentials: certifications.length
      })

      const zip = new JSZip()
      const csvData: any[] = []
      let totalFilesDownloaded = 0

      for (let certIndex = 0; certIndex < certifications.length; certIndex++) {
        const cert = certifications[certIndex]
        updateResult({
          currentCredential: `${cert.certification?.name || 'Unknown'} (${certIndex + 1}/${certifications.length})`,
          credentialsProcessed: certIndex
        })

        const certFolderName = mapping.migrateCertificationID && mapping.migrateCertificationName
          ? `${mapping.migrateCertificationID}_${mapping.migrateCertificationName}`
          : `${cert.id}_${cert.certification?.name || 'Certification'}`

        if (cert.fileAttachments && cert.fileAttachments.total > 0) {
          const filesResult = await bullhornAPI.query(
            'CertificationFileAttachment',
            ['id', 'name', 'type', 'contentType', 'contentSubType', 'fileSize', 'dateAdded', 'description'],
            `candidateCertification.id:${cert.id} AND isDeleted:0`
          )

          if (filesResult.data && filesResult.data.length > 0) {
            for (const file of filesResult.data) {
              try {
                const blob = await bullhornAPI.downloadFile('CertificationFileAttachment', file.id, file.id)
                const cleanedFolderName = certFolderName.replace(/[^a-zA-Z0-9_-]/g, '_')
                zip.file(`${cleanedFolderName}/${file.name}`, blob)
                totalFilesDownloaded++

                csvData.push({
                  CandidateID: mapping.migrateEntityID || candidateId,
                  CandidateCertificationID: mapping.migrateCertificationID || cert.id,
                  CertificationName: mapping.migrateCertificationName || cert.certification?.name || '',
                  CertificationStatus: cert.status || '',
                  DateBegin: cert.dateBegin || '',
                  DateEnd: cert.dateEnd || '',
                  DateCertified: cert.dateCertified || '',
                  DateExpires: cert.dateExpires || '',
                  Comments: cert.comments || '',
                  CustomText1: cert.customText1 || '',
                  CustomText2: cert.customText2 || '',
                  FileAttachmentID: file.id,
                  FileName: file.name,
                  FileType: file.type || '',
                  ContentType: file.contentType || '',
                  ContentSubType: file.contentSubType || '',
                  FileSize: file.fileSize || 0,
                  DateAdded: file.dateAdded || '',
                  FileDescription: file.description || '',
                  MigrateEntityID: mapping.migrateEntityID || '',
                  MigrateCertificationID: mapping.migrateCertificationID || '',
                  MigrateCertificationName: mapping.migrateCertificationName || ''
                })
              } catch (fileError) {
                console.error(`Failed to download file ${file.id}:`, fileError)
              }
            }
          }
        } else {
          csvData.push({
            CandidateID: mapping.migrateEntityID || candidateId,
            CandidateCertificationID: mapping.migrateCertificationID || cert.id,
            CertificationName: mapping.migrateCertificationName || cert.certification?.name || '',
            CertificationStatus: cert.status || '',
            DateBegin: cert.dateBegin || '',
            DateEnd: cert.dateEnd || '',
            DateCertified: cert.dateCertified || '',
            DateExpires: cert.dateExpires || '',
            Comments: cert.comments || '',
            CustomText1: cert.customText1 || '',
            CustomText2: cert.customText2 || '',
            FileAttachmentID: '',
            FileName: '',
            FileType: '',
            ContentType: '',
            ContentSubType: '',
            FileSize: 0,
            DateAdded: '',
            FileDescription: '',
            MigrateEntityID: mapping.migrateEntityID || '',
            MigrateCertificationID: mapping.migrateCertificationID || '',
            MigrateCertificationName: mapping.migrateCertificationName || ''
          })
        }
      }

      const csv = Papa.unparse(csvData)
      zip.file('credentials_metadata.csv', csv)

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const zipFileName = `Candidate_${mapping.migrateEntityID || candidateId}_Credentials.zip`
      
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = zipFileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      updateResult({
        status: 'success',
        message: 'Download complete',
        credentialCount: certifications.length,
        fileCount: totalFilesDownloaded,
        zipSize: zipBlob.size,
        fileName: zipFileName,
        credentialsProcessed: certifications.length
      })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      updateResult({
        status: 'error',
        message: errorMessage
      })
    }
  }

  const handlePauseResume = () => {
    pauseRef.current = !pauseRef.current
    setIsPaused(pauseRef.current)
    toast.info(pauseRef.current ? 'Download paused' : 'Download resumed')
  }

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel the download?')) {
      cancelledRef.current = true
      pauseRef.current = false
      setIsDownloading(false)
      setIsPaused(false)
      toast.info('Download cancelled')
      onLog('Credential Bulk Download', 'error', 'Download cancelled by user', {})
    }
  }

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>
            Configure how to identify candidates for credential download
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lookup-field">Lookup Field</Label>
              <Select value={lookupField} onValueChange={setLookupField} disabled={isDownloading}>
                <SelectTrigger id="lookup-field">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {lookupFieldOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {csvFile && availableColumns.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="csv-column">CSV Column</Label>
                <Select value={csvColumn} onValueChange={setCsvColumn} disabled={isDownloading}>
                  <SelectTrigger id="csv-column">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableColumns.map(col => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Candidate Identifiers (CSV Upload)</Label>
            <div className="flex gap-2">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                disabled={isDownloading}
                className="flex-1"
              />
              {csvFile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCsvFile(null)
                    setCandidateMappings([])
                    setAvailableColumns([])
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  disabled={isDownloading}
                >
                  <Trash size={16} />
                </Button>
              )}
            </div>
            {csvFile && (
              <p className="text-sm text-muted-foreground">
                Loaded: {csvFile.name} ({candidateMappings.length} candidates)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="manual-input">Or Enter Manually (one per line or comma-separated)</Label>
            <Textarea
              id="manual-input"
              value={manualInput}
              onChange={(e) => handleManualInputChange(e.target.value)}
              placeholder="Enter candidate IDs, one per line or comma-separated"
              rows={5}
              disabled={isDownloading || !!csvFile}
            />
          </div>

          {candidateMappings.length > 0 && (
            <Alert>
              <Info size={16} />
              <AlertTitle>Ready to Download</AlertTitle>
              <AlertDescription>
                {candidateMappings.length} candidate(s) queued for credential download
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="concurrent-downloads">Concurrent Downloads: {concurrentDownloads}</Label>
            <Slider
              id="concurrent-downloads"
              min={1}
              max={10}
              step={1}
              value={[concurrentDownloads]}
              onValueChange={([value]) => setConcurrentDownloads(value)}
              disabled={isDownloading}
            />
            <p className="text-xs text-muted-foreground">
              Higher values = faster but may hit rate limits
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        {!isDownloading ? (
          <>
            <Button
              onClick={handleStartDownload}
              disabled={candidateMappings.length === 0}
              className="flex-1"
            >
              <Download size={18} />
              Start Bulk Download
            </Button>
            <Button
              variant="outline"
              onClick={handleClearAll}
              disabled={candidateMappings.length === 0}
            >
              <Trash size={18} />
              Clear All
            </Button>
          </>
        ) : (
          <>
            <Button
              variant={isPaused ? 'default' : 'secondary'}
              onClick={handlePauseResume}
              className="flex-1"
            >
              {isPaused ? <Play size={18} /> : <Pause size={18} />}
              {isPaused ? 'Resume' : 'Pause'}
            </Button>
            <Button variant="destructive" onClick={handleCancel}>
              Cancel
            </Button>
          </>
        )}
      </div>

      {isDownloading && (
        <Card>
          <CardHeader>
            <CardTitle>Download Progress</CardTitle>
            <CardDescription>
              Processing {currentCandidateIndex} of {candidateMappings.length} candidates
              {estimatedTimeRemaining && ` • Est. ${formatTime(estimatedTimeRemaining)} remaining`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Progress</span>
                <span>{Math.round(downloadProgress)}%</span>
              </div>
              <Progress value={downloadProgress} />
            </div>
          </CardContent>
        </Card>
      )}

      {downloadResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Download Results</CardTitle>
            <CardDescription>
              {downloadResults.filter(r => r.status === 'success').length} successful,{' '}
              {downloadResults.filter(r => r.status === 'error').length} failed,{' '}
              {downloadResults.filter(r => r.status === 'pending').length} pending
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Credentials</TableHead>
                    <TableHead>Files</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {downloadResults.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">
                        {result.mappedCandidateId || result.candidateId}
                      </TableCell>
                      <TableCell>
                        {result.status === 'success' && (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle size={14} weight="fill" />
                            Success
                          </Badge>
                        )}
                        {result.status === 'error' && (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle size={14} weight="fill" />
                            Error
                          </Badge>
                        )}
                        {result.status === 'pending' && (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {result.credentialCount !== undefined ? result.credentialCount : '-'}
                      </TableCell>
                      <TableCell>
                        {result.fileCount !== undefined ? result.fileCount : '-'}
                      </TableCell>
                      <TableCell>
                        {result.zipSize ? formatBytes(result.zipSize) : '-'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                        {result.currentCredential || result.message || '-'}
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
