import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { FileArrowUp, FileCsv, FolderOpen, CheckCircle, XCircle, Pause, Play, Stop, Info } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { useEntities } from '@/hooks/use-entities'
import Papa from 'papaparse'

interface CSVFileUploaderProps {
  onLog: (operation: string, status: 'success' | 'error', message: string, details?: any) => void
}

interface CSVRow {
  entityId: string
  filename: string
  [key: string]: string
}

interface UploadRecord {
  entityId: string
  filename: string
  status: 'pending' | 'uploading' | 'success' | 'error' | 'skipped'
  message?: string
  fileId?: number
  fileSize?: number
}

export function CSVFileUploader({ onLog }: CSVFileUploaderProps) {
  const [entity, setEntity] = useState('')
  const [fileType, setFileType] = useState('SAMPLE')
  const [description, setDescription] = useState('')
  
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<CSVRow[]>([])
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  
  const [entityIdColumn, setEntityIdColumn] = useState('')
  const [filenameColumn, setFilenameColumn] = useState('')
  
  const [sourceFolder, setSourceFolder] = useState<FileList | null>(null)
  const [fileMap, setFileMap] = useState<Map<string, File>>(new Map())
  
  const [uploadRecords, setUploadRecords] = useState<UploadRecord[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  
  const csvInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const pauseRef = useRef(false)

  const { entities, loading: entitiesLoading } = useEntities()

  const fileAttachmentEntities = [
    'Candidate',
    'Placement',
    'Opportunity',
    'Certification',
    'JobOrder',
    'ClientContact'
  ]

  const filteredEntities = entities.filter(entity => 
    fileAttachmentEntities.includes(entity)
  )

  const fileTypeOptions = [
    { value: 'SAMPLE', label: 'Sample File' },
    { value: 'RESUME', label: 'Resume' },
    { value: 'COVER_LETTER', label: 'Cover Letter' },
    { value: 'FILE', label: 'General File' },
    { value: 'ATTACHMENT', label: 'Attachment' },
    { value: 'DOCUMENT', label: 'Document' },
    { value: 'IMAGE', label: 'Image' }
  ]

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setCsvFile(file)
    
    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<CSVRow>) => {
        const data = results.data
        setCsvData(data)
        
        if (data.length > 0) {
          const headers = Object.keys(data[0])
          setCsvHeaders(headers)
          
          const entityIdCol = headers.find(h => 
            h.toLowerCase().includes('entityid') || 
            h.toLowerCase().includes('entity_id') ||
            h.toLowerCase() === 'id'
          )
          const filenameCol = headers.find(h => 
            h.toLowerCase().includes('filename') || 
            h.toLowerCase().includes('file_name') ||
            h.toLowerCase().includes('file')
          )
          
          if (entityIdCol) setEntityIdColumn(entityIdCol)
          if (filenameCol) setFilenameColumn(filenameCol)
          
          toast.success(`Loaded CSV with ${data.length} rows`)
          onLog('CSV Upload', 'success', `Loaded CSV file with ${data.length} rows`, {
            filename: file.name,
            rowCount: data.length,
            headers
          })
        }
      },
      error: (error: Error) => {
        toast.error(`Failed to parse CSV: ${error.message}`)
        onLog('CSV Upload', 'error', `Failed to parse CSV: ${error.message}`, { error })
      }
    })
  }

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setSourceFolder(files)
    
    const map = new Map<string, File>()
    Array.from(files).forEach((file: File) => {
      map.set(file.name.toLowerCase(), file)
    })
    setFileMap(map)
    
    toast.success(`Selected folder with ${files.length} files`)
    onLog('Folder Selection', 'success', `Selected source folder with ${files.length} files`, {
      fileCount: files.length
    })
  }

  const validateSetup = (): boolean => {
    if (!entity) {
      toast.error('Please select an entity type')
      return false
    }
    
    if (csvData.length === 0) {
      toast.error('Please upload a CSV file first')
      return false
    }
    
    if (!entityIdColumn || !filenameColumn) {
      toast.error('Please map Entity ID and Filename columns')
      return false
    }
    
    if (fileMap.size === 0) {
      toast.error('Please select a source folder')
      return false
    }
    
    return true
  }

  const handleStartUpload = async () => {
    if (!validateSetup()) return

    const records: UploadRecord[] = csvData.map(row => ({
      entityId: row[entityIdColumn],
      filename: row[filenameColumn],
      status: 'pending' as const
    }))

    setUploadRecords(records)
    setCurrentIndex(0)
    setProgress(0)
    setIsUploading(true)
    setIsPaused(false)
    pauseRef.current = false

    processUploads(records, 0)
  }

  const processUploads = async (records: UploadRecord[], startIndex: number) => {
    for (let i = startIndex; i < records.length; i++) {
      if (pauseRef.current) {
        setCurrentIndex(i)
        return
      }

      const record = records[i]
      setCurrentIndex(i)

      const filenameLower = record.filename.toLowerCase()
      const file = fileMap.get(filenameLower)

      if (!file) {
        record.status = 'skipped'
        record.message = 'File not found in source folder'
        setUploadRecords([...records])
        continue
      }

      if (file.size > 50 * 1024 * 1024) {
        record.status = 'error'
        record.message = `File exceeds 50 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB)`
        setUploadRecords([...records])
        continue
      }

      record.status = 'uploading'
      record.fileSize = file.size
      setUploadRecords([...records])

      try {
        const response = await bullhornAPI.uploadFile(
          entity,
          parseInt(record.entityId),
          file,
          fileType,
          description || file.name
        )

        record.status = 'success'
        record.message = 'Uploaded successfully'
        record.fileId = response?.fileId || response?.id

        onLog('File Upload', 'success', `Uploaded ${file.name} to ${entity} ID ${record.entityId}`, {
          entity,
          entityId: record.entityId,
          filename: file.name,
          fileSize: file.size,
          fileType,
          fileId: record.fileId
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed'
        record.status = 'error'
        record.message = errorMessage

        onLog('File Upload', 'error', `Failed to upload ${file.name}: ${errorMessage}`, {
          entity,
          entityId: record.entityId,
          filename: file.name,
          error: errorMessage
        })
      }

      setUploadRecords([...records])
      setProgress(Math.round(((i + 1) / records.length) * 100))
    }

    setIsUploading(false)
    setIsPaused(false)

    const successCount = records.filter(r => r.status === 'success').length
    const errorCount = records.filter(r => r.status === 'error').length
    const skippedCount = records.filter(r => r.status === 'skipped').length

    if (errorCount === 0 && skippedCount === 0) {
      toast.success(`All ${successCount} files uploaded successfully!`)
    } else {
      toast.warning(`${successCount} succeeded, ${errorCount} failed, ${skippedCount} skipped`)
    }
  }

  const handlePause = () => {
    pauseRef.current = true
    setIsPaused(true)
    toast.info('Upload paused')
  }

  const handleResume = () => {
    pauseRef.current = false
    setIsPaused(false)
    toast.info('Resuming upload...')
    processUploads(uploadRecords, currentIndex)
  }

  const handleStop = () => {
    pauseRef.current = true
    setIsUploading(false)
    setIsPaused(false)
    toast.info('Upload stopped')
  }

  const handleRetryFailed = () => {
    const failedIndices = uploadRecords
      .map((record, index) => ({ record, index }))
      .filter(({ record }) => record.status === 'error')
      .map(({ index }) => index)

    if (failedIndices.length === 0) {
      toast.info('No failed uploads to retry')
      return
    }

    const resetRecords = [...uploadRecords]
    failedIndices.forEach(index => {
      resetRecords[index].status = 'pending'
      resetRecords[index].message = undefined
    })

    setUploadRecords(resetRecords)
    setCurrentIndex(failedIndices[0])
    setIsUploading(true)
    setIsPaused(false)
    pauseRef.current = false

    processUploads(resetRecords, failedIndices[0])
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  const successCount = uploadRecords.filter(r => r.status === 'success').length
  const errorCount = uploadRecords.filter(r => r.status === 'error').length
  const skippedCount = uploadRecords.filter(r => r.status === 'skipped').length
  const pendingCount = uploadRecords.filter(r => r.status === 'pending').length

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCsv className="text-accent" size={24} weight="duotone" />
            CSV Bulk File Upload
          </CardTitle>
          <CardDescription>
            Upload files to Bullhorn entities using a CSV mapping file with entity IDs and filenames
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>How it works</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>1. Upload a CSV file with columns for entity ID and filename</p>
              <p>2. Select a folder containing all the files referenced in the CSV</p>
              <p>3. Map the CSV columns to match entity IDs and filenames</p>
              <p>4. The system will upload each file to the corresponding entity</p>
            </AlertDescription>
          </Alert>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <Label htmlFor="entity-type">Entity Type</Label>
                <Select value={entity} onValueChange={setEntity} disabled={isUploading}>
                  <SelectTrigger id="entity-type">
                    <SelectValue placeholder="Select entity type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredEntities.map(entityName => (
                      <SelectItem key={entityName} value={entityName}>
                        {entityName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="file-type">File Type</Label>
                <Select value={fileType} onValueChange={setFileType} disabled={isUploading}>
                  <SelectTrigger id="file-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fileTypeOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="File description..."
                  disabled={isUploading}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="csv-upload">CSV Mapping File</Label>
                <div className="flex gap-2">
                  <Input
                    id="csv-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    ref={csvInputRef}
                    disabled={isUploading}
                    className="flex-1"
                  />
                  {csvFile && (
                    <Badge variant="secondary" className="self-center">
                      {csvData.length} rows
                    </Badge>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="folder-upload">Source Folder (Select all files)</Label>
                <div className="flex gap-2">
                  <Input
                    id="folder-upload"
                    type="file"
                    multiple
                    onChange={handleFolderSelect}
                    ref={folderInputRef}
                    disabled={isUploading}
                    className="flex-1"
                  />
                  {fileMap.size > 0 && (
                    <Badge variant="secondary" className="self-center">
                      {fileMap.size} files
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Click "Choose Files" and select all files in your source folder (use Ctrl+A or Cmd+A to select multiple)
                </p>
              </div>
            </div>
          </div>

          {csvHeaders.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 border-t pt-4">
              <div>
                <Label htmlFor="entity-id-column">Entity ID Column</Label>
                <Select value={entityIdColumn} onValueChange={setEntityIdColumn} disabled={isUploading}>
                  <SelectTrigger id="entity-id-column">
                    <SelectValue placeholder="Select column..." />
                  </SelectTrigger>
                  <SelectContent>
                    {csvHeaders.map(header => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="filename-column">Filename Column</Label>
                <Select value={filenameColumn} onValueChange={setFilenameColumn} disabled={isUploading}>
                  <SelectTrigger id="filename-column">
                    <SelectValue placeholder="Select column..." />
                  </SelectTrigger>
                  <SelectContent>
                    {csvHeaders.map(header => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {csvData.length > 0 && entityIdColumn && filenameColumn && (
            <div className="border-t pt-4">
              <Label>Preview (first 5 rows)</Label>
              <ScrollArea className="h-32 border rounded-md mt-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entity ID</TableHead>
                      <TableHead>Filename</TableHead>
                      <TableHead>File Found</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvData.slice(0, 5).map((row, index) => {
                      const filename = row[filenameColumn]
                      const fileFound = fileMap.has(filename.toLowerCase())
                      return (
                        <TableRow key={index}>
                          <TableCell className="font-mono">{row[entityIdColumn]}</TableCell>
                          <TableCell>{filename}</TableCell>
                          <TableCell>
                            {fileFound ? (
                              <CheckCircle className="text-green-500" size={16} />
                            ) : (
                              <XCircle className="text-red-500" size={16} />
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}

          <div className="flex gap-2 border-t pt-4">
            {!isUploading && uploadRecords.length === 0 && (
              <Button 
                onClick={handleStartUpload}
                disabled={!entity || csvData.length === 0 || !entityIdColumn || !filenameColumn || fileMap.size === 0}
              >
                <FileArrowUp />
                Start Upload
              </Button>
            )}

            {isUploading && !isPaused && (
              <Button onClick={handlePause} variant="outline">
                <Pause />
                Pause
              </Button>
            )}

            {isUploading && isPaused && (
              <Button onClick={handleResume}>
                <Play />
                Resume
              </Button>
            )}

            {isUploading && (
              <Button onClick={handleStop} variant="destructive">
                <Stop />
                Stop
              </Button>
            )}

            {!isUploading && errorCount > 0 && (
              <Button onClick={handleRetryFailed} variant="outline">
                Retry Failed ({errorCount})
              </Button>
            )}
          </div>

          {uploadRecords.length > 0 && (
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label>Upload Progress</Label>
                <div className="flex gap-2">
                  <Badge variant="default">{successCount} Success</Badge>
                  <Badge variant="destructive">{errorCount} Error</Badge>
                  <Badge variant="secondary">{skippedCount} Skipped</Badge>
                  <Badge variant="outline">{pendingCount} Pending</Badge>
                </div>
              </div>

              <Progress value={progress} />

              <ScrollArea className="h-80 border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Entity ID</TableHead>
                      <TableHead>Filename</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>File ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uploadRecords.map((record, index) => (
                      <TableRow key={index} className={currentIndex === index ? 'bg-accent/10' : ''}>
                        <TableCell>
                          {record.status === 'success' && <CheckCircle className="text-green-500" size={18} />}
                          {record.status === 'error' && <XCircle className="text-red-500" size={18} />}
                          {record.status === 'uploading' && <Badge variant="default">Uploading...</Badge>}
                          {record.status === 'pending' && <Badge variant="outline">Pending</Badge>}
                          {record.status === 'skipped' && <Badge variant="secondary">Skipped</Badge>}
                        </TableCell>
                        <TableCell className="font-mono">{record.entityId}</TableCell>
                        <TableCell className="max-w-xs truncate">{record.filename}</TableCell>
                        <TableCell>{record.fileSize ? formatFileSize(record.fileSize) : '-'}</TableCell>
                        <TableCell className="max-w-sm truncate text-xs">{record.message || '-'}</TableCell>
                        <TableCell className="font-mono text-xs">{record.fileId || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
