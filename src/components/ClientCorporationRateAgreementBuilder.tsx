import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Upload, Download, Play } from '@phos
import { toast } from 'sonner'

  onLog: (operation: string, status: 'success' | 'err

  clientCorporationId: string
  employmentTypes?: string
  customText2?: string

  customText6?: string
  customFloat1?: string
 

  customDate2?: string
  effectiveDate: string
  earnCodeGroup
  isBase: string
}
export function Client
  const [csvData, setC
  const [loading, setL
  const cardFields = [
    { field: 'name', l
    { field: 'customTe
    { field: 'customTex
    { field: 'customTex
    { field: 'customTex
    { field: 'customF
    { field: 'customI
    { field: 'customDa
  customDate2?: string
  customDate3?: string
  effectiveDate: string
  effectiveEndDate?: string
  earnCodeGroupId: string
  externalID?: string
  isBase: string
  earnCodeId: string
}

export function ClientCorporationRateAgreementBuilder({ onLog }: ClientCorporationRateAgreementBuilderProps) {
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<CSVRateAgreementRow[]>([])
  const [previewData, setPreviewData] = useState<CSVRateAgreementRow[]>([])
  const [loading, setLoading] = useState(false)

  const cardFields = [
    { field: 'clientCorporationId', label: 'Client Corporation ID', type: 'integer' },
    { field: 'name', label: 'Name', type: 'string' },
    { field: 'employmentTypes', label: 'Employment Types', type: 'string' },
    { field: 'customText1', label: 'Custom Text 1', type: 'string' },
    { field: 'customText2', label: 'Custom Text 2', type: 'string' },
    { field: 'customText3', label: 'Custom Text 3', type: 'string' },
    { field: 'customText4', label: 'Custom Text 4', type: 'string' },
    { field: 'customText5', label: 'Custom Text 5', type: 'string' },
    { field: 'customText6', label: 'Custom Text 6', type: 'string' },
    { field: 'customText7', label: 'Custom Text 7', type: 'string' },
    { field: 'customFloat1', label: 'Custom Float 1', type: 'double' },
    { field: 'customFloat2', label: 'Custom Float 2', type: 'double' },
    { field: 'customFloat3', label: 'Custom Float 3', type: 'double' },
    { field: 'customInt1', label: 'Custom Int 1', type: 'integer' },
    { field: 'customInt2', label: 'Custom Int 2', type: 'integer' },
    { field: 'customDate1', label: 'Custom Date 1', type: 'timestamp' },
    { field: 'customDate2', label: 'Custom Date 2', type: 'timestamp' },
    { field: 'customDate3', label: 'Custom Date 3', type: 'timestamp' },
    { field: 'effectiveDate', label: 'Effective Date', type: 'timestamp' },
    { field: 'effectiveEndDate', label: 'Effective End Date', type: 'timestamp' },
    { field: 'earnCodeGroupId', label: 'Earn Code Group ID', type: 'integer' },
    { field: 'externalID', label: 'External ID', type: 'string' },
    { field: 'isBase', label: 'Is Base', type: 'boolean' },
    { field: 'earnCodeId', label: 'Earn Code ID', type: 'integer' }
  ]

  const downloadTemplate = () => {
    const headers = cardFields.map(f => f.field)
          const firstRow
          const cardPayload: any = 
            effectiveDate: firstRow.e

            const value = firstRow
              if (fieldDef.type === '
              } else if (fiel
              } else 
              } else if 
              } else {
     
    
          const lineGroupsMap = new Map<string, any[]>()
          rows.forEach(row => {
            if (!lineGroupsMap.has(groupKey)
            }
            const lineData: any = {
            }
            line

    
            
              earnCodeGroup: { id: parseInt(groupId) },
              clientCorporationR

   

          }
          cardPayload.clientCorporationR
    if (!file) return

    setCsvFile(file)
    
    Papa.parse<CSVRateAgreementRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvData(results.data)
        setPreviewData(results.data.slice(0, 5))
        toast.success(`Loaded ${results.data.length} rows from CSV`)
        onLog('CSV Upload', 'success', `Loaded ${results.data.length} rows`, {
          fileName: file.name,
          rowCount: results.data.length
        })
      },
      error: (error) => {
        toast.error(`Failed to parse CSV: ${error.message}`)
        onLog('CSV Upload', 'error', 'Failed to parse CSV file', { error: error.message })
      }
    })
  }

  const handleCreateRateAgreements = async () => {
    if (csvData.length === 0) {
      toast.error('No data to process')
      return
    }

    setLoading(true)
    const startTime = Date.now()
    let successCount = 0
    let errorCount = 0
    const errors: any[] = []

    try {
      const rateAgreementGroups = new Map<string, CSVRateAgreementRow[]>()
      
      csvData.forEach(row => {
        const key = `${row.clientCorporationId}`
        if (!rateAgreementGroups.has(key)) {
          rateAgreementGroups.set(key, [])
        }
        rateAgreementGroups.get(key)!.push(row)
      })

      toast.loading(`Processing ${rateAgreementGroups.size} rate agreement(s)...`, { id: 'bulk-create' })

      for (const [key, rows] of rateAgreementGroups.entries()) {
        try {
          const firstRow = rows[0]
          
          const cardPayload: any = {
            clientCorporation: { id: parseInt(firstRow.clientCorporationId) },
            effectiveDate: firstRow.effectiveDate,
          }

          cardFields.forEach(fieldDef => {
            const value = firstRow[fieldDef.field as keyof CSVRateAgreementRow]
            if (value !== undefined && value !== '' && fieldDef.field !== 'clientCorporationId' && fieldDef.field !== 'effectiveDate') {
              if (fieldDef.type === 'integer') {
                cardPayload[fieldDef.field] = parseInt(value)
              } else if (fieldDef.type === 'double') {
                cardPayload[fieldDef.field] = parseFloat(value)
              } else if (fieldDef.type === 'boolean') {
                cardPayload[fieldDef.field] = value.toUpperCase() === 'TRUE'
              } else if (fieldDef.type === 'timestamp') {
                cardPayload[fieldDef.field] = new Date(value).getTime()
              } else {
                cardPayload[fieldDef.field] = value
              }
            }
          })

          const lineGroupsMap = new Map<string, any[]>()
          
          rows.forEach(row => {
            const groupKey = row.earnCodeGroupId
            if (!lineGroupsMap.has(groupKey)) {
              lineGroupsMap.set(groupKey, [])
            }
            
            const lineData: any = {
              earnCode: { id: parseInt(row.earnCodeId) }
            }

            lineGroupsMap.get(groupKey)!.push(lineData)
          })

          const lineGroups: any[] = []
          for (const [groupId, lines] of lineGroupsMap.entries()) {
            const groupRow = rows.find(r => r.earnCodeGroupId === groupId)
            
            const groupPayload: any = {
              earnCodeGroup: { id: parseInt(groupId) },
              isBase: groupRow!.isBase.toUpperCase() === 'TRUE',
              clientCorporationRateAgreementCardLines: lines
            }

            if (groupRow!.externalID) {
              groupPayload.externalID = groupRow!.externalID
            }

            lineGroups.push(groupPayload)
          }

          cardPayload.clientCorporationRateAgreementCardLineGroups = lineGroups

          const response = await bullhornAPI.createEntity('ClientCorporationRateAgreementCard', cardPayload)
          
          if (response.changedEntityId) {
            successCount++
            console.log(`✅ Created rate agreement card ${response.changedEntityId} for client ${firstRow.clientCorporationId}`)
          } else {
            errorCount++
            errors.push({
              clientCorporationId: firstRow.clientCorporationId,
              error: 'No changedEntityId in response'
              
          }

        } catch (error: any) {
            </div>
          errors.push({
      </CardCont
            error: error.message || String(error)
}
          console.error(`❌ Failed to create rate agreement for ${key}:`, error)

      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2)

      if (errorCount === 0) {
        toast.success(`Created ${successCount} rate agreement(s) in ${duration}s`, { id: 'bulk-create' })
        onLog('Create Rate Agreements', 'success', `Created ${successCount} rate agreement(s)`, {












































































































