import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, X, Key, Info } from '@phosphor-icons/react'
import { formatFieldLabel, formatFieldLabelWithType } from '@/lib/utils'
import type { EntityField } from '@/hooks/use-entity-metadata'

interface CompoundLookupSelectorProps {
  fields: EntityField[]
  selectedFields: string[]
  onSelectFields: (fields: string[]) => void
  label?: string
  maxFields?: number
}

export function CompoundLookupSelector({
  fields,
  selectedFields,
  onSelectFields,
  label = 'Compound Lookup Fields',
  maxFields = 5
}: CompoundLookupSelectorProps) {
  const [pendingField, setPendingField] = useState<string>('')

  const availableFields = fields.filter(
    field => !selectedFields.includes(field.name) && field.name !== 'id'
  )

  const handleAddField = () => {
    if (pendingField && !selectedFields.includes(pendingField)) {
      onSelectFields([...selectedFields, pendingField])
      setPendingField('')
    }
  }

  const handleRemoveField = (fieldName: string) => {
    onSelectFields(selectedFields.filter(f => f !== fieldName))
  }

  const getFieldLabel = (fieldName: string) => {
    const field = fields.find(f => f.name === fieldName)
    return field ? formatFieldLabel(field.label, field.name) : fieldName
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Key size={18} className="text-accent" />
        <Label>{label}</Label>
      </div>

      {selectedFields.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-muted/20 p-4 text-center">
          <p className="text-sm text-muted-foreground">
            No compound lookup fields selected. Add fields to create a unique composite key.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {selectedFields.map((fieldName, index) => {
            const field = fields.find(f => f.name === fieldName)
            return (
              <Card key={fieldName} className="p-3">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="font-mono text-xs">
                    {index + 1}
                  </Badge>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{getFieldLabel(fieldName)}</div>
                    {field?.dataType && (
                      <div className="text-xs text-muted-foreground">
                        Type: {field.dataType}
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveField(fieldName)}
                    className="h-8 w-8 p-0"
                  >
                    <X size={16} />
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {selectedFields.length < maxFields && (
        <div className="flex gap-2">
          <div className="flex-1">
            <Select value={pendingField} onValueChange={setPendingField}>
              <SelectTrigger>
                <SelectValue placeholder="Select a field to add..." />
              </SelectTrigger>
              <SelectContent>
                {availableFields.map(field => (
                  <SelectItem key={field.name} value={field.name}>
                    {formatFieldLabelWithType(field.label, field.name, field.type, field.dataType)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleAddField}
            disabled={!pendingField}
            variant="outline"
          >
            <Plus size={16} />
            Add Field
          </Button>
        </div>
      )}

      {selectedFields.length > 0 && (
        <div className="rounded-md border bg-muted/30 p-3 space-y-2">
          <div className="flex items-start gap-2">
            <Info size={16} className="text-accent mt-0.5 flex-shrink-0" />
            <div className="space-y-1 text-sm">
              <div className="font-medium">Compound Lookup Behavior</div>
              <p className="text-xs text-muted-foreground">
                Records will be matched when <strong>all {selectedFields.length} fields</strong> match the CSV values.
                This creates a unique composite key using: <code className="px-1 py-0.5 rounded bg-accent/10 font-mono text-xs">
                  {selectedFields.join(' + ')}
                </code>
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Example: A record matches only when {selectedFields.map((f, i) => (
                  <span key={f}>
                    {i > 0 && <strong> AND </strong>}
                    <code className="px-1 py-0.5 rounded bg-accent/10">{f}</code>=CSV value
                  </span>
                ))}
              </p>
            </div>
          </div>
        </div>
      )}

      {selectedFields.length >= maxFields && (
        <div className="rounded-md border border-yellow-500/50 bg-yellow-500/10 p-3">
          <p className="text-xs text-yellow-700 dark:text-yellow-300">
            Maximum of {maxFields} fields reached. Remove a field to add a different one.
          </p>
        </div>
      )}
    </div>
  )
}
