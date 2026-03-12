import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { MapPin, Info } from '@phosphor-icons
import { Badge } from '@/components/ui/badge'
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
    cons
      [subF
    
      delete updated[subFieldNam
    



    <Card c
        <CardTitle className="text-sm fl
          {field.label || field.n
            COM
        </CardTitle>
      <
     
            T


          {subFields.
              <Label cla
                {subField.required 
     
    
              <Input
                onChange={(e) => h
     
    
                {subField.name
            </div>
   

            <Label className="text-xs 

          
      </CardContent>
  )


















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
