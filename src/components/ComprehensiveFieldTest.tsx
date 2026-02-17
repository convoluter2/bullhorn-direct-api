import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Play, CheckCircle, XCircle, Warning, TestTube } from '@phosphor-icons/react'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { useEntities } from '@/hooks/use-entities'
import { useEntityMetadata } from '@/hooks/use-entity-metadata'
import { toast } from 'sonner'

interface TestResult {
  testName: string
  field: string
  fieldType: string
  operator: string
  value: string
  query: string
  status: 'pass' | 'fail' | 'running'
  resultCount?: number
  error?: string
  duration?: number
}

export function ComprehensiveFieldTest() {
  const [entity, setEntity] = useState('Candidate')
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [testFilter, setTestFilter] = useState<'all' | 'pass' | 'fail'>('all')

  const { entities, loading: entitiesLoading } = useEntities()
  const { metadata, loading: metadataLoading } = useEntityMetadata(entity || undefined)

  const TEST_CASES = [
    {
      name: 'IS NULL on Text Field',
      field: 'customText1',
      fieldType: 'TEXT',
      operator: 'is_null',
      value: ''
    },
    {
      name: 'IS NOT NULL on Text Field',
      field: 'customText1',
      fieldType: 'TEXT',
      operator: 'is_not_null',
      value: ''
    },
    {
      name: 'Contains on Text Field',
      field: 'firstName',
      fieldType: 'TEXT',
      operator: 'contains',
      value: 'John'
    },
    {
      name: 'Starts With on Text Field',
      field: 'firstName',
      fieldType: 'TEXT',
      operator: 'starts_with',
      value: 'John'
    },
    {
      name: 'Ends With on Text Field',
      field: 'email',
      fieldType: 'TEXT',
      operator: 'ends_with',
      value: '@gmail.com'
    },
    {
      name: 'Equals on Text Field',
      field: 'status',
      fieldType: 'TEXT',
      operator: 'equals',
      value: 'Active'
    },
    {
      name: 'Not Equals on Text Field',
      field: 'status',
      fieldType: 'TEXT',
      operator: 'not_equals',
      value: 'Inactive'
    },
    {
      name: 'In List on Text Field',
      field: 'status',
      fieldType: 'TEXT',
      operator: 'in_list',
      value: 'Active,New'
    },
    {
      name: 'Greater Than on Date Field',
      field: 'dateAdded',
      fieldType: 'TIMESTAMP',
      operator: 'greater_than',
      value: '1609459200000'
    },
    {
      name: 'Less Than on Date Field',
      field: 'dateAdded',
      fieldType: 'TIMESTAMP',
      operator: 'less_than',
      value: String(Date.now())
    },
    {
      name: 'TO_ONE Field - Equals ID',
      field: 'owner.id',
      fieldType: 'TO_ONE',
      operator: 'equals',
      value: '1'
    },
    {
      name: 'TO_ONE Field - IS NULL',
      field: 'owner',
      fieldType: 'TO_ONE',
      operator: 'is_null',
      value: ''
    },
    {
      name: 'TO_ONE Field - IS NOT NULL',
      field: 'owner',
      fieldType: 'TO_ONE',
      operator: 'is_not_null',
      value: ''
    },
    {
      name: 'TO_MANY Field - Equals ID',
      field: 'primarySkills.id',
      fieldType: 'TO_MANY',
      operator: 'equals',
      value: '1'
    },
    {
      name: 'TO_MANY Field - In List',
      field: 'primarySkills.id',
      fieldType: 'TO_MANY',
      operator: 'in_list',
      value: '1,2,3'
    },
    {
      name: 'TO_MANY Field - IS NULL',
      field: 'primarySkills',
      fieldType: 'TO_MANY',
      operator: 'is_null',
      value: ''
    },
    {
      name: 'TO_MANY Field - IS NOT NULL',
      field: 'primarySkills',
      fieldType: 'TO_MANY',
      operator: 'is_not_null',
      value: ''
    }
  ]

  const buildTestQuery = (testCase: typeof TEST_CASES[0]): string => {
    const { field, operator, value } = testCase

    if (operator === 'is_null') {
      return `${field} IS NULL`
    }
    
    if (operator === 'is_not_null') {
      return `${field} IS NOT NULL`
    }
    
    if (operator === 'in_list') {
      const values = value.split(',').map(v => v.trim())
      return `${field}:[${values.join(',')}]`
    }
    
    if (operator === 'contains') {
      return `${field}:*${value}*`
    }
    
    if (operator === 'starts_with') {
      return `${field}:*[${value}`
    }
    
    if (operator === 'ends_with') {
      return `${field}:]${value}`
    }
    
    if (operator === 'equals') {
      return `${field}:${value}`
    }
    
    if (operator === 'not_equals') {
      return `${field}:<>${value}`
    }
    
    if (operator === 'greater_than') {
      return `${field}:>${value}`
    }
    
    if (operator === 'less_than') {
      return `${field}:<${value}`
    }
    
    return `${field}:${value}`
  }

  const runSingleTest = async (testCase: typeof TEST_CASES[0]): Promise<TestResult> => {
    const query = buildTestQuery(testCase)
    const startTime = Date.now()

    try {
      const searchResult = await bullhornAPI.search({
        entity,
        fields: ['id'],
        filters: [],
        count: 1,
        start: 0
      }, query)

      const duration = Date.now() - startTime

      return {
        testName: testCase.name,
        field: testCase.field,
        fieldType: testCase.fieldType,
        operator: testCase.operator,
        value: testCase.value,
        query,
        status: 'pass',
        resultCount: searchResult.total,
        duration
      }
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)

      return {
        testName: testCase.name,
        field: testCase.field,
        fieldType: testCase.fieldType,
        operator: testCase.operator,
        value: testCase.value,
        query,
        status: 'fail',
        error: errorMessage,
        duration
      }
    }
  }

  const runAllTests = async () => {
    if (!entity) {
      toast.error('Please select an entity')
      return
    }

    setIsRunning(true)
    setTestResults([])

    const results: TestResult[] = []

    for (const testCase of TEST_CASES) {
      const result = await runSingleTest(testCase)
      results.push(result)
      setTestResults([...results])
    }

    setIsRunning(false)

    const passCount = results.filter(r => r && r.status === 'pass').length
    const failCount = results.filter(r => r && r.status === 'fail').length

    if (failCount === 0) {
      toast.success(`All ${passCount} tests passed!`)
    } else {
      toast.warning(`${passCount} passed, ${failCount} failed`)
    }
  }

  const filteredResults = testResults.filter(result => {
    if (!result || typeof result !== 'object') return false
    if (testFilter === 'all') return true
    return result.status === testFilter
  })

  const passCount = testResults.filter(r => r && r.status === 'pass').length
  const failCount = testResults.filter(r => r && r.status === 'fail').length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="text-accent" size={24} weight="duotone" />
              Comprehensive Field & Operator Test Suite
            </CardTitle>
            <CardDescription>Test all field types and operators to verify Bullhorn API compatibility</CardDescription>
          </div>
          <Button onClick={runAllTests} disabled={isRunning || !entity}>
            <Play weight="fill" />
            Run All Tests
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Entity</Label>
            <Select value={entity} onValueChange={setEntity} disabled={isRunning}>
              <SelectTrigger>
                <SelectValue placeholder="Select entity" />
              </SelectTrigger>
              <SelectContent>
                {entitiesLoading ? (
                  <SelectItem value="__loading__" disabled>Loading entities...</SelectItem>
                ) : (
                  (entities || []).map((entityName) => (
                    <SelectItem key={entityName} value={entityName}>
                      {entityName}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {testResults.length > 0 && (
            <div className="space-y-2">
              <Label>Filter Results</Label>
              <div className="flex gap-2">
                <Button
                  variant={testFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => setTestFilter('all')}
                  className="flex-1"
                >
                  All ({testResults.length})
                </Button>
                <Button
                  variant={testFilter === 'pass' ? 'default' : 'outline'}
                  onClick={() => setTestFilter('pass')}
                  className="flex-1"
                >
                  <CheckCircle size={16} weight="fill" className="mr-1" />
                  Pass ({passCount})
                </Button>
                <Button
                  variant={testFilter === 'fail' ? 'default' : 'outline'}
                  onClick={() => setTestFilter('fail')}
                  className="flex-1"
                >
                  <XCircle size={16} weight="fill" className="mr-1" />
                  Fail ({failCount})
                </Button>
              </div>
            </div>
          )}
        </div>

        {testResults.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle size={20} weight="fill" className="text-green-500" />
                <span className="text-sm font-semibold">{passCount} Passed</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle size={20} weight="fill" className="text-destructive" />
                <span className="text-sm font-semibold">{failCount} Failed</span>
              </div>
            </div>

            <ScrollArea className="h-[500px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Status</TableHead>
                    <TableHead>Test Name</TableHead>
                    <TableHead>Field</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Query</TableHead>
                    <TableHead>Results</TableHead>
                    <TableHead>Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResults.map((result, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        {result.status === 'pass' ? (
                          <CheckCircle size={20} weight="fill" className="text-green-500" />
                        ) : (
                          <XCircle size={20} weight="fill" className="text-destructive" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{result.testName}</TableCell>
                      <TableCell className="font-mono text-xs">{result.field}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{result.fieldType}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs max-w-xs truncate" title={result.query}>
                        {result.query}
                      </TableCell>
                      <TableCell>
                        {result.status === 'pass' ? (
                          <span className="text-sm text-muted-foreground">{result.resultCount} records</span>
                        ) : (
                          <div className="text-xs text-destructive max-w-xs truncate" title={result.error}>
                            {result.error}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {result.duration}ms
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}

        {testResults.length === 0 && !isRunning && (
          <div className="text-center py-12 text-muted-foreground">
            <TestTube size={48} className="mx-auto mb-4 opacity-50" weight="duotone" />
            <p>Select an entity and click "Run All Tests" to begin</p>
            <p className="text-sm mt-2">This will test all field types and operators against the Bullhorn API</p>
          </div>
        )}

        {isRunning && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4" />
            <p className="text-muted-foreground">Running tests...</p>
            <p className="text-sm text-muted-foreground mt-2">
              {testResults.length} / {TEST_CASES.length} tests complete
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
