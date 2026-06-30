import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, Download, Play } from '@phosphor-icons/react'
import { toast } from 'sonner'
import Papa from 'papaparse'
import { bullhornAPI } from '@/lib/bullhorn-api'

interface ClientCorporationRateAgreementBuilderProps {
  onLog: (operation: string, status: 'success' | 'error', message: string, details?: any) => void
}

interface CSVRateAgreementRow {
  clientCorporationId: string
  effectiveDate: string
  effectiveEndDate?: string
  earnCodeGroupId: string
  earnCodeId: string
  externalID?: string
  isBase: string
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
}

const cardFields = [
  { field: 'clientCorporationId', type: 'integer' },
  { field: 'effectiveDate', type: 'timestamp' },
  { field: 'effectiveEndDate', type: 'timestamp' },
  { field: 'name', type: 'string' },
  { field: 'employmentTypes', type: 'string' },
  { field: 'customText1', type: 'string' },
  { field: 'customText2', type: 'string' },
  { field: 'customText3', type: 'string' },
  { field: 'customText4', type: 'string' },
  { field: 'customText5', type: 'string' },
  { field: 'customText6', type: 'string' },
  { field: 'customText7', type: 'string' },
  { field: 'customFloat1', type: 'double' },
  { field: 'customFloat2', type: 'double' },
  { field: 'customFloat3', type: 'double' },
  { field: 'customInt1', type: 'integer' },
  { field: 'customInt2', type: 'integer' },
  { field: 'customDate1', type: 'timestamp' },
  { field: 'customDate2', type: 'timestamp' },
  { field: 'customDate3', type: 'timestamp' }
]

export function ClientCorporationRateAgreementBuilder({ onLog }: ClientCorporationRateAgreementBuilderProps) {
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<CSVRateAgreementRow[]>([])
  const [previewData, setPreviewData] = useState<CSVRateAgreementRow[]>([])
  const [loading, setLoading] = useState(false)

  const downloadTemplate = () => {
    const headers = [
      'clientCorporationId',
      'effectiveDate',
      'effectiveEndDate',
      'name',
      'employmentTypes',
      'earnCodeGroupId',
      'earnCodeId',
      'externalID',
      'isBase',
      'customText1',
      'customText2',
      'customText3',
      'customText4',
      'customText5',
      'customText6',
      'customText7',
      'customFloat1',
      'customFloat2',
      'customFloat3',
      'customInt1',
      'customInt2',
      'customDate1',
      'customDate2',
      'customDate3'
    ]

    const csv = headers.join(',')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'rate-agreement-template.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Template downloaded')
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
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
            effectiveDate: firstRow.effectiveDate
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
        toast.warning(`Created ${successCount}, failed ${errorCount} in ${duration}s`, { id: 'bulk-create' })
        onLog('Create Rate Agreements', 'error', `Completed with ${errorCount} error(s)`, {
          successCount,
          errorCount,
          duration,
          errors
        })
      }

    } catch (error: any) {
      toast.error('Rate agreement creation failed', { id: 'bulk-create' })
      onLog('Create Rate Agreements', 'error', 'Bulk creation failed', { error: error.message })
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
            Create ClientCorporationRateAgreementCards with line groups and lines from CSV
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={downloadTemplate} variant="outline">
              <Download />
              Download Template
            </Button>

            <label>
              <Button variant="outline" asChild>
                <span>
                  <Upload />
                  Upload CSV
                </span>
              </Button>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {csvData.length > 0 && (
              <Button onClick={handleCreateRateAgreements} disabled={loading}>
                <Play />
                Create Rate Agreements
              </Button>
            )}
          </div>

          {csvFile && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{csvFile.name}</Badge>
              <Badge>{csvData.length} rows</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {previewData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Preview (first 5 rows)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    {Object.keys(previewData[0]).map(key => (
                      <th key={key} className="px-2 py-2 text-left font-medium">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, idx) => (
                    <tr key={idx} className="border-b">
                      {Object.values(row).map((val, i) => (
                        <td key={i} className="px-2 py-2">
                          {String(val)}
                        </td>
                      ))}
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
