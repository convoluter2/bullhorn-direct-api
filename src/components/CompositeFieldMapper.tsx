import { useState } from 'react'
import { Alert, AlertDescription } from '@/comp
import { Card, CardContent, CardHeader, CardTitle } from '@/com
import { Badge } from '@/components/ui/badge'
import { Info } from '@phosphor-icons/react'

  compositeField: {
    label: string
import { Info } from '@phosphor-icons/react'
import type { CSVMapping } from '@/lib/types'

      dataType: string
      required?: boolean
    }>
  }
  csvHeaders: string[]
  currentMappings: CSVMapping[]
  onMappingsChange: (fieldName: string, subFieldMappings: Array<{ subField: string; csvColumn: string }>) => void
}

export function CompositeFieldMapper({
  compositeField,
  csvHeaders,
  currentMappings,
  onMappingsChange
}: CompositeFieldMapperProps) {
  const subFields = compositeField.fields || []
  
  const getCurrentMapping = (subFieldName: string): string => {
    const mapping = currentMappings.find(m => 
      m.bullhornField === compositeField.name && 
      m.subField === subFieldName
    )
    return mapping?.csvColumn || ''
  }

  const handleSubFieldChange = (subFieldName: string, csvColumn: string) => {
    const existingMappings = currentMappings
      .filter(m => m.bullhornField === compositeField.name && m.subField)
      .map(m => ({ subField: m.subField!, csvColumn: m.csvColumn }))
    
    const updatedMappings = existingMappings.filter(m => m.subField !== subFieldName)
    
    if (csvColumn) {
      updatedMappings.push({ subField: subFieldName, csvColumn })
    }
    
    onMappingsChange(compositeField.name, updatedMappings)
  }

  return (
    <Card className="border-accent/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Badge variant="secondary" className="font-mono text-xs">
              COMPOSITE
            </Badge>
            {compositeField.label}
            {compositeField.required && (
              <Badge variant="destructive" className="text-xs">Required</Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4 text-blue-500" />
          <AlertDescription className="text-xs">
            <div className="font-semibold mb-1">Composite Field</div>
            <div>Map your CSV columns to the sub-fields of this composite field.</div>
          </AlertDescription>
        </Alert>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sub-Field</TableHead>
              <TableHead>CSV Column</TableHead>
            <div>Map your CSV columns to the sub-fields of this composite field.</div>
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
                  )}
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
                  )}
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
