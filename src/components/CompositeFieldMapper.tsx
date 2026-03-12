import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/butto
import { Alert, AlertDescription } from '@/co
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Info, Warning, Plus, Trash } from '@phosphor-icons/react'
import type { CSVMapping } from '@/lib/types'

interface CompositeFieldMapperProps {
      label: string
  compositeField: {
    }>
    label: string
  onMappingsChange: (fieldNam
      name: string
export function Com
      dataType: string
      required?: boolean
    }>
  c
  currentMappings: CSVMapping[]
  onMappingsChange: (fieldName: string, subFieldMappings: Array<{ subField: string; csvColumn: string }>) => void
 

export function CompositeFieldMapper({
  compositeField,
  csvHeaders,
  currentMappings,
  onMappingsChange
    )

    <Card className="border-accent/20">
        <div className="flex items
            <CardTitle className="text-lg flex items-center gap-2">
              <Badge variant="secondary" className
       
      
        </div>
    

            <div>Map your CSV columns to the sub-fields of this composite fie
              Example: {`{ address: { address1: "123 Main St", city
          </AlertDescription>

          <TableHeader>
              <TableHead>Sub-Field</TableHead>
              <TableHead>CSV Column</TableHead>
    
            {subFields.map((subField) => (
   

                    {subField.required && (

                </TableCell>
            
             
                <TableCell>
                    value=
                  >
                      <Sele
              
     
   

          
              </TableRow>
          </TableBody>

          <Aler
            <AlertDescription className="text-xs">
              <div>
              </div>
                Make sur
            </AlertDescription>
        )}
    </Card>
}
















































                      {csvHeaders.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {subFields.some(f => f.name === 'address1') && (
          <Alert>
            <Info className="h-4 w-4 text-blue-500" />
            <AlertDescription className="text-xs">
              <div className="font-semibold mb-1">Address Field Tips</div>
              <div>
                The <code className="font-mono bg-muted px-1 py-0.5 rounded">address</code> composite field typically includes: address1, address2, city, state, zip, countryID
              </div>
              <div className="mt-1 text-muted-foreground">
                Make sure your CSV has corresponding columns for each address component you want to populate.
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
