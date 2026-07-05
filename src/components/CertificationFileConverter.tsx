import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  Play, 
  ArrowClockwise, 
  XCircle, 
  CheckCircle,
  Info,
  Image as ImageIcon
} from '@phosphor-icons/react'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { toast } from 'sonner'
import jsPDF from 'jspdf'

interface CertificationFileConverterProps {
  onLog: (operation: string, status: 'success' | 'error', message: string, details?: any) => void
}

interface ConversionResult {
  candidateId: number
  certificationName: string
  originalFileId: number
  originalFileName: string
  newFileId?: number
  status: 'success' | 'error'
  message?: string
}

export function CertificationFileConverter({ onLog }: CertificationFileConverterProps) {
  const [candidateIds, setCandidateIds] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<ConversionResult[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parseIds = (input: string): number[] => {
    const ids = input
      .split(/[\n,]/)
      .map(id => id.trim())
      .filter(id => id.length > 0)
      .map(id => parseInt(id, 10))
      .filter(id => !isNaN(id))
    return [...new Set(ids)]
  }

  const convertImageToPDF = async (imageBlob: Blob, fileName: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(imageBlob)
      
      img.onload = () => {
        try {
          const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'in',
          })
          
          const pageWidth = 8.5
          const pageHeight = 11
          const margin = 0.5
          const maxWidth = pageWidth - (2 * margin)
          const maxHeight = pageHeight - (2 * margin)
          
          const imgWidth = img.width
          const imgHeight = img.height
          const imgAspectRatio = imgWidth / imgHeight
          const maxAspectRatio = maxWidth / maxHeight

          let finalWidth: number
          let finalHeight: number
          
          if (imgAspectRatio > maxAspectRatio) {
            finalWidth = maxWidth
            finalHeight = maxWidth / imgAspectRatio
          } else {
            finalWidth = maxHeight * imgAspectRatio
            finalHeight = maxHeight
          }
          
          const xPos = (pageWidth - finalWidth) / 2
          const yPos = (pageHeight - finalHeight) / 2

          pdf.addImage(url, 'JPEG', xPos, yPos, finalWidth, finalHeight)
          
          const pdfBlob = pdf.output('blob')
          URL.revokeObjectURL(url)
          resolve(pdfBlob)
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

  const processCandidate = async (candidateId: number): Promise<ConversionResult[]> => {
    const candidateResults: ConversionResult[] = []
    
    try {
      const response = await bullhornAPI.query(
        'Certification',
        `candidate.id=${candidateId}`,
        ['id', 'name', 'fileAttachments']
      )

      if (!response.data || response.data.length === 0) {
        return [{
          candidateId,
          certificationName: 'N/A',
          originalFileId: 0,
          originalFileName: 'N/A',
          status: 'error',
          message: 'No certifications found'
        }]
      }

      for (const cert of response.data) {
        const fileAttachmentsResponse = await bullhornAPI.query(
          'CertificationFileAttachment',
          `certification.id=${cert.id}`,
          ['id', 'name', 'contentType', 'type']
        )

        if (!fileAttachmentsResponse.data || fileAttachmentsResponse.data.length === 0) {
          candidateResults.push({
            candidateId,
            certificationName: cert.name || 'Unknown',
            originalFileId: 0,
            originalFileName: 'N/A',
            status: 'error',
            message: 'No file attachments found'
          })
          continue
        }

        for (const file of fileAttachmentsResponse.data) {
          if (!file.contentType?.startsWith('image/')) {
            candidateResults.push({
              candidateId,
              certificationName: cert.name || 'Unknown',
              originalFileId: file.id,
              originalFileName: file.name,
              status: 'error',
              message: 'Not an image file'
            })
            continue
          }

          try {
            const fileBlob = await bullhornAPI.downloadFile('CertificationFileAttachment', file.id)
            const pdfBlob = await convertImageToPDF(fileBlob, file.name)
            const pdfFileName = file.name.replace(/\.[^.]+$/, '.pdf')

            const uploadResponse = await bullhornAPI.uploadFile(
              'Certification',
              cert.id,
              pdfBlob,
              pdfFileName,
              'sample'
            )

            candidateResults.push({
              candidateId,
              certificationName: cert.name || 'Unknown',
              originalFileId: file.id,
              originalFileName: file.name,
              newFileId: uploadResponse?.changedEntityId,
              status: 'success',
              message: 'Converted and uploaded'
            })
          } catch (error) {
            candidateResults.push({
              candidateId,
              certificationName: cert.name || 'Unknown',
              originalFileId: file.id,
              originalFileName: file.name,
              status: 'error',
              message: error instanceof Error ? error.message : 'Unknown error'
            })
          }
        }
      }
    } catch (error) {
      candidateResults.push({
        candidateId,
        certificationName: 'N/A',
        originalFileId: 0,
        originalFileName: 'N/A',
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    return candidateResults
  }

  const handleProcess = async () => {
    const ids = parseIds(candidateIds)
    
    if (ids.length === 0) {
      toast.error('Please enter valid candidate IDs')
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setResults([])

    const allResults: ConversionResult[] = []

    for (let i = 0; i < ids.length; i++) {
      const candidateId = ids[i]
      const candidateResults = await processCandidate(candidateId)
      allResults.push(...candidateResults)
      setResults([...allResults])
      setProgress(((i + 1) / ids.length) * 100)
    }

    setIsProcessing(false)

    const successCount = allResults.filter(r => r.status === 'success').length
    const errorCount = allResults.filter(r => r.status === 'error').length

    onLog(
      'Certification File Conversion',
      errorCount === 0 ? 'success' : errorCount < allResults.length ? 'success' : 'error',
      `Processed ${ids.length} candidates: ${successCount} successful, ${errorCount} failed`,
      { candidateIds: ids, successCount, errorCount, results: allResults }
    )

    if (errorCount === 0) {
      toast.success(`Successfully converted all certification files`)
    } else if (successCount > 0) {
      toast.warning(`Converted ${successCount} files, ${errorCount} failed`)
    } else {
      toast.error('All conversions failed')
    }
  }

  const handleReset = () => {
    setCandidateIds('')
    setResults([])
    setProgress(0)
  }

  const successCount = results.filter(r => r.status === 'success').length
  const errorCount = results.filter(r => r.status === 'error').length

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <ImageIcon size={32} weight="duotone" className="text-primary" />
            <div>
              <CardTitle>Certification File Converter</CardTitle>
              <CardDescription>
                Convert certification image files to PDF format for candidates
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Instructions</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>Enter candidate IDs (one per line or comma-separated)</li>
                <li>Image files will be converted to PDF format</li>
                <li>Converted PDFs will be uploaded back to certifications</li>
                <li>Only image files (JPEG, PNG, etc.) will be processed</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="candidate-ids">Candidate IDs</Label>
            <textarea
              id="candidate-ids"
              className="w-full min-h-[120px] p-3 rounded-md border border-input bg-background text-foreground"
              placeholder="Enter candidate IDs (one per line or comma-separated)&#10;Example:&#10;12345&#10;67890&#10;11111"
              value={candidateIds}
              onChange={(e) => setCandidateIds(e.target.value)}
              disabled={isProcessing}
            />
            <p className="text-sm text-muted-foreground">
              {parseIds(candidateIds).length} candidate{parseIds(candidateIds).length !== 1 ? 's' : ''} to process
            </p>
          </div>

          <div className="flex gap-3">
            <Button 
              onClick={handleProcess} 
              disabled={isProcessing || parseIds(candidateIds).length === 0}
              className="gap-2"
            >
              <Play weight="fill" />
              {isProcessing ? 'Processing...' : 'Start Conversion'}
            </Button>
            <Button 
              onClick={handleReset} 
              variant="outline"
              disabled={isProcessing}
              className="gap-2"
            >
              <ArrowClockwise />
              Reset
            </Button>
          </div>

          {isProcessing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold">Conversion Results</h3>
                <Badge variant={errorCount === 0 ? 'default' : 'secondary'}>
                  {successCount} successful
                </Badge>
                {errorCount > 0 && (
                  <Badge variant="destructive">
                    {errorCount} failed
                  </Badge>
                )}
              </div>

              <ScrollArea className="h-[400px] rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Candidate ID</TableHead>
                      <TableHead>Certification</TableHead>
                      <TableHead>Original File</TableHead>
                      <TableHead>New File ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono">{result.candidateId}</TableCell>
                        <TableCell>{result.certificationName}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {result.originalFileName}
                          {result.originalFileId > 0 && (
                            <span className="text-muted-foreground ml-1">
                              (ID: {result.originalFileId})
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono">
                          {result.newFileId || '-'}
                        </TableCell>
                        <TableCell>
                          {result.status === 'success' ? (
                            <Badge variant="default" className="gap-1">
                              <CheckCircle size={14} />
                              Success
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle size={14} />
                              Error
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {result.message || '-'}
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
    </div>
  )
}
