import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Trash, X, MagnifyingGlass, CaretDown, Check } from '@phosphor-icons/react'
import { cn, formatFieldLabel } from '@/lib/utils'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { toast } from 'sonner'
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
  ids: (number | string)[]
  subField?: string
}

interface LookupRecord {
  id: number
  title: string
  name?: string
  firstName?: string
  lastName?: string
  email?: string
}

export function ToManyFieldInput({
  field,
  value,
  onChange,
  disabled,
  className
}: ToManyFieldInputProps) {
  const [operation, setOperation] = useState<ToManyOperation>('add')
  const [ids, setIds] = useState<(number | string)[]>([])
  const [inputValue, setInputValue] = useState('')
  const [subField, setSubField] = useState<string>('id')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [availableRecords, setAvailableRecords] = useState<LookupRecord[]>([])
  const [loadingRecords, setLoadingRecords] = useState(false)
  const [showMultiSelect, setShowMultiSelect] = useState(false)

  const associatedEntity = field?.associatedEntity?.entity
  const { metadata: subEntityMetadata, loading: subEntityLoading } = useEntityMetadata(associatedEntity)

  console.log('🎯 ToManyFieldInput - Render:', {
    fieldName: field?.name,
    fieldType: field?.type,
    associatedEntity,
    hasMetadata: !!subEntityMetadata,
    metadataLoading: subEntityLoading,
    currentValue: value,
    currentOperation: operation,
    currentIds: ids,
    currentSubField: subField
  })

  useEffect(() => {
    console.log('🔄 ToManyFieldInput - Value changed:', value)
    if (value) {
      try {
        const parsed = JSON.parse(value) as ToManyValue
        console.log('✅ ToManyFieldInput - Parsed value successfully:', parsed)
        setOperation(parsed.operation || 'add')
        setIds(parsed.ids || [])
        setSubField(parsed.subField || 'id')
      } catch (error) {
        console.warn('⚠️ ToManyFieldInput - Failed to parse JSON, trying regex:', error)
        const idMatches = value.match(/\d+/g)
        if (idMatches) {
          const extractedIds = idMatches.map(id => parseInt(id, 10))
          console.log('📋 ToManyFieldInput - Extracted IDs via regex:', extractedIds)
          setIds(extractedIds)
        }
      }
    }
  }, [value])

  const updateParent = (newOperation: ToManyOperation, newIds: (number | string)[], newSubField: string) => {
    const toManyValue: ToManyValue = {
      operation: newOperation,
      ids: newIds,
      subField: newSubField
    }
    const jsonValue = JSON.stringify(toManyValue)
    console.log('📤 ToManyFieldInput - Updating parent with:', toManyValue, 'JSON:', jsonValue)
    onChange(jsonValue)
  }

  const handleAddId = () => {
    if (subField === 'id') {
      const parsedIds = inputValue
        .split(',')
        .map(id => parseInt(id.trim(), 10))
        .filter(id => !isNaN(id) && !ids.includes(id))

      if (parsedIds.length > 0) {
        const newIds = [...ids, ...parsedIds]
        setIds(newIds)
        updateParent(operation, newIds, subField)
        setInputValue('')
      }
    } else {
      const values = inputValue
        .split(',')
        .map(v => v.trim())
        .filter(v => v && !ids.includes(v))

      if (values.length > 0) {
        const newIds = [...ids, ...values]
        setIds(newIds)
        updateParent(operation, newIds, subField)
        setInputValue('')
      }
    }
  }

  const handleRemoveId = (id: number | string) => {
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
    setIds([])
    updateParent(operation, [], newSubField)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddId()
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim() || !associatedEntity) {
      return
    }

    setSearching(true)
    setShowSearchResults(true)

    try {
      const searchFields = ['id', 'name', 'title', 'firstName', 'lastName', 'email']
      const fields = searchFields.join(',')
      
      const searchTerm = searchQuery.trim()
      const where = `(name='*${searchTerm}*' OR title='*${searchTerm}*' OR firstName='*${searchTerm}*' OR lastName='*${searchTerm}*' OR email='*${searchTerm}*')`
      
      console.log('🔍 ToManyFieldInput - Search query:', {
        associatedEntity,
        searchTerm,
        where,
        fields
      })
      
      const response = await bullhornAPI.query(associatedEntity, fields, where, 'id', 20, 0)
      
      console.log('🔍 ToManyFieldInput - Search results:', {
        totalCount: response?.total,
        dataCount: response?.data?.length,
        data: response?.data
      })
      
      if (response?.data) {
        setSearchResults(response.data)
        if (response.data.length === 0) {
          toast.info(`No ${associatedEntity} records found matching "${searchQuery}"`)
        } else {
          toast.success(`Found ${response.data.length} ${associatedEntity} record(s)`)
        }
      } else {
        setSearchResults([])
      }
    } catch (error) {
      console.error('Search failed:', error)
      toast.error(`Failed to search ${associatedEntity} records`)
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const handleAddFromSearch = (record: any) => {
    if (record.id && !ids.includes(record.id)) {
      const newIds = [...ids, record.id]
      setIds(newIds)
      updateParent(operation, newIds, subField)
      toast.success(`Added ${getRecordTitle(record)}`)
    }
  }

  const getRecordTitle = (record: any): string => {
    if (record.title) return record.title
    if (record.name) return record.name
    if (record.firstName && record.lastName) return `${record.firstName} ${record.lastName}`
    if (record.firstName) return record.firstName
    if (record.lastName) return record.lastName
    if (record.email) return record.email
    return `ID: ${record.id}`
  }

  const loadAvailableRecords = async () => {
    if (!associatedEntity || subField !== 'id') {
      return
    }

    setLoadingRecords(true)
    try {
      const searchFields = ['id', 'name', 'title', 'firstName', 'lastName', 'email']
      const fields = searchFields.join(',')
      
      console.log('📋 ToManyFieldInput - Loading records for:', {
        associatedEntity,
        fields,
        limit: 500
      })
      
      const response = await bullhornAPI.query(associatedEntity, fields, '', 'id', 500, 0)
      
      console.log('📋 ToManyFieldInput - Load response:', {
        totalCount: response?.total,
        dataCount: response?.data?.length
      })
      
      if (response?.data) {
        const records: LookupRecord[] = response.data.map((r: any) => ({
          id: r.id,
          title: getRecordTitle(r),
          name: r.name,
          firstName: r.firstName,
          lastName: r.lastName,
          email: r.email
        }))
        setAvailableRecords(records)
        toast.success(`Loaded ${records.length} ${associatedEntity} records`)
      } else {
        setAvailableRecords([])
      }
    } catch (error) {
      console.error('❌ Failed to load records:', error)
      toast.error(`Failed to load ${associatedEntity} records: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setAvailableRecords([])
    } finally {
      setLoadingRecords(false)
    }
  }

  const toggleRecordSelection = (recordId: number) => {
    const newIds = ids.includes(recordId)
      ? ids.filter(id => id !== recordId)
      : [...ids, recordId]
    setIds(newIds)
    updateParent(operation, newIds, subField)
  }

  const isRecordSelected = (recordId: number): boolean => {
    return ids.includes(recordId)
  }

  useEffect(() => {
    if (searchQuery.length > 2 && subField === 'id') {
      const debounceTimer = setTimeout(() => {
        handleSearch()
      }, 500)
      return () => clearTimeout(debounceTimer)
    } else {
      setSearchResults([])
      setShowSearchResults(false)
    }
  }, [searchQuery, subField, associatedEntity])

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
                      <div className="font-semibold">
                        {formatFieldLabel(f.label, f.name)}
                        {(f.type || f.dataType) && (
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            [{f.type === 'TO_ONE' ? 'TO_ONE' : (f.type === 'SCALAR' ? 'SCALAR' : f.type)}{f.dataType && f.dataType !== 'String' && f.dataType !== f.type ? `, ${f.dataType}` : ''}]
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {f.type === 'TO_ONE' ? `${f.type} → ${f.associatedEntity?.entity || 'Unknown'}` : `${f.type || f.dataType} field on ${associatedEntity}`}
                      </div>
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

      {subField === 'id' && associatedEntity && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="font-semibold">
              Select {associatedEntity} Records
            </Label>
            <div className="flex gap-2">
              <Button
                onClick={loadAvailableRecords}
                disabled={disabled || loadingRecords}
                size="sm"
                variant="outline"
              >
                {loadingRecords ? (
                  <>
                    <MagnifyingGlass className="animate-pulse" />
                    Loading...
                  </>
                ) : (
                  <>
                    <CaretDown />
                    Load Records
                  </>
                )}
              </Button>
            </div>
          </div>

          {availableRecords.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                <span className="text-sm text-muted-foreground">
                  {availableRecords.length} records available
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const allIds = availableRecords.map(r => r.id)
                      setIds(allIds)
                      updateParent(operation, allIds, subField)
                      toast.success(`Selected all ${allIds.length} records`)
                    }}
                    disabled={disabled}
                  >
                    Select All
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIds([])
                      updateParent(operation, [], subField)
                    }}
                    disabled={disabled || ids.length === 0}
                  >
                    Deselect All
                  </Button>
                </div>
              </div>
              
              <Card className="p-2">
                <ScrollArea className="h-64">
                  <div className="space-y-1">
                    {availableRecords.map((record) => (
                      <div
                        key={record.id}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded hover:bg-accent/10 border transition-colors cursor-pointer",
                          isRecordSelected(record.id) 
                            ? "border-accent bg-accent/5" 
                            : "border-transparent"
                        )}
                        onClick={() => !disabled && toggleRecordSelection(record.id)}
                      >
                        <Checkbox
                          checked={isRecordSelected(record.id)}
                          onCheckedChange={() => toggleRecordSelection(record.id)}
                          disabled={disabled}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{record.title}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-xs">
                              ID: {record.id}
                            </Badge>
                            {record.email && (
                              <span className="truncate">{record.email}</span>
                            )}
                          </div>
                        </div>
                        {isRecordSelected(record.id) && (
                          <Check size={18} className="text-accent shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </Card>
            </div>
          )}

          <div className="pt-2">
            <Label className="font-semibold">
              Or Search & Select Individually
            </Label>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${associatedEntity} by name, title, email...`}
                disabled={disabled || searching}
                className="pr-10"
              />
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <MagnifyingGlass size={16} className="text-muted-foreground animate-pulse" />
                </div>
              )}
            </div>
            <Button
              onClick={handleSearch}
              disabled={disabled || searching || !searchQuery.trim()}
              size="sm"
            >
              <MagnifyingGlass />
              Search
            </Button>
          </div>
          {showSearchResults && searchResults.length > 0 && (
            <Card className="p-2">
              <ScrollArea className="h-48">
                <div className="space-y-1">
                  {searchResults.map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-2 rounded hover:bg-accent/10 border border-transparent hover:border-accent/30 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{getRecordTitle(record)}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            ID: {record.id}
                          </Badge>
                          {record.email && (
                            <span className="truncate">{record.email}</span>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={ids.includes(record.id) ? "secondary" : "default"}
                        onClick={() => handleAddFromSearch(record)}
                        disabled={disabled || ids.includes(record.id)}
                        className="ml-2 shrink-0"
                      >
                        {ids.includes(record.id) ? 'Added' : <Plus />}
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          )}
          <p className="text-xs text-muted-foreground">
            Search for specific {associatedEntity} records or use "Load Records" above to browse and multi-select
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label className="font-semibold">
          Or Manually Enter {subField === 'id' ? `${associatedEntity} IDs` : `Values for "${subField}" Field`}
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
              onClick={() => { setIds([]); updateParent(operation, [], subField) }}
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
