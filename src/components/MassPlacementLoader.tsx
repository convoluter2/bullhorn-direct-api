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

interface PlacementRow {
  rowNumber: number
  candidate: string
  jobOrder: string
  clientContact: string
  salary: string
  salaryUnit: string
  employmentType: string
  startDate: string
  endDate?: string
  status: string
  matchId?: string
  [key: string]: any
}

interface RateCardGroupRow {
  rowNumber: number
  placementIdentifier: string
  groupName: string
  externalID?: string
  [key: string]: any
}

interface RateCardLineRow {
  rowNumber: number
  groupIdentifier: string
  externalID?: string
  title: string
  earnCode: string
  rate: string
  rateType: string
  [key: string]: any
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

export function MassPlacementLoader({ onLog }: MassPlacementLoaderProps) {
  const [placementFile, setPlacementFile] = useState<File | null>(null)
  const [rateCardGroupFile, setRateCardGroupFile] = useState<File | null>(null)
  const [rateCardLineFile, setRateCardLineFile] = useState<File | null>(null)
  
  const [placementData, setPlacementData] = useState<PlacementRow[]>([])
  const [rateCardGroupData, setRateCardGroupData] = useState<RateCardGroupRow[]>([])
  const [rateCardLineData, setRateCardLineData] = useState<RateCardLineRow[]>([])
  
  const [status, setStatus] = useState<ProcessingStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [currentPhase, setCurrentPhase] = useState('')
  const [speed, setSpeed] = useState<number>(3000)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [report, setReport] = useState<ProcessingReport | null>(null)
  
  const pausedRef = useRef(false)
  const abortRef = useRef(false)
  const [isPaused, setIsPaused] = useState(false)

  const generatePlacementTemplate = () => {
    const template = [
      ['candidate', 'jobOrder', 'clientContact', 'salary', 'salaryUnit', 'employmentType', 'startDate', 'endDate', 'status', 'matchId', 'customText1', 'customText2'],
      ['12345', '67890', '11111', '75000', 'Yearly', 'Contract', '2025-02-01', '2025-12-31', 'Placed', '99999', 'Optional Field', 'Another Optional']
    ]
    
    const csv = Papa.unparse(template)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'placement-template.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Placement template downloaded')
  }

