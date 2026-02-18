import { useState, useRef, useEffect } from 'react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileArrowUp, FileArrowDown, Folder, File, Download, Trash, CheckCircle, XCircle, Info, FolderOpen } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { useEntityMetadata } from '@/hooks/use-entity-metadata'
import { useEntities } from '@/hooks/use-entities'

interface FileManagerProps {
  onLog: (operation: string, status: 'success' | 'error', message: string, details?: any) => void
}

interface EntityFile {
  id: number
  name: string
  contentType: string
  description?: string
  fileSize?: number
  dateAdded?: number
  type?: string
  fileOwner?: {
    id: number
    name: string
  }
}

interface FileFolder {
  id: number
  name: string
  description?: string
  type?: string
}

export function FileManager({ onLog }: FileManagerProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'download'>('upload')
  
  const [uploadEntity, setUploadEntity] = useState('')
  const [uploadEntityId, setUploadEntityId] = useState('')
  const [uploadFileType, setUploadFileType] = useState<string>('SAMPLE')
  const [uploadDescription, setUploadDescription] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [downloadEntity, setDownloadEntity] = useState('')
  const [downloadEntityId, setDownloadEntityId] = useState('')
  const [downloadFileType, setDownloadFileType] = useState<string>('SAMPLE')
  const [files, setFiles] = useState<EntityFile[]>([])
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [downloadingFileId, setDownloadingFileId] = useState<number | null>(null)
  
  const [fileTypeOptions, setFileTypeOptions] = useState<Array<{ value: string; label: string }>>([])
  const [loadingFileTypes, setLoadingFileTypes] = useState(false)

  const fileAttachmentEntities = [
    'Candidate',
    'Placement',
    'Opportunity',
    'Certification',
    'JobOrder',
    'ClientContact'
  ]

  const { entities, loading: entitiesLoading } = useEntities()
  const { metadata: uploadMetadata, loading: uploadMetadataLoading } = useEntityMetadata(uploadEntity || undefined)
  const { metadata: downloadMetadata, loading: downloadMetadataLoading } = useEntityMetadata(downloadEntity || undefined)

  const filteredEntities = entities.filter(entity => 
    fileAttachmentEntities.includes(entity)
  )

  const defaultFileTypes = [
    { value: 'SAMPLE', label: 'Sample File' },
    { value: 'RESUME', label: 'Resume' },
    { value: 'COVER_LETTER', label: 'Cover Letter' },
    { value: 'FILE', label: 'General File' },
    { value: 'ATTACHMENT', label: 'Attachment' },
    { value: 'DOCUMENT', label: 'Document' },
    { value: 'IMAGE', label: 'Image' }
  ]

  useEffect(() => {
    const loadFileTypes = async () => {
      try {
        setLoadingFileTypes(true)
        
        const options = await bullhornAPI.getFieldOptions('EntityFileAttachment', 'type')
        
        if (options && options.length > 0) {
          const typeOptions = options.map(opt => ({
            value: opt.value || opt.label || opt,
            label: opt.label || opt.value || opt
          }))
          
          setFileTypeOptions(typeOptions)
          console.log('✅ Loaded file type options from API:', typeOptions)
          onLog('Load File Types', 'success', `Loaded ${typeOptions.length} file types from API`, {
            fileTypes: typeOptions
          })
        } else {
          console.log('⚠️ No file type options returned, using defaults')
          setFileTypeOptions(defaultFileTypes)
        }
      } catch (error) {
        console.error('❌ Failed to load file type options:', error)
        console.log('Using default file types')
        setFileTypeOptions(defaultFileTypes)
        onLog('Load File Types', 'error', 'Failed to load file types from API, using defaults', {
          error: error instanceof Error ? error.message : String(error)
        })
      } finally {
        setLoadingFileTypes(false)
      }
    }

    loadFileTypes()
  }, [onLog])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size must be less than 50MB')
      return
    }

    setSelectedFile(file)
    toast.success(`Selected file: ${file.name}`)
  }

  const handleUpload = async () => {
    if (!selectedFile || !uploadEntity || !uploadEntityId) {
      toast.error('Please select a file, entity, and entity ID')
      return
    }

    try {
      setIsUploading(true)
      setUploadProgress(0)

      const formData = new FormData()
      formData.append('file', selectedFile)

      const interval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 100)

      const response = await bullhornAPI.uploadFile(
        uploadEntity,
        parseInt(uploadEntityId),
        selectedFile,
        uploadFileType,
        uploadDescription || selectedFile.name
      )

      clearInterval(interval)
      setUploadProgress(100)

      toast.success(`File uploaded successfully: ${selectedFile.name}`)
      onLog('File Upload', 'success', `Uploaded file to ${uploadEntity} ID ${uploadEntityId}`, {
        entity: uploadEntity,
        entityId: uploadEntityId,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: uploadFileType,
        response
      })

      setSelectedFile(null)
      setUploadDescription('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      setTimeout(() => setUploadProgress(0), 2000)
    } catch (error) {
      console.error('File upload error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload file'
      toast.error(`Upload failed: ${errorMessage}`)
      onLog('File Upload', 'error', errorMessage, {
        entity: uploadEntity,
        entityId: uploadEntityId,
        fileName: selectedFile.name,
        error: errorMessage
      })
    } finally {
      setIsUploading(false)
    }
  }

  const loadFiles = async () => {
    if (!downloadEntity || !downloadEntityId) {
      toast.error('Please select an entity and entity ID')
      return
    }

    try {
      setLoadingFiles(true)
      setFiles([])

      const entityIdNum = parseInt(downloadEntityId)
      const response = await bullhornAPI.getEntityFiles(downloadEntity, entityIdNum, downloadFileType)

      if (response && response.data && Array.isArray(response.data)) {
        setFiles(response.data)
        toast.success(`Loaded ${response.data.length} file(s)`)
        onLog('Load Files', 'success', `Loaded files from ${downloadEntity} ID ${downloadEntityId}`, {
          entity: downloadEntity,
          entityId: downloadEntityId,
          fileType: downloadFileType,
          fileCount: response.data.length
        })
      } else {
        setFiles([])
        toast.info('No files found')
      }
    } catch (error) {
      console.error('Load files error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to load files'
      toast.error(`Failed to load files: ${errorMessage}`)
      onLog('Load Files', 'error', errorMessage, {
        entity: downloadEntity,
        entityId: downloadEntityId,
        error: errorMessage
      })
      setFiles([])
    } finally {
      setLoadingFiles(false)
    }
  }

  const handleDownload = async (fileId: number, fileName: string) => {
    if (!downloadEntity || !downloadEntityId) {
      toast.error('Entity information missing')
      return
    }

    try {
      setDownloadingFileId(fileId)
      
      const blob = await bullhornAPI.downloadFile(downloadEntity, parseInt(downloadEntityId), fileId)
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast.success(`Downloaded: ${fileName}`)
      onLog('File Download', 'success', `Downloaded file from ${downloadEntity} ID ${downloadEntityId}`, {
        entity: downloadEntity,
        entityId: downloadEntityId,
        fileId,
        fileName
      })
    } catch (error) {
      console.error('File download error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to download file'
      toast.error(`Download failed: ${errorMessage}`)
      onLog('File Download', 'error', errorMessage, {
        entity: downloadEntity,
        entityId: downloadEntityId,
        fileId,
        fileName,
        error: errorMessage
      })
    } finally {
      setDownloadingFileId(null)
    }
  }

  const handleDeleteFile = async (fileId: number, fileName: string) => {
    if (!downloadEntity || !downloadEntityId) {
      toast.error('Entity information missing')
      return
    }

    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) {
      return
    }

    try {
      await bullhornAPI.deleteFile(downloadEntity, parseInt(downloadEntityId), fileId)

      setFiles(files.filter(f => f.id !== fileId))
      toast.success(`Deleted: ${fileName}`)
      onLog('File Delete', 'success', `Deleted file from ${downloadEntity} ID ${downloadEntityId}`, {
        entity: downloadEntity,
        entityId: downloadEntityId,
        fileId,
        fileName
      })
    } catch (error) {
      console.error('File delete error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete file'
      toast.error(`Delete failed: ${errorMessage}`)
      onLog('File Delete', 'error', errorMessage, {
        entity: downloadEntity,
        entityId: downloadEntityId,
        fileId,
        fileName,
        error: errorMessage
      })
    }
  }

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen size={24} className="text-accent" weight="duotone" />
          File Manager
        </CardTitle>
        <CardDescription>
          Upload files to Bullhorn entities and download existing files
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'upload' | 'download')} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload" className="gap-2">
              <FileArrowUp size={18} />
              Upload Files
            </TabsTrigger>
            <TabsTrigger value="download" className="gap-2">
              <FileArrowDown size={18} />
              Download Files
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Upload Files to Bullhorn</AlertTitle>
              <AlertDescription>
                Upload files to entities with FileAttachment support: Candidate, Placement, Opportunity, Certification, JobOrder, and ClientContact.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="upload-entity">Entity Type</Label>
                <Select value={uploadEntity} onValueChange={setUploadEntity} disabled={entitiesLoading}>
                  <SelectTrigger id="upload-entity">
                    <SelectValue placeholder="Select entity type" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredEntities.map((entity) => (
                      <SelectItem key={entity} value={entity}>
                        {entity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Only entities with FileAttachment tables are shown
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="upload-entity-id">Entity ID</Label>
                <Input
                  id="upload-entity-id"
                  type="number"
                  placeholder="Enter entity ID (e.g., 12345)"
                  value={uploadEntityId}
                  onChange={(e) => setUploadEntityId(e.target.value)}
                  disabled={!uploadEntity}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="upload-file-type">File Type / Folder</Label>
                <Select value={uploadFileType} onValueChange={setUploadFileType} disabled={loadingFileTypes}>
                  <SelectTrigger id="upload-file-type">
                    <SelectValue placeholder={loadingFileTypes ? "Loading file types..." : "Select file type"} />
                  </SelectTrigger>
                  <SelectContent>
                    {fileTypeOptions.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  File types loaded from your tenant's configuration
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="upload-description">Description (Optional)</Label>
                <Input
                  id="upload-description"
                  placeholder="File description"
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file-upload">Select File</Label>
              <Input
                id="file-upload"
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                disabled={!uploadEntity || !uploadEntityId || isUploading}
                className="cursor-pointer"
              />
              {selectedFile && (
                <div className="flex items-center gap-2 p-2 bg-accent/10 rounded-md border border-accent/20">
                  <File size={20} className="text-accent" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                  </div>
                  <Badge variant="secondary">{selectedFile.type || 'Unknown type'}</Badge>
                </div>
              )}
            </div>

            {isUploading && (
              <div className="space-y-2">
                <Label>Upload Progress</Label>
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-sm text-muted-foreground text-center">{uploadProgress}%</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || !uploadEntity || !uploadEntityId || isUploading}
                className="flex-1"
              >
                <FileArrowUp />
                {isUploading ? 'Uploading...' : 'Upload File'}
              </Button>
              {selectedFile && !isUploading && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedFile(null)
                    if (fileInputRef.current) {
                      fileInputRef.current.value = ''
                    }
                  }}
                >
                  Clear
                </Button>
              )}
            </div>

            <Alert className="bg-blue-500/10 border-blue-500/20">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-600">Supported Entities</AlertTitle>
              <AlertDescription className="text-blue-600 text-sm">
                <p className="mb-2">Files can be uploaded to the following entities with FileAttachment support:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Candidate</strong>: Resumes, certifications, work samples</li>
                  <li><strong>Placement</strong>: Placement-related documents</li>
                  <li><strong>Opportunity</strong>: Opportunity documentation</li>
                  <li><strong>Certification</strong>: Certification documents</li>
                  <li><strong>JobOrder</strong>: Job order files</li>
                  <li><strong>ClientContact</strong>: Contact-related files</li>
                </ul>
                <p className="mt-2 text-xs">File types are loaded from your tenant's EntityFileAttachment metadata.</p>
              </AlertDescription>
            </Alert>
          </TabsContent>

          <TabsContent value="download" className="space-y-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Download Files from Bullhorn</AlertTitle>
              <AlertDescription>
                Select an entity type, provide the entity's ID, and choose which folder to view files from.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="download-entity">Entity Type</Label>
                <Select value={downloadEntity} onValueChange={setDownloadEntity} disabled={entitiesLoading}>
                  <SelectTrigger id="download-entity">
                    <SelectValue placeholder="Select entity type" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredEntities.map((entity) => (
                      <SelectItem key={entity} value={entity}>
                        {entity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Only entities with FileAttachment tables
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="download-entity-id">Entity ID</Label>
                <Input
                  id="download-entity-id"
                  type="number"
                  placeholder="Enter entity ID (e.g., 12345)"
                  value={downloadEntityId}
                  onChange={(e) => setDownloadEntityId(e.target.value)}
                  disabled={!downloadEntity}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="download-file-type">Folder / File Type</Label>
                <Select value={downloadFileType} onValueChange={setDownloadFileType} disabled={loadingFileTypes}>
                  <SelectTrigger id="download-file-type">
                    <SelectValue placeholder={loadingFileTypes ? "Loading..." : "Select folder"} />
                  </SelectTrigger>
                  <SelectContent>
                    {fileTypeOptions.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <Folder size={16} />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  File types from tenant configuration
                </p>
              </div>
            </div>

            <Button
              onClick={loadFiles}
              disabled={!downloadEntity || !downloadEntityId || loadingFiles}
              className="w-full"
              variant="outline"
            >
              <Folder />
              {loadingFiles ? 'Loading Files...' : 'Load Files from Folder'}
            </Button>

            {files.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Files in {fileTypeOptions.find(t => t.value === downloadFileType)?.label} Folder</Label>
                  <Badge variant="secondary">{files.length} file(s)</Badge>
                </div>
                <ScrollArea className="h-[400px] border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>File Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Date Added</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {files.map((file) => (
                        <TableRow key={file.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <File size={16} className="text-accent" />
                              {file.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {file.contentType || 'Unknown'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatFileSize(file.fileSize)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {file.dateAdded ? new Date(file.dateAdded).toLocaleDateString() : 'Unknown'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownload(file.id, file.name)}
                                disabled={downloadingFileId === file.id}
                              >
                                <Download size={14} />
                                {downloadingFileId === file.id ? 'Downloading...' : 'Download'}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteFile(file.id, file.name)}
                              >
                                <Trash size={14} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}

            {!loadingFiles && files.length === 0 && downloadEntity && downloadEntityId && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>No Files Found</AlertTitle>
                <AlertDescription>
                  No files found in the {fileTypeOptions.find(t => t.value === downloadFileType)?.label} folder for this entity.
                  Try loading files or upload a new file.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
