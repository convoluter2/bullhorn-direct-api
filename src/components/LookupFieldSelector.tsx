import { useMemo } from 'react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { MagnifyingGlass, Database, CheckCircle, WarningCircle, Info } from '@phosphor-icons/react'
import { formatFieldLabel, formatFieldLabelWithType } from '@/lib/utils'
import { getFieldEndpointCapability } from '@/lib/field-endpoint-validator'
import type { EntityField } from '@/hooks/use-entity-metadata'

interface LookupFieldSelectorProps {
  fields: EntityField[]
  selectedField: string
  onSelectField: (fieldName: string) => void
  label?: string
  placeholder?: string
  showEndpointInfo?: boolean
}

export function LookupFieldSelector({
  fields,
  selectedField,
  onSelectField,
  label = 'Lookup Field',
  placeholder = 'Select lookup field...',
  showEndpointInfo = true
}: LookupFieldSelectorProps) {
  const fieldsWithCapabilities = useMemo(() => {
    const fieldsWithCap = fields.map(field => ({
      ...field,
      capability: getFieldEndpointCapability(field.name, field.label, field.dataType)
    }))
    
    return fieldsWithCap.sort((a, b) => {
      const labelA = (a.label || a.name).toLowerCase()
      const labelB = (b.label || b.name).toLowerCase()
      return labelA.localeCompare(labelB)
    })
  }, [fields])

  const selectedFieldInfo = useMemo(() => {
    const field = fieldsWithCapabilities.find(f => f.name === selectedField)
    return field?.capability
  }, [fieldsWithCapabilities, selectedField])

  const getEndpointBadge = (recommendation: string) => {
    switch (recommendation) {
      case 'search':
        return (
          <Badge variant="outline" className="gap-1 text-xs">
            <MagnifyingGlass size={12} />
            Search
          </Badge>
        )
      case 'entity':
        return (
          <Badge variant="outline" className="gap-1 text-xs">
            <Database size={12} />
            Entity
          </Badge>
        )
      case 'both':
        return (
          <Badge variant="secondary" className="gap-1 text-xs">
            <CheckCircle size={12} />
            Both
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="lookup-field">{label}</Label>
      
      <Select value={selectedField} onValueChange={onSelectField}>
        <SelectTrigger id="lookup-field">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="max-h-[400px]">
          <div className="sticky top-0 z-10 bg-popover p-2">
            <input
              type="text"
              placeholder="Search fields..."
              className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                const searchTerm = e.target.value.toLowerCase()
                const items = e.target.closest('[role="listbox"]')?.querySelectorAll('[role="option"]')
                items?.forEach((item) => {
                  const text = item.textContent?.toLowerCase() || ''
                  if (text.includes(searchTerm)) {
                    (item as HTMLElement).style.display = ''
                  } else {
                    (item as HTMLElement).style.display = 'none'
                  }
                })
              }}
            />
          </div>
          <SelectItem value="__none__">
            <span className="text-muted-foreground italic">No lookup (create all new records)</span>
          </SelectItem>
          
          {fieldsWithCapabilities.map(field => (
            <SelectItem key={field.name} value={field.name}>
              <div className="flex items-center gap-2 justify-between w-full">
                <span>{formatFieldLabelWithType(field.label, field.name, field.type, field.dataType)}</span>
                {showEndpointInfo && getEndpointBadge(field.capability.recommendation)}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showEndpointInfo && selectedFieldInfo && selectedField !== '__none__' && (
        <div className="rounded-md border bg-muted/30 p-3 space-y-2">
          <div className="flex items-start gap-2">
            <Info size={16} className="text-accent mt-0.5 flex-shrink-0" />
            <div className="space-y-1 text-sm flex-1">
              <div className="font-medium">Lookup Endpoint Support</div>
              
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="flex items-center gap-2">
                  {selectedFieldInfo.searchSupported ? (
                    <CheckCircle size={14} className="text-green-500" />
                  ) : (
                    <WarningCircle size={14} className="text-red-500" />
                  )}
                  <span className={selectedFieldInfo.searchSupported ? 'text-foreground' : 'text-muted-foreground line-through'}>
                    /search endpoint
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  {selectedFieldInfo.entitySupported ? (
                    <CheckCircle size={14} className="text-green-500" />
                  ) : (
                    <WarningCircle size={14} className="text-red-500" />
                  )}
                  <span className={selectedFieldInfo.entitySupported ? 'text-foreground' : 'text-muted-foreground line-through'}>
                    /entity endpoint
                  </span>
                </div>
              </div>

              {selectedFieldInfo.notes && (
                <p className="text-xs text-muted-foreground mt-2 italic">
                  {selectedFieldInfo.notes}
                </p>
              )}

              {selectedFieldInfo.recommendation === 'search' && (
                <div className="mt-2 p-2 rounded bg-blue-500/10 border border-blue-500/20">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    <strong>Best Practice:</strong> This field requires the /search endpoint. The system will query records using filters like <code className="px-1 py-0.5 rounded bg-blue-500/20">{selectedField}='value'</code>
                  </p>
                </div>
              )}

              {selectedFieldInfo.recommendation === 'entity' && (
                <div className="mt-2 p-2 rounded bg-green-500/10 border border-green-500/20">
                  <p className="text-xs text-green-700 dark:text-green-300">
                    <strong>Best Practice:</strong> This field uses the /entity endpoint for direct record retrieval by ID. Lookups will be fast and precise.
                  </p>
                </div>
              )}

              {selectedFieldInfo.recommendation === 'both' && (
                <div className="mt-2 p-2 rounded bg-purple-500/10 border border-purple-500/20">
                  <p className="text-xs text-purple-700 dark:text-purple-300">
                    <strong>Flexible:</strong> This field supports both endpoints. The system will use the most appropriate method based on the value format.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
