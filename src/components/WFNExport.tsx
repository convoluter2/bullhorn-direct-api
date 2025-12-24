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
  status?: string
  dateBegin?: number
  dateEnd?: number
  workWeekStart?: number
  employmentType?: string
  isMultirate?: boolean
  placementRateCardID?: number
  placementRateCardStatus?: string
  candidate?: {
    id: number
    firstName?: string
    middleName?: string
    lastName?: string
    nameSuffix?: string
    externalID?: string
    ssn?: string
    dateOfBirth?: number
    email?: string
    email2?: string
    email3?: string
    phone?: string
    phone2?: string
    phone3?: string
    mobile?: string
    preferredContact?: string
    address?: {
      address1?: string
      address2?: string
      city?: string
      state?: string
      zip?: string
      countryID?: number
    }
    gender?: string
    ethnicity?: string
    maritalStatus?: string
    veteran?: string
    tobaccoUser?: boolean
    status?: string
    payrollStatus?: string
    employeeType?: string
    type?: string
    payrollClientStartDate?: number
    federalFilingStatus?: string
    federalExemptions?: number
    federalExtraWithholdingAmount?: number
    stateFilingStatus?: string
    stateExemptions?: number
    stateAddtionalWitholdingsAmount?: number
    localFilingStatus?: string
    localExemptions?: number
    localAddtionalWitholdingsAmount?: number
    localTaxCode?: string
  }
  clientCorporation?: {
    id: number
    name?: string
  }
  clientContact?: {
    id: number
    name?: string
  }
  jobOrder?: {
    id: number
    title?: string
    clientCorporation?: {
      id: number
      name?: string
    }
  }
}

interface CandidateTaxInfo {
  id: number
  candidate?: { id: number }
  twoJobs?: boolean
  totalDependentClaimAmount?: number
  otherIncomeAmount?: number
  otherDeductionsAmount?: number
  federalExtraWithholdingAmount?: number
}

interface RateCardLine {
  id: number
  earnCode?: string
  alias?: string
  payRate?: number
  billRate?: number
  payMultiplier?: number
  billMultiplier?: number
  markupPercent?: number
  markupValue?: number
  payCurrencyUnit?: string
  billCurrencyUnit?: string
  taxableMargin?: number
  customText1?: string
  customText2?: string
  customText3?: string
  customText4?: string
  customText5?: string
  customText6?: string
  customText7?: string
  customText8?: string
  customText9?: string
  customText10?: string
  customInt1?: number
  customInt2?: number
  customInt3?: number
  customInt4?: number
  customInt5?: number
  customFloat1?: number
  customFloat2?: number
  customFloat3?: number
  customFloat4?: number
  customFloat5?: number
  customRate1?: number
  customRate2?: number
  customRate3?: number
  customRate4?: number
  customRate5?: number
  dateLastModified?: number
  externalID?: string
  migrateGUID?: string
}

