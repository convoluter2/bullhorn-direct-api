import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switc
import { Alert, AlertDescription } from '@/co
import { ScrollArea } from '@/components/ui/scr
import { useEntities } from '@/hooks/use-entities'
import { Copy, DownloadSimple, ArrowsClockwise, MagnifyingGlass

import { ScrollArea } from '@/components/ui/scroll-area'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { useEntities } from '@/hooks/use-entities'
import { useEntityMetadata } from '@/hooks/use-entity-metadata'
import { Copy, DownloadSimple, ArrowsClockwise, MagnifyingGlass } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface EntityLookupProps {
  onLog: (operation: string, status: 'success' | 'error', message: string, details?: any) => void
}

const EFFECTIVE_DATE_ENTITIES = [
  const [showEditable, set
  'PlacementRateCardLineGroup',



  const [entity, setEntity] = useState('')
  const [entityId, setEntityId] = useState('')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showEditable, setShowEditable] = useState(false)
  const [useEffectiveDate, setUseEffectiveDate] = useState(false)
      if (supportsEffectiveDate && useEffectiveDate && e

      lookupUrl += `?${params.toString()}`
      const response = await fetch(lookupUrl, {

      })

      }
      const data = await respon
      
        enti
     

      
    } catch (err) {
      setError(errorMessage)
        enti
     

      setLoading(fal
  }
  const handleCopyR

    }

    if
      const url = URL.createObjectURL(blob)
      a.href = url
      document.
      document.body.removeChild(a)
      to

      if (supportsEffectiveDate && useEffectiveDate && effectiveDate) {
        params.append('effectiveDate', effectiveDate)
      }

      lookupUrl += `?${params.toString()}`

      const response = await fetch(lookupUrl, {
        headers: {
          'BhRestToken': bullhornAPI.getSession()?.BhRestToken || '',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setResult(data)
      
      onLog('Entity Lookup', 'success', `Successfully retrieved ${entity} ID ${parsedId}`, {
        entity,
        entityId: parsedId,
        showEditable,
        useEffectiveDate: supportsEffectiveDate && useEffectiveDate,
        effectiveDate: supportsEffectiveDate && useEffectiveDate ? effectiveDate : undefined,
      })
      
      toast.success('Entity retrieved successfully')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      onLog('Entity Lookup', 'error', `Failed to retrieve ${entity} ID ${parsedId}`, {
        entity,
        entityId: parsedId,
        error: errorMessage,
      })
      toast.error(`Failed to retrieve entity: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyResult = () => {
    if (result) {
      navigator.clipboard.writeText(JSON.stringify(result, null, 2))
      toast.success('Result copied to clipboard')
    }
  }

  const handleDownloadResult = () => {
    if (result) {
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${entity}-${entityId}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Result downloaded')
    }
  }

          
                </Button>
            
          <CardConte
              <div>
                <div classN
              <div>
                <ScrollArea 
                </Scr
            </div>
        </Card>
    </div>
}












































































































































