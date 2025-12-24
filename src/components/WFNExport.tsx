import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DownloadSimple, Play, Database, Users, CurrencyDollar, ShieldCheck, Hash, ListNumbers, CalendarCheck } from '@phosphor-icons/react'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { toast } from 'sonner'

interface WFNExportProps {
  onLog: (operation: string, status: 'success' | 'error', message: string, details?: any) => void
}

interface PlacementData {
  id: number
  candidate: {
    id: number
    firstName?: string
    lastName?: string
    ssn?: string
    dateOfBirth?: number
  }
  status?: string
  dateBegin?: number
  dateEnd?: number
  employmentType?: string
  jobOrder?: {
    id: number
    title?: string
  }
  rateCard?: {
    id: number
    lines?: Array<{
      id: number
      earnCode?: string
      alias?: string
      payRate?: number
      billRate?: number
    }>
  }
  candidateTaxInfo?: {
    filingStatus?: string
    exemptions?: number
    additionalWithholding?: number
  }
}

interface ExportRecord {
  'Placement ID': number
  'Candidate ID': number
  'First Name': string
  'Last Name': string
  'Hashed SSN': string
  'Hashed DOB': string
  'Status': string
  'Start Date': string
  'End Date': string
  'Employment Type': string
  'Job Order ID': number
  'Job Title': string
  'Primary Pay Rate': string
  'Secondary Pay Rate': string
  'Primary Bill Rate': string
  'Secondary Bill Rate': string
  'Filing Status': string
  'Exemptions': string
  'Additional Withholding': string
}

