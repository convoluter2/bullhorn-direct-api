import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, Download, Play } from '@phosphor-icons/react'

import Papa from 'papaparse'
  name?: string

  customText3?: string
  customText5?: string
 

  customInt1?: string
  customDate1?: string
  name?: string
  employmentTypes?: string
  customText1?: string
  customText2?: string
  customText3?: string
  customText4?: string
  customText5?: string
  customText6?: string
  customText7?: string
  customFloat1?: string
  customFloat2?: string
  customFloat3?: string
  customInt1?: string
  customInt2?: string
  customDate1?: string
  customDate2?: string
  customDate3?: string
  effectiveDate: string
  effectiveEndDate?: string
  earnCodeGroupId: string
    { field: 'customT
  isBase: string
    { field: 'custom
}

export function ClientCorporationRateAgreementBuilder({ onLog }: ClientCorporationRateAgreementBuilderProps) {
    toast.success('Template downloaded')

    if (!file) return
    setCsvFile(file)

      skipEmptyLines: 
        setCsvData(results.data)
        toast.success(`Loaded ${results.data.length} 
          fileName: file.name,
        })
      error: (error) => {
        onLog('CSV Upload', 'error', 'Failed to parse CSV file', { er
    })

    if (csvData.length === 0) {
      return

    const startTime = Date.now()
    let errorCount = 0

      const rateAgreementGroups = new Map<string, CSVRateAgreementRo
      csvData.forEach(row => {
        if (!rateAgreementGroups.has(key)) {
        }
      })
      toast.loading(`Processing ${rateAgreementGroups.size} rate agreement(s)...`,
      for (const [key, rows] of rateAgreementGroups.entries()) {
          const firstRow = rows[0]
          const cardPayload: any = {
            effectiveDate: firstRow.effectiveDate,


              if (fieldDef.type ==
              } else if (fieldDef.type === 'doub
              } else if (fieldDef.type === 'boo
              } else if (fieldDef.type === 'timestamp') {
              } else {
              }
          })
          const lineGroupsMap = new Map<string
          row
            if (!lineGroupsM
            }
   

            lineGroupsMap.get(groupKey)!.pus
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
      toast

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
          
                      {Object.keys(previe
            successCount++
            console.log(`✅ Created rate agreement card ${response.changedEntityId} for client ${firstRow.clientCorporationId}`)
          } else {
                  </thea
            errors.push({
              clientCorporationId: firstRow.clientCorporationId,
              error: 'No changedEntityId in response'

          }

        } catch (error: any) {

          errors.push({

            error: error.message || String(error)

          console.error(`❌ Failed to create rate agreement for ${key}:`, error)

      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2)

      if (errorCount === 0) {
        toast.success(`Created ${successCount} rate agreement(s) in ${duration}s`, { id: 'bulk-create' })
        onLog('Create Rate Agreements', 'success', `Created ${successCount} rate agreement(s)`, {













































































