  const generateRateCardGroupTemplate = () => {
    const template = [
      ['placementIdentifier', 'groupName', 'externalID'],
      ['12345', 'Standard Rate Group', 'EXT-001']
    ]
    
    const csv = Papa.unparse(template)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'rate-card-group-template.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Rate Card Group template downloaded')
  }

  const generateRateCardLineTemplate = () => {
    const template = [
      ['groupIdentifier', 'title', 'earnCode', 'rate', 'rateType', 'externalID'],
      ['EXT-001', 'Regular Hours', 'REG', '50.00', 'Hourly', 'LINE-001'],
      ['EXT-001', 'Overtime Hours', 'OT', '75.00', 'Hourly', 'LINE-002']
    ]
    
    const csv = Papa.unparse(template)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'rate-card-line-template.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Rate Card Line template downloaded')
  }

  const handlePlacementFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setPlacementFile(file)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data.map((row: any, index) => ({
          rowNumber: index + 2,
          ...row
        })) as PlacementRow[]
        setPlacementData(rows)
        toast.success(`Loaded ${rows.length} placement rows`)
      },
      error: (error) => {
        toast.error(`Failed to parse placement file: ${error.message}`)
      }
    })
  }

  const handleRateCardGroupFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setRateCardGroupFile(file)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data.map((row: any, index) => ({
          rowNumber: index + 2,
          ...row
        })) as RateCardGroupRow[]
        setRateCardGroupData(rows)
        toast.success(`Loaded ${rows.length} rate card group rows`)
      },
      error: (error) => {
        toast.error(`Failed to parse rate card group file: ${error.message}`)
      }
    })
  }

  const handleRateCardLineFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setRateCardLineFile(file)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data.map((row: any, index) => ({
          rowNumber: index + 2,
          ...row
        })) as RateCardLineRow[]
        setRateCardLineData(rows)
        toast.success(`Loaded ${rows.length} rate card line rows`)
      },
      error: (error) => {
        toast.error(`Failed to parse rate card line file: ${error.message}`)
      }
    })
  }

  const validateData = async (): Promise<boolean> => {
    const errors: string[] = []
    
    if (placementData.length === 0) {
      errors.push('No placement data loaded')
    }

    placementData.forEach((row) => {
      if (!row.candidate) errors.push(`Row ${row.rowNumber}: Missing candidate ID`)
      if (!row.jobOrder) errors.push(`Row ${row.rowNumber}: Missing job order ID`)
      if (!row.salary) errors.push(`Row ${row.rowNumber}: Missing salary`)
      if (!row.startDate) errors.push(`Row ${row.rowNumber}: Missing start date`)
      
      if (row.startDate && isNaN(Date.parse(row.startDate))) {
        errors.push(`Row ${row.rowNumber}: Invalid start date format`)
      }
      if (row.endDate && isNaN(Date.parse(row.endDate))) {
        errors.push(`Row ${row.rowNumber}: Invalid end date format`)
      }
    })

    rateCardGroupData.forEach((row) => {
      if (!row.placementIdentifier) {
        errors.push(`Rate Card Group Row ${row.rowNumber}: Missing placement identifier`)
      }
      if (!row.groupName) {
        errors.push(`Rate Card Group Row ${row.rowNumber}: Missing group name`)
      }
    })

    rateCardLineData.forEach((row) => {
      if (!row.groupIdentifier) {
        errors.push(`Rate Card Line Row ${row.rowNumber}: Missing group identifier`)
      }
      if (!row.title) {
        errors.push(`Rate Card Line Row ${row.rowNumber}: Missing title`)
      }
      if (!row.rate) {
        errors.push(`Rate Card Line Row ${row.rowNumber}: Missing rate`)
      }
      if (row.rate && isNaN(parseFloat(row.rate))) {
        errors.push(`Rate Card Line Row ${row.rowNumber}: Invalid rate value`)
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
      
      dryRunResults.push(`✓ ${placementData.length} placements ready to create`)
      dryRunResults.push(`✓ ${rateCardGroupData.length} rate card groups ready to create`)
      dryRunResults.push(`✓ ${rateCardLineData.length} rate card lines ready to create`)
      
      const matchUpdates = placementData.filter(p => p.matchId).length
      if (matchUpdates > 0) {
        dryRunResults.push(`✓ ${matchUpdates} matches will be updated to "Placed"`)
      }

      setStatus('idle')
      toast.success('Dry run completed successfully')
      onLog('Mass Placement Dry Run', 'success', 'Dry run validation passed', {
        placementCount: placementData.length,
        rateCardGroupCount: rateCardGroupData.length,
        rateCardLineCount: rateCardLineData.length,
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
        totalRows: placementData.length,
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

      const totalOperations = placementData.length + rateCardGroupData.length + rateCardLineData.length
      let completedOperations = 0

      const placementMap = new Map<string, number>()

      setCurrentPhase('Creating placements...')
      for (const row of placementData) {
        if (abortRef.current) {
          processingReport.summary.skipped++
          continue
        }

        while (pausedRef.current) {
          await delay(100)
        }

        try {
          const placementData: any = {
            candidate: { id: parseInt(row.candidate) },
            jobOrder: { id: parseInt(row.jobOrder) },
            salary: parseFloat(row.salary),
            salaryUnit: row.salaryUnit,
            employmentType: row.employmentType,
            dateBegin: new Date(row.startDate).getTime(),
            status: row.status || 'Placed'
          }

          if (row.clientContact) {
            placementData.clientContact = { id: parseInt(row.clientContact) }
          }

          if (row.endDate) {
            placementData.dateEnd = new Date(row.endDate).getTime()
          }

          Object.keys(row).forEach(key => {
            if (!['rowNumber', 'candidate', 'jobOrder', 'clientContact', 'salary', 'salaryUnit', 
                  'employmentType', 'startDate', 'endDate', 'status', 'matchId'].includes(key)) {
              placementData[key] = row[key]
            }
          })

          const result = await bullhornAPI.createEntity('Placement', placementData)
          
          if (result.changedEntityId) {
            const placementId = result.changedEntityId
            placementMap.set(row.candidate + '-' + row.jobOrder, placementId)
            
            processingReport.placements.push({
              placementId,
              rowNumber: row.rowNumber,
              success: true,
              data: { ...placementData, id: placementId }
            })
            processingReport.summary.successful++

            if (row.matchId) {
              try {
                await bullhornAPI.updateEntity('JobSubmission', parseInt(row.matchId), {
                  status: 'Placed'
                })
                processingReport.matchUpdates.push({
                  matchId: parseInt(row.matchId),
                  placementId,
                  rowNumber: row.rowNumber,
                  success: true
                })
              } catch (matchError) {
                processingReport.matchUpdates.push({
                  matchId: parseInt(row.matchId),
                  rowNumber: row.rowNumber,
                  success: false,
                  error: matchError instanceof Error ? matchError.message : 'Unknown error'
                })
              }
            }
          } else {
            throw new Error('No placement ID returned')
          }

          completedOperations++
          setProgress((completedOperations / totalOperations) * 100)

          await delay(Math.max(speed, 3000 / 60))
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          processingReport.placements.push({
            rowNumber: row.rowNumber,
            success: false,
            error: errorMessage,
            data: row
          })
          processingReport.summary.failed++
          completedOperations++
          setProgress((completedOperations / totalOperations) * 100)
        }
      }

      setCurrentPhase('Creating rate card groups...')
      const groupMap = new Map<string, number>()
      
      for (const row of rateCardGroupData) {
        if (abortRef.current) {
          processingReport.summary.skipped++
          continue
        }

        while (pausedRef.current) {
          await delay(100)
        }

        try {
          const placementId = placementMap.get(row.placementIdentifier)
          if (!placementId) {
            throw new Error(`Placement not found for identifier: ${row.placementIdentifier}`)
          }

          const groupData: any = {
            placement: { id: placementId },
            title: row.groupName
          }

          if (row.externalID) {
            groupData.externalID = row.externalID
          }

          const result = await bullhornAPI.createEntity('PlacementRateCardLineGroup', groupData)
          
          if (result.changedEntityId) {
            const groupId = result.changedEntityId
            groupMap.set(row.externalID || row.groupName, groupId)
            
            processingReport.rateCardGroups.push({
              rateCardGroupId: groupId,
              placementId,
              rowNumber: row.rowNumber,
              success: true,
              data: { ...groupData, id: groupId }
            })
          } else {
            throw new Error('No group ID returned')
          }

          completedOperations++
          setProgress((completedOperations / totalOperations) * 100)

          await delay(Math.max(speed, 3000 / 60))
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          processingReport.rateCardGroups.push({
            rowNumber: row.rowNumber,
            success: false,
            error: errorMessage,
            data: row
          })
          processingReport.summary.failed++
          completedOperations++
          setProgress((completedOperations / totalOperations) * 100)
        }
      }

      setCurrentPhase('Creating rate card lines...')
      for (const row of rateCardLineData) {
        if (abortRef.current) {
          processingReport.summary.skipped++
          continue
        }

        while (pausedRef.current) {
          await delay(100)
        }

        try {
          const groupId = groupMap.get(row.groupIdentifier)
          if (!groupId) {
            throw new Error(`Group not found for identifier: ${row.groupIdentifier}`)
          }

          const lineData: any = {
            placementRateCardLineGroup: { id: groupId },
            title: row.title,
            earnCode: row.earnCode,
            rate: parseFloat(row.rate),
            rateType: row.rateType
          }

          if (row.externalID) {
            lineData.externalID = row.externalID
          }

          const result = await bullhornAPI.createEntity('PlacementRateCardLine', lineData)
          
          if (result.changedEntityId) {
            processingReport.rateCardLines.push({
              rateCardLineId: result.changedEntityId,
              rateCardGroupId: groupId,
              rowNumber: row.rowNumber,
              success: true,
              data: { ...lineData, id: result.changedEntityId }
            })
          } else {
            throw new Error('No line ID returned')
          }

          completedOperations++
          setProgress((completedOperations / totalOperations) * 100)

          await delay(Math.max(speed, 3000 / 60))
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          processingReport.rateCardLines.push({
            rowNumber: row.rowNumber,
            success: false,
            error: errorMessage,
            data: row
          })
          processingReport.summary.failed++
          completedOperations++
          setProgress((completedOperations / totalOperations) * 100)
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
  const canStart = placementData.length > 0 && !isProcessing

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
                Create placements, update matches, and create rate cards in bulk with parallel processing
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={generatePlacementTemplate}>
                <Download size={16} />
                Placement Template
              </Button>
              <Button variant="outline" size="sm" onClick={generateRateCardGroupTemplate}>
                <Download size={16} />
                Group Template
              </Button>
              <Button variant="outline" size="sm" onClick={generateRateCardLineTemplate}>
                <Download size={16} />
                Line Template
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="placement-file" className="flex items-center gap-2">
                <Briefcase size={16} />
                Placement Data
              </Label>
              <Input
                id="placement-file"
                type="file"
                accept=".csv"
                onChange={handlePlacementFileUpload}
                disabled={isProcessing}
              />
              {placementFile && (
                <Badge variant="secondary" className="mt-2">
                  {placementData.length} rows loaded
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="group-file" className="flex items-center gap-2">
                <Tray size={16} />
                Rate Card Groups
              </Label>
              <Input
                id="group-file"
                type="file"
                accept=".csv"
                onChange={handleRateCardGroupFileUpload}
                disabled={isProcessing}
              />
              {rateCardGroupFile && (
                <Badge variant="secondary" className="mt-2">
                  {rateCardGroupData.length} rows loaded
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="line-file" className="flex items-center gap-2">
                <CreditCard size={16} />
                Rate Card Lines
              </Label>
              <Input
                id="line-file"
                type="file"
                accept=".csv"
                onChange={handleRateCardLineFileUpload}
                disabled={isProcessing}
              />
              {rateCardLineFile && (
                <Badge variant="secondary" className="mt-2">
                  {rateCardLineData.length} rows loaded
                </Badge>
              )}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="speed">Processing Speed (ms between requests, min 50ms for 3000/min rate limit)</Label>
            <div className="flex items-center gap-4">
              <Select
                value={speed.toString()}
                onValueChange={(value) => setSpeed(parseInt(value))}
                disabled={isProcessing}
              >
                <SelectTrigger id="speed" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">Maximum (50ms - 1200/min)</SelectItem>
                  <SelectItem value="100">Fast (100ms - 600/min)</SelectItem>
                  <SelectItem value="200">Normal (200ms - 300/min)</SelectItem>
                  <SelectItem value="500">Slow (500ms - 120/min)</SelectItem>
                  <SelectItem value="1000">Very Slow (1000ms - 60/min)</SelectItem>
                </SelectContent>
              </Select>
              <Badge variant="outline">~{Math.floor(60000 / Math.max(speed, 50))} req/min</Badge>
            </div>
            <Alert>
              <Info size={16} />
              <AlertDescription>
                Rate limiting enforced at 3000 requests/minute minimum (50ms between requests). 
                Processing adapts based on API response times.
              </AlertDescription>
            </Alert>
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
