import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Minus, ArrowsClockwise } from '@phosphor-icons/react'
import { formatFieldLabel } from '@/lib/utils'
import { useEntityMetadata } from '@/hooks/use-entity-metadata'

interface ToManyConfig {
  operation: 'add' | 'remove' | 'replace'
  subField: string
}

interface ToManyConfigSelectorProps {
  associatedEntity: string
  fieldLabel: string
  fieldName: string
  config: ToManyConfig
  onChange: (config: ToManyConfig) => void
}

export function ToManyConfigSelector({
  associatedEntity,
  fieldLabel,
  fieldName,
  config,
  onChange
}: ToManyConfigSelectorProps) {
  const { metadata: subEntityMetadata, loading: subEntityLoading } = useEntityMetadata(associatedEntity)

  const availableSubFields = subEntityMetadata?.fields.filter(
    f => f.dataType === 'String' || f.dataType === 'Integer'
  ) || []

  return (
    <div className="space-y-3 p-4 border border-border rounded-lg bg-card/50">
      <p className="text-sm font-medium">
        Configure To-Many: {formatFieldLabel(fieldLabel, fieldName)}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs">Operation</Label>
          <Select
            value={config.operation}
            onValueChange={(value: 'add' | 'remove' | 'replace') => 
              onChange({ ...config, operation: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="add">
                <div className="flex items-center gap-2">
                  <Plus size={14} />
                  <span>Add (keep existing)</span>
                </div>
              </SelectItem>
              <SelectItem value="remove">
                <div className="flex items-center gap-2">
                  <Minus size={14} />
                  <span>Remove (keep others)</span>
                </div>
              </SelectItem>
              <SelectItem value="replace">
                <div className="flex items-center gap-2">
                  <ArrowsClockwise size={14} />
                  <span>Replace (clear all)</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Match Field</Label>
          <Select
            value={config.subField}
            onValueChange={(value) => onChange({ ...config, subField: value })}
            disabled={subEntityLoading}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="id">
                <div className="space-y-0.5">
                  <div>ID</div>
                  <div className="text-[10px] text-muted-foreground">
                    Match by entity ID
                  </div>
                </div>
              </SelectItem>
              {!subEntityLoading && availableSubFields.map((field) => (
                <SelectItem key={field.name} value={field.name}>
                  <div className="space-y-0.5">
                    <div>{formatFieldLabel(field.label, field.name)}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {field.type}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="text-xs text-muted-foreground space-y-1">
        <p className="font-medium">
          {config.operation === 'add' && '➕ CSV values will be added to existing associations'}
          {config.operation === 'remove' && '➖ Only specified CSV values will be removed'}
          {config.operation === 'replace' && '⚠ All existing associations will be replaced'}
        </p>
        {config.subField && (
          <p className="text-[10px]">
            💡 CSV values will be matched using the <code className="font-mono">{config.subField}</code> field
          </p>
        )}
      </div>
    </div>
  )
}
