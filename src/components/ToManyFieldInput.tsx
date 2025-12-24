import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Trash, X } from '@phosphor-icons/react'
import { cn, formatFieldLabel } from '@/lib/utils'
import type { EntityField } from '@/hooks/use-entity-metadata'
import { useEntityMetadata } from '@/hooks/use-entity-metadata'

interface ToManyFieldInputProps {
  field: EntityField | null
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
}

type ToManyOperation = 'add' | 'remove' | 'replace'

interface ToManyValue {
  operation: ToManyOperation
  ids: number[]
  subField?: string
}

export function ToManyFieldInput({
  field,
  value,
  onChange,
  disabled,
  className
}: ToManyFieldInputProps) {
  const [operation, setOperation] = useState<ToManyOperation>('add')
  const [ids, setIds] = useState<number[]>([])
  const [inputValue, setInputValue] = useState('')
  const [subField, setSubField] = useState<string>('id')

  const associatedEntity = field?.associatedEntity?.entity
  const { metadata: subEntityMetadata, loading: subEntityLoading } = useEntityMetadata(associatedEntity)

  useEffect(() => {
    if (value) {
      try {
        const parsed = JSON.parse(value) as ToManyValue
        setOperation(parsed.operation || 'add')
        setIds(parsed.ids || [])
        setSubField(parsed.subField || 'id')
      } catch {
        const idMatches = value.match(/\d+/g)
        if (idMatches) {
          setIds(idMatches.map(id => parseInt(id, 10)))
        }
      }
    }
  }, [value])

  const updateParent = (newOperation: ToManyOperation, newIds: number[], newSubField: string) => {
    const toManyValue: ToManyValue = {
      operation: newOperation,
      ids: newIds,
      subField: newSubField
    }
    onChange(JSON.stringify(toManyValue))
  }

  const handleAddId = () => {
    const parsedIds = inputValue
      .split(/[,\s]+/)
      .map(id => parseInt(id.trim(), 10))
      .filter(id => !isNaN(id) && !ids.includes(id))

    if (parsedIds.length > 0) {
      const newIds = [...ids, ...parsedIds]
      setIds(newIds)
      updateParent(operation, newIds, subField)
      setInputValue('')
    }
  }

  const handleRemoveId = (id: number) => {
    const newIds = ids.filter(existingId => existingId !== id)
    setIds(newIds)
    updateParent(operation, newIds, subField)
  }

  const handleOperationChange = (newOperation: ToManyOperation) => {
    setOperation(newOperation)
    updateParent(newOperation, ids, subField)
  }

  const handleSubFieldChange = (newSubField: string) => {
    setSubField(newSubField)
    updateParent(operation, ids, newSubField)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddId()
    }
  }

  return (
    <Card className={cn("p-4 space-y-4 border-2", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Label className="text-base font-bold">To-Many Association Configuration</Label>
          <p className="text-xs text-muted-foreground">
            Configure how to update this to-many field {field?.associatedEntity?.entity ? `(associates with ${field.associatedEntity.entity})` : ''}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="font-semibold">Operation Type</Label>
        <Select value={operation} onValueChange={handleOperationChange} disabled={disabled}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="add">
              <div className="space-y-1">
                <div className="font-semibold">➕ Add</div>
                <div className="text-xs text-muted-foreground">Add associations while keeping existing ones</div>
              </div>
            </SelectItem>
            <SelectItem value="remove">
              <div className="space-y-1">
                <div className="font-semibold">➖ Remove</div>
                <div className="text-xs text-muted-foreground">Remove specific associations only</div>
              </div>
            </SelectItem>
            <SelectItem value="replace">
              <div className="space-y-1">
                <div className="font-semibold">🔄 Replace</div>
                <div className="text-xs text-muted-foreground">Replace all associations with new ones</div>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {associatedEntity && subEntityMetadata && (
        <div className="space-y-2">
          <Label className="font-semibold">
            Association Mode - Select Field from {associatedEntity}
            {subEntityLoading && <span className="text-xs text-muted-foreground ml-2">Loading...</span>}
          </Label>
          <Select value={subField} onValueChange={handleSubFieldChange} disabled={disabled || subEntityLoading}>
            <SelectTrigger>
              <SelectValue placeholder="Select field..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="id">
                <div className="space-y-1">
                  <div className="font-semibold">id - Direct Association (Most Common)</div>
                  <div className="text-xs text-muted-foreground">Associate using {associatedEntity} record IDs</div>
                </div>
              </SelectItem>
              {subEntityMetadata.fields
                .filter(f => f.type !== 'TO_MANY')
                .map(f => (
                  <SelectItem key={f.name} value={f.name}>
                    <div className="space-y-1">
                      <div className="font-semibold">{formatFieldLabel(f.label, f.name)}</div>
                      <div className="text-xs text-muted-foreground">{f.type} field on {associatedEntity}</div>
                    </div>
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <div className="rounded-lg bg-accent/10 p-3 space-y-2 text-xs">
            {subField === 'id' ? (
              <>
                <p className="font-semibold text-accent-foreground">✓ Direct Association Mode</p>
                <p className="text-muted-foreground">
                  You'll provide {associatedEntity} record IDs. These records will be directly associated with the parent entity.
                </p>
                <p className="text-muted-foreground italic">
                  Example: For JobSubmission.job, provide JobOrder IDs like: 12345, 67890
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-accent-foreground">⚠ Sub-Field Mode (Advanced)</p>
                <p className="text-muted-foreground">
                  You'll provide values for the <span className="font-mono">{subField}</span> field. The system will use these to identify or create {associatedEntity} records.
                </p>
                <p className="text-muted-foreground italic">
                  Example: If you select "name" and provide "Software Engineer", the system will find/create a {associatedEntity} with name="Software Engineer"
                </p>
              </>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label className="font-semibold">
          {subField === 'id' ? `${associatedEntity} IDs` : `Values for "${subField}" Field`}
        </Label>
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={subField === 'id' ? "e.g., 12345, 67890, 11111" : `e.g., value1, value2, value3`}
            disabled={disabled}
            className="font-mono"
          />
          <Button
            onClick={handleAddId}
            disabled={disabled || !inputValue.trim()}
            size="sm"
          >
            <Plus />
            Add
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {subField === 'id' 
            ? `Enter ${associatedEntity} record IDs separated by commas or spaces (e.g., "123, 456, 789")`
            : `Enter values for the ${subField} field separated by commas or spaces`
          }
        </p>
      </div>

      {ids.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="font-semibold">
              {ids.length} {subField === 'id' ? `${associatedEntity} Record(s)` : `Value(s)`} Selected
            </Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIds([])}
              disabled={disabled}
            >
              <X />
              Clear all
            </Button>
          </div>
          <ScrollArea className="h-32 rounded border p-2 bg-muted/30">
            <div className="flex flex-wrap gap-2">
              {ids.map((id) => (
                <Badge
                  key={id}
                  variant="secondary"
                  className="gap-1 pr-1 font-mono"
                >
                  {subField === 'id' ? `ID: ${id}` : id}
                  <button
                    onClick={() => handleRemoveId(id)}
                    disabled={disabled}
                    className="ml-1 rounded-sm hover:bg-accent hover:text-accent-foreground"
                  >
                    <X size={12} />
                  </button>
                </Badge>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-xs text-muted-foreground border border-border">
        <p className="font-semibold text-foreground">📋 Operation Summary:</p>
        {operation === 'add' && (
          <>
            <p>• <span className="font-semibold">Add Operation:</span> {subField === 'id' ? `Associate ${ids.length} existing ${associatedEntity} record(s)` : `Create and associate ${ids.length} new ${associatedEntity} record(s)`}</p>
            <p>• Existing {field?.name || 'associations'} will be preserved</p>
            {subField !== 'id' && (
              <p className="text-xs italic mt-1 text-accent-foreground">⚠ New {associatedEntity} records will be created with <span className="font-mono">{subField}</span> set to the provided values</p>
            )}
          </>
        )}
        {operation === 'remove' && (
          <>
            <p>• <span className="font-semibold">Remove Operation:</span> {subField === 'id' ? `Disassociate ${ids.length} ${associatedEntity} record(s) by ID` : `Find and remove records where ${subField} matches these values`}</p>
            <p>• Other {field?.name || 'associations'} will remain unchanged</p>
          </>
        )}
        {operation === 'replace' && (
          <>
            <p>• <span className="font-semibold text-destructive">Replace Operation (Destructive):</span> All existing {field?.name || 'associations'} will be removed first</p>
            <p>• {subField === 'id' ? `Then associate these ${ids.length} ${associatedEntity} record(s)` : `Then create ${ids.length} new ${associatedEntity} record(s)`}</p>
            {subField !== 'id' && (
              <p className="text-xs italic mt-1 text-accent-foreground">⚠ All existing associations will be cleared, then new {associatedEntity} records will be created</p>
            )}
          </>
        )}
        {subField === 'id' && ids.length > 0 && (
          <p className="pt-2 border-t border-border mt-2 text-foreground">
            <span className="font-semibold">Will affect:</span> {associatedEntity} IDs: {ids.slice(0, 5).join(', ')}{ids.length > 5 ? ` and ${ids.length - 5} more` : ''}
          </p>
        )}
      </div>
    </Card>
  )
}
