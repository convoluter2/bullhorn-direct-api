import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Plus, Trash, X, GitBranch, FunnelSimple } from '@phosphor-icons/react'
import { cn, formatFieldLabel, formatFieldLabelWithType } from '@/lib/utils'
import type { EntityField } from '@/hooks/use-entity-metadata'

export type ConditionalRule = {
  id: string
  field: string
  operator: 'equals' | 'notEquals' | 'contains' | 'notContains' | 'greaterThan' | 'lessThan' | 'isEmpty' | 'isNotEmpty' | 'in' | 'notIn'
  value: string
}

export type ConditionalAssociation = {
  id: string
  enabled: boolean
  conditions: ConditionalRule[]
  conditionLogic: 'AND' | 'OR'
  associationField: string
  operation: 'add' | 'remove' | 'replace'
  ids: number[]
  description?: string
}

type ConditionalAssociationBuilderProps = {
  fields: EntityField[]
  value: ConditionalAssociation[]
  onChange: (value: ConditionalAssociation[]) => void
  disabled?: boolean
  className?: string
}

export function ConditionalAssociationBuilder({
  fields,
  value,
  onChange,
  disabled,
  className
}: ConditionalAssociationBuilderProps) {
  const [associations, setAssociations] = useState<ConditionalAssociation[]>(value)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    setAssociations(value)
  }, [value])

  const updateAndNotify = (newAssociations: ConditionalAssociation[]) => {
    setAssociations(newAssociations)
    onChange(newAssociations)
  }

  const toManyFields = fields.filter(f => f.dataType === 'TO_MANY')

  const addAssociation = () => {
    const newAssociation: ConditionalAssociation = {
      id: `cond-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      enabled: true,
      conditions: [{ id: `rule-${Date.now()}`, field: '', operator: 'equals', value: '' }],
      conditionLogic: 'AND',
      associationField: '',
      operation: 'add',
      ids: [],
      description: ''
    }
    updateAndNotify([...associations, newAssociation])
    setExpandedId(newAssociation.id)
  }

  const removeAssociation = (id: string) => {
    updateAndNotify(associations.filter(a => a.id !== id))
    if (expandedId === id) {
      setExpandedId(null)
    }
  }

  const updateAssociation = (id: string, updates: Partial<ConditionalAssociation>) => {
    updateAndNotify(associations.map(a => a.id === id ? { ...a, ...updates } : a))
  }

  const addCondition = (associationId: string) => {
    updateAndNotify(associations.map(a => {
      if (a.id === associationId) {
        return {
          ...a,
          conditions: [...a.conditions, { 
            id: `rule-${Date.now()}-${Math.random().toString(36).substring(7)}`, 
            field: '', 
            operator: 'equals', 
            value: '' 
          }]
        }
      }
      return a
    }))
  }

  const removeCondition = (associationId: string, conditionId: string) => {
    updateAndNotify(associations.map(a => {
      if (a.id === associationId) {
        return {
          ...a,
          conditions: a.conditions.filter(c => c.id !== conditionId)
        }
      }
      return a
    }))
  }

  const updateCondition = (associationId: string, conditionId: string, updates: Partial<ConditionalRule>) => {
    updateAndNotify(associations.map(a => {
      if (a.id === associationId) {
        return {
          ...a,
          conditions: a.conditions.map(c => c.id === conditionId ? { ...c, ...updates } : c)
        }
      }
      return a
    }))
  }

  const addIdToAssociation = (associationId: string, idInput: string) => {
    const parsedIds = idInput
      .split(/[,\s]+/)
      .map(id => parseInt(id.trim(), 10))
      .filter(id => !isNaN(id))

    if (parsedIds.length > 0) {
      updateAndNotify(associations.map(a => {
        if (a.id === associationId) {
          const existingIds = a.ids
          const newIds = parsedIds.filter(id => !existingIds.includes(id))
          return { ...a, ids: [...existingIds, ...newIds] }
        }
        return a
      }))
    }
  }

  const removeIdFromAssociation = (associationId: string, id: number) => {
    updateAndNotify(associations.map(a => {
      if (a.id === associationId) {
        return { ...a, ids: a.ids.filter(existingId => existingId !== id) }
      }
      return a
    }))
  }

  const getOperatorLabel = (operator: string) => {
    const labels: Record<string, string> = {
      equals: 'Equals',
      notEquals: 'Not Equals',
      contains: 'Contains',
      notContains: 'Not Contains',
      greaterThan: 'Greater Than',
      lessThan: 'Less Than',
      isEmpty: 'Is Empty',
      isNotEmpty: 'Is Not Empty',
      in: 'In List',
      notIn: 'Not In List'
    }
    return labels[operator] || operator
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <GitBranch className="text-accent" size={20} />
            Conditional Associations
          </h3>
          <p className="text-sm text-muted-foreground">
            Apply different associations based on field values
          </p>
        </div>
        <Button onClick={addAssociation} disabled={disabled || toManyFields.length === 0} size="sm">
          <Plus />
          Add Rule
        </Button>
      </div>

      {toManyFields.length === 0 && (
        <Card className="border-muted">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              No to-many association fields available for this entity
            </p>
          </CardContent>
        </Card>
      )}

      {associations.length === 0 && toManyFields.length > 0 && (
        <Card className="border-muted">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              No conditional associations defined. Click "Add Rule" to create one.
            </p>
          </CardContent>
        </Card>
      )}

      <ScrollArea className="h-[600px] pr-4">
        <div className="space-y-3">
          {associations.map((association, idx) => (
            <Card key={association.id} className={cn(
              "border-2 transition-colors",
              association.enabled ? "border-accent/50" : "border-muted"
            )}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={association.enabled ? "default" : "secondary"}>
                        Rule {idx + 1}
                      </Badge>
                      <Switch
                        checked={association.enabled}
                        onCheckedChange={(checked) => updateAssociation(association.id, { enabled: checked })}
                        disabled={disabled}
                      />
                      <span className="text-xs text-muted-foreground">
                        {association.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <Input
                      placeholder="Rule description (optional)"
                      value={association.description || ''}
                      onChange={(e) => updateAssociation(association.id, { description: e.target.value })}
                      disabled={disabled}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedId(expandedId === association.id ? null : association.id)}
                    >
                      {expandedId === association.id ? 'Collapse' : 'Expand'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAssociation(association.id)}
                      disabled={disabled}
                    >
                      <Trash className="text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {expandedId === association.id && (
                <CardContent className="space-y-4">
                  <Separator />
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <FunnelSimple className="text-accent" size={16} />
                      <Label className="text-sm font-semibold">Conditions</Label>
                      <Badge variant="outline" className="text-xs">
                        {association.conditionLogic}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      {association.conditions.map((condition, condIdx) => (
                        <div key={condition.id}>
                          {condIdx > 0 && (
                            <div className="flex items-center gap-2 my-2">
                              <Separator className="flex-1" />
                              <Select
                                value={association.conditionLogic}
                                onValueChange={(val: 'AND' | 'OR') => updateAssociation(association.id, { conditionLogic: val })}
                                disabled={disabled}
                              >
                                <SelectTrigger className="w-24 h-7">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="AND">AND</SelectItem>
                                  <SelectItem value="OR">OR</SelectItem>
                                </SelectContent>
                              </Select>
                              <Separator className="flex-1" />
                            </div>
                          )}
                          
                          <div className="grid grid-cols-12 gap-2 items-start">
                            <div className="col-span-4">
                              <Select
                                value={condition.field}
                                onValueChange={(val) => updateCondition(association.id, condition.id, { field: val })}
                                disabled={disabled}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select field" />
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
                                  {[...fields].filter(f => f.dataType !== 'TO_MANY').sort((a, b) => {
                                    const labelA = (a.label || a.name).toLowerCase()
                                    const labelB = (b.label || b.name).toLowerCase()
                                    return labelA.localeCompare(labelB)
                                  }).map(field => (
                                    <SelectItem key={field.name} value={field.name}>
                                      {formatFieldLabelWithType(field.label, field.name, field.type, field.dataType)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="col-span-3">
                              <Select
                                value={condition.operator}
                                onValueChange={(val) => updateCondition(association.id, condition.id, { operator: val as any })}
                                disabled={disabled}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="equals">Equals</SelectItem>
                                  <SelectItem value="notEquals">Not Equals</SelectItem>
                                  <SelectItem value="contains">Contains</SelectItem>
                                  <SelectItem value="notContains">Not Contains</SelectItem>
                                  <SelectItem value="greaterThan">Greater Than</SelectItem>
                                  <SelectItem value="lessThan">Less Than</SelectItem>
                                  <SelectItem value="isEmpty">Is Empty</SelectItem>
                                  <SelectItem value="isNotEmpty">Is Not Empty</SelectItem>
                                  <SelectItem value="in">In List</SelectItem>
                                  <SelectItem value="notIn">Not In List</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="col-span-4">
                              {!['isEmpty', 'isNotEmpty'].includes(condition.operator) && (
                                <Input
                                  value={condition.value}
                                  onChange={(e) => updateCondition(association.id, condition.id, { value: e.target.value })}
                                  placeholder={['in', 'notIn'].includes(condition.operator) ? 'Comma separated' : 'Value'}
                                  disabled={disabled}
                                />
                              )}
                            </div>

                            <div className="col-span-1 flex justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeCondition(association.id, condition.id)}
                                disabled={disabled || association.conditions.length <= 1}
                              >
                                <X size={16} />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addCondition(association.id)}
                      disabled={disabled}
                      className="w-full"
                    >
                      <Plus size={14} />
                      Add Condition
                    </Button>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Association Action</Label>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Field</Label>
                        <Select
                          value={association.associationField}
                          onValueChange={(val) => updateAssociation(association.id, { associationField: val })}
                          disabled={disabled}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select association field" />
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
                            {[...toManyFields].sort((a, b) => {
                              const labelA = (a.label || a.name).toLowerCase()
                              const labelB = (b.label || b.name).toLowerCase()
                              return labelA.localeCompare(labelB)
                            }).map(field => (
                              <SelectItem key={field.name} value={field.name}>
                                {formatFieldLabel(field.label, field.name)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Operation</Label>
                        <Select
                          value={association.operation}
                          onValueChange={(val: 'add' | 'remove' | 'replace') => updateAssociation(association.id, { operation: val })}
                          disabled={disabled}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="add">Add</SelectItem>
                            <SelectItem value="remove">Remove</SelectItem>
                            <SelectItem value="replace">Replace</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">IDs to {association.operation}</Label>
                      <div className="flex gap-2">
                        <Input
                          id={`id-input-${association.id}`}
                          placeholder="Enter IDs (comma or space separated)"
                          disabled={disabled}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              const input = e.currentTarget as HTMLInputElement
                              addIdToAssociation(association.id, input.value)
                              input.value = ''
                            }
                          }}
                        />
                        <Button
                          onClick={() => {
                            const input = document.getElementById(`id-input-${association.id}`) as HTMLInputElement
                            if (input && input.value) {
                              addIdToAssociation(association.id, input.value)
                              input.value = ''
                            }
                          }}
                          disabled={disabled}
                          size="sm"
                        >
                          <Plus />
                        </Button>
                      </div>

                      {association.ids.length > 0 && (
                        <div className="flex flex-wrap gap-1 p-2 border rounded-md bg-muted/30 max-h-32 overflow-auto">
                          {association.ids.map((id) => (
                            <Badge
                              key={id}
                              variant="secondary"
                              className="gap-1 pr-1"
                            >
                              {id}
                              <button
                                onClick={() => removeIdFromAssociation(association.id, id)}
                                disabled={disabled}
                                className="ml-1 rounded-sm hover:bg-accent hover:text-accent-foreground"
                              >
                                <X size={12} />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <Card className="bg-muted/30 border-muted">
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">
                        <strong>Rule Summary:</strong> When {association.conditions.length} condition(s) match using {association.conditionLogic} logic, 
                        {association.operation === 'add' && ' add'}
                        {association.operation === 'remove' && ' remove'}
                        {association.operation === 'replace' && ' replace all'} 
                        {' '}{association.ids.length} ID(s) {association.operation === 'replace' ? 'in' : 'to/from'} {association.associationField || 'selected field'}
                      </p>
                    </CardContent>
                  </Card>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
