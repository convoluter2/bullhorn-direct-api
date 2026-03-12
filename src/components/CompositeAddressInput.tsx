import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MapPin, Info } from '@phosphor-icons/react'
import type { EntityField } from '@/hooks/use-entity-metadata'

interface CompositeAddressInputProps {

  value: string
  value,
  disabled?: boolean
}

export function CompositeAddressInput({
  field,
        
  onChange,
        se
}: CompositeAddressInputProps) {
  const [subFieldValues, setSubFieldValues] = useState<Record<string, string>>({})


    if (value) {
  const han
        const parsed = JSON.parse(value)
        setSubFieldValues(parsed)
      } catch {
        setSubFieldValues({})
      }
  if (subFie
      setSubFieldValues({})
     
  }, [value])

  const subFields = field.associatedEntity?.fields || []

  const handleSubFieldChange = (fieldName: string, fieldValue: string) => {
    const newValues = {
      ...subFieldValues,
          <MapPin className="
    }
          </CardTitle>
    onChange(JSON.stringify(newValues))
  }

  if (subFields.length === 0) {
    return (
             
        <Info className="h-4 w-4" />
        <AlertDescription>
          No sub-fields available for this composite address field.
                value={subF
      </Alert>
     
  }

  return (
          
      <CardContent className="pt-4 space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="text-primary" size={18} weight="duotone" />
          <CardTitle className="text-sm font-semibold">
            {field.label || field.name}
            </pre>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subFields.map((subField) => (
            <div key={subField.name} className="space-y-1.5">
              <Label className="text-xs flex items-center gap-2">
                {subField.label || subField.name}
































