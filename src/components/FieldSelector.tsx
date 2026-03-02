import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { MagnifyingGlass, X, Database, CheckCircle } from '@phosphor-icons/react'
import { formatFieldLabelWithType } from '@/lib/utils'
import { getFieldEndpointCapability } from '@/lib/field-endpoint-validator'
import type { EntityField } from '@/hooks/use-entity-metadata'

interface FieldSelectorProps {
  fields: EntityField[]
  selectedFields: string[]
  onToggleField: (fieldName: string) => void
  label?: string
  placeholder?: string
  showEndpointInfo?: boolean
}

export function FieldSelector({ 
  fields, 
  selectedFields, 
  onToggleField,
  label = 'Select Fields',
  placeholder = 'Search fields...',
  showEndpointInfo = false
}: FieldSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const fieldsWithCapabilities = useMemo(() => {
    return fields.map(field => ({
      ...field,
      capability: getFieldEndpointCapability(field.name, field.label, field.dataType)
    }))
  }, [fields])

  const filteredFields = useMemo(() => {
    if (!searchTerm) return fieldsWithCapabilities
    const term = searchTerm.toLowerCase()
    return fieldsWithCapabilities.filter(field => 
      field.name.toLowerCase().includes(term) || 
      field.label.toLowerCase().includes(term)
    )
  }, [fieldsWithCapabilities, searchTerm])

  const getFieldDisplayLabel = (field: EntityField & { capability?: ReturnType<typeof getFieldEndpointCapability> }) => {
    return formatFieldLabelWithType(field.label, field.name, field.type, field.dataType)
  }

  const getEndpointIcon = (capability: ReturnType<typeof getFieldEndpointCapability>) => {
    if (capability.recommendation === 'search') {
      return <MagnifyingGlass size={10} className="text-blue-500" />
    } else if (capability.recommendation === 'entity') {
      return <Database size={10} className="text-green-500" />
    } else if (capability.recommendation === 'both') {
      return <CheckCircle size={10} className="text-purple-500" />
    }
    return null
  }

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
              <TooltipProvider key={field.name}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant={selectedFields.includes(field.name) ? 'default' : 'outline'}
                      className="cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-1.5"
                      onClick={() => onToggleField(field.name)}
                    >
                      {showEndpointInfo && field.capability && getEndpointIcon(field.capability)}
                      {getFieldDisplayLabel(field)}
                    </Badge>
                  </TooltipTrigger>
                  {showEndpointInfo && field.capability && (
                    <TooltipContent side="top" className="max-w-xs">
                      <div className="space-y-1">
                        <p className="font-semibold text-xs">Endpoint Support:</p>
                        <div className="flex gap-2 text-xs">
                          <span className={field.capability.searchSupported ? 'text-green-400' : 'text-red-400 line-through'}>
                            Search
                          </span>
                          <span className="text-muted-foreground">•</span>
                          <span className={field.capability.entitySupported ? 'text-green-400' : 'text-red-400 line-through'}>
                            Entity
                          </span>
                        </div>
                        {field.capability.notes && (
                          <p className="text-xs text-muted-foreground italic mt-1">
                            {field.capability.notes}
                          </p>
                        )}
                      </div>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
