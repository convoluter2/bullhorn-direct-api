import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { useEntities } from '@/hooks/use-entities'
import { Copy, DownloadSimple, ArrowsClockwise, MagnifyingGlass } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { bullhornAPI } from '@/lib/bullhorn-api'

interface EntityLookupProps {
  onLog: (operation: string, status: 'success' | 'error', message: string, details?: any) => void
}

const EFFECTIVE_DATE_ENTITIES = [
  'PlacementRateCardLine',
  'PlacementRateCardLineGroup',
]

export function EntityLookup({ onLog }: EntityLookupProps) {
  const { entities } = useEntities()
  const [entity, setEntity] = useState('')
  const [entityId, setEntityId] = useState('')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showEditable, setShowEditable] = useState(false)
  const [useEffectiveDate, setUseEffectiveDate] = useState(false)
  const [effectiveDate, setEffectiveDate] = useState('')

  const supportsEffectiveDate = EFFECTIVE_DATE_ENTITIES.includes(entity)

  const handleLookup = async () => {
    if (!entity || !entityId) {
      toast.error('Please enter both entity type and ID')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const parsedId = parseInt(entityId, 10)
      if (isNaN(parsedId)) {
        throw new Error('Invalid entity ID - must be a number')
      }

      let fields = '*'
      if (showEditable) {
        fields = 'id,*,_score'
      }

      let fetchedData
      if (useEffectiveDate && effectiveDate && supportsEffectiveDate) {
        const params = new URLSearchParams({
          effectiveDate: effectiveDate,
          fields: fields,
          BhRestToken: bullhornAPI.getSession()?.BhRestToken || ''
        })

        const url = `${bullhornAPI.getSession()?.restUrl}entity/${entity}/${parsedId}?${params.toString()}`
        const response = await fetch(url)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch entity: ${response.statusText}`)
        }
        
        const data = await response.json()
        fetchedData = data.data || data
      } else {
        fetchedData = await bullhornAPI.getEntity(entity, parsedId, fields)
      }

      setResult(fetchedData)
      onLog('Entity Lookup', 'success', `Successfully retrieved ${entity} with ID ${parsedId}`, {
        entity,
        entityId: parsedId,
        data: fetchedData
      })
      toast.success('Entity retrieved successfully')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      onLog('Entity Lookup', 'error', `Failed to retrieve ${entity} with ID ${entityId}`, {
        error: errorMessage
      })
      toast.error(`Lookup failed: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
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
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Result downloaded')
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MagnifyingGlass size={24} weight="duotone" />
            Entity Lookup
          </CardTitle>
          <CardDescription>
            Look up a single entity record by ID
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="entity-id">Entity ID</Label>
              <Input
                id="entity-id"
                placeholder="Enter entity ID (e.g., 12345)"
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
                type="number"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Switch
                id="show-editable"
                checked={showEditable}
                onCheckedChange={setShowEditable}
              />
              <Label htmlFor="show-editable">Show Editable Fields</Label>
            </div>
            {supportsEffectiveDate && (
              <div className="flex items-center gap-2">
                <Switch
                  id="use-effective-date"
                  checked={useEffectiveDate}
                  onCheckedChange={setUseEffectiveDate}
                />
                <Label htmlFor="use-effective-date">Use Effective Date</Label>
              </div>
            )}
            {useEffectiveDate && (
              <div className="flex items-center gap-2">
                <Label htmlFor="effective-date">Effective Date (ms):</Label>
                <Input
                  id="effective-date"
                  type="number"
                  placeholder="1640995200000"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className="w-48"
                />
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button onClick={handleLookup} disabled={loading || !entity || !entityId}>
              {loading ? (
                <>
                  <ArrowsClockwise className="animate-spin" />
                  Looking up...
                </>
              ) : (
                <>
                  <MagnifyingGlass />
                  Lookup Entity
                </>
              )}
            </Button>
            {result && (
              <>
                <Button variant="outline" onClick={handleCopy}>
                  <Copy />
                  Copy
                </Button>
                <Button variant="outline" onClick={handleDownloadResult}>
                  <DownloadSimple />
                  Download
                </Button>
              </>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <div className="space-y-2">
              <Label>Result</Label>
              <ScrollArea className="h-[400px] w-full rounded border bg-muted p-4">
                <pre className="text-xs font-mono">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
