import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CreditCard, MagnifyingGlass, Plus, Trash, PencilSimple } from '@phosphor-icons/react'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

interface RateCardBuilderProps {
  onLog: (operation: string, status: 'success' | 'error', message: string, details?: any) => void
}

interface RateCard {
  id: number
  title: string
  description?: string
  dateAdded?: number
  dateLastModified?: number
  effectiveDate?: number
  expirationDate?: number
  owner?: {
    id: number
    firstName: string
    lastName: string
  }
  billRates?: any[]
  payRates?: any[]
}

interface RateCardLineItem {
  id: number
  title: string
  externalID?: string
  amount?: number
  type?: string
}

export function RateCardBuilder({ onLog }: RateCardBuilderProps) {
  const [activeTab, setActiveTab] = useState('lookup')
  const [searchId, setSearchId] = useState('')
  const [searchTitle, setSearchTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [rateCard, setRateCard] = useState<RateCard | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newRateCard, setNewRateCard] = useState({
    title: '',
    description: '',
    effectiveDate: '',
    expirationDate: ''
  })

  const handleLookupById = async () => {
    if (!searchId) {
      toast.error('Please enter a Rate Card ID')
      return
    }

    setLoading(true)
    try {
      const response = await bullhornAPI.query('BillMasterTransaction', {
        where: `id=${searchId}`,
        fields: 'id,title,description,dateAdded,dateLastModified,effectiveDate,expirationDate,owner,billRates,payRates',
        count: 1
      })

      if (response.data && response.data.length > 0) {
        setRateCard(response.data[0])
        toast.success('Rate card found')
        onLog('Rate Card Lookup', 'success', `Found rate card: ${response.data[0].title}`, {
          rateCardId: response.data[0].id,
          title: response.data[0].title
        })
      } else {
        toast.error('Rate card not found')
        setRateCard(null)
        onLog('Rate Card Lookup', 'error', `Rate card ID ${searchId} not found`, { searchId })
      }
    } catch (error) {
      console.error('Rate card lookup error:', error)
      toast.error('Failed to lookup rate card')
      setRateCard(null)
      onLog('Rate Card Lookup', 'error', 'Failed to lookup rate card', { error: String(error), searchId })
    } finally {
      setLoading(false)
    }
  }

  const handleSearchByTitle = async () => {
    if (!searchTitle) {
      toast.error('Please enter a search term')
      return
    }

    setLoading(true)
    try {
      const response = await bullhornAPI.query('BillMasterTransaction', {
        where: `title:'${searchTitle}*'`,
        fields: 'id,title,description,dateAdded,dateLastModified,effectiveDate,expirationDate,owner',
        count: 20,
        orderBy: '-dateLastModified'
      })

      if (response.data && response.data.length > 0) {
        setRateCard(response.data[0])
        toast.success(`Found ${response.data.length} rate card(s)`)
        onLog('Rate Card Search', 'success', `Found ${response.data.length} rate card(s) matching "${searchTitle}"`, {
          searchTerm: searchTitle,
          resultCount: response.data.length
        })
      } else {
        toast.info('No rate cards found matching your search')
        setRateCard(null)
        onLog('Rate Card Search', 'success', `No rate cards found matching "${searchTitle}"`, { searchTerm: searchTitle })
      }
    } catch (error) {
      console.error('Rate card search error:', error)
      toast.error('Failed to search rate cards')
      setRateCard(null)
      onLog('Rate Card Search', 'error', 'Failed to search rate cards', { error: String(error), searchTerm: searchTitle })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRateCard = async () => {
    if (!newRateCard.title) {
      toast.error('Please enter a title')
      return
    }

    setLoading(true)
    try {
      const payload: any = {
        title: newRateCard.title
      }

      if (newRateCard.description) {
        payload.description = newRateCard.description
      }
      if (newRateCard.effectiveDate) {
        payload.effectiveDate = new Date(newRateCard.effectiveDate).getTime()
      }
      if (newRateCard.expirationDate) {
        payload.expirationDate = new Date(newRateCard.expirationDate).getTime()
      }

      const response = await bullhornAPI.create('BillMasterTransaction', payload)

      if (response.changedEntityId) {
        toast.success('Rate card created successfully')
        setCreateDialogOpen(false)
        setNewRateCard({ title: '', description: '', effectiveDate: '', expirationDate: '' })
        
        const createdCard = await bullhornAPI.query('BillMasterTransaction', {
          where: `id=${response.changedEntityId}`,
          fields: 'id,title,description,dateAdded,dateLastModified,effectiveDate,expirationDate,owner',
          count: 1
        })
        
        if (createdCard.data && createdCard.data.length > 0) {
          setRateCard(createdCard.data[0])
        }

        onLog('Rate Card Create', 'success', `Created rate card: ${newRateCard.title}`, {
          rateCardId: response.changedEntityId,
          title: newRateCard.title
        })
      } else {
        toast.error('Failed to create rate card')
        onLog('Rate Card Create', 'error', 'Failed to create rate card', { response })
      }
    } catch (error) {
      console.error('Rate card create error:', error)
      toast.error('Failed to create rate card')
      onLog('Rate Card Create', 'error', 'Failed to create rate card', { error: String(error) })
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '-'
    return new Date(timestamp).toLocaleDateString()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard size={28} className="text-accent" weight="duotone" />
              <div>
                <CardTitle>Rate Card Builder</CardTitle>
                <CardDescription>
                  Lookup existing rate cards or create new ones
                </CardDescription>
              </div>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus />
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
              <TabsTrigger value="details" disabled={!rateCard} className="gap-2">
                <CreditCard size={18} />
                Details
              </TabsTrigger>
            </TabsList>

            <TabsContent value="lookup" className="space-y-6 mt-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="search-id">Lookup by ID</Label>
                  <div className="flex gap-2">
                    <Input
                      id="search-id"
                      type="number"
                      placeholder="Enter rate card ID"
                      value={searchId}
                      onChange={(e) => setSearchId(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleLookupById()}
                    />
                    <Button onClick={handleLookupById} disabled={loading}>
                      <MagnifyingGlass />
                      Lookup
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="search-title">Search by Title</Label>
                  <div className="flex gap-2">
                    <Input
                      id="search-title"
                      placeholder="Enter rate card title"
                      value={searchTitle}
                      onChange={(e) => setSearchTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchByTitle()}
                    />
                    <Button onClick={handleSearchByTitle} disabled={loading}>
                      <MagnifyingGlass />
                      Search
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="details" className="space-y-6 mt-6">
              {rateCard && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">ID</Label>
                      <div className="text-lg font-mono">{rateCard.id}</div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Title</Label>
                      <div className="text-lg font-semibold">{rateCard.title}</div>
                    </div>
                  </div>

                  {rateCard.description && (
                    <div>
                      <Label className="text-muted-foreground">Description</Label>
                      <div className="mt-1">{rateCard.description}</div>
                    </div>
                  )}

                  <Separator />

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Effective Date</Label>
                      <div>{formatDate(rateCard.effectiveDate)}</div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Expiration Date</Label>
                      <div>{formatDate(rateCard.expirationDate)}</div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Date Added</Label>
                      <div>{formatDate(rateCard.dateAdded)}</div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Last Modified</Label>
                      <div>{formatDate(rateCard.dateLastModified)}</div>
                    </div>
                  </div>

                  {rateCard.owner && (
                    <div>
                      <Label className="text-muted-foreground">Owner</Label>
                      <div>
                        {rateCard.owner.firstName} {rateCard.owner.lastName} (ID: {rateCard.owner.id})
                      </div>
                    </div>
                  )}

                  {(rateCard.billRates || rateCard.payRates) && (
                    <>
                      <Separator />
                      <div className="space-y-4">
                        {rateCard.billRates && rateCard.billRates.length > 0 && (
                          <div>
                            <Label className="text-muted-foreground">Bill Rates</Label>
                            <Badge variant="secondary" className="ml-2">{rateCard.billRates.length}</Badge>
                          </div>
                        )}
                        {rateCard.payRates && rateCard.payRates.length > 0 && (
                          <div>
                            <Label className="text-muted-foreground">Pay Rates</Label>
                            <Badge variant="secondary" className="ml-2">{rateCard.payRates.length}</Badge>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Rate Card</DialogTitle>
            <DialogDescription>
              Enter the details for the new rate card
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-title">Title *</Label>
              <Input
                id="new-title"
                placeholder="Rate card title"
                value={newRateCard.title}
                onChange={(e) => setNewRateCard({ ...newRateCard, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-description">Description</Label>
              <Textarea
                id="new-description"
                placeholder="Optional description"
                value={newRateCard.description}
                onChange={(e) => setNewRateCard({ ...newRateCard, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-effective-date">Effective Date</Label>
                <Input
                  id="new-effective-date"
                  type="date"
                  value={newRateCard.effectiveDate}
                  onChange={(e) => setNewRateCard({ ...newRateCard, effectiveDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-expiration-date">Expiration Date</Label>
                <Input
                  id="new-expiration-date"
                  type="date"
                  value={newRateCard.expirationDate}
                  onChange={(e) => setNewRateCard({ ...newRateCard, expirationDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRateCard} disabled={loading}>
              <Plus />
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
