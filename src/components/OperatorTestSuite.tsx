import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Flask, Play, CheckCircle, XCircle, Clock } from '@phosphor-icons/react'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { toast } from 'sonner'
import { useEntities } from '@/hooks/use-entities'
import { useEntityMetadata } from '@/hooks/use-entity-metadata'
import { useKV } from '@github/spark/hooks'

interface OperatorTest {
  operator: string
  displayName: string
  description: string
  syntax: string
  example: string
  requiresValue: boolean
  category: 'comparison' | 'text' | 'null' | 'range' | 'list' | 'special'
}

const OPERATORS_TO_TEST: OperatorTest[] = [
  {
    operator: ':',
    displayName: 'Equals',
    description: 'Exact match (case-insensitive)',
    syntax: 'field:value',
    example: 'status:Active',
    requiresValue: true,
    category: 'comparison'
  },
  {
    operator: ':<>',
    displayName: 'Not Equals',
    description: 'Does not equal',
    syntax: 'field:<>value',
    example: 'status:<>Inactive',
    requiresValue: true,
    category: 'comparison'
  },
  {
    operator: ':>',
    displayName: 'Greater Than',
    description: 'Greater than (numeric/date)',
    syntax: 'field:>value',
    example: 'dateAdded:>1609459200000',
    requiresValue: true,
    category: 'comparison'
  },
  {
    operator: ':<',
    displayName: 'Less Than',
    description: 'Less than (numeric/date)',
    syntax: 'field:<value',
    example: 'dateAdded:<1609459200000',
    requiresValue: true,
    category: 'comparison'
  },
  {
    operator: ':>=',
    displayName: 'Greater Than or Equal',
    description: 'Greater than or equal to',
    syntax: 'field:>=value',
    example: 'salary:>=50000',
    requiresValue: true,
    category: 'comparison'
  },
  {
    operator: ':<=',
    displayName: 'Less Than or Equal',
    description: 'Less than or equal to',
    syntax: 'field:<=value',
    example: 'salary:<=100000',
    requiresValue: true,
    category: 'comparison'
  },
  {
    operator: ':*',
    displayName: 'Contains (Wildcard)',
    description: 'Contains substring (case-insensitive)',
    syntax: 'field:*value*',
    example: 'name:*smith*',
    requiresValue: true,
    category: 'text'
  },
  {
    operator: ':*[',
    displayName: 'Starts With',
    description: 'Starts with prefix',
    syntax: 'field:*[value',
    example: 'name:*[John',
    requiresValue: true,
    category: 'text'
  },
  {
    operator: ':]',
    displayName: 'Ends With',
    description: 'Ends with suffix',
    syntax: 'field:]value',
    example: 'email:]@example.com',
    requiresValue: true,
    category: 'text'
  },
  {
    operator: ' IS NULL',
    displayName: 'Is Null',
    description: 'Field is null/empty',
    syntax: 'field IS NULL',
    example: 'customText1 IS NULL',
    requiresValue: false,
    category: 'null'
  },
  {
    operator: ' IS NOT NULL',
    displayName: 'Is Not Null',
    description: 'Field has a value',
    syntax: 'field IS NOT NULL',
    example: 'customText1 IS NOT NULL',
    requiresValue: false,
    category: 'null'
  },
  {
    operator: ':[',
    displayName: 'In List (Bracket)',
    description: 'Value in list of values',
    syntax: 'field:[value1,value2,value3]',
    example: 'status:[Active,New]',
    requiresValue: true,
    category: 'list'
  },
  {
    operator: ':()',
    displayName: 'In List (Parens)',
    description: 'Value in list using parentheses',
    syntax: 'field:(value1,value2)',
    example: 'id:(1,2,3)',
    requiresValue: true,
    category: 'list'
  },
  {
    operator: ':..[',
    displayName: 'Between (Inclusive)',
    description: 'Value between range (inclusive)',
    syntax: 'field:..[start,end]',
    example: 'dateAdded:..[1609459200000,1612137600000]',
    requiresValue: true,
    category: 'range'
  },
  {
    operator: ':..()',
    displayName: 'Between (Exclusive)',
    description: 'Value between range (exclusive)',
    syntax: 'field:..(start,end)',
    example: 'salary:..(40000,60000)',
    requiresValue: true,
    category: 'range'
  },
  {
    operator: '~',
    displayName: 'Lucene Query',
    description: 'Advanced Lucene syntax search',
    syntax: 'field~"query"',
    example: 'name~"John AND Smith"',
    requiresValue: true,
    category: 'special'
  }
]

