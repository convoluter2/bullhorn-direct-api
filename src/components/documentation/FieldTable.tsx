import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Database as DatabaseIcon, CaretUp, CaretDown, CaretUpDown, X, Funnel } from '@phosphor-icons/react'
import type { EntityFieldMetadata } from '@/lib/entity-metadata'

interface FieldTableProps {
  fields: EntityFieldMetadata[]
}

type SortField = 'name' | 'type' | 'dataType' | 'required' | 'readonly' | 'associatedEntity'
type SortDirection = 'asc' | 'desc' | null

export function FieldTable({ fields }: FieldTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [dataTypeFilter, setDataTypeFilter] = useState<string>('all')
  const [requiredFilter, setRequiredFilter] = useState<string>('all')
  const [readonlyFilter, setReadonlyFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const uniqueTypes = useMemo(() => {
    const types = new Set(fields.map(f => f.type))
    return Array.from(types).sort()
  }, [fields])

  const uniqueDataTypes = useMemo(() => {
    const types = new Set(fields.map(f => f.dataType))
    return Array.from(types).sort()
  }, [fields])

  const filteredAndSortedFields = useMemo(() => {
    let result = [...fields]

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(field => 
        field.name.toLowerCase().includes(term) ||
        field.label.toLowerCase().includes(term) ||
        field.dataType.toLowerCase().includes(term) ||
        (field.associatedEntity?.entity || '').toLowerCase().includes(term)
      )
    }

    if (typeFilter !== 'all') {
      result = result.filter(field => field.type === typeFilter)
    }

    if (dataTypeFilter !== 'all') {
      result = result.filter(field => field.dataType === dataTypeFilter)
    }

    if (requiredFilter !== 'all') {
      result = result.filter(field => 
        requiredFilter === 'required' ? field.required : !field.required
      )
    }

    if (readonlyFilter !== 'all') {
      result = result.filter(field => 
        readonlyFilter === 'readonly' ? field.readonly : !field.readonly
      )
    }

    if (sortDirection) {
      result.sort((a, b) => {
        let aVal: any
        let bVal: any

        switch (sortField) {
          case 'name':
            aVal = a.name.toLowerCase()
            bVal = b.name.toLowerCase()
            break
          case 'type':
            aVal = a.type
            bVal = b.type
            break
          case 'dataType':
            aVal = a.dataType
            bVal = b.dataType
            break
          case 'required':
            aVal = a.required ? 1 : 0
            bVal = b.required ? 1 : 0
            break
          case 'readonly':
            aVal = a.readonly ? 1 : 0
            bVal = b.readonly ? 1 : 0
            break
          case 'associatedEntity':
            aVal = a.associatedEntity?.entity || ''
            bVal = b.associatedEntity?.entity || ''
            break
          default:
            return 0
        }

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    return result
  }, [fields, searchTerm, typeFilter, dataTypeFilter, requiredFilter, readonlyFilter, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => {
        if (prev === 'asc') return 'desc'
        if (prev === 'desc') return null
        return 'asc'
      })
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field || !sortDirection) {
      return <CaretUpDown size={14} className="text-muted-foreground" />
    }
    return sortDirection === 'asc' 
      ? <CaretUp size={14} className="text-accent" />
      : <CaretDown size={14} className="text-accent" />
  }

  const clearFilters = () => {
    setSearchTerm('')
    setTypeFilter('all')
    setDataTypeFilter('all')
    setRequiredFilter('all')
    setReadonlyFilter('all')
    setSortField('name')
    setSortDirection('asc')
  }

  const hasActiveFilters = searchTerm || typeFilter !== 'all' || dataTypeFilter !== 'all' || 
    requiredFilter !== 'all' || readonlyFilter !== 'all'

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
    <div className="space-y-4">
      <div className="flex flex-col gap-4 p-4 bg-card/50 border border-border rounded-lg">
        <div className="flex items-center gap-2">
          <Funnel size={18} className="text-accent" />
          <h3 className="font-semibold">Filters & Search</h3>
          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearFilters}
              className="ml-auto"
            >
              <X size={16} />
              Clear All
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <Input
            placeholder="Search fields..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="col-span-1 md:col-span-2"
          />

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {uniqueTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={dataTypeFilter} onValueChange={setDataTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Data Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Data Types</SelectItem>
              {uniqueDataTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={requiredFilter} onValueChange={setRequiredFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Required" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Fields</SelectItem>
              <SelectItem value="required">Required Only</SelectItem>
              <SelectItem value="optional">Optional Only</SelectItem>
            </SelectContent>
          </Select>

          <Select value={readonlyFilter} onValueChange={setReadonlyFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Read Only" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Fields</SelectItem>
              <SelectItem value="readonly">Read Only</SelectItem>
              <SelectItem value="editable">Editable</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          Showing {filteredAndSortedFields.length} of {fields.length} fields
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th 
                  className="text-left py-3 px-4 text-sm font-semibold cursor-pointer hover:bg-muted/70 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-2">
                    Field Name
                    {getSortIcon('name')}
                  </div>
                </th>
                <th 
                  className="text-left py-3 px-4 text-sm font-semibold cursor-pointer hover:bg-muted/70 transition-colors"
                  onClick={() => handleSort('type')}
                >
                  <div className="flex items-center gap-2">
                    Type
                    {getSortIcon('type')}
                  </div>
                </th>
                <th 
                  className="text-left py-3 px-4 text-sm font-semibold cursor-pointer hover:bg-muted/70 transition-colors"
                  onClick={() => handleSort('dataType')}
                >
                  <div className="flex items-center gap-2">
                    Data Type
                    {getSortIcon('dataType')}
                  </div>
                </th>
                <th 
                  className="text-center py-3 px-4 text-sm font-semibold cursor-pointer hover:bg-muted/70 transition-colors"
                  onClick={() => handleSort('required')}
                >
                  <div className="flex items-center justify-center gap-2">
                    Required
                    {getSortIcon('required')}
                  </div>
                </th>
                <th 
                  className="text-center py-3 px-4 text-sm font-semibold cursor-pointer hover:bg-muted/70 transition-colors"
                  onClick={() => handleSort('readonly')}
                >
                  <div className="flex items-center justify-center gap-2">
                    Read Only
                    {getSortIcon('readonly')}
                  </div>
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Max Length</th>
                <th 
                  className="text-left py-3 px-4 text-sm font-semibold cursor-pointer hover:bg-muted/70 transition-colors"
                  onClick={() => handleSort('associatedEntity')}
                >
                  <div className="flex items-center gap-2">
                    Associated Entity
                    {getSortIcon('associatedEntity')}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedFields.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    No fields match your filters
                  </td>
                </tr>
              ) : (
                filteredAndSortedFields.map((field, index) => (
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
