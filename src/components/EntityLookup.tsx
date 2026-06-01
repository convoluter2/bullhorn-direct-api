import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { bullhornAPI } from '@/lib/bullhorn-a
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { bullhornAPI } from '@/lib/bullhorn-a
import { toast } from 'sonner'
import { useEntities } from '@/hooks/use-entities'
import { useEntityMetadata } from '@/hooks/use-entity-metadata'

import { bullhornAPI } from '@/lib/bullhorn-api'
import { Copy, DownloadSimple, ArrowsClockwise } from '@phosphor-icons/react'


  onLog: (operation: string, status: 'success' | 'error', message: string, details?: any) => void
 

const EFFECTIVE_DATE_ENTITIES = [
  'InvoiceTerm',
  const [result, setResult] 
  'PlacementRateCardVersion'
 

export function EntityLookup({ onLog }: EntityLookupProps) {
  const [entity, setEntity] = useState('')
    if (!entity || !entityId) {
  const [useEffectiveDate, setUseEffectiveDate] = useState(false)
            .map(f => f.name)
        : '*'
      const options: any = {
        layout

        options.effectiveOn = effectiveDate

      setResult(data)
      toast.success(`Successfully retrieved ${entity} ${parsedId}`)

        showEditable,

    } catch (err) {
      setError(errorMessage)
      console.error('❌ Entity lookup failed:', err)
        enti
     

    }

    if (result) {
      toast.
  }

      const blob = n
      const a = do
      a.download = 

    }

    <div className
        <CardHeader>
            <div>
              <CardDes
             

        <CardContent classNa
            <div clas
              
       

                  <SelectTrigger disabled={entitiesLoading || loading}>
                  </SelectTrigger>
       

                        </SelectItem>
                    <
      
              <div className="flex items-end">
                  variant="outline"
               
                    r
                     
               
                >
        
            </div>
            <div>
              <Input
                value={entityId}
                placeholder="Enter entity ID"
              />

              <div cl
                  <div clas
        
               
                    <La
     
   

                      type="date
                 
                    />
                )}
     
   

                  <Switch
                 
                  />
                    {showEditable ? 'Yes' :
                </div>

                <Label>Layout</Label>
               
                  </SelectTrig
                    <SelectItem value=
     
   

          
              disabled={loading
            
          </div>
      </Card>
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
                <Select value={layout} onValueChange={setLayout}>
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




































































import { toast } from 'sonner'
import { useEntities } from '@/hooks/use-entities'
import { useEntityMetadata } from '@/hooks/use-entity-metadata'

import { bullhornAPI } from '@/lib/bullhorn-api'
import { Copy, DownloadSimple, ArrowsClockwise } from '@phosphor-icons/react'


  onLog: (operation: string, status: 'success' | 'error', message: string, details?: any) => void
 

const EFFECTIVE_DATE_ENTITIES = [
  'InvoiceTerm',
  const [result, setResult] 
  'PlacementRateCardVersion'
 

export function EntityLookup({ onLog }: EntityLookupProps) {
  const [entity, setEntity] = useState('')
    if (!entity || !entityId) {
  const [useEffectiveDate, setUseEffectiveDate] = useState(false)
            .map(f => f.name)
        : '*'
      const options: any = {
        layout

        options.effectiveOn = effectiveDate

      setResult(data)
      toast.success(`Successfully retrieved ${entity} ${parsedId}`)

        showEditable,

    } catch (err) {
      setError(errorMessage)
      console.error('❌ Entity lookup failed:', err)
        enti
     

    }

    if (result) {
      toast.
  }

      const blob = n
      const a = do
      a.download = 

    }

    <div className
        <CardHeader>
            <div>
              <CardDes
             

        <CardContent classNa
            <div clas
              
       

                  <SelectTrigger disabled={entitiesLoading || loading}>
                  </SelectTrigger>
       

                        </SelectItem>
                    <
      
              <div className="flex items-end">
                  variant="outline"
               
                    r
                     
               
                >
        
            </div>
            <div>
              <Input
                value={entityId}
                placeholder="Enter entity ID"
              />

              <div cl
                  <div clas
        
               
                    <La
     
   

                      type="date
                 
                    />
                )}
     
   

                  <Switch
                 
                  />
                    {showEditable ? 'Yes' :
                </div>

                <Label>Layout</Label>
               
                  </SelectTrig
                    <SelectItem value=
     
   

          
              disabled={loading
            
          </div>
      </Card>
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
                <Select value={layout} onValueChange={setLayout}>
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



































































