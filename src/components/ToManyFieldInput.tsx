import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Trash, X } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
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
  }, [])

  useEffect(() => {
    const toManyValue: ToManyValue = {
      operation,
      ids,
      subField
    }
    const newValue = JSON.stringify(toManyValue)
    if (newValue !== value) {
      onChange(newValue)
    }
  }, [operation, ids, subField])

  const handleAddId = () => {
    const parsedIds = inputValue
      .split(/[,\s]+/)
      .map(id => parseInt(id.trim(), 10))
      .filter(id => !isNaN(id) && !ids.includes(id))

    if (parsedIds.length > 0) {
      setIds([...ids, ...parsedIds])
      setInputValue('')
    }
  }

  const handleRemoveId = (id: number) => {
    setIds(ids.filter(existingId => existingId !== id))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddId()
    }
  }

  return (
    <Card className={cn("p-4 space-y-4", className)}>
      <div className="space-y-2">
        <Label>To-Many Operation</Label>
        <Select value={operation} onValueChange={(val) => setOperation(val as ToManyOperation)} disabled={disabled}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="add">Add - Add these IDs to existing associations</SelectItem>
            <SelectItem value="remove">Remove - Remove these IDs from existing associations</SelectItem>
            <SelectItem value="replace">Replace - Replace all associations with these IDs</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {associatedEntity && subEntityMetadata && (
        <div className="space-y-2">
          <Label>
            Field to Set (from {associatedEntity})
            {subEntityLoading && <span className="text-xs text-muted-foreground ml-2">Loading...</span>}
          </Label>
          <Select value={subField} onValueChange={setSubField} disabled={disabled || subEntityLoading}>
            <SelectTrigger>
              <SelectValue placeholder="Select field..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="id">id (Use direct association IDs)</SelectItem>
              {subEntityMetadata.fields
                .filter(f => f.type !== 'TO_MANY')
                .map(f => (
                  <SelectItem key={f.name} value={f.name}>
                    {f.label} ({f.name}) - {f.type}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {subField === 'id' 
              ? `Direct association: Enter the IDs of ${associatedEntity} records to associate`
              : `Sub-field mode: The value will be used to set the ${subField} field when creating/updating the association`
            }
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label>{subField === 'id' ? 'Association IDs' : `Values for ${subField}`}</Label>
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={subField === 'id' ? "Enter IDs (comma or space separated)" : `Enter values for ${subField}`}
            disabled={disabled}
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
            ? 'Enter one or more IDs separated by commas or spaces'
            : `Enter values separated by commas or spaces - these will be used to set ${subField} on ${associatedEntity} records`
          }
        </p>
      </div>

      {ids.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>{ids.length} {subField === 'id' ? 'ID(s)' : 'value(s)'} selected</Label>
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
          <ScrollArea className="h-32 rounded border p-2">
            <div className="flex flex-wrap gap-2">
              {ids.map((id) => (
                <Badge
                  key={id}
                  variant="secondary"
                  className="gap-1 pr-1"
                >
                  {id}
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

      <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-xs text-muted-foreground">
        <p className="font-semibold">Operation Details:</p>
        {operation === 'add' && (
          <>
            <p>• {subField === 'id' ? 'IDs' : 'Values'} will be added to existing {field?.name || 'associations'}. Existing associations remain unchanged.</p>
            {subField !== 'id' && (
              <p className="text-xs italic mt-1">Note: For sub-field mode, new {associatedEntity} records will be created with the specified {subField} values and associated with the parent entity.</p>
            )}
          </>
        )}
        {operation === 'remove' && (
          <p>• {subField === 'id' ? 'IDs' : 'Records matching these values'} will be removed from {field?.name || 'associations'}. Other associations remain unchanged.</p>
        )}
        {operation === 'replace' && (
          <>
            <p>• All existing {field?.name || 'associations'} will be removed and replaced with these {subField === 'id' ? 'IDs' : 'values'} only.</p>
            {subField !== 'id' && (
              <p className="text-xs italic mt-1">Note: Existing associations will be removed and new {associatedEntity} records will be created.</p>
            )}
          </>
        )}
      </div>
    </Card>
  )
}
