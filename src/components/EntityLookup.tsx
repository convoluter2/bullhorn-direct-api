import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/co
import { useEntities } from '@/hooks/use-enti
import { Copy, DownloadSimple, ArrowsClockwise 

import { Alert, AlertDescription } from '@/components/ui/alert'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { useEntities } from '@/hooks/use-entities'
import { useEntityMetadata } from '@/hooks/use-entity-metadata'
import { Copy, DownloadSimple, ArrowsClockwise } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface EntityLookupProps {
  onLog: (operation: string, status: 'success' | 'error', message: string, details?: any) => void
}

const EFFECTIVE_DATE_ENTITIES = [
  const [loading
  'PlacementRateCardLineGroup',
  const [useEffectiveDate, s
]

export function EntityLookup({ onLog }: EntityLookupProps) {
  const [entity, setEntity] = useState('')
  const [entityId, setEntityId] = useState('')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showEditable, setShowEditable] = useState(false)
    if (isNaN(parsedId)) {
  const [useEffectiveDate, setUseEffectiveDate] = useState(false)
  const [effectiveDate, setEffectiveDate] = useState('')

  const { entities, loading: entitiesLoading, refresh: refreshEntities } = useEntities()
  const { metadata, loading: metadataLoading, refresh: refreshMetadata } = useEntityMetadata(entity || undefined)

  const supportsEffectiveDate = EFFECTIVE_DATE_ENTITIES.includes(entity)

  const handleLookup = async () => {
        showEditable: showEdita
      toast.error('Please select an entity and enter an ID')
      })
    }

    const parsedId = parseInt(entityId, 10)
    if (isNaN(parsedId)) {
      toast.error('Entity ID must be a number')
      
    }

    setLoading(true)
        showEditab
    setResult(null)

    try {
      const fields = metadata?.fields.map(f => f.name).join(',') || '*'
      
      let lookupUrl = `${bullhornAPI.getSession()?.restUrl}entity/${entity}/${parsedId}`
      const params = new URLSearchParams({
      })
        showEditable: showEditable.toString(),

    <div className="space-y-4">
        

              <CardDescription>
              </CardDescription>
       

            <div className="flex gap-2">

                  setEntity(value)
      
                 
             
                    <Sc
               
                     
                    <
               
              
        

                    refreshMetadata()
                      toast.dismiss()
               
                >
                </But
            </d
            <d
        
                val
                placeholder="Enter entity ID"
              />

              <div className="space-y-2">
                  <div clas
        
               
                    <La
     
   

                      type="date"
                 
                    />
                )}
            )}
     
   

                    checked={s
                 
                    {showEditable ? 'Yes' : 'No'}
                </div>

                <L
                  <SelectTrigger>
                  </SelectTrigger>
               
                  </SelectContent>
              </div>

     
   

          
      </Card>
      {error
          <AlertDesc
      )}
      {result && 
          <CardHeader>
              <CardTitle>Result
                <Button variant="outline" size="sm" 
                  Copy
                <B
                
              </div>
          </CardHeader>
            <div className="space-y-2
                <Label className="text-x
              </div>
                <Label className="tex
                  <pre className="text-xs bg-muted p-4 rounded">{J
              </div>
          </CardContent>
      )}
  )
























































































































































