import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MagnifyingGlass, X } from '@phosphor-icons/react'
import type { EntityField } from '@/hooks/use-entity-metadata'

interface FieldSelectorProps {
  fields: EntityField[]
  selectedFields: string[]
  onToggleField: (fieldName: string) => void
  label?: string
  placeholder?: string
}

export function FieldSelector({ 
  fields, 
  selectedFields, 
  onToggleField,
  label = 'Select Fields',
  placeholder = 'Search fields...'
}: FieldSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredFields = useMemo(() => {
    if (!searchTerm) return fields
    const term = searchTerm.toLowerCase()
    return fields.filter(field => 
      field.name.toLowerCase().includes(term) || 
      field.label.toLowerCase().includes(term)
    )
  }, [fields, searchTerm])

  const hasSearch = fields.length > 15

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{selectedFields.length} of {fields.length} selected</span>
          {selectedFields.length > 0 && (
            <button
              onClick={() => selectedFields.forEach(f => onToggleField(f))}
              className="text-destructive hover:underline"
            >
              Clear all
            </button>
          )}
        </div>
      </div>
      
      {hasSearch && (
        <div className="relative">
          <MagnifyingGlass 
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" 
            size={16}
          />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={placeholder}
            className="pl-9 pr-9"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}
      
      <ScrollArea className={hasSearch ? "h-[300px]" : "h-auto max-h-[400px]"}>
        <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-muted/30">
          {filteredFields.length === 0 ? (
            <p className="text-sm text-muted-foreground w-full text-center py-4">
              No fields found matching "{searchTerm}"
            </p>
          ) : (
            filteredFields.map((field) => (
              <Badge
                key={field.name}
                variant={selectedFields.includes(field.name) ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
                onClick={() => onToggleField(field.name)}
                title={field.label !== field.name ? field.label : undefined}
              >
                {field.name}
              </Badge>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
