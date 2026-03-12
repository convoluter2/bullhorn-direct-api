import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardTitle } from 
import { Alert, AlertDescription } from '@/co
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { MapPin, Info } from '@phosphor-icons/react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { EntityField } from '@/hooks/use-entity-metadata'

interface CompositeAddressInputProps {

  value: string
  value,
  disabled?: boolean
}

export function CompositeAddressInput({
  field,
        
  onChange,
        setSubFiel
}: CompositeAddressInputProps) {
  const [subFieldValues, setSubFieldValues] = useState<Record<string, string>>({})


    if (value) {
    if (sub
        const parsed = JSON.parse(value)
        setSubFieldValues(parsed)
      } catch {
        setSubFieldValues({})
      }
  ret
  }, [value])

  const subFields = field.associatedEntity?.fields || []

                  </Badge>
              </Label>
                value={s
                disabled={disabled}
            
              <p className="text-[
     
          ))}

   

          
        )}
    </Card>
}






















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
