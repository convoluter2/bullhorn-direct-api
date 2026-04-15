import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MagnifyingGlass, XCircle, Plus, CheckCircle } from '@phosphor-icons/react'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { toast } from 'sonner'
import type { EntityField } from '@/hooks/use-entity-metadata'
import { fieldValueCache } from '@/lib/field-value-cache'
import { validateToOneField } from '@/lib/field-validation'
import { cn } from '@/lib/utils'

interface ToOneFieldInputProps {
  field: EntityField
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

type ToOneOperation = 'set' | 'clear'

interface ToOneValue {
  operation: ToOneOperation
  id?: number | string
}

export function ToOneFieldInput({ 
  field, 
  value, 
  onChange, 
  disabled, 
  placeholder,
  className 
}: ToOneFieldInputProps) {
  const [operation, setOperation] = useState<ToOneOperation>('set')
  const [entityId, setEntityId] = useState<string>('')
  const [lookupData, setLookupData] = useState<{ id: number; title?: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isValidated, setIsValidated] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)

  const associatedEntity = field?.associatedEntity?.entity || 'Entity'
  const safeFields = fieldValueCache.getSafeFieldsForEntity(associatedEntity)

  useEffect(() => {
    try {
      const parsed = JSON.parse(value || '{}')
      if (parsed.operation) {
        setOperation(parsed.operation)
        setEntityId(parsed.id ? String(parsed.id) : '')
      } else if (value && value.trim()) {
        setEntityId(value)
        setOperation('set')
      }
    } catch {
      setEntityId(value || '')
      setOperation('set')
    }
  }, [])

  const updateParent = (op: ToOneOperation, id: string) => {
    const newValue: ToOneValue = {
      operation: op,
      ...(op === 'set' && id ? { id } : {})
    }
    onChange(JSON.stringify(newValue))
  }

  const handleOperationChange = (newOp: ToOneOperation) => {
    setOperation(newOp)
    if (newOp === 'clear') {
      setEntityId('')
      setLookupData(null)
      setError(null)
      setIsValidated(false)
    }
    updateParent(newOp, entityId)
  }

  const handleIdChange = (newId: string) => {
    setEntityId(newId)
    updateParent(operation, newId)
  }

  useEffect(() => {
    const validateAndLookup = async () => {
      if (operation === 'clear' || !entityId || !entityId.trim()) {
        setLookupData(null)
        setError(null)
        setIsValidated(false)
        return
      }

      setLoading(true)
      setError(null)
      setIsValidated(false)

      try {
        const validationResult = await validateToOneField(field, entityId)
        
        if (validationResult.isValid && validationResult.lookupData) {
          setLookupData(validationResult.lookupData)
          setIsValidated(true)
          setError(null)
        } else {
          setLookupData(null)
          setIsValidated(false)
          setError(validationResult.error || 'Validation failed')
        }
      } catch (err) {
        console.error('Failed to validate to-one field:', err)
        setError('Failed to validate')
        setLookupData(null)
        setIsValidated(false)
      } finally {
        setLoading(false)
      }
    }

    const debounceTimer = setTimeout(validateAndLookup, 500)
    return () => clearTimeout(debounceTimer)
  }, [entityId, field, operation])

  const handleClear = () => {
    setEntityId('')
    setOperation('clear')
    updateParent('clear', '')
    setLookupData(null)
    setError(null)
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      return
    }

    setSearching(true)
    setShowSearchResults(true)

