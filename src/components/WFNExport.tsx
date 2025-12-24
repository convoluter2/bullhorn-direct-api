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
import { Switch } from '@/components/ui/switch'
import { DownloadSimple, Play, Database, Users, CurrencyDollar, ShieldCheck, Hash, ListNumbers, CalendarCheck, LockKey, Warning } from '@phosphor-icons/react'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { toast } from 'sonner'
import { FileDecryptor } from '@/components/FileDecryptor'

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
  'Change Effective On': string
  'Employee ID': string
  'Position ID': string
  'Co Code': string
  'First Name': string
  'Last Name': string
  'Birth Date': string
  'Gender': string
  'Tax ID Type': string
  'Tax ID Number': string
  'Hire Date': string
  'Is Primary': string
  'Is Paid By WFN': string
  'Pay Frequency Code': string
  'SUI/SDI Tax Jurisdiction Code': string
  'Worked State Tax Code': string
  'Address 1 Line 1': string
  'Address 1 Line 2': string
  'Address 1 City': string
  'Address 1 State Postal Code': string
  'Address 1 Zip Code': string
  'Address 1 Use as Legal': string
  'Middle Name': string
  'Generation Suffix': string
  'Professional Suffix': string
  'EEO Ethnic Code': string
  'Personal E-mail': string
  'E-Mail to Use For Notification': string
  'Employee Status': string
  'Rehire Date': string
  'Rehire Reason': string
  'Leave of Absence Return Date': string
  'Leave of Absence Return Reason': string
  'Employee Type': string
  'Home Department': string
  'EEOC Job Code': string
  'FLSA Code': string
  'NAICS Workers Comp Code': string
  'Home Phone Number': string
  'Compensation Change Reason': string
  'Rate Type': string
  'Rate 1 Amount': string
  'Rate 2 Amount': string
  'Standard Hours': string
  'Federal Tax Filing Status': string
  'Federal Tax Form Year': string
  'Federal Tax Multiple Jobs': string
  'Federal Tax Dependents Amount': string
  'Federal Tax Other Income Amount': string
  'Federal Tax Deductions Amount': string
  'Federal Tax Additional Amount': string
  'Federal Tax Non-Resident Alien': string
  'Federal Tax Exemptions': string
  'Lived State Tax Code': string
  'State Exemptions': string
  'State Extra Tax $': string
  'State Extra Tax %': string
  'State Marital Status': string
  'Worker Category': string
  'Work Mail Stop': string
  'Employer Match Eligibility Date': string
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

const normalizePhoneNumber = (phone: string | null | undefined): string => {
  if (!phone) return ''
  
  const cleaned = phone.replace(/\D/g, '')
  
  if (cleaned.length === 10) {
    return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `(${cleaned.substring(1, 4)}) ${cleaned.substring(4, 7)}-${cleaned.substring(7)}`
  }
  
  return phone
}

