import { useState, useRef } from 'react'
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
  entityId?: string
  filename?: string
  type?: string
  description?: string
  [key: string]: string | undefined
}

interface UploadRecord {
  entityId: string
  filename: string
  type: string
  description: string
  status: 'pending' | 'uploading' | 'success' | 'error' | 'skipped'
  message?: string
  fileId?: number
  fileSize?: number
}

export function CSVFileUploader({ onLog }: CSVFileUploaderProps) {
  const [entity, setEntity] = useState('')
  const [defaultType, setDefaultType] = useState('cover')
  const [defaultDescription, setDefaultDescription] = useState('')
  
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<CSVRow[]>([])
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  
  const [entityIdColumn, setEntityIdColumn] = useState('')
  const [filenameColumn, setFilenameColumn] = useState('')
  const [typeColumn, setTypeColumn] = useState('')
  const [descriptionColumn, setDescriptionColumn] = useState('')
  
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
    { value: 'cover', label: 'Assignment Agreement Letter' },
    { value: 'autosubmit', label: 'Auto-Submit Signoff' },
    { value: 'background', label: 'Background Check' },
    { value: 'benefits', label: 'Benefit Forms' },
    { value: 'board', label: 'Board Certification' },
    { value: 'meal', label: 'California Meal Waiver' },
    { value: 'client', label: 'Client Packet' },
    { value: 'competency', label: 'Competency Exam' },
    { value: 'compliance', label: 'Compliance Paperwork' },
    { value: 'confirmation', label: 'Confirmation Letters' },
    { value: 'dd', label: 'DD Proof Document' },
    { value: 'directdeposit', label: 'Direct Deposit' },
    { value: 'drugscreen', label: 'Drug Screen' },
    { value: 'education', label: 'Education-Manual' },
    { value: 'employment', label: 'Employment-Manual' },
    { value: 'exhibit', label: 'Exhibit' },
    { value: 'facility', label: 'Facility Forms-Manual' },
    { value: 'federal', label: 'Federal/State-Manual' },
    { value: 'health', label: 'Health Record-Manual' },
    { value: 'hiring', label: 'Hiring Document-Manual' },
    { value: 'jobdesc', label: 'Job Description' },
    { value: 'life', label: 'Life Cert-Manual' },
    { value: 'nda', label: 'Non-Disclosure Agreement' },
    { value: 'nurseprofile', label: 'Nurse Profile' },
    { value: 'other', label: 'Other' },
    { value: 'payroll', label: 'Payroll Document' },
    { value: 'paystub', label: 'Paystub' },
    { value: 'perfassessment', label: 'Perf Assessment-Manual' },
    { value: 'agreement', label: 'Primary Applicant Agreement' },
    { value: 'profcert', label: 'Prof Cert-Manual' },
    { value: 'proflic', label: 'Prof Lic-Manual' },
    { value: 'po', label: 'Purchase Order' },
    { value: 'reference', label: 'Reference' },
    { value: 'reimbursement', label: 'Reimbursement' },
    { value: 'resume', label: 'Resume' },
    { value: 'skills', label: 'Skills Assessment' },
    { value: 'statew4', label: 'State W4' },
    { value: 'sow', label: 'Statement of Work' },
    { value: 'stitched', label: 'Stitched Nurse Profile' },
    { value: 'submittal', label: 'Submittal Packet' },
    { value: 'timesheet', label: 'Timesheet' },
    { value: 'timesheetscan', label: 'Timesheet Scan' },
    { value: 'travel', label: 'Travel/Lodging Information' },
    { value: 'w4', label: 'W4' },
    { value: 'w4federal', label: 'W4-Federal' },
    { value: 'w4home', label: 'W4-Home' },
    { value: 'w4working', label: 'W4-Working' },
    { value: 'workerscomp', label: "Worker's Compensation" },
    { value: 'onboarding365', label: 'Onboarding365' }
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
          const typeCol = headers.find(h => 
            h.toLowerCase().includes('type') ||
            h.toLowerCase().includes('category')
          )
          const descCol = headers.find(h => 
            h.toLowerCase().includes('description') ||
            h.toLowerCase().includes('desc') ||
            h.toLowerCase().includes('notes')
          )
          
          if (entityIdCol) setEntityIdColumn(entityIdCol)
          if (filenameCol) setFilenameColumn(filenameCol)
          if (typeCol) setTypeColumn(typeCol)
          if (descCol) setDescriptionColumn(descCol)
          
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
      entityId: row[entityIdColumn] || '',
      filename: row[filenameColumn] || '',
      type: (typeColumn && row[typeColumn]) ? row[typeColumn]! : defaultType,
      description: (descriptionColumn && row[descriptionColumn]) ? row[descriptionColumn]! : defaultDescription,
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
          record.type,
          record.description || file.name
        )

        record.status = 'success'
        record.message = 'Uploaded successfully'
        record.fileId = response?.fileId || response?.id

        onLog('File Upload', 'success', `Uploaded ${file.name} to ${entity} ID ${record.entityId}`, {
          entity,
          entityId: record.entityId,
          filename: file.name,
          fileSize: file.size,
          type: record.type,
          description: record.description,
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
            Upload files to Bullhorn entities using a CSV mapping file with entity IDs and filenames. fileType=SAMPLE is always sent.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>How it works</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>1. Upload a CSV file with columns: entityId, filename, and optionally type and description</p>
              <p>2. Select a folder containing all the files referenced in the CSV</p>
              <p>3. Map the CSV columns to match entity IDs, filenames, types, and descriptions</p>
              <p>4. The system will upload each file with fileType=SAMPLE and the specified type value</p>
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
                <Label htmlFor="default-type">Default Document Type</Label>
                <Select value={defaultType} onValueChange={setDefaultType} disabled={isUploading}>
                  <SelectTrigger id="default-type">
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
                <p className="text-xs text-muted-foreground mt-1">
                  Used when type column is not mapped or empty
                </p>
              </div>

              <div>
                <Label htmlFor="default-description">Default Description (Optional)</Label>
                <Input
                  id="default-description"
                  value={defaultDescription}
                  onChange={(e) => setDefaultDescription(e.target.value)}
                  placeholder="File description..."
                  disabled={isUploading}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Used when description column is not mapped or empty
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="csv-file">CSV File</Label>
                <Input
                  id="csv-file"
                  ref={csvInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleCSVUpload}
                  disabled={isUploading}
                  className="cursor-pointer"
                />
                {csvFile && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Loaded: {csvFile.name} ({csvData.length} rows)
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="source-folder">Source Folder</Label>
                <Input
                  id="source-folder"
                  ref={folderInputRef}
                  type="file"
                  {...({webkitdirectory: '', directory: ''} as any)}
                  multiple
                  onChange={handleFolderSelect}
                  disabled={isUploading}
                  className="cursor-pointer"
                />
                {sourceFolder && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Selected: {sourceFolder.length} files
                  </p>
                )}
              </div>
            </div>
          </div>

          {csvHeaders.length > 0 && (
            <div className="space-y-4 p-4 border rounded-lg bg-accent/5">
              <h3 className="font-semibold">Column Mapping</h3>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="entityid-column">Entity ID Column *</Label>
                  <Select value={entityIdColumn} onValueChange={setEntityIdColumn} disabled={isUploading}>
                    <SelectTrigger id="entityid-column">
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
                  <Label htmlFor="filename-column">Filename Column *</Label>
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

                <div>
                  <Label htmlFor="type-column">Type Column (Optional)</Label>
                  <Select value={typeColumn} onValueChange={setTypeColumn} disabled={isUploading}>
                    <SelectTrigger id="type-column">
                      <SelectValue placeholder="Not mapped - use default" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Not mapped - use default</SelectItem>
                      {csvHeaders.map(header => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="description-column">Description Column (Optional)</Label>
                  <Select value={descriptionColumn} onValueChange={setDescriptionColumn} disabled={isUploading}>
                    <SelectTrigger id="description-column">
                      <SelectValue placeholder="Not mapped - use default" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Not mapped - use default</SelectItem>
                      {csvHeaders.map(header => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {isUploading && (
            <div className="space-y-3 p-4 border rounded-lg bg-accent/5">
              <div className="flex items-center justify-between">
                <Label>Upload Progress</Label>
                <Badge variant={isPaused ? 'secondary' : 'default'}>
                  {isPaused ? 'Paused' : `${currentIndex + 1} of ${uploadRecords.length}`}
                </Badge>
              </div>
              <Progress value={progress} className="h-3" />
              
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Success</p>
                  <p className="font-semibold text-green-600">{successCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Pending</p>
                  <p className="font-semibold text-blue-600">{pendingCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Failed</p>
                  <p className="font-semibold text-destructive">{errorCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Skipped</p>
                  <p className="font-semibold text-muted-foreground">{skippedCount}</p>
                </div>
              </div>

              <div className="flex gap-2">
                {!isPaused ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handlePause}
                    className="flex-1"
                  >
                    <Pause size={16} />
                    Pause Upload
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleResume}
                    className="flex-1"
                  >
                    <Play size={16} />
                    Resume Upload
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleStop}
                >
                  <Stop size={16} />
                  Stop
                </Button>
              </div>
            </div>
          )}

          {uploadRecords.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Upload Results</Label>
                {errorCount > 0 && !isUploading && (
                  <Button size="sm" variant="outline" onClick={handleRetryFailed}>
                    Retry Failed ({errorCount})
                  </Button>
                )}
              </div>
              <ScrollArea className="h-[300px] border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entity ID</TableHead>
                      <TableHead>Filename</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uploadRecords.map((record, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-xs">{record.entityId}</TableCell>
                        <TableCell className="font-medium text-xs">{record.filename}</TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className="text-xs">
                            {fileTypeOptions.find(t => t.value === record.type)?.label || record.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {record.status === 'success' && (
                              <CheckCircle size={16} className="text-green-600" weight="fill" />
                            )}
                            {record.status === 'error' && (
                              <XCircle size={16} className="text-destructive" weight="fill" />
                            )}
                            {record.status === 'skipped' && (
                              <XCircle size={16} className="text-muted-foreground" weight="fill" />
                            )}
                            {record.status === 'uploading' && (
                              <Badge variant="secondary" className="text-xs">Uploading...</Badge>
                            )}
                            {record.status === 'pending' && (
                              <Badge variant="outline" className="text-xs">Pending</Badge>
                            )}
                            {record.status === 'success' && (
                              <span className="text-xs text-green-600">Success</span>
                            )}
                            {record.status === 'error' && (
                              <span className="text-xs text-destructive">Failed</span>
                            )}
                            {record.status === 'skipped' && (
                              <span className="text-xs text-muted-foreground">Skipped</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {record.message || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}

          <Button
            onClick={handleStartUpload}
            disabled={!entity || csvData.length === 0 || !entityIdColumn || !filenameColumn || fileMap.size === 0 || isUploading}
            className="w-full"
          >
            <FileArrowUp />
            {isUploading ? 'Upload in Progress...' : 'Start Bulk Upload'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
