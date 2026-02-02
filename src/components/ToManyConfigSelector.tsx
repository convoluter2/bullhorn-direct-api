import { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash, ArrowsClockwise } from 
import { formatFieldLabel } from '@/lib/utils'
import { useEntityMetadata } from '@/hooks/use-entity-metadata'
import { formatFieldLabel } from '@/lib/utils'
import type { EntityField } from '@/hooks/use-entity-metadata'

interface ToManyConfig {
  operation: 'add' | 'remove' | 'replace'
  subField: string
}

interface ToManyConfigSelectorProps {
  fieldName: string
  fieldLabel: string
  associatedEntity?: string
  config: ToManyConfig
  onChange: (config: ToManyConfig) => void
}

export function ToManyConfigSelector({ 
  fieldName,
  fieldLabel, 
  associatedEntity, 
  config, 
  onChange 
}: ToManyConfigSelectorProps) {
  const { metadata: subEntityMetadata, loading: subEntityLoading } = useEntityMetadata(associatedEntity)
  const [isOpen, setIsOpen] = useState(false)
  
  const availableSubFields = subEntityMetadata?.fields.filter(f => f.type !== 'TO_MANY') || []

        Co
      </p>
      <div className="grid grid-cols-2 gap-3">
          <Label className="text-xs">Operation</Lab
            value={config.operation}
              onChange({ ...config, operation: value })
          
      
            <SelectContent>
                <div className="flex 
                  <span>Add (keep existing)</span>
              </S
                <div className="flex
                  <span>Remove (only these)</span>
              </SelectItem>
              
           
              </SelectItem>
          </Select>
        
          <Label className=
            value={config.subField}
              onChange({ ...config, subField: value })
            open={isOpen}
          >
              <SelectV
            <SelectContent>
                <div className="space-y-0
                  <div className="text-[10px] text-muted-
                  </div>
              </SelectItem>
                <Selec
              {!subEntityLo
                  <div className="space-y-
                    <div className="text-[10px] text-mute
                    </div>
                </SelectItem>
            </SelectCo
        </div>
      
        <p classNam
          {con
        
          {config.operation === 'add'
          {config.operation === 'replace' && '⚠ All exi
        {config.s
            💡 CSV values will be u
        )}
    </div>
}





















































