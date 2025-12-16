import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, Check, X, MagnifyingGlass, Warning } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { bullhornAPI } from '@/lib/bullhorn-api'

interface ManualEntityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onEntityAdded: (entityName: string) => void
  existingEntities: string[]
}

export function ManualEntityDialog({ open, onOpenChange, onEntityAdded, existingEntities }: ManualEntityDialogProps) {
  const [entityName, setEntityName] = useState('')
  const [checking, setChecking] = useState(false)
  const [checkResult, setCheckResult] = useState<{
    exists: boolean
    fields: Array<{ name: string; label: string; type: string }>
    error?: string
  } | null>(null)

  const handleCheck = async () => {
    if (!entityName.trim()) {
      toast.error('Please enter an entity name')
      return
    }

    if (existingEntities.includes(entityName.trim())) {
      toast.error('This entity already exists in your list')
      return
    }

    setChecking(true)
    setCheckResult(null)

    try {
      const metadata = await bullhornAPI.getMetadata(entityName.trim())
      
      if (!metadata || !metadata.fields) {
        setCheckResult({
          exists: false,
          fields: [],
          error: 'Entity not found or has no fields'
        })
        return
      }

      const fields = metadata.fields.slice(0, 20).map((f: any) => ({
        name: f.name,
        label: f.label || f.name,
        type: f.dataType || f.type
      }))

      setCheckResult({
        exists: true,
        fields,
        error: undefined
      })
      
      toast.success(`Found ${metadata.fields.length} fields for ${entityName}`)
    } catch (error) {
      console.error('Failed to check entity:', error)
      setCheckResult({
        exists: false,
        fields: [],
        error: error instanceof Error ? error.message : 'Failed to check entity'
      })
      toast.error('Entity not found or not accessible')
    } finally {
      setChecking(false)
    }
  }

  const handleSave = () => {
    if (!checkResult?.exists) {
      toast.error('Please check the entity first to verify it exists')
      return
    }

    onEntityAdded(entityName.trim())
    toast.success(`Added ${entityName.trim()} to entity list`)
    handleClose()
  }

  const handleClose = () => {
    setEntityName('')
    setCheckResult(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Manual Entity Type</DialogTitle>
          <DialogDescription>
            Enter an entity name to check if it exists and view its available fields
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="space-y-2">
            <Label htmlFor="entity-name">Entity Name</Label>
            <div className="flex gap-2">
              <Input
                id="entity-name"
                value={entityName}
                onChange={(e) => setEntityName(e.target.value)}
                placeholder="e.g., Candidate, JobOrder, ClientContact"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCheck()
                  }
                }}
              />
              <Button 
                onClick={handleCheck} 
                disabled={!entityName.trim() || checking}
                className="gap-2"
              >
                {checking ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                    Checking...
                  </>
                ) : (
                  <>
                    <MagnifyingGlass />
                    Check
                  </>
                )}
              </Button>
            </div>
          </div>

          {checking && (
            <div className="space-y-2 border rounded-md p-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          )}

          {checkResult && !checking && (
            <div className="flex-1 overflow-hidden flex flex-col">
              {checkResult.exists ? (
                <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
                  <Alert className="bg-accent/20 border-accent">
                    <Check className="h-4 w-4 text-accent" />
                    <AlertDescription>
                      Entity found with {checkResult.fields.length}+ fields available
                    </AlertDescription>
                  </Alert>

                  <div className="flex-1 overflow-hidden flex flex-col">
                    <Label className="mb-2">Sample Fields (first 20):</Label>
                    <ScrollArea className="flex-1 border rounded-md p-3 bg-muted/30">
                      <div className="space-y-2">
                        {checkResult.fields.map((field) => (
                          <div 
                            key={field.name} 
                            className="flex items-center justify-between p-2 rounded bg-card hover:bg-accent/10 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="font-mono text-sm font-medium">{field.name}</div>
                              {field.label !== field.name && (
                                <div className="text-xs text-muted-foreground">{field.label}</div>
                              )}
                            </div>
                            <Badge variant="secondary" className="ml-2">
                              {field.type}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              ) : (
                <Alert variant="destructive">
                  <X className="h-4 w-4" />
                  <AlertDescription>
                    {checkResult.error || 'Entity not found or not accessible'}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {!checkResult && !checking && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <div className="text-center space-y-2">
                <Warning size={32} className="mx-auto opacity-50" />
                <p className="text-sm">Enter an entity name and click Check to verify</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!checkResult?.exists}
            className="gap-2"
          >
            <Plus />
            Add Entity
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
