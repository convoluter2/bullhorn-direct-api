import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Slider } from '@/components/ui/slider'
import { FileZip, Upload, CheckCircle, XCircle, Info, Trash, Faders, Pause, Play, FolderOpen } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { useEntities } from '@/hooks/use-entities'
import JSZip from 'jszip'

interface BulkZipUploaderProps {
  onLog: (operation: string, status: 'success' | 'error', message: string, details?: any) => void
}

interface UploadResult {
  fileName: string
  entityId: string
  status: 'success' | 'error' | 'pending' | 'uploading'
  message?: string
  fileCount?: number
  uploadedCount?: number
  currentFile?: string
}

interface ParsedZipFile {
  file: File
  entityId: string
  fileName: string
}

export function BulkZipUploader({ onLog }: BulkZipUploaderProps) {
  const [entity, setEntity] = useState('')
  const [zipFiles, setZipFiles] = useState<ParsedZipFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [currentFileIndex, setCurrentFileIndex] = useState(0)
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([])
  const [concurrentUploads, setConcurrentUploads] = useState(3)
  const [isPaused, setIsPaused] = useState(false)
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

  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    if (files.length === 0) {
      toast.error('No files selected')
      return
    }

    const zipFilesOnly = files.filter(file => file.name.toLowerCase().endsWith('.zip'))
    
    if (zipFilesOnly.length === 0) {
      toast.error('No ZIP files found in the selected folder')
      return
    }

    const parsedFiles: ParsedZipFile[] = []
    const invalidFiles: string[] = []

    for (const file of zipFilesOnly) {
      const match = file.name.match(/^(\d+)/)
      
      if (match && match[1]) {
        const entityId = match[1]
        parsedFiles.push({
          file,
          entityId,
          fileName: file.name
        })
      } else {
        invalidFiles.push(file.name)
      }
    }

    if (invalidFiles.length > 0) {
      console.warn('Files without numeric ID prefix:', invalidFiles)
      toast.warning(`${invalidFiles.length} file(s) skipped - missing numeric ID prefix`, {
        description: 'ZIP files must start with the entity ID (e.g., 12345-files.zip)'
      })
    }

    if (parsedFiles.length === 0) {
      toast.error('No valid ZIP files found. Files must start with the entity ID (e.g., 12345-files.zip)')
      return
    }

    setZipFiles(parsedFiles)
    setUploadResults([])
    toast.success(`Loaded ${parsedFiles.length} ZIP file(s) ready for upload`)
    
    onLog('Folder Selected', 'success', `Loaded ${parsedFiles.length} ZIP files`, {
      totalFiles: files.length,
      validZipFiles: parsedFiles.length,
      invalidFiles: invalidFiles.length
    })
  }

  const handlePauseResume = () => {
    if (isPaused) {
      setIsPaused(false)
      pauseRef.current = false
      toast.info('Resuming uploads...')
    } else {
      setIsPaused(true)
      pauseRef.current = true
      toast.info('Upload paused')
    }
  }

  const handleCancelUpload = () => {
    pauseRef.current = true
    setIsPaused(false)
    setIsUploading(false)
    setUploadProgress(0)
    toast.info('Upload cancelled')
  }

  const handleBulkUpload = async () => {
    if (zipFiles.length === 0) {
      toast.error('Please select a folder with ZIP files first')
      return
    }

    if (!entity) {
      toast.error('Please select an entity type')
      return
    }

    try {
      setIsUploading(true)
      setIsPaused(false)
      pauseRef.current = false
      setUploadProgress(0)
      setCurrentFileIndex(0)
      
      const results: UploadResult[] = zipFiles.map(zf => ({
        fileName: zf.fileName,
        entityId: zf.entityId,
        status: 'pending',
        message: 'Pending...'
      }))
      setUploadResults(results)

      let successCount = 0
      let errorCount = 0

      for (let i = 0; i < zipFiles.length; i++) {
        while (pauseRef.current) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }

        if (!isUploading) {
          break
        }

        const zipFile = zipFiles[i]
        setCurrentFileIndex(i + 1)
        
        results[i] = {
          ...results[i],
          status: 'uploading',
          message: 'Extracting ZIP...'
        }
        setUploadResults([...results])
        
        try {
          console.log(`📤 Processing ZIP ${i + 1}/${zipFiles.length}: ${zipFile.fileName} for ${entity} ID ${zipFile.entityId}`)
          
          const zip = new JSZip()
          const zipContent = await zip.loadAsync(zipFile.file)
          
          const filesToUpload: Array<{ name: string; blob: Blob }> = []
          
          for (const [fileName, zipEntry] of Object.entries(zipContent.files)) {
            if (!zipEntry.dir) {
              const blob = await zipEntry.async('blob')
              filesToUpload.push({ name: fileName, blob })
            }
          }

          if (filesToUpload.length === 0) {
            results[i] = {
              ...results[i],
              status: 'error',
              message: 'No files found in ZIP',
              fileCount: 0
            }
            errorCount++
            setUploadResults([...results])
            setUploadProgress(Math.round(((i + 1) / zipFiles.length) * 100))
            continue
          }

          results[i] = {
            ...results[i],
            fileCount: filesToUpload.length,
            uploadedCount: 0,
            message: `Uploading ${filesToUpload.length} file(s)...`
          }
          setUploadResults([...results])

          let uploadedCount = 0

          const uploadFile = async (fileData: { name: string; blob: Blob }, fileIndex: number) => {
            results[i] = {
              ...results[i],
              currentFile: fileData.name,
              uploadedCount: uploadedCount,
              message: `Uploading ${fileData.name}...`
            }
            setUploadResults([...results])
            
            try {
              const file = new File([fileData.blob], fileData.name, { type: fileData.blob.type })
              
              await bullhornAPI.uploadFile(entity, parseInt(zipFile.entityId), file)
              
              uploadedCount++
              
              results[i] = {
                ...results[i],
                uploadedCount: uploadedCount
              }
              setUploadResults([...results])
              
              return { success: true, fileName: fileData.name }
            } catch (fileError) {
              console.error(`❌ Failed to upload file ${fileData.name}:`, fileError)
              return { success: false, fileName: fileData.name, error: fileError }
            }
          }

          for (let fileIndex = 0; fileIndex < filesToUpload.length; fileIndex += concurrentUploads) {
            while (pauseRef.current) {
              await new Promise(resolve => setTimeout(resolve, 100))
            }

            if (!isUploading) {
              break
            }

            const batch = filesToUpload.slice(fileIndex, fileIndex + concurrentUploads)
            const batchPromises = batch.map((fileData, batchIdx) => 
              uploadFile(fileData, fileIndex + batchIdx)
            )
            
            await Promise.all(batchPromises)
          }

          if (uploadedCount === 0) {
            results[i] = {
              ...results[i],
              status: 'error',
              message: 'Failed to upload all files',
              fileCount: filesToUpload.length,
              uploadedCount: 0
            }
            errorCount++
            onLog('Bulk Upload', 'error', `Failed to upload files from ${zipFile.fileName}`, {
              entity,
              entityId: zipFile.entityId,
              fileName: zipFile.fileName
            })
          } else {
            results[i] = {
              ...results[i],
              status: 'success',
              message: `Uploaded ${uploadedCount} file(s)`,
              fileCount: filesToUpload.length,
              uploadedCount: uploadedCount
            }
            successCount++
            onLog('Bulk Upload', 'success', `Uploaded ${uploadedCount} file(s) from ${zipFile.fileName} to ${entity} ID ${zipFile.entityId}`, {
              entity,
              entityId: zipFile.entityId,
              fileName: zipFile.fileName,
              fileCount: uploadedCount
            })
          }

        } catch (error) {
          console.error(`❌ Failed to process ${zipFile.fileName}:`, error)
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          results[i] = {
            ...results[i],
            status: 'error',
            message: errorMessage
          }
          errorCount++

          onLog('Bulk Upload', 'error', `Failed to upload files from ${zipFile.fileName}`, {
            entity,
            entityId: zipFile.entityId,
            fileName: zipFile.fileName,
            error: errorMessage
          })
        }

        setUploadResults([...results])
        setUploadProgress(Math.round(((i + 1) / zipFiles.length) * 100))
      }

      if (errorCount === 0) {
        toast.success(`Successfully uploaded files from all ${successCount} ZIP file(s)!`)
      } else if (successCount === 0) {
        toast.error(`All ${errorCount} uploads failed`)
      } else {
        toast.warning(`${successCount} successful, ${errorCount} failed`)
      }

      onLog('Bulk Upload Complete', successCount > 0 ? 'success' : 'error', 
        `Bulk upload complete: ${successCount} successful, ${errorCount} failed`, {
        entity,
        totalZipFiles: zipFiles.length,
        successCount,
        errorCount
      })

    } catch (error) {
      console.error('Bulk upload error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Bulk upload failed'
      toast.error(`Bulk upload failed: ${errorMessage}`)
      onLog('Bulk Upload', 'error', errorMessage, { error: errorMessage })
    } finally {
      setIsUploading(false)
      setIsPaused(false)
      pauseRef.current = false
      setTimeout(() => {
        setUploadProgress(0)
        setCurrentFileIndex(0)
      }, 3000)
    }
  }

  const handleClear = () => {
    setZipFiles([])
    setUploadResults([])
    if (folderInputRef.current) {
      folderInputRef.current.value = ''
    }
    toast.info('Cleared all data')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileZip size={24} className="text-accent" weight="duotone" />
          Bulk ZIP Upload
        </CardTitle>
        <CardDescription>
          Upload files from multiple ZIP files to their respective entities. ZIP files must be named with the entity ID at the start (e.g., 12345-files.zip)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>How It Works</AlertTitle>
          <AlertDescription>
            <ol className="list-decimal list-inside space-y-1 mt-2">
              <li>Select the entity type (Candidate, Placement, etc.)</li>
              <li>Select a folder containing ZIP files</li>
              <li>Each ZIP file must be named starting with the entity ID: <code className="text-xs bg-muted px-1 py-0.5 rounded">12345-anything.zip</code></li>
              <li>All files in each ZIP will be uploaded to the entity matching that ID</li>
              <li>Files keep their original names from inside the ZIP</li>
            </ol>
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="bulk-upload-entity">Entity Type</Label>
          <Select value={entity} onValueChange={setEntity} disabled={entitiesLoading || isUploading}>
            <SelectTrigger id="bulk-upload-entity">
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
            <Label className="text-base font-semibold">Select Folder with ZIP Files</Label>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="folder-upload">Folder Selection</Label>
            <input
              id="folder-upload"
              ref={folderInputRef}
              type="file"
              {...({ webkitdirectory: '', directory: '' } as any)}
              multiple
              onChange={handleFolderSelect}
              disabled={isUploading}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer md:text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Select a folder containing ZIP files. Each ZIP filename must start with the entity ID (e.g., 12345-files.zip, 67890-documents.zip)
            </p>
          </div>

          {zipFiles.length > 0 && (
            <Alert className="bg-green-500/10 border-green-500/20">
              <CheckCircle className="h-4 w-4 text-green-600" weight="fill" />
              <AlertTitle className="text-green-600">ZIP Files Loaded</AlertTitle>
              <AlertDescription className="text-green-600 text-sm">
                <strong>{zipFiles.length}</strong> ZIP file(s) ready for upload
              </AlertDescription>
            </Alert>
          )}
        </div>

        {zipFiles.length > 0 && (
          <>
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-2">
                <Faders size={20} className="text-accent" weight="duotone" />
                <Label className="text-base font-semibold">Concurrency Settings</Label>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="concurrent-uploads" className="text-sm">
                    Simultaneous Uploads
                  </Label>
                  <Badge variant="outline" className="font-mono text-sm">
                    {concurrentUploads} {concurrentUploads === 1 ? 'file' : 'files'} at once
                  </Badge>
                </div>
                
                <Slider
                  id="concurrent-uploads"
                  min={1}
                  max={10}
                  step={1}
                  value={[concurrentUploads]}
                  onValueChange={(values) => setConcurrentUploads(values[0])}
                  disabled={isUploading}
                  className="cursor-pointer"
                />
                
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Slower (1)</span>
                  <span>Faster (10)</span>
                </div>
                
                <Alert className="bg-blue-500/5 border-blue-500/20">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-xs text-blue-600">
                    Higher concurrency = faster uploads but may trigger rate limits. Start with 3 and adjust as needed.
                  </AlertDescription>
                </Alert>
              </div>
            </div>

            <div className="space-y-3 p-4 border rounded-lg bg-blue-500/5 border-blue-500/20">
              <div className="flex items-center justify-between">
                <Label className="text-blue-600 font-semibold">Ready to Upload</Label>
                <Badge className="bg-blue-600">{zipFiles.length} ZIP files</Badge>
              </div>
              <ScrollArea className="h-[200px] border rounded-md bg-background p-3">
                <div className="space-y-2">
                  {zipFiles.map((zf, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <div className="flex items-center gap-2">
                        <FileZip size={16} className="text-accent" />
                        <span className="font-mono text-sm">{zf.fileName}</span>
                      </div>
                      <Badge variant="outline" className="font-mono text-xs">
                        Entity ID: {zf.entityId}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </>
        )}

        {isUploading && (
          <div className="space-y-3 p-4 border rounded-lg bg-accent/5">
            <div className="flex items-center justify-between">
              <Label>Upload Progress</Label>
              <Badge variant={isPaused ? 'secondary' : 'default'}>
                {isPaused ? 'Paused' : `${currentFileIndex} of ${zipFiles.length} ZIP files`}
              </Badge>
            </div>
            <Progress value={uploadProgress} className="h-3" />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Completion</p>
                <p className="font-semibold text-accent">{uploadProgress}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">ZIP Files Remaining</p>
                <p className="font-semibold text-accent">
                  {zipFiles.length - currentFileIndex}
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
                    Resume Upload
                  </>
                ) : (
                  <>
                    <Pause size={16} weight="fill" />
                    Pause Upload
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleCancelUpload}
              >
                <Trash size={16} />
                Cancel
              </Button>
            </div>
          </div>
        )}

        {uploadResults.length > 0 && (
          <div className="space-y-2">
            <Label>Upload Results</Label>
            <ScrollArea className="h-[300px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ZIP File</TableHead>
                    <TableHead>Entity ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uploadResults.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm max-w-[200px] truncate">
                        {result.fileName}
                      </TableCell>
                      <TableCell className="font-mono font-medium">
                        {result.entityId}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {result.status === 'success' ? (
                            <CheckCircle size={16} className="text-green-600" weight="fill" />
                          ) : result.status === 'error' ? (
                            <XCircle size={16} className="text-destructive" weight="fill" />
                          ) : result.status === 'uploading' ? (
                            <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 border-t-accent animate-spin" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                          )}
                          <span
                            className={
                              result.status === 'success'
                                ? 'text-green-600'
                                : result.status === 'error'
                                ? 'text-destructive'
                                : result.status === 'uploading'
                                ? 'text-accent'
                                : 'text-muted-foreground'
                            }
                          >
                            {result.status === 'success' 
                              ? 'Success' 
                              : result.status === 'error' 
                              ? 'Failed' 
                              : result.status === 'uploading'
                              ? 'Uploading'
                              : 'Pending'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {result.uploadedCount !== undefined && result.fileCount !== undefined ? (
                          <Badge variant="secondary" className="text-xs">
                            {result.uploadedCount}/{result.fileCount}
                          </Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[250px]">
                        {result.currentFile ? (
                          <span className="text-xs truncate block">{result.currentFile}</span>
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
            onClick={handleBulkUpload}
            disabled={zipFiles.length === 0 || !entity || isUploading}
            className="flex-1"
          >
            <Upload />
            {isUploading 
              ? `Uploading ${currentFileIndex} of ${zipFiles.length}...` 
              : `Upload All Files (${zipFiles.length} ${zipFiles.length === 1 ? 'ZIP' : 'ZIPs'})`
            }
          </Button>
          {zipFiles.length > 0 && !isUploading && (
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
            <p><strong>ZIP file naming:</strong></p>
            <code className="block bg-muted px-3 py-2 rounded text-xs mt-1 mb-3">
              [EntityID]-[AnyName].zip
            </code>
            <p className="text-xs">
              Examples: 
              <code className="bg-muted px-1 py-0.5 rounded ml-1">12345-files.zip</code>
              <code className="bg-muted px-1 py-0.5 rounded ml-1">67890-documents.zip</code>
            </p>
            
            <p className="mt-3"><strong>Files inside each ZIP:</strong></p>
            <p className="text-xs">
              Files will be uploaded with their original names from inside the ZIP to the entity matching the ID in the ZIP filename.
            </p>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
