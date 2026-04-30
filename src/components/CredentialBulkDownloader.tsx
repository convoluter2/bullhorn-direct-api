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
import { Slider } from '@/components/ui/slider'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileZip, FileCsv, Download, CheckCircle, XCircle, Info, Upload, Trash, Pause, Play, ArrowClockwise, Eye, Certificate, FileText } from '@phosphor-icons/react'
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

interface PreviewCredential {
  candidateId: number
  candidateName: string
  certificationId: number
  certificationName: string
  certificationType: string
  status: string
  dateCertified: string
  dateExpiration: string
  licenseNumber: string
  location: string
  fileCount: number
  fileNames: string[]
}

interface PreviewSummary {
  totalCandidates: number
  totalCredentials: number
  totalFiles: number
  estimatedZipSize: string
  credentials: PreviewCredential[]
  candidatesNotFound: string[]
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
  const [lookupFieldOptions, setLookupFieldOptions] = useState<Array<{ value: string; label: string }>>([
    { value: 'id', label: 'Candidate ID' }
  ])
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false)
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [previewData, setPreviewData] = useState<PreviewSummary | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pauseRef = useRef(false)
  const cancelledRef = useRef(false)

  useEffect(() => {
    loadCandidateMetadata()
  }, [])

  const loadCandidateMetadata = async () => {
    setIsLoadingMetadata(true)
    try {
      const metadata = await bullhornAPI.getMetadata('Candidate')
      
      if (metadata.fields) {
        const lookupFields = metadata.fields
          .filter((field: any) => 
            field.type === 'SCALAR' && 
            (field.dataType === 'String' || field.dataType === 'Integer') &&
            !field.name.includes('password') &&
            !field.name.toLowerCase().includes('ssn')
          )
          .map((field: any) => ({
            value: field.name,
            label: field.label ? `${field.label} (${field.name})` : field.name
          }))
          .sort((a: any, b: any) => a.label.localeCompare(b.label))

        const priorityFields = [
          { value: 'id', label: 'Candidate ID' },
          { value: 'externalID', label: 'External ID' },
          { value: 'email', label: 'Email' },
          { value: 'customText1', label: 'Custom Text 1' },
          { value: 'customText2', label: 'Custom Text 2' },
          { value: 'customText3', label: 'Custom Text 3' },
          { value: 'customText4', label: 'Custom Text 4' },
          { value: 'customText5', label: 'Custom Text 5' }
        ]

        const remainingFields = lookupFields.filter(
          (f: any) => !priorityFields.some(pf => pf.value === f.value)
        )

        setLookupFieldOptions([...priorityFields, ...remainingFields])
        console.log('✅ Loaded Candidate lookup fields:', lookupFields.length)
      }
    } catch (error) {
      console.error('Failed to load Candidate metadata:', error)
      toast.error('Failed to load lookup fields from metadata')
    } finally {
      setIsLoadingMetadata(false)
    }
  }

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
        [
          'id',
          'boardCertification',
          'candidate(id,firstName,lastName)',
          'certification(id,name,type)',
          'certificationFileAttachments',
          'comments',
          'compact',
          'copyOnFile',
          'customDate1',
          'customDate10',
          'customDate2',
          'customDate3',
          'customDate4',
          'customDate5',
          'customDate6',
          'customDate7',
          'customDate8',
          'customDate9',
          'customText1',
          'customText10',
          'customText2',
          'customText3',
          'customText4',
          'customText5',
          'customText6',
          'customText7',
          'customText8',
          'customText9',
          'customTextBlock1',
          'customTextBlock10',
          'customTextBlock2',
          'customTextBlock3',
          'customTextBlock4',
          'customTextBlock5',
          'customTextBlock6',
          'customTextBlock7',
          'customTextBlock8',
          'customTextBlock9',
          'dateAdded',
          'dateCertified',
          'dateExpiration',
          'dateLastModified',
          'displayStatus',
          'expirationReminderDate',
          'fileAttachments',
          'isComplete',
          'isDeleted',
          'issuedBy',
          'licenseNumber',
          'licenseType',
          'location',
          'migrateGUID',
          'modifyingUser(id,firstName,lastName)',
          'name',
          'results',
          'status'
        ],
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
                  CertificationID: cert.certification?.id || '',
                  CertificationName: mapping.migrateCertificationName || cert.certification?.name || '',
                  CertificationType: cert.certification?.type || '',
                  Name: cert.name || '',
                  Status: cert.status || '',
                  DateCertified: cert.dateCertified || '',
                  DateExpiration: cert.dateExpiration || '',
                  DateAdded: cert.dateAdded || '',
                  DateLastModified: cert.dateLastModified || '',
                  BoardCertification: cert.boardCertification || '',
                  Compact: cert.compact || '',
                  CopyOnFile: cert.copyOnFile || '',
                  DisplayStatus: cert.displayStatus || '',
                  ExpirationReminderDate: cert.expirationReminderDate || '',
                  IsComplete: cert.isComplete || '',
                  IsDeleted: cert.isDeleted || '',
                  IssuedBy: cert.issuedBy || '',
                  LicenseNumber: cert.licenseNumber || '',
                  LicenseType: cert.licenseType || '',
                  Location: cert.location || '',
                  MigrateGUID: cert.migrateGUID || '',
                  Results: cert.results || '',
                  Comments: cert.comments || '',
                  CustomText1: cert.customText1 || '',
                  CustomText2: cert.customText2 || '',
                  CustomText3: cert.customText3 || '',
                  CustomText4: cert.customText4 || '',
                  CustomText5: cert.customText5 || '',
                  CustomText6: cert.customText6 || '',
                  CustomText7: cert.customText7 || '',
                  CustomText8: cert.customText8 || '',
                  CustomText9: cert.customText9 || '',
                  CustomText10: cert.customText10 || '',
                  CustomTextBlock1: cert.customTextBlock1 || '',
                  CustomTextBlock2: cert.customTextBlock2 || '',
                  CustomTextBlock3: cert.customTextBlock3 || '',
                  CustomTextBlock4: cert.customTextBlock4 || '',
                  CustomTextBlock5: cert.customTextBlock5 || '',
                  CustomTextBlock6: cert.customTextBlock6 || '',
                  CustomTextBlock7: cert.customTextBlock7 || '',
                  CustomTextBlock8: cert.customTextBlock8 || '',
                  CustomTextBlock9: cert.customTextBlock9 || '',
                  CustomTextBlock10: cert.customTextBlock10 || '',
                  CustomDate1: cert.customDate1 || '',
                  CustomDate2: cert.customDate2 || '',
                  CustomDate3: cert.customDate3 || '',
                  CustomDate4: cert.customDate4 || '',
                  CustomDate5: cert.customDate5 || '',
                  CustomDate6: cert.customDate6 || '',
                  CustomDate7: cert.customDate7 || '',
                  CustomDate8: cert.customDate8 || '',
                  CustomDate9: cert.customDate9 || '',
                  CustomDate10: cert.customDate10 || '',
                  ModifyingUserID: cert.modifyingUser?.id || '',
                  ModifyingUserFirstName: cert.modifyingUser?.firstName || '',
                  ModifyingUserLastName: cert.modifyingUser?.lastName || '',
                  FileAttachmentID: file.id,
                  FileName: file.name,
                  FileType: file.type || '',
                  ContentType: file.contentType || '',
                  ContentSubType: file.contentSubType || '',
                  FileSize: file.fileSize || 0,
                  FileDateAdded: file.dateAdded || '',
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
            CertificationID: cert.certification?.id || '',
            CertificationName: mapping.migrateCertificationName || cert.certification?.name || '',
            CertificationType: cert.certification?.type || '',
            Name: cert.name || '',
            Status: cert.status || '',
            DateCertified: cert.dateCertified || '',
            DateExpiration: cert.dateExpiration || '',
            DateAdded: cert.dateAdded || '',
            DateLastModified: cert.dateLastModified || '',
            BoardCertification: cert.boardCertification || '',
            Compact: cert.compact || '',
            CopyOnFile: cert.copyOnFile || '',
            DisplayStatus: cert.displayStatus || '',
            ExpirationReminderDate: cert.expirationReminderDate || '',
            IsComplete: cert.isComplete || '',
            IsDeleted: cert.isDeleted || '',
            IssuedBy: cert.issuedBy || '',
            LicenseNumber: cert.licenseNumber || '',
            LicenseType: cert.licenseType || '',
            Location: cert.location || '',
            MigrateGUID: cert.migrateGUID || '',
            Results: cert.results || '',
            Comments: cert.comments || '',
            CustomText1: cert.customText1 || '',
            CustomText2: cert.customText2 || '',
            CustomText3: cert.customText3 || '',
            CustomText4: cert.customText4 || '',
            CustomText5: cert.customText5 || '',
            CustomText6: cert.customText6 || '',
            CustomText7: cert.customText7 || '',
            CustomText8: cert.customText8 || '',
            CustomText9: cert.customText9 || '',
            CustomText10: cert.customText10 || '',
            CustomTextBlock1: cert.customTextBlock1 || '',
            CustomTextBlock2: cert.customTextBlock2 || '',
            CustomTextBlock3: cert.customTextBlock3 || '',
            CustomTextBlock4: cert.customTextBlock4 || '',
            CustomTextBlock5: cert.customTextBlock5 || '',
            CustomTextBlock6: cert.customTextBlock6 || '',
            CustomTextBlock7: cert.customTextBlock7 || '',
            CustomTextBlock8: cert.customTextBlock8 || '',
            CustomTextBlock9: cert.customTextBlock9 || '',
            CustomTextBlock10: cert.customTextBlock10 || '',
            CustomDate1: cert.customDate1 || '',
            CustomDate2: cert.customDate2 || '',
            CustomDate3: cert.customDate3 || '',
            CustomDate4: cert.customDate4 || '',
            CustomDate5: cert.customDate5 || '',
            CustomDate6: cert.customDate6 || '',
            CustomDate7: cert.customDate7 || '',
            CustomDate8: cert.customDate8 || '',
            CustomDate9: cert.customDate9 || '',
            CustomDate10: cert.customDate10 || '',
            ModifyingUserID: cert.modifyingUser?.id || '',
            ModifyingUserFirstName: cert.modifyingUser?.firstName || '',
            ModifyingUserLastName: cert.modifyingUser?.lastName || '',
            FileAttachmentID: '',
            FileName: '',
            FileType: '',
            ContentType: '',
            ContentSubType: '',
            FileSize: 0,
            FileDateAdded: '',
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

  const handlePreview = async () => {
    if (candidateMappings.length === 0) {
      toast.error('Please provide candidate identifiers')
      return
    }

    setIsLoadingPreview(true)
    setPreviewDialogOpen(true)

    try {
      const credentials: PreviewCredential[] = []
      const candidatesNotFound: string[] = []
      let totalFiles = 0
      let estimatedSize = 0

      const sampleSize = Math.min(candidateMappings.length, 10)
      
      for (let i = 0; i < sampleSize; i++) {
        const mapping = candidateMappings[i]
        
        try {
          let candidateId: number
          if (lookupField === 'id') {
            candidateId = parseInt(mapping.candidateId)
            if (isNaN(candidateId)) {
              candidatesNotFound.push(mapping.candidateId)
              continue
            }
          } else {
            const searchResult = await bullhornAPI.query(
              'Candidate',
              ['id', 'firstName', 'lastName'],
              `${lookupField}:${mapping.candidateId}`
            )
            if (!searchResult.data || searchResult.data.length === 0) {
              candidatesNotFound.push(mapping.candidateId)
              continue
            }
            candidateId = searchResult.data[0].id
          }

          const certificationsResult = await bullhornAPI.query(
            'CandidateCertification',
            [
              'id',
              'candidate(id,firstName,lastName)',
              'certification(id,name,type)',
              'certificationFileAttachments',
              'status',
              'dateCertified',
              'dateExpiration',
              'licenseNumber',
              'location'
            ],
            `candidate.id:${candidateId} AND isDeleted:0`
          )

          if (certificationsResult.data && certificationsResult.data.length > 0) {
            for (const cert of certificationsResult.data) {
              const fileNames: string[] = []
              let fileCount = 0

              if (cert.fileAttachments && cert.fileAttachments.total > 0) {
                const filesResult = await bullhornAPI.query(
                  'CertificationFileAttachment',
                  ['id', 'name', 'fileSize'],
                  `candidateCertification.id:${cert.id} AND isDeleted:0`
                )

                if (filesResult.data && filesResult.data.length > 0) {
                  fileCount = filesResult.data.length
                  filesResult.data.forEach((file: any) => {
                    fileNames.push(file.name)
                    estimatedSize += file.fileSize || 0
                  })
                }
              }

              credentials.push({
                candidateId,
                candidateName: cert.candidate 
                  ? `${cert.candidate.firstName || ''} ${cert.candidate.lastName || ''}`.trim()
                  : 'Unknown',
                certificationId: cert.id,
                certificationName: cert.certification?.name || 'Unknown',
                certificationType: cert.certification?.type || '-',
                status: cert.status || '-',
                dateCertified: cert.dateCertified || '-',
                dateExpiration: cert.dateExpiration || '-',
                licenseNumber: cert.licenseNumber || '-',
                location: cert.location || '-',
                fileCount,
                fileNames
              })

              totalFiles += fileCount
            }
          }
        } catch (error) {
          console.error(`Preview error for candidate ${mapping.candidateId}:`, error)
          candidatesNotFound.push(mapping.candidateId)
        }
      }

      setPreviewData({
        totalCandidates: candidateMappings.length,
        totalCredentials: credentials.length,
        totalFiles,
        estimatedZipSize: formatBytes(estimatedSize),
        credentials,
        candidatesNotFound
      })

      onLog('Credential Preview', 'success', `Generated preview for ${sampleSize} candidates`, {
        sampledCandidates: sampleSize,
        totalCandidates: candidateMappings.length,
        credentialsFound: credentials.length,
        filesFound: totalFiles
      })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Preview failed: ${errorMessage}`)
      onLog('Credential Preview', 'error', 'Preview failed', { error: errorMessage })
      setPreviewDialogOpen(false)
    } finally {
      setIsLoadingPreview(false)
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
      <Alert>
        <Info size={16} />
        <AlertTitle>Migration Fields (Optional)</AlertTitle>
        <AlertDescription className="space-y-2 text-sm">
          <p>
            Your CSV can include optional migration fields to customize the download for re-importing to another tenant:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>MigrateEntityID</strong> - Override the CandidateID in the export</li>
            <li><strong>MigrateCertificationID</strong> - Override the CandidateCertificationID in the export</li>
            <li><strong>MigrateCertificationName</strong> - Override the Certification Name in the export</li>
          </ul>
          <p className="mt-2">
            These fields allow you to download credentials from one tenant and prepare them for upload to different candidate/certification IDs in another tenant.
          </p>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Configuration</CardTitle>
              <CardDescription>
                Configure how to identify candidates for credential download
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadCandidateMetadata}
              disabled={isLoadingMetadata || isDownloading}
            >
              <ArrowClockwise size={16} className={isLoadingMetadata ? 'animate-spin' : ''} />
              Refresh Metadata
            </Button>
          </div>
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
              {isLoadingMetadata && (
                <p className="text-xs text-muted-foreground">Loading lookup fields from metadata...</p>
              )}
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
              variant="outline"
              onClick={handlePreview}
              disabled={candidateMappings.length === 0 || isLoadingPreview}
            >
              <Eye size={18} />
              Preview Data
            </Button>
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

      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye size={24} className="text-primary" />
              Credential Data Preview
            </DialogTitle>
            <DialogDescription>
              Preview of credential data that will be downloaded
              {candidateMappings.length > 10 && ` (showing first 10 of ${candidateMappings.length} candidates)`}
            </DialogDescription>
          </DialogHeader>

          {isLoadingPreview ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <div className="animate-spin mx-auto">
                  <Certificate size={48} className="text-primary" />
                </div>
                <p className="text-muted-foreground">Loading credential preview...</p>
              </div>
            </div>
          ) : previewData ? (
            <div className="flex-1 overflow-hidden flex flex-col gap-4">
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription className="text-xs">Total Candidates</CardDescription>
                    <CardTitle className="text-2xl">{previewData.totalCandidates}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription className="text-xs">Total Credentials</CardDescription>
                    <CardTitle className="text-2xl">{previewData.totalCredentials}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription className="text-xs">Total Files</CardDescription>
                    <CardTitle className="text-2xl">{previewData.totalFiles}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription className="text-xs">Est. Size (Sample)</CardDescription>
                    <CardTitle className="text-2xl">{previewData.estimatedZipSize}</CardTitle>
                  </CardHeader>
                </Card>
              </div>

              {previewData.candidatesNotFound.length > 0 && (
                <Alert variant="destructive">
                  <XCircle size={16} />
                  <AlertTitle>Candidates Not Found</AlertTitle>
                  <AlertDescription>
                    {previewData.candidatesNotFound.length} candidate(s) could not be found: {previewData.candidatesNotFound.join(', ')}
                  </AlertDescription>
                </Alert>
              )}

              <Tabs defaultValue="credentials" className="flex-1 flex flex-col overflow-hidden">
                <TabsList>
                  <TabsTrigger value="credentials" className="gap-2">
                    <Certificate size={16} />
                    Credentials ({previewData.credentials.length})
                  </TabsTrigger>
                  <TabsTrigger value="files" className="gap-2">
                    <FileText size={16} />
                    Files ({previewData.totalFiles})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="credentials" className="flex-1 overflow-hidden mt-4">
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Candidate</TableHead>
                          <TableHead>Credential Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Certified</TableHead>
                          <TableHead>Expires</TableHead>
                          <TableHead>Files</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.credentials.map((cred, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium text-sm">{cred.candidateName}</div>
                                <div className="text-xs text-muted-foreground font-mono">ID: {cred.candidateId}</div>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[200px]">
                              <div className="truncate font-medium">{cred.certificationName}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">
                                {cred.certificationType}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={cred.status === 'Current' ? 'default' : 'outline'}
                                className="text-xs"
                              >
                                {cred.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{cred.dateCertified}</TableCell>
                            <TableCell className="text-sm">{cred.dateExpiration}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{cred.fileCount}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="files" className="flex-1 overflow-hidden mt-4">
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      {previewData.credentials.map((cred, idx) => (
                        cred.fileCount > 0 && (
                          <Card key={idx}>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <Certificate size={16} className="text-primary" />
                                {cred.certificationName}
                              </CardTitle>
                              <CardDescription className="text-xs">
                                Candidate: {cred.candidateName} (ID: {cred.candidateId})
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-1">
                                {cred.fileNames.map((fileName, fileIdx) => (
                                  <div key={fileIdx} className="flex items-center gap-2 text-sm py-1 px-2 rounded bg-muted">
                                    <FileText size={14} className="text-muted-foreground" />
                                    <span className="font-mono text-xs">{fileName}</span>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )
                      ))}
                      {previewData.totalFiles === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          No files found in the sampled credentials
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => {
                  setPreviewDialogOpen(false)
                  handleStartDownload()
                }}>
                  <Download size={18} />
                  Start Download
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
