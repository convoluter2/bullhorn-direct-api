import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { CreditCard, MagnifyingGlass, Plus, Upload, Trash, PencilSimple, FloppyDisk, X, DownloadSimple } from '@phosphor-icons/react'
import { toast } from 'sonner'
import Papa from 'papaparse'
import templateCsv from '@/assets/documents/rate-card-template.csv?url'

interface RateCardBuilderProps {
  onLog: (operation: string, status: 'success' | 'error', message: string, details?: any) => void
}

interface PlacementRateCard {
  id: number
  effectiveDate: string
  placement: {
    id: number
  }
  owner?: {
    id: number
    firstName: string
    lastName: string
  }
  placementRateCardStatusLookup?: {
    id: number
    label: string
  }
  dateAdded?: number
  dateLastModified?: number
}

interface RateCardLineGroup {
  id?: number
  isBase: boolean
  earnCodeGroup: { id: number; name?: string }
  placementRateCardLines: RateCardLine[]
}

interface RateCardLine {
  id?: number
  earnCode: { id: number; name?: string }
  payMultiplier: number
  payRate?: string | number
  billMultiplier: number
  billRate?: string | number
  markupPercent?: string | number
  markupValue?: string | number
  customText1?: string
  customFloat1?: string | number
}

interface CSVLineRow {
  placementId: string
  effectiveDate: string
  ownerId?: string
  statusLookupId?: string
  earnCodeGroupId: string
  isBase: string
  earnCodeId: string
  payMultiplier: string
  payRate?: string
  billMultiplier: string
  billRate?: string
  markupPercent?: string
  markupValue?: string
  customText1?: string
  customFloat1?: string
  [key: string]: string | undefined
}

