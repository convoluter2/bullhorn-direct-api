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

  useEffect(() => {
    if (value) {
      try {
        const parsed = JSON.parse(value) as ToManyValue
        setOperation(parsed.operation || 'add')
        setIds(parsed.ids || [])
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
      ids
    }
    onChange(JSON.stringify(toManyValue))
  }, [operation, ids, onChange])

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

      <div className="space-y-2">
        <Label>Association IDs</Label>
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter IDs (comma or space separated)"
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
          Enter one or more IDs separated by commas or spaces
        </p>
      </div>

      {ids.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>{ids.length} ID(s) selected</Label>
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
          <p>• IDs will be added to existing {field?.name || 'associations'}. Existing associations remain unchanged.</p>
        )}
        {operation === 'remove' && (
          <p>• IDs will be removed from {field?.name || 'associations'}. Other associations remain unchanged.</p>
        )}
        {operation === 'replace' && (
          <p>• All existing {field?.name || 'associations'} will be removed and replaced with these IDs only.</p>
        )}
      </div>
    </Card>
  )
}
