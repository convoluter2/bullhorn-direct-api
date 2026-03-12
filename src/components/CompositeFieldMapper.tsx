import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Info, Warning, Plus, Trash } from '@phosphor-icons/react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { EntityFieldMetadata } from '@/lib/entity-metadata'
import type { CSVMapping } from '@/lib/types'

interface CompositeFieldMapperProps {
  compositeField: EntityFieldMetadata
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
            <CardTitle className="text-base flex items-center gap-2">
              <Badge variant="outline" className="bg-accent/10">COMPOSITE</Badge>
              {compositeField.label}
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Map CSV columns to {compositeField.name} sub-fields
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {compositeField.dataType === 'Address' && (
          <Alert className="bg-muted/30">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <div className="font-semibold mb-1">Address Field Mapping</div>
              <div>Map your CSV columns to the address sub-fields below. The data will be sent as a nested object to Bullhorn's API.</div>
              <div className="mt-2 font-mono text-xs bg-background/50 p-2 rounded">
                Example: {`{ address: { address1: "123 Main St", city: "New York", state: "NY", zip: "10001", countryID: 1 } }`}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Sub-Field</TableHead>
              <TableHead className="w-[15%]">Type</TableHead>
              <TableHead className="w-[45%]">CSV Column</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subFields.map((subField) => (
              <TableRow key={subField.name}>
                <TableCell className="font-medium">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm">{subField.label}</span>
                    <span className="text-xs text-muted-foreground font-mono">{subField.name}</span>
                    {subField.name === 'countryID' && (
                      <span className="text-xs text-orange-500">Requires numeric country ID</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs">
                    {subField.dataType}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Select
                    value={localMappings[subField.name] || '__skip__'}
                    onValueChange={(value) => handleSubFieldChange(subField.name, value)}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Skip this field" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__skip__">
                        <span className="text-muted-foreground">Skip this field</span>
                      </SelectItem>
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

        {subField.name === 'countryID' && subFields.some(sf => sf.name === 'countryID') && (
          <Alert className="bg-orange-500/10 border-orange-500/20">
            <Info className="h-4 w-4 text-orange-500" />
            <AlertDescription className="text-xs">
              <div className="font-semibold text-orange-700 dark:text-orange-400">Country ID Requirements</div>
              <div className="mt-1">
                The <code className="font-mono bg-background/50 px-1 rounded">countryID</code> field must contain numeric country IDs (e.g., 1 for United States, 2 for Canada).
              </div>
              <div className="mt-1">
                You can retrieve valid country IDs using: <code className="font-mono bg-background/50 px-1 rounded text-xs">GET /meta/Candidate?fields=address(countryID)</code>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
