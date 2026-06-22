import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Input } from '@/components/ui/input'
import { bullhornAPI } from '@/lib/bullhorn-a
import { toast } from 'sonner'

  onLog: (operation: string, status: 'success' | 'error', messa

  clientCorporationId: string
  name?: string
  employmentTypes?: string

  customText3?: string
  customText5?: string
 

  customFloat1?: string
  customFloat3?: string
  customInt2?: string
  customDate1?:
  customDate3?: string
  isBase: string
  earnCodeId: string
}
export function Client
  const [csvFile, setC
  const [loading, setL

    { field: 'clientCo
    { field: 'name', l
    { field: 'employme
    { field: 'customTe
    { field: 'customTex
    { field: 'customTex
    { field: 'customTex
    { field: 'customTex
    { field: 'customF
    { field: 'customF
    { field: 'customI
    { field: 'customDa
    { field: 'customDa

    { field: 'earnCodeGro
    { field: 'ex

    { field: 'earnCo

 

    ]
    const exampleRow = {
      effectiveDate: '2024-01-01',
      effectiveEndDate: '2024-12-31',
      isBase: 'TRUE',
      earnCodeId: '100',

    }
    const csv = Papa.unparse([exampleRow], { columns: headers })
    const link = document.createElement('a')
    
    link.setAttribute('download', `client-corp-rate-agreement-template-${new Date().toISOStrin
    document.body.appendChild(link)
    document.body.removeChild(link)
    toast.success('Template downloaded successfully')
      fieldCount: headers.length
  }
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!file) return
    setCsvFile(file)
    Papa.parse<CSVRateAgreementRow>(file, {
      skipEmptyLines: true,
        setCsvData(results.data)
        toast.success(`Loaded ${results.data.length} rows from CSV`)
          fileName: file.name,
        })
      error: (error) => {
        onLog('CSV Upload', 'error', 'Failed to parse CSV file', { error: error.mess
    })

    if (csvData.length === 0) {
      return

   


      const rateAgreementGroups = new Map<string, CSVRateAgreementRow[]>()
      csvData.forEach(row => {
        if (!rateAgreementGroups.has(key)) {
   

      toast.loading(`P
      for (const [key, rows] of rateAgreementGroups.entries()) {
   

            effectiveDate: firstRow.effe

            const value = firstRow[fie
              if (fieldDef.type === 'intege
              } else if (fieldDef.type
     

              } else {
              }
          })
          const lineGroupsMap = ne
          rows.forEach(row => {
            if (!lineGroups
            }
            const lineData: 
            }
            lineGroupsMa

          for (const [grou
     

              clientCorporationRateAgreementCardLines: lines

              groupPayload.externalID = grou

    
          cardPayload.clientCorpor
          const response = await bullhornAPI.createEntity('ClientCorporationRateAgreementCard', cardPayload)
          if (response.changedEntity
            console.log(`✅ Created 
            erro
              clientCorporationId: 
    

          errorCount++
            key,
      
   


        toast.success(`Created ${success
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
            const value = firstRow[fieldDef.field]
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
            })
          }

        } catch (error: any) {
          errorCount++
          errors.push({
            key,
            error: error.message || String(error)
          })
          console.error(`❌ Failed to create rate agreement for ${key}:`, error)
        }
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2)

      if (errorCount === 0) {
        toast.success(`Created ${successCount} rate agreement(s) in ${duration}s`, { id: 'bulk-create' })
        onLog('Create Rate Agreements', 'success', `Created ${successCount} rate agreement(s)`, {




















































































































































































































