export function RateCardBuilder({ onLog }: RateCardBuilderProps) {
  const [activeTab, setActiveTab] = useState('lookup')
  const [searchId, setSearchId] = useState('')
  const [placementId, setPlacementId] = useState('')
  const [loading, setLoading] = useState(false)
  const [rateCard, setRateCard] = useState<PlacementRateCard | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<CSVLineRow[]>([])
  const [lineGroups, setLineGroups] = useState<RateCardLineGroup[]>([])
  const [editingLineId, setEditingLineId] = useState<number | null>(null)
  const [editFormData, setEditFormData] = useState<Partial<RateCardLine>>({})
  const [bulkCreateMode, setBulkCreateMode] = useState(false)
  const [rateCardsToCreate, setRateCardsToCreate] = useState<Map<string, CSVLineRow[]>>(new Map())

  const handleDownloadTemplate = () => {
    const link = document.createElement('a')
    link.href = templateCsv
    link.download = 'rate-card-template.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Template downloaded')
  }

  useEffect(() => {
    if (rateCard) {
      loadRateCardLines()
    } else {
      setLineGroups([])
    }
  }, [rateCard])

  const loadRateCardLines = async () => {
    if (!rateCard) return

    setLoading(true)
    try {
      const response = await bullhornAPI.getEntity('PlacementRateCard', rateCard.id, 'id,placementRateCardLineGroups(id,isBase,earnCodeGroup(id,name),placementRateCardLines(id,earnCode(id,name),payMultiplier,payRate,billMultiplier,billRate,markupPercent,markupValue,customText1,customFloat1))')

      if (response.data?.placementRateCardLineGroups) {
        setLineGroups(response.data.placementRateCardLineGroups)
        toast.success('Rate card lines loaded')
      }
    } catch (error) {
      console.error('Failed to load rate card lines:', error)
      toast.error('Failed to load rate card lines')
      onLog('Load Rate Card Lines', 'error', 'Failed to load rate card lines', { error: String(error), rateCardId: rateCard.id })
    } finally {
      setLoading(false)
    }
  }

  const handleEditLine = (line: RateCardLine) => {
    setEditingLineId(line.id || null)
    setEditFormData({
      payMultiplier: line.payMultiplier,
      payRate: line.payRate || '',
      billMultiplier: line.billMultiplier,
      billRate: line.billRate || '',
      markupPercent: line.markupPercent || '',
      markupValue: line.markupValue || '',
      customText1: line.customText1 || '',
      customFloat1: line.customFloat1 || ''
    })
  }

  const handleCancelEdit = () => {
    setEditingLineId(null)
    setEditFormData({})
  }

  const handleSaveEdit = async (lineId: number) => {
    setLoading(true)
    try {
      const updatePayload: any = {}
      
      if (editFormData.payMultiplier !== undefined) {
        updatePayload.payMultiplier = typeof editFormData.payMultiplier === 'string' 
          ? parseFloat(editFormData.payMultiplier) 
          : editFormData.payMultiplier
      }
      if (editFormData.billMultiplier !== undefined) {
        updatePayload.billMultiplier = typeof editFormData.billMultiplier === 'string'
          ? parseFloat(editFormData.billMultiplier)
          : editFormData.billMultiplier
      }
      if (editFormData.payRate !== undefined && editFormData.payRate !== '') {
        updatePayload.payRate = typeof editFormData.payRate === 'string'
          ? parseFloat(editFormData.payRate)
          : editFormData.payRate
      }
      if (editFormData.billRate !== undefined && editFormData.billRate !== '') {
        updatePayload.billRate = typeof editFormData.billRate === 'string'
          ? parseFloat(editFormData.billRate)
          : editFormData.billRate
      }
      if (editFormData.markupPercent !== undefined && editFormData.markupPercent !== '') {
        updatePayload.markupPercent = typeof editFormData.markupPercent === 'string'
          ? parseFloat(editFormData.markupPercent)
          : editFormData.markupPercent
      }
      if (editFormData.markupValue !== undefined && editFormData.markupValue !== '') {
        updatePayload.markupValue = typeof editFormData.markupValue === 'string'
          ? parseFloat(editFormData.markupValue)
          : editFormData.markupValue
      }
      if (editFormData.customText1 !== undefined) {
        updatePayload.customText1 = editFormData.customText1
      }
      if (editFormData.customFloat1 !== undefined && editFormData.customFloat1 !== '') {
        updatePayload.customFloat1 = typeof editFormData.customFloat1 === 'string'
          ? parseFloat(editFormData.customFloat1)
          : editFormData.customFloat1
      }

      console.log('Updating PlacementRateCardLine:', lineId, updatePayload)

      const response = await bullhornAPI.updateEntity('PlacementRateCardLine', lineId, updatePayload)

      if (response.changedEntityId) {
        toast.success('Rate card line updated successfully')
        onLog('Update Rate Card Line', 'success', `Updated line ID: ${lineId}`, {
          lineId,
          rateCardId: rateCard?.id,
          updates: updatePayload
        })
        setEditingLineId(null)
        setEditFormData({})
        await loadRateCardLines()
      } else {
        toast.error('Failed to update rate card line')
        onLog('Update Rate Card Line', 'error', 'Update failed', { lineId, response })
      }
    } catch (error) {
      console.error('Failed to update rate card line:', error)
      toast.error('Failed to update rate card line')
      onLog('Update Rate Card Line', 'error', 'Failed to update rate card line', { 
        error: String(error), 
        lineId 
      })
    } finally {
      setLoading(false)
    }
  }
  const handleLookupById = async () => {
    if (!searchId.trim()) {
      toast.error('Please enter a Rate Card ID')
      return
    }

    setLoading(true)
    try {
      const response = await bullhornAPI.getEntity('PlacementRateCard', parseInt(searchId, 10), 'id,effectiveDate,placement(id),owner(id,firstName,lastName),placementRateCardStatusLookup(id,label),dateAdded,dateLastModified')

      if (response.data) {
        setRateCard(response.data)
        toast.success('Rate Card found')
        onLog('Rate Card Lookup', 'success', `Found Rate Card ID: ${searchId}`, {
          rateCardId: searchId,
          placementId: response.data.placement?.id
        })
      } else {
        toast.error('Rate Card not found')
        setRateCard(null)
        onLog('Rate Card Lookup', 'error', 'Rate Card not found', { searchId })
      }
    } catch (error) {
      console.error('Rate Card lookup error:', error)
      toast.error('Failed to lookup rate card')
      onLog('Rate Card Lookup', 'error', 'Failed to lookup rate card', { error: String(error), searchId })
      setRateCard(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSearchByPlacement = async () => {
    if (!placementId.trim()) {
      toast.error('Please enter a Placement ID')
      return
    }

    setLoading(true)
    try {
      const response = await bullhornAPI.query('PlacementRateCard', {
        where: `placement.id=${placementId}`,
        fields: 'id,effectiveDate,placement(id),owner(id,firstName,lastName),placementRateCardStatusLookup(id,label),dateAdded,dateLastModified',
        orderBy: '-dateLastModified',
        count: 10
      })

      if (response.data && response.data.length > 0) {
        setRateCard(response.data[0])
        toast.success(`Found ${response.data.length} rate card(s) for placement`)
        onLog('Rate Card Search', 'success', `Found ${response.data.length} rate cards for Placement ID: ${placementId}`, {
          placementId,
          rateCardCount: response.data.length
        })
      } else {
        setRateCard(null)
        toast.info('No rate cards found for this placement')
        onLog('Rate Card Search', 'success', 'No rate cards found', { placementId })
      }
    } catch (error) {
      console.error('Rate Card search error:', error)
      toast.error('Failed to search rate cards')
      onLog('Rate Card Search', 'error', 'Failed to search rate cards', { error: String(error), placementId })
      setRateCard(null)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setCsvFile(file)

    Papa.parse<CSVLineRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvData(results.data)
        
        const rateCardMap = new Map<string, CSVLineRow[]>()
        results.data.forEach((row) => {
          const key = `${row.placementId || ''}_${row.effectiveDate || ''}`
          if (!rateCardMap.has(key)) {
            rateCardMap.set(key, [])
          }
          rateCardMap.get(key)!.push(row)
        })
        
        setRateCardsToCreate(rateCardMap)
        setBulkCreateMode(rateCardMap.size > 1)
        
        if (rateCardMap.size === 1) {
          toast.success(`Loaded ${results.data.length} rate card lines from CSV for 1 rate card`)
        } else {
          toast.success(`Loaded ${results.data.length} rate card lines from CSV for ${rateCardMap.size} rate cards`)
        }
      },
      error: (error) => {
        toast.error('Failed to parse CSV file')
        console.error('CSV parse error:', error)
      }
    })
  }

  const handleCreateRateCard = async () => {
    if (csvData.length === 0) {
      toast.error('Please upload a CSV file with rate card lines')
      return
    }

    if (bulkCreateMode) {
      await handleBulkCreateRateCards()
    } else {
      await handleSingleCreateRateCard()
    }
  }

  const handleSingleCreateRateCard = async () => {
    if (csvData.length === 0) return

    const firstRow = csvData[0]
    if (!firstRow.placementId?.trim()) {
      toast.error('Placement ID is required in CSV')
      return
    }

    if (!firstRow.effectiveDate) {
      toast.error('Effective Date is required in CSV')
      return
    }

    setLoading(true)
    try {
      const lineGroupsMap = new Map<string, RateCardLineGroup>()

      csvData.forEach((row) => {
        const groupKey = row.earnCodeGroupId
        if (!groupKey) return

        if (!lineGroupsMap.has(groupKey)) {
          lineGroupsMap.set(groupKey, {
            isBase: row.isBase?.toLowerCase() === 'true' || row.isBase === '1',
            earnCodeGroup: { id: parseInt(groupKey, 10) },
            placementRateCardLines: []
          })
        }

        const group = lineGroupsMap.get(groupKey)!
        group.placementRateCardLines.push({
          earnCode: { id: parseInt(row.earnCodeId, 10) },
          payMultiplier: parseFloat(row.payMultiplier) || 1,
          payRate: row.payRate ? parseFloat(row.payRate) : undefined,
          billMultiplier: parseFloat(row.billMultiplier) || 1,
          billRate: row.billRate ? parseFloat(row.billRate) : undefined,
          markupPercent: row.markupPercent ? parseFloat(row.markupPercent) : undefined,
          markupValue: row.markupValue ? parseFloat(row.markupValue) : undefined,
          customText1: row.customText1 || '',
          customFloat1: row.customFloat1 ? parseFloat(row.customFloat1) : undefined
        })
      })

      const payload: any = {
        placementRateCardLineGroups: Array.from(lineGroupsMap.values()),
        effectiveDate: firstRow.effectiveDate,
        placement: { id: parseInt(firstRow.placementId, 10) }
      }

      if (firstRow.ownerId) {
        payload.owner = { id: parseInt(firstRow.ownerId, 10) }
      }

      if (firstRow.statusLookupId) {
        payload.placementRateCardStatusLookup = { id: parseInt(firstRow.statusLookupId, 10) }
      }

      console.log('Creating rate card with payload:', payload)

      const response = await bullhornAPI.createEntity('PlacementRateCard', payload)

      if (response.changedEntityId) {
        toast.success('Rate card created successfully!')
        setCreateDialogOpen(false)
        setCsvData([])
        setCsvFile(null)
        setRateCardsToCreate(new Map())
        setBulkCreateMode(false)

        const createdCard = await bullhornAPI.getEntity('PlacementRateCard', response.changedEntityId, 'id,effectiveDate,placement(id),owner(id,firstName,lastName),placementRateCardStatusLookup(id,label)')

        setRateCard(createdCard.data)
        setActiveTab('lookup')

        onLog('Rate Card Create', 'success', `Created Rate Card ID: ${response.changedEntityId}`, {
          rateCardId: response.changedEntityId,
          placementId: firstRow.placementId,
          effectiveDate: firstRow.effectiveDate,
          lineGroupCount: lineGroupsMap.size,
          totalLines: csvData.length,
          response
        })
      } else {
        toast.error('Failed to create rate card')
        onLog('Rate Card Create', 'error', 'Failed to create rate card', { response })
      }
    } catch (error) {
      console.error('Rate card creation error:', error)
      toast.error('Failed to create rate card')
      onLog('Rate Card Create', 'error', 'Failed to create rate card', { error: String(error) })
    } finally {
      setLoading(false)
    }
  }

  const handleBulkCreateRateCards = async () => {
    setLoading(true)
    const results: any[] = []
    let successCount = 0
    let failureCount = 0

    try {
      for (const [key, rows] of rateCardsToCreate.entries()) {
        const firstRow = rows[0]
        if (!firstRow.placementId?.trim() || !firstRow.effectiveDate) {
          console.error(`Skipping rate card ${key} - missing required fields`)
          failureCount++
          results.push({
            key,
            status: 'error',
            message: 'Missing placementId or effectiveDate'
          })
          continue
        }

        try {
          const lineGroupsMap = new Map<string, RateCardLineGroup>()

          rows.forEach((row) => {
            const groupKey = row.earnCodeGroupId
            if (!groupKey) return

            if (!lineGroupsMap.has(groupKey)) {
              lineGroupsMap.set(groupKey, {
                isBase: row.isBase?.toLowerCase() === 'true' || row.isBase === '1',
                earnCodeGroup: { id: parseInt(groupKey, 10) },
                placementRateCardLines: []
              })
            }

            const group = lineGroupsMap.get(groupKey)!
            group.placementRateCardLines.push({
              earnCode: { id: parseInt(row.earnCodeId, 10) },
              payMultiplier: parseFloat(row.payMultiplier) || 1,
              payRate: row.payRate ? parseFloat(row.payRate) : undefined,
              billMultiplier: parseFloat(row.billMultiplier) || 1,
              billRate: row.billRate ? parseFloat(row.billRate) : undefined,
              markupPercent: row.markupPercent ? parseFloat(row.markupPercent) : undefined,
              markupValue: row.markupValue ? parseFloat(row.markupValue) : undefined,
              customText1: row.customText1 || '',
              customFloat1: row.customFloat1 ? parseFloat(row.customFloat1) : undefined
            })
          })

          const payload: any = {
            placementRateCardLineGroups: Array.from(lineGroupsMap.values()),
            effectiveDate: firstRow.effectiveDate,
            placement: { id: parseInt(firstRow.placementId, 10) }
          }

          if (firstRow.ownerId) {
            payload.owner = { id: parseInt(firstRow.ownerId, 10) }
          }

          if (firstRow.statusLookupId) {
            payload.placementRateCardStatusLookup = { id: parseInt(firstRow.statusLookupId, 10) }
          }

          console.log(`Creating rate card for ${key}:`, payload)

          const response = await bullhornAPI.createEntity('PlacementRateCard', payload)

          if (response.changedEntityId) {
            successCount++
            results.push({
              key,
              status: 'success',
              rateCardId: response.changedEntityId,
              placementId: firstRow.placementId,
              effectiveDate: firstRow.effectiveDate,
              lineCount: rows.length
            })
          } else {
            failureCount++
            results.push({
              key,
              status: 'error',
              message: 'No changedEntityId returned',
              response
            })
          }
        } catch (error) {
          console.error(`Failed to create rate card ${key}:`, error)
          failureCount++
          results.push({
            key,
            status: 'error',
            message: String(error)
          })
        }
      }

      toast.success(`Bulk creation complete: ${successCount} succeeded, ${failureCount} failed`)
      setCreateDialogOpen(false)
      setCsvData([])
      setCsvFile(null)
      setRateCardsToCreate(new Map())
      setBulkCreateMode(false)

      onLog('Bulk Rate Card Create', successCount > 0 ? 'success' : 'error', 
        `Created ${successCount} rate cards, ${failureCount} failed`, {
          successCount,
          failureCount,
          results
        })
    } catch (error) {
      console.error('Bulk rate card creation error:', error)
      toast.error('Bulk creation failed')
      onLog('Bulk Rate Card Create', 'error', 'Bulk creation failed', { error: String(error) })
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '-'
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard size={24} className="text-accent" weight="duotone" />
                Rate Card Builder
              </CardTitle>
              <CardDescription>
                Lookup existing rate cards or create new rate cards with nested line groups and lines
              </CardDescription>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus size={18} />
              Create Rate Card
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="lookup" className="gap-2">
                <MagnifyingGlass size={18} />
                Lookup
              </TabsTrigger>
              <TabsTrigger value="details" className="gap-2" disabled={!rateCard}>
                <CreditCard size={18} />
                Details
              </TabsTrigger>
            </TabsList>

            <TabsContent value="lookup" className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="search-id">Rate Card ID</Label>
                  <div className="flex gap-2">
                    <Input
                      id="search-id"
                      placeholder="Enter Rate Card ID"
                      value={searchId}
                      onChange={(e) => setSearchId(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleLookupById()}
                    />
                    <Button onClick={handleLookupById} disabled={loading}>
                      <MagnifyingGlass size={18} />
                      Lookup
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="search-placement">Search by Placement ID</Label>
                  <div className="flex gap-2">
                    <Input
                      id="search-placement"
                      placeholder="Enter Placement ID"
                      value={placementId}
                      onChange={(e) => setPlacementId(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchByPlacement()}
                    />
                    <Button onClick={handleSearchByPlacement} disabled={loading}>
                      <MagnifyingGlass size={18} />
                      Search
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="details" className="space-y-4">
              {rateCard && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Rate Card ID</Label>
                      <div className="font-mono font-semibold">{rateCard.id}</div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Placement ID</Label>
                      <div className="font-mono font-semibold">{rateCard.placement.id}</div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Effective Date</Label>
                      <div>{rateCard.effectiveDate || '-'}</div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Status</Label>
                      <div>
                        {rateCard.placementRateCardStatusLookup ? (
                          <Badge>{rateCard.placementRateCardStatusLookup.label}</Badge>
                        ) : '-'}
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Date Added</Label>
                      <div>{formatDate(rateCard.dateAdded)}</div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Last Modified</Label>
                      <div>{formatDate(rateCard.dateLastModified)}</div>
                    </div>
                    {rateCard.owner && (
                      <div>
                        <Label className="text-muted-foreground">Owner</Label>
                        <div>{rateCard.owner.firstName} {rateCard.owner.lastName}</div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">Rate Card Lines</h3>
                        <p className="text-sm text-muted-foreground">
                          {lineGroups.length} line group(s), {lineGroups.reduce((sum, g) => sum + g.placementRateCardLines.length, 0)} total lines
                        </p>
                      </div>
                      <Button onClick={loadRateCardLines} disabled={loading} variant="outline" size="sm">
                        Refresh
                      </Button>
                    </div>

                    {loading && lineGroups.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Loading rate card lines...
                      </div>
                    ) : lineGroups.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No rate card lines found
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {lineGroups.map((group, groupIdx) => (
                          <Card key={group.id || groupIdx}>
                            <CardHeader>
                              <div className="flex items-center justify-between">
                                <div>
                                  <CardTitle className="text-base">
                                    Earn Code Group: {group.earnCodeGroup.name || group.earnCodeGroup.id}
                                  </CardTitle>
                                  <CardDescription>
                                    {group.isBase ? (
                                      <Badge variant="default">Base Group</Badge>
                                    ) : (
                                      <Badge variant="secondary">Additional Group</Badge>
                                    )}
                                    <span className="ml-2">{group.placementRateCardLines.length} line(s)</span>
                                  </CardDescription>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="border rounded-md overflow-x-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Earn Code</TableHead>
                                      <TableHead>Pay Mult</TableHead>
                                      <TableHead>Pay Rate</TableHead>
                                      <TableHead>Bill Mult</TableHead>
                                      <TableHead>Bill Rate</TableHead>
                                      <TableHead>Markup %</TableHead>
                                      <TableHead>Markup $</TableHead>
                                      <TableHead>Custom Text</TableHead>
                                      <TableHead>Custom Float</TableHead>
                                      <TableHead className="w-[100px]">Actions</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {group.placementRateCardLines.map((line, lineIdx) => {
                                      const isEditing = editingLineId === line.id
                                      return (
                                        <TableRow key={line.id || lineIdx}>
                                          <TableCell className="font-mono">
                                            {line.earnCode.name || line.earnCode.id}
                                          </TableCell>
                                          <TableCell>
                                            {isEditing ? (
                                              <Input
                                                type="number"
                                                step="0.01"
                                                className="w-20"
                                                value={editFormData.payMultiplier ?? line.payMultiplier}
                                                onChange={(e) => setEditFormData({...editFormData, payMultiplier: e.target.value})}
                                              />
                                            ) : (
                                              line.payMultiplier || '-'
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            {isEditing ? (
                                              <Input
                                                type="number"
                                                step="0.01"
                                                className="w-24"
                                                value={editFormData.payRate ?? line.payRate ?? ''}
                                                onChange={(e) => setEditFormData({...editFormData, payRate: e.target.value})}
                                              />
                                            ) : (
                                              line.payRate || '-'
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            {isEditing ? (
                                              <Input
                                                type="number"
                                                step="0.01"
                                                className="w-20"
                                                value={editFormData.billMultiplier ?? line.billMultiplier}
                                                onChange={(e) => setEditFormData({...editFormData, billMultiplier: e.target.value})}
                                              />
                                            ) : (
                                              line.billMultiplier || '-'
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            {isEditing ? (
                                              <Input
                                                type="number"
                                                step="0.01"
                                                className="w-24"
                                                value={editFormData.billRate ?? line.billRate ?? ''}
                                                onChange={(e) => setEditFormData({...editFormData, billRate: e.target.value})}
                                              />
                                            ) : (
                                              line.billRate || '-'
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            {isEditing ? (
                                              <Input
                                                type="number"
                                                step="0.01"
                                                className="w-20"
                                                value={editFormData.markupPercent ?? line.markupPercent ?? ''}
                                                onChange={(e) => setEditFormData({...editFormData, markupPercent: e.target.value})}
                                              />
                                            ) : (
                                              line.markupPercent || '-'
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            {isEditing ? (
                                              <Input
                                                type="number"
                                                step="0.01"
                                                className="w-24"
                                                value={editFormData.markupValue ?? line.markupValue ?? ''}
                                                onChange={(e) => setEditFormData({...editFormData, markupValue: e.target.value})}
                                              />
                                            ) : (
                                              line.markupValue || '-'
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            {isEditing ? (
                                              <Input
                                                className="w-32"
                                                value={editFormData.customText1 ?? line.customText1 ?? ''}
                                                onChange={(e) => setEditFormData({...editFormData, customText1: e.target.value})}
                                              />
                                            ) : (
                                              line.customText1 || '-'
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            {isEditing ? (
                                              <Input
                                                type="number"
                                                step="0.01"
                                                className="w-24"
                                                value={editFormData.customFloat1 ?? line.customFloat1 ?? ''}
                                                onChange={(e) => setEditFormData({...editFormData, customFloat1: e.target.value})}
                                              />
                                            ) : (
                                              line.customFloat1 || '-'
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            {isEditing ? (
                                              <div className="flex gap-1">
                                                <Button
                                                  size="sm"
                                                  variant="default"
                                                  onClick={() => handleSaveEdit(line.id!)}
                                                  disabled={loading}
                                                >
                                                  <FloppyDisk size={16} />
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  onClick={handleCancelEdit}
                                                  disabled={loading}
                                                >
                                                  <X size={16} />
                                                </Button>
                                              </div>
                                            ) : (
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleEditLine(line)}
                                                disabled={loading || editingLineId !== null}
                                              >
                                                <PencilSimple size={16} />
                                              </Button>
                                            )}
                                          </TableCell>
                                        </TableRow>
                                      )
                                    })}
                                  </TableBody>
                                </Table>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Rate Card(s) from CSV</DialogTitle>
            <DialogDescription>
              Upload a CSV file where each row represents a rate card line. Repeat placementId and effectiveDate for lines on the same rate card.
              <br />
              Required columns: placementId, effectiveDate, earnCodeGroupId, isBase, earnCodeId, payMultiplier, billMultiplier
              <br />
              Optional columns: ownerId, statusLookupId, payRate, billRate, markupPercent, markupValue, customText1, customFloat1
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-md">
              <div className="text-sm">
                <div className="font-semibold">Need a template?</div>
                <div className="text-muted-foreground">Download the CSV template to get started</div>
              </div>
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                <DownloadSimple size={18} />
                Download Template
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="csv-upload">Upload CSV File *</Label>
              <Input
                id="csv-upload"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
              />
              {csvFile && (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    File: {csvFile.name} ({csvData.length} lines)
                  </div>
                  {bulkCreateMode && (
                    <Badge variant="default" className="text-sm">
                      Bulk Mode: {rateCardsToCreate.size} rate cards detected
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {csvData.length > 0 && (
              <div className="space-y-2">
                <Label>CSV Preview (first 5 rows)</Label>
                <div className="border rounded-md overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Placement</TableHead>
                        <TableHead>Eff. Date</TableHead>
                        <TableHead>Grp ID</TableHead>
                        <TableHead>Base</TableHead>
                        <TableHead>Earn Code</TableHead>
                        <TableHead>Pay Mult</TableHead>
                        <TableHead>Bill Mult</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {csvData.slice(0, 5).map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono">{row.placementId}</TableCell>
                          <TableCell>{row.effectiveDate}</TableCell>
                          <TableCell className="font-mono">{row.earnCodeGroupId}</TableCell>
                          <TableCell>{row.isBase}</TableCell>
                          <TableCell className="font-mono">{row.earnCodeId}</TableCell>
                          <TableCell>{row.payMultiplier}</TableCell>
                          <TableCell>{row.billMultiplier}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {csvData.length > 5 && (
                  <p className="text-sm text-muted-foreground">
                    ...and {csvData.length - 5} more rows
                  </p>
                )}
              </div>
            )}

            {bulkCreateMode && rateCardsToCreate.size > 0 && (
              <div className="space-y-2">
                <Label>Rate Cards to Create ({rateCardsToCreate.size})</Label>
                <div className="border rounded-md p-4 space-y-2 max-h-60 overflow-y-auto">
                  {Array.from(rateCardsToCreate.entries()).map(([key, rows]) => {
                    const firstRow = rows[0]
                    return (
                      <div key={key} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div className="flex-1">
                          <div className="font-semibold">Placement ID: {firstRow.placementId}</div>
                          <div className="text-sm text-muted-foreground">
                            Effective: {firstRow.effectiveDate} | {rows.length} line(s)
                          </div>
                        </div>
                        <Badge variant="outline">{rows.length} lines</Badge>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setCreateDialogOpen(false)
              setCsvData([])
              setCsvFile(null)
              setRateCardsToCreate(new Map())
              setBulkCreateMode(false)
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreateRateCard} disabled={loading || csvData.length === 0}>
              <Plus size={18} />
              {bulkCreateMode ? `Create ${rateCardsToCreate.size} Rate Cards` : 'Create Rate Card'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
