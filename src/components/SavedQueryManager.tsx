import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FloppyDisk, Trash, FolderOpen, X, Ma
import type { SavedQuery, QueryFilter, Filter
interface SavedQueryManagerProps {
  fields: string[]
  filterGroups?: FilterGroup[]
  orderBy?: string
  filterMode: 'simple' | 'grou
}

  fields,
  filterGroups,
  orderBy,
  filterMode,
}: SavedQueryManagerProps) {
  const [saveDialogOpen, se
  const [queryName
  const [queryTa
  const [selectedEntity, setSelect
  const handleSaveQuery = () => {
 

    if (!entity) {
      ret

      toas
    }
    const new
      name
      en
      filters
      groupLo
      count,
      createdAt: Date.now(),
      tags: queryTags.trim() ? queryTags.split(',').map(t => 

    toast.success(`Query "${queryName}" saved su
    setQueryName('')
    setQueryTags('')
  }
  const handleDeleteQuery = (queryId: string) => {

    if (confirm(`Delete query "${
      toast.success(`Query "
  }
  const hand
    s

  const filteredQu
      query.name.toLowerCase().includes(searchTerm
      query.
    c




    <

            size="sm"
            disabled={!canSaveQuery}
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
           
            <FloppyDisk size={16} />
            <FolderOpe
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
              >
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
            </div>
                value={queryDescription}
                onChange={(e) => setQueryDescription(e.target.value)}
                rows={3}
              />
            </div>
              ) : (
              <Label>Tags (comma-separated)</Label>
                    
                placeholder="e.g., candidate, active, recruiting"
                value={queryTags}
                onChange={(e) => setQueryTags(e.target.value)}
                
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
                        
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                    
            </Button>
            <Button onClick={handleSaveQuery}>
              <FloppyDisk size={16} />
              Save Query
            </Button>
                         
        </DialogContent>
               

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
      </Dialog>
            <DialogTitle>Saved Queries</DialogTitle>
}
              Load a previously saved query configuration
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">

              <div className="relative flex-1">
                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input

                  value={searchTerm}

                  className="pl-9"

              </div>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"

                onChange={(e) => setSelectedEntity(e.target.value)}
              >
                <option value="all">All Entities</option>
                {uniqueEntities.map(entity => (
                  <option key={entity} value={entity}>{entity}</option>
                ))}
              </select>
            </div>


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

                              <FolderOpen size={14} />
















































