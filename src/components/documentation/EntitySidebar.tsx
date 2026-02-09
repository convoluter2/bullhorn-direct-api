import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { MagnifyingGlass, Database, X } from 
import type { EntityMetadata } from '@/lib/entity-metadata'
interface EntitySidebarProps {
  onSelectEntity: (entityId: string) => void

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
      <div className="p-4 border-b border-border">
          <MagnifyingGlass 
   

          
            className="pl-9 pr-9"
          {search && (
              variant="ghost"
              className="ab
            >
            </Button>
        </di
          {filte
      </div>
      <ScrollArea classNam
          {filteredEntities.map((entity) => (
              key={entity.id}
            
                transi
                  ?
                }
            >
                <Database size={16} className="shrink-0" />
              </div>
             
                </Badge>
            </button>

            <d
            </div>
        </div>
    </div>
}



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
