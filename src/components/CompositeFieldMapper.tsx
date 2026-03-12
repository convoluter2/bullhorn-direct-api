import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Info, Warning, Plus, Trash } from '@phosphor-icons/react'
import type { CSVMapping } from '@/lib/types'

interface CompositeFieldMapperProps {
  csvHeaders: string[]
  compositeField: {
    name: string
    label: string
    compositeFields?: Array<{
      name: string
      label: string
      dataType: string
      required?: boolean
    }>
  }
  currentMappings: CSVMapping[]
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
            <CardTitle className="text-lg flex items-center gap-2">
              {compositeField.label}
              <Badge variant="secondary" className="text-xs">Composite</Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {compositeField.name}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Alert className="bg-muted/30">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <div>Map your CSV columns to the sub-fields of this composite field.</div>
            <div className="mt-1 font-mono text-xs">
              Example: {`{ address: { address1: "123 Main St", city: "Boston" } }`}
            </div>
          </AlertDescription>
        </Alert>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sub-Field</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>CSV Column</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subFields.map((subField) => (
              <TableRow key={subField.name}>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="font-medium">{subField.label}</div>
                    <span className="text-xs text-muted-foreground font-mono">{subField.name}</span>
                    {subField.required && (
                      <span className="text-xs text-orange-500">Required</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {subField.dataType}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Select
                    value={localMappings[subField.name] || '__skip__'}
                    onValueChange={(value) => handleSubFieldChange(subField.name, value)}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__skip__">Skip this field</SelectItem>
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