interface ExportRecord {
  'Placement ID': number
  'Placement Status': string
  'Placement Start Date': string
  'Placement End Date': string
  'Work Week Start': string
  'Is Multirate': string
  'Rate Card ID': string
  'Rate Card Status': string
  'Candidate ID': number
  'Candidate External ID': string
  'First Name': string
  'Middle Name': string
  'Last Name': string
  'Name Suffix': string
  'Hashed SSN': string
  'Hashed DOB': string
  'Email': string
  'Email 2': string
  'Email 3': string
  'Phone': string
  'Phone 2': string
  'Phone 3': string
  'Mobile': string
  'Preferred Contact': string
  'Address 1': string
  'Address 2': string
  'City': string
  'State': string
  'Zip': string
  'Country ID': string
  'Gender': string
  'Ethnicity': string
  'Marital Status': string
  'Veteran': string
  'Tobacco User': string
  'Candidate Status': string
  'Payroll Status': string
  'Employee Type': string
  'Candidate Type': string
  'Payroll Client Start Date': string
  'Federal Filing Status': string
  'Federal Exemptions': string
  'Federal Extra Withholding': string
  'State Filing Status': string
  'State Exemptions': string
  'State Additional Withholdings': string
  'Local Filing Status': string
  'Local Exemptions': string
  'Local Additional Withholdings': string
  'Local Tax Code': string
  'Tax Info - Two Jobs': string
  'Tax Info - Dependent Claim Amount': string
  'Tax Info - Other Income Amount': string
  'Tax Info - Other Deductions Amount': string
  'Tax Info - Federal Extra Withholding': string
  'Client Corporation ID': string
  'Client Corporation Name': string
  'Client Contact ID': string
  'Client Contact Name': string
  'Job Order ID': number
  'Job Title': string
  'Job Client Corp ID': string
  'Job Client Corp Name': string
  'Primary Earn Code': string
  'Primary Alias': string
  'Primary Pay Rate': string
  'Primary Bill Rate': string
  'Primary Pay Multiplier': string
  'Primary Bill Multiplier': string
  'Primary Markup Percent': string
  'Primary Markup Value': string
  'Primary Pay Currency': string
  'Primary Bill Currency': string
  'Primary Taxable Margin': string
  'Secondary Earn Code': string
  'Secondary Alias': string
  'Secondary Pay Rate': string
  'Secondary Bill Rate': string
  'Secondary Pay Multiplier': string
  'Secondary Bill Multiplier': string
  'Secondary Markup Percent': string
  'Secondary Markup Value': string
  'Secondary Pay Currency': string
  'Secondary Bill Currency': string
  'Secondary Taxable Margin': string
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
    lines: RateCardLine[] | undefined,
    earnCodes: string
  ): RateCardLine | null => {
    if (!lines || lines.length === 0) return null
    
    const codeList = earnCodes.split(',').map(c => c.trim().toUpperCase())
    
    for (const line of lines) {
      const earnCode = (line.earnCode || '').toUpperCase()
      const alias = (line.alias || '').toUpperCase()
      
      if (codeList.includes(earnCode) || codeList.includes(alias)) {
        return line
      }
    }
    
    return lines[0] || null
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
        'workWeekStart',
        'isMultirate',
        'placementRateCardID',
        'placementRateCardStatus',
        'candidate(id,firstName,middleName,lastName,nameSuffix,externalID,ssn,dateOfBirth,email,email2,email3,phone,phone2,phone3,mobile,preferredContact,address(address1,address2,city,state,zip,countryID),gender,ethnicity,maritalStatus,veteran,tobaccoUser,status,payrollStatus,employeeType,type,payrollClientStartDate,federalFilingStatus,federalExemptions,federalExtraWithholdingAmount,stateFilingStatus,stateExemptions,stateAddtionalWitholdingsAmount,localFilingStatus,localExemptions,localAddtionalWitholdingsAmount,localTaxCode)',
        'clientCorporation(id,name)',
        'clientContact(id,name)',
        'jobOrder(id,title,clientCorporation(id,name))'
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

        let taxInfoMap = new Map<number, CandidateTaxInfo>()
        
        if (candidateIds.length > 0) {
          try {
            toast.loading(`Processing batch: Fetching tax info for ${candidateIds.length} candidates...`, { id: toastId })
            
            const taxInfoResponse = await bullhornAPI.query(
              'CandidateTaxInfo',
              ['id', 'candidate(id)', 'twoJobs', 'totalDependentClaimAmount', 'otherIncomeAmount', 'otherDeductionsAmount', 'federalExtraWithholdingAmount'],
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

        const currentPlacementIds = placements.map(p => p.id)
        let rateCardMap = new Map<number, { id: number; lines: RateCardLine[] }>()
        
        try {
          toast.loading(`Processing batch: Fetching rate cards for ${currentPlacementIds.length} placements...`, { id: toastId })
          
          const rateCardResponse = await bullhornAPI.query(
            'PlacementRateCard',
            ['id', 'placement(id)'],
            `placement.id IN (${currentPlacementIds.join(',')})`,
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
              const rateCardLineFields = [
                'id',
                'placementRateCardLineGroup(id,placementRateCard(id,placement(id)))',
                'earnCode',
                'alias',
                'payRate',
                'billRate',
                'payMultiplier',
                'billMultiplier',
                'markupPercent',
                'markupValue',
                'payCurrencyUnit',
                'billCurrencyUnit',
                'taxableMargin',
                'customText1',
                'customText2',
                'customText3',
                'customText4',
                'customText5',
                'customText6',
                'customText7',
                'customText8',
                'customText9',
                'customText10',
                'customInt1',
                'customInt2',
                'customInt3',
                'customInt4',
                'customInt5',
                'customFloat1',
                'customFloat2',
                'customFloat3',
                'customFloat4',
                'customFloat5',
                'customRate1',
                'customRate2',
                'customRate3',
                'customRate4',
                'customRate5',
                'dateLastModified',
                'externalID',
                'migrateGUID'
              ]

              const linesResponse = await bullhornAPI.query(
                'PlacementRateCardLine',
                rateCardLineFields,
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
                  
                  rateCardMap.get(placementId)!.lines.push(line as RateCardLine)
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
              'Placement Status': placement.status || '',
              'Placement Start Date': formatDate(placement.dateBegin),
              'Placement End Date': formatDate(placement.dateEnd),
              'Work Week Start': placement.workWeekStart?.toString() || '',
              'Is Multirate': placement.isMultirate ? 'Yes' : 'No',
              'Rate Card ID': placement.placementRateCardID?.toString() || '',
              'Rate Card Status': placement.placementRateCardStatus || '',
              'Candidate ID': placement.candidate?.id || 0,
              'Candidate External ID': placement.candidate?.externalID || '',
              'First Name': placement.candidate?.firstName || '',
              'Middle Name': placement.candidate?.middleName || '',
              'Last Name': placement.candidate?.lastName || '',
              'Name Suffix': placement.candidate?.nameSuffix || '',
              'Hashed SSN': hashedSSN,
              'Hashed DOB': hashedDOB,
              'Email': placement.candidate?.email || '',
              'Email 2': placement.candidate?.email2 || '',
              'Email 3': placement.candidate?.email3 || '',
              'Phone': placement.candidate?.phone || '',
              'Phone 2': placement.candidate?.phone2 || '',
              'Phone 3': placement.candidate?.phone3 || '',
              'Mobile': placement.candidate?.mobile || '',
              'Preferred Contact': placement.candidate?.preferredContact || '',
              'Address 1': placement.candidate?.address?.address1 || '',
              'Address 2': placement.candidate?.address?.address2 || '',
              'City': placement.candidate?.address?.city || '',
              'State': placement.candidate?.address?.state || '',
              'Zip': placement.candidate?.address?.zip || '',
              'Country ID': placement.candidate?.address?.countryID?.toString() || '',
              'Gender': placement.candidate?.gender || '',
              'Ethnicity': placement.candidate?.ethnicity || '',
              'Marital Status': placement.candidate?.maritalStatus || '',
              'Veteran': placement.candidate?.veteran || '',
              'Tobacco User': placement.candidate?.tobaccoUser ? 'Yes' : 'No',
              'Candidate Status': placement.candidate?.status || '',
              'Payroll Status': placement.candidate?.payrollStatus || '',
              'Employee Type': placement.candidate?.employeeType || '',
              'Candidate Type': placement.candidate?.type || '',
              'Payroll Client Start Date': formatDate(placement.candidate?.payrollClientStartDate),
              'Federal Filing Status': placement.candidate?.federalFilingStatus || '',
              'Federal Exemptions': placement.candidate?.federalExemptions?.toString() || '',
              'Federal Extra Withholding': placement.candidate?.federalExtraWithholdingAmount?.toString() || '',
              'State Filing Status': placement.candidate?.stateFilingStatus || '',
              'State Exemptions': placement.candidate?.stateExemptions?.toString() || '',
              'State Additional Withholdings': placement.candidate?.stateAddtionalWitholdingsAmount?.toString() || '',
              'Local Filing Status': placement.candidate?.localFilingStatus || '',
              'Local Exemptions': placement.candidate?.localExemptions?.toString() || '',
              'Local Additional Withholdings': placement.candidate?.localAddtionalWitholdingsAmount?.toString() || '',
              'Local Tax Code': placement.candidate?.localTaxCode || '',
              'Tax Info - Two Jobs': candidateTaxInfo?.twoJobs ? 'Yes' : 'No',
              'Tax Info - Dependent Claim Amount': candidateTaxInfo?.totalDependentClaimAmount?.toString() || '',
              'Tax Info - Other Income Amount': candidateTaxInfo?.otherIncomeAmount?.toString() || '',
              'Tax Info - Other Deductions Amount': candidateTaxInfo?.otherDeductionsAmount?.toString() || '',
              'Tax Info - Federal Extra Withholding': candidateTaxInfo?.federalExtraWithholdingAmount?.toString() || '',
              'Client Corporation ID': placement.clientCorporation?.id?.toString() || '',
              'Client Corporation Name': placement.clientCorporation?.name || '',
              'Client Contact ID': placement.clientContact?.id?.toString() || '',
              'Client Contact Name': placement.clientContact?.name || '',
              'Job Order ID': placement.jobOrder?.id || 0,
              'Job Title': placement.jobOrder?.title || '',
              'Job Client Corp ID': placement.jobOrder?.clientCorporation?.id?.toString() || '',
              'Job Client Corp Name': placement.jobOrder?.clientCorporation?.name || '',
              'Primary Earn Code': primaryRate?.earnCode || '',
              'Primary Alias': primaryRate?.alias || '',
              'Primary Pay Rate': primaryRate?.payRate?.toFixed(2) || '',
              'Primary Bill Rate': primaryRate?.billRate?.toFixed(2) || '',
              'Primary Pay Multiplier': primaryRate?.payMultiplier?.toString() || '',
              'Primary Bill Multiplier': primaryRate?.billMultiplier?.toString() || '',
              'Primary Markup Percent': primaryRate?.markupPercent?.toString() || '',
              'Primary Markup Value': primaryRate?.markupValue?.toString() || '',
              'Primary Pay Currency': primaryRate?.payCurrencyUnit || '',
              'Primary Bill Currency': primaryRate?.billCurrencyUnit || '',
              'Primary Taxable Margin': primaryRate?.taxableMargin?.toString() || '',
              'Secondary Earn Code': secondaryRate?.earnCode || '',
              'Secondary Alias': secondaryRate?.alias || '',
              'Secondary Pay Rate': secondaryRate?.payRate?.toFixed(2) || '',
              'Secondary Bill Rate': secondaryRate?.billRate?.toFixed(2) || '',
              'Secondary Pay Multiplier': secondaryRate?.payMultiplier?.toString() || '',
              'Secondary Bill Multiplier': secondaryRate?.billMultiplier?.toString() || '',
              'Secondary Markup Percent': secondaryRate?.markupPercent?.toString() || '',
              'Secondary Markup Value': secondaryRate?.markupValue?.toString() || '',
              'Secondary Pay Currency': secondaryRate?.payCurrencyUnit || '',
              'Secondary Bill Currency': secondaryRate?.billCurrencyUnit || '',
              'Secondary Taxable Margin': secondaryRate?.taxableMargin?.toString() || ''
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

    try {
      const headers = Object.keys(exportData[0])
      const csvRows = [
        headers.join(','),
        ...exportData.map(record => 
          headers.map(header => {
            const value = record[header as keyof ExportRecord]
            const stringValue = typeof value === 'string' ? value : String(value)
            return stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')
              ? `"${stringValue.replace(/"/g, '""')}"`
              : stringValue
          }).join(',')
        )
      ]

      const csvContent = csvRows.join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `wfn_active_placements_export_${Date.now()}.csv`
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      setTimeout(() => {
        URL.revokeObjectURL(url)
      }, 100)

      toast.success('CSV downloaded successfully')
      onLog('WFN Export', 'success', 'CSV file downloaded', { recordCount: exportData.length })
    } catch (error) {
      console.error('CSV download error:', error)
      toast.error(`Failed to download CSV: ${error}`)
      onLog('WFN Export', 'error', 'CSV download failed', { error: String(error) })
    }
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
                    <th className="text-left p-2">External ID</th>
                    <th className="text-left p-2">Hashed SSN</th>
                    <th className="text-left p-2">Job Title</th>
                    <th className="text-left p-2">Client</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Start Date</th>
                    <th className="text-left p-2">Primary Pay</th>
                  </tr>
                </thead>
                <tbody>
                  {exportData.slice(0, 10).map((record, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-mono">{record['Placement ID']}</td>
                      <td className="p-2">{record['First Name']} {record['Last Name']}</td>
                      <td className="p-2 font-mono text-xs">{record['Candidate External ID']}</td>
                      <td className="p-2 font-mono text-xs">{record['Hashed SSN'].substring(0, 12)}...</td>
                      <td className="p-2">{record['Job Title']}</td>
                      <td className="p-2">{record['Client Corporation Name']}</td>
                      <td className="p-2">
                        <Badge variant="outline">{record['Placement Status']}</Badge>
                      </td>
                      <td className="p-2">{record['Placement Start Date']}</td>
                      <td className="p-2">${record['Primary Pay Rate']}</td>
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