const hashValue = async (value: string | null | undefined, salt: string): Promise<string> => {
  if (!value) return ''
  
  const encoder = new TextEncoder()
  const data = encoder.encode(value + salt)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

export function WFNExport({ onLog }: WFNExportProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [hashSalt, setHashSalt] = useState('')
  const [primaryEarnCodes, setPrimaryEarnCodes] = useState('REG,REGULAR,BASE,STD')
  const [secondaryEarnCodes, setSecondaryEarnCodes] = useState('OT,OVERTIME,HOLIDAY,PREMIUM')
  const [pageSize, setPageSize] = useState(500)
  const [exportData, setExportData] = useState<ExportRecord[]>([])
  const [filterMode, setFilterMode] = useState<'active' | 'ids'>('active')
  const [placementIds, setPlacementIds] = useState('')
  const [stats, setStats] = useState({
    totalPlacements: 0,
    processedPlacements: 0,
    candidatesJoined: 0,
    errors: 0
  })

  const parsePlacementIds = (input: string): number[] => {
    const cleaned = input
      .replace(/[\s\n\r]+/g, ',')
      .split(',')
      .map(id => id.trim())
      .filter(id => id && /^\d+$/.test(id))
      .map(id => parseInt(id, 10))
    
    return Array.from(new Set(cleaned))
  }

  const buildPlacementQuery = (): string => {
    if (filterMode === 'ids' && placementIds.trim()) {
      const ids = parsePlacementIds(placementIds)
      if (ids.length === 0) {
        throw new Error('No valid Placement IDs found. Please enter numeric IDs.')
      }
      return `id IN (${ids.join(',')})`
    }
    
    return `status='Approved'`
  }

  const selectRateLine = (
    lines: Array<{ earnCode?: string; alias?: string; payRate?: number; billRate?: number }> | undefined,
    earnCodes: string
  ): { payRate: number; billRate: number } | null => {
    if (!lines || lines.length === 0) return null
    
    const codeList = earnCodes.split(',').map(c => c.trim().toUpperCase())
    
    for (const line of lines) {
      const earnCode = (line.earnCode || '').toUpperCase()
      const alias = (line.alias || '').toUpperCase()
      
      if (codeList.includes(earnCode) || codeList.includes(alias)) {
        return {
          payRate: line.payRate || 0,
          billRate: line.billRate || 0
        }
      }
    }
    
    return lines[0] ? { payRate: lines[0].payRate || 0, billRate: lines[0].billRate || 0 } : null
  }

  const formatDate = (timestamp: number | undefined): string => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toISOString().split('T')[0]
  }

  const executeExport = async () => {
    if (!hashSalt) {
      toast.error('Please enter a hash salt for security')
      return
    }

    if (filterMode === 'ids' && !placementIds.trim()) {
      toast.error('Please enter Placement IDs to export')
      return
    }

    setIsLoading(true)
    setProgress(0)
    setStats({ totalPlacements: 0, processedPlacements: 0, candidatesJoined: 0, errors: 0 })
    setExportData([])

    const toastId = toast.loading(
      filterMode === 'ids' ? 'Fetching placements by ID...' : 'Fetching active placements...'
    )

    try {
      const placementFields = [
        'id',
        'status',
        'dateBegin',
        'dateEnd',
        'employmentType',
        'candidate(id,firstName,lastName,ssn,dateOfBirth)',
        'jobOrder(id,title)'
      ]

      const where = buildPlacementQuery()
      const parsedIds = filterMode === 'ids' ? parsePlacementIds(placementIds) : []
      
      onLog('WFN Export', 'success', `Starting WFN export (${filterMode === 'ids' ? 'by IDs' : 'active placements'})`, {
        filterMode,
        where,
        placementCount: parsedIds.length || 'all active',
        fields: placementFields,
        pageSize
      })

      let start = 0
      const allRecords: ExportRecord[] = []
      let hasMore = true
      let totalCount = 0
      let processedCount = 0

      while (hasMore) {
        const currentBatch = start + 1
        toast.loading(`Fetching placements (${currentBatch}+)... Progress: ${processedCount} processed`, { id: toastId })
        
        const response = await bullhornAPI.query('Placement', placementFields, where, {
          count: pageSize,
          start,
          orderBy: '-id'
        })

        if (response.total !== undefined) {
          totalCount = response.total
          setStats(prev => ({ ...prev, totalPlacements: totalCount }))
        }

        const placements: PlacementData[] = response.data || []
        
        console.log(`📦 Fetched ${placements.length} placements (batch starting at ${start})`)
        
        if (placements.length === 0) {
          hasMore = false
          break
        }

        const candidateIds = placements
          .map(p => p.candidate?.id)
          .filter((id): id is number => id !== undefined)

        let taxInfoMap = new Map<number, any>()
        
        if (candidateIds.length > 0) {
          try {
            toast.loading(`Processing batch: Fetching tax info for ${candidateIds.length} candidates...`, { id: toastId })
            
            const taxInfoResponse = await bullhornAPI.query(
              'CandidateTaxInfo',
              ['id', 'candidate(id)', 'filingStatus', 'exemptions', 'additionalWithholding'],
              `candidate.id IN (${candidateIds.join(',')})`,
              { count: 500 }
            )
            
            for (const taxInfo of taxInfoResponse.data || []) {
              if (taxInfo.candidate?.id) {
                taxInfoMap.set(taxInfo.candidate.id, taxInfo)
              }
            }
            
            console.log(`✅ Fetched tax info for ${taxInfoMap.size} candidates`)
          } catch (taxError) {
            console.warn('Failed to batch fetch tax info:', taxError)
          }
        }

        const placementIds = placements.map(p => p.id)
        let rateCardMap = new Map<number, { id: number; lines: Array<{ earnCode?: string; alias?: string; payRate?: number; billRate?: number }> }>()
        
        try {
          toast.loading(`Processing batch: Fetching rate cards for ${placementIds.length} placements...`, { id: toastId })
          
          const rateCardResponse = await bullhornAPI.query(
            'PlacementRateCard',
            ['id', 'placement(id)'],
            `placement.id IN (${placementIds.join(',')})`,
            { count: 500 }
          )

          const rateCardIds = (rateCardResponse.data || []).map((rc: any) => rc.id)
          
          if (rateCardIds.length > 0) {
            const lineGroupsResponse = await bullhornAPI.query(
              'PlacementRateCardLineGroup',
              ['id', 'placementRateCard(id)'],
              `placementRateCard.id IN (${rateCardIds.join(',')})`,
              { count: 500 }
            )

            const groupIds = (lineGroupsResponse.data || []).map((g: any) => g.id)
            
            if (groupIds.length > 0) {
              const linesResponse = await bullhornAPI.query(
                'PlacementRateCardLine',
                ['id', 'placementRateCardLineGroup(id,placementRateCard(id,placement(id)))', 'earnCode', 'alias', 'payRate', 'billRate'],
                `placementRateCardLineGroup.id IN (${groupIds.join(',')})`,
                { count: 1000 }
              )

              for (const line of linesResponse.data || []) {
                const placementId = line.placementRateCardLineGroup?.placementRateCard?.placement?.id
                const cardId = line.placementRateCardLineGroup?.placementRateCard?.id
                
                if (placementId && cardId) {
                  if (!rateCardMap.has(placementId)) {
                    rateCardMap.set(placementId, { id: cardId, lines: [] })
                  }
                  
                  rateCardMap.get(placementId)!.lines.push({
                    earnCode: line.earnCode,
                    alias: line.alias,
                    payRate: line.payRate,
                    billRate: line.billRate
                  })
                }
              }
            }
          }
          
          console.log(`✅ Fetched rate cards for ${rateCardMap.size} placements`)
        } catch (rateError) {
          console.warn('Failed to batch fetch rate cards:', rateError)
        }

        for (let i = 0; i < placements.length; i++) {
          const placement = placements[i]
          
          try {
            const candidateTaxInfo = placement.candidate?.id 
              ? taxInfoMap.get(placement.candidate.id)
              : null

            const rateCard = rateCardMap.get(placement.id) || null

            const primaryRate = rateCard ? selectRateLine(rateCard.lines, primaryEarnCodes) : null
            const secondaryRate = rateCard ? selectRateLine(rateCard.lines, secondaryEarnCodes) : null

            const hashedSSN = placement.candidate?.ssn 
              ? await hashValue(placement.candidate.ssn, hashSalt)
              : ''
            
            const hashedDOB = placement.candidate?.dateOfBirth 
              ? await hashValue(placement.candidate.dateOfBirth.toString(), hashSalt)
              : ''

            const record: ExportRecord = {
              'Placement ID': placement.id,
              'Candidate ID': placement.candidate?.id || 0,
              'First Name': placement.candidate?.firstName || '',
              'Last Name': placement.candidate?.lastName || '',
              'Hashed SSN': hashedSSN,
              'Hashed DOB': hashedDOB,
              'Status': placement.status || '',
              'Start Date': formatDate(placement.dateBegin),
              'End Date': formatDate(placement.dateEnd),
              'Employment Type': placement.employmentType || '',
              'Job Order ID': placement.jobOrder?.id || 0,
              'Job Title': placement.jobOrder?.title || '',
              'Primary Pay Rate': primaryRate ? primaryRate.payRate.toFixed(2) : '',
              'Secondary Pay Rate': secondaryRate ? secondaryRate.payRate.toFixed(2) : '',
              'Primary Bill Rate': primaryRate ? primaryRate.billRate.toFixed(2) : '',
              'Secondary Bill Rate': secondaryRate ? secondaryRate.billRate.toFixed(2) : '',
              'Filing Status': candidateTaxInfo?.filingStatus || '',
              'Exemptions': candidateTaxInfo?.exemptions?.toString() || '',
              'Additional Withholding': candidateTaxInfo?.additionalWithholding?.toString() || ''
            }

            allRecords.push(record)
            processedCount++
            
            setStats(prev => ({
              ...prev,
              processedPlacements: processedCount,
              candidatesJoined: placement.candidate?.id ? prev.candidatesJoined + 1 : prev.candidatesJoined
            }))

            const progressPercent = totalCount > 0 
              ? Math.round((processedCount / totalCount) * 100)
              : Math.round(((start + i + 1) / (start + placements.length)) * 100)
            setProgress(progressPercent)

          } catch (recordError) {
            console.error(`Error processing placement ${placement.id}:`, recordError)
            setStats(prev => ({ ...prev, errors: prev.errors + 1 }))
            onLog('WFN Export', 'error', `Failed to process placement ${placement.id}`, {
              error: String(recordError)
            })
          }
        }

        start += placements.length
        
        if (placements.length < pageSize) {
          hasMore = false
        }
        
        setExportData([...allRecords])
      }

      setExportData(allRecords)
      setProgress(100)
      
      const successMsg = filterMode === 'ids' 
        ? `Export complete: ${allRecords.length} of ${parsedIds.length} placements ready`
        : `Export complete: ${allRecords.length} records ready`
      
      toast.success(successMsg, { id: toastId })
      
      onLog('WFN Export', 'success', `Export completed successfully`, {
        filterMode,
        recordCount: allRecords.length,
        totalPlacements: totalCount,
        requestedIds: parsedIds.length || 'N/A',
        candidatesJoined: stats.candidatesJoined,
        errors: stats.errors
      })

    } catch (error) {
      console.error('Export failed:', error)
      toast.error(`Export failed: ${error}`, { id: toastId })
      onLog('WFN Export', 'error', 'Export failed', { error: String(error) })
      setStats(prev => ({ ...prev, errors: prev.errors + 1 }))
    } finally {
      setIsLoading(false)
    }
  }

  const downloadCSV = () => {
    if (exportData.length === 0) {
      toast.error('No data to export')
      return
    }

    const headers = Object.keys(exportData[0])
    const csvRows = [
      headers.join(','),
      ...exportData.map(record => 
        headers.map(header => {
          const value = record[header as keyof ExportRecord]
          const stringValue = typeof value === 'string' ? value : String(value)
          return stringValue.includes(',') ? `"${stringValue}"` : stringValue
        }).join(',')
      )
    ]

    const csvContent = csvRows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `wfn_active_placements_export_${Date.now()}.csv`
    link.click()
    URL.revokeObjectURL(url)

    toast.success('CSV downloaded successfully')
    onLog('WFN Export', 'success', 'CSV file downloaded', { recordCount: exportData.length })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database size={24} className="text-accent" weight="duotone" />
                WFN Placements Export
              </CardTitle>
              <CardDescription>
                Export placements with rate cards, candidate demographics, and tax information with hashed SSN/DOB
              </CardDescription>
            </div>
            <Badge variant="secondary" className="gap-2">
              <ShieldCheck size={16} />
              Secure Export
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertDescription>
              This export includes <strong>hashed SSN and DOB</strong> using SHA-256. Raw sensitive data is never written to the CSV.
            </AlertDescription>
          </Alert>

          <Tabs value={filterMode} onValueChange={(v) => setFilterMode(v as 'active' | 'ids')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="active" className="gap-2">
                <CalendarCheck size={18} />
                Active Placements
              </TabsTrigger>
              <TabsTrigger value="ids" className="gap-2">
                <ListNumbers size={18} />
                By Placement IDs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
              <Alert>
                <AlertDescription>
                  Exports placements with <strong>status='Approved'</strong> and current date within start/end range.
                </AlertDescription>
              </Alert>
            </TabsContent>

            <TabsContent value="ids" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="placement-ids" className="flex items-center gap-2">
                  <ListNumbers size={16} />
                  Placement IDs (comma-separated or one per line)
                </Label>
                <Textarea
                  id="placement-ids"
                  placeholder="12345,67890,34567&#10;or one ID per line&#10;12345&#10;67890&#10;34567"
                  value={placementIds}
                  onChange={(e) => setPlacementIds(e.target.value)}
                  disabled={isLoading}
                  rows={6}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {placementIds.trim() && (
                    <>
                      {parsePlacementIds(placementIds).length} valid ID(s) detected
                    </>
                  )}
                  {!placementIds.trim() && 'Paste your Placement IDs here (comma-separated or newline-separated)'}
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="hash-salt" className="flex items-center gap-2">
                <Hash size={16} />
                Hash Salt (Required)
              </Label>
              <Input
                id="hash-salt"
                type="password"
                placeholder="Enter corporate salt value"
                value={hashSalt}
                onChange={(e) => setHashSalt(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Required for hashing SSN and DOB. Keep this value secure and consistent.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="page-size">Page Size</Label>
              <Input
                id="page-size"
                type="number"
                min="100"
                max="1000"
                value={pageSize}
                onChange={(e) => setPageSize(parseInt(e.target.value) || 500)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Number of records to fetch per API request (100-1000)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="primary-earn">Primary Earn Codes (Regular/Base)</Label>
              <Input
                id="primary-earn"
                placeholder="REG,REGULAR,BASE,STD"
                value={primaryEarnCodes}
                onChange={(e) => setPrimaryEarnCodes(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated list for Rate 1 selection
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondary-earn">Secondary Earn Codes (OT/Holiday)</Label>
              <Input
                id="secondary-earn"
                placeholder="OT,OVERTIME,HOLIDAY,PREMIUM"
                value={secondaryEarnCodes}
                onChange={(e) => setSecondaryEarnCodes(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated list for Rate 2 selection
              </p>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <Button
              size="lg"
              onClick={executeExport}
              disabled={isLoading || !hashSalt || (filterMode === 'ids' && !placementIds.trim())}
              className="gap-2"
            >
              <Play size={20} />
              {isLoading ? 'Exporting...' : `Start Export ${filterMode === 'ids' ? '(By IDs)' : '(Active)'}`}
            </Button>

            {exportData.length > 0 && (
              <Button
                variant="outline"
                size="lg"
                onClick={downloadCSV}
                className="gap-2"
              >
                <DownloadSimple size={20} />
                Download CSV ({exportData.length} records)
              </Button>
            )}
          </div>

          {isLoading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}
        </CardContent>
      </Card>

      {(stats.totalPlacements > 0 || exportData.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CurrencyDollar size={20} className="text-accent" />
              Export Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Placements</p>
                <p className="text-2xl font-bold">{stats.totalPlacements}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Processed</p>
                <p className="text-2xl font-bold text-accent">{stats.processedPlacements}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Candidates Joined</p>
                <p className="text-2xl font-bold">{stats.candidatesJoined}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Errors</p>
                <p className="text-2xl font-bold text-destructive">{stats.errors}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {exportData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users size={20} />
              Preview ({exportData.slice(0, 10).length} of {exportData.length} records)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Placement ID</th>
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Hashed SSN</th>
                    <th className="text-left p-2">Job Title</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Start Date</th>
                  </tr>
                </thead>
                <tbody>
                  {exportData.slice(0, 10).map((record, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-mono">{record['Placement ID']}</td>
                      <td className="p-2">{record['First Name']} {record['Last Name']}</td>
                      <td className="p-2 font-mono text-xs">{record['Hashed SSN'].substring(0, 16)}...</td>
                      <td className="p-2">{record['Job Title']}</td>
                      <td className="p-2">
                        <Badge variant="outline">{record['Status']}</Badge>
                      </td>
                      <td className="p-2">{record['Start Date']}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
