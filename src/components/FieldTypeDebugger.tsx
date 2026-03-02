import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CheckCircle, XCircle, Info } from '@phosphor-icons/react'
import type { EntityField } from '@/hooks/use-entity-metadata'

interface FieldTypeDebuggerProps {
  field: EntityField
  testName: string
}

export function FieldTypeDebugger({ field, testName }: FieldTypeDebuggerProps) {
  const isToMany = field.type === 'TO_MANY' || field.associationType === 'TO_MANY'
  const hasAssociatedEntity = !!field.associatedEntity?.entity

  console.log(`🔍 FieldTypeDebugger - ${testName}:`, {
    fieldName: field.name,
    type: field.type,
    associationType: field.associationType,
    dataType: field.dataType,
    associatedEntity: field.associatedEntity?.entity,
    isToMany,
    hasAssociatedEntity,
    fullField: field
  })

  return (
    <Card className="border-2 border-accent/30">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Info className="text-accent" size={16} />
          Field Type Debug: {testName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="space-y-1">
            <div className="text-muted-foreground">Field Name:</div>
            <div className="font-mono font-semibold">{field.name}</div>
          </div>
          <div className="space-y-1">
            <div className="text-muted-foreground">Label:</div>
            <div className="font-semibold">{field.label}</div>
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t">
          <div className="font-semibold text-xs">Type Detection:</div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <div className="text-muted-foreground text-xs">field.type</div>
              <Badge variant={field.type === 'TO_MANY' ? 'default' : 'secondary'}>
                {field.type || 'undefined'}
              </Badge>
            </div>
            <div className="space-y-1">
              <div className="text-muted-foreground text-xs">field.associationType</div>
              <Badge variant={field.associationType === 'TO_MANY' ? 'default' : 'secondary'}>
                {field.associationType || 'undefined'}
              </Badge>
            </div>
            <div className="space-y-1">
              <div className="text-muted-foreground text-xs">field.dataType</div>
              <Badge variant="outline">
                {field.dataType || 'undefined'}
              </Badge>
            </div>
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t">
          <div className="font-semibold text-xs">Associated Entity:</div>
          <div className="flex items-center gap-2">
            {hasAssociatedEntity ? (
              <>
                <CheckCircle className="text-green-500" size={16} />
                <Badge className="bg-green-500/10 text-green-700 dark:text-green-400">
                  {field.associatedEntity?.entity}
                </Badge>
              </>
            ) : (
              <>
                <XCircle className="text-red-500" size={16} />
                <span className="text-xs text-muted-foreground">No associated entity</span>
              </>
            )}
          </div>
        </div>

        <div className="pt-2 border-t">
          <Alert className={isToMany ? 'border-green-500 bg-green-500/10' : 'border-red-500 bg-red-500/10'}>
            {isToMany ? (
              <>
                <CheckCircle className="text-green-500" />
                <AlertTitle className="text-green-700 dark:text-green-400">
                  ✅ Correctly Detected as TO_MANY
                </AlertTitle>
                <AlertDescription className="text-xs text-green-600 dark:text-green-500">
                  This field should render the ToManyFieldInput component
                </AlertDescription>
              </>
            ) : (
              <>
                <XCircle className="text-red-500" />
                <AlertTitle className="text-red-700 dark:text-red-400">
                  ❌ NOT Detected as TO_MANY
                </AlertTitle>
                <AlertDescription className="text-xs text-red-600 dark:text-red-500">
                  This field will render a regular input instead of ToManyFieldInput
                </AlertDescription>
              </>
            )}
          </Alert>
        </div>

        <div className="pt-2 border-t">
          <details className="text-xs">
            <summary className="cursor-pointer font-semibold text-muted-foreground hover:text-foreground">
              Full Field Object (JSON)
            </summary>
            <pre className="mt-2 p-2 bg-muted rounded border overflow-auto text-[10px] font-mono">
              {JSON.stringify(field, null, 2)}
            </pre>
          </details>
        </div>
      </CardContent>
    </Card>
  )
}
