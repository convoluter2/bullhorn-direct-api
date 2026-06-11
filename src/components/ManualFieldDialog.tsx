import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { Plus, Info, Warning } from '@phosphor-icons/react'
import { useEntities } from '@/hooks/use-entities'

interface ManualFieldDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
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
  'Double',
  'Boolean',
  'Timestamp',
  'BigDecimal',
  'Address',
]

export function ManualFieldDialog({ open, onOpenChange, onFieldAdded, existingFields = [] }: ManualFieldDialogProps) {
  const [fieldName, setFieldName] = useState('')
  const [fieldLabel, setFieldLabel] = useState('')
  const [fieldType, setFieldType] = useState<'SCALAR' | 'TO_ONE' | 'TO_MANY'>('SCALAR')
  const [dataType, setDataType] = useState('String')
  const [associatedEntity, setAssociatedEntity] = useState('')
  const [optional, setOptional] = useState(false)
  const [validation, setValidation] = useState<{ valid: boolean; errors: string[] }>({ valid: true, errors: [] })
  
  const { entities, loading: entitiesLoading } = useEntities()

  useEffect(() => {
    if (!open) {
      setFieldName('')
      setFieldLabel('')
      setFieldType('SCALAR')
      setDataType('String')
      setAssociatedEntity('')
      setOptional(false)
      setValidation({ valid: true, errors: [] })
    }
  }, [open])

  const validateField = () => {
    const errors: string[] = []

    if (!fieldName.trim()) {
      errors.push('Field name is required')
    }

    if (existingFields.includes(fieldName.trim())) {
      errors.push(`A field with this name already exists in the available fields list`)
      console.log(`⚠️ Field "${fieldName.trim()}" already exists in:`, existingFields)
    }

    if (!fieldLabel.trim()) {
      errors.push('Field label is required')
    }

    if ((fieldType === 'TO_ONE' || fieldType === 'TO_MANY') && !associatedEntity) {
      errors.push('Associated entity is required for TO_ONE and TO_MANY fields')
    }

    return { valid: errors.length === 0, errors }
  }

  useEffect(() => {
    setValidation(validateField())
  }, [fieldName, fieldLabel, fieldType, dataType, associatedEntity, optional])

  const handleAdd = () => {
    const validation = validateField()
    if (!validation.valid) {
      return
    }

    const field: ManualFieldDefinition = {
      name: fieldName,
      label: fieldLabel,
      type: fieldType,
      dataType: fieldType === 'SCALAR' ? dataType : 'Integer',
      associatedEntity: (fieldType === 'TO_ONE' || fieldType === 'TO_MANY') ? associatedEntity : undefined,
      optional,
    }

    onFieldAdded(field)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus size={24} />
            Add Custom Field
          </DialogTitle>
          <DialogDescription>
            Define a custom field to add to your query or operation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <Info size={18} />
            <div className="ml-2">
              <div className="font-semibold">Manual Field Definition</div>
              <div className="text-sm text-muted-foreground">
                Use this to add fields that may not be in the metadata or to define custom field structures
              </div>
            </div>
          </Alert>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="field-name">
                Field Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="field-name"
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
                placeholder="e.g., customText1"
                className={!validation.valid && !fieldName.trim() ? 'border-destructive' : ''}
              />
              <p className="text-xs text-muted-foreground">
                The exact field name as it appears in the API (case-sensitive)
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="field-label">
                Field Label <span className="text-destructive">*</span>
              </Label>
              <Input
                id="field-label"
                value={fieldLabel}
                onChange={(e) => setFieldLabel(e.target.value)}
                placeholder="e.g., Custom Text 1"
                className={!validation.valid && !fieldLabel.trim() ? 'border-destructive' : ''}
              />
              <p className="text-xs text-muted-foreground">
                A human-readable label for this field
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="field-type">Field Type</Label>
              <Select value={fieldType} onValueChange={(value) => setFieldType(value as 'SCALAR' | 'TO_ONE' | 'TO_MANY')}>
                <SelectTrigger id="field-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SCALAR">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">SCALAR</Badge>
                      <span className="text-xs text-muted-foreground">Simple value field</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="TO_ONE">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">TO_ONE</Badge>
                      <span className="text-xs text-muted-foreground">Single entity reference</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="TO_MANY">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">TO_MANY</Badge>
                      <span className="text-xs text-muted-foreground">Multiple entity references</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">
                <span className="font-semibold">Current:</span>{' '}
                <span>
                  {fieldType === 'SCALAR' && 'A simple data field (text, number, date, etc.)'}
                  {fieldType === 'TO_ONE' && 'References a single related entity'}
                  {fieldType === 'TO_MANY' && 'References multiple related entities'}
                </span>
              </div>
            </div>

            {fieldType === 'SCALAR' ? (
              <div className="grid gap-2">
                <Label htmlFor="data-type">Data Type</Label>
                <Select value={dataType} onValueChange={setDataType}>
                  <SelectTrigger id="data-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCALAR_DATA_TYPES.map(type => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="associated-entity">
                  Associated Entity <span className="text-destructive">*</span>
                </Label>
                <Select 
                  value={associatedEntity} 
                  onValueChange={setAssociatedEntity}
                  disabled={entitiesLoading}
                >
                  <SelectTrigger 
                    id="associated-entity"
                    className={!validation.valid && !associatedEntity ? 'border-destructive' : ''}
                  >
                    <SelectValue placeholder="Select an entity..." />
                  </SelectTrigger>
                  <SelectContent>
                    {entities.map(entity => (
                      <SelectItem key={entity} value={entity}>
                        {entity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
          <Button onClick={handleAdd} disabled={!validation.valid}>
            <Plus size={18} />
            Add Field
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
