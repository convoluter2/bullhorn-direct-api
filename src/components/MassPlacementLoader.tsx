import { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Upload, Download, Play, Pause, StopCircle, CheckCircle, 
  XCircle, Clock, Tray, Briefcase, CreditCard, ListChecks,
  FileText, Warning, Info
} from '@phosphor-icons/react'
import Papa from 'papaparse'
import { toast } from 'sonner'
import { bullhornAPI } from '@/lib/bullhorn-api'
import type { AuditLog } from '@/lib/types'

interface MassPlacementLoaderProps {
  onLog: (operation: string, status: 'success' | 'error', message: string, details?: any) => void
}

interface PlacementData {
  candidate: string
  jobOrder: string
  clientContact?: string
  salary: string
  salaryUnit: string
  employmentType: string
  dateBegin: string
  dateEnd?: string
  status?: string
  matchId?: string
  rateCardGroups?: RateCardGroupData[]
  [key: string]: any
}

interface RateCardGroupData {
  groupName: string
  externalID?: string
  rateCardLines?: RateCardLineData[]
  [key: string]: any
}

interface RateCardLineData {
  title: string
  earnCode?: string
  rate: string
  rateType?: string
  externalID?: string
  [key: string]: any
}

interface ProcessedRow {
  rowNumber: number
  placement: PlacementData
  referenceData: Record<string, any>
}

interface ProcessingResult {
  placementId?: number
  rateCardGroupId?: number
  rateCardLineId?: number
  matchId?: number
  rowNumber: number
  success: boolean
  error?: string
  data?: any
  referenceData?: Record<string, any>
}

interface ProcessingReport {
  placements: ProcessingResult[]
  rateCardGroups: ProcessingResult[]
  rateCardLines: ProcessingResult[]
  matchUpdates: ProcessingResult[]
  summary: {
    totalRows: number
    successful: number
    failed: number
    skipped: number
  }
}

type ProcessingStatus = 'idle' | 'validating' | 'dry-run' | 'processing' | 'paused' | 'completed' | 'error'

const formatDateToYYYYMMDD = (dateValue: any): string => {
  if (!dateValue) return ''
  
  let date: Date
  
  if (typeof dateValue === 'string') {
    const cleaned = dateValue.trim()
    date = new Date(cleaned)
  } else if (typeof dateValue === 'number') {
    date = new Date(dateValue)
  } else if (dateValue instanceof Date) {
    date = dateValue
  } else {
    return ''
  }
  
  if (isNaN(date.getTime())) {
    return ''
  }
  
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  
  return `${year}-${month}-${day}`
}

