import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FloppyDisk, Trash, FolderOpen, X, MagnifyingGlass, Tag } from '@phosphor-icons/react'
import { toast } from 'sonner'
import type { SavedQuery, QueryFilter, FilterGroup } from '@/lib/types'

interface SavedQueryManagerProps {
  entity: string
  fields: string[]
  filters: QueryFilter[]
  filterGroups?: FilterGroup[]
  groupLogic?: 'AND' | 'OR'
  orderBy?: string
  count?: number
  filterMode: 'simple' | 'grouped'
  onLoadQuery: (query: SavedQuery) => void
}

export function SavedQueryManager({
  entity,
  fields,
  filters,
  filterGroups,
  groupLogic,
  orderBy,
  count,
  filterMode,
  onLoadQuery
}: SavedQueryManagerProps) {
  const [savedQueries, setSavedQueries] = useKV<SavedQuery[]>('queryblast-saved-queries', [])
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [loadDialogOpen, setLoadDialogOpen] = useState(false)
  const [queryName, setQueryName] = useState('')
  const [queryDescription, setQueryDescription] = useState('')
  const [queryTags, setQueryTags] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEntity, setSelectedEntity] = useState<string>('all')

  const handleSaveQuery = () => {
    if (!queryName.trim()) {
      toast.error('Please enter a query name')
      return
    }

    if (!entity) {
      toast.error('Please select an entity first')
      return
    }

    if (fields.length === 0) {
      toast.error('Please select at least one field')
      return
    }

    const newQuery: SavedQuery = {
      id: `query-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: queryName.trim(),
      description: queryDescription.trim() || undefined,
      entity,
      fields,
      filters,
      filterGroups,
      groupLogic,
      orderBy: orderBy || undefined,
      count,
      filterMode,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: queryTags.trim() ? queryTags.split(',').map(t => t.trim()).filter(t => t) : undefined
    }

    setSavedQueries((current) => [...(current || []), newQuery])
    toast.success(`Query "${queryName}" saved successfully`)
    
    setQueryName('')
    setQueryDescription('')
    setQueryTags('')
    setSaveDialogOpen(false)
  }

  const handleDeleteQuery = (queryId: string) => {
    const query = (savedQueries || []).find(q => q.id === queryId)
    if (!query) return

    if (confirm(`Delete query "${query.name}"?`)) {
      setSavedQueries((current) => (current || []).filter(q => q.id !== queryId))
      toast.success(`Query "${query.name}" deleted`)
    }
  }

  const handleLoadQuery = (query: SavedQuery) => {
    onLoadQuery(query)
    setLoadDialogOpen(false)
    toast.success(`Loaded query: ${query.name}`)
  }

  const filteredQueries = (savedQueries || []).filter(query => {
    const matchesSearch = !searchTerm || 
      query.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      query.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      query.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesEntity = selectedEntity === 'all' || query.entity === selectedEntity
    
    return matchesSearch && matchesEntity
  })

  const uniqueEntities = Array.from(new Set((savedQueries || []).map(q => q.entity))).sort()

  const canSaveQuery = entity && fields.length > 0

  return (
    <div className="flex gap-2">
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            disabled={!canSaveQuery}
            title={canSaveQuery ? 'Save current query' : 'Select entity and fields to save query'}
          >
            <FloppyDisk size={16} />
            Save Query
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Save Query</DialogTitle>
            <DialogDescription>
              Save the current query configuration for reuse across sessions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Query Name *</Label>
              <Input
                placeholder="e.g., Active Candidates - Last 30 Days"
                value={queryName}
                onChange={(e) => setQueryName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Optional description of what this query does..."
                value={queryDescription}
                onChange={(e) => setQueryDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Tags (comma-separated)</Label>
              <Input
                placeholder="e.g., candidate, active, recruiting"
                value={queryTags}
                onChange={(e) => setQueryTags(e.target.value)}
              />
            </div>
            <div className="rounded-lg border p-3 bg-muted/50">
              <div className="text-sm font-medium mb-2">Query Preview</div>
              <div className="text-xs space-y-1">
                <div><span className="text-muted-foreground">Entity:</span> <Badge variant="secondary">{entity}</Badge></div>
                <div><span className="text-muted-foreground">Fields:</span> {fields.length} selected</div>
                <div><span className="text-muted-foreground">Filters:</span> {filterMode === 'simple' ? filters.length : filterGroups?.length || 0}</div>
                {orderBy && <div><span className="text-muted-foreground">Order By:</span> {orderBy}</div>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveQuery}>
              <FloppyDisk size={16} />
              Save Query
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
        <DialogTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            disabled={(savedQueries || []).length === 0}
          >
            <FolderOpen size={16} />
            Load Query ({(savedQueries || []).length})
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Saved Queries</DialogTitle>
            <DialogDescription>
              Load a previously saved query configuration
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input
                  placeholder="Search queries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={selectedEntity}
                onChange={(e) => setSelectedEntity(e.target.value)}
              >
                <option value="all">All Entities</option>
                {uniqueEntities.map(entity => (
                  <option key={entity} value={entity}>{entity}</option>
                ))}
              </select>
            </div>

            <ScrollArea className="h-[400px] pr-4">
              {filteredQueries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm || selectedEntity !== 'all' 
                    ? 'No queries match your filters'
                    : 'No saved queries yet. Save a query to get started.'}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredQueries.map((query) => (
                    <Card key={query.id} className="hover:bg-accent/50 transition-colors">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base mb-1">{query.name}</CardTitle>
                            {query.description && (
                              <CardDescription className="text-xs">{query.description}</CardDescription>
                            )}
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleLoadQuery(query)}
                            >
                              <FolderOpen size={14} />
                              Load
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteQuery(query.id)}
                            >
                              <Trash size={14} />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex flex-wrap gap-2 text-xs">
                          <Badge variant="secondary">{query.entity}</Badge>
                          <Badge variant="outline">{query.fields.length} fields</Badge>
                          <Badge variant="outline">
                            {query.filterMode === 'simple' 
                              ? `${query.filters.length} filters`
                              : `${query.filterGroups?.length || 0} filter groups`}
                          </Badge>
                          {query.orderBy && <Badge variant="outline">Sorted</Badge>}
                        </div>
                        {query.tags && query.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {query.tags.map((tag, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs gap-1">
                                <Tag size={10} />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          Created: {new Date(query.createdAt).toLocaleString()}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
