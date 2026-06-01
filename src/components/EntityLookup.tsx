import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, 
import { Switch } from '@/components/ui/switc
import { ScrollArea } from '@/components/ui/scroll-area'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { useEntities } from '@/hooks/use-entiti
import { Copy, DownloadSimple, ArrowsClockwise } from
interface EntityLookupProps {
}
const EFFECTIVE_DATE_ENTITIES = [
  'PlacementRateCardLineGroup'
]
export function EntityLookup({ onLog }: EntityLookupProps) {
  const [entityId, setEntityId] = useState('')

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

        layout,
        fields





      toast.success(`Successfully retrieved ${entity} ${parsedId}`)

        showEditable,
      })
      const errorMessage = err instanceof Error ? err.messag
      toast.
     

      })
      setLoading(f
  }

      nav
    }

    if (result) {
      c

      document.body.appendChild(a)
      document.body.remov
      toast.success('Downloaded')
  }
  return (
      <Card>

              <CardTitle>Ent
               
            </div>
        </Card
       

                <Select value={entity} onValueChange={(value) => {
                  setResult(null)
       

                  <SelectContent>

                          {e}

                  </S
              </div>
                <Button
               
                    t
                    s
              
        
                  <
              </div>

              <Label>Entity ID</Label>
                type="text"
                onChange={(e) => setEntityId(e.target.value)}
               
            </div>
            {supportsEffect
        
               
                      c
     
   

                {useEffectiveDat
                 
                      value={effectiveDate}
                      disabled={loading}
     
   

              <div>
                <
                    id="show-editable"
                    onCheckedChange={setSho
                  <Label htmlFor="show-edit
                  
              </div>
              <div>
               
                    <SelectValue /
                  <SelectConte
                    <SelectItem v
     
   

          
            >
            
        </CardConten

        <Alert va
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
