    try {
      console.log('🔍 ToOneFieldInput - Searching with cache:', {
        associatedEntity,
        searchQuery: searchQuery.trim(),
        safeFields
      })
      
      const results = await fieldValueCache.getFieldValues(
        associatedEntity,
        safeFields,
        searchQuery.trim()
      )
      
      console.log('🔍 ToOneFieldInput - Search results from cache:', {
        count: results.length,
        data: results
      })
      
      if (results.length === 0) {
        toast.info(`No ${associatedEntity} records found matching "${searchQuery}"`)
      } else {
        toast.success(`Found ${results.length} ${associatedEntity} record(s)`)
      }
      
      setSearchResults(results)
    } catch (err) {
      console.error('Search failed:', err)
      toast.error(`Failed to search ${associatedEntity} records`)
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const handleSelectFromSearch = (record: any) => {
    const newId = record.id.toString()
    setEntityId(newId)
    setOperation('set')
    updateParent('set', newId)
    setSearchQuery('')
    setSearchResults([])
    setShowSearchResults(false)
    toast.success(`Selected ${getRecordTitle(record)}`)
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

  useEffect(() => {
    if (searchQuery.length > 2) {
      const debounceTimer = setTimeout(() => {
        handleSearch()
      }, 500)
      return () => clearTimeout(debounceTimer)
    } else {
      setSearchResults([])
      setShowSearchResults(false)
    }
  }, [searchQuery, associatedEntity])

  return (
    <Card className={cn("p-4 space-y-4 border-2", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Label className="text-base font-bold">To-One Association Configuration</Label>
          <p className="text-xs text-muted-foreground">
            Configure how to update this to-one field {associatedEntity ? `(associates with ${associatedEntity})` : ''}
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
            <SelectItem value="set">
              <div className="space-y-1">
                <div className="font-semibold">🔗 Set / Replace</div>
                <div className="text-xs text-muted-foreground">Set the association to a specific record</div>
              </div>
            </SelectItem>
            <SelectItem value="clear">
              <div className="space-y-1">
                <div className="font-semibold">🔓 Clear / Remove</div>
                <div className="text-xs text-muted-foreground">Remove the association (set to null)</div>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {operation === 'set' && (
        <>
          <div className="space-y-2">
            <Label className="font-semibold">Search {associatedEntity}</Label>
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
                type="button"
                onClick={handleSearch}
                disabled={disabled || searching || !searchQuery.trim()}
                size="sm"
              >
                <MagnifyingGlass />
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
                          type="button"
                          size="sm"
                          variant={entityId === record.id.toString() ? "secondary" : "default"}
                          onClick={() => handleSelectFromSearch(record)}
                          disabled={disabled || entityId === record.id.toString()}
                          className="ml-2 shrink-0"
                        >
                          {entityId === record.id.toString() ? 'Selected' : 'Select'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </Card>
            )}
          </div>

          <div className="space-y-2">
            <Label className="font-semibold">Or Enter ID Directly</Label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  type="text"
                  inputMode="numeric"
                  value={entityId}
                  onChange={(e) => handleIdChange(e.target.value)}
                  placeholder={placeholder || `Enter ${associatedEntity} ID`}
                  disabled={disabled}
                />
                {loading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <MagnifyingGlass size={16} className="text-muted-foreground animate-pulse" />
                  </div>
                )}
                {!loading && isValidated && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <CheckCircle size={16} className="text-green-500" weight="fill" />
                  </div>
                )}
              </div>
              {entityId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleClear}
                  disabled={disabled}
                >
                  <XCircle size={18} />
                </Button>
              )}
            </div>

            {lookupData && lookupData.title && (
              <div className="flex items-center gap-2 p-2 bg-green-500/10 border border-green-500/20 rounded text-sm">
                <CheckCircle size={18} className="text-green-500" weight="fill" />
                <Badge variant="secondary" className="font-mono text-xs">
                  ID: {lookupData.id}
                </Badge>
                <span className="text-foreground font-medium">{lookupData.title}</span>
              </div>
            )}

            {error && (
              <div className="text-xs text-destructive flex items-center gap-1 p-2 bg-destructive/10 border border-destructive/20 rounded">
                <XCircle size={14} weight="fill" />
                {error}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Search for a {associatedEntity} record above, or enter the ID directly. {isValidated && '✓ ID validated successfully.'}
            </p>
          </div>
        </>
      )}

      {operation === 'clear' && (
        <div className="p-3 bg-muted rounded border">
          <p className="text-sm text-muted-foreground">
            This will remove the association and set the field to null.
          </p>
        </div>
      )}
    </Card>
  )
}
