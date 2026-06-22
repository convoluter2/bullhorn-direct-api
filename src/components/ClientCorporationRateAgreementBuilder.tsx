import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, Download, Play } from '@phosphor-icons/react'
import { toast } from 'sonner'
import Papa from 'papaparse'
import { bullhornAPI } from '@/lib/bullhorn-api'

interface ClientCorporationRateAgreementBuilderProps {
  onLog: (operation: string, status: 'success' | 'error', message: string, details?: any) => void
}

interface CSVRateAgreementRow {
  clientCorporationId: string
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
    const csvContent = headers.join(',') + '\n'
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'rate_agreement_template.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Template downloaded')
  }

  const handleFileUpload = (file: File) => {
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
            })
          }

        } catch (error: any) {
          errorCount++
          errors.push({
            clientCorporationId: key,
            error: error.message || String(error)
          })
          console.error(`❌ Failed to create rate agreement for ${key}:`, error)
        }
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2)

      if (errorCount === 0) {
        toast.success(`Created ${successCount} rate agreement(s) in ${duration}s`, { id: 'bulk-create' })
        onLog('Create Rate Agreements', 'success', `Created ${successCount} rate agreement(s)`, {
          successCount,
          duration,
          totalRecords: csvData.length
        })
      } else {
        toast.error(`Completed with ${errorCount} error(s)`, { id: 'bulk-create' })
        onLog('Create Rate Agreements', 'error', `Completed with ${errorCount} error(s)`, {
          successCount,
          errorCount,
          duration,
          errors
        })
      }

    } catch (error: any) {
      toast.error(`Failed: ${error.message}`, { id: 'bulk-create' })
      onLog('Create Rate Agreements', 'error', 'Failed to create rate agreements', { error: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Client Corporation Rate Agreement Builder</CardTitle>
          <CardDescription>
            Upload a CSV file to create Client Corporation Rate Agreement Cards with line groups and lines
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download />
              Download Template
            </Button>
            <Label htmlFor="csv-upload" className="cursor-pointer">
              <Button variant="outline" asChild>
                <span>
                  <Upload />
                  Upload CSV
                </span>
              </Button>
              <input
                id="csv-upload"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileUpload(file)
                }}
              />
            </Label>
          </div>

          {csvFile && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{csvData.length} rows loaded</Badge>
                <span className="text-sm text-muted-foreground">{csvFile.name}</span>
              </div>
            </div>
          )}

          {previewData.length > 0 && (
            <div className="space-y-2">
              <Label>Preview (first 5 rows)</Label>
              <div className="border rounded-md overflow-auto max-h-64">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      {Object.keys(previewData[0]).map((key) => (
                        <th key={key} className="p-2 text-left font-medium">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, idx) => (
                      <tr key={idx} className="border-t">
                        {Object.values(row).map((val, i) => (
                          <td key={i} className="p-2">
                            {String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <Button 
            onClick={handleCreateRateAgreements} 
            disabled={csvData.length === 0 || loading}
            className="w-full"
          >
            <Play />
            {loading ? 'Creating...' : 'Create Rate Agreements'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
