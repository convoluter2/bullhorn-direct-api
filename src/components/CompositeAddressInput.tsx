import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { EntityField } from '@/hooks/use-entity-metadata'
import { MapPin, Info } from '@phosphor-icons/react'

interface CompositeAddressInputProps {
  field: EntityField
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function CompositeAddressInput({
  field,
  value,
  onChange,
  disabled
}: CompositeAddressInputProps) {
  const [subFieldValues, setSubFieldValues] = useState<Record<string, string>>({})

  useEffect(() => {
    if (value) {
      try {
        const parsed = JSON.parse(value)
        setSubFieldValues(parsed)
      } catch {
        setSubFieldValues({})
      }
    } else {
      setSubFieldValues({})
    }
  }, [value])

  const subFields = field.associatedEntity?.fields || []

  const handleSubFieldChange = (fieldName: string, fieldValue: string) => {
    const newValues = {
      ...subFieldValues,
      [fieldName]: fieldValue
    }
    setSubFieldValues(newValues)
    onChange(JSON.stringify(newValues))
  }

  if (subFields.length === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          No sub-fields available for this composite address field.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Card>
      <CardContent className="pt-4 space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="text-primary" size={18} weight="duotone" />
          <CardTitle className="text-sm font-semibold">
            {field.label || field.name}
          </CardTitle>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subFields.map((subField) => (
            <div key={subField.name} className="space-y-1.5">
              <Label className="text-xs flex items-center gap-2">
                {subField.label || subField.name}
              </Label>
              <Input
                value={subFieldValues[subField.name] || ''}
                onChange={(e) => handleSubFieldChange(subField.name, e.target.value)}
                disabled={disabled}
                placeholder={`Enter ${subField.label || subField.name}`}
                className="text-sm"
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
