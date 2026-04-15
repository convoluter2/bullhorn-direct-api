import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, Plus, Trash, CheckCircle, XCircle, File, Lightning, Clock, DownloadSimple, Eye } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { parseCSV, parseExcel } from '@/lib/csv-utils'

interface RateCardBuilderProps {
  onLog: (operation: string, status: 'success' | 'error', message: string, details?: any) => void
}

interface RateCardLine {
  earnCodeId: string
  earnCodeName?: string
  payMultiplier: string
  payRate: string
  billMultiplier: string
  billRate: string
  markupPercent: string
  markupValue: string
  customText1: string
  customFloat1: string
}

interface RateCardLineGroup {
  earnCodeGroupId: string
  earnCodeGroupName?: string
  isBase: boolean
  lines: RateCardLine[]
}

interface RateCardConfig {
  placementId: string
  effectiveDate: string
  lineGroups: RateCardLineGroup[]
}

interface ProcessingResult {
  placementId: string
  status: 'success' | 'error'
  message: string
  rateCardId?: number
  versionId?: number
  error?: any
}

export function RateCardBuilder({ onLog }: RateCardBuilderProps) {
  const [csvData, setCsvData] = useState<{ headers: string[]; rows: string[][] } | null>(null)
  const [rateCards, setRateCards] = useState<RateCardConfig[]>([])
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState<ProcessingResult[]>([])
  const [previewMode, setPreviewMode] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [manualPlacementId, setManualPlacementId] = useState('')
  const [manualEffectiveDate, setManualEffectiveDate] = useState('')
  const [manualLineGroups, setManualLineGroups] = useState<RateCardLineGroup[]>([
    {
      earnCodeGroupId: '',
      earnCodeGroupName: '',
      isBase: true,
      lines: [
        {
          earnCodeId: '',
          earnCodeName: '',
          payMultiplier: '1',
          payRate: '',
          billMultiplier: '1',
          billRate: '',
          markupPercent: '',
          markupValue: '',
          customText1: '',
          customFloat1: ''
        }
      ]
    }
  ])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      let headers: string[] = []
      let rows: string[][] = []

      if (file.name.endsWith('.csv')) {
        const result = await parseCSV(file)
        headers = result.headers
        rows = result.rows
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const result = await parseExcel(file)
        headers = result.headers
        rows = result.rows
      } else {
        toast.error('Unsupported file type. Please upload CSV or Excel file.')
        return
      }

      setCsvData({ headers, rows })
      parseCSVToRateCards(headers, rows)
      toast.success(`Loaded ${rows.length} rows from ${file.name}`)
    } catch (error) {
      console.error('File upload error:', error)
      toast.error('Failed to parse file: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const parseCSVToRateCards = (headers: string[], rows: string[][]) => {
    const configs: RateCardConfig[] = []
    const placementGroups = new Map<string, string[][]>()

    const placementIdIndex = headers.findIndex(h => 
      h.toLowerCase().trim() === 'placementid' || 
      h.toLowerCase().trim() === 'placement id' ||
      h.toLowerCase().trim() === 'placement'
    )
    
    if (placementIdIndex === -1) {
      toast.error('CSV must contain a "placementId" column')
      return
    }

    rows.forEach(row => {
      const placementId = row[placementIdIndex]?.trim()
      if (placementId) {
        if (!placementGroups.has(placementId)) {
          placementGroups.set(placementId, [])
        }
        placementGroups.get(placementId)!.push(row)
      }
    })

    placementGroups.forEach((placementRows, placementId) => {
      const firstRow = placementRows[0]
      
      const effectiveDateIndex = headers.findIndex(h => 
        h.toLowerCase().trim() === 'effectivedate' || 
        h.toLowerCase().trim() === 'effective date'
      )
      const effectiveDate = effectiveDateIndex !== -1 ? firstRow[effectiveDateIndex]?.trim() : ''

      const lineGroupMap = new Map<string, { isBase: boolean; lines: RateCardLine[] }>()

      placementRows.forEach(row => {
        const earnCodeGroupIdIndex = headers.findIndex(h => 
          h.toLowerCase().trim() === 'earncodegroupid' || 
          h.toLowerCase().trim() === 'earn code group id'
        )
        const earnCodeIdIndex = headers.findIndex(h => 
          h.toLowerCase().trim() === 'earncodeid' || 
          h.toLowerCase().trim() === 'earn code id'
        )
        const isBaseIndex = headers.findIndex(h => 
          h.toLowerCase().trim() === 'isbase' || 
          h.toLowerCase().trim() === 'is base'
        )

        const earnCodeGroupId = earnCodeGroupIdIndex !== -1 ? row[earnCodeGroupIdIndex]?.trim() : ''
        const earnCodeId = earnCodeIdIndex !== -1 ? row[earnCodeIdIndex]?.trim() : ''
        const isBase = isBaseIndex !== -1 ? 
          (row[isBaseIndex]?.trim().toLowerCase() === 'true' || row[isBaseIndex]?.trim() === '1') : 
          false

        if (!earnCodeGroupId || !earnCodeId) return

        if (!lineGroupMap.has(earnCodeGroupId)) {
          lineGroupMap.set(earnCodeGroupId, { isBase, lines: [] })
        }

        const line: RateCardLine = {
          earnCodeId,
          payMultiplier: getColumnValue(headers, row, ['paymultiplier', 'pay multiplier']) || '1',
          payRate: getColumnValue(headers, row, ['payrate', 'pay rate']) || '',
          billMultiplier: getColumnValue(headers, row, ['billmultiplier', 'bill multiplier']) || '1',
          billRate: getColumnValue(headers, row, ['billrate', 'bill rate']) || '',
          markupPercent: getColumnValue(headers, row, ['markuppercent', 'markup percent']) || '',
          markupValue: getColumnValue(headers, row, ['markupvalue', 'markup value']) || '',
          customText1: getColumnValue(headers, row, ['customtext1', 'custom text 1']) || '',
          customFloat1: getColumnValue(headers, row, ['customfloat1', 'custom float 1']) || ''
        }

        lineGroupMap.get(earnCodeGroupId)!.lines.push(line)
      })

      const lineGroups: RateCardLineGroup[] = Array.from(lineGroupMap.entries()).map(([groupId, data]) => ({
        earnCodeGroupId: groupId,
        isBase: data.isBase,
        lines: data.lines
      }))

      configs.push({
        placementId,
        effectiveDate,
        lineGroups
      })
    })

    setRateCards(configs)
    toast.success(`Parsed ${configs.length} rate card(s) from CSV`)
  }

  const getColumnValue = (headers: string[], row: string[], columnNames: string[]): string => {
    for (const name of columnNames) {
      const index = headers.findIndex(h => h.toLowerCase().trim() === name.toLowerCase())
      if (index !== -1 && row[index]) {
        return row[index].trim()
      }
    }
    return ''
  }

  const buildPayload = (config: RateCardConfig) => {
    const payload: any = {
      placement: { id: parseInt(config.placementId) },
      effectiveDate: config.effectiveDate,
      placementRateCardLineGroups: config.lineGroups.map(group => ({
        isBase: group.isBase,
        earnCodeGroup: { id: parseInt(group.earnCodeGroupId) },
        placementRateCardLines: group.lines.map(line => {
          const lineData: any = {
            earnCode: { id: parseInt(line.earnCodeId) }
          }

          if (line.payMultiplier) lineData.payMultiplier = parseFloat(line.payMultiplier)
          if (line.payRate) lineData.payRate = line.payRate
          if (line.billMultiplier) lineData.billMultiplier = parseFloat(line.billMultiplier)
          if (line.billRate) lineData.billRate = line.billRate
          if (line.markupPercent) lineData.markupPercent = line.markupPercent
          if (line.markupValue) lineData.markupValue = line.markupValue
          if (line.customText1) lineData.customText1 = line.customText1
          if (line.customFloat1) lineData.customFloat1 = line.customFloat1

          return lineData
        })
      }))
    }

    return payload
  }

  const processRateCards = async () => {
    if (rateCards.length === 0) {
      toast.error('No rate cards to process')
      return
    }

    setProcessing(true)
    setResults([])
    const newResults: ProcessingResult[] = []

    for (let i = 0; i < rateCards.length; i++) {
      const config = rateCards[i]
      
      try {
        const payload = buildPayload(config)
        
        console.log(`Processing rate card ${i + 1}/${rateCards.length} for placement ${config.placementId}`, payload)

        const response = await bullhornAPI.updateEntity('PlacementRateCard', payload)

        newResults.push({
          placementId: config.placementId,
          status: 'success',
          message: 'Rate card created successfully',
          rateCardId: response.changedEntityId,
          versionId: response.changedVersionId
        })

        onLog('RateCard Create', 'success', `Created rate card for placement ${config.placementId}`, {
          placementId: config.placementId,
          rateCardId: response.changedEntityId,
          versionId: response.changedVersionId,
          lineGroupCount: config.lineGroups.length,
          response
        })

        toast.success(`Rate card created for placement ${config.placementId}`)
      } catch (error) {
        console.error(`Failed to create rate card for placement ${config.placementId}:`, error)
        
        newResults.push({
          placementId: config.placementId,
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
          error
        })

        onLog('RateCard Create', 'error', `Failed to create rate card for placement ${config.placementId}`, {
          placementId: config.placementId,
          error: error instanceof Error ? error.message : String(error)
        })

        toast.error(`Failed for placement ${config.placementId}`)
      }

      setResults([...newResults])
    }

    setProcessing(false)
    const successCount = newResults.filter(r => r.status === 'success').length
    const errorCount = newResults.filter(r => r.status === 'error').length
    
    toast.success(`Completed: ${successCount} success, ${errorCount} failed`)
  }

  const addManualLineGroup = () => {
    setManualLineGroups([
      ...manualLineGroups,
      {
        earnCodeGroupId: '',
        isBase: false,
        lines: [
          {
            earnCodeId: '',
            payMultiplier: '1',
            payRate: '',
            billMultiplier: '1',
            billRate: '',
            markupPercent: '',
            markupValue: '',
            customText1: '',
            customFloat1: ''
          }
        ]
      }
    ])
  }

  const removeLineGroup = (groupIndex: number) => {
    setManualLineGroups(manualLineGroups.filter((_, i) => i !== groupIndex))
  }

  const addLineToGroup = (groupIndex: number) => {
    const updated = [...manualLineGroups]
    updated[groupIndex].lines.push({
      earnCodeId: '',
      payMultiplier: '1',
      payRate: '',
      billMultiplier: '1',
      billRate: '',
      markupPercent: '',
      markupValue: '',
      customText1: '',
      customFloat1: ''
    })
    setManualLineGroups(updated)
  }

  const removeLineFromGroup = (groupIndex: number, lineIndex: number) => {
    const updated = [...manualLineGroups]
    updated[groupIndex].lines = updated[groupIndex].lines.filter((_, i) => i !== lineIndex)
    setManualLineGroups(updated)
  }

  const updateLineGroup = (groupIndex: number, field: keyof RateCardLineGroup, value: any) => {
    const updated = [...manualLineGroups]
    updated[groupIndex] = { ...updated[groupIndex], [field]: value }
    setManualLineGroups(updated)
  }

  const updateLine = (groupIndex: number, lineIndex: number, field: keyof RateCardLine, value: string) => {
    const updated = [...manualLineGroups]
    updated[groupIndex].lines[lineIndex] = {
      ...updated[groupIndex].lines[lineIndex],
      [field]: value
    }
    setManualLineGroups(updated)
  }

  const createManualRateCard = () => {
    if (!manualPlacementId || !manualEffectiveDate) {
      toast.error('Placement ID and Effective Date are required')
      return
    }

    const hasValidGroups = manualLineGroups.some(g => 
      g.earnCodeGroupId && g.lines.some(l => l.earnCodeId)
    )

    if (!hasValidGroups) {
      toast.error('At least one line group with one line is required')
      return
    }

    const config: RateCardConfig = {
      placementId: manualPlacementId,
      effectiveDate: manualEffectiveDate,
      lineGroups: manualLineGroups.filter(g => 
        g.earnCodeGroupId && g.lines.some(l => l.earnCodeId)
      )
    }

    setRateCards([config])
    toast.success('Manual rate card configuration created')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightning className="text-accent" size={24} weight="duotone" />
            Rate Card Builder
          </CardTitle>
          <CardDescription>
            Create PlacementRateCards with nested line groups and lines. Upload a CSV file or manually configure rate cards.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="csv" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="csv">CSV Upload</TabsTrigger>
              <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            </TabsList>

            <TabsContent value="csv" className="space-y-4">
              <Alert>
                <File size={18} />
                <AlertTitle>CSV Format</AlertTitle>
                <AlertDescription>
                  <div className="text-sm mt-2 space-y-1">
                    <p><strong>Required columns:</strong> placementId, earnCodeGroupId, earnCodeId, isBase, effectiveDate</p>
                    <p><strong>Optional columns:</strong> payMultiplier, payRate, billMultiplier, billRate, markupPercent, markupValue, customText1, customFloat1</p>
                    <p className="mt-2">Multiple rows with the same placementId will be grouped together. Each row represents one rate card line.</p>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="csv-upload">Upload CSV or Excel File</Label>
                  <Input
                    id="csv-upload"
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="mt-1.5"
                  />
                </div>
              </div>

              {csvData && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>CSV Preview</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewMode(!previewMode)}
                    >
                      <Eye size={16} />
                      {previewMode ? 'Hide' : 'Show'} Data
                    </Button>
                  </div>
                  
                  {previewMode && (
                    <ScrollArea className="h-64 border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {csvData.headers.map((header, i) => (
                              <TableHead key={i} className="font-mono text-xs">
                                {header}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {csvData.rows.slice(0, 20).map((row, i) => (
                            <TableRow key={i}>
                              {row.map((cell, j) => (
                                <TableCell key={j} className="font-mono text-xs">
                                  {cell}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="manual" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="placement-id">Placement ID</Label>
                  <Input
                    id="placement-id"
                    value={manualPlacementId}
                    onChange={(e) => setManualPlacementId(e.target.value)}
                    placeholder="e.g., 600830"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="effective-date">Effective Date</Label>
                  <Input
                    id="effective-date"
                    type="date"
                    value={manualEffectiveDate}
                    onChange={(e) => setManualEffectiveDate(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Line Groups</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addManualLineGroup}
                  >
                    <Plus size={16} />
                    Add Line Group
                  </Button>
                </div>

                {manualLineGroups.map((group, groupIndex) => (
                  <Card key={groupIndex}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">
                          Line Group {groupIndex + 1}
                        </CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLineGroup(groupIndex)}
                          disabled={manualLineGroups.length === 1}
                        >
                          <Trash size={16} />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Earn Code Group ID</Label>
                          <Input
                            value={group.earnCodeGroupId}
                            onChange={(e) => updateLineGroup(groupIndex, 'earnCodeGroupId', e.target.value)}
                            placeholder="e.g., 63"
                            className="mt-1.5"
                          />
                        </div>
                        <div className="col-span-2 flex items-end">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`is-base-${groupIndex}`}
                              checked={group.isBase}
                              onCheckedChange={(checked) => updateLineGroup(groupIndex, 'isBase', checked)}
                            />
                            <Label htmlFor={`is-base-${groupIndex}`}>Is Base Group</Label>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Lines</Label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addLineToGroup(groupIndex)}
                          >
                            <Plus size={14} />
                            Add Line
                          </Button>
                        </div>

                        {group.lines.map((line, lineIndex) => (
                          <Card key={lineIndex} className="bg-muted/50">
                            <CardContent className="pt-4 pb-3 space-y-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold">Line {lineIndex + 1}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeLineFromGroup(groupIndex, lineIndex)}
                                  disabled={group.lines.length === 1}
                                  className="h-6 w-6 p-0"
                                >
                                  <Trash size={14} />
                                </Button>
                              </div>
                              
                              <div className="grid grid-cols-4 gap-2">
                                <div>
                                  <Label className="text-xs">Earn Code ID</Label>
                                  <Input
                                    value={line.earnCodeId}
                                    onChange={(e) => updateLine(groupIndex, lineIndex, 'earnCodeId', e.target.value)}
                                    placeholder="e.g., 71"
                                    className="mt-1 h-8"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Pay Multiplier</Label>
                                  <Input
                                    value={line.payMultiplier}
                                    onChange={(e) => updateLine(groupIndex, lineIndex, 'payMultiplier', e.target.value)}
                                    placeholder="1"
                                    className="mt-1 h-8"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Pay Rate</Label>
                                  <Input
                                    value={line.payRate}
                                    onChange={(e) => updateLine(groupIndex, lineIndex, 'payRate', e.target.value)}
                                    placeholder="Optional"
                                    className="mt-1 h-8"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Bill Multiplier</Label>
                                  <Input
                                    value={line.billMultiplier}
                                    onChange={(e) => updateLine(groupIndex, lineIndex, 'billMultiplier', e.target.value)}
                                    placeholder="1"
                                    className="mt-1 h-8"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Bill Rate</Label>
                                  <Input
                                    value={line.billRate}
                                    onChange={(e) => updateLine(groupIndex, lineIndex, 'billRate', e.target.value)}
                                    placeholder="Optional"
                                    className="mt-1 h-8"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Markup %</Label>
                                  <Input
                                    value={line.markupPercent}
                                    onChange={(e) => updateLine(groupIndex, lineIndex, 'markupPercent', e.target.value)}
                                    placeholder="Optional"
                                    className="mt-1 h-8"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Markup Value</Label>
                                  <Input
                                    value={line.markupValue}
                                    onChange={(e) => updateLine(groupIndex, lineIndex, 'markupValue', e.target.value)}
                                    placeholder="Optional"
                                    className="mt-1 h-8"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Custom Text 1</Label>
                                  <Input
                                    value={line.customText1}
                                    onChange={(e) => updateLine(groupIndex, lineIndex, 'customText1', e.target.value)}
                                    placeholder="Optional"
                                    className="mt-1 h-8"
                                  />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Button onClick={createManualRateCard} className="w-full">
                <Lightning size={18} />
                Create Configuration
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {rateCards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Rate Card Configuration Summary</span>
              <Badge variant="secondary">{rateCards.length} Rate Card(s)</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {rateCards.map((config, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">
                          Placement {config.placementId}
                        </CardTitle>
                        <Badge variant="outline">
                          <Clock size={14} />
                          {config.effectiveDate}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {config.lineGroups.map((group, groupIndex) => (
                          <div key={groupIndex} className="border-l-2 border-accent pl-3 space-y-1">
                            <div className="flex items-center gap-2 text-sm font-semibold">
                              <span>Group {group.earnCodeGroupId}</span>
                              {group.isBase && <Badge variant="default" className="h-5">Base</Badge>}
                              <Badge variant="secondary" className="h-5">{group.lines.length} line(s)</Badge>
                            </div>
                            <div className="text-xs text-muted-foreground space-y-0.5 ml-4">
                              {group.lines.map((line, lineIndex) => (
                                <div key={lineIndex}>
                                  EarnCode {line.earnCodeId}: Pay×{line.payMultiplier} Bill×{line.billMultiplier}
                                  {line.payRate && ` PayRate: ${line.payRate}`}
                                  {line.billRate && ` BillRate: ${line.billRate}`}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            <Button
              onClick={processRateCards}
              disabled={processing}
              className="w-full"
              size="lg"
            >
              <Lightning size={20} />
              {processing ? 'Processing...' : `Create ${rateCards.length} Rate Card(s)`}
            </Button>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Processing Results</CardTitle>
            <CardDescription>
              {results.filter(r => r.status === 'success').length} successful, {results.filter(r => r.status === 'error').length} failed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Placement ID</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Rate Card ID</TableHead>
                    <TableHead>Version ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {result.status === 'success' ? (
                          <CheckCircle className="text-green-500" size={20} weight="fill" />
                        ) : (
                          <XCircle className="text-red-500" size={20} weight="fill" />
                        )}
                      </TableCell>
                      <TableCell className="font-mono">{result.placementId}</TableCell>
                      <TableCell className="text-sm">{result.message}</TableCell>
                      <TableCell className="font-mono">{result.rateCardId || '-'}</TableCell>
                      <TableCell className="font-mono">{result.versionId || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
