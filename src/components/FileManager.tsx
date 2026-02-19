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
import { Checkbox } from '@/components/ui/checkbox'
import { FileArrowUp, FileArrowDown, Folder, File, Download, Trash, CheckCircle, XCircle, Info, FolderOpen, FileCsv, FileZip } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { useEntityMetadata } from '@/hooks/use-entity-metadata'
import { useEntities } from '@/hooks/use-entities'
import { CSVFileUploader } from '@/components/CSVFileUploader'
import { BulkFileDownloader } from '@/components/BulkFileDownloader'
import JSZip from 'jszip'

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
  const [activeTab, setActiveTab] = useState<'upload' | 'download' | 'csv-bulk' | 'bulk-download'>('upload')
  
  const [uploadEntity, setUploadEntity] = useState('')
  const [uploadEntityId, setUploadEntityId] = useState('')
  const [uploadType, setUploadType] = useState<string>('cover')
  const [uploadDescription, setUploadDescription] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResults, setUploadResults] = useState<Array<{ file: string; status: 'success' | 'error'; message?: string; fileId?: number; retryCount?: number }>>([])
  const [currentUploadIndex, setCurrentUploadIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [uploadSpeed, setUploadSpeed] = useState<number>(0)
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pauseRef = useRef(false)

  const [downloadEntity, setDownloadEntity] = useState('')
  const [downloadEntityId, setDownloadEntityId] = useState('')
  const [downloadType, setDownloadType] = useState<string>('')
  const [files, setFiles] = useState<EntityFile[]>([])
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [downloadingFileId, setDownloadingFileId] = useState<number | null>(null)
  const [selectedFileIds, setSelectedFileIds] = useState<Set<number>>(new Set())
  const [isBatchDownloading, setIsBatchDownloading] = useState(false)
  const [batchDownloadProgress, setBatchDownloadProgress] = useState(0)
  
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
    const files = e.target.files
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)
    const validFiles: File[] = []
    let totalSize = 0
    
    for (const file of fileArray) {
      const fileSizeMB = file.size / (1024 * 1024)
      
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`File "${file.name}" (${fileSizeMB.toFixed(1)} MB) exceeds the 50 MB limit and will be skipped`)
        continue
      }
      
      validFiles.push(file)
      totalSize += file.size
    }

    if (validFiles.length === 0) {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    const totalSizeMB = totalSize / (1024 * 1024)
    
    if (totalSizeMB > 100) {
      toast.warning(`Total file size (${totalSizeMB.toFixed(1)} MB) is large. Upload may take several minutes.`, {
        duration: 5000
      })
    }

    setSelectedFiles(validFiles)
    setUploadResults([])
    
    if (validFiles.length === 1) {
      toast.success(`Selected file: ${validFiles[0].name} (${formatFileSize(validFiles[0].size)})`)
    } else {
      toast.success(`Selected ${validFiles.length} files (${formatFileSize(totalSize)} total)`)
    }
  }

  const handlePauseResume = () => {
    if (isPaused) {
      setIsPaused(false)
      pauseRef.current = false
      toast.info('Resuming upload...')
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
    setStartTime(null)
    toast.info('Upload cancelled')
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

  const uploadFileWithRetry = async (
    file: File, 
    retryCount: number = 0
  ): Promise<{ success: boolean; fileId?: number; message: string; retries: number }> => {
    try {
      const response = await bullhornAPI.uploadFile(
        uploadEntity,
        parseInt(uploadEntityId),
        file,
        uploadType,
        uploadDescription || file.name
      )
      
      return {
        success: true,
        fileId: response?.fileId || response?.id,
        message: 'Upload successful',
        retries: retryCount
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
      const isFetchError = errorMessage.includes('failed to fetch') || 
                          errorMessage.includes('network') || 
                          errorMessage.includes('networkerror')
      
      if (isFetchError && retryCount === 0) {
        console.log(`🔄 Retrying upload for ${file.name} (attempt ${retryCount + 2}/2) due to fetch error`)
        toast.info(`Retrying upload for ${file.name}...`, { duration: 2000 })
        await new Promise(resolve => setTimeout(resolve, 1000))
        return uploadFileWithRetry(file, retryCount + 1)
      }
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Upload failed',
        retries: retryCount
      }
    }
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !uploadEntity || !uploadEntityId) {
      toast.error('Please select file(s), entity, and entity ID')
      return
    }

    try {
      setIsUploading(true)
      setIsPaused(false)
      pauseRef.current = false
      setUploadProgress(0)
      setUploadResults([])
      setCurrentUploadIndex(0)
      setStartTime(Date.now())
      setUploadSpeed(0)
      setEstimatedTimeRemaining(null)

      const results: Array<{ file: string; status: 'success' | 'error'; message?: string; fileId?: number; retryCount?: number }> = []
      const totalFiles = selectedFiles.length
      const totalBytes = selectedFiles.reduce((sum, f) => sum + f.size, 0)
      let uploadedBytes = 0

      for (let i = 0; i < selectedFiles.length; i++) {
        while (pauseRef.current) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }

        if (!isUploading) {
          break
        }

        const file = selectedFiles[i]
        setCurrentUploadIndex(i + 1)
        
        const fileStartTime = Date.now()
        
        const uploadResult = await uploadFileWithRetry(file)
        
        const fileEndTime = Date.now()
        const fileDuration = (fileEndTime - fileStartTime) / 1000
        uploadedBytes += file.size

        const elapsedTime = (Date.now() - (startTime || Date.now())) / 1000
        const currentSpeed = uploadedBytes / elapsedTime
        setUploadSpeed(currentSpeed)

        const remainingBytes = totalBytes - uploadedBytes
        const estimatedSeconds = remainingBytes / currentSpeed
        setEstimatedTimeRemaining(estimatedSeconds)

        if (uploadResult.success) {
          results.push({
            file: file.name,
            status: 'success',
            message: `Uploaded in ${fileDuration.toFixed(1)}s${uploadResult.retries > 0 ? ` (retried ${uploadResult.retries}x)` : ''}`,
            fileId: uploadResult.fileId,
            retryCount: uploadResult.retries
          })

          onLog('File Upload', 'success', `Uploaded file to ${uploadEntity} ID ${uploadEntityId}`, {
            entity: uploadEntity,
            entityId: uploadEntityId,
            fileName: file.name,
            fileSize: file.size,
            type: uploadType,
            fileId: uploadResult.fileId || 'unknown',
            duration: fileDuration,
            retryCount: uploadResult.retries
          })
        } else {
          results.push({
            file: file.name,
            status: 'error',
            message: uploadResult.message,
            retryCount: uploadResult.retries
          })

          onLog('File Upload', 'error', uploadResult.message, {
            entity: uploadEntity,
            entityId: uploadEntityId,
            fileName: file.name,
            error: uploadResult.message,
            retryCount: uploadResult.retries
          })
        }

        setUploadProgress(Math.round(((i + 1) / totalFiles) * 100))
        setUploadResults([...results])
      }

      const successCount = results.filter(r => r.status === 'success').length
      const errorCount = results.filter(r => r.status === 'error').length
      const retriedCount = results.filter(r => r.retryCount && r.retryCount > 0).length

      if (errorCount === 0) {
        toast.success(`All ${successCount} file(s) uploaded successfully!${retriedCount > 0 ? ` (${retriedCount} retried)` : ''}`)
      } else if (successCount === 0) {
        toast.error(`All ${errorCount} file(s) failed to upload`)
      } else {
        toast.warning(`${successCount} file(s) uploaded, ${errorCount} failed${retriedCount > 0 ? ` (${retriedCount} retried)` : ''}`)
      }

      setSelectedFiles([])
      setUploadDescription('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      setTimeout(() => {
        setUploadProgress(0)
        setCurrentUploadIndex(0)
        setStartTime(null)
        setUploadSpeed(0)
        setEstimatedTimeRemaining(null)
      }, 3000)
    } catch (error) {
      console.error('Bulk upload error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload files'
      toast.error(`Upload failed: ${errorMessage}`)
    } finally {
      setIsUploading(false)
      setIsPaused(false)
      pauseRef.current = false
    }
  }

  const handleRetryErrors = async () => {
    const failedUploads = uploadResults.filter(r => r.status === 'error')
    
    if (failedUploads.length === 0) {
      toast.info('No failed uploads to retry')
      return
    }

    const filesToRetry = selectedFiles.filter(f => 
      failedUploads.some(failed => failed.file === f.name)
    )

    if (filesToRetry.length === 0) {
      toast.error('Failed files are no longer available. Please re-select them.')
      return
    }

    toast.info(`Retrying ${filesToRetry.length} failed upload(s)...`)
    
    const currentResults = [...uploadResults]
    
    for (const file of filesToRetry) {
      const uploadResult = await uploadFileWithRetry(file)
      
      const resultIndex = currentResults.findIndex(r => r.file === file.name)
      if (resultIndex !== -1) {
        if (uploadResult.success) {
          currentResults[resultIndex] = {
            file: file.name,
            status: 'success',
            message: `Retried successfully${uploadResult.retries > 0 ? ` (${uploadResult.retries + 1} total attempts)` : ''}`,
            fileId: uploadResult.fileId,
            retryCount: (currentResults[resultIndex].retryCount || 0) + uploadResult.retries + 1
          }

          onLog('File Upload Retry', 'success', `Retried upload for ${file.name}`, {
            entity: uploadEntity,
            entityId: uploadEntityId,
            fileName: file.name,
            fileId: uploadResult.fileId,
            totalRetries: (currentResults[resultIndex].retryCount || 0) + 1
          })
        } else {
          currentResults[resultIndex] = {
            ...currentResults[resultIndex],
            message: `Retry failed: ${uploadResult.message}`,
            retryCount: (currentResults[resultIndex].retryCount || 0) + 1
          }
        }
      }
      
      setUploadResults([...currentResults])
    }

    const newSuccessCount = currentResults.filter(r => r.status === 'success').length
    const newErrorCount = currentResults.filter(r => r.status === 'error').length
    
    if (newErrorCount === 0) {
      toast.success(`All retries successful! ${newSuccessCount} total files uploaded.`)
    } else {
      toast.warning(`Retry complete: ${newSuccessCount} successful, ${newErrorCount} still failed`)
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
      const typeFilter = downloadType === 'ALL_TYPES' ? '' : downloadType
      const response = await bullhornAPI.getEntityFiles(downloadEntity, entityIdNum, typeFilter)

      console.log('📦 Get entity files response:', response)

      let filesArray: EntityFile[] = []
      
      if (response && response.EntityFiles && Array.isArray(response.EntityFiles)) {
        filesArray = response.EntityFiles
      } else if (response && response.data && Array.isArray(response.data)) {
        filesArray = response.data
      } else if (Array.isArray(response)) {
        filesArray = response
      }

      if (filesArray.length > 0) {
        console.log('✅ Found files:', filesArray)
        setFiles(filesArray)
        toast.success(`Loaded ${filesArray.length} file(s)`)
        onLog('Load Files', 'success', `Loaded files from ${downloadEntity} ID ${downloadEntityId}`, {
          entity: downloadEntity,
          entityId: downloadEntityId,
          type: downloadType,
          fileCount: filesArray.length
        })
      } else {
        console.log('ℹ️ No files found in response')
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
      
      console.log('📥 Starting download:', { fileId, fileName })
      const blob = await bullhornAPI.downloadFile(downloadEntity, parseInt(downloadEntityId), fileId)
      
      console.log('📦 Blob received:', {
        size: blob.size,
        type: blob.type,
        fileName
      })
      
      let entityName = 'Unknown'
      try {
        const entityData = await bullhornAPI.query(
          downloadEntity,
          ['id', 'name', 'title', 'firstName', 'lastName'],
          `id=${downloadEntityId}`
        )
        
        if (entityData?.data?.[0]) {
          const entity = entityData.data[0]
          if (entity.name) {
            entityName = entity.name
          } else if (entity.title) {
            entityName = entity.title
          } else if (entity.firstName && entity.lastName) {
            entityName = `${entity.firstName}_${entity.lastName}`
          } else if (entity.firstName) {
            entityName = entity.firstName
          } else if (entity.lastName) {
            entityName = entity.lastName
          }
          entityName = entityName.replace(/[^a-zA-Z0-9_-]/g, '_')
        }
      } catch (nameError) {
        console.warn('Could not fetch entity name:', nameError)
      }
      
      const newFileName = `${downloadEntityId}-${entityName}-${fileName}`
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = newFileName
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      
      setTimeout(() => {
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }, 100)

      toast.success(`Downloaded: ${newFileName}`)
      onLog('File Download', 'success', `Downloaded file from ${downloadEntity} ID ${downloadEntityId}`, {
        entity: downloadEntity,
        entityId: downloadEntityId,
        fileId,
        fileName,
        downloadedAs: newFileName,
        fileSize: blob.size,
        contentType: blob.type
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

  const handleBatchDownloadAsZip = async () => {
    if (selectedFileIds.size === 0) {
      toast.error('Please select files to download')
      return
    }

    if (!downloadEntity || !downloadEntityId) {
      toast.error('Entity information missing')
      return
    }

    const selectedFiles = files.filter(f => selectedFileIds.has(f.id))
    const pdfFiles = selectedFiles.filter(f => 
      f.name.toLowerCase().endsWith('.pdf') || 
      f.contentType?.toLowerCase().includes('pdf')
    )

    if (pdfFiles.length === 0) {
      toast.error('No PDF files selected. Please select at least one PDF file.')
      return
    }

    try {
      setIsBatchDownloading(true)
      setBatchDownloadProgress(0)

      let entityName = 'Unknown'
      try {
        const entityData = await bullhornAPI.query(
          downloadEntity,
          ['id', 'name', 'title', 'firstName', 'lastName'],
          `id=${downloadEntityId}`
        )
        
        if (entityData?.data?.[0]) {
          const entity = entityData.data[0]
          if (entity.name) {
            entityName = entity.name
          } else if (entity.title) {
            entityName = entity.title
          } else if (entity.firstName && entity.lastName) {
            entityName = `${entity.firstName}_${entity.lastName}`
          } else if (entity.firstName) {
            entityName = entity.firstName
          } else if (entity.lastName) {
            entityName = entity.lastName
          }
          entityName = entityName.replace(/[^a-zA-Z0-9_-]/g, '_')
        }
      } catch (nameError) {
        console.warn('Could not fetch entity name:', nameError)
      }

      const zip = new JSZip()
      let successCount = 0
      let failCount = 0
      const errors: string[] = []

      toast.info(`Downloading and zipping ${pdfFiles.length} PDF file(s)...`, {
        duration: 5000
      })

      for (let i = 0; i < pdfFiles.length; i++) {
        const file = pdfFiles[i]
        
        try {
          console.log(`📥 Downloading file ${i + 1}/${pdfFiles.length}:`, file.name)
          const blob = await bullhornAPI.downloadFile(downloadEntity, parseInt(downloadEntityId), file.id)
          
          const newFileName = `${downloadEntityId}-${entityName}-${file.name}`
          zip.file(newFileName, blob)
          successCount++
          
          const progress = Math.round(((i + 1) / pdfFiles.length) * 100)
          setBatchDownloadProgress(progress)
        } catch (error) {
          console.error(`❌ Failed to download ${file.name}:`, error)
          failCount++
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          errors.push(`${file.name}: ${errorMessage}`)
        }
      }

      if (successCount === 0) {
        toast.error('Failed to download any files')
        onLog('Batch Download ZIP', 'error', 'All file downloads failed', {
          entity: downloadEntity,
          entityId: downloadEntityId,
          totalFiles: pdfFiles.length,
          errors
        })
        return
      }

      console.log('📦 Generating ZIP file...')
      toast.info('Generating ZIP file...', { id: 'zip-generation' })
      
      const zipBlob = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: {
          level: 6
        }
      })

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]
      const zipFileName = `${downloadEntity}_${downloadEntityId}_PDFs_${timestamp}.zip`

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

      if (failCount === 0) {
        toast.success(`Successfully downloaded ${successCount} PDF(s) as ZIP`, { id: 'zip-generation' })
      } else {
        toast.warning(`Downloaded ${successCount} PDF(s), ${failCount} failed. Check logs for details.`, { 
          id: 'zip-generation',
          duration: 5000
        })
      }

      onLog('Batch Download ZIP', successCount > 0 ? 'success' : 'error', 
        `Downloaded ${successCount} PDF files as ZIP`, {
        entity: downloadEntity,
        entityId: downloadEntityId,
        zipFileName,
        zipSize: zipBlob.size,
        successCount,
        failCount,
        errors: errors.length > 0 ? errors : undefined
      })

      setSelectedFileIds(new Set())
    } catch (error) {
      console.error('Batch ZIP download error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create ZIP'
      toast.error(`ZIP creation failed: ${errorMessage}`)
      onLog('Batch Download ZIP', 'error', errorMessage, {
        entity: downloadEntity,
        entityId: downloadEntityId,
        error: errorMessage
      })
    } finally {
      setIsBatchDownloading(false)
      setBatchDownloadProgress(0)
    }
  }

  const handleDownloadAllAsZip = async () => {
    if (files.length === 0) {
      toast.error('No files to download')
      return
    }

    if (!downloadEntity || !downloadEntityId) {
      toast.error('Entity information missing')
      return
    }

    try {
      setIsBatchDownloading(true)
      setBatchDownloadProgress(0)

      let entityName = 'Unknown'
      try {
        const entityData = await bullhornAPI.query(
          downloadEntity,
          ['id', 'name', 'title', 'firstName', 'lastName'],
          `id=${downloadEntityId}`
        )
        
        if (entityData?.data?.[0]) {
          const entity = entityData.data[0]
          if (entity.name) {
            entityName = entity.name
          } else if (entity.title) {
            entityName = entity.title
          } else if (entity.firstName && entity.lastName) {
            entityName = `${entity.firstName}_${entity.lastName}`
          } else if (entity.firstName) {
            entityName = entity.firstName
          } else if (entity.lastName) {
            entityName = entity.lastName
          }
          entityName = entityName.replace(/[^a-zA-Z0-9_-]/g, '_')
        }
      } catch (nameError) {
        console.warn('Could not fetch entity name:', nameError)
      }

      const zip = new JSZip()
      let successCount = 0
      let failCount = 0
      const errors: string[] = []

      toast.info(`Downloading and zipping ${files.length} file(s)...`, {
        duration: 5000
      })

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        
        try {
          console.log(`📥 Downloading file ${i + 1}/${files.length}:`, file.name)
          const blob = await bullhornAPI.downloadFile(downloadEntity, parseInt(downloadEntityId), file.id)
          
          const newFileName = `${downloadEntityId}-${entityName}-${file.name}`
          zip.file(newFileName, blob)
          successCount++
          
          const progress = Math.round(((i + 1) / files.length) * 100)
          setBatchDownloadProgress(progress)
        } catch (error) {
          console.error(`❌ Failed to download ${file.name}:`, error)
          failCount++
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          errors.push(`${file.name}: ${errorMessage}`)
        }
      }

      if (successCount === 0) {
        toast.error('Failed to download any files')
        onLog('Download All as ZIP', 'error', 'All file downloads failed', {
          entity: downloadEntity,
          entityId: downloadEntityId,
          totalFiles: files.length,
          errors
        })
        return
      }

      console.log('📦 Generating ZIP file...')
      toast.info('Generating ZIP file...', { id: 'zip-generation' })
      
      const zipBlob = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: {
          level: 6
        }
      })

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]
      const zipFileName = `${downloadEntity}_${downloadEntityId}_files_${timestamp}.zip`

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

      if (failCount === 0) {
        toast.success(`Successfully downloaded ${successCount} file(s) as ZIP`, { id: 'zip-generation' })
      } else {
        toast.warning(`Downloaded ${successCount} file(s), ${failCount} failed. Check logs for details.`, { 
          id: 'zip-generation',
          duration: 5000
        })
      }

      onLog('Download All as ZIP', successCount > 0 ? 'success' : 'error', 
        `Downloaded ${successCount} files as ZIP`, {
        entity: downloadEntity,
        entityId: downloadEntityId,
        zipFileName,
        zipSize: zipBlob.size,
        successCount,
        failCount,
        errors: errors.length > 0 ? errors : undefined
      })
    } catch (error) {
      console.error('Download all ZIP error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create ZIP'
      toast.error(`ZIP creation failed: ${errorMessage}`)
      onLog('Download All as ZIP', 'error', errorMessage, {
        entity: downloadEntity,
        entityId: downloadEntityId,
        error: errorMessage
      })
    } finally {
      setIsBatchDownloading(false)
      setBatchDownloadProgress(0)
    }
  }

  const toggleFileSelection = (fileId: number) => {
    setSelectedFileIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(fileId)) {
        newSet.delete(fileId)
      } else {
        newSet.add(fileId)
      }
      return newSet
    })
  }

  const toggleSelectAll = () => {
    const pdfFiles = files.filter(f => 
      f.name.toLowerCase().endsWith('.pdf') || 
      f.contentType?.toLowerCase().includes('pdf')
    )

    if (selectedFileIds.size === pdfFiles.length && pdfFiles.length > 0) {
      setSelectedFileIds(new Set())
    } else {
      setSelectedFileIds(new Set(pdfFiles.map(f => f.id)))
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
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'upload' | 'download' | 'csv-bulk' | 'bulk-download')} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload" className="gap-2">
              <FileArrowUp size={18} />
              Upload Files
            </TabsTrigger>
            <TabsTrigger value="csv-bulk" className="gap-2">
              <FileCsv size={18} />
              CSV Bulk Upload
            </TabsTrigger>
            <TabsTrigger value="download" className="gap-2">
              <FileArrowDown size={18} />
              Download Files
            </TabsTrigger>
            <TabsTrigger value="bulk-download" className="gap-2">
              <FileZip size={18} />
              Bulk Download
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
                <Label htmlFor="upload-type">Document Type</Label>
                <Select value={uploadType} onValueChange={setUploadType} disabled={loadingFileTypes}>
                  <SelectTrigger id="upload-type">
                    <SelectValue placeholder={loadingFileTypes ? "Loading file types..." : "Select document type"} />
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
                  Document type category (fileType: SAMPLE is always sent)
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
              <Label htmlFor="file-upload">Select Files</Label>
              <Input
                id="file-upload"
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                disabled={!uploadEntity || !uploadEntityId || isUploading}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">
                Maximum file size per file: 50 MB | You can select multiple files at once
              </p>
              {selectedFiles.length > 0 && (
                <>
                  <div className="space-y-2 mt-4">
                    <div className="flex items-center justify-between">
                      <Label>Selected Files ({selectedFiles.length})</Label>
                      <Badge variant="secondary">
                        Total: {formatFileSize(selectedFiles.reduce((sum, f) => sum + f.size, 0))}
                      </Badge>
                    </div>
                    <ScrollArea className="h-[200px] border rounded-md p-3">
                      <div className="space-y-2">
                        {selectedFiles.map((file, index) => {
                          const fileSizeMB = file.size / (1024 * 1024)
                          return (
                            <div
                              key={index}
                              className={`flex items-center gap-2 p-2 rounded-md border ${
                                fileSizeMB > 25
                                  ? 'bg-orange-500/10 border-orange-500/30'
                                  : fileSizeMB > 10
                                  ? 'bg-blue-500/10 border-blue-500/30'
                                  : 'bg-accent/10 border-accent/20'
                              }`}
                            >
                              <File
                                size={18}
                                className={
                                  fileSizeMB > 25
                                    ? 'text-orange-500'
                                    : fileSizeMB > 10
                                    ? 'text-blue-500'
                                    : 'text-accent'
                                }
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{file.name}</p>
                                <p
                                  className={`text-xs ${
                                    fileSizeMB > 25
                                      ? 'text-orange-600 font-medium'
                                      : fileSizeMB > 10
                                      ? 'text-blue-600'
                                      : 'text-muted-foreground'
                                  }`}
                                >
                                  {formatFileSize(file.size)}
                                </p>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {file.type || 'Unknown'}
                              </Badge>
                            </div>
                          )
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                  {selectedFiles.some((f) => f.size > 25 * 1024 * 1024) && (
                    <Alert className="bg-orange-500/10 border-orange-500/20 mt-2">
                      <Info className="h-4 w-4 text-orange-600" />
                      <AlertTitle className="text-orange-600">Large File(s) Detected</AlertTitle>
                      <AlertDescription className="text-orange-600 text-sm">
                        Some files are over 25 MB. Upload may take several minutes depending on your connection speed.
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </div>

            {isUploading && (
              <div className="space-y-3 p-4 border rounded-lg bg-accent/5">
                <div className="flex items-center justify-between">
                  <Label>Upload Progress</Label>
                  <Badge variant={isPaused ? 'secondary' : 'default'}>
                    {isPaused ? 'Paused' : `${currentUploadIndex} of ${selectedFiles.length} files`}
                  </Badge>
                </div>
                <Progress value={uploadProgress} className="h-3" />
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Completion</p>
                    <p className="font-semibold text-accent">{uploadProgress}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Upload Speed</p>
                    <p className="font-semibold text-accent">
                      {uploadSpeed > 0 ? `${formatFileSize(uploadSpeed)}/s` : 'Calculating...'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Files Remaining</p>
                    <p className="font-semibold text-accent">
                      {selectedFiles.length - currentUploadIndex}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Time Remaining</p>
                    <p className="font-semibold text-accent">
                      {estimatedTimeRemaining ? formatTimeRemaining(estimatedTimeRemaining) : 'Calculating...'}
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
                        <CheckCircle size={16} />
                        Resume Upload
                      </>
                    ) : (
                      <>
                        <XCircle size={16} />
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
                <div className="flex items-center justify-between">
                  <Label>Upload Results</Label>
                  {uploadResults.some(r => r.status === 'error') && !isUploading && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRetryErrors}
                      className="gap-2"
                    >
                      <CheckCircle size={16} />
                      Retry Failed Uploads
                    </Button>
                  )}
                </div>
                <ScrollArea className="h-[200px] border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>File Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Message</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {uploadResults.map((result, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <File size={16} />
                              {result.file}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {result.status === 'success' ? (
                                <CheckCircle size={16} className="text-green-600" weight="fill" />
                              ) : (
                                <XCircle size={16} className="text-destructive" weight="fill" />
                              )}
                              <span
                                className={
                                  result.status === 'success' ? 'text-green-600' : 'text-destructive'
                                }
                              >
                                {result.status === 'success' ? 'Success' : 'Failed'}
                              </span>
                              {result.retryCount && result.retryCount > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {result.retryCount} {result.retryCount === 1 ? 'retry' : 'retries'}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {result.message || '-'}
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
                onClick={handleUpload}
                disabled={selectedFiles.length === 0 || !uploadEntity || !uploadEntityId || isUploading}
                className="flex-1"
              >
                <FileArrowUp />
                {isUploading ? `Uploading ${currentUploadIndex} of ${selectedFiles.length}...` : `Upload ${selectedFiles.length > 0 ? selectedFiles.length + ' File(s)' : 'Files'}`}
              </Button>
              {selectedFiles.length > 0 && !isUploading && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedFiles([])
                    setUploadResults([])
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
                <p className="mt-3 text-xs">File types are loaded from your tenant's EntityFileAttachment metadata.</p>
              </AlertDescription>
            </Alert>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>File Size Guidelines</AlertTitle>
              <AlertDescription className="text-sm">
                <ul className="space-y-1 mt-2">
                  <li>• <strong>Small files (0-10 MB):</strong> Fast upload, recommended for most documents</li>
                  <li>• <strong>Medium files (10-25 MB):</strong> Acceptable, may take a few moments</li>
                  <li>• <strong>Large files (25-50 MB):</strong> Slower upload, please be patient</li>
                  <li className="text-destructive font-medium">• <strong>Files over 50 MB:</strong> Not allowed - please compress or split your file</li>
                </ul>
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
                <Label htmlFor="download-type">Document Type Filter (Optional)</Label>
                <Select value={downloadType} onValueChange={setDownloadType} disabled={loadingFileTypes}>
                  <SelectTrigger id="download-type">
                    <SelectValue placeholder={loadingFileTypes ? "Loading..." : "All types"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL_TYPES">All Types</SelectItem>
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
                  Filter by document type (fileType: SAMPLE is always used)
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
              {loadingFiles ? 'Loading Files...' : 'Load Files'}
            </Button>

            {files.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Files {downloadType && `(${fileTypeOptions.find(t => t.value === downloadType)?.label})`}</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{files.length} file(s)</Badge>
                    {files.filter(f => f.name.toLowerCase().endsWith('.pdf') || f.contentType?.toLowerCase().includes('pdf')).length > 0 && selectedFileIds.size > 0 && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={handleBatchDownloadAsZip}
                        disabled={isBatchDownloading}
                        className="gap-2"
                      >
                        <FileZip size={14} weight="fill" />
                        {isBatchDownloading ? `Zipping... ${batchDownloadProgress}%` : `Download ${selectedFileIds.size} PDF(s) as ZIP`}
                      </Button>
                    )}
                    {files.length > 1 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleDownloadAllAsZip}
                        disabled={isBatchDownloading}
                      >
                        <FileZip size={14} weight="fill" />
                        {isBatchDownloading ? 'Creating ZIP...' : `Download All (${files.length}) as ZIP`}
                      </Button>
                    )}
                  </div>
                </div>

                {isBatchDownloading && (
                  <div className="space-y-2 p-4 border rounded-lg bg-accent/5">
                    <div className="flex items-center justify-between">
                      <Label>ZIP Creation Progress</Label>
                      <Badge>{batchDownloadProgress}%</Badge>
                    </div>
                    <Progress value={batchDownloadProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      Downloading and compressing PDF files...
                    </p>
                  </div>
                )}

                <ScrollArea className="h-[400px] border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">
                          <Checkbox
                            checked={
                              files.filter(f => 
                                f.name.toLowerCase().endsWith('.pdf') || 
                                f.contentType?.toLowerCase().includes('pdf')
                              ).length > 0 && 
                              selectedFileIds.size === files.filter(f => 
                                f.name.toLowerCase().endsWith('.pdf') || 
                                f.contentType?.toLowerCase().includes('pdf')
                              ).length
                            }
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                        <TableHead>File Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Date Added</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {files.map((file) => {
                        const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.contentType?.toLowerCase().includes('pdf')
                        return (
                          <TableRow key={file.id}>
                            <TableCell>
                              {isPdf && (
                                <Checkbox
                                  checked={selectedFileIds.has(file.id)}
                                  onCheckedChange={() => toggleFileSelection(file.id)}
                                />
                              )}
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <File size={16} className="text-accent" />
                                {file.name}
                                {isPdf && <Badge variant="outline" className="text-xs">PDF</Badge>}
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
                        )
                      })}
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
                  No files found for this entity{downloadType && ` with type "${fileTypeOptions.find(t => t.value === downloadType)?.label}"`}.
                  Try clearing the filter or upload a new file.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="csv-bulk" className="space-y-6">
            <CSVFileUploader onLog={onLog} />
          </TabsContent>

          <TabsContent value="bulk-download" className="space-y-6">
            <BulkFileDownloader onLog={onLog} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
