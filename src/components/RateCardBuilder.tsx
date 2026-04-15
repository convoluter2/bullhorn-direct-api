import { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { CreditCard, Plus, Trash, Download, Upload, FolderOpen } from '@phosphor-icons/react'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { useKV } from '@github/spark/hooks'
import Papa from 'papaparse'

interface RateCardBuilderProps {
  onLog: (operation: string, status: 'success' | 'error', message: string, details?: any) => void
}

interface RateCardVersion {
  id: number
  name: string
  effectiveDate: number
  effectiveEndDate?: number | null
}

interface RateCardLine {
  id: number
  externalID: string
  earnCode: string
  title: string
  unitOfMeasure: string
}

interface RateCardLineVersion {
  id: number
  rateCardLine: { id: number }
  rateCardVersion: { id: number }
  rate: number
  markupPercent?: number | null
}

interface NewRateCardLine {
  tempId: string
  earnCode: string
  title: string
  unitOfMeasure: string
  rate: number
  markupPercent: number
}

interface CSVRateCardLine {
  earnCode: string
  title: string
  unitOfMeasure: string
  rate: number
  markupPercent?: number
}

export function RateCardBuilder({ onLog }: RateCardBuilderProps) {
  const [activeMode, setActiveMode] = useState<'load' | 'create'>('load')
  const [rateCardVersionId, setRateCardVersionId] = useState('')
  const [rateCardData, setRateCardData] = useState<{
    version: RateCardVersion | null
    lines: Array<RateCardLine & { lineVersion?: RateCardLineVersion }>
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [newLines, setNewLines] = useState<NewRateCardLine[]>([])
  const [savedRateCards, setSavedRateCards] = useKV<Array<{ id: number; name: string }>>('saved-rate-cards', [])
  
  const [newRateCardName, setNewRateCardName] = useState('')
  const [newRateCardEffectiveDate, setNewRateCardEffectiveDate] = useState('')
  const [csvLines, setCsvLines] = useState<CSVRateCardLine[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadRateCard = async () => {
    if (!rateCardVersionId.trim()) {
      toast.error('Please enter a Rate Card Version ID')
      return
    }

    setLoading(true)
    try {
      const versionResponse = await bullhornAPI.entity('RateCardVersion', parseInt(rateCardVersionId), [
        'id',
        'name',
        'effectiveDate',
        'effectiveEndDate'
      ])

      if (!versionResponse.data) {
        throw new Error('Rate Card Version not found')
      }

      const linesResponse = await bullhornAPI.query({
        entity: 'RateCardLineVersion',
        where: `rateCardVersion.id=${rateCardVersionId}`,
        fields: ['id', 'rateCardLine(id,externalID,earnCode,title,unitOfMeasure)', 'rate', 'markupPercent'],
        count: 500
      })

      const linesWithDetails = linesResponse.data.map((lineVersion: any) => ({
        id: lineVersion.rateCardLine.id,
        externalID: lineVersion.rateCardLine.externalID || '',
        earnCode: lineVersion.rateCardLine.earnCode || '',
        title: lineVersion.rateCardLine.title || '',
        unitOfMeasure: lineVersion.rateCardLine.unitOfMeasure || '',
        lineVersion: {
          id: lineVersion.id,
          rateCardLine: { id: lineVersion.rateCardLine.id },
          rateCardVersion: { id: parseInt(rateCardVersionId) },
          rate: lineVersion.rate || 0,
          markupPercent: lineVersion.markupPercent || null
        }
      }))

      setRateCardData({
        version: versionResponse.data,
        lines: linesWithDetails
      })

      const existing = savedRateCards?.find((rc: any) => rc.id === parseInt(rateCardVersionId))
      if (!existing) {
        setSavedRateCards((current: any) => [
          ...(current || []),
          { id: parseInt(rateCardVersionId), name: versionResponse.data.name }
        ])
      }

      toast.success(`Loaded rate card: ${versionResponse.data.name}`)
      onLog('Rate Card Load', 'success', `Loaded rate card version ${rateCardVersionId}`, {
        versionId: rateCardVersionId,
        versionName: versionResponse.data.name,
        lineCount: linesWithDetails.length
      })
    } catch (error) {
      console.error('Failed to load rate card:', error)
      toast.error('Failed to load rate card')
      onLog('Rate Card Load', 'error', 'Failed to load rate card', { error: String(error) })
    } finally {
      setLoading(false)
    }
  }

  const updateLineRate = async (lineVersionId: number, newRate: number) => {
    try {
      await bullhornAPI.update('RateCardLineVersion', lineVersionId, { rate: newRate })
      
      setRateCardData(prev => {
        if (!prev) return null
        return {
          ...prev,
          lines: prev.lines.map(line => 
            line.lineVersion?.id === lineVersionId 
              ? { ...line, lineVersion: { ...line.lineVersion, rate: newRate } }
              : line
          )
        }
      })

      toast.success('Rate updated successfully')
      onLog('Rate Card Update', 'success', 'Updated line rate', { lineVersionId, newRate })
    } catch (error) {
      console.error('Failed to update rate:', error)
      toast.error('Failed to update rate')
      onLog('Rate Card Update', 'error', 'Failed to update rate', { error: String(error) })
    }
  }

  const updateLineMarkup = async (lineVersionId: number, newMarkup: number | null) => {
    try {
      await bullhornAPI.update('RateCardLineVersion', lineVersionId, { markupPercent: newMarkup })
      
      setRateCardData(prev => {
        if (!prev) return null
        return {
          ...prev,
          lines: prev.lines.map(line => 
            line.lineVersion?.id === lineVersionId 
              ? { ...line, lineVersion: { ...line.lineVersion, markupPercent: newMarkup } }
              : line
          )
        }
      })

      toast.success('Markup updated successfully')
      onLog('Rate Card Update', 'success', 'Updated line markup', { lineVersionId, newMarkup })
    } catch (error) {
      console.error('Failed to update markup:', error)
      toast.error('Failed to update markup')
      onLog('Rate Card Update', 'error', 'Failed to update markup', { error: String(error) })
    }
  }

  const addNewLine = () => {
    setNewLines([...newLines, {
      tempId: `temp-${Date.now()}`,
      earnCode: '',
      title: '',
      unitOfMeasure: 'Hour',
      rate: 0,
      markupPercent: 0
    }])
  }

  const removeNewLine = (tempId: string) => {
    setNewLines(newLines.filter(line => line.tempId !== tempId))
  }

  const updateNewLine = (tempId: string, field: keyof NewRateCardLine, value: any) => {
    setNewLines(newLines.map(line => 
      line.tempId === tempId ? { ...line, [field]: value } : line
    ))
  }

  const saveNewLines = async () => {
    if (!rateCardData?.version) {
      toast.error('No rate card loaded')
      return
    }

    const validLines = newLines.filter(line => line.earnCode && line.title)
    if (validLines.length === 0) {
      toast.error('No valid lines to save')
      return
    }

    setLoading(true)
    try {
      for (const line of validLines) {
        const rateCardLineResponse = await bullhornAPI.insert('RateCardLine', {
          earnCode: line.earnCode,
          title: line.title,
          unitOfMeasure: line.unitOfMeasure,
          externalID: `${line.earnCode}-${Date.now()}`
        })

        await bullhornAPI.insert('RateCardLineVersion', {
          rateCardLine: { id: rateCardLineResponse.changedEntityId },
          rateCardVersion: { id: rateCardData.version.id },
          rate: line.rate,
          markupPercent: line.markupPercent > 0 ? line.markupPercent : null
        })
      }

      toast.success(`Added ${validLines.length} new line(s)`)
      onLog('Rate Card Insert', 'success', `Added ${validLines.length} new rate card lines`, {
        versionId: rateCardData.version.id,
        lineCount: validLines.length
      })

      setNewLines([])
      await loadRateCard()
    } catch (error) {
      console.error('Failed to save new lines:', error)
      toast.error('Failed to save new lines')
      onLog('Rate Card Insert', 'error', 'Failed to save new rate card lines', { error: String(error) })
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    if (!rateCardData) return

    const headers = ['Earn Code', 'Title', 'Unit of Measure', 'Rate', 'Markup %']
    const rows = rateCardData.lines.map(line => [
      line.earnCode,
      line.title,
      line.unitOfMeasure,
      line.lineVersion?.rate || 0,
      line.lineVersion?.markupPercent || ''
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rate-card-${rateCardData.version?.name || 'export'}.csv`
    a.click()
    URL.revokeObjectURL(url)

    toast.success('Rate card exported to CSV')
    onLog('Rate Card Export', 'success', 'Exported rate card to CSV', {
      versionId: rateCardData.version?.id,
      lineCount: rateCardData.lines.length
    })
  }

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const parsedLines: CSVRateCardLine[] = results.data.map((row: any) => ({
            earnCode: row['Earn Code'] || row['earnCode'] || '',
            title: row['Title'] || row['title'] || '',
            unitOfMeasure: row['Unit of Measure'] || row['unitOfMeasure'] || row['Unit'] || 'Hour',
            rate: parseFloat(row['Rate'] || row['rate'] || '0'),
            markupPercent: row['Markup %'] || row['markupPercent'] ? parseFloat(row['Markup %'] || row['markupPercent']) : undefined
          }))

          const validLines = parsedLines.filter(line => line.earnCode && line.title)
          
          if (validLines.length === 0) {
            toast.error('No valid lines found in CSV')
            return
          }

          setCsvLines(validLines)
          toast.success(`Loaded ${validLines.length} lines from CSV`)
          onLog('CSV Upload', 'success', `Parsed ${validLines.length} rate card lines from CSV`, {
            fileName: file.name,
            lineCount: validLines.length
          })
        } catch (error) {
          console.error('Failed to parse CSV:', error)
          toast.error('Failed to parse CSV file')
          onLog('CSV Upload', 'error', 'Failed to parse CSV', { error: String(error) })
        }
      },
      error: (error) => {
        console.error('CSV parse error:', error)
        toast.error('Failed to read CSV file')
        onLog('CSV Upload', 'error', 'Failed to read CSV', { error: String(error) })
      }
    })

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const createRateCard = async () => {
    if (!newRateCardName.trim()) {
      toast.error('Please enter a rate card name')
      return
    }

    if (!newRateCardEffectiveDate) {
      toast.error('Please enter an effective date')
      return
    }

    if (csvLines.length === 0) {
      toast.error('Please upload a CSV file with rate card lines')
      return
    }

    setLoading(true)
    try {
      const effectiveDate = new Date(newRateCardEffectiveDate).getTime()

      const versionResponse = await bullhornAPI.insert('RateCardVersion', {
        name: newRateCardName,
        effectiveDate: effectiveDate
      })

      const versionId = versionResponse.changedEntityId

      toast.success(`Created rate card version: ${newRateCardName}`)
      onLog('Rate Card Create', 'success', `Created rate card version ${versionId}`, {
        versionId,
        name: newRateCardName,
        effectiveDate: newRateCardEffectiveDate
      })

      let successCount = 0
      let errorCount = 0

      for (const line of csvLines) {
        try {
          const rateCardLineResponse = await bullhornAPI.insert('RateCardLine', {
            earnCode: line.earnCode,
            title: line.title,
            unitOfMeasure: line.unitOfMeasure,
            externalID: `${line.earnCode}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          })

          await bullhornAPI.insert('RateCardLineVersion', {
            rateCardLine: { id: rateCardLineResponse.changedEntityId },
            rateCardVersion: { id: versionId },
            rate: line.rate,
            markupPercent: line.markupPercent || null
          })

          successCount++
        } catch (error) {
          console.error(`Failed to create line ${line.earnCode}:`, error)
          errorCount++
        }
      }

      if (errorCount > 0) {
        toast.warning(`Created rate card with ${successCount} lines (${errorCount} failed)`)
        onLog('Rate Card Create', 'success', `Created rate card with partial success`, {
          versionId,
          successCount,
          errorCount
        })
      } else {
        toast.success(`Created rate card with ${successCount} lines`)
        onLog('Rate Card Create', 'success', `Created rate card with all lines`, {
          versionId,
          lineCount: successCount
        })
      }

      setSavedRateCards((current: any) => [
        ...(current || []),
        { id: versionId, name: newRateCardName }
      ])

      setNewRateCardName('')
      setNewRateCardEffectiveDate('')
      setCsvLines([])
      setRateCardVersionId(String(versionId))
      setActiveMode('load')
      
      setTimeout(() => loadRateCard(), 500)
    } catch (error) {
      console.error('Failed to create rate card:', error)
      toast.error('Failed to create rate card')
      onLog('Rate Card Create', 'error', 'Failed to create rate card', { error: String(error) })
    } finally {
      setLoading(false)
    }
  }

  const removeCsvLine = (index: number) => {
    setCsvLines(csvLines.filter((_, i) => i !== index))
  }

  const downloadCSVTemplate = () => {
    const headers = ['Earn Code', 'Title', 'Unit of Measure', 'Rate', 'Markup %']
    const sampleRows = [
      ['REG', 'Regular Time', 'Hour', '50.00', '10.00'],
      ['OT', 'Overtime', 'Hour', '75.00', '10.00'],
      ['DT', 'Double Time', 'Hour', '100.00', '10.00']
    ]

    const csvContent = [
      headers.join(','),
      ...sampleRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'rate-card-template.csv'
    a.click()
    URL.revokeObjectURL(url)

    toast.success('Downloaded CSV template')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CreditCard size={24} className="text-primary" weight="duotone" />
            <div>
              <CardTitle>Rate Card Builder</CardTitle>
              <CardDescription>
                Load existing rate cards or create new ones with CSV upload
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeMode} onValueChange={(v) => setActiveMode(v as 'load' | 'create')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="load">
                <FolderOpen className="mr-2" size={16} />
                Load Existing
              </TabsTrigger>
              <TabsTrigger value="create">
                <Plus className="mr-2" size={16} />
                Create New
              </TabsTrigger>
            </TabsList>

            <TabsContent value="load" className="space-y-4 mt-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label htmlFor="rate-card-version-id">Rate Card Version ID</Label>
                  <Input
                    id="rate-card-version-id"
                    type="number"
                    placeholder="Enter RateCardVersion ID"
                    value={rateCardVersionId}
                    onChange={(e) => setRateCardVersionId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadRateCard()}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button onClick={loadRateCard} disabled={loading}>
                    <FolderOpen />
                    Load Rate Card
                  </Button>
                </div>
              </div>

              {savedRateCards && savedRateCards.length > 0 && (
                <div>
                  <Label>Recent Rate Cards</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {savedRateCards.map((rc: any) => (
                      <Button
                        key={rc.id}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setRateCardVersionId(String(rc.id))
                          setTimeout(() => loadRateCard(), 100)
                        }}
                      >
                        {rc.name} (ID: {rc.id})
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="create" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="new-rate-card-name">Rate Card Name *</Label>
                  <Input
                    id="new-rate-card-name"
                    placeholder="e.g., Standard Rates 2024"
                    value={newRateCardName}
                    onChange={(e) => setNewRateCardName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="new-rate-card-effective-date">Effective Date *</Label>
                  <Input
                    id="new-rate-card-effective-date"
                    type="date"
                    value={newRateCardEffectiveDate}
                    onChange={(e) => setNewRateCardEffectiveDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Rate Card Lines (CSV Upload)</Label>
                  <Button variant="outline" size="sm" onClick={downloadCSVTemplate}>
                    <Download size={16} />
                    Download Template
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1"
                  >
                    <Upload />
                    Upload CSV File
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    className="hidden"
                  />
                </div>

                {csvLines.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-muted-foreground">
                        {csvLines.length} line{csvLines.length !== 1 ? 's' : ''} loaded from CSV
                      </Label>
                      <Button variant="ghost" size="sm" onClick={() => setCsvLines([])}>
                        Clear All
                      </Button>
                    </div>
                    <div className="max-h-96 overflow-y-auto space-y-2 border border-border rounded-lg p-3 bg-muted/30">
                      {csvLines.map((line, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-center p-2 bg-card border border-border rounded text-sm">
                          <div className="col-span-2 font-mono">{line.earnCode}</div>
                          <div className="col-span-3">{line.title}</div>
                          <div className="col-span-2">{line.unitOfMeasure}</div>
                          <div className="col-span-2 font-mono">${line.rate.toFixed(2)}</div>
                          <div className="col-span-2 font-mono">{line.markupPercent ? `${line.markupPercent.toFixed(2)}%` : '-'}</div>
                          <div className="col-span-1 flex justify-end">
                            <Button variant="ghost" size="sm" onClick={() => removeCsvLine(index)} className="h-7 w-7 p-0">
                              <Trash size={14} className="text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {csvLines.length === 0 && (
                  <Alert>
                    <AlertDescription>
                      Upload a CSV file with columns: Earn Code, Title, Unit of Measure, Rate, Markup %
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  onClick={createRateCard}
                  disabled={loading || !newRateCardName || !newRateCardEffectiveDate || csvLines.length === 0}
                >
                  <Plus />
                  Create Rate Card
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {rateCardData && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{rateCardData.version?.name}</CardTitle>
                  <CardDescription>
                    Effective: {new Date(rateCardData.version?.effectiveDate || 0).toLocaleDateString()}
                    {rateCardData.version?.effectiveEndDate && 
                      ` - ${new Date(rateCardData.version.effectiveEndDate).toLocaleDateString()}`
                    }
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={exportToCSV}>
                  <Download />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {rateCardData.lines.map((line) => (
                  <div key={line.id} className="grid grid-cols-12 gap-3 items-end p-3 border border-border rounded-lg bg-card">
                    <div className="col-span-2">
                      <Label className="text-xs">Earn Code</Label>
                      <div className="font-mono text-sm">{line.earnCode}</div>
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs">Title</Label>
                      <div className="text-sm">{line.title}</div>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Unit</Label>
                      <div className="text-sm">{line.unitOfMeasure}</div>
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor={`rate-${line.id}`} className="text-xs">Rate</Label>
                      <Input
                        id={`rate-${line.id}`}
                        type="number"
                        step="0.01"
                        value={line.lineVersion?.rate || 0}
                        onChange={(e) => updateLineRate(line.lineVersion!.id, parseFloat(e.target.value) || 0)}
                        className="h-9"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor={`markup-${line.id}`} className="text-xs">Markup %</Label>
                      <Input
                        id={`markup-${line.id}`}
                        type="number"
                        step="0.01"
                        value={line.lineVersion?.markupPercent || ''}
                        onChange={(e) => updateLineMarkup(line.lineVersion!.id, e.target.value ? parseFloat(e.target.value) : null)}
                        className="h-9"
                      />
                    </div>
                    <div className="col-span-1">
                      <div className="text-xs text-muted-foreground">ID: {line.id}</div>
                    </div>
                  </div>
                ))}
              </div>

              {rateCardData.lines.length === 0 && (
                <Alert>
                  <AlertDescription>
                    No rate card lines found for this version.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Add New Lines</CardTitle>
                  <CardDescription>Create new rate card lines for this version</CardDescription>
                </div>
                <Button onClick={addNewLine} variant="outline" size="sm">
                  <Plus />
                  Add Line
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {newLines.map((line) => (
                <div key={line.tempId} className="grid grid-cols-12 gap-3 items-end p-3 border border-border rounded-lg bg-muted/30">
                  <div className="col-span-2">
                    <Label htmlFor={`new-earn-code-${line.tempId}`} className="text-xs">Earn Code *</Label>
                    <Input
                      id={`new-earn-code-${line.tempId}`}
                      value={line.earnCode}
                      onChange={(e) => updateNewLine(line.tempId, 'earnCode', e.target.value)}
                      placeholder="REG"
                      className="h-9"
                    />
                  </div>
                  <div className="col-span-3">
                    <Label htmlFor={`new-title-${line.tempId}`} className="text-xs">Title *</Label>
                    <Input
                      id={`new-title-${line.tempId}`}
                      value={line.title}
                      onChange={(e) => updateNewLine(line.tempId, 'title', e.target.value)}
                      placeholder="Regular Time"
                      className="h-9"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor={`new-unit-${line.tempId}`} className="text-xs">Unit</Label>
                    <Select value={line.unitOfMeasure} onValueChange={(value) => updateNewLine(line.tempId, 'unitOfMeasure', value)}>
                      <SelectTrigger id={`new-unit-${line.tempId}`} className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Hour">Hour</SelectItem>
                        <SelectItem value="Day">Day</SelectItem>
                        <SelectItem value="Week">Week</SelectItem>
                        <SelectItem value="Month">Month</SelectItem>
                        <SelectItem value="Unit">Unit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor={`new-rate-${line.tempId}`} className="text-xs">Rate</Label>
                    <Input
                      id={`new-rate-${line.tempId}`}
                      type="number"
                      step="0.01"
                      value={line.rate}
                      onChange={(e) => updateNewLine(line.tempId, 'rate', parseFloat(e.target.value) || 0)}
                      className="h-9"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor={`new-markup-${line.tempId}`} className="text-xs">Markup %</Label>
                    <Input
                      id={`new-markup-${line.tempId}`}
                      type="number"
                      step="0.01"
                      value={line.markupPercent}
                      onChange={(e) => updateNewLine(line.tempId, 'markupPercent', parseFloat(e.target.value) || 0)}
                      className="h-9"
                    />
                  </div>
                  <div className="col-span-1">
                    <Button variant="ghost" size="sm" onClick={() => removeNewLine(line.tempId)} className="h-9">
                      <Trash className="text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}

              {newLines.length > 0 && (
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setNewLines([])}>
                    Clear All
                  </Button>
                  <Button onClick={saveNewLines} disabled={loading}>
                    <Plus />
                    Save {newLines.length} New Line{newLines.length !== 1 ? 's' : ''}
                  </Button>
                </div>
              )}

              {newLines.length === 0 && (
                <Alert>
                  <AlertDescription>
                    Click "Add Line" to create new rate card lines.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
