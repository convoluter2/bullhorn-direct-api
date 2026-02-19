export function buildSQLWhereClause(filters: Array<{
  field: string
  operator: string
  value: string
}>, logic: 'AND' | 'OR' = 'AND'): string {
  if (filters.length === 0) {
    return ''
  }

  const conditions = filters
    .filter(f => f.field && (f.value || f.operator === 'is_null' || f.operator === 'is_not_null' || f.operator === 'is_empty' || f.operator === 'is_not_empty'))
    .map(filter => buildSQLCondition(filter))
    .filter(c => c !== '')

  if (conditions.length === 0) return ''
  if (conditions.length === 1) return conditions[0]
  
  return conditions.join(` ${logic} `)
}

export function buildSQLCondition(filter: {
  field: string
  operator: string
  value: string
}): string {
  const { field, operator, value } = filter

  switch (operator) {
    case 'equals':
      if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
        return `${field} = ${value.toLowerCase()}`
      }
      if (!isNaN(Number(value))) {
        return `${field} = ${value}`
      }
      return `${field} = '${escapeSQLValue(value)}'`
    
    case 'not_equals':
      if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
        return `${field} <> ${value.toLowerCase()}`
      }
      if (!isNaN(Number(value))) {
        return `${field} <> ${value}`
      }
      return `${field} <> '${escapeSQLValue(value)}'`
    
    case 'greater_than':
      return `${field} > ${isNaN(Number(value)) ? `'${escapeSQLValue(value)}'` : value}`
    
    case 'less_than':
      return `${field} < ${isNaN(Number(value)) ? `'${escapeSQLValue(value)}'` : value}`
    
    case 'greater_equal':
      return `${field} >= ${isNaN(Number(value)) ? `'${escapeSQLValue(value)}'` : value}`
    
    case 'less_equal':
      return `${field} <= ${isNaN(Number(value)) ? `'${escapeSQLValue(value)}'` : value}`
    
    case 'is_null':
      return `${field} IS NULL`
    
    case 'is_not_null':
      return `${field} IS NOT NULL`
    
    case 'is_empty':
      return `${field} IS EMPTY`
    
    case 'is_not_empty':
      return `${field} IS NOT EMPTY`
    
    case 'in_list':
    case 'in_list_parens':
      const inValues = value.split(',').map(v => {
        const trimmed = v.trim()
        if (!isNaN(Number(trimmed))) {
          return trimmed
        }
        return `'${escapeSQLValue(trimmed)}'`
      })
      return `${field} IN (${inValues.join(', ')})`
    
    case 'not_in_list':
      const notInValues = value.split(',').map(v => {
        const trimmed = v.trim()
        if (!isNaN(Number(trimmed))) {
          return trimmed
        }
        return `'${escapeSQLValue(trimmed)}'`
      })
      return `${field} NOT IN (${notInValues.join(', ')})`
    
    case 'member_of':
      return `${value} MEMBER OF ${field}`
    
    case 'not_member_of':
      return `${value} NOT MEMBER OF ${field}`
    
    default:
      if (!isNaN(Number(value))) {
        return `${field} = ${value}`
      }
      return `${field} = '${escapeSQLValue(value)}'`
  }
}

function escapeSQLValue(value: string): string {
  return value.replace(/'/g, "''")
}

export function getOperatorDisplayName(operator: string, forQuery: boolean = false): string {
  const operatorMap: Record<string, string> = {
    'equals': 'equals (=)',
    'not_equals': 'not equals (<>)',
    'greater_than': 'greater than (>)',
    'less_than': 'less than (<)',
    'greater_equal': 'greater or equal (>=)',
    'less_equal': 'less or equal (<=)',
    'is_null': 'IS NULL',
    'is_not_null': 'IS NOT NULL',
    'is_empty': 'IS EMPTY (to-many)',
    'is_not_empty': 'IS NOT EMPTY (to-many)',
    'in_list': 'IN (list)',
    'not_in_list': 'NOT IN (list)',
    'member_of': 'MEMBER OF (to-many)',
    'not_member_of': 'NOT MEMBER OF (to-many)',
    'contains': forQuery ? 'contains (not in Query)' : 'contains (*)',
    'starts_with': forQuery ? 'starts with (not in Query)' : 'starts with (*[)',
    'ends_with': forQuery ? 'ends with (not in Query)' : 'ends with (])',
    'between_inclusive': forQuery ? 'between (not in Query)' : 'between inclusive (..[])',
    'between_exclusive': forQuery ? 'between (not in Query)' : 'between exclusive (..())',
    'lucene': forQuery ? 'fuzzy (not in Query)' : 'fuzzy (~)'
  }
  
  return operatorMap[operator] || operator
}

export function getAvailableOperatorsForMethod(method: 'search' | 'query'): string[] {
  if (method === 'search') {
    return [
      'equals',
      'not_equals',
      'contains',
      'starts_with',
      'ends_with',
      'greater_than',
      'less_than',
      'greater_equal',
      'less_equal',
      'is_null',
      'is_not_null',
      'in_list',
      'in_list_parens',
      'between_inclusive',
      'between_exclusive',
      'lucene'
    ]
  } else {
    return [
      'equals',
      'not_equals',
      'greater_than',
      'less_than',
      'greater_equal',
      'less_equal',
      'is_null',
      'is_not_null',
      'is_empty',
      'is_not_empty',
      'in_list',
      'not_in_list',
      'member_of',
      'not_member_of'
    ]
  }
}
