import { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Plus, Trash, ArrowsClockwise } from '@phosphor-icons/react'
import { useEntityMetadata } from '@/hooks/use-entity-metadata'
import { formatFieldLabel } from '@/lib/utils'
import type { EntityField } from '@/hooks/use-entity-metadata'

interface ToManyConfig {
  operation: 'add' | 'remove' | 'replace'
  subField: string
}

interface ToManyConfigSelectorProps {
  fieldName: string
  fieldLabel: string
  associatedEntity?: string
  config: ToManyConfig
  onChange: (config: ToManyConfig) => void
}

export function ToManyConfigSelector({ 
  fieldName,
  fieldLabel, 
  associatedEntity, 
  config, 
  onChange 
}: ToManyConfigSelectorProps) {
  const { metadata: subEntityMetadata, loading: subEntityLoading } = useEntityMetadata(associatedEntity)
  const [isOpen, setIsOpen] = useState(false)
  
  const availableSubFields = subEntityMetadata?.fields.filter(f => f.type !== 'TO_MANY') || []

  return (
    <div className="pl-4 border-l-2 border-accent/30 space-y-3 pt-2">
      <Label className="text-xs font-semibold">To-Many Configuration</Label>
      <p className="text-xs text-muted-foreground">
        Configure how to update the {fieldLabel} association.
        CSV value should be comma-separated values (e.g., "123, 456, 789").
      </p>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Operation</Label>
          <Select
            value={config.operation}
            onValueChange={(value: 'add' | 'remove' | 'replace') => {
              onChange({ ...config, operation: value })
            }}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="add">
                <div className="flex items-center gap-2">
                  <Plus size={12} />
                  <span>Add (keep existing)</span>
                </div>
              </SelectItem>
              <SelectItem value="remove">
                <div className="flex items-center gap-2">
                  <Trash size={12} />
                  <span>Remove (only these)</span>
                </div>
              </SelectItem>
              <SelectItem value="replace">
                <div className="flex items-center gap-2">
                  <ArrowsClockwise size={12} />
                  <span>Replace (clear all first)</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-1.5">
          <Label className="text-xs">Value Type</Label>
          <Select
            value={config.subField}
            onValueChange={(value: string) => {
              onChange({ ...config, subField: value })
            }}
            open={isOpen}
            onOpenChange={setIsOpen}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="id">
                <div className="space-y-0.5">
                  <div className="font-semibold text-xs">ID (Direct)</div>
                  <div className="text-[10px] text-muted-foreground">
                    Use {associatedEntity || 'entity'} record IDs
                  </div>
                </div>
              </SelectItem>
              {subEntityLoading && isOpen && (
                <SelectItem value="loading" disabled>Loading fields...</SelectItem>
              )}
              {!subEntityLoading && availableSubFields.length > 0 && availableSubFields.map(field => (
                <SelectItem key={field.name} value={field.name}>
                  <div className="space-y-0.5">
                    <div className="font-semibold text-xs">{formatFieldLabel(field.label, field.name)}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {field.type} field on {associatedEntity}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="rounded-md bg-muted/50 p-2.5 text-xs">
        <p className="font-semibold mb-1">
          {config.operation === 'add' && '➕ Add Operation'}
          {config.operation === 'remove' && '➖ Remove Operation'}
          {config.operation === 'replace' && '🔄 Replace Operation'}
        </p>
        <p className="text-muted-foreground">
          {config.operation === 'add' && 'New associations will be added while keeping existing ones'}
          {config.operation === 'remove' && 'Only the specified associations will be removed'}
          {config.operation === 'replace' && '⚠ All existing associations will be cleared and replaced'}
        </p>
        {config.subField !== 'id' && (
          <p className="text-muted-foreground mt-1 pt-1 border-t border-border">
            💡 CSV values will be used to lookup/create {associatedEntity} records by their <span className="font-mono font-semibold">{config.subField}</span> field
          </p>
        )}
      </div>
    </div>
  )
}
