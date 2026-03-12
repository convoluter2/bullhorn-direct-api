import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { MapPin, Info } from '@phosphor-icons/react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { EntityField } from '@/hooks/use-entity-metadata'

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
  disabled = false
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
    }
  }, [value])

  const subFields = field.associatedEntity?.fields || []

  const handleSubFieldChange = (subFieldName: string, subFieldValue: string) => {
    const updated = { ...subFieldValues }
    if (subFieldValue) {
      updated[subFieldName] = subFieldValue
    } else {
      delete updated[subFieldName]
    }
    setSubFieldValues(updated)
    onChange(JSON.stringify(updated))
  }

  return (
    <Card className="border-accent/20">
      <CardContent className="p-4 space-y-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <MapPin className="text-accent" size={16} />
          {field.label || field.name}
          <Badge variant="secondary" className="text-[10px] h-4 px-1">
            COMPOSITE
          </Badge>
        </CardTitle>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            This is a composite address field. Fill in the sub-fields below.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          {subFields.map((subField) => (
            <div key={subField.name} className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                {subField.label || subField.name}
                {subField.required && (
                  <Badge variant="destructive" className="text-[10px] h-4 px-1">
                    Required
                  </Badge>
                )}
              </Label>
              <Input
                value={subFieldValues[subField.name] || ''}
                onChange={(e) => handleSubFieldChange(subField.name, e.target.value)}
                disabled={disabled}
                placeholder={`Enter ${subField.label || subField.name}`}
                className="h-9 text-sm"
              />
              <p className="text-[10px] text-muted-foreground font-mono">
                {subField.name} ({subField.dataType})
              </p>
            </div>
          ))}
        </div>

        {Object.keys(subFieldValues).length > 0 && (
          <div className="pt-2 border-t">
            <Label className="text-xs text-muted-foreground">Preview (JSON)</Label>
            <pre className="text-[10px] font-mono bg-muted p-2 rounded mt-1 overflow-x-auto">
              {JSON.stringify(subFieldValues, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
