import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  'PlacementRateCardLine',
  'PlacementRateCardLineGroup',
]

export function EntityLookup({ onLog }: EntityLookupProps) {
  const [entity, setEntity] = useState('')
  const [entityId, setEntityId] = useState('')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showEditable, setShowEditable] = useState(false)
  const [useEffectiveDate, setUseEffectiveDate] = useState(false)
  const [effectiveDate, setEffectiveDate] = useState('')

  const { entities, loading: entitiesLoading, refresh: refreshEntities } = useEntities()
  const { metadata, loading: metadataLoading, refresh: refreshMetadata } = useEntityMetadata(entity || undefined)

  const supportsEffectiveDate = EFFECTIVE_DATE_ENTITIES.includes(entity)

  const handleLookup = async () => {
    if (!entity || !entityId) {
      toast.error('Please select an entity and enter an ID')
      return
    }

    const parsedId = parseInt(entityId, 10)
    if (isNaN(parsedId)) {
      toast.error('Entity ID must be a number')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const fields = metadata?.fields.map(f => f.name).join(',') || '*'
      
      let lookupUrl = `${bullhornAPI.getSession()?.restUrl}entity/${entity}/${parsedId}`
      const params = new URLSearchParams({
        fields,
        showEditable: showEditable.toString(),
      })

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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Entity Lookup</CardTitle>
          <CardDescription>
            Look up a single Bullhorn entity by ID
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="entity-select">Entity</Label>
            <div className="flex gap-2">
              <Select
                value={entity}
                onValueChange={(value) => {
                  setEntity(value)
                  setResult(null)
                  setError(null)
                }}
                disabled={entitiesLoading}
              >
                <SelectTrigger id="entity-select">
                  <SelectValue placeholder="Select entity" />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-[300px]">
                    {entities.map((e) => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  refreshEntities()
                  if (entity) {
                    refreshMetadata()
                  }
                  toast.dismiss()
                  toast.success('Entity list refreshed')
                }}
                disabled={entitiesLoading}
              >
                <ArrowsClockwise className={entitiesLoading ? 'animate-spin' : ''} />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="entity-id">Entity ID</Label>
            <Input
              id="entity-id"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              placeholder="Enter entity ID"
            />
          </div>

          {supportsEffectiveDate && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="use-effective-date">Use Effective Date</Label>
                <Switch
                  id="use-effective-date"
                  checked={useEffectiveDate}
                  onCheckedChange={setUseEffectiveDate}
                />
              </div>
              {useEffectiveDate && (
                <Input
                  id="effective-date"
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                />
              )}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="show-editable">Show Editable Fields</Label>
              <div className="flex items-center gap-2">
                <Switch
                  id="show-editable"
                  checked={showEditable}
                  onCheckedChange={setShowEditable}
                />
                <span className="text-sm text-muted-foreground">
                  {showEditable ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>

          <Button
            onClick={handleLookup}
            disabled={loading || !entity || !entityId}
            className="w-full"
          >
            <MagnifyingGlass />
            {loading ? 'Looking up...' : 'Lookup Entity'}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Result</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopyResult}>
                  <Copy />
                  Copy
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownloadResult}>
                  <DownloadSimple />
                  Download
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <Label className="text-xs text-muted-foreground">Entity Type</Label>
                <div className="font-mono text-sm">{entity}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Raw Response</Label>
                <ScrollArea className="h-[400px]">
                  <pre className="text-xs bg-muted p-4 rounded">{JSON.stringify(result, null, 2)}</pre>
                </ScrollArea>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
