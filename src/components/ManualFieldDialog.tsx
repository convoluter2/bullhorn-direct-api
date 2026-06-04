import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescripti
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Info, Warning } from '@phospho
import { useEntities } from '@/hooks/use-entities'
interface ManualFieldDialogProps {
  onOpenChange: (open: boolean) => void
  onFieldAdded: (field: ManualFieldDefinition) => void
}
export interface ManualFieldDefinition {

  dataType: string
  optional: boo

  'String',
  onFieldAdded: (field: ManualFieldDefinition) => void
  existingFields?: string[]
}

export interface ManualFieldDefinition {
  name: string
  label: string
  type: 'SCALAR' | 'TO_ONE' | 'TO_MANY'
  dataType: string
  associatedEntity?: string
  optional: boolean
}

const SCALAR_DATA_TYPES = [
  'String',
  'Integer',
      setSh
  }, [open])
  const vali

      er
 


      er

      errors.pus

  }
  const handleAdd = () => {
    const validation = validateField()
    if (!validation.valid) {
      return

      name: fieldName,
      type: fieldType,
      associatedEntity: (fieldType === 'TO_ONE' || fieldType 

    onFieldAdded(field)



    <Dialog open={open
        <DialogHeader>
            <Plus size={24} 
          </DialogTitle>
            Define a custom f
          </DialogDescr

     
            

          </Alert>
          <div className="grid 

              </Label>
                id="field-name"
                onChange={(e) => setFieldName(e.target.valu
                className={!validation.valid && !fieldName.trim() ? 'border-destructive' : ''
              <p className="text-xs text-muted-foreg
              </p>


              </Label>
                id="field-label"
     

              <p className="text-xs text-muted-foreground">
              </p>


              </Label>
   

                  <SelectIt
                      <span
                    </div>

                      <span>
                    </div>
            
     

                </SelectContent>
              <div cla
                <span>
                  {fie
                </span>
            </div>
            {f
     

                  <Sele
                  </SelectTrigger>
                    {SC
   

                </Select>

          

              <div className="grid gap-2">
                  Asso
                <Select 
                  onValueChange={setAssociat
                >
                    id="
                  >
                  </SelectTrigger>
                    {entities.map(entity => (
                        {entit
                    ))}

                  The entity that this f
              </d

              <Label>Field Req
                <Badge variant={optional ? "secondary" : "default"}>
                </Badge>
                  variant="ghos
                  

                </Button>
            </div>

            <div className="flex items-start gap-2">
                <Info 
                <War
              <div className="s
                <div className="t
                  <div><strong>Label:</strong> {fieldLabel || 
                  {fieldType === 'SCALAR' ? (
                  ) : (
                
                    </>
                  <div><strong>Is TO_MANY:</strong> {fieldType === 'TO_MANY' ? '✓ YES' 
                </
                  

                        <li key={index}>
                    </ul>
                )}
            </div>
        </div>
        <DialogFooter>
            Cancel
          <Button onClick={handleAdd}>
            Add Field
        </DialogFooter>
    </Dialog>
}



























































































                  The entity that this field references
                </p>
              </div>
            )}

            <div className="grid gap-2">
              <Label>Field Requirements</Label>
              <div className="flex items-center gap-2">
                <Badge variant={optional ? "secondary" : "default"}>
                  {optional ? '✓ Optional' : '✗ Required'}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOptional(!optional)}
                  className="h-7"
                >
                  Toggle
                </Button>
              </div>
            </div>
          </div>

          <Alert variant={validation.valid ? "default" : "destructive"}>
            <div className="flex items-start gap-2">
              {validation.valid ? (
                <Info size={18} className="mt-0.5" />
              ) : (
                <Warning size={18} className="mt-0.5" />
              )}
              <div className="space-y-1 flex-1">
                <div className="font-semibold">Field Summary</div>
                <div className="text-sm space-y-1">
                  <div><strong>Field:</strong> {fieldName || '(not set)'}</div>
                  <div><strong>Label:</strong> {fieldLabel || '(not set)'}</div>
                  <div><strong>Field Type:</strong> {fieldType}</div>
                  {fieldType === 'SCALAR' ? (
                    <div><strong>Data Type:</strong> {dataType}</div>
                  ) : (
                    <>
                      <div><strong>Association Type:</strong> {fieldType}</div>
                      <div><strong>Associated Entity:</strong> {associatedEntity || '(not set)'}</div>
                    </>
                  )}
                  <div><strong>Is TO_MANY:</strong> {fieldType === 'TO_MANY' ? '✓ YES' : '✗ NO'}</div>
                  <div><strong>Is TO_ONE:</strong> {fieldType === 'TO_ONE' ? '✓ YES' : '✗ NO'}</div>
                </div>
                {!validation.valid && validation.errors.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="font-semibold">Validation Errors:</div>
                    <ul className="list-disc list-inside text-sm">
                      {validation.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd}>
            <Plus size={18} />
            Add Field
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