const encryptData = async (plaintext: string, password: string): Promise<ArrayBuffer> => {
  const encoder = new TextEncoder()
  const data = encoder.encode(plaintext)
  
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  )
  
  const salt = crypto.getRandomValues(new Uint8Array(16))
  
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  )
  
  const iv = crypto.getRandomValues(new Uint8Array(12))
  
  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  )
  
  const result = new Uint8Array(salt.length + iv.length + encryptedData.byteLength)
  result.set(salt, 0)
  result.set(iv, salt.length)
  result.set(new Uint8Array(encryptedData), salt.length + iv.length)
  
  return result.buffer
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
  const [adpAssociateIdField, setAdpAssociateIdField] = useState('customText1')
  const [encryptionPassword, setEncryptionPassword] = useState('')
  const [usePlaintextPII, setUsePlaintextPII] = useState(false)
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
    if (usePlaintextPII && !encryptionPassword) {
      toast.error('Password is required when exporting unencrypted PII')
      return
    }

    if (!usePlaintextPII && !hashSalt) {
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
        'candidate(id,firstName,middleName,lastName,nameSuffix,externalID,ssn,dateOfBirth,email,email2,email3,phone,phone2,phone3,mobile,preferredContact,address(address1,address2,city,state,zip,countryID),gender,ethnicity,maritalStatus,veteran,tobaccoUser,status,payrollStatus,employeeType,type,payrollClientStartDate,federalFilingStatus,federalExemptions,federalExtraWithholdingAmount,stateFilingStatus,stateExemptions,stateAddtionalWitholdingsAmount,localFilingStatus,localExemptions,localAddtionalWitholdingsAmount,localTaxCode,customText1,customText2,customText3,customText4,customText5,customText6,customText7,customText8,customText9,customText10)',
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
        pageSize,
        adpAssociateIdField,
        piiMode: usePlaintextPII ? 'plaintext-encrypted' : 'hashed',
        encrypted: usePlaintextPII,
        hashingSalt: usePlaintextPII ? 'N/A' : '***REDACTED***'
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

            let taxIdNumber = ''
            let birthDate = ''

            if (usePlaintextPII) {
              taxIdNumber = placement.candidate?.ssn || ''
              birthDate = formatDate(placement.candidate?.dateOfBirth)
            } else {
              taxIdNumber = placement.candidate?.ssn 
                ? await hashValue(placement.candidate.ssn, hashSalt)
                : ''
              birthDate = ''
            }

            const getAdpAssociateId = (): string => {
              if (!placement.candidate) return ''
              
              const fieldValue = placement.candidate[adpAssociateIdField as keyof typeof placement.candidate]
              if (fieldValue && typeof fieldValue === 'string') {
                return fieldValue
              }
              
              return placement.candidate.externalID || ''
            }

            const adpAssociateId = getAdpAssociateId()
            const taxIdType = placement.candidate?.ssn ? 'SSN' : ''
            
            const normalizedHomePhone = normalizePhoneNumber(placement.candidate?.phone)
            const candidateIdForMailStop = placement.candidate?.id?.toString() || ''

            const record: ExportRecord = {
              'Change Effective On': formatDate(placement.dateBegin),
              'Employee ID': adpAssociateId,
              'Position ID': placement.id.toString(),
              'Co Code': '',
              'First Name': placement.candidate?.firstName || '',
              'Last Name': placement.candidate?.lastName || '',
              'Birth Date': birthDate,
              'Gender': '',
              'Tax ID Type': taxIdType,
              'Tax ID Number': taxIdNumber,
              'Hire Date': formatDate(placement.dateBegin),
              'Is Primary': '',
              'Is Paid By WFN': '',
              'Pay Frequency Code': '',
              'SUI/SDI Tax Jurisdiction Code': '',
              'Worked State Tax Code': placement.candidate?.address?.state || '',
              'Address 1 Line 1': placement.candidate?.address?.address1 || '',
              'Address 1 Line 2': placement.candidate?.address?.address2 || '',
              'Address 1 City': placement.candidate?.address?.city || '',
              'Address 1 State Postal Code': placement.candidate?.address?.state || '',
              'Address 1 Zip Code': placement.candidate?.address?.zip || '',
              'Address 1 Use as Legal': placement.candidate?.address?.address1 ? 'Y' : '',
              'Middle Name': placement.candidate?.middleName || '',
              'Generation Suffix': '',
              'Professional Suffix': '',
              'EEO Ethnic Code': '',
              'Personal E-mail': placement.candidate?.email || '',
              'E-Mail to Use For Notification': '',
              'Employee Status': placement.status || '',
              'Rehire Date': '',
              'Rehire Reason': '',
              'Leave of Absence Return Date': '',
              'Leave of Absence Return Reason': '',
              'Employee Type': placement.candidate?.employeeType || '',
              'Home Department': '',
              'EEOC Job Code': '',
              'FLSA Code': '',
              'NAICS Workers Comp Code': '',
              'Home Phone Number': normalizedHomePhone,
              'Compensation Change Reason': '',
              'Rate Type': '',
              'Rate 1 Amount': primaryRate?.payRate?.toFixed(2) || '',
              'Rate 2 Amount': secondaryRate?.payRate?.toFixed(2) || '',
              'Standard Hours': '',
              'Federal Tax Filing Status': placement.candidate?.federalFilingStatus || '',
              'Federal Tax Form Year': candidateTaxInfo ? '2025' : '',
              'Federal Tax Multiple Jobs': candidateTaxInfo?.twoJobs ? 'Y' : '',
              'Federal Tax Dependents Amount': candidateTaxInfo?.totalDependentClaimAmount?.toString() || '',
              'Federal Tax Other Income Amount': candidateTaxInfo?.otherIncomeAmount?.toString() || '',
              'Federal Tax Deductions Amount': candidateTaxInfo?.otherDeductionsAmount?.toString() || '',
              'Federal Tax Additional Amount': candidateTaxInfo?.federalExtraWithholdingAmount?.toString() || '',
              'Federal Tax Non-Resident Alien': '',
              'Federal Tax Exemptions': placement.candidate?.federalExemptions?.toString() || '',
              'Lived State Tax Code': '',
              'State Exemptions': placement.candidate?.stateExemptions?.toString() || '',
              'State Extra Tax $': placement.candidate?.stateAddtionalWitholdingsAmount?.toString() || '',
              'State Extra Tax %': '',
              'State Marital Status': placement.candidate?.maritalStatus || '',
              'Worker Category': '',
              'Work Mail Stop': candidateIdForMailStop,
              'Employer Match Eligibility Date': formatDate(placement.candidate?.payrollClientStartDate)
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
        errors: stats.errors,
        piiMode: usePlaintextPII ? 'plaintext-encrypted' : 'hashed',
        encrypted: usePlaintextPII
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

  const downloadCSV = async () => {
    if (exportData.length === 0) {
      toast.error('No data to export')
      return
    }

    if (usePlaintextPII && !encryptionPassword) {
      toast.error('Password is required for encrypted export with unencrypted PII')
      return
    }

    try {
      const headers = [
        'Change Effective On',
        'Employee ID',
        'Position ID',
        'Co Code',
        'First Name',
        'Last Name',
        'Birth Date',
        'Gender',
        'Tax ID Type',
        'Tax ID Number',
        'Hire Date',
        'Is Primary',
        'Is Paid By WFN',
        'Pay Frequency Code',
        'SUI/SDI Tax Jurisdiction Code',
        'Worked State Tax Code',
        'Address 1 Line 1',
        'Address 1 Line 2',
        'Address 1 City',
        'Address 1 State Postal Code',
        'Address 1 Zip Code',
        'Address 1 Use as Legal',
        'Middle Name',
        'Generation Suffix',
        'Professional Suffix',
        'EEO Ethnic Code',
        'Personal E-mail',
        'E-Mail to Use For Notification',
        'Employee Status',
        'Rehire Date',
        'Rehire Reason',
        'Leave of Absence Return Date',
        'Leave of Absence Return Reason',
        'Employee Type',
        'Home Department',
        'EEOC Job Code',
        'FLSA Code',
        'NAICS Workers Comp Code',
        'Home Phone Number',
        'Compensation Change Reason',
        'Rate Type',
        'Rate 1 Amount',
        'Rate 2 Amount',
        'Standard Hours',
        'Federal Tax Filing Status',
        'Federal Tax Form Year',
        'Federal Tax Multiple Jobs',
        'Federal Tax Dependents Amount',
        'Federal Tax Other Income Amount',
        'Federal Tax Deductions Amount',
        'Federal Tax Additional Amount',
        'Federal Tax Non-Resident Alien',
        'Federal Tax Exemptions',
        'Lived State Tax Code',
        'State Exemptions',
        'State Extra Tax $',
        'State Extra Tax %',
        'State Marital Status',
        'Worker Category',
        'Work Mail Stop',
        'Employer Match Eligibility Date'
      ]
      
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

      if (usePlaintextPII && encryptionPassword) {
        const toastId = toast.loading('Encrypting file with password...')
        
        try {
          const encryptedData = await encryptData(csvContent, encryptionPassword)
          const blob = new Blob([encryptedData], { type: 'application/octet-stream' })
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `wfn_export_encrypted_${Date.now()}.enc`
          link.style.display = 'none'
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          
          setTimeout(() => {
            URL.revokeObjectURL(url)
          }, 100)

          toast.success('Encrypted file downloaded successfully', { id: toastId })
          onLog('WFN Export', 'success', 'Encrypted CSV file downloaded (plaintext PII, password-protected)', { 
            recordCount: exportData.length,
            encrypted: true,
            plaintextPII: true
          })
        } catch (encryptError) {
          console.error('Encryption error:', encryptError)
          toast.error(`Failed to encrypt file: ${encryptError}`, { id: toastId })
          onLog('WFN Export', 'error', 'File encryption failed', { error: String(encryptError) })
        }
      } else {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `wfn_export_${Date.now()}.csv`
        link.style.display = 'none'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        setTimeout(() => {
          URL.revokeObjectURL(url)
        }, 100)

        toast.success('CSV downloaded successfully')
        onLog('WFN Export', 'success', 'CSV file downloaded (hashed PII)', { 
          recordCount: exportData.length,
          encrypted: false,
          plaintextPII: false
        })
      }
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
                Export placements in WFN format with employee demographics, tax information, and rate data
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
              <strong>Export Options:</strong>
              <br />
              • <strong>Hashed PII (Default):</strong> SSN is hashed using SHA-256. Birth date is excluded. Standard CSV download.
              <br />
              • <strong>Unencrypted PII (Password Required):</strong> SSN and birth date included in plaintext. File is encrypted with AES-256-GCM and requires password to decrypt.
              <br />
              <strong>Employee ID:</strong> Uses Candidate.{adpAssociateIdField} (ADP Associate ID)
              <br />
              <strong>Tax ID Type:</strong> Set to "SSN" for all candidates with an SSN
              <br />
              <strong>Work Mail Stop:</strong> Contains the Candidate ID
            </AlertDescription>
          </Alert>

          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="plaintext-pii" className="text-base font-semibold flex items-center gap-2">
                    <LockKey size={18} className="text-primary" />
                    Export with Unencrypted PII (Password Protected)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    When enabled, SSN and birth date will be included in plaintext, but the entire file will be encrypted with a password.
                  </p>
                </div>
                <Switch
                  id="plaintext-pii"
                  checked={usePlaintextPII}
                  onCheckedChange={setUsePlaintextPII}
                  disabled={isLoading}
                />
              </div>

              {usePlaintextPII && (
                <Alert className="border-destructive/50 bg-destructive/10">
                  <Warning className="h-4 w-4 text-destructive" />
                  <AlertDescription className="text-destructive">
                    <strong>Warning:</strong> This export will contain unencrypted SSN and birth date. The file will be encrypted, but ensure you keep the password secure and share it only through secure channels.
                  </AlertDescription>
                </Alert>
              )}

              {usePlaintextPII && (
                <div className="space-y-2">
                  <Label htmlFor="encryption-password" className="flex items-center gap-2">
                    <LockKey size={16} className="text-primary" />
                    Encryption Password (Required)
                  </Label>
                  <Input
                    id="encryption-password"
                    type="password"
                    placeholder="Enter a strong password to encrypt the file"
                    value={encryptionPassword}
                    onChange={(e) => setEncryptionPassword(e.target.value)}
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    This password will be required to decrypt the file. Keep it secure and share it only through approved secure channels.
                  </p>
                </div>
              )}

              {!usePlaintextPII && (
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
                    Required for hashing SSN. Keep this value secure and consistent.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

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
              <Label htmlFor="adp-field">ADP Associate ID Field</Label>
              <select
                id="adp-field"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={adpAssociateIdField}
                onChange={(e) => setAdpAssociateIdField(e.target.value)}
                disabled={isLoading}
              >
                <option value="customText1">Candidate.customText1</option>
                <option value="customText2">Candidate.customText2</option>
                <option value="customText3">Candidate.customText3</option>
                <option value="customText4">Candidate.customText4</option>
                <option value="customText5">Candidate.customText5</option>
                <option value="customText6">Candidate.customText6</option>
                <option value="customText7">Candidate.customText7</option>
                <option value="customText8">Candidate.customText8</option>
                <option value="customText9">Candidate.customText9</option>
                <option value="customText10">Candidate.customText10</option>
                <option value="externalID">Candidate.externalID</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Field containing the ADP Associate ID (used as Employee ID in export)
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
              disabled={isLoading || (usePlaintextPII && !encryptionPassword) || (!usePlaintextPII && !hashSalt) || (filterMode === 'ids' && !placementIds.trim())}
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
                {usePlaintextPII 
                  ? `Download Encrypted File (${exportData.length} records)` 
                  : `Download CSV (${exportData.length} records)`}
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
                    <th className="text-left p-2">Position ID</th>
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Employee ID (ADP)</th>
                    <th className="text-left p-2">Candidate ID</th>
                    <th className="text-left p-2">Tax ID Type</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Hire Date</th>
                    <th className="text-left p-2">Phone</th>
                    <th className="text-left p-2">Rate 1</th>
                    <th className="text-left p-2">Rate 2</th>
                  </tr>
                </thead>
                <tbody>
                  {exportData.slice(0, 10).map((record, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-mono">{record['Position ID']}</td>
                      <td className="p-2">{record['First Name']} {record['Last Name']}</td>
                      <td className="p-2 font-mono text-xs">{record['Employee ID']}</td>
                      <td className="p-2 font-mono text-xs">{record['Work Mail Stop']}</td>
                      <td className="p-2">
                        <Badge variant={record['Tax ID Type'] ? 'default' : 'outline'}>
                          {record['Tax ID Type'] || 'N/A'}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <Badge variant="outline">{record['Employee Status']}</Badge>
                      </td>
                      <td className="p-2">{record['Hire Date']}</td>
                      <td className="p-2 text-xs">{record['Home Phone Number']}</td>
                      <td className="p-2">{record['Rate 1 Amount'] ? '$' + record['Rate 1 Amount'] : ''}</td>
                      <td className="p-2">{record['Rate 2 Amount'] ? '$' + record['Rate 2 Amount'] : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <FileDecryptor />
    </div>
  )
}
