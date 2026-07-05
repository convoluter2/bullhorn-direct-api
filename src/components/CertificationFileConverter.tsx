import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  Play, 
  ArrowClockwise, 
  XCircle, 
  Image as ImageI
import { bu
import jsPDF fr
interfac
}
  Image as ImageIcon
} from '@phosphor-icons/react'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { toast } from 'sonner'
import jsPDF from 'jspdf'

interface CertificationFileConverterProps {
  onLog: (operation: string, status: 'success' | 'error', message: string, details?: any) => void
 

interface ConversionResult {
      .filter(id => id.len
      .filter(id => !isNa
    return [...new Se

    return new Pro
      const url = URL.creat
      img.onload = () => {
          const pdf = new j
            unit: 'in',
          })
          const 
          const margi
 


          let finalHeight: number
          if (imgAspectRatio > maxAspectRatio) {
            finalHeight = maxWidth / imgAspectRat
            finalHeight = maxHeight
          }
          const xPos = (pageWidth - finalWidth) / 2

            img,
  
            finalWidth,
            undefined,



            blob: pdfBlob
          })
        } catch (error) {
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
          origina
            yPos,
            finalWidth,
            finalHeight,
        candidateId,
            'FAST'
      )


          const compressionRatio = imageBlob.size / pdfBlob.size

          resolve({ 
            blob: pdfBlob, 
            compressionRatio: parseFloat(compressionRatio.toFixed(2))
      consol
        fileAttachmentId,
        } catch (error) {
          URL.revokeObjectURL(url)
          reject(error)
        o
      }

      img.onerror = () => {
    } catch (error) {
        reject(new Error('Could not load image'))
      }

      }
    })
   

  const processFileAttachment = async (
    fileAttachmentId: number,
    }
  ): Promise<ConversionResult> => {
  const handleStartConver
    if (i
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

    const successful: number[] = []
      if (!candidateId) {
        throw new Error('Could not determine candidate ID from file attachment')
      }

      const fileName = attachment.name || 'file'
      }
      const fileType = attachment.fileType || ''
      console.log(`📋 File info: ${fileName} (${fileType}, ${fileSize} bytes), Candidate ID: ${candidateId}`)

      const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff']

        return {
      } else {
          certificationId,

          status: 'error',
          error: `File type ${fileType} is not supported. Only image files can be converted.`,
          originalFileName: fileName,
          originalFileSize: fileSize,
          originalFileType: fileType
      }
      }

      const fileBlob = await bullhornAPI.downloadCandidateCertificationFile(
        candidateId,
    const errorCount = e
    if (successCount > 0
      )
      console.log('🔄 Converting image to PDF...')

      const { blob: pdfBlob, compressionRatio } = await convertImageToPDF(fileBlob)
      console.log(`✅ PDF created: ${pdfBlob.size} bytes (${compressionRatio}x compression)`)

      await bullhornAPI.uploadCandidateCertificationFile(
        candidateId,
      onLog(
        pdfBlob,
        `${fileName.replace(/\.[^.]+$/, '')}.pdf`,
        summary
        fileAttachmentId

      console.log('✅ PDF uploaded successfully')

    }
        fileAttachmentId,
        certificationId,
        candidateId,
    if (pauseRef.current) 
        message: 'Successfully converted to PDF',
        originalFileName: fileName,
        originalFileSize: fileSize,
        originalFileType: fileType,
        convertedFileSize: pdfBlob.size,
        compressionRatio: compressionRatio
    set
    } catch (error) {
      console.error(`❌ Error processing file ${fileAttachmentId}:`, error)
      if (retryCount < MAX_RETRIES) {
        console.log(`🔄 Retrying (attempt ${retryCount + 1}/${MAX_RETRIES})...`)
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
        return processFileAttachment(fileAttachmentId, retryCount + 1)
    con
    return Mat
        fileAttachmentId,
        certificationId: 0,
        candidateId: 0,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
    } else if (min
      }
     
  }

  const handleStartConversion = async () => {
    const ids = parseFileAttachmentIds(fileAttachmentIds)
    if (ids.length === 0) {
      toast.error('Please enter at least one valid file attachment ID')
      <CardH
    }

    setIsProcessing(true)
            </CardDesc
    setProgress(0)
      </CardHeader>
    setStartTime(Date.now())
    pauseRef.current = false
    abortRef.current = false

    setResults(ids.map(id => ({
            </p>
      certificationId: 0,
              <li>Aut
      status: 'pending'
    })))

    const errors: Array<{ id: number; error: string }> = []
    const successful: number[] = []

    for (let i = 0; i < ids.length; i++) {
      while (pauseRef.current && !abortRef.current) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }

          />
        console.log('🛑 Conversion aborted by user')
          </p
      }

      setCurrentIndex(i)
      setResults(prev => prev.map((r, idx) => 
        idx === i ? { ...r, status: 'processing' as const } : r
      ))

      const result = await processFileAttachment(ids[i])
      setResults(prev => prev.map((r, idx) => 
                <>
      ))

      if (result.status === 'success') {
        successful.push(ids[i])
      } else {
            </Button>
      }

      const progressPercent = ((i + 1) / ids.length) * 100
      setProgress(progressPercent)

      if (startTime && i > 0) {
        const elapsed = Date.now() - startTime
        const avgTimePerFile = elapsed / (i + 1)
        {isProcessing && (
        setEstimatedTimeRemaining(remaining)
       
    }

              </span
    setIsProcessing(false)
    setEstimatedTimeRemaining(null)

    const successCount = successful.length
    const errorCount = errors.length
    const summary = {
      total: ids.length,
      successful: successCount,
      failed: errorCount,
      errors: errors
     

    if (successCount > 0) {
      toast.success(`Converted ${successCount} file(s) successfully`)
      onLog(
            
        'success',
        `Successfully converted ${successCount} of ${ids.length} files`,
        summary
       
    }

    if (errorCount > 0) {
      toast.error(`${errorCount} file(s) failed to convert`)
      onLog(
                </Badge>
        'error',
        `${errorCount} files failed to convert`,
        summary
      )
    }

    if (successCount === 0 && errorCount > 0) {
      onLog(
        'Certification File Conversion',
        'error',
                  <TableRow>
        summary
       
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
                      
                          <B
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


    <Card>

        <div className="flex items-center gap-3">
          <FilePdf size={32} className="text-accent" weight="duotone" />
          <div>
            <CardTitle>Certification File Converter</CardTitle>
            <CardDescription>
              Convert candidate certification image files to PDF format
            </CardDescription>

        </div>
      </CardHeader>
      <CardContent className="space-y-6">

          <Info size={18} />

          <AlertDescription>
            <p className="mb-2">
              This tool converts candidate certification image files to
              standard 8.5" x 11" PDFs with maximum quality and compression.

            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Supports: JPG, PNG, GIF, BMP, TIFF</li>
              <li>Automatically centers and scales images to fit letter-sized pages</li>
              <li>Full error handling with automatic retries</li>
              <li>Pause/resume functionality for large batches</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="space-y-3">

            File Attachment IDs (one per line, comma, or space-separated)

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























































































































































































