import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/s
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Info, Warning, Plus, Trash } from '@phosphor-icons/react'
import type { CSVMapping } from '@/lib/types'
interface CompositeFieldMapperProps {
  csvHeaders: string[]


  compositeField,
  currentMappings,
}: CompositeFieldMapperProps) {
  onMappingsChange: (fieldName: string, subFieldMappings: Array<{ subField: string; csvColumn: string }>) => void
}

export function CompositeFieldMapper({
  compositeField,
  csvHeaders,
  currentMappings,
  onMappingsChange
}: CompositeFieldMapperProps) {
  const [localMappings, setLocalMappings] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    currentMappings.forEach(m => {
      if (m.compositeSubField && m.bullhornField === compositeField.name) {
        initial[m.compositeSubField] = m.csvColumn
      }
    })
    return initial
  })

  const handleSubFieldChange = (subFieldName: string, csvColumn: string) => {
    const updated = { ...localMappings, [subFieldName]: csvColumn }
    setLocalMappings(updated)
    
    const subFieldMappings = Object.entries(updated)
      .filter(([_, col]) => col && col !== '__skip__')
      .map(([subField, csvColumn]) => ({ subField, csvColumn }))
    
    onMappingsChange(compositeField.name, subFieldMappings)
  }

  const subFields = compositeField.compositeFields || []

  if (subFields.length === 0) {
    return (
      <Alert>
        <Warning className="h-4 w-4" />
        <AlertDescription>
          No sub-fields available for composite field "{compositeField.label}"
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Card className="border-accent/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
      <CardContent className="space-y-3">
          <Alert className="bg-muted/30">
            <AlertDescription classN
              <div>Map y
                Example: {`{ address: { address1: "123
            </AlertDescription>
        )}
        <Table>
            <T
              <Tabl
            </TableRow>
          <TableBody>
              <TableRow key={subField.nam
                  <div className="flex f
                    <span className="text-xs text-
                      <span className="text-xs text-orange-500">Requires nume
                  </div>
                <TableCell>
                    {subField.dataType}
                </Ta
                  <Select
                  
          

               
                      <
                      
                        </SelectItem>
                    </SelectContent>
                </TableCell>
            ))}
        </Table>
        {subField.nam
            <Info className="h-4 w-4 text-
              <div className="font-semibold 
                The <code className="font-mono bg-b
              <div className="mt-1">
              </div>
          </Alert>
      </CardContent>
  )



















































