import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { TestTube, CheckCircle, Info } from '@phosphor-icons/react'
import { ToManyFieldInput } from '@/components/ToManyFieldInput'
import { FieldTypeDebugger } from '@/components/FieldTypeDebugger'
import { ConsoleMonitorForTests } from '@/components/ConsoleMonitorForTests'
import type { EntityField } from '@/hooks/use-entity-metadata'

export function ToManyFieldTest() {
  const [testValue1, setTestValue1] = useState('')
  const [testValue2, setTestValue2] = useState('')
  const [testValue3, setTestValue3] = useState('')

  console.log('🧪 ToManyFieldTest - Render State:', {
    testValue1Length: testValue1.length,
    testValue2Length: testValue2.length,
    testValue3Length: testValue3.length,
    testValue1Preview: testValue1.substring(0, 50),
    testValue2Preview: testValue2.substring(0, 50),
    testValue3Preview: testValue3.substring(0, 50)
  })
  
  const testCases = [
    {
      name: 'Candidate.primarySkills (TO_MANY)',
      description: 'Testing to-many association with Skill entity',
      field: {
        name: 'primarySkills',
        label: 'Primary Skills',
        type: 'TO_MANY',
        associationType: 'TO_MANY',
        associatedEntity: { entity: 'Skill' },
        dataType: 'Integer'
      } as EntityField,
      value: testValue1,
      setValue: (newValue: string) => {
        console.log('🔧 Setting testValue1 (primarySkills):', newValue)
        setTestValue1(newValue)
      },
      testIds: [100, 200, 300]
    },
    {
      name: 'ClientCorporation.requirements (TO_MANY)',
      description: 'Testing to-many association with SpecialtyCategory entity',
      field: {
        name: 'requirements',
        label: 'Requirements',
        type: 'TO_MANY',
        associationType: 'TO_MANY',
        associatedEntity: { entity: 'SpecialtyCategory' },
        dataType: 'Integer'
      } as EntityField,
      value: testValue2,
      setValue: (newValue: string) => {
        console.log('🔧 Setting testValue2 (requirements):', newValue)
        setTestValue2(newValue)
      },
      testIds: [66, 77, 88]
    },
    {
      name: 'JobOrder.categories (TO_MANY)',
      description: 'Testing to-many association with Category entity',
      field: {
        name: 'categories',
        label: 'Categories',
        type: 'TO_MANY',
        associationType: 'TO_MANY',
        associatedEntity: { entity: 'Category' },
        dataType: 'Integer'
      } as EntityField,
      value: testValue3,
      setValue: (newValue: string) => {
        console.log('🔧 Setting testValue3 (categories):', newValue)
        setTestValue3(newValue)
      },
      testIds: [1, 2, 3, 4, 5]
    }
  ]

  const runTest = (testCase: typeof testCases[0], operation: 'add' | 'remove' | 'replace') => {
    const testValue = {
      operation,
      ids: testCase.testIds,
      subField: 'id'
    }
    testCase.setValue(JSON.stringify(testValue))
  }

  const clearAllTests = () => {
    setTestValue1('')
    setTestValue2('')
    setTestValue3('')
  }

  const parseTestValue = (value: string) => {
    if (!value) return null
    try {
      return JSON.parse(value)
    } catch {
      return null
    }
  }

  return (
    <div className="space-y-6">
      <Alert className="border-accent bg-accent/10">
        <Info className="text-accent" />
        <AlertTitle>To-Many Field Testing</AlertTitle>
        <AlertDescription>
          This test suite verifies that to-many fields like <code className="bg-background px-1 rounded">primarySkills</code> on Candidate 
          display the correct UI with add/remove/replace operation options, along with field type and data type information.
        </AlertDescription>
      </Alert>

      <ConsoleMonitorForTests />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="text-accent" size={24} />
            To-Many Field Testing Suite
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-2">
            <Button onClick={clearAllTests} variant="outline">
              Clear All
            </Button>
          </div>

          <div className="space-y-6">
            {testCases.map((testCase, idx) => {
              const parsedValue = parseTestValue(testCase.value)
              
              return (
                <Card key={idx} className="p-4 border-2">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-lg font-bold">{testCase.name}</Label>
                        <Badge variant="outline" className="font-mono text-xs">
                          {testCase.field.associatedEntity?.entity}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{testCase.description}</p>
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="secondary">Type: {testCase.field.type}</Badge>
                        <Badge variant="secondary">Data Type: {testCase.field.dataType}</Badge>
                      </div>
                    </div>

                    <FieldTypeDebugger 
                      field={testCase.field} 
                      testName={testCase.name}
                    />
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">
                        ToManyFieldInput Component
                      </Label>
                      <ToManyFieldInput
                        field={testCase.field}
                        value={testCase.value}
                        onChange={testCase.setValue}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Quick Test Operations</Label>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => runTest(testCase, 'add')}
                        >
                          Test ADD
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => runTest(testCase, 'remove')}
                        >
                          Test REMOVE
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => runTest(testCase, 'replace')}
                        >
                          Test REPLACE
                        </Button>
                      </div>
                    </div>

                    <div className="p-3 bg-muted/50 rounded border space-y-2">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Current Value (Raw JSON):</Label>
                        <pre className="text-xs bg-background px-2 py-1 rounded border overflow-auto">
                          {testCase.value || '(empty)'}
                        </pre>
                      </div>
                      {parsedValue && (
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Parsed Value:</Label>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="default">Operation: {parsedValue.operation}</Badge>
                            <Badge variant="secondary">IDs: [{parsedValue.ids.join(', ')}]</Badge>
                            <Badge variant="outline">Sub-Field: {parsedValue.subField}</Badge>
                          </div>
                        </div>
                      )}
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Expected API Format (for {testCase.field.associatedEntity?.entity}):</Label>
                        <pre className="text-xs bg-background px-2 py-1 rounded border overflow-auto">
{`{
  "changedEntityType": "Candidate",
  "changedEntityId": 123,
  "changeType": "UPDATE",
  "data": {
    "${testCase.field.name}": {
      "${parsedValue?.operation || 'add'}": ${JSON.stringify(testCase.testIds)}
    }
  }
}`}
                        </pre>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>

          <Card className="p-4 bg-accent/10 border-accent">
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <CheckCircle className="text-accent" size={20} />
                Expected Behavior Checklist
              </h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="mt-0.5 text-accent flex-shrink-0" />
                  <span>When selecting a to-many field, the <strong>ToManyFieldInput</strong> component should appear (not a text box)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="mt-0.5 text-accent flex-shrink-0" />
                  <span>The component should display three operation options: <strong>Add</strong>, <strong>Remove</strong>, and <strong>Replace</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="mt-0.5 text-accent flex-shrink-0" />
                  <span>Field dropdowns should show field type (TO_MANY, TO_ONE, SCALAR) and data type (Integer, Boolean, etc.)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="mt-0.5 text-accent flex-shrink-0" />
                  <span>The component should show a dropdown to select between "id" (direct association) or other sub-fields</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="mt-0.5 text-accent flex-shrink-0" />
                  <span>You should be able to enter multiple IDs (comma-separated) and they appear as badges</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="mt-0.5 text-accent flex-shrink-0" />
                  <span>The operation summary at the bottom should describe what will happen based on selected operation</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="mt-0.5 text-accent flex-shrink-0" />
                  <span>The value should be stored as JSON: <code className="bg-background px-1 rounded text-xs">{`{"operation":"add","ids":[100,200],"subField":"id"}`}</code></span>
                </li>
              </ul>
            </div>
          </Card>

          <Card className="p-4 bg-blue-500/10 border-blue-500">
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <Info size={20} />
                Testing Instructions
              </h3>
              <ol className="space-y-2 text-sm list-decimal list-inside">
                <li>Click one of the "Test ADD/REMOVE/REPLACE" buttons to populate the component</li>
                <li>Verify that the ToManyFieldInput component appears (not a plain text input)</li>
                <li>Check that you can see and select between Add/Remove/Replace operations</li>
                <li>Verify the operation dropdown shows descriptions for each option</li>
                <li>Check that IDs appear as badges below the input field</li>
                <li>Verify you can add more IDs by typing in the input and clicking "Add"</li>
                <li>Test removing individual IDs by clicking the X on each badge</li>
                <li>Check that the "Operation Summary" section describes the current operation correctly</li>
                <li>For primarySkills on Candidate, verify it shows "Skill" as the associated entity</li>
              </ol>
            </div>
          </Card>
        </CardContent>
      </Card>
    </div>
  )
}
