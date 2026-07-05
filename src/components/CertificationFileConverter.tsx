import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  Play, 
  ArrowClockwise, 
  XCircle, 
  FileArrowDown, 
  FilePdf, 
  CheckCircle, 
  Info, 
  Pause,
  Image as ImageIcon
} from '@phosphor-icons/react'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { toast } from 'sonner'
import jsPDF from 'jspdf'

interface CertificationFileConverterProps {
  onLog: (operation: string, status: 'success' | 'error', message: string, details?: any) => void
}

interface ConversionResult {
  fileAttachmentId: number
  certificationId: number
  candidateId: number
  status: 'success' | 'error' | 'processing' | 'pending'
  message?: string
  originalFileName?: string
  originalFileSize?: number
  originalFileType?: string
  convertedFileSize?: number
  compressionRatio?: number
  error?: string
  retryCount?: number
}

export function CertificationFileConverter({ onLog }: CertificationFileConverterProps) {
  const [fileAttachmentIds, setFileAttachmentIds] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [results, setResults] = useState<ConversionResult[]>([])
  const [startTime, setStartTime] = useState<number | null>(null)
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null)
  
  const pauseRef = useRef(false)
  const abortRef = useRef(false)

  const parseFileAttachmentIds = (input: string): number[] => {
    const ids = input
      .split(/[\n,;\s]+/)
      .map(id => id.trim())
      .filter(id => id.length > 0)
      .map(id => parseInt(id, 10))
      .filter(id => !isNaN(id) && id > 0)
    
    return [...new Set(ids)]
  }

  const convertImageToPDF = async (imageBlob: Blob): Promise<{ blob: Blob; compressionRatio: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(imageBlob)
      
      img.onload = () => {
        try {
          const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'in',
            format: 'letter'
          })

          const pageWidth = 8.5
          const pageHeight = 11
          const margin = 0.5
          const maxWidth = pageWidth - (margin * 2)
          const maxHeight = pageHeight - (margin * 2)

          const imgAspectRatio = img.width / img.height
          const maxAspectRatio = maxWidth / maxHeight

          let finalWidth: number
          let finalHeight: number

          if (imgAspectRatio > maxAspectRatio) {
            finalWidth = maxWidth
            finalHeight = maxWidth / imgAspectRatio
          } else {
            finalHeight = maxHeight
            finalWidth = maxHeight * imgAspectRatio
          }

          const xPos = (pageWidth - finalWidth) / 2
          const yPos = (pageHeight - finalHeight) / 2

          pdf.addImage(
            img,
            'JPEG',
            xPos,
            yPos,
            finalWidth,
            finalHeight,
            undefined,
            'FAST'
          )
          const pdfBlob = pdf.output('blob')

          const compressionRatio = imageBlob.size / pdfBlob.size

          resolve({ 
            blob: pdfBlob, 
            compressionRatio: parseFloat(compressionRatio.toFixed(2))
          })
          URL.revokeObjectURL(url)
        } catch (error) {
          URL.revokeObjectURL(url)
          reject(error)
        }
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Could not load image'))
      }

      img.src = url
    })
  }

  const processFileAttachment = async (
    fileAttachmentId: number,
    retryCount: number = 0
  ): Promise<ConversionResult> => {
    const MAX_RETRIES = 2
    try {
      console.log(`📄 Processing file attachment ID: ${fileAttachmentId}`)

      const attachment = await bullhornAPI.getEntity(
        'CandidateCertificationFileAttachment',
        fileAttachmentId,
        ['id', 'name', 'fileType', 'fileSize', 'candidate', 'candidateCertification']
      )

      const certificationId = attachment.candidateCertification?.id
      if (!certificationId) {
        throw new Error('Could not determine certification ID from file attachment')
      }

      const candidateId = attachment.candidate?.id
      if (!candidateId) {
        throw new Error('Could not determine candidate ID from file attachment')
      }

      const fileName = attachment.name || 'file'
      const fileSize = attachment.fileSize || 0
      const fileType = attachment.fileType || ''
      console.log(`📋 File info: ${fileName} (${fileType}, ${fileSize} bytes), Candidate ID: ${candidateId}`)

      const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff']
      if (!imageTypes.includes(fileType.toLowerCase())) {
        return {
          fileAttachmentId,
          certificationId,
          candidateId,
          status: 'error',
          error: `File type ${fileType} is not supported. Only image files can be converted.`,
          originalFileName: fileName,
          originalFileSize: fileSize,
          originalFileType: fileType
        }
      }

      const fileBlob = await bullhornAPI.downloadCandidateCertificationFile(
        candidateId,
        certificationId,
        fileAttachmentId
      )
      console.log('🔄 Converting image to PDF...')

      const { blob: pdfBlob, compressionRatio } = await convertImageToPDF(fileBlob)
      console.log(`✅ PDF created: ${pdfBlob.size} bytes (${compressionRatio}x compression)`)

      await bullhornAPI.uploadCandidateCertificationFile(
        candidateId,
        certificationId,
        pdfBlob,
        `${fileName.replace(/\.[^.]+$/, '')}.pdf`,
        'SAMPLE',
        fileAttachmentId
      )
      console.log('✅ PDF uploaded successfully')

      return {
        fileAttachmentId,
        certificationId,
        candidateId,
        status: 'success',
        message: 'Successfully converted to PDF',
        originalFileName: fileName,
        originalFileSize: fileSize,
        originalFileType: fileType,
        convertedFileSize: pdfBlob.size,
        compressionRatio: compressionRatio
      }
    } catch (error) {
      console.error(`❌ Error processing file ${fileAttachmentId}:`, error)
      if (retryCount < MAX_RETRIES) {
        console.log(`🔄 Retrying (attempt ${retryCount + 1}/${MAX_RETRIES})...`)
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
        return processFileAttachment(fileAttachmentId, retryCount + 1)
      }
      return {
        fileAttachmentId,
        certificationId: 0,
        candidateId: 0,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        retryCount
      }
    }
  }

  const handleStartConversion = async () => {
    const ids = parseFileAttachmentIds(fileAttachmentIds)
    if (ids.length === 0) {
      toast.error('Please enter at least one valid file attachment ID')
      return
    }

    setIsProcessing(true)
    setIsPaused(false)
    setProgress(0)
    setCurrentIndex(0)
    setStartTime(Date.now())
    pauseRef.current = false
    abortRef.current = false

    setResults(ids.map(id => ({
      fileAttachmentId: id,
      certificationId: 0,
      candidateId: 0,
      status: 'pending'
    })))

    const errors: Array<{ id: number; error: string }> = []
    const successful: number[] = []

    for (let i = 0; i < ids.length; i++) {
      while (pauseRef.current && !abortRef.current) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      if (abortRef.current) {
        console.log('🛑 Conversion aborted by user')
        break
      }

      setCurrentIndex(i)
      setResults(prev => prev.map((r, idx) => 
        idx === i ? { ...r, status: 'processing' as const } : r
      ))

      const result = await processFileAttachment(ids[i])
      setResults(prev => prev.map((r, idx) => 
        idx === i ? result : r
      ))

      if (result.status === 'success') {
        successful.push(ids[i])
      } else {
        errors.push({ id: ids[i], error: result.error || 'Unknown error' })
      }

      const progressPercent = ((i + 1) / ids.length) * 100
      setProgress(progressPercent)

      if (startTime && i > 0) {
        const elapsed = Date.now() - startTime
        const avgTimePerFile = elapsed / (i + 1)
        const remaining = (ids.length - (i + 1)) * avgTimePerFile
        setEstimatedTimeRemaining(remaining)
      }
    }

    setProgress(100)
    setIsProcessing(false)
    setEstimatedTimeRemaining(null)

    const successCount = successful.length
    const errorCount = errors.length
    const summary = {
      total: ids.length,
      successful: successCount,
      failed: errorCount,
      errors: errors
    }

    if (successCount > 0) {
      toast.success(`Converted ${successCount} file(s) successfully`)
      onLog(
        'Certification File Conversion',
        'success',
        `Successfully converted ${successCount} of ${ids.length} files`,
        summary
      )
    }

    if (errorCount > 0) {
      toast.error(`${errorCount} file(s) failed to convert`)
      onLog(
        'Certification File Conversion',
        'error',
        `${errorCount} files failed to convert`,
        summary
      )
    }

    if (successCount === 0 && errorCount > 0) {
      onLog(
        'Certification File Conversion',
        'error',
        `All ${ids.length} file conversions failed`,
        summary
      )
    }
  }

  const handlePauseResume = () => {
    pauseRef.current = !pauseRef.current
    setIsPaused(pauseRef.current)
    if (pauseRef.current) {
      toast.info('Conversion paused')
    } else {
      toast.info('Conversion resumed')
    }
  }

  const handleReset = () => {
    setIsProcessing(false)
    setIsPaused(false)
    setProgress(0)
    setCurrentIndex(0)
    setResults([])
    setEstimatedTimeRemaining(null)
    setStartTime(null)
    pauseRef.current = false
    abortRef.current = false
    toast.info('Reset complete')
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
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

  const successCount = results.filter(r => r.status === 'success').length
  const errorCount = results.filter(r => r.status === 'error').length
  const processingCount = results.filter(r => r.status === 'processing').length
  const pendingCount = results.filter(r => r.status === 'pending').length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <FilePdf size={32} className="text-accent" weight="duotone" />
          <div>
            <CardTitle>Certification File Converter</CardTitle>
            <CardDescription>
              Convert candidate certification image files to PDF format
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info size={18} />
          <AlertTitle>How it works</AlertTitle>
          <AlertDescription>
            <p className="mb-2">
              This tool converts candidate certification image files to
              standard 8.5" x 11" PDFs with maximum quality and compression.
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Supports: JPG, PNG, GIF, BMP, TIFF</li>
              <li>Automatically centers and scales images to fit letter-sized pages</li>
              <li>Full error handling with automatic retries</li>
              <li>Pause/resume functionality for large batches</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <Label htmlFor="file-attachment-ids">
            File Attachment IDs (one per line, comma, or space-separated)
          </Label>
          <Textarea
            id="file-attachment-ids"
            value={fileAttachmentIds}
            onChange={(e) => setFileAttachmentIds(e.target.value)}
            disabled={isProcessing}
            className="font-mono"
            rows={8}
            placeholder="12345&#10;67890&#10;13579"
          />
          <p className="text-sm text-muted-foreground">
            Enter CandidateCertificationFileAttachment IDs to convert
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleStartConversion}
            disabled={isProcessing || parseFileAttachmentIds(fileAttachmentIds).length === 0}
            className="gap-2"
          >
            <Play weight="fill" />
            Start Conversion
          </Button>

          {isProcessing && (
            <Button
              onClick={handlePauseResume}
              variant="outline"
              className="gap-2"
            >
              {isPaused ? (
                <>
                  <Play weight="fill" />
                  Resume
                </>
              ) : (
                <>
                  <Pause weight="fill" />
                  Pause
                </>
              )}
            </Button>
          )}

          <Button
            onClick={handleReset}
            variant="outline"
            disabled={isProcessing && !isPaused}
            className="gap-2"
          >
            <ArrowClockwise />
            Reset
          </Button>
        </div>

        {isProcessing && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                Processing {currentIndex + 1} of {results.length}
              </span>
              <span className="text-muted-foreground">
                {Math.round(progress)}% complete
              </span>
            </div>
            <Progress value={progress} />
            {estimatedTimeRemaining !== null && (
              <p className="text-sm text-muted-foreground text-center">
                Estimated time remaining: {formatTime(estimatedTimeRemaining)}
              </p>
            )}
            {isPaused && (
              <Alert>
                <Pause size={18} />
                <AlertTitle>Paused</AlertTitle>
                <AlertDescription>
                  Conversion is paused. Click Resume to continue.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-4">
            <Separator />
            
            <div className="flex gap-3">
              <Badge variant="outline" className="gap-2">
                <CheckCircle size={16} weight="fill" className="text-green-500" />
                {successCount} Successful
              </Badge>
              <Badge variant="outline" className="gap-2">
                <XCircle size={16} weight="fill" className="text-red-500" />
                {errorCount} Failed
              </Badge>
              {processingCount > 0 && (
                <Badge variant="outline" className="gap-2">
                  <FileArrowDown size={16} className="animate-pulse" />
                  {processingCount} Processing
                </Badge>
              )}
              {pendingCount > 0 && (
                <Badge variant="outline" className="gap-2">
                  {pendingCount} Pending
                </Badge>
              )}
            </div>

            <ScrollArea className="h-[400px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">File ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Original File</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Original Size</TableHead>
                    <TableHead className="text-right">PDF Size</TableHead>
                    <TableHead className="text-right">Compression</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono">
                        {result.fileAttachmentId}
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
                        {result.status === 'processing' && (
                          <Badge variant="secondary" className="gap-1">
                            <FileArrowDown size={14} className="animate-pulse" />
                            Processing
                          </Badge>
                        )}
                        {result.status === 'pending' && (
                          <Badge variant="outline">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={result.originalFileName}>
                        {result.originalFileName || '-'}
                      </TableCell>
                      <TableCell>
                        {result.originalFileType ? (
                          <Badge variant="outline" className="gap-1">
                            <ImageIcon size={14} />
                            {result.originalFileType.split('/')[1]?.toUpperCase() || 'IMG'}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {result.originalFileSize ? formatFileSize(result.originalFileSize) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {result.convertedFileSize ? formatFileSize(result.convertedFileSize) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {result.compressionRatio ? (
                          <span className={result.compressionRatio > 1 ? 'text-green-600 font-semibold' : ''}>
                            {result.compressionRatio.toFixed(2)}x
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate" title={result.error || result.message}>
                        {result.error ? (
                          <span className="text-red-600">{result.error}</span>
                        ) : result.message ? (
                          <span className="text-green-600">{result.message}</span>
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
