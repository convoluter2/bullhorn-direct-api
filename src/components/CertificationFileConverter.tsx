import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  FileArrowDown, 
  FileArrowUp, 
  FilePdf, 
  Image as ImageIcon,
  CheckCircle, 
  XCircle, 
  Info, 
  Play,
  Pause,
  ArrowClockwise
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { bullhornAPI } from '@/lib/bullhorn-api'
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
      .filter(id => !isNaN(id))
    
    return Array.from(new Set(ids))
  }

  const convertImageToPdf = async (
    imageBlob: Blob,
    originalFileName: string
  ): Promise<{ blob: Blob; compressionRatio: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(imageBlob)
      
      img.onload = () => {
        try {
          const PAGE_WIDTH_INCHES = 8.5
          const PAGE_HEIGHT_INCHES = 11
          const MARGIN_INCHES = 0.5
          const USABLE_WIDTH_INCHES = PAGE_WIDTH_INCHES - (2 * MARGIN_INCHES)
          const USABLE_HEIGHT_INCHES = PAGE_HEIGHT_INCHES - (2 * MARGIN_INCHES)

          const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'in',
            format: 'letter',
            compress: true
          })

          const imgWidth = img.width
          const imgHeight = img.height
          const imgAspectRatio = imgWidth / imgHeight

          let finalWidth = USABLE_WIDTH_INCHES
          let finalHeight = finalWidth / imgAspectRatio

          if (finalHeight > USABLE_HEIGHT_INCHES) {
            finalHeight = USABLE_HEIGHT_INCHES
            finalWidth = finalHeight * imgAspectRatio
          }

          const xPos = MARGIN_INCHES + (USABLE_WIDTH_INCHES - finalWidth) / 2
          const yPos = MARGIN_INCHES + (USABLE_HEIGHT_INCHES - finalHeight) / 2

          const canvas = document.createElement('canvas')
          const maxDimension = 2000
          let canvasWidth = imgWidth
          let canvasHeight = imgHeight

          if (imgWidth > maxDimension || imgHeight > maxDimension) {
            if (imgWidth > imgHeight) {
              canvasWidth = maxDimension
              canvasHeight = (maxDimension / imgWidth) * imgHeight
            } else {
              canvasHeight = maxDimension
              canvasWidth = (maxDimension / imgHeight) * imgWidth
            }
          }

          canvas.width = canvasWidth
          canvas.height = canvasHeight

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            throw new Error('Could not get canvas context')
          }

          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

          const imageData = canvas.toDataURL('image/jpeg', 0.85)

          pdf.addImage(
            imageData,
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

          URL.revokeObjectURL(url)
          
          console.log('✅ Image converted to PDF:', {
            originalSize: imageBlob.size,
            pdfSize: pdfBlob.size,
            compressionRatio: compressionRatio.toFixed(2),
            originalFileName
          })

          resolve({ blob: pdfBlob, compressionRatio })
        } catch (error) {
          URL.revokeObjectURL(url)
          reject(error)
        }
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to load image'))
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
      console.log(`🔄 Processing CandidateCertificationFileAttachment ${fileAttachmentId}`)

      const attachment = await bullhornAPI.getEntity(
        'CandidateCertificationFileAttachment',
        fileAttachmentId,
        ['id', 'name', 'fileType', 'contentType', 'fileSize', 'candidateCertification', 'candidate']
      )

      if (!attachment) {
        throw new Error('File attachment not found')
      }

      const certificationId = attachment.candidateCertification?.id
      const candidateId = attachment.candidate?.id

      if (!certificationId || !candidateId) {
        throw new Error('Missing certification or candidate ID')
      }

      const fileName = attachment.name || 'file'
      const fileType = attachment.contentType || attachment.fileType || 'unknown'
      const fileSize = attachment.fileSize || 0

      console.log('📄 File attachment details:', {
        id: fileAttachmentId,
        name: fileName,
        fileType,
        fileSize,
        certificationId,
        candidateId
      })

      const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp']
      if (!imageTypes.includes(fileType.toLowerCase())) {
        return {
          fileAttachmentId,
          certificationId,
          candidateId,
          status: 'error',
          error: `File type ${fileType} is not an image. Only image files can be converted.`,
          originalFileName: fileName,
          originalFileType: fileType,
          originalFileSize: fileSize
        }
      }

      console.log('📥 Downloading file...')
      const fileBlob = await bullhornAPI.downloadFile(
        'CandidateCertification',
        certificationId,
        fileAttachmentId
      )

      console.log('🔄 Converting image to PDF...')
      const { blob: pdfBlob, compressionRatio } = await convertImageToPdf(fileBlob, fileName)

      const pdfFileName = fileName.replace(/\.(jpg|jpeg|png|gif|bmp|webp)$/i, '') + '.pdf'
      const pdfFile = new File([pdfBlob], pdfFileName, { type: 'application/pdf' })

      console.log('🗑️ Deleting original file...')
      await bullhornAPI.deleteFile(
        'CandidateCertification',
        certificationId,
        fileAttachmentId
      )

      console.log('📤 Uploading converted PDF...')
      const uploadResult = await bullhornAPI.uploadFile(
        'CandidateCertification',
        certificationId,
        pdfFile,
        'SAMPLE',
        `Converted from ${fileName}`
      )

      console.log('✅ File conversion complete:', {
        fileAttachmentId,
        originalSize: fileSize,
        convertedSize: pdfBlob.size,
        compressionRatio: compressionRatio.toFixed(2),
        newFileId: uploadResult.fileId || uploadResult.changedEntityId
      })

      return {
        fileAttachmentId,
        certificationId,
        candidateId,
        status: 'success',
        message: 'Successfully converted and replaced',
        originalFileName: fileName,
        originalFileSize: fileSize,
        originalFileType: fileType,
        convertedFileSize: pdfBlob.size,
        compressionRatio,
        retryCount
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`❌ Failed to process file attachment ${fileAttachmentId}:`, error)

      if (retryCount < MAX_RETRIES && !errorMessage.includes('not an image')) {
        console.log(`🔄 Retrying (attempt ${retryCount + 1}/${MAX_RETRIES})...`)
        await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)))
        return await processFileAttachment(fileAttachmentId, retryCount + 1)
      }

      return {
        fileAttachmentId,
        certificationId: 0,
        candidateId: 0,
        status: 'error',
        error: errorMessage,
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

    console.log(`🚀 Starting conversion for ${ids.length} file attachments`)

    setIsProcessing(true)
    setIsPaused(false)
    setProgress(0)
    setCurrentIndex(0)
    setStartTime(Date.now())
    pauseRef.current = false
    abortRef.current = false

    const initialResults: ConversionResult[] = ids.map(id => ({
      fileAttachmentId: id,
      certificationId: 0,
      candidateId: 0,
      status: 'pending'
    }))
    setResults(initialResults)

    onLog('Certification File Conversion', 'success', `Starting conversion of ${ids.length} file attachments`, {
      fileAttachmentIds: ids
    })

    let successCount = 0
    let errorCount = 0
    const errors: Array<{ id: number; error: string }> = []

    for (let i = 0; i < ids.length; i++) {
      if (abortRef.current) {
        console.log('❌ Conversion aborted by user')
        break
      }

      while (pauseRef.current && !abortRef.current) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      if (abortRef.current) {
        break
      }

      setCurrentIndex(i)

      setResults(prev => prev.map((r, idx) => 
        idx === i ? { ...r, status: 'processing' } : r
      ))

      const result = await processFileAttachment(ids[i])

      setResults(prev => prev.map((r, idx) => 
        idx === i ? result : r
      ))

      if (result.status === 'success') {
        successCount++
        toast.success(`Converted ${result.originalFileName || ids[i]}`)
      } else {
        errorCount++
        errors.push({ id: ids[i], error: result.error || 'Unknown error' })
        toast.error(`Failed to convert file ${ids[i]}: ${result.error}`)
      }

      const progressPercent = ((i + 1) / ids.length) * 100
      setProgress(progressPercent)

      if (startTime) {
        const elapsed = Date.now() - startTime
        const avgTimePerFile = elapsed / (i + 1)
        const remaining = (ids.length - (i + 1)) * avgTimePerFile
        setEstimatedTimeRemaining(remaining)
      }
    }

    setIsProcessing(false)
    setProgress(100)
    setEstimatedTimeRemaining(null)

    const summary = {
      total: ids.length,
      successful: successCount,
      failed: errorCount,
      errors: errors.length > 0 ? errors : undefined
    }

    console.log('✅ Conversion complete:', summary)

    if (successCount > 0) {
      onLog(
        'Certification File Conversion',
        'success',
        `Successfully converted ${successCount} of ${ids.length} file attachments`,
        summary
      )
      toast.success(`Conversion complete: ${successCount} successful, ${errorCount} failed`)
    } else {
      onLog(
        'Certification File Conversion',
        'error',
        `All ${ids.length} file conversions failed`,
        summary
      )
      toast.error('All conversions failed')
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
    setStartTime(null)
    setEstimatedTimeRemaining(null)
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
  const pendingCount = results.filter(r => r.status === 'pending').length
  const processingCount = results.filter(r => r.status === 'processing').length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <FilePdf size={32} weight="duotone" className="text-accent" />
          <div>
            <CardTitle>Certification File Converter</CardTitle>
            <CardDescription>
              Convert candidate certification image attachments to compressed PDFs (8.5" x 11")
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info size={18} />
          <AlertTitle>How it works</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              This tool downloads CandidateCertificationFileAttachment images, converts them to 
              standard 8.5" x 11" PDFs with maximum compression, then replaces the original 
              file in Bullhorn.
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Supports: JPG, JPEG, PNG, GIF, BMP, WEBP</li>
              <li>Images are centered on letter-size pages with 0.5" margins</li>
              <li>Automatic compression reduces file sizes significantly</li>
              <li>Original files are deleted after successful conversion</li>
              <li>Full error tracking and retry logic included</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <Label htmlFor="file-attachment-ids">
            CandidateCertificationFileAttachment IDs
          </Label>
          <Textarea
            id="file-attachment-ids"
            placeholder="Enter file attachment IDs (one per line, or comma-separated)&#10;Example:&#10;12345&#10;67890&#10;11223"
            value={fileAttachmentIds}
            onChange={(e) => setFileAttachmentIds(e.target.value)}
            disabled={isProcessing}
            rows={8}
            className="font-mono"
          />
          <p className="text-sm text-muted-foreground">
            {parseFileAttachmentIds(fileAttachmentIds).length} file attachment ID(s) entered
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
