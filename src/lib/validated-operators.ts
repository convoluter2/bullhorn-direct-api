export interface OperatorDefinition {
  id: string
  displayName: string
  symbol: string
  requiresValue: boolean
  category: 'comparison' | 'text' | 'null' | 'range' | 'list' | 'special'
  description: string
  placeholder?: string
  validated?: boolean
}

export const ALL_OPERATORS: OperatorDefinition[] = [
  {
    id: 'equals',
    displayName: 'Equals',
    symbol: '=',
    requiresValue: true,
    category: 'comparison',
    description: 'Exact match (case-insensitive)',
    validated: false
  },
  {
    id: 'not_equals',
    displayName: 'Not Equals',
    symbol: '≠',
    requiresValue: true,
    category: 'comparison',
    description: 'Does not equal',
    validated: false
  },
  {
    id: 'greater_than',
    displayName: 'Greater Than',
    symbol: '>',
    requiresValue: true,
    category: 'comparison',
    description: 'Greater than (numeric/date)',
    validated: false
  },
  {
    id: 'less_than',
    displayName: 'Less Than',
    symbol: '<',
    requiresValue: true,
    category: 'comparison',
    description: 'Less than (numeric/date)',
    validated: false
  },
  {
    id: 'greater_equal',
    displayName: 'Greater or Equal',
    symbol: '≥',
    requiresValue: true,
    category: 'comparison',
    description: 'Greater than or equal to',
    validated: false
  },
  {
    id: 'less_equal',
    displayName: 'Less or Equal',
    symbol: '≤',
    requiresValue: true,
    category: 'comparison',
    description: 'Less than or equal to',
    validated: false
  },
  {
    id: 'contains',
    displayName: 'Contains',
    symbol: '⊃',
    requiresValue: true,
    category: 'text',
    description: 'Contains substring (case-insensitive)',
    validated: false
  },
  {
    id: 'starts_with',
    displayName: 'Starts With',
    symbol: '⊐',
    requiresValue: true,
    category: 'text',
    description: 'Starts with prefix',
    validated: false
  },
  {
    id: 'ends_with',
    displayName: 'Ends With',
    symbol: '⊏',
    requiresValue: true,
    category: 'text',
    description: 'Ends with suffix',
    validated: false
  },
  {
    id: 'is_null',
    displayName: 'Is Null',
    symbol: '∅',
    requiresValue: false,
    category: 'null',
    description: 'Field is null/empty',
    validated: false
  },
  {
    id: 'is_not_null',
    displayName: 'Is Not Null',
    symbol: '∃',
    requiresValue: false,
    category: 'null',
    description: 'Field has a value',
    validated: false
  },
  {
    id: 'in_list',
    displayName: 'In List [...]',
    symbol: '∈',
    requiresValue: true,
    category: 'list',
    description: 'Value in list of values (brackets)',
    placeholder: 'value1,value2,value3',
    validated: false
  },
  {
    id: 'in_list_parens',
    displayName: 'In List (...)',
    symbol: '∈',
    requiresValue: true,
    category: 'list',
    description: 'Value in list using parentheses',
    placeholder: 'value1,value2,value3',
    validated: false
  },
  {
    id: 'between_inclusive',
    displayName: 'Between [...]',
    symbol: '⊆',
    requiresValue: true,
    category: 'range',
    description: 'Value between range (inclusive)',
    placeholder: 'start,end',
    validated: false
  },
  {
    id: 'between_exclusive',
    displayName: 'Between (...)',
    symbol: '⊂',
    requiresValue: true,
    category: 'range',
    description: 'Value between range (exclusive)',
    placeholder: 'start,end',
    validated: false
  },
  {
    id: 'lucene',
    displayName: 'Lucene Query',
    symbol: '🔍',
    requiresValue: true,
    category: 'special',
    description: 'Advanced Lucene syntax search',
    validated: false
  }
]

const OPERATOR_TO_BULLHORN_MAP: Record<string, string> = {
  'equals': ':',
  'not_equals': ':<>',
  'greater_than': ':>',
  'less_than': ':<',
  'greater_equal': ':>=',
  'less_equal': ':<=',
  'contains': ':*',
  'starts_with': ':*[',
  'ends_with': ':]',
  'is_null': ' IS NULL',
  'is_not_null': ' IS NOT NULL',
  'in_list': ':[',
  'in_list_parens': ':(',
  'between_inclusive': ':..[',
  'between_exclusive': ':..(',
  'lucene': '~'
}

export function getBullhornOperatorSymbol(operatorId: string): string {
  return OPERATOR_TO_BULLHORN_MAP[operatorId] || ':'
}

export function getValidatedOperators(validatedList: string[]): OperatorDefinition[] {
  return ALL_OPERATORS.filter(op => {
    const bullhornSymbol = getBullhornOperatorSymbol(op.id)
    return validatedList.includes(bullhornSymbol)
  }).map(op => ({ ...op, validated: true }))
}

export function getOperatorById(id: string): OperatorDefinition | undefined {
  return ALL_OPERATORS.find(op => op.id === id)
}

export function getOperatorsByCategory(category: string): OperatorDefinition[] {
  return ALL_OPERATORS.filter(op => op.category === category)
}
