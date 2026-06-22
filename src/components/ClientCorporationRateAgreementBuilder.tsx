import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { Certificate, Upload, DownloadSimple, FileArrowUp, Info } from '@phosphor-icons/react'
import { toast } from 'sonner'
import Papa from 'papaparse'

interface ClientCorporationRateAgreementBuilderProps {
  onLog: (operation: string, status: 'success' | 'error', message: string, details?: any) => void
}

interface CSVRateAgreementRow {
  clientCorporationId: string
  effectiveDate: string
  name?: string
  effectiveEndDate?: string
  employmentTypes?: string
  rootExternalID?: string
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
  customFloat1?: string
  customFloat2?: string
  customFloat3?: string
  customInt1?: string
  customInt2?: string
  customInt3?: string
  customDate1?: string
  customDate2?: string
  customDate3?: string
  earnCodeGroupId: string
  isBase: string
  externalID?: string
  earnCodeId: string
  [key: string]: string | undefined
}

export function ClientCorporationRateAgreementBuilder({ onLog }: ClientCorporationRateAgreementBuilderProps) {
  const [activeTab, setActiveTab] = useState('upload')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<CSVRateAgreementRow[]>([])
  const [loading, setLoading] = useState(false)
  const [previewData, setPreviewData] = useState<any[]>([])

  const cardFields = [
    { field: 'clientCorporationId', label: 'Client Corporation ID', required: true, type: 'integer' },
    { field: 'effectiveDate', label: 'Effective Date', required: true, type: 'date' },
    { field: 'name', label: 'Name', required: false, type: 'string' },
    { field: 'effectiveEndDate', label: 'Effective End Date', required: false, type: 'date' },
    { field: 'employmentTypes', label: 'Employment Types', required: false, type: 'string' },
    { field: 'rootExternalID', label: 'Root External ID', required: false, type: 'string' },
    { field: 'customText1', label: 'OT Pay Threshold', required: false, type: 'string' },
    { field: 'customText2', label: 'OT Bill Threshold', required: false, type: 'string' },
    { field: 'customText3', label: 'Guarantee', required: false, type: 'string' },
    { field: 'customText4', label: 'Custom Text 4', required: false, type: 'string' },
    { field: 'customText5', label: 'Custom Text 5', required: false, type: 'string' },
    { field: 'customText6', label: 'Custom Text 6', required: false, type: 'string' },
    { field: 'customText7', label: 'Rate Type', required: false, type: 'string' },
    { field: 'customText8', label: 'Custom Text 8', required: false, type: 'string' },
    { field: 'customText9', label: 'Custom Text 9', required: false, type: 'string' },
    { field: 'customText10', label: 'Custom Text 10', required: false, type: 'string' },
    { field: 'customFloat1', label: 'Margin', required: false, type: 'double' },
    { field: 'customFloat2', label: 'Weekly Totals', required: false, type: 'double' },
    { field: 'customFloat3', label: 'Weekly Hourly', required: false, type: 'double' },
    { field: 'customInt1', label: 'RCID Number', required: false, type: 'integer' },
    { field: 'customInt2', label: 'Weekly Housing Amount', required: false, type: 'integer' },
    { field: 'customInt3', label: 'Weekly M&I', required: false, type: 'integer' },
    { field: 'customDate1', label: 'Custom Date 1', required: false, type: 'timestamp' },
    { field: 'customDate2', label: 'Custom Date 2', required: false, type: 'timestamp' },
    { field: 'customDate3', label: 'Custom Date 3', required: false, type: 'timestamp' },
  ]

  const lineGroupFields = [
    { field: 'earnCodeGroupId', label: 'Earn Code Group ID', required: true, type: 'integer' },
    { field: 'isBase', label: 'Is Base', required: true, type: 'boolean' },
    { field: 'externalID', label: 'External ID', required: false, type: 'string' },
  ]

  const lineFields = [
    { field: 'earnCodeId', label: 'Earn Code ID', required: true, type: 'integer' },
  ]

  const handleDownloadTemplate = () => {
    const headers = [
      ...cardFields.map(f => f.field),
      ...lineGroupFields.map(f => f.field),
      ...lineFields.map(f => f.field),
    ]

    const exampleRow = {
      clientCorporationId: '12345',
      effectiveDate: '2024-01-01',
      name: 'Rate Agreement Name',
      effectiveEndDate: '2024-12-31',
      earnCodeGroupId: '1',
      isBase: 'TRUE',
      externalID: 'EXT-001',
      earnCodeId: '100',
      customText1: '40',
      customFloat1: '0.15',
      customInt1: '12345',
    }

    const csv = Papa.unparse([exampleRow], { columns: headers })
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `client-corp-rate-agreement-template-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast.success('Template downloaded successfully')
    onLog('Download Template', 'success', 'Downloaded Client Corporation Rate Agreement template', {
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
          successCount,
          duration,
          totalRows: csvData.length,
          totalAgreements: rateAgreementGroups.size
        })
      } else {
        toast.error(`Completed with ${errorCount} error(s). ${successCount} succeeded.`, { id: 'bulk-create' })
        onLog('Create Rate Agreements', 'error', `Created ${successCount}, failed ${errorCount}`, {
          successCount,
          errorCount,
          errors,
          duration,
          totalRows: csvData.length
        })
      }

      setCsvFile(null)
      setCsvData([])
      setPreviewData([])
      const fileInput = document.getElementById('csv-upload-input') as HTMLInputElement
      if (fileInput) fileInput.value = ''

    } catch (error: any) {
      toast.error(`Failed to process rate agreements: ${error.message}`, { id: 'bulk-create' })
      onLog('Create Rate Agreements', 'error', 'Failed to process CSV', {
        error: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Certificate size={32} weight="duotone" className="text-accent" />
            <div>
              <CardTitle>Client Corporation Rate Agreement Builder</CardTitle>
              <CardDescription>
                Create ClientCorporationRateAgreementCards with line groups and lines from CSV
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload" className="gap-2">
              <Upload size={18} />
              Upload CSV
            </TabsTrigger>
            <TabsTrigger value="reference" className="gap-2">
              <Info size={18} />
              Field Reference
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Upload a CSV with rate agreement lines. Each row represents one line in a line group. 
                Multiple rows with the same clientCorporationId will be grouped into one rate agreement card.
                The Bullhorn API will automatically create the card, version, line groups, and lines.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={handleDownloadTemplate}
                  className="gap-2"
                >
                  <DownloadSimple size={18} />
                  Download Template
                </Button>

                <div className="flex-1">
                  <Label htmlFor="csv-upload-input" className="sr-only">
                    Upload CSV File
                  </Label>
                  <Input
                    id="csv-upload-input"
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    disabled={loading}
                  />
                </div>
              </div>

              {csvData.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{csvData.length} rows loaded</Badge>
                      <Badge variant="outline">
                        {new Set(csvData.map(r => r.clientCorporationId)).size} unique client(s)
                      </Badge>
                    </div>
                    <Button
                      onClick={handleCreateRateAgreements}
                      disabled={loading}
                      className="gap-2"
                    >
                      <FileArrowUp size={18} />
                      Create Rate Agreements
                    </Button>
                  </div>

                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Preview (first 5 rows)</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Client Corp ID</th>
                            <th className="text-left p-2">Effective Date</th>
                            <th className="text-left p-2">Name</th>
                            <th className="text-left p-2">Earn Code Group</th>
                            <th className="text-left p-2">Is Base</th>
                            <th className="text-left p-2">Earn Code ID</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.map((row, idx) => (
                            <tr key={idx} className="border-b">
                              <td className="p-2 font-mono text-xs">{row.clientCorporationId}</td>
                              <td className="p-2 font-mono text-xs">{row.effectiveDate}</td>
                              <td className="p-2 text-xs">{row.name || '-'}</td>
                              <td className="p-2 font-mono text-xs">{row.earnCodeGroupId}</td>
                              <td className="p-2">
                                <Badge variant={row.isBase?.toUpperCase() === 'TRUE' ? 'default' : 'secondary'}>
                                  {row.isBase}
                                </Badge>
                              </td>
                              <td className="p-2 font-mono text-xs">{row.earnCodeId}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="reference" className="space-y-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Reference guide for all available fields. Required fields are marked with a badge.
                If a column is missing from your CSV, that field will be skipped unless it's required.
              </AlertDescription>
            </Alert>

            <div className="space-y-6">
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3">Rate Agreement Card Fields</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Fields that define the rate agreement card itself
                </p>
                <div className="grid gap-2">
                  {cardFields.map(field => (
                    <div key={field.field} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-3">
                        <code className="text-sm bg-muted px-2 py-1 rounded">{field.field}</code>
                        <span className="text-sm">{field.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">
                          {field.type}
                        </Badge>
                        {field.required && (
                          <Badge variant="destructive">Required</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3">Line Group Fields</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Fields that define the line groups within the rate agreement
                </p>
                <div className="grid gap-2">
                  {lineGroupFields.map(field => (
                    <div key={field.field} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-3">
                        <code className="text-sm bg-muted px-2 py-1 rounded">{field.field}</code>
                        <span className="text-sm">{field.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">
                          {field.type}
                        </Badge>
                        {field.required && (
                          <Badge variant="destructive">Required</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3">Line Fields</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Fields that define individual lines within each line group
                </p>
                <div className="grid gap-2">
                  {lineFields.map(field => (
                    <div key={field.field} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-3">
                        <code className="text-sm bg-muted px-2 py-1 rounded">{field.field}</code>
                        <span className="text-sm">{field.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">
                          {field.type}
                        </Badge>
                        {field.required && (
                          <Badge variant="destructive">Required</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
