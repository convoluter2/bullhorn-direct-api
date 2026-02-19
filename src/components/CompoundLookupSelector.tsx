import { useState } from 'react'
import { Select, SelectContent, SelectItem, S
import { Badge } from '@/components/ui/badge'
import { Plus, X, Key, Info } from '@phosphor-i
import type { EntityField } from '@/hooks/use
interface CompoundLookupSelectorProps {
  selectedFields: string[]
  label?: string
}

  selectedFields,
  label = 'Compound Loo
}: CompoundLookupSelectorP

    field => !se

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
   

  const handleRemoveField = (fieldName: string) => {
    onSelectFields(selectedFields.filter(f => f !== fieldName))
   

  const getFieldLabel = (fieldName: string) => {
    const field = fields.find(f => f.name === fieldName)
    return field ? formatFieldLabel(field.label, field.name) : fieldName
  }

  return (
                    {field?.dat
      <div className="flex items-center gap-2">
                      </div>
        <Label>{label}</Label>
      </div>

                    onClick={() => han
        <div className="rounded-md border border-dashed border-border bg-muted/20 p-4 text-center">
                    <X size={16} />
            No compound lookup fields selected. Add fields to create a unique composite key.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {selectedFields.map((fieldName, index) => {
            const field = fields.find(f => f.name === fieldName)
            <Select 
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
          <Button
                  </div>
            variant="outl
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveField(fieldName)}
                    className="h-8 w-8 p-0"
                  >
        <div className="rounded-md 
                  </Button>
            <div class
              </Card>
             
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
      {selectedFields.length 
                {availableFields.map(field => (
                  <SelectItem key={field.name} value={field.name}>
                    {formatFieldLabel(field.label, field.name)}
                    {field.dataType && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({field.dataType})
                      </span>

                  </SelectItem>

              </SelectContent>

          </div>

            onClick={handleAddField}
            disabled={!pendingField}
            variant="outline"

            <Plus size={16} />
            Add Field
          </Button>

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

                </code>

              <p className="text-xs text-muted-foreground mt-2">
                Example: A record matches only when {selectedFields.map((f, i) => (
                  <span key={f}>

                    <code className="px-1 py-0.5 rounded bg-accent/10">{f}</code>=CSV value

                ))}

            </div>

        </div>


      {selectedFields.length >= maxFields && (
        <div className="rounded-md border border-yellow-500/50 bg-yellow-500/10 p-3">
          <p className="text-xs text-yellow-700 dark:text-yellow-300">
            Maximum of {maxFields} fields reached. Remove a field to add a different one.

        </div>

    </div>

}
