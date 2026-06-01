import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  'InvoiceTerm',
  'PlacementRateCardLineGroup',
  'PlacementRateCardVersion'
]

export function EntityLookup({ onLog }: EntityLookupProps) {
  const [entity, setEntity] = useState('')
  const [entityId, setEntityId] = useState('')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showEditable, setShowEditable] = useState(false)
  const [layout, setLayout] = useState<'RecordEdit' | 'RecordView'>('RecordView')
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
        layout,
        BhRestToken: bullhornAPI.getSession()?.BhRestToken || ''
      })

      if (supportsEffectiveDate && useEffectiveDate && effectiveDate) {
        params.append('effectiveDate', effectiveDate)
      }

      lookupUrl += `?${params.toString()}`

      const data = await bullhornAPI.getEntity(entity, parsedId, fields)
      
      setResult({
        data,
        url: lookupUrl,
        entity,
        id: parsedId,
        showEditable,
        layout,
        fields
      })

      toast.success(`Successfully retrieved ${entity} ${parsedId}`)
      onLog('Entity Lookup', 'success', `Retrieved ${entity} ${parsedId}`, {
        entity,
        id: parsedId,
        showEditable,
        layout,
        fields
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      setError(errorMessage)
      toast.error(`Lookup failed: ${errorMessage}`)
      onLog('Entity Lookup', 'error', `Failed to retrieve ${entity} ${parsedId}`, {
        error: errorMessage
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    if (result) {
      const text = JSON.stringify(result.data, null, 2)
      navigator.clipboard.writeText(text)
      toast.success('Copied to clipboard')
    }
  }

  const downloadJSON = () => {
    if (result) {
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${result.entity}_${result.id}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Downloaded JSON file')
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Entity Lookup</CardTitle>
              <CardDescription>
                Look up a single entity record by ID
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label>Entity</Label>
                <Select value={entity} onValueChange={(value) => {
                  setEntity(value)
                  setResult(null)
                  setError(null)
                }}>
                  <SelectTrigger disabled={entitiesLoading || loading}>
                    <SelectValue placeholder="Select entity..." />
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
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    toast.loading('Refreshing metadata...')
                    refreshMetadata()
                    setTimeout(() => {
                      toast.dismiss()
                    }, 500)
                  }}
                  disabled={!entity || metadataLoading}
                >
                  <ArrowsClockwise />
                </Button>
              </div>
            </div>

            <div>
              <Label>Entity ID</Label>
              <Input
                type="text"
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
                placeholder="Enter entity ID"
                disabled={loading}
              />
            </div>

            {supportsEffectiveDate && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="use-effective-date"
                      checked={useEffectiveDate}
                      onCheckedChange={setUseEffectiveDate}
                    />
                    <Label htmlFor="use-effective-date">
                      Use Effective Date
                    </Label>
                  </div>
                </div>
                {useEffectiveDate && (
                  <div>
                    <Input
                      type="date"
                      value={effectiveDate}
                      onChange={(e) => setEffectiveDate(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Show Editable</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Switch
                    id="show-editable"
                    checked={showEditable}
                    onCheckedChange={setShowEditable}
                  />
                  <Label htmlFor="show-editable" className="text-sm text-muted-foreground">
                    {showEditable ? 'Yes' : 'No'}
                  </Label>
                </div>
              </div>

              <div>
                <Label>Layout</Label>
                <Select value={layout} onValueChange={(v) => setLayout(v as 'RecordEdit' | 'RecordView')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RecordEdit">RecordEdit</SelectItem>
                    <SelectItem value="RecordView">RecordView</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleLookup}
              disabled={loading || !entity || !entityId}
            >
              {loading ? 'Looking up...' : 'Lookup Entity'}
            </Button>
          </div>
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
              <CardTitle>Result: {result.entity} {result.id}</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyToClipboard}>
                  <Copy size={16} />
                  Copy
                </Button>
                <Button variant="outline" size="sm" onClick={downloadJSON}>
                  <DownloadSimple size={16} />
                  Download
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <Label className="text-xs text-muted-foreground">API URL</Label>
                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">{result.url}</pre>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Response Data</Label>
                <ScrollArea className="h-[400px]">
                  <pre className="text-xs bg-muted p-4 rounded">{JSON.stringify(result.data, null, 2)}</pre>
                </ScrollArea>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
