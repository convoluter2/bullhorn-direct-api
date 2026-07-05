import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/pro
import { ScrollArea } from '@/components/ui/scroll-
import { Separator } from '@/components/ui/separator'
  FileArrowDown, 
  FilePdf, 
  CheckCircle, 
  Info, 
  Pause,
} from '@
import { bullhorn

  onLog: (o

  fileAttachmen
  candidate
  messag
  origi
  conver
  error?: string
}
export function CertificationF
  const [isProcessing, setIsProcessing] = useSta
  const [progress, setPro

  const [estimatedTimeRemaining, setEstimat
  const pauseRef = useRef(false)


      .map(id => id.trim())
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
            throw new Error('Could

    



            xPos,
            finalWid
            undefined,
          )
          const pdfBlob = pdf.output('blob')

          
      
            compressionRat
          })
          resolve({ blob: pdfBlob, comp
          URL.revokeObjectURL(url)
        }

        URL.revokeObjectURL(url)

      img.src = url
  }
  const processFileAtta
    retryCount: number = 0
    const MAX_RETRIES = 2
    try {

        'CandidateCertificationFileA
        ['id', 'name', 'fileType', 'co



      const candidateId = attachment.candidate?.id

      }
      const fileName = attachment.name || 'fil
      const fileSize = attachment.fileSize || 0
      conso

        fileSize,
        candidateId

      if (!imageTypes.includes(fileType.toLowerCase())) {
          fileAttachmentId,
          candidateId,
          error: `File type ${fileType

        }

      const fileBlob = await bullhornAPI
        certificationId,
      )
      console.log('🔄 Converting image to

      const p
      conso

        fileAttachmentId


        certificationId,
        'SAMPLE',
      )
      conso

        compressionRatio: compressi
      })
      return {

        status: 'success',

        originalFileTyp
        compressionRat
      }
    } catch (erro
      console.err
      if (retryCount < 
        await new Promis
      }
      return {
        cer

        retryCount
    }

    const ids = parseFileAttachmen
    if (id
      return


    setIsPaused(false)
    setCurrentIndex(0)
    pauseRef

      fileAttachmentId: id,
      candidateId: 0,
    }))

      fil



      if (abortRef.current) {
        break



      


        idx === i ? { ...r, status: 'pr


        idx === i ? result : r


      } e
        errors.push({ id: ids[i], error: result.error || 'Unknown error' })

      const progressPercent = ((i + 1) / ids.length) 

        const elapsed = D
        const remaining = (ids.length - (i + 1)) * avgTimePerFile
      }

    setProgress(100)

      t

    }
    console.log('✅ Conversion complete:', summary)

        'Certification File Conversion',
        `Successfully converted ${successCount} of ${ids.length}
      )

        'Certification File Conversion',
        `All ${ids.length} file conversions failed`,
      )


    pauseRef.current = !pause
    
      toast.info(
      toast.info(
  }
  const handleReset
    setI

    setStartTime(null)
    pauseRef.current = false
    toast.info('

    if (bytes === 0) retur
    const sizes = ['B'
    return Math.round((byt

    const seconds = Math.floor(ms / 1
    const hours = Math.floor(minutes 
    if (hours > 0) {
    } els
    } e


  const errorCount = results.filter(r => r.status === 
  const processingCount = results
  return (
      <CardHeader>
       

              Convert candidate certification imag
          </div>

        <Alert>
          <AlertTitle>How it works</AlertTitle>

              standard 8.5" x 11" PDFs with maximu
            </p>
              <li>Supports: JPG, 
              <li>Automa
              <li>Full e
       

          <Label htmlFor="file-attachment-ids">
          </Label>
            id="file-attachment-i
            value={fileA
            disa
            class
          <p className="text-sm text
       

          <Button
            disabled={isP
          >
            Start Conversion

            <Button
        

              
                  Resume
              ) : (
                  <P
                </>
            </Button>

            onClick={handleReset}
            disabled={isProcessing 
          >
            Reset
        </div>
       

                Proce
              <span className="text-muted-foreground">
              </span>

              <p className="text-sm text-muted-foreground text-center">
              </p>
            {isPaused && (
                <Pause size={18} />
       

            )}
        )}
        {results.length > 0
            <Separator 
            <div classNa
                <CheckCircle
              </Ba
       
     
   

              )}
                <Badge variant="outline" className="gap-2

            </div>
            <ScrollArea className="h-[400px] rounded-md border">
            
     

                    <TableHead className="text-right">Original Size</TableHe

                  </Table
                <Table
                  
                      
                      <Table
                          <B
                            

                          <Badge variant="destructive" classNam
                           
                        )
                     
                       
       
                          <Bad

                        {result.originalFileName || '-'}
                      <Table
      

                        
                      
                      </TableCell>

                      <TableCell className
                          <sp
                          </span>
             
       

                        ) : '-'}
                    </TableRow>
       

        )}
    </Card>
}




































































































































































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
