import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/co
import { MapPin, Info } from '@phosphor-icons/react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { EntityField } from '@/hooks/use-entity-metadata'
import { MapPin, Info } from '@phosphor-icons/react'

  field,
  onChange,
}: CompositeAdd

    if (value) {
 

      }
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
            {field.label ||
     
        <div 

                {subField.label || subField.name}

                onChange={(e) => handleSubFieldChange(subField.name, e.targ
                placeho
              />
          ))}
     
  )












































