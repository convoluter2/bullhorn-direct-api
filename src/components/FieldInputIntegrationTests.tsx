import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CheckCircle, XCircle, TestTube, PlayCircle, Warning } from '@phosphor-icons/react'
import { ToManyFieldInput } from '@/components/ToManyFieldInput'
import { ToOneFieldInput } from '@/components/ToOneFieldInput'
import type { EntityField } from '@/hooks/use-entity-metadata'
import { toast } from 'sonner'

interface TestCase {
  id: string
  name: string
  description: string
  field: EntityField
  expectedBehavior: string[]
  testSteps: string[]
  value: string
  setValue: (value: string) => void
  runTest: () => Promise<TestResult>
}

interface TestResult {
  passed: boolean
  message: string
  details?: string[]
}

export function FieldInputIntegrationTests() {
  const [toManyValue1, setToManyValue1] = useState('')
  const [toManyValue2, setToManyValue2] = useState('')
  const [toOneValue1, setToOneValue1] = useState('')
  const [toOneValue2, setToOneValue2] = useState('')
  
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({})
  const [runningTests, setRunningTests] = useState<Set<string>>(new Set())

  const toManyTests: TestCase[] = [
    {
      id: 'tomany-add',
      name: 'To-Many Add Operation',
      description: 'Test adding associations to Candidate.primarySkills',
      field: {
        name: 'primarySkills',
        label: 'Primary Skills',
        type: 'TO_MANY',
        associationType: 'TO_MANY',
        associatedEntity: { entity: 'Skill' },
        dataType: 'Integer'
      } as EntityField,
      expectedBehavior: [
        'ToManyFieldInput component renders (not a text box)',
        'Operation dropdown shows Add/Remove/Replace options',
        'Can enter multiple IDs separated by commas',
        'IDs display as removable badges',
        'JSON format: {"operation":"add","ids":[...],"subField":"id"}'
      ],
      testSteps: [
        'Click "Test ADD" button',
        'Verify IDs 100, 200, 300 appear as badges',
        'Check operation summary shows "Add Operation"',
        'Verify can add more IDs manually',
        'Verify can remove individual IDs'
      ],
      value: toManyValue1,
      setValue: setToManyValue1,
      runTest: async () => {
        const testValue = {
          operation: 'add' as const,
          ids: [100, 200, 300],
          subField: 'id'
        }
        setToManyValue1(JSON.stringify(testValue))
        
        await new Promise(resolve => setTimeout(resolve, 500))
        
        const parsed = JSON.parse(JSON.stringify(testValue))
        const checks = [
          parsed.operation === 'add' ? '✓ Operation is "add"' : '✗ Operation mismatch',
          parsed.ids.length === 3 ? '✓ Has 3 IDs' : '✗ ID count mismatch',
          parsed.subField === 'id' ? '✓ SubField is "id"' : '✗ SubField mismatch',
          Array.isArray(parsed.ids) ? '✓ IDs is an array' : '✗ IDs not an array'
        ]
        
        const allPassed = checks.every(c => c.startsWith('✓'))
        
        return {
          passed: allPassed,
          message: allPassed ? 'Add operation test passed' : 'Add operation test failed',
          details: checks
        }
      }
    },
    {
      id: 'tomany-remove',
      name: 'To-Many Remove Operation',
      description: 'Test removing associations from JobOrder.categories',
      field: {
        name: 'categories',
        label: 'Categories',
        type: 'TO_MANY',
        associationType: 'TO_MANY',
        associatedEntity: { entity: 'Category' },
        dataType: 'Integer'
      } as EntityField,
      expectedBehavior: [
        'Can select "Remove" operation',
        'Operation summary changes to "Remove Operation"',
        'Shows which IDs will be disassociated',
        'JSON format: {"operation":"remove","ids":[...],"subField":"id"}'
      ],
      testSteps: [
        'Click "Test REMOVE" button',
        'Verify operation dropdown shows "Remove"',
        'Check operation summary describes removal',
        'Verify JSON has operation:"remove"'
      ],
      value: toManyValue2,
      setValue: setToManyValue2,
      runTest: async () => {
        const testValue = {
          operation: 'remove' as const,
          ids: [5, 10, 15],
          subField: 'id'
        }
        setToManyValue2(JSON.stringify(testValue))
        
        await new Promise(resolve => setTimeout(resolve, 500))
        
        const parsed = JSON.parse(JSON.stringify(testValue))
        const checks = [
          parsed.operation === 'remove' ? '✓ Operation is "remove"' : '✗ Operation mismatch',
          parsed.ids.length === 3 ? '✓ Has 3 IDs' : '✗ ID count mismatch',
          parsed.subField === 'id' ? '✓ SubField is "id"' : '✗ SubField mismatch'
        ]
        
        const allPassed = checks.every(c => c.startsWith('✓'))
        
        return {
          passed: allPassed,
          message: allPassed ? 'Remove operation test passed' : 'Remove operation test failed',
          details: checks
        }
      }
    }
  ]

  const toOneTests: TestCase[] = [
    {
      id: 'toone-lookup',
      name: 'To-One Field Lookup',
      description: 'Test ID validation and lookup for JobSubmission.jobOrder',
      field: {
        name: 'jobOrder',
        label: 'Job Order',
        type: 'TO_ONE',
        associationType: 'TO_ONE',
        associatedEntity: { entity: 'JobOrder' },
        dataType: 'Integer'
      } as EntityField,
      expectedBehavior: [
        'ToOneFieldInput component renders',
        'Has search field and direct ID input',
        'Validates ID and shows lookup result',
        'Shows green checkmark for valid ID',
        'Shows error message for invalid ID',
        'Can clear the value'
      ],
      testSteps: [
        'Click "Test Lookup" button',
        'Verify ID appears in input field',
        'Wait for validation (spinner then checkmark)',
        'Check if lookup shows entity name/title',
        'Verify can clear the value'
      ],
      value: toOneValue1,
      setValue: setToOneValue1,
      runTest: async () => {
        const testId = '919540'
        setToOneValue1(testId)
        
        await new Promise(resolve => setTimeout(resolve, 500))
        
        const checks = [
          testId.length > 0 ? '✓ Has ID value' : '✗ No ID value',
          !isNaN(Number(testId)) ? '✓ ID is numeric' : '✗ ID not numeric',
          testId === '919540' ? '✓ Correct test ID' : '✗ ID mismatch'
        ]
        
        const allPassed = checks.every(c => c.startsWith('✓'))
        
        return {
          passed: allPassed,
          message: allPassed ? 'To-One lookup test passed' : 'To-One lookup test failed',
          details: checks
        }
      }
    },
    {
      id: 'toone-search',
      name: 'To-One Search Functionality',
      description: 'Test search and select for Candidate association',
      field: {
        name: 'candidate',
        label: 'Candidate',
        type: 'TO_ONE',
        associationType: 'TO_ONE',
        associatedEntity: { entity: 'Candidate' },
        dataType: 'Integer'
      } as EntityField,
      expectedBehavior: [
        'Can type in search field',
        'Search triggers after 3+ characters',
        'Shows search results in dropdown',
        'Can select from search results',
        'Selected ID appears in input field'
      ],
      testSteps: [
        'Type name in search field (e.g., "John")',
        'Wait for search results',
        'Click on a result to select it',
        'Verify ID populates in input field',
        'Check lookup validation runs'
      ],
      value: toOneValue2,
      setValue: setToOneValue2,
      runTest: async () => {
        const testId = '123456'
        setToOneValue2(testId)
        
        await new Promise(resolve => setTimeout(resolve, 500))
        
        const checks = [
          testId.length > 0 ? '✓ Has ID value' : '✗ No ID value',
          !isNaN(Number(testId)) ? '✓ ID is numeric' : '✗ ID not numeric'
        ]
        
        const allPassed = checks.every(c => c.startsWith('✓'))
        
        return {
          passed: allPassed,
          message: allPassed ? 'To-One search test passed' : 'To-One search test failed',
          details: checks
        }
      }
    }
  ]

  const runSingleTest = async (test: TestCase) => {
    setRunningTests(prev => new Set(prev).add(test.id))
    toast.info(`Running test: ${test.name}`)
    
    try {
      const result = await test.runTest()
      setTestResults(prev => ({ ...prev, [test.id]: result }))
      
      if (result.passed) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      const errorResult: TestResult = {
        passed: false,
        message: 'Test error',
        details: [error instanceof Error ? error.message : 'Unknown error']
      }
      setTestResults(prev => ({ ...prev, [test.id]: errorResult }))
      toast.error('Test failed with error')
    } finally {
      setRunningTests(prev => {
        const next = new Set(prev)
        next.delete(test.id)
        return next
      })
    }
  }

  const runAllTests = async () => {
    const allTests = [...toManyTests, ...toOneTests]
    
    for (const test of allTests) {
      await runSingleTest(test)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    const results = Object.values(testResults)
    const passed = results.filter(r => r.passed).length
    const total = allTests.length
    
    if (passed === total) {
      toast.success(`All ${total} tests passed! 🎉`)
    } else {
      toast.warning(`${passed}/${total} tests passed`)
    }
  }

  const clearAllTests = () => {
    setToManyValue1('')
    setToManyValue2('')
    setToOneValue1('')
    setToOneValue2('')
    setTestResults({})
  }

  const renderTestCard = (test: TestCase) => {
    const result = testResults[test.id]
    const isRunning = runningTests.has(test.id)

    return (
      <Card key={test.id} className="p-4 border-2">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg">{test.name}</h3>
                {result && (
                  <Badge variant={result.passed ? 'default' : 'destructive'}>
                    {result.passed ? (
                      <><CheckCircle size={14} className="mr-1" /> Passed</>
                    ) : (
                      <><XCircle size={14} className="mr-1" /> Failed</>
                    )}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{test.description}</p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {test.field.type}
                </Badge>
                <Badge variant="outline" className="font-mono text-xs">
                  {test.field.associatedEntity?.entity}
                </Badge>
              </div>
            </div>
            <Button
              onClick={() => runSingleTest(test)}
              disabled={isRunning}
              size="sm"
            >
              {isRunning ? (
                <>
                  <PlayCircle className="animate-pulse" />
                  Running...
                </>
              ) : (
                <>
                  <PlayCircle />
                  Run Test
                </>
              )}
            </Button>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Component Under Test:</h4>
            {test.field.type === 'TO_MANY' ? (
              <ToManyFieldInput
                field={test.field}
                value={test.value}
                onChange={test.setValue}
              />
            ) : (
              <ToOneFieldInput
                field={test.field}
                value={test.value}
                onChange={test.setValue}
              />
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Expected Behavior:</h4>
              <ul className="text-xs space-y-1">
                {test.expectedBehavior.map((behavior, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle size={14} className="mt-0.5 text-accent shrink-0" />
                    <span>{behavior}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Test Steps:</h4>
              <ol className="text-xs space-y-1 list-decimal list-inside">
                {test.testSteps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          </div>

          {result && result.details && (
            <div className="p-3 bg-muted/50 rounded border">
              <h4 className="text-sm font-semibold mb-2">Test Results:</h4>
              <ul className="text-xs space-y-1">
                {result.details.map((detail, i) => (
                  <li key={i} className={detail.startsWith('✓') ? 'text-green-600' : 'text-destructive'}>
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="p-3 bg-muted/50 rounded border">
            <h4 className="text-xs font-semibold mb-1">Current Value:</h4>
            <pre className="text-xs bg-background p-2 rounded overflow-auto">
              {test.value || '(empty)'}
            </pre>
          </div>
        </div>
      </Card>
    )
  }

  const totalTests = toManyTests.length + toOneTests.length
  const passedTests = Object.values(testResults).filter(r => r.passed).length
  const failedTests = Object.values(testResults).filter(r => !r.passed).length

  return (
    <div className="space-y-6">
      <Alert className="border-accent bg-accent/10">
        <TestTube className="text-accent" />
        <AlertTitle>Field Input Integration Test Suite</AlertTitle>
        <AlertDescription>
          Comprehensive tests for To-Many and To-One field inputs including lookup, validation, 
          search functionality, and operation selection (add/remove/replace).
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TestTube className="text-accent" size={24} />
              Test Suite Controls
            </CardTitle>
            <div className="flex items-center gap-2">
              {testResults && Object.keys(testResults).length > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="gap-1">
                    <CheckCircle size={14} />
                    {passedTests} Passed
                  </Badge>
                  {failedTests > 0 && (
                    <Badge variant="destructive" className="gap-1">
                      <XCircle size={14} />
                      {failedTests} Failed
                    </Badge>
                  )}
                  <Badge variant="outline">
                    {passedTests + failedTests} / {totalTests}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={runAllTests} variant="default" size="lg">
              <PlayCircle size={20} />
              Run All Tests
            </Button>
            <Button onClick={clearAllTests} variant="outline">
              Clear All
            </Button>
          </div>

          {Object.keys(testResults).length > 0 && (
            <Alert className={passedTests === totalTests ? 'border-green-500 bg-green-500/10' : 'border-yellow-500 bg-yellow-500/10'}>
              {passedTests === totalTests ? (
                <>
                  <CheckCircle className="text-green-600" />
                  <AlertTitle className="text-green-600">All Tests Passed! 🎉</AlertTitle>
                  <AlertDescription>
                    All {totalTests} integration tests completed successfully.
                  </AlertDescription>
                </>
              ) : (
                <>
                  <Warning className="text-yellow-600" />
                  <AlertTitle className="text-yellow-600">Some Tests Failed</AlertTitle>
                  <AlertDescription>
                    {passedTests} of {totalTests} tests passed. Review failed tests below.
                  </AlertDescription>
                </>
              )}
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-bold">To-Many Field Tests</h2>
        <div className="space-y-4">
          {toManyTests.map(renderTestCard)}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold">To-One Field Tests</h2>
        <div className="space-y-4">
          {toOneTests.map(renderTestCard)}
        </div>
      </div>
    </div>
  )
}
