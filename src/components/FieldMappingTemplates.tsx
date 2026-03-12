import { useState } from 'react'
import { Button } from '@/components/ui/but
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FloppyDisk, FolderOpen, Trash, FileT
import type { CSVMapping } from '@/lib/types'

  id: string
  description?: string
  mappings: CSVMapping[]

}
interface Fi
  currentMappi
}
export function 
  const [saveDialogOpen,
  const [templateNa

    if (!templateNam
 

      toast.error('Please select an en
    }
    const validMappings = curre
    )
 


      id: `template-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      description: templateDescription.trim() || undefined,
      mappings: validMappings,
      updatedAt: Date.now(),
    }

    toast.success(`Template "${templ
    setTemplateName('')
    setSaveDialogOpen(false)

    i


      ...template,
      update



    setLoadDialogOpen(false)
    t

    const template = templates?.find(
    if (!template) return
    if (conf
     

  const entityTemplates = (templates || []).fil

    m && m.csvColumn && m.bullho

    <div className="flex ite
        <DialogTrigger asChild
            variant="outline
            disabled={!curre
            <Floppy
     

            <DialogTitle>Save Field Mapping Template</DialogTitl

          </DialogHeader>
    
              <Label ht
                id="template-n
                value={templ
   

                }}
            </div>
            <div className="space-y-2">
            
     

            </div>
            <Alert
              <AlertDescription>
              </AlertDescri
     

              Cancel
            <Button onClick={handleSaveTemplate}>
     

      </Dialog>
      <Dialog open={loadDial
    
            size="sm"
   

              <Badge variant="secondary" className="ml-2
              </Badge>
    
        <DialogContent cl

              Select a saved template to apply field mapp
          </DialogHeader>
          {allTemplates.length === 0 ? 
     
   

          ) : entityTemplates.length === 0 ? (
              <Alert>

                </AlertDescription>
              
   

          
                            <CardTitle classN
                              <Badge variant="outline" className="fon
                              <
                  
                              
                     
                          <Button
           
                          >
                         
                   
                        
                          <span className="f
                        
                          <span>Used {template.usageCount} time{te
                      </CardCon
                  ))}
              </ScrollArea>
          ) : (
          
                  <Card 
                    className="cursor-p
                  >
                    
                          <CardTit
                          </CardTitle>
                            <CardDes
                            </CardDescription>
                        </div>
                          variant="ghost"
                          onClick={(e) =
                   
                  
                
                  

                        <span className
                          {formatDistanceToNow(template.createdAt, { addSuffix: tr
                    
                      
                        <p className="text-xs text-muted-foreground mb-2">Field 
                          {template.mapping
                              {mapping.csvColumn} → {mapping.bullhornFie
                
                  

                   
                    </CardContent
                ))}
            </ScrollArea>

            <Button 
            </Bu

    </div>
}









































































































































