interface TestResult {
  operator: string
  status: 'pending' | 'running' | 'success' | 'error'
  resultCount?: number
  error?: string
  queryUsed?: string
  duration?: number
  hasResults?: boolean
}

export function OperatorTestSuite() {
  const { entities, loading: entitiesLoading } = useEntities()
  const [entity, setEntity] = useState('Candidate')
  const { metadata, loading: fieldsLoading } = useEntityMetadata(entity)
  const [field, setField] = useState('status')
  const [testValue, setTestValue] = useState('Active')
  const [results, setResults] = useState<Record<string, TestResult>>({})
  const [isRunning, setIsRunning] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [validatedOperators, setValidatedOperators] = useKV<string[]>('validated-operators', [])

  const filteredOperators = selectedCategory === 'all' 
    ? OPERATORS_TO_TEST 
    : OPERATORS_TO_TEST.filter(op => op.category === selectedCategory)

  const availableFields = useMemo(() => {
    if (!metadata) return []
    return metadata.fields.filter(f => 
      f.type !== 'TO_MANY' && 
      !f.name.includes('.')
    )
  }, [metadata])

  const selectedFieldInfo = useMemo(() => {
    if (!metadata || !field) return null
    return metadata.fieldsMap[field] || null
  }, [metadata, field])

  const testOperator = async (operator: OperatorTest) => {
    const testId = operator.operator
    
    setResults(prev => ({
      ...prev,
      [testId]: { operator: operator.operator, status: 'running' }
    }))

    const startTime = Date.now()

    try {
      let query: string
      
      if (!operator.requiresValue) {
        if (operator.operator === ' IS NULL' || operator.operator === ' IS NOT NULL') {
          query = `${field}${operator.operator}`
        } else {
          query = `${field}${operator.operator}`
        }
      } else {
        let value = testValue
        
        if (operator.operator === ':[' || operator.operator === ':()') {
          const values = testValue.split(',').map(v => v.trim())
          if (operator.operator === ':[') {
            query = `${field}:[${values.join(',')}]`
          } else {
            query = `${field}:(${values.join(',')})`
          }
        } else if (operator.operator === ':..[' || operator.operator === ':..()') {
          const values = testValue.split(',').map(v => v.trim())
          if (values.length < 2) {
            throw new Error('Range operators require two comma-separated values')
          }
          if (operator.operator === ':..[') {
            query = `${field}:..[${values[0]},${values[1]}]`
          } else {
            query = `${field}:..(${values[0]},${values[1]})`
          }
        } else if (operator.operator === ':*[' || operator.operator === ':]') {
          query = `${field}${operator.operator}${value}`
        } else if (operator.operator === ':*') {
          query = `${field}:*${value}*`
        } else if (operator.operator === '~') {
          query = `${field}~"${value}"`
        } else {
          if (value && (value.includes(' ') || value.includes(','))) {
            value = `"${value}"`
          }
          query = `${field}${operator.operator}${value}`
        }
      }

      const searchResult = await bullhornAPI.search({
        entity,
        fields: ['id'],
        filters: [],
        count: 100,
        start: 0
      }, query)

      const duration = Date.now() - startTime
      const hasResults = searchResult.total > 0

      setResults(prev => ({
        ...prev,
        [testId]: {
          operator: operator.operator,
          status: 'success',
          resultCount: searchResult.total,
          queryUsed: query,
          duration,
          hasResults
        }
      }))

      if (hasResults) {
        setValidatedOperators(current => {
          const ops = current || []
          if (!ops.includes(operator.operator)) {
            return [...ops, operator.operator]
          }
          return ops
        })
      }

      return { success: true, count: searchResult.total, hasResults }
    } catch (error) {
      const duration = Date.now() - startTime
      
      setResults(prev => ({
        ...prev,
        [testId]: {
          operator: operator.operator,
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
          duration
        }
      }))

      return { success: false, error: String(error) }
    }
  }

  const runAllTests = async () => {
    if (!entity || !field) {
      toast.error('Please select an entity and field')
      return
    }

    setIsRunning(true)
    setResults({})

    toast.loading('Running operator tests...', { id: 'test-operators' })

    let successCount = 0
    let errorCount = 0

    for (const operator of filteredOperators) {
      if (operator.requiresValue && !testValue) {
        setResults(prev => ({
          ...prev,
          [operator.operator]: {
            operator: operator.operator,
            status: 'error',
            error: 'Test value required'
          }
        }))
        errorCount++
        continue
      }

      const result = await testOperator(operator)
      if (result.success) {
        successCount++
      } else {
        errorCount++
      }

      await new Promise(resolve => setTimeout(resolve, 500))
    }

    setIsRunning(false)
    toast.success(`Tests complete: ${successCount} passed, ${errorCount} failed`, { 
      id: 'test-operators' 
    })
  }

  const runSingleTest = async (operator: OperatorTest) => {
    if (!entity || !field) {
      toast.error('Please select an entity and field')
      return
    }

    if (operator.requiresValue && !testValue) {
      toast.error('Test value required for this operator')
      return
    }

    await testOperator(operator)
  }

  const getStatusIcon = (status?: 'pending' | 'running' | 'success' | 'error') => {
    switch (status) {
      case 'running':
        return <Clock className="animate-spin" size={16} />
      case 'success':
        return <CheckCircle size={16} className="text-green-500" weight="fill" />
      case 'error':
        return <XCircle size={16} className="text-destructive" weight="fill" />
      default:
        return null
    }
  }

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'comparison': return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      case 'text': return 'bg-purple-500/10 text-purple-500 border-purple-500/20'
      case 'null': return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
      case 'range': return 'bg-green-500/10 text-green-500 border-green-500/20'
      case 'list': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
      case 'special': return 'bg-red-500/10 text-red-500 border-red-500/20'
      default: return ''
    }
  }

  const workingOperators = Object.entries(results)
    .filter(([_, result]) => result.status === 'success' && result.hasResults && (result.resultCount || 0) > 0)
    .map(([op, result]) => ({ operator: op, count: result.resultCount || 0 }))

  const workingButNoResults = Object.entries(results)
    .filter(([_, result]) => result.status === 'success' && !result.hasResults && (result.resultCount || 0) === 0)
    .map(([op, _]) => op)

  return (
    <div className="space-y-6">
      {validatedOperators && validatedOperators.length > 0 && (
        <Card className="border-accent/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Current Validation Status</CardTitle>
                <CardDescription className="text-sm">
                  {validatedOperators.length} operators validated and available in filter forms
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-accent/10 text-accent">
                {validatedOperators.length} Validated
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {validatedOperators.map((op) => (
                <Badge key={op} variant="secondary" className="text-xs">
                  {OPERATORS_TO_TEST.find(o => o.operator === op)?.displayName || op}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Flask size={32} className="text-accent" weight="duotone" />
            <div>
              <CardTitle>Bullhorn API Operator Test Suite</CardTitle>
              <CardDescription>
                Test all query operators to discover which ones work with the Bullhorn REST API
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Entity</Label>
              <Select value={entity} onValueChange={setEntity}>
                <SelectTrigger>
                  <SelectValue placeholder="Select entity" />
                </SelectTrigger>
                <SelectContent>
                  {entitiesLoading ? (
                    <SelectItem value="_loading" disabled>Loading entities...</SelectItem>
                  ) : entities.length === 0 ? (
                    <SelectItem value="_empty" disabled>No entities available</SelectItem>
                  ) : (
                    entities.map(e => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Field</Label>
              <Select value={field} onValueChange={setField}>
                <SelectTrigger>
                  <SelectValue placeholder="Select field" />
                </SelectTrigger>
                <SelectContent>
                  {fieldsLoading ? (
                    <SelectItem value="_loading" disabled>Loading fields...</SelectItem>
                  ) : availableFields.length === 0 ? (
                    <SelectItem value="_empty" disabled>No fields available</SelectItem>
                  ) : (
                    availableFields.map(f => (
                      <SelectItem key={f.name} value={f.name}>
                        {f.label} ({f.dataType})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Test Value</Label>
              {selectedFieldInfo?.options && selectedFieldInfo.options.length > 0 ? (
                <Select value={testValue} onValueChange={setTestValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select or enter value" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedFieldInfo.options.map((opt) => (
                      <SelectItem key={opt.value} value={String(opt.value)}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={testValue}
                  onChange={(e) => setTestValue(e.target.value)}
                  placeholder={
                    selectedFieldInfo?.dataType === 'Timestamp' 
                      ? 'e.g., 1609459200000'
                      : selectedFieldInfo?.dataType === 'Integer'
                      ? 'e.g., 1000'
                      : selectedFieldInfo?.dataType === 'Double'
                      ? 'e.g., 50000.00'
                      : 'Value to test'
                  }
                />
              )}
              {selectedFieldInfo && (
                <p className="text-xs text-muted-foreground">
                  Type: {selectedFieldInfo.dataType}
                  {selectedFieldInfo.dataSpecialization && ` (${selectedFieldInfo.dataSpecialization})`}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Category Filter</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="comparison">Comparison</SelectItem>
                  <SelectItem value="text">Text Search</SelectItem>
                  <SelectItem value="null">Null Checks</SelectItem>
                  <SelectItem value="range">Range</SelectItem>
                  <SelectItem value="list">List</SelectItem>
                  <SelectItem value="special">Special</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {filteredOperators.length} operators to test
              {Object.keys(results).length > 0 && (
                <span className="ml-2">
                  • {workingOperators.length} working with results
                  {workingButNoResults.length > 0 && ` • ${workingButNoResults.length} working but no data`}
                </span>
              )}
            </div>
            <Button onClick={runAllTests} disabled={isRunning}>
              <Play size={16} weight="fill" />
              Run All Tests
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3">
        {filteredOperators.map((operator) => {
          const result = results[operator.operator]
          
          return (
            <Card key={operator.operator} className="border-2">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono font-semibold bg-muted px-2 py-1 rounded">
                        {operator.operator}
                      </code>
                      <h4 className="font-semibold">{operator.displayName}</h4>
                      <Badge variant="outline" className={getCategoryBadgeColor(operator.category)}>
                        {operator.category}
                      </Badge>
                      {result && getStatusIcon(result.status)}
                    </div>
                    
                    <p className="text-sm text-muted-foreground">{operator.description}</p>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Syntax:</span>
                        <code className="bg-muted px-1.5 py-0.5 rounded">{operator.syntax}</code>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Example:</span>
                        <code className="bg-muted px-1.5 py-0.5 rounded">{operator.example}</code>
                      </div>
                    </div>

                    {result && (
                      <div className="pt-2 space-y-1">
                        {result.queryUsed && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground">Query:</span>
                            <code className="bg-accent/10 text-accent px-1.5 py-0.5 rounded font-mono">
                              {result.queryUsed}
                            </code>
                          </div>
                        )}
                        
                        {result.status === 'success' && (
                          <div className="flex items-center gap-3 text-xs flex-wrap">
                            {result.hasResults && result.resultCount! > 0 ? (
                              <>
                                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                                  ✓ Working with Data
                                </Badge>
                                <span className="text-muted-foreground">
                                  Found {result.resultCount} records
                                </span>
                              </>
                            ) : (
                              <>
                                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                                  ⚠ Working (No Results)
                                </Badge>
                                <span className="text-muted-foreground">
                                  Query succeeded but returned 0 records
                                </span>
                              </>
                            )}
                            {result.duration && (
                              <span className="text-muted-foreground">
                                • {result.duration}ms
                              </span>
                            )}
                          </div>
                        )}
                        
                        {result.status === 'error' && (
                          <div className="space-y-1">
                            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                              ✗ Failed
                            </Badge>
                            <div className="text-xs text-destructive bg-destructive/5 px-2 py-1 rounded">
                              {result.error}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => runSingleTest(operator)}
                    disabled={isRunning || result?.status === 'running'}
                  >
                    <Play size={14} />
                    Test
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {workingOperators.length > 0 && (
        <Card className="border-2 border-green-500/50">
          <CardHeader>
            <CardTitle className="text-lg">✅ Validated Operators (Working with Results)</CardTitle>
            <CardDescription>
              These operators executed successfully and returned data - they are available in all filter forms across the application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {workingOperators.map(({ operator, count }) => (
                  <div key={operator} className="flex items-center gap-1">
                    <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                      {OPERATORS_TO_TEST.find(o => o.operator === operator)?.displayName || operator}
                    </Badge>
                    <span className="text-xs text-muted-foreground">({count})</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  💡 Tip: Only validated operators are shown in QueryBlast, SmartStack, and QueryStack filter dropdowns. 
                  Run tests with different test values to validate more operators.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {workingButNoResults.length > 0 && (
        <Card className="border-2 border-yellow-500/50">
          <CardHeader>
            <CardTitle className="text-lg">⚠️ Working But No Results</CardTitle>
            <CardDescription>
              These operators executed successfully but returned 0 records with the current test parameters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {workingButNoResults.map((op) => (
                  <Badge key={op} variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                    {OPERATORS_TO_TEST.find(o => o.operator === op)?.displayName || op}
                  </Badge>
                ))}
              </div>
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  💡 Tip: Try testing with different entities, fields, or values to find data that matches. 
                  These operators will NOT be available in filter dropdowns until they return results.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
