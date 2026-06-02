import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scr
import { Card, CardContent, CardDescription, CardHeader, CardTi
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

import { useEntities } from '@/hooks/use-entities'
import { Copy, DownloadSimple, ArrowsClockwise, MagnifyingGlass } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface EntityLookupProps {
  onLog: (operation: string, status: 'success' | 'error', message: string, details?: any) => void
}

const EFFECTIVE_DATE_ENTITIES = [
  const [error, setError] 
  'PlacementRateCardLineGroup',
 

export function EntityLookup({ onLog }: EntityLookupProps) {
  const { entities } = useEntities()
  const [entity, setEntity] = useState('')
  const [entityId, setEntityId] = useState('')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
    setError(null)
  const [showEditable, setShowEditable] = useState(false)
  const [useEffectiveDate, setUseEffectiveDate] = useState(false)
  const [effectiveDate, setEffectiveDate] = useState('')

  const supportsEffectiveDate = EFFECTIVE_DATE_ENTITIES.includes(entity)


        headers: {
        },

     

      setResult(data
      onLog('Entit
        entityId: p

      })
      toast.success('Entity retrieved success
      const errorMessage = e
      onLog('Entity Lookup', 'error', `Failed to retrieve $
       

    } finally {
    }

    if 

  }
  const handleDownloadResult = () => {

      const a = document.
      a.download = `${entity}-${entityId}.jso
      a

    }

    <di

            <MagnifyingGlass s
          </CardTitle>
       

          <div className="grid grid-cols-2 gap-
              <Lab
                id="entity-select"
          
        

                  <option
              </datalist>


                id="entity-id"
                place
      
            </div>

            <div className=
                id="s
                onCheckedChange={setShowEditable}
              <Label htmlFor="show-editable">Show Editable Fields</Label>

      
                  <Switch
                   
                  />
                </div>
                {useEffectiveDate && (
               
                 
                      value=
        
                  </div>
              <
          </div>
     
   

                </>
                <
                  Lookup Entity
              )}

   

                </Button>
                 
                </Button>
            )}

            <Alert
            </Alert>

            <di
                <Label>Result</Lab
              <ScrollArea clas
                  {JSON.stringify(result
     
   

  )












          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entity-select">Entity Type</Label>
              <Input
                id="entity-select"
                placeholder="Enter entity name (e.g., Candidate)"
                value={entity}
                onChange={(e) => setEntity(e.target.value)}
                list="entity-list"
              />
              <datalist id="entity-list">
                {entities.map((e) => (
                  <option key={e} value={e} />
                ))}
              </datalist>







































































































