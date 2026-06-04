import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, Info, Warning } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useEntities } from '@/hooks/use-entities'

interface ManualFieldDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentEntity: string
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
  'BigDecimal',
  'Boolean',
  'Timestamp',
  'Date'
]

export function ManualFieldDialog({ 
  open, 
  onOpenChange, 
  currentEntity,
  onFieldAdded,
  existingFields = []
}: ManualFieldDialogProps) {
  const [fieldName, setFieldName] = useState('')
  const [fieldLabel, setFieldLabel] = useState('')
  const [fieldType, setFieldType] = useState<'SCALAR' | 'TO_ONE' | 'TO_MANY'>('SCALAR')
  const [dataType, setDataType] = useState('String')
  const [associatedEntity, setAssociatedEntity] = useState('')
  const [optional, setOptional] = useState(true)
  const [showValidation, setShowValidation] = useState(false)

  const { entities, loading: entitiesLoading } = useEntities()

  useEffect(() => {
    if (open) {
      setFieldName('')
      setFieldLabel('')
      setFieldType('SCALAR')
      setDataType('String')
      setAssociatedEntity('')
      setOptional(true)
      setShowValidation(false)
    }
  }, [open])

  const validateField = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = []

    if (!fieldName.trim()) {
      errors.push('Field name is required')
    } else if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(fieldName)) {
      errors.push('Field name must start with a letter and contain only letters and numbers')
    } else if (existingFields.includes(fieldName)) {
      errors.push('A field with this name already exists')
    }

    if (!fieldLabel.trim()) {
      errors.push('Field label is required')
    }

    if ((fieldType === 'TO_ONE' || fieldType === 'TO_MANY') && !associatedEntity) {
      errors.push('Associated entity is required for TO_ONE and TO_MANY fields')
    }

    return { valid: errors.length === 0, errors }
  }

  const handleAdd = () => {
    setShowValidation(true)
    const validation = validateField()

    if (!validation.valid) {
      toast.error(validation.errors[0])
      return
    }

    const field: ManualFieldDefinition = {
      name: fieldName,
      label: fieldLabel,
      type: fieldType,
      dataType: fieldType === 'SCALAR' ? dataType : 'Integer',
      associatedEntity: (fieldType === 'TO_ONE' || fieldType === 'TO_MANY') ? associatedEntity : undefined,
      optional
    }

    onFieldAdded(field)
    toast.success(`Field "${fieldLabel}" added successfully`)
    onOpenChange(false)
  }

  const validation = showValidation ? validateField() : { valid: true, errors: [] }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus size={24} weight="bold" />
            Add Manual Field to {currentEntity}
          </DialogTitle>
          <DialogDescription>
            Define a custom field that will be available for mapping in this entity. 
            This field will persist for future use.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <Alert>
            <Info size={18} />
            <AlertDescription>
              Manual fields are stored locally and will be available whenever you work with this entity. 
              They represent fields that may not be automatically detected but are valid in the Bullhorn API.
            </AlertDescription>
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
                placeholder="e.g., customFloat3, customText1"
                className={!validation.valid && !fieldName.trim() ? 'border-destructive' : ''}
              />
              <p className="text-xs text-muted-foreground">
                The exact field name as it appears in the Bullhorn API (case-sensitive)
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
                placeholder="e.g., Custom Float 3, Custom Text 1"
                className={!validation.valid && !fieldLabel.trim() ? 'border-destructive' : ''}
              />
              <p className="text-xs text-muted-foreground">
                A human-readable label for this field
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="field-type">
                Field Type <span className="text-destructive">*</span>
              </Label>
              <Select value={fieldType} onValueChange={(value: any) => setFieldType(value)}>
                <SelectTrigger id="field-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SCALAR">
                    <div className="flex items-center gap-2">
                      <span>SCALAR</span>
                      <Badge variant="outline" className="text-xs">Simple Value</Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="TO_ONE">
                    <div className="flex items-center gap-2">
                      <span>TO_ONE</span>
                      <Badge variant="outline" className="text-xs">Single Association</Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="TO_MANY">
                    <div className="flex items-center gap-2">
                      <span>TO_MANY</span>
                      <Badge variant="outline" className="text-xs">Multiple Associations</Badge>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info size={14} className="mt-0.5 flex-shrink-0" />
                <span>
                  {fieldType === 'SCALAR' && 'A simple scalar value (text, number, date, etc.)'}
                  {fieldType === 'TO_ONE' && 'A reference to a single record in another entity'}
                  {fieldType === 'TO_MANY' && 'A reference to multiple records in another entity'}
                </span>
              </div>
            </div>

            {fieldType === 'SCALAR' && (
              <div className="grid gap-2">
                <Label htmlFor="data-type">
                  Data Type <span className="text-destructive">*</span>
                </Label>
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
                <p className="text-xs text-muted-foreground">
                  The data type of the scalar value
                </p>
              </div>
            )}

            {(fieldType === 'TO_ONE' || fieldType === 'TO_MANY') && (
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
                    <SelectValue placeholder="Select entity..." />
                  </SelectTrigger>
                  <SelectContent>
                    {entities.map(entity => (
                      <SelectItem key={entity} value={entity}>
                        {entity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
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