export function MassPlacementLoader({ onLog }: MassPlacementLoaderProps) {
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [processedData, setProcessedData] = useState<ProcessedRow[]>([])
  
  const [status, setStatus] = useState<ProcessingStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [currentPhase, setCurrentPhase] = useState('')
  const [speed, setSpeed] = useState<number>(3000)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [report, setReport] = useState<ProcessingReport | null>(null)
  
  const pausedRef = useRef(false)
  const abortRef = useRef(false)
  const [isPaused, setIsPaused] = useState(false)

  const generateTemplate = () => {
    const template = [
      [
        'candidate', 'jobOrder', 'clientContact', 'salary', 'salaryUnit', 
        'employmentType', 'dateBegin', 'dateEnd', 'status', 'matchId',
        'rateCardGroups', 'referenceField1', 'referenceField2'
      ],
      [
        '12345', '67890', '11111', '75000', 'Yearly', 
        'Contract', '2025-02-01', '2025-12-31', 'Placed', '99999',
        JSON.stringify([
          {
            groupName: 'Standard Rate Group',
            externalID: 'GROUP-001',
            rateCardLines: [
              { title: 'Regular Hours', earnCode: 'REG', rate: '50.00', rateType: 'Hourly', externalID: 'LINE-001' },
              { title: 'Overtime Hours', earnCode: 'OT', rate: '75.00', rateType: 'Hourly', externalID: 'LINE-002' }
            ]
          }
        ]),
        'Optional reference data',
        'More reference data'
      ]
    ]
    
    const csv = Papa.unparse(template)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mass-placement-template.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Template downloaded')
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setCsvFile(file)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows: ProcessedRow[] = results.data.map((row: any, index) => {
          const essentialFields = [
            'candidate', 'jobOrder', 'clientContact', 'salary', 'salaryUnit',
            'employmentType', 'dateBegin', 'dateEnd', 'status', 'matchId', 'rateCardGroups'
          ]
          
          const referenceData: Record<string, any> = {}
          const placementData: any = {}
          
          Object.keys(row).forEach(key => {
            if (essentialFields.includes(key)) {
              placementData[key] = row[key]
            } else {
              referenceData[key] = row[key]
            }
          })
          
          if (placementData.rateCardGroups && typeof placementData.rateCardGroups === 'string') {
            try {
              placementData.rateCardGroups = JSON.parse(placementData.rateCardGroups)
            } catch (error) {
              console.warn(`Row ${index + 2}: Failed to parse rateCardGroups JSON`, error)
              placementData.rateCardGroups = []
            }
          }
          
          if (placementData.dateBegin) {
            placementData.dateBegin = formatDateToYYYYMMDD(placementData.dateBegin)
          }
          if (placementData.dateEnd) {
            placementData.dateEnd = formatDateToYYYYMMDD(placementData.dateEnd)
          }

          return {
            rowNumber: index + 2,
            placement: placementData,
            referenceData
          }
        })
        
        setProcessedData(rows)
        toast.success(`Loaded ${rows.length} placement rows`)
      },
      error: (error) => {
        toast.error(`Failed to parse CSV file: ${error.message}`)
      }
    })
  }

  const validateData = async (): Promise<boolean> => {
    const errors: string[] = []
    
    if (processedData.length === 0) {
      errors.push('No placement data loaded')
    }

    processedData.forEach((row) => {
      const p = row.placement
      
      if (!p.candidate) errors.push(`Row ${row.rowNumber}: Missing candidate ID`)
      if (!p.jobOrder) errors.push(`Row ${row.rowNumber}: Missing job order ID`)
      if (!p.salary) errors.push(`Row ${row.rowNumber}: Missing salary`)
      if (!p.dateBegin) errors.push(`Row ${row.rowNumber}: Missing start date (dateBegin)`)
      
      if (p.dateBegin && !/^\d{4}-\d{2}-\d{2}$/.test(p.dateBegin)) {
        errors.push(`Row ${row.rowNumber}: dateBegin must be in YYYY-MM-DD format, got: ${p.dateBegin}`)
      }
      if (p.dateEnd && !/^\d{4}-\d{2}-\d{2}$/.test(p.dateEnd)) {
        errors.push(`Row ${row.rowNumber}: dateEnd must be in YYYY-MM-DD format, got: ${p.dateEnd}`)
      }
      
      if (p.rateCardGroups && Array.isArray(p.rateCardGroups)) {
        p.rateCardGroups.forEach((group: RateCardGroupData, gIndex: number) => {
          if (!group.groupName) {
            errors.push(`Row ${row.rowNumber}, Group ${gIndex + 1}: Missing groupName`)
          }
          
          if (group.rateCardLines && Array.isArray(group.rateCardLines)) {
            group.rateCardLines.forEach((line: RateCardLineData, lIndex: number) => {
              if (!line.title) {
                errors.push(`Row ${row.rowNumber}, Group ${gIndex + 1}, Line ${lIndex + 1}: Missing title`)
              }
              if (!line.rate) {
                errors.push(`Row ${row.rowNumber}, Group ${gIndex + 1}, Line ${lIndex + 1}: Missing rate`)
              }
              if (line.rate && isNaN(parseFloat(line.rate))) {
                errors.push(`Row ${row.rowNumber}, Group ${gIndex + 1}, Line ${lIndex + 1}: Invalid rate value`)
              }
            })
          }
        })
      }
    })

    setValidationErrors(errors)
    return errors.length === 0
  }

  const performDryRun = async () => {
    setStatus('dry-run')
    setProgress(0)
    setCurrentPhase('Performing dry run validation...')
    
    try {
      const isValid = await validateData()
      
      if (!isValid) {
        setStatus('error')
        toast.error('Validation failed. Please fix errors before proceeding.')
        return
      }

      const dryRunResults: string[] = []
      
      dryRunResults.push(`✓ ${processedData.length} placements ready to create`)
      
      let totalGroups = 0
      let totalLines = 0
      
      processedData.forEach(row => {
        if (row.placement.rateCardGroups && Array.isArray(row.placement.rateCardGroups)) {
          totalGroups += row.placement.rateCardGroups.length
          row.placement.rateCardGroups.forEach(group => {
            if (group.rateCardLines && Array.isArray(group.rateCardLines)) {
              totalLines += group.rateCardLines.length
            }
          })
        }
      })
      
      dryRunResults.push(`✓ ${totalGroups} rate card groups ready to create`)
      dryRunResults.push(`✓ ${totalLines} rate card lines ready to create`)
      
      const matchUpdates = processedData.filter(row => row.placement.matchId).length
      if (matchUpdates > 0) {
        dryRunResults.push(`✓ ${matchUpdates} matches will be updated to "Placed"`)
      }

      setStatus('idle')
      toast.success('Dry run completed successfully')
      onLog('Mass Placement Dry Run', 'success', 'Dry run validation passed', {
        placementCount: processedData.length,
        rateCardGroupCount: totalGroups,
        rateCardLineCount: totalLines,
        matchUpdateCount: matchUpdates,
        results: dryRunResults
      })
    } catch (error) {
      setStatus('error')
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Dry run failed: ${errorMessage}`)
      onLog('Mass Placement Dry Run', 'error', 'Dry run failed', { error: errorMessage })
    }
  }

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  const processData = async () => {
    pausedRef.current = false
    abortRef.current = false
    setIsPaused(false)
    setStatus('processing')
    setProgress(0)
    
    const processingReport: ProcessingReport = {
      placements: [],
      rateCardGroups: [],
      rateCardLines: [],
      matchUpdates: [],
      summary: {
        totalRows: processedData.length,
        successful: 0,
        failed: 0,
        skipped: 0
      }
    }

    try {
      const isValid = await validateData()
      if (!isValid) {
        throw new Error('Validation failed')
      }

      let totalOps = processedData.length
      processedData.forEach(row => {
        if (row.placement.rateCardGroups && Array.isArray(row.placement.rateCardGroups)) {
          totalOps += row.placement.rateCardGroups.length
          row.placement.rateCardGroups.forEach(group => {
            if (group.rateCardLines && Array.isArray(group.rateCardLines)) {
              totalOps += group.rateCardLines.length
            }
          })
        }
      })
      
      let completedOperations = 0

      setCurrentPhase('Creating placements and rate cards...')
      
      for (const row of processedData) {
        if (abortRef.current) {
          processingReport.summary.skipped++
          continue
        }

        while (pausedRef.current) {
          await delay(100)
        }

        try {
          const p = row.placement
          const apiPlacementData: any = {
            candidate: { id: parseInt(p.candidate) },
            jobOrder: { id: parseInt(p.jobOrder) },
            salary: parseFloat(p.salary),
            salaryUnit: p.salaryUnit,
            employmentType: p.employmentType,
            dateBegin: p.dateBegin,
            status: p.status || 'Placed'
          }

          if (p.clientContact) {
            apiPlacementData.clientContact = { id: parseInt(p.clientContact) }
          }

          if (p.dateEnd) {
            apiPlacementData.dateEnd = p.dateEnd
          }

          const result = await bullhornAPI.createEntity('Placement', apiPlacementData)
          
          if (result.changedEntityId) {
            const placementId = result.changedEntityId
            
            processingReport.placements.push({
              placementId,
              rowNumber: row.rowNumber,
              success: true,
              data: { ...apiPlacementData, id: placementId },
              referenceData: row.referenceData
            })
            processingReport.summary.successful++

            if (p.matchId) {
              try {
                await bullhornAPI.updateEntity('JobSubmission', parseInt(p.matchId), {
                  status: 'Placed'
                })
                processingReport.matchUpdates.push({
                  matchId: parseInt(p.matchId),
                  placementId,
                  rowNumber: row.rowNumber,
                  success: true
                })
              } catch (matchError) {
                processingReport.matchUpdates.push({
                  matchId: parseInt(p.matchId),
                  rowNumber: row.rowNumber,
                  success: false,
                  error: matchError instanceof Error ? matchError.message : 'Unknown error'
                })
              }
            }

            completedOperations++
            setProgress((completedOperations / totalOps) * 100)
            await delay(Math.max(speed, 50))

            if (p.rateCardGroups && Array.isArray(p.rateCardGroups)) {
              for (const group of p.rateCardGroups) {
                if (abortRef.current) break

                while (pausedRef.current) {
                  await delay(100)
                }

                try {
                  const groupData: any = {
                    placement: { id: placementId },
                    title: group.groupName
                  }

                  if (group.externalID) {
                    groupData.externalID = group.externalID
                  }

                  const groupResult = await bullhornAPI.createEntity('PlacementRateCardLineGroup', groupData)
                  
                  if (groupResult.changedEntityId) {
                    const groupId = groupResult.changedEntityId
                    
                    processingReport.rateCardGroups.push({
                      rateCardGroupId: groupId,
                      placementId,
                      rowNumber: row.rowNumber,
                      success: true,
                      data: { ...groupData, id: groupId }
                    })

                    completedOperations++
                    setProgress((completedOperations / totalOps) * 100)
                    await delay(Math.max(speed, 50))

                    if (group.rateCardLines && Array.isArray(group.rateCardLines)) {
                      for (const line of group.rateCardLines) {
                        if (abortRef.current) break

                        while (pausedRef.current) {
                          await delay(100)
                        }

                        try {
                          const lineData: any = {
                            placementRateCardLineGroup: { id: groupId },
                            title: line.title,
                            rate: parseFloat(line.rate)
                          }

                          if (line.earnCode) {
                            lineData.earnCode = line.earnCode
                          }
                          if (line.rateType) {
                            lineData.rateType = line.rateType
                          }
                          if (line.externalID) {
                            lineData.externalID = line.externalID
                          }

                          const lineResult = await bullhornAPI.createEntity('PlacementRateCardLine', lineData)
                          
                          if (lineResult.changedEntityId) {
                            processingReport.rateCardLines.push({
                              rateCardLineId: lineResult.changedEntityId,
                              rateCardGroupId: groupId,
                              rowNumber: row.rowNumber,
                              success: true,
                              data: { ...lineData, id: lineResult.changedEntityId }
                            })
                          } else {
                            throw new Error('No line ID returned')
                          }

                          completedOperations++
                          setProgress((completedOperations / totalOps) * 100)
                          await delay(Math.max(speed, 50))
                        } catch (lineError) {
                          const errorMessage = lineError instanceof Error ? lineError.message : 'Unknown error'
                          processingReport.rateCardLines.push({
                            rowNumber: row.rowNumber,
                            success: false,
                            error: errorMessage,
                            data: line
                          })
                          processingReport.summary.failed++
                          completedOperations++
                          setProgress((completedOperations / totalOps) * 100)
                        }
                      }
                    }
                  } else {
                    throw new Error('No group ID returned')
                  }
                } catch (groupError) {
                  const errorMessage = groupError instanceof Error ? groupError.message : 'Unknown error'
                  processingReport.rateCardGroups.push({
                    rowNumber: row.rowNumber,
                    success: false,
                    error: errorMessage,
                    data: group
                  })
                  processingReport.summary.failed++
                  completedOperations++
                  setProgress((completedOperations / totalOps) * 100)
                }
              }
            }
          } else {
            throw new Error('No placement ID returned')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          processingReport.placements.push({
            rowNumber: row.rowNumber,
            success: false,
            error: errorMessage,
            data: row.placement,
            referenceData: row.referenceData
          })
          processingReport.summary.failed++
          completedOperations++
          setProgress((completedOperations / totalOps) * 100)
        }
      }

      setReport(processingReport)
      setStatus('completed')
      setProgress(100)
      
      toast.success(`Processing complete! ${processingReport.summary.successful} successful, ${processingReport.summary.failed} failed`)
      onLog('Mass Placement Load', 'success', 'Mass placement processing completed', {
        ...processingReport.summary,
        report: processingReport
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setStatus('error')
      toast.error(`Processing failed: ${errorMessage}`)
      onLog('Mass Placement Load', 'error', 'Processing failed', { 
        error: errorMessage,
        report: processingReport
      })
    }
  }

  const handlePause = () => {
    pausedRef.current = true
    setIsPaused(true)
    setStatus('paused')
    toast.info('Processing paused')
  }

  const handleResume = () => {
    pausedRef.current = false
    setIsPaused(false)
    setStatus('processing')
    toast.success('Processing resumed')
  }

  const handleStop = () => {
    abortRef.current = true
    pausedRef.current = false
    setStatus('idle')
    toast.warning('Processing stopped')
  }

  const downloadReport = () => {
    if (!report) return

    const reportLines: string[] = []
    reportLines.push('MASS PLACEMENT PROCESSING REPORT')
    reportLines.push('=' .repeat(80))
    reportLines.push('')
    reportLines.push(`Total Rows: ${report.summary.totalRows}`)
    reportLines.push(`Successful: ${report.summary.successful}`)
    reportLines.push(`Failed: ${report.summary.failed}`)
    reportLines.push(`Skipped: ${report.summary.skipped}`)
    reportLines.push('')
    reportLines.push('=' .repeat(80))
    reportLines.push('')

    if (report.placements.length > 0) {
      reportLines.push('PLACEMENTS')
      reportLines.push('-'.repeat(80))
      report.placements.forEach(p => {
        reportLines.push(`Row ${p.rowNumber}: ${p.success ? '✓ SUCCESS' : '✗ FAILED'}`)
        if (p.placementId) reportLines.push(`  Placement ID: ${p.placementId}`)
        if (p.error) reportLines.push(`  Error: ${p.error}`)
        reportLines.push('')
      })
    }

    if (report.matchUpdates.length > 0) {
      reportLines.push('MATCH UPDATES')
      reportLines.push('-'.repeat(80))
      report.matchUpdates.forEach(m => {
        reportLines.push(`Row ${m.rowNumber}: ${m.success ? '✓ SUCCESS' : '✗ FAILED'}`)
        if (m.matchId) reportLines.push(`  Match ID: ${m.matchId}`)
        if (m.placementId) reportLines.push(`  Placement ID: ${m.placementId}`)
        if (m.error) reportLines.push(`  Error: ${m.error}`)
        reportLines.push('')
      })
    }

    if (report.rateCardGroups.length > 0) {
      reportLines.push('RATE CARD GROUPS')
      reportLines.push('-'.repeat(80))
      report.rateCardGroups.forEach(g => {
        reportLines.push(`Row ${g.rowNumber}: ${g.success ? '✓ SUCCESS' : '✗ FAILED'}`)
        if (g.rateCardGroupId) reportLines.push(`  Group ID: ${g.rateCardGroupId}`)
        if (g.placementId) reportLines.push(`  Placement ID: ${g.placementId}`)
        if (g.error) reportLines.push(`  Error: ${g.error}`)
        reportLines.push('')
      })
    }

    if (report.rateCardLines.length > 0) {
      reportLines.push('RATE CARD LINES')
      reportLines.push('-'.repeat(80))
      report.rateCardLines.forEach(l => {
        reportLines.push(`Row ${l.rowNumber}: ${l.success ? '✓ SUCCESS' : '✗ FAILED'}`)
        if (l.rateCardLineId) reportLines.push(`  Line ID: ${l.rateCardLineId}`)
        if (l.rateCardGroupId) reportLines.push(`  Group ID: ${l.rateCardGroupId}`)
        if (l.error) reportLines.push(`  Error: ${l.error}`)
        reportLines.push('')
      })
    }

    const reportText = reportLines.join('\n')
    const blob = new Blob([reportText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mass-placement-report-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Report downloaded')
  }

  const isProcessing = status === 'processing' || status === 'paused'
  const canStart = processedData.length > 0 && !isProcessing

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Briefcase size={24} className="text-accent" />
                Mass Placement Loader
              </CardTitle>
              <CardDescription>
                Create placements, update matches, and create rate cards in bulk from a single CSV file with embedded arrays
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={generateTemplate}>
              <Download size={16} />
              Download Template
            </Button>
                    <li><strong>Required fields:</strong> candidate, jobOrder, salary, salaryUnit, employmentType, dateBegin (YYYY-MM-DD)</li>
                    <li><strong>Optional fields:</strong> clientContact, dateEnd (YYYY-MM-DD), status, matchId</li>
                    <li><strong>rateCardGroups:</strong> JSON array with groupName, externalID, and nested rateCardLines array</li>
          <div className="space-y-4">>
            <Alert>ormat</strong> or they will be rejected by the API</li>
              <Info size={16} />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-semibold">CSV Format:</div>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li><strong>Required fields:</strong> candidate, jobOrder, salary, salaryUnit, employmentType, dateBegin (YYYY-MM-DD)</li>
                    <li><strong>Optional fields:</strong> clientContact, dateEnd (YYYY-MM-DD), status, matchId</li>
                    <li><strong>rateCardGroups:</strong> JSON array with groupName, externalID, and nested rateCardLines array</li>
                    <li><strong>All other fields</strong> will be stored as reference data in logs</li>
                    <li><strong>Dates MUST be YYYY-MM-DD format</strong> or they will be rejected by the API</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
={handleFileUpload}
                <Badge variant="secondary" className="mt-2">
              <Label htmlFor="csv-file" className="flex items-center gap-2">
                <Upload size={16} />
                Upload CSV File
            </div>
          </div>
                id="csv-file"
          <Separator />

                onChange={handleFileUpload}
            <Label htmlFor="speed">Processing Speed (ms between requests, min 50ms for 3000/min rate limit)</Label>
            <div className="flex items-center gap-4">
              {csvFile && (
                value={speed.toString()}
                  {processedData.length} rows loaded
                disabled={isProcessing}
              >
                <SelectTrigger id="speed" className="w-full">
          </div>

          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <Warning size={16} />
              <AlertDescription>
                <div className="font-semibold mb-2">Validation Errors:</div>
                <ScrollArea className="h-32">
                  <ul className="list-disc list-inside space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index} className="text-sm">{error}</li>
                    ))}
                  </ul>
                </ScrollArea>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-4">
            <Button
              onClick={performDryRun}
              disabled={!canStart || status === 'dry-run'}
              variant="outline"
            >
              <ListChecks size={18} />
              Dry Run
            </Button>

            {status !== 'processing' && status !== 'paused' ? (
              <Button
                onClick={processData}
                disabled={!canStart}
              >
                <Play size={18} />
                Start Processing
              </Button>
            ) : (
              <>
                {!isPaused ? (
                  <Button onClick={handlePause} variant="outline">
                    <Pause size={18} />
                    Pause
                  </Button>
                ) : (
                  <Button onClick={handleResume}>
                    <Play size={18} />
                    Resume
                  </Button>
                )}
                <Button onClick={handleStop} variant="destructive">
                  <StopCircle size={18} />
                  Stop
                </Button>
              </>
            )}

            {report && (
              <Button onClick={downloadReport} variant="outline">
                <FileText size={18} />
                Download Report
              </Button>
            )}
          </div>

          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{currentPhase}</span>
                <span className="font-mono">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {status === 'completed' && report && (
            <Alert>
              <CheckCircle size={16} className="text-green-500" />
              <AlertDescription>
                <div className="font-semibold mb-2">Processing Complete</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Placements</div>
                    <div className="font-semibold">{report.placements.filter(p => p.success).length}/{report.placements.length}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Match Updates</div>
                    <div className="font-semibold">{report.matchUpdates.filter(m => m.success).length}/{report.matchUpdates.length}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Rate Card Groups</div>
                    <div className="font-semibold">{report.rateCardGroups.filter(g => g.success).length}/{report.rateCardGroups.length}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Rate Card Lines</div>
                    <div className="font-semibold">{report.rateCardLines.filter(l => l.success).length}/{report.rateCardLines.length}</div>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {report && (
        <Card>
          <CardHeader>
            <CardTitle>Processing Report</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="placements">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="placements">
                  Placements ({report.placements.length})
                </TabsTrigger>
                <TabsTrigger value="matches">
                  Matches ({report.matchUpdates.length})
                </TabsTrigger>
                <TabsTrigger value="groups">
                  Groups ({report.rateCardGroups.length})
                </TabsTrigger>
                <TabsTrigger value="lines">
                  Lines ({report.rateCardLines.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="placements" className="space-y-2">
                <ScrollArea className="h-96">
                  {report.placements.map((p, index) => (
                    <div key={index} className="flex items-start justify-between border-b py-2">
                      <div className="flex items-center gap-2">
                        {p.success ? (
                          <CheckCircle size={16} className="text-green-500" />
                        ) : (
                          <XCircle size={16} className="text-red-500" />
                        )}
                        <div>
                          <div className="font-semibold text-sm">Row {p.rowNumber}</div>
                          {p.placementId && (
                            <div className="text-xs text-muted-foreground">
                              Placement ID: {p.placementId}
                            </div>
                          )}
                          {p.error && (
                            <div className="text-xs text-red-500">{p.error}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="matches" className="space-y-2">
                <ScrollArea className="h-96">
                  {report.matchUpdates.map((m, index) => (
                    <div key={index} className="flex items-start justify-between border-b py-2">
                      <div className="flex items-center gap-2">
                        {m.success ? (
                          <CheckCircle size={16} className="text-green-500" />
                        ) : (
                          <XCircle size={16} className="text-red-500" />
                        )}
                        <div>
                          <div className="font-semibold text-sm">Row {m.rowNumber}</div>
                          {m.matchId && (
                            <div className="text-xs text-muted-foreground">
                              Match ID: {m.matchId} → Placement ID: {m.placementId}
                            </div>
                          )}
                          {m.error && (
                            <div className="text-xs text-red-500">{m.error}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="groups" className="space-y-2">
                <ScrollArea className="h-96">
                  {report.rateCardGroups.map((g, index) => (
                    <div key={index} className="flex items-start justify-between border-b py-2">
                      <div className="flex items-center gap-2">
                        {g.success ? (
                          <CheckCircle size={16} className="text-green-500" />
                        ) : (
                          <XCircle size={16} className="text-red-500" />
                        )}
                        <div>
                          <div className="font-semibold text-sm">Row {g.rowNumber}</div>
                          {g.rateCardGroupId && (
                            <div className="text-xs text-muted-foreground">
                              Group ID: {g.rateCardGroupId} → Placement ID: {g.placementId}
                            </div>
                          )}
                          {g.error && (
                            <div className="text-xs text-red-500">{g.error}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="lines" className="space-y-2">
                <ScrollArea className="h-96">
                  {report.rateCardLines.map((l, index) => (
                    <div key={index} className="flex items-start justify-between border-b py-2">
                      <div className="flex items-center gap-2">
                        {l.success ? (
                          <CheckCircle size={16} className="text-green-500" />
                        ) : (
                          <XCircle size={16} className="text-red-500" />
                        )}
                        <div>
                          <div className="font-semibold text-sm">Row {l.rowNumber}</div>
                          {l.rateCardLineId && (
                            <div className="text-xs text-muted-foreground">
                              Line ID: {l.rateCardLineId} → Group ID: {l.rateCardGroupId}
                            </div>
                          )}
                          {l.error && (
                            <div className="text-xs text-red-500">{l.error}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
