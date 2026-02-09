import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Database as DatabaseIcon } from '@phosphor-icons/react'
import type { EntityFieldMetadata } from '@/lib/entity-metadata'

interface FieldTableProps {
  fields: EntityFieldMetadata[]
}

export function FieldTable({ fields }: FieldTableProps) {
  const getTypeColor = (type: string) => {
    const typeMap: Record<string, string> = {
      'ID': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      'SCALAR': 'bg-green-500/10 text-green-400 border-green-500/20',
      'TO_ONE': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      'TO_MANY': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      'COMPOSITE': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
    }
    return typeMap[type] || 'bg-muted text-muted-foreground border-border'
  }

  const getDataTypeColor = (dataType: string) => {
    const typeMap: Record<string, string> = {
      'String': 'text-yellow-400',
      'Integer': 'text-blue-400',
      'BigDecimal': 'text-cyan-400',
      'Double': 'text-cyan-400',
      'Boolean': 'text-green-400',
      'Timestamp': 'text-purple-400',
      'Date': 'text-purple-400'
    }
    return typeMap[dataType] || 'text-foreground'
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left py-3 px-4 text-sm font-semibold">Field Name</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">Type</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">Data Type</th>
              <th className="text-center py-3 px-4 text-sm font-semibold">Required</th>
              <th className="text-center py-3 px-4 text-sm font-semibold">Read Only</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">Max Length</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">Associated Entity</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field, index) => (
              <tr 
                key={field.name}
                className={`
                  border-b border-border/50 hover:bg-muted/30 transition-colors
                  ${index % 2 === 0 ? 'bg-card' : 'bg-card/50'}
                `}
              >
                <td className="py-3 px-4">
                  <div className="flex flex-col gap-1">
                    <code className="text-sm font-mono text-accent font-medium">
                      {field.name}
                    </code>
                    {field.label !== field.name && (
                      <span className="text-xs text-muted-foreground">
                        {field.label}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <Badge 
                    variant="outline" 
                    className={`font-mono text-xs ${getTypeColor(field.type)}`}
                  >
                    {field.type}
                  </Badge>
                </td>
                <td className="py-3 px-4">
                  <code className={`text-sm font-mono ${getDataTypeColor(field.dataType)}`}>
                    {field.dataType}
                    {field.dataSpecialization && (
                      <span className="text-muted-foreground">
                        ({field.dataSpecialization})
                      </span>
                    )}
                  </code>
                </td>
                <td className="py-3 px-4 text-center">
                  {field.required ? (
                    <CheckCircle className="text-green-400 mx-auto" size={18} />
                  ) : (
                    <XCircle className="text-muted-foreground/50 mx-auto" size={18} />
                  )}
                </td>
                <td className="py-3 px-4 text-center">
                  {field.readonly ? (
                    <CheckCircle className="text-blue-400 mx-auto" size={18} />
                  ) : (
                    <XCircle className="text-muted-foreground/50 mx-auto" size={18} />
                  )}
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm text-foreground">
                    {field.maxLength || '—'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  {field.associatedEntity ? (
                    <div className="flex items-center gap-2">
                      <DatabaseIcon size={14} className="text-accent" />
                      <code className="text-sm font-mono text-accent">
                        {field.associatedEntity.entity}
                      </code>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
