import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Upload, Download, Play } from '@phosphor-icons/react'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { toast } from 'sonner'
import Papa from 'papaparse'

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
    const exampleRow = {
      clientCorporationId: '12345',
      name: 'Example Rate Agreement',
      employmentTypes: 'W2',
      effectiveDate: '2024-01-01',
      effectiveEndDate: '2024-12-31',
      earnCodeGroupId: '100',
      isBase: 'TRUE',
      earnCodeId: '200',
      customText1: 'Example text'
    }
    
    const csv = Papa.unparse([exampleRow], { columns: headers })
    const blob = new Blob([csv], { type: 'text/csv' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.setAttribute('download', `client-corp-rate-agreement-template-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast.success('Template downloaded successfully')
    onLog('Download Template', 'success', 'Downloaded rate agreement template', {
      fieldCount: headers.length
    })
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
          successCount,
          duration,
          totalGroups: rateAgreementGroups.size
        })
      } else {
        toast.error(`Created ${successCount}, failed ${errorCount} in ${duration}s`, { id: 'bulk-create' })
        onLog('Create Rate Agreements', 'error', `Completed with errors: ${successCount} success, ${errorCount} failed`, {
          successCount,
          errorCount,
          duration,
          errors: errors.slice(0, 10)
        })
      }

    } catch (error: any) {
      toast.error(`Bulk create failed: ${error.message}`, { id: 'bulk-create' })
      onLog('Create Rate Agreements', 'error', 'Bulk create operation failed', {
        error: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Corporation Rate Agreement Builder</CardTitle>
        <CardDescription>
          Build ClientCorporationRateAgreementCards with nested LineGroups and Lines from CSV
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <Button onClick={downloadTemplate} variant="outline">
            <Download />
            Download Template
          </Button>

          <div className="flex-1">
            <Label htmlFor="csv-upload" className="cursor-pointer">
              <div className="flex items-center gap-2 px-4 py-2 border border-border rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
                <Upload size={18} />
                <span>{csvFile ? csvFile.name : 'Choose CSV File'}</span>
              </div>
              <Input
                id="csv-upload"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </Label>
          </div>

          <Button
            onClick={handleCreateRateAgreements}
            disabled={csvData.length === 0 || loading}
          >
            <Play />
            {loading ? 'Creating...' : 'Create Rate Agreements'}
          </Button>
        </div>

        {csvData.length > 0 && (
          <>
            <Separator />
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Data Preview</h3>
                <Badge variant="secondary">
                  {csvData.length} total rows
                </Badge>
              </div>

              {previewData.length > 0 && (
                <div className="border rounded-md overflow-auto max-h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Object.keys(previewData[0]).map(key => (
                          <TableHead key={key} className="whitespace-nowrap">
                            {key}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.map((row, idx) => (
                        <TableRow key={idx}>
                          {Object.values(row).map((value, cellIdx) => (
                            <TableCell key={cellIdx} className="font-mono text-sm">
                              {String(value)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
