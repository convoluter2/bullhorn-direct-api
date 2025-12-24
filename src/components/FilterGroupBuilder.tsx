import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash, Unite, Intersect } from '@phosphor-icons/react'
import { ValidatedFieldInput } from '@/components/ValidatedFieldInput'
import type { FilterGroup, QueryFilter } from '@/lib/types'
import type { EntityField } from '@/hooks/use-entity-metadata'
import { useKV } from '@github/spark/hooks'
import { getValidatedOperators, ALL_OPERATORS } from '@/lib/validated-operators'

interface FilterGroupBuilderProps {
  groups: FilterGroup[]
  onGroupsChange: (groups: FilterGroup[]) => void
  groupLogic: 'AND' | 'OR'
  onGroupLogicChange: (logic: 'AND' | 'OR') => void
  availableFields: EntityField[]
  fieldsMap: Record<string, EntityField>
}

export function FilterGroupBuilder({
  groups,
  onGroupsChange,
  groupLogic,
  onGroupLogicChange,
  availableFields,
  fieldsMap
}: FilterGroupBuilderProps) {
  const [validatedOperatorsList] = useKV<string[]>('validated-operators', [])
  
  const operatorsToShow = validatedOperatorsList && validatedOperatorsList.length > 0
    ? getValidatedOperators(validatedOperatorsList)
    : ALL_OPERATORS

  const addGroup = () => {
    const newGroup: FilterGroup = {
      id: `group-${Date.now()}`,
      logic: 'AND',
      filters: []
    }
    onGroupsChange([...groups, newGroup])
  }

  const removeGroup = (groupId: string) => {
    onGroupsChange(groups.filter(g => g.id !== groupId))
  }

  const updateGroupLogic = (groupId: string, logic: 'AND' | 'OR') => {
    onGroupsChange(
      groups.map(g => g.id === groupId ? { ...g, logic } : g)
    )
  }

  const addFilterToGroup = (groupId: string) => {
    onGroupsChange(
      groups.map(g => 
        g.id === groupId 
          ? { ...g, filters: [...g.filters, { field: '', operator: 'equals', value: '' }] }
          : g
      )
    )
  }

  const removeFilterFromGroup = (groupId: string, filterIndex: number) => {
    onGroupsChange(
      groups.map(g =>
        g.id === groupId
          ? { ...g, filters: g.filters.filter((_, i) => i !== filterIndex) }
          : g
      )
    )
  }

  const updateFilter = (groupId: string, filterIndex: number, key: keyof QueryFilter, value: string) => {
    onGroupsChange(
      groups.map(g =>
        g.id === groupId
          ? {
              ...g,
              filters: g.filters.map((f, i) =>
                i === filterIndex ? { ...f, [key]: value } : f
              )
            }
          : g
      )
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base">Filter Groups</Label>
        <div className="flex items-center gap-2">
          {groups.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Between groups:</span>
              <div className="flex border border-border rounded-md overflow-hidden">
                <Button
                  size="sm"
                  variant={groupLogic === 'AND' ? 'default' : 'ghost'}
                  onClick={() => onGroupLogicChange('AND')}
                  className="h-7 px-3 rounded-none"
                >
                  <Intersect size={14} weight="bold" />
                  AND
                </Button>
                <Button
                  size="sm"
                  variant={groupLogic === 'OR' ? 'default' : 'ghost'}
                  onClick={() => onGroupLogicChange('OR')}
                  className="h-7 px-3 rounded-none"
                >
                  <Unite size={14} weight="bold" />
                  OR
                </Button>
              </div>
            </div>
          )}
          <Button size="sm" variant="outline" onClick={addGroup}>
            <Plus size={16} />
            Add Group
          </Button>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-border rounded-lg">
          <p className="text-sm text-muted-foreground mb-3">No filter groups yet</p>
          <Button size="sm" variant="outline" onClick={addGroup}>
            <Plus size={16} />
            Create First Group
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group, groupIndex) => (
            <Card key={group.id} className="border-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-medium">
                      Group {groupIndex + 1}
                    </CardTitle>
                    {group.filters.length > 1 && (
                      <div className="flex border border-border rounded-md overflow-hidden">
                        <Button
                          size="sm"
                          variant={group.logic === 'AND' ? 'secondary' : 'ghost'}
                          onClick={() => updateGroupLogic(group.id, 'AND')}
                          className="h-6 px-2 text-xs rounded-none"
                        >
                          <Intersect size={12} />
                          AND
                        </Button>
                        <Button
                          size="sm"
                          variant={group.logic === 'OR' ? 'secondary' : 'ghost'}
                          onClick={() => updateGroupLogic(group.id, 'OR')}
                          className="h-6 px-2 text-xs rounded-none"
                        >
                          <Unite size={12} />
                          OR
                        </Button>
                      </div>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {group.filters.length} {group.filters.length === 1 ? 'filter' : 'filters'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => addFilterToGroup(group.id)}
                      className="h-7 px-2"
                    >
                      <Plus size={14} />
                      Add Filter
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeGroup(group.id)}
                      className="h-7 px-2 text-destructive"
                    >
                      <Trash size={14} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {group.filters.length === 0 ? (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    No filters in this group
                  </div>
                ) : (
                  group.filters.map((filter, filterIndex) => (
                    <div key={filterIndex} className="flex gap-2 items-end p-2 rounded-md bg-muted/30">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">Field</Label>
                        <Select 
                          value={filter.field || undefined} 
                          onValueChange={(v) => updateFilter(group.id, filterIndex, 'field', v)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select field" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableFields.map((field) => (
                              <SelectItem key={field.name} value={field.name}>
                                {field.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-32 space-y-1">
                        <Label className="text-xs">Operator</Label>
                        <Select 
                          value={filter.operator} 
                          onValueChange={(v) => updateFilter(group.id, filterIndex, 'operator', v)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {operatorsToShow.map(op => (
                              <SelectItem key={op.id} value={op.id}>
                                {op.symbol} {op.displayName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">Value</Label>
                        <ValidatedFieldInput
                          field={fieldsMap[filter.field] || null}
                          value={filter.value}
                          onChange={(v) => updateFilter(group.id, filterIndex, 'value', v)}
                          disabled={filter.operator === 'is_null' || filter.operator === 'is_not_null'}
                          placeholder={
                            operatorsToShow.find(op => op.id === filter.operator)?.placeholder || 'Value'
                          }
                        />
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeFilterFromGroup(group.id, filterIndex)}
                        className="text-destructive h-9 w-9"
                      >
                        <Trash size={16} />
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
