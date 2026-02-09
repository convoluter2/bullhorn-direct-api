import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MagnifyingGlass, Database, X } from '@phosphor-icons/react'
import { BULLHORN_ENTITIES } from '@/lib/entities'
import type { EntityMetadata } from '@/lib/entity-metadata'

interface EntitySidebarProps {
  selectedEntity: string | null
  onSelectEntity: (entityId: string) => void
  customEntities: string[]
  entityMetadata: Map<string, EntityMetadata>
}

export function EntitySidebar({ 
  selectedEntity, 
  onSelectEntity, 
  customEntities,
  entityMetadata 
}: EntitySidebarProps) {
  const [search, setSearch] = useState('')

  const allEntities = [
    ...BULLHORN_ENTITIES.map(e => ({ id: e.id, label: e.label, isCustom: false })),
    ...customEntities
      .filter(id => !BULLHORN_ENTITIES.find(e => e.id === id))
      .map(id => ({ 
        id, 
        label: entityMetadata.get(id)?.label || id, 
        isCustom: true 
      }))
  ]

  const filteredEntities = allEntities.filter(entity =>
    entity.label.toLowerCase().includes(search.toLowerCase()) ||
    entity.id.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full border-r border-border bg-card/30">
      <div className="p-4 border-b border-border">
        <div className="relative">
          <MagnifyingGlass 
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" 
            size={16} 
          />
          <Input
            placeholder="Search entities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9"
          />
          {search && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => setSearch('')}
            >
              <X size={14} />
            </Button>
          )}
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          {filteredEntities.length} {filteredEntities.length === 1 ? 'entity' : 'entities'}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
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
              {entity.isCustom && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  Custom
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
