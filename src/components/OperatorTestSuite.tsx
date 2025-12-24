import { useState } from 'react'
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
}

export function OperatorTestSuite() {
  const [entity, setEntity] = useState('Candidate')
  const [field, setField] = useState('status')
  const [testValue, setTestValue] = useState('Active')
  const [results, setResults] = useState<Record<string, TestResult>>({})
  const [isRunning, setIsRunning] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const filteredOperators = selectedCategory === 'all' 
    ? OPERATORS_TO_TEST 
    : OPERATORS_TO_TEST.filter(op => op.category === selectedCategory)

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
        count: 1,
        start: 0
      }, query)

      const duration = Date.now() - startTime

      setResults(prev => ({
        ...prev,
        [testId]: {
          operator: operator.operator,
          status: 'success',
          resultCount: searchResult.total,
          queryUsed: query,
          duration
        }
      }))

      return { success: true, count: searchResult.total }
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
    .filter(([_, result]) => result.status === 'success')
    .map(([op, _]) => op)

  return (
    <div className="space-y-6">
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
              <Input
                value={entity}
                onChange={(e) => setEntity(e.target.value)}
                placeholder="Entity name"
              />
            </div>
            <div className="space-y-2">
              <Label>Field</Label>
              <Input
                value={field}
                onChange={(e) => setField(e.target.value)}
                placeholder="Field name"
              />
            </div>
            <div className="space-y-2">
              <Label>Test Value</Label>
              <Input
                value={testValue}
                onChange={(e) => setTestValue(e.target.value)}
                placeholder="Value to test"
              />
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
                  • {workingOperators.length} working
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
                          <div className="flex items-center gap-3 text-xs">
                            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                              ✓ Working
                            </Badge>
                            <span className="text-muted-foreground">
                              Found {result.resultCount} records
                            </span>
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
        <Card className="border-2 border-accent/50">
          <CardHeader>
            <CardTitle className="text-lg">Working Operators Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {workingOperators.map((op) => (
                <Badge key={op} variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                  {op}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
