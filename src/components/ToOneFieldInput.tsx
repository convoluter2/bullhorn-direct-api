import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MagnifyingGlass, XCircle } from '@phosphor-icons/react'
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

  return (
    <div className="space-y-2">
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
        To-One field: Enter the ID of the associated {associatedEntity} record
      </p>
    </div>
  )
}
