import { useState } from 'react'
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
import { CreditCard, MagnifyingGlass, Plus, Upload, Trash } from '@phosphor-icons/react'
import { toast } from 'sonner'
import Papa from 'papaparse'

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
  isBase: boolean
  earnCodeGroup: { id: number }
  placementRateCardLines: RateCardLine[]
}

interface RateCardLine {
  earnCode: { id: number }
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
  const [newRateCard, setNewRateCard] = useState({
    placementId: '',
    effectiveDate: '',
    ownerId: '',
    statusLookupId: ''
  })

  const handleLookupById = async () => {
    if (!searchId.trim()) {
      toast.error('Please enter a Rate Card ID')
      return
    }

    setLoading(true)
    try {
      const response = await bullhornAPI.getEntity('PlacementRateCard', parseInt(searchId), {
        fields: 'id,effectiveDate,placement(id),owner(id,firstName,lastName),placementRateCardStatusLookup(id,label),dateAdded,dateLastModified'
      })

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
        toast.success(`Loaded ${results.data.length} rate card lines from CSV`)
      },
      error: (error) => {
        toast.error('Failed to parse CSV file')
        console.error('CSV parse error:', error)
      }
    })
  }

  const handleCreateRateCard = async () => {
    if (!newRateCard.placementId.trim()) {
      toast.error('Please enter a Placement ID')
      return
    }

    if (!newRateCard.effectiveDate) {
      toast.error('Please enter an Effective Date')
      return
    }

    if (csvData.length === 0) {
      toast.error('Please upload a CSV file with rate card lines')
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
            earnCodeGroup: { id: parseInt(groupKey) },
            placementRateCardLines: []
          })
        }

        const group = lineGroupsMap.get(groupKey)!
        group.placementRateCardLines.push({
          earnCode: { id: parseInt(row.earnCodeId) },
          payMultiplier: parseFloat(row.payMultiplier) || 1,
          payRate: row.payRate || '',
          billMultiplier: parseFloat(row.billMultiplier) || 1,
          billRate: row.billRate || '',
          markupPercent: row.markupPercent || '',
          markupValue: row.markupValue || '',
          customText1: row.customText1 || '',
          customFloat1: row.customFloat1 || ''
        })
      })

      const payload: any = {
        placementRateCardLineGroups: Array.from(lineGroupsMap.values()),
        effectiveDate: newRateCard.effectiveDate,
        placement: { id: parseInt(newRateCard.placementId) }
      }

      if (newRateCard.ownerId) {
        payload.owner = { id: parseInt(newRateCard.ownerId) }
      }

      if (newRateCard.statusLookupId) {
        payload.placementRateCardStatusLookup = { id: parseInt(newRateCard.statusLookupId) }
      }

      console.log('Creating rate card with payload:', payload)

      const response = await bullhornAPI.createEntity('PlacementRateCard', payload)

      if (response.changedEntityId) {
        toast.success('Rate card created successfully!')
        setCreateDialogOpen(false)
        setNewRateCard({
          placementId: '',
          effectiveDate: '',
          ownerId: '',
          statusLookupId: ''
        })
        setCsvData([])
        setCsvFile(null)

        const createdCard = await bullhornAPI.getEntity('PlacementRateCard', response.changedEntityId, {
          fields: 'id,effectiveDate,placement(id),owner(id,firstName,lastName),placementRateCardStatusLookup(id,label)'
        })

        setRateCard(createdCard.data)
        setActiveTab('lookup')

        onLog('Rate Card Create', 'success', `Created Rate Card ID: ${response.changedEntityId}`, {
          rateCardId: response.changedEntityId,
          placementId: newRateCard.placementId,
          effectiveDate: newRateCard.effectiveDate,
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
                <div className="space-y-4">
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
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Rate Card</DialogTitle>
            <DialogDescription>
              Upload a CSV file with rate card lines. Required columns: earnCodeGroupId, isBase, earnCodeId, payMultiplier, billMultiplier
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-placement">Placement ID *</Label>
              <Input
                id="new-placement"
                placeholder="Enter Placement ID"
                value={newRateCard.placementId}
                onChange={(e) => setNewRateCard({ ...newRateCard, placementId: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-effective-date">Effective Date *</Label>
              <Input
                id="new-effective-date"
                type="date"
                value={newRateCard.effectiveDate}
                onChange={(e) => setNewRateCard({ ...newRateCard, effectiveDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-owner">Owner ID (optional)</Label>
              <Input
                id="new-owner"
                placeholder="Enter Owner ID"
                value={newRateCard.ownerId}
                onChange={(e) => setNewRateCard({ ...newRateCard, ownerId: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-status">Status Lookup ID (optional)</Label>
              <Input
                id="new-status"
                placeholder="Enter Status Lookup ID"
                value={newRateCard.statusLookupId}
                onChange={(e) => setNewRateCard({ ...newRateCard, statusLookupId: e.target.value })}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="csv-upload">Upload CSV File *</Label>
              <Input
                id="csv-upload"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
              />
              {csvFile && (
                <div className="text-sm text-muted-foreground">
                  File: {csvFile.name} ({csvData.length} lines)
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
                        <TableHead>Earn Code Group</TableHead>
                        <TableHead>Base</TableHead>
                        <TableHead>Earn Code</TableHead>
                        <TableHead>Pay Mult</TableHead>
                        <TableHead>Bill Mult</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {csvData.slice(0, 5).map((row, idx) => (
                        <TableRow key={idx}>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRateCard} disabled={loading}>
              <Plus size={18} />
              Create Rate Card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
