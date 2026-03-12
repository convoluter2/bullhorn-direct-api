import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { CSVMapping } from '@/lib/types'
interface CompositeFieldMapperProps {
    label: string
    required?: boolean
import type { CSVMapping } from '@/lib/types'

interface CompositeFieldMapperProps {
  compositeField: {
    label: string
    name: string
    required?: boolean
    fields?: Array<{
}: CompositeFieldM
  
    const mapping = cu
      m.subField === sub
    re

    const existingMapp
      .map(m => ({ subField: m.
    const updatedMappings = existingMappings.filter(m => m.subField !== subFieldName)
 

    onMappingsChange(compositeField.na

    <Card cla
        <div class
            <Badge
            </Badge>
            {compositeField.required && (
  
        </div>
      <CardContent className="space-y-4">
          <Info className="h-4 w-4 text-blue-500"
            <div className="font-
     

   

            </TableRow>
          <TableBody>
              <TableRow key={subField.name}>
                  <div className="flex items-center gap-2">
    
                    )}
    
                  )}
                <TableCell>
     
    
                      <SelectValue placeholder="Select CSV
   

          
                    </SelectContent>
                </
            ))}
        </Table>
        {subFields.some(f => f.name === 'address1') && (
            <Info class
              <div c
                The <code classNam
              <div className="mt-1 text-m
              </div>
          </Al
      </CardContent>
  )







          </AlertDescription>
        </Alert>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sub-Field</TableHead>
              <TableHead>CSV Column</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subFields.map((subField) => (
              <TableRow key={subField.name}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Label className="font-mono text-xs">{subField.name}</Label>
                    {subField.required && (
                      <Badge variant="outline" className="text-xs">Required</Badge>
                    )}
                  </div>
                  {subField.label && subField.label !== subField.name && (
                    <div className="text-xs text-muted-foreground mt-1">{subField.label}</div>

                </TableCell>
                <TableCell>
                  <Select
                    value={getCurrentMapping(subField.name)}
                    onValueChange={(value) => handleSubFieldChange(subField.name, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select CSV column..." />
                    </SelectTrigger>
                    <SelectContent>
                      {csvHeaders.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}

                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>

          </TableBody>


        {subFields.some(f => f.name === 'address1') && (
          <Alert>
            <Info className="h-4 w-4 text-blue-500" />
            <AlertDescription className="text-xs">
              <div className="font-semibold mb-1">Address Field Tips</div>
              <div>
                The <code className="font-mono bg-muted px-1 py-0.5 rounded">address</code> composite field typically includes: address1, address2, city, state, zip, countryID

              <div className="mt-1 text-muted-foreground">
                Make sure your CSV has corresponding columns for each address component you want to populate.
              </div>
            </AlertDescription>

        )}

    </Card>

}
