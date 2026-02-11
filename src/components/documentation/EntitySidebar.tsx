import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MagnifyingGlass, Database, X, ArrowsClockwise, Trash, Export, CloudArrowDown } from '@phosphor-icons/react'
import type { EntityMetadata } from '@/lib/entity-metadata'

interface EntitySidebarProps {
  selectedEntity: string | null
  onSelectEntity: (entityId: string) => void
  customEntities: string[]
  entityMetadata: Map<string, EntityMetadata>
  onRefreshAll: () => void
  onRefreshUncached: () => void
  refreshingAll: boolean
  onClearCache: () => void
  cachedCount: number
  onExportAll?: () => void
}

export function EntitySidebar({ 
  selectedEntity, 
  onSelectEntity, 
  customEntities,
  entityMetadata,
  onRefreshAll,
  onRefreshUncached,
  refreshingAll,
  onClearCache,
  cachedCount,
  onExportAll
}: EntitySidebarProps) {
  const [search, setSearch] = useState('')

  console.log('🎯 EntitySidebar - customEntities:', {
    type: typeof customEntities,
    isArray: Array.isArray(customEntities),
    length: customEntities?.length,
    first10: customEntities?.slice(0, 10),
    dataTypes: customEntities?.slice(0, 5).map(e => typeof e),
    keys: Object.keys(customEntities || {}).slice(0, 10)
  })

  if (!Array.isArray(customEntities)) {
    console.error('❌ EntitySidebar - customEntities is not an array!', {
      type: typeof customEntities,
      value: customEntities,
      keys: Object.keys(customEntities || {})
    })
  }

  const allEntities = (Array.isArray(customEntities) ? customEntities : []).map(id => ({ 
    id, 
    label: entityMetadata.get(id)?.label || id,
    isCached: entityMetadata.has(id)
  }))

  const filteredEntities = allEntities.filter(entity =>
    entity.label.toLowerCase().includes(search.toLowerCase()) ||
    entity.id.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full border-r border-border bg-card">
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <MagnifyingGlass 
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" 
              size={16}
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search entities..."
              className="pl-9 pr-9"
            />
            {search && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearch('')}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              >
                <X size={14} />
              </Button>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRefreshUncached}
            disabled={refreshingAll}
            className="col-span-2"
            title="Cache only uncached entities"
          >
            <CloudArrowDown className={refreshingAll ? 'animate-spin' : ''} />
            {refreshingAll ? 'Caching...' : 'Cache Uncached'}
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRefreshAll}
            disabled={refreshingAll}
            title="Force refresh all entities"
          >
            <ArrowsClockwise className={refreshingAll ? 'animate-spin' : ''} />
            Refresh All
          </Button>
          
          {onExportAll && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onExportAll}
              title="Export all cached entities to HTML"
            >
              <Export size={16} />
            </Button>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onClearCache}
            disabled={cachedCount === 0}
            className="flex-1"
            title="Clear metadata cache"
          >
            <Trash size={16} />
            Clear Cache
          </Button>
        </div>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{filteredEntities.length} entities</span>
          {cachedCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {cachedCount} cached
            </Badge>
          )}
        </div>
      </div>
      <ScrollArea className="flex-1 h-0">
        <div className="p-2 space-y-1">
          {filteredEntities.map((entity) => (
            <button
              key={entity.id}
              onClick={() => onSelectEntity(entity.id)}
              className={`
                w-full text-left px-3 py-2.5 rounded-md text-sm 
                transition-colors flex items-center justify-between gap-2
                ${selectedEntity === entity.id
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'hover:bg-muted text-foreground'
                }
              `}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Database size={16} className="shrink-0" />
                <span className="truncate">{entity.label}</span>
              </div>
              {entity.isCached && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                  ✓
                </Badge>
              )}
            </button>
          ))}

          {filteredEntities.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No entities found
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
