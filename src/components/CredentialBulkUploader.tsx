import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { FileCsv, Upload, CheckCircle, XCircle, Info, Trash, Pause, Play, FolderOpen, Warning, ArrowsClockwise, ListBullets } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { bullhornAPI } from '@/lib/bullhorn-api'
import Papa from 'papaparse'

interface CredentialBulkUploaderProps {
  onLog: (operation: string, status: 'success' | 'error', message: string, details?: any) => void
}

interface UploadResult {
  rowIndex: number
  candidateId: string
  certificationName: string
  fileName: string
  status: 'success' | 'error' | 'pending'
  message?: string
  fileId?: number
  certificationId?: number
  retryCount?: number
}

interface CredentialRow {
  CandidateID: string
  CandidateCertificationID?: string
  CertificationName: string
  CertificationStatus?: string
  DateCertified?: string
  DateExpires?: string
  Comments?: string
  CustomText1?: string
  CustomText2?: string
  FileName: string
  FileType?: string
  ContentType?: string
  ContentSubType?: string
  FileDescription?: string
  MigrateEntityID?: string
  MigrateCertificationID?: string
  MigrateCertificationName?: string
}

export function CredentialBulkUploader({ onLog }: CredentialBulkUploaderProps) {
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<CredentialRow[]>([])
  const [filesFolder, setFilesFolder] = useState<FileList | null>(null)
  const [filesMap, setFilesMap] = useState<Map<string, File>>(new Map())
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [currentRowIndex, setCurrentRowIndex] = useState(0)
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([])
  const [concurrentUploads, setConcurrentUploads] = useState(2)
  const [isPaused, setIsPaused] = useState(false)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [certificationFields, setCertificationFields] = useState<Array<{ name: string; label: string; type: string }>>([])
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false)
  const csvInputRef = useRef<HTMLInputElement>(null)
  const filesInputRef = useRef<HTMLInputElement>(null)
  const pauseRef = useRef(false)
  const cancelledRef = useRef(false)

  const loadCertificationMetadata = async () => {
    setIsLoadingMetadata(true)
    try {
      console.log('📋 Fetching Certification metadata...')
      const metadata = await bullhornAPI.getMetadata('Certification')
      
      if (metadata && metadata.fields) {
        const lookupFields = metadata.fields
          .filter((field: any) => 
            field.type === 'TO_ONE' && 
            field.name !== 'owner' &&
            !field.name.startsWith('custom')
          )
          .map((field: any) => ({
            name: field.name,
            label: field.label || field.name,
            type: field.associatedEntity?.entity || 'Unknown'
          }))
          .sort((a: any, b: any) => a.label.localeCompare(b.label))

        setCertificationFields(lookupFields)
        console.log(`✅ Loaded ${lookupFields.length} lookup fields for Certification`)
        toast.success(`Loaded ${lookupFields.length} lookup fields for Certification`)
        
        onLog('Certification Metadata', 'success', `Loaded ${lookupFields.length} lookup fields`, {
          entity: 'Certification',
          fieldCount: lookupFields.length
        })
      } else {
        toast.warning('No fields returned from metadata')
      }
    } catch (error) {
      console.error('❌ Failed to load Certification metadata:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Failed to load metadata: ${errorMessage}`)
      onLog('Certification Metadata', 'error', 'Failed to load metadata', { error: errorMessage })
    } finally {
      setIsLoadingMetadata(false)
    }
  }

  useEffect(() => {
    loadCertificationMetadata()
  }, [])

  const handleCsvSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
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
          const data = results.data as CredentialRow[]
          setCsvData(data)
          toast.success(`Loaded ${data.length} credential records from CSV`)
          
          validateCSVData(data)
        }
      },
      error: (error) => {
        toast.error(`Failed to parse CSV: ${error.message}`)
      }
    })
  }

  const validateCSVData = (data: CredentialRow[]) => {
    const errors: string[] = []
    const requiredFields = ['CandidateID', 'CertificationName', 'FileName']

    data.forEach((row, index) => {
      requiredFields.forEach(field => {
        if (!row[field as keyof CredentialRow]) {
          errors.push(`Row ${index + 1}: Missing required field "${field}"`)
        }
      })
    })

    if (errors.length > 0) {
      setValidationErrors(errors.slice(0, 10))
      if (errors.length > 10) {
        setValidationErrors(prev => [...prev, `... and ${errors.length - 10} more errors`])
      }
    } else {
      setValidationErrors([])
    }
  }

  const handleFilesSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      setFilesFolder(files)
      
      const map = new Map<string, File>()
      Array.from(files).forEach(file => {
        map.set(file.name, file)
      })
      setFilesMap(map)
      
      toast.success(`Loaded ${files.length} files`)
      
      if (csvData.length > 0) {
        validateFileMatching(csvData, map)
      }
    }
  }

  const validateFileMatching = (data: CredentialRow[], fileMap: Map<string, File>) => {
    const errors: string[] = []
    const uniqueFiles = new Set<string>()

    data.forEach((row, index) => {
      if (row.FileName) {
        uniqueFiles.add(row.FileName)
        if (!fileMap.has(row.FileName)) {
          errors.push(`Row ${index + 1}: File not found: "${row.FileName}"`)
        }
      }
    })

    const unmatchedFiles = Array.from(fileMap.keys()).filter(fileName => !uniqueFiles.has(fileName))
    if (unmatchedFiles.length > 0 && unmatchedFiles.length <= 5) {
      errors.push(`Warning: ${unmatchedFiles.length} files not referenced in CSV: ${unmatchedFiles.slice(0, 3).join(', ')}${unmatchedFiles.length > 3 ? '...' : ''}`)
    } else if (unmatchedFiles.length > 5) {
      errors.push(`Warning: ${unmatchedFiles.length} files not referenced in CSV`)
    }

    if (errors.length > 0) {
      setValidationErrors(prev => [...prev, ...errors.slice(0, 10)])
    }
  }

  const handleClearAll = () => {
    setCsvFile(null)
    setCsvData([])
    setFilesFolder(null)
    setFilesMap(new Map())
    setUploadResults([])
    setUploadProgress(0)
    setCurrentRowIndex(0)
    setValidationErrors([])
    if (csvInputRef.current) csvInputRef.current.value = ''
    if (filesInputRef.current) filesInputRef.current.value = ''
  }

  const handleStartUpload = async () => {
    if (csvData.length === 0) {
      toast.error('Please upload a CSV file')
      return
    }

    if (filesMap.size === 0) {
      toast.error('Please select credential files folder')
      return
    }

    if (validationErrors.length > 0) {
      const proceed = confirm('There are validation errors. Do you want to proceed anyway?')
      if (!proceed) return
    }

    setIsUploading(true)
    setIsPaused(false)
    pauseRef.current = false
    cancelledRef.current = false
    setStartTime(Date.now())
    setUploadProgress(0)
    setCurrentRowIndex(0)

    const results: UploadResult[] = csvData.map((row, index) => ({
      rowIndex: index,
      candidateId: row.MigrateEntityID || row.CandidateID,
      certificationName: row.MigrateCertificationName || row.CertificationName,
      fileName: row.FileName,
      status: 'pending' as const
    }))
    setUploadResults(results)

    onLog('Credential Bulk Upload', 'success', `Starting bulk credential upload for ${csvData.length} records`, {
      recordCount: csvData.length,
      fileCount: filesMap.size,
      concurrentUploads
    })

    try {
      await processUploadsInBatches(csvData, results)
      
      if (!cancelledRef.current) {
        toast.success('Bulk credential upload completed!')
        onLog('Credential Bulk Upload', 'success', 'Bulk credential upload completed', {
          total: csvData.length,
          successful: results.filter(r => r.status === 'success').length,
          failed: results.filter(r => r.status === 'error').length
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Bulk upload failed: ${errorMessage}`)
      onLog('Credential Bulk Upload', 'error', 'Bulk credential upload failed', { error: errorMessage })
    } finally {
      setIsUploading(false)
      setIsPaused(false)
      pauseRef.current = false
    }
  }

  const processUploadsInBatches = async (data: CredentialRow[], results: UploadResult[]) => {
    const batches: CredentialRow[][] = []
    for (let i = 0; i < data.length; i += concurrentUploads) {
      batches.push(data.slice(i, i + concurrentUploads))
    }

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      while (pauseRef.current && !cancelledRef.current) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      if (cancelledRef.current) {
        break
      }

      const batch = batches[batchIndex]
      const batchPromises = batch.map(async (row, indexInBatch) => {
        const globalIndex = batchIndex * concurrentUploads + indexInBatch
        return await uploadCredentialRecord(row, globalIndex, results)
      })

      await Promise.all(batchPromises)

      const completed = (batchIndex + 1) * concurrentUploads
      const progress = Math.min((completed / data.length) * 100, 100)
      setUploadProgress(progress)
      setCurrentRowIndex(Math.min(completed, data.length))

      if (startTime) {
        const elapsed = Date.now() - startTime
        const rate = completed / elapsed
        const remaining = data.length - completed
        const estimatedMs = remaining / rate
        setEstimatedTimeRemaining(estimatedMs)
      }
    }
  }

  const uploadCredentialRecord = async (
    row: CredentialRow,
    index: number,
    results: UploadResult[]
  ) => {
    const updateResult = (updates: Partial<UploadResult>) => {
      setUploadResults(prev => {
        const newResults = [...prev]
        newResults[index] = { ...newResults[index], ...updates }
        return newResults
      })
    }

    try {
      updateResult({ status: 'pending', message: 'Uploading file...' })

      const candidateId = row.MigrateEntityID || row.CandidateID
      const certificationName = row.MigrateCertificationName || row.CertificationName
      
      if (!row.FileName) {
        throw new Error('No filename specified')
      }

      const file = filesMap.get(row.FileName)
      if (!file) {
        throw new Error(`File not found: ${row.FileName}`)
      }

      updateResult({ message: 'Uploading file to Bullhorn...' })

      const fileUploadResult = await bullhornAPI.uploadFile(
        'CertificationFileAttachment',
        0,
        file,
        row.FileType || 'other',
        row.FileDescription || '',
        'CertificationFileAttachment'
      )

      const fileId = fileUploadResult.fileId || fileUploadResult.changeEntityId
      if (!fileId) {
        throw new Error('File upload succeeded but no file ID returned')
      }

      updateResult({ 
        message: 'Creating/updating certification record...',
        fileId
      })

      const certData: any = {
        candidate: { id: parseInt(candidateId) },
        certification: { name: certificationName },
        status: row.CertificationStatus || 'Active',
        fileAttachments: { add: [fileId] }
      }

      if (row.DateCertified) certData.dateCertified = parseInt(row.DateCertified)
      if (row.DateExpires) certData.dateExpires = parseInt(row.DateExpires)
      if (row.Comments) certData.comments = row.Comments
      if (row.CustomText1) certData.customText1 = row.CustomText1
      if (row.CustomText2) certData.customText2 = row.CustomText2

      let certResult
      const migrateCertId = row.MigrateCertificationID || row.CandidateCertificationID

      if (migrateCertId) {
        try {
          const existingCert = await bullhornAPI.getEntity('CandidateCertification', parseInt(migrateCertId), ['id'])
          
          if (existingCert && existingCert.id) {
            certResult = await bullhornAPI.updateEntity('CandidateCertification', parseInt(migrateCertId), certData)
            updateResult({ message: 'Updated existing certification' })
          } else {
            throw new Error('Certification not found, creating new')
          }
        } catch {
          certResult = await bullhornAPI.createEntity('CandidateCertification', certData)
          updateResult({ message: 'Created new certification' })
        }
      } else {
        certResult = await bullhornAPI.createEntity('CandidateCertification', certData)
        updateResult({ message: 'Created new certification' })
      }

      const certificationId = certResult.changedEntityId || certResult.id

      updateResult({
        status: 'success',
        message: 'Upload complete',
        fileId,
        certificationId
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
    toast.info(pauseRef.current ? 'Upload paused' : 'Upload resumed')
  }

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel the upload?')) {
      cancelledRef.current = true
      pauseRef.current = false
      setIsUploading(false)
      setIsPaused(false)
      toast.info('Upload cancelled')
      onLog('Credential Bulk Upload', 'error', 'Upload cancelled by user', {})
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Certification Lookup Fields</CardTitle>
          <CardDescription>
            Available TO_ONE lookup fields from Certification entity metadata
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {certificationFields.length > 0 
                ? `${certificationFields.length} lookup fields available for use in certification records`
                : 'Click refresh to load lookup fields'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={loadCertificationMetadata}
              disabled={isLoadingMetadata}
              className="gap-2"
            >
              <ArrowsClockwise 
                size={16} 
                weight={isLoadingMetadata ? 'bold' : 'regular'}
                className={isLoadingMetadata ? 'animate-spin' : ''}
              />
              {isLoadingMetadata ? 'Loading...' : 'Refresh Metadata'}
            </Button>
          </div>

          {certificationFields.length > 0 && (
            <ScrollArea className="h-[200px] border rounded-md">
              <div className="p-4 space-y-2">
                {certificationFields.map((field) => (
                  <div key={field.name} className="flex items-center justify-between py-2 border-b last:border-b-0">
                    <div className="flex items-center gap-2">
                      <ListBullets size={16} className="text-muted-foreground" />
                      <div>
                        <span className="font-mono text-sm font-medium">{field.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{field.label}</span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {field.type}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Alert>
        <Info size={16} />
        <AlertTitle>About Migrate Fields (Optional)</AlertTitle>
        <AlertDescription className="space-y-2 text-sm">
          <p>
            The migrate fields are <strong>completely optional</strong> and provide advanced functionality for migration scenarios:
          </p>
          <Separator className="my-2" />
          <div className="space-y-2">
            <div>
              <strong className="text-foreground">MigrateEntityID:</strong>
              <span className="ml-2">
                Use this to specify a <em>different</em> Candidate ID than the one in CandidateID. 
                If provided, credentials will be attached to this candidate instead.
              </span>
            </div>
            <div>
              <strong className="text-foreground">MigrateCertificationID:</strong>
              <span className="ml-2">
                Use this to update an <em>existing</em> CandidateCertification record by ID. 
                If the ID exists, it will be updated; otherwise, a new record will be created.
              </span>
            </div>
            <div>
              <strong className="text-foreground">MigrateCertificationName:</strong>
              <span className="ml-2">
                Use this to specify a <em>different</em> certification name than the one in CertificationName. 
                If provided, this name will be used for the certification lookup instead.
              </span>
            </div>
          </div>
          <Separator className="my-2" />
          <p className="text-xs text-muted-foreground italic">
            💡 Tip: For most use cases, you only need CandidateID, CertificationName, and FileName. 
            The migrate fields are designed for data migration projects where you need to preserve IDs or 
            update existing records.
          </p>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Upload Files</CardTitle>
          <CardDescription>
            Upload CSV metadata and credential files folder
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="csv-upload">CSV File (with metadata)</Label>
            <div className="flex gap-2">
              <Input
                ref={csvInputRef}
                id="csv-upload"
                type="file"
                accept=".csv"
                onChange={handleCsvSelect}
                disabled={isUploading}
                className="flex-1"
              />
              {csvFile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCsvFile(null)
                    setCsvData([])
                    setValidationErrors([])
                    if (csvInputRef.current) csvInputRef.current.value = ''
                  }}
                  disabled={isUploading}
                >
                  <Trash size={16} />
                </Button>
              )}
            </div>
            {csvFile && (
              <p className="text-sm text-muted-foreground">
                Loaded: {csvFile.name} ({csvData.length} records)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="files-upload">Credential Files (select folder contents)</Label>
            <div className="flex gap-2">
              <Input
                ref={filesInputRef}
                id="files-upload"
                type="file"
                multiple
                onChange={handleFilesSelect}
                disabled={isUploading}
                className="flex-1"
              />
              {filesFolder && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilesFolder(null)
                    setFilesMap(new Map())
                    if (filesInputRef.current) filesInputRef.current.value = ''
                  }}
                  disabled={isUploading}
                >
                  <Trash size={16} />
                </Button>
              )}
            </div>
            {filesFolder && (
              <p className="text-sm text-muted-foreground">
                Loaded: {filesMap.size} files
              </p>
            )}
          </div>

          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <Warning size={16} />
              <AlertTitle>Validation Issues</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {csvData.length > 0 && filesMap.size > 0 && validationErrors.length === 0 && (
            <Alert>
              <Info size={16} />
              <AlertTitle>Ready to Upload</AlertTitle>
              <AlertDescription>
                {csvData.length} credential records and {filesMap.size} files ready for upload
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="concurrent-uploads">Concurrent Uploads: {concurrentUploads}</Label>
            <Slider
              id="concurrent-uploads"
              min={1}
              max={5}
              step={1}
              value={[concurrentUploads]}
              onValueChange={([value]) => setConcurrentUploads(value)}
              disabled={isUploading}
            />
            <p className="text-xs text-muted-foreground">
              Lower values recommended for large files to avoid timeouts
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        {!isUploading ? (
          <>
            <Button
              onClick={handleStartUpload}
              disabled={csvData.length === 0 || filesMap.size === 0}
              className="flex-1"
            >
              <Upload size={18} />
              Start Bulk Upload
            </Button>
            <Button
              variant="outline"
              onClick={handleClearAll}
              disabled={csvData.length === 0 && filesMap.size === 0}
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

      {isUploading && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Progress</CardTitle>
            <CardDescription>
              Processing {currentRowIndex} of {csvData.length} records
              {estimatedTimeRemaining && ` • Est. ${formatTime(estimatedTimeRemaining)} remaining`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Progress</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          </CardContent>
        </Card>
      )}

      {uploadResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Results</CardTitle>
            <CardDescription>
              {uploadResults.filter(r => r.status === 'success').length} successful,{' '}
              {uploadResults.filter(r => r.status === 'error').length} failed,{' '}
              {uploadResults.filter(r => r.status === 'pending').length} pending
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Candidate ID</TableHead>
                    <TableHead>Certification</TableHead>
                    <TableHead>File Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uploadResults.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell className="text-sm text-muted-foreground">
                        {result.rowIndex + 1}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {result.candidateId}
                      </TableCell>
                      <TableCell className="text-sm">
                        {result.certificationName}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {result.fileName}
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
                      <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                        {result.message || '-'}
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
