import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MagnifyingGlass, XCircle, Plus } from '@phosphor-icons/react'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { toast } from 'sonner'
import type { EntityField } from '@/hooks/use-entity-metadata'

interface ToOneFieldInputProps {
  field: EntityField
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

export function ToOneFieldInput({ 
  field, 
  value, 
  onChange, 
  disabled, 
  placeholder,
  className 
}: ToOneFieldInputProps) {
  const [lookupData, setLookupData] = useState<{ id: number; title?: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)

  const associatedEntity = field?.associatedEntity?.entity || 'Entity'

  useEffect(() => {
    const fetchLookupData = async () => {
      if (!value || !value.trim()) {
        setLookupData(null)
        setError(null)
        return
      }

      const trimmed = value.trim()
      const numericId = /^\d+$/.test(trimmed) ? parseInt(trimmed, 10) : null

      if (!numericId) {
        setLookupData(null)
        setError(null)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const result = await bullhornAPI.getEntity(associatedEntity, numericId, ['id', 'name', 'title', 'firstName', 'lastName'])
        
        if (result && result.data) {
          const title = result.data.title || 
                       result.data.name || 
                       (result.data.firstName && result.data.lastName 
                         ? `${result.data.firstName} ${result.data.lastName}` 
                         : undefined)
          
          setLookupData({
            id: numericId,
            title
          })
        } else {
          setError(`${associatedEntity} not found`)
          setLookupData(null)
        }
      } catch (err) {
        console.error('Failed to lookup to-one association:', err)
        setError('Failed to lookup')
        setLookupData(null)
      } finally {
        setLoading(false)
      }
    }

    const debounceTimer = setTimeout(fetchLookupData, 500)
    return () => clearTimeout(debounceTimer)
  }, [value, associatedEntity])

  const handleClear = () => {
    onChange('')
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
      const searchFields = ['id', 'name', 'title', 'firstName', 'lastName', 'email']
      const fields = searchFields.join(',')
      
      const searchTerm = searchQuery.trim()
      const where = `(name='*${searchTerm}*' OR title='*${searchTerm}*' OR firstName='*${searchTerm}*' OR lastName='*${searchTerm}*' OR email='*${searchTerm}*')`
      
      console.log('🔍 ToOneFieldInput - Search query:', {
        associatedEntity,
        searchTerm,
        where,
        fields
      })
      
      const response = await bullhornAPI.query(associatedEntity, searchFields, where, {
        orderBy: 'id',
        count: '20',
        start: '0'
      })
      
      console.log('🔍 ToOneFieldInput - Search results:', {
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
    } catch (err) {
      console.error('Search failed:', err)
      toast.error(`Failed to search ${associatedEntity} records`)
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const handleSelectFromSearch = (record: any) => {
    onChange(record.id.toString())
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
    <div className="space-y-2">
      <div className="space-y-2">
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
                      variant={value === record.id.toString() ? "secondary" : "default"}
                      onClick={() => handleSelectFromSearch(record)}
                      disabled={disabled || value === record.id.toString()}
                      className="ml-2 shrink-0"
                    >
                      {value === record.id.toString() ? 'Selected' : 'Select'}
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        )}
      </div>
      
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            type="text"
            inputMode="numeric"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || `Enter ${associatedEntity} ID`}
            disabled={disabled}
            className={className}
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <MagnifyingGlass size={16} className="text-muted-foreground animate-pulse" />
            </div>
          )}
        </div>
        {value && (
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
        <div className="flex items-center gap-2 p-2 bg-accent/10 border border-accent/20 rounded text-sm">
          <Badge variant="secondary" className="font-mono text-xs">
            ID: {lookupData.id}
          </Badge>
          <span className="text-accent-foreground font-medium">{lookupData.title}</span>
        </div>
      )}
      
      {error && (
        <div className="text-xs text-destructive flex items-center gap-1">
          <XCircle size={12} />
          {error}
        </div>
      )}
      
      <p className="text-xs text-muted-foreground">
        Search for a {associatedEntity} record above, or enter the ID directly
      </p>
    </div>
  )
}
