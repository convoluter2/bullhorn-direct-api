import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { useEntities } from '@/hooks/use-entities'
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
      toast.error('Please enter both entity and ID')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const parsedId = parseInt(entityId, 10)
      if (isNaN(parsedId)) {
        throw new Error('Entity ID must be a valid number')
      }

      const session = bullhornAPI.getSession()
      if (!session) {
        throw new Error('No active session')
      }

      let lookupUrl = `${session.restUrl}entity/${entity}/${parsedId}`
      const params = new URLSearchParams()

      if (showEditable) {
        params.append('showEditable', 'true')
      }

      if (supportsEffectiveDate && useEffectiveDate && effectiveDate) {
        params.append('effectiveDate', effectiveDate)
      }

      if (params.toString()) {
        lookupUrl += `?${params.toString()}`
      }

      const response = await fetch(lookupUrl, {
        headers: {
          'BhRestToken': session.BhRestToken || '',
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
      onLog('Entity Lookup', 'error', `Failed to retrieve ${entity} ID ${entityId}`, {
        entity,
        entityId,
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MagnifyingGlass size={24} weight="duotone" />
            Entity Lookup
          </CardTitle>
          <CardDescription>
            Look up a specific entity by ID and view its data
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
                type="number"
                placeholder="Enter entity ID"
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                id="show-editable"
                checked={showEditable}
                onCheckedChange={setShowEditable}
              />
              <Label htmlFor="show-editable">Show Editable Fields</Label>
            </div>

            {supportsEffectiveDate && (
              <>
                <div className="flex items-center gap-2">
                  <Switch
                    id="use-effective-date"
                    checked={useEffectiveDate}
                    onCheckedChange={setUseEffectiveDate}
                  />
                  <Label htmlFor="use-effective-date">Use Effective Date</Label>
                </div>

                {useEffectiveDate && (
                  <div className="flex items-center gap-2">
                    <Label htmlFor="effective-date">Effective Date</Label>
                    <Input
                      id="effective-date"
                      type="date"
                      value={effectiveDate}
                      onChange={(e) => setEffectiveDate(e.target.value)}
                      className="w-auto"
                    />
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex gap-2">
            <Button onClick={handleLookup} disabled={loading || !entity || !entityId}>
              {loading ? (
                <>
                  <ArrowsClockwise className="animate-spin" />
                  Loading...
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
                <Button variant="outline" onClick={handleCopyResult}>
                  <Copy />
                  Copy Result
                </Button>
                <Button variant="outline" onClick={handleDownloadResult}>
                  <DownloadSimple />
                  Download JSON
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
              <div className="flex items-center justify-between">
                <Label>Result</Label>
              </div>
              <ScrollArea className="h-[400px] w-full rounded-md border bg-muted/30 p-4">
                <pre className="text-sm font-mono">
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
