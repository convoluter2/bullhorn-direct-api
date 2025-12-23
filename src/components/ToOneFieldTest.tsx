import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { TestTube, CheckCircle, XCircle } from '@phosphor-icons/react'
import { ToOneFieldInput } from '@/components/ToOneFieldInput'
import { ValidatedFieldInput } from '@/components/ValidatedFieldInput'
import type { EntityField } from '@/hooks/use-entity-metadata'

export function ToOneFieldTest() {
  const [testValue1, setTestValue1] = useState('')
  const [testValue2, setTestValue2] = useState('')
  const [testValue3, setTestValue3] = useState('')
  
  const testCases = [
    {
      name: 'JobOrder Association',
      field: {
        name: 'jobOrder',
        label: 'Job Order',
        type: 'TO_ONE',
        associationType: 'TO_ONE',
        associatedEntity: { entity: 'JobOrder' },
        dataType: 'Integer'
      } as EntityField,
      value: testValue1,
      setValue: setTestValue1,
      testId: '919540'
    },
    {
      name: 'Candidate Association',
      field: {
        name: 'candidate',
        label: 'Candidate',
        type: 'TO_ONE',
        associationType: 'TO_ONE',
        associatedEntity: { entity: 'Candidate' },
        dataType: 'Integer'
      } as EntityField,
      value: testValue2,
      setValue: setTestValue2,
      testId: '123456'
    },
    {
      name: 'Client Contact Association',
      field: {
        name: 'clientContact',
        label: 'Client Contact',
        type: 'TO_ONE',
        associationType: 'TO_ONE',
        associatedEntity: { entity: 'ClientContact' },
        dataType: 'Integer'
      } as EntityField,
      value: testValue3,
      setValue: setTestValue3,
      testId: '789012'
    }
  ]

  const runAllTests = () => {
    setTestValue1(testCases[0].testId)
    setTestValue2(testCases[1].testId)
    setTestValue3(testCases[2].testId)
  }

  const clearAllTests = () => {
    setTestValue1('')
    setTestValue2('')
    setTestValue3('')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="text-accent" size={24} />
            To-One Field Testing Suite
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-2">
            <Button onClick={runAllTests} variant="default">
              <TestTube />
              Run All Tests
            </Button>
            <Button onClick={clearAllTests} variant="outline">
              Clear All
            </Button>
          </div>

          <div className="space-y-4">
            {testCases.map((testCase, idx) => (
              <Card key={idx} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">{testCase.name}</Label>
                    <Badge variant="outline" className="font-mono text-xs">
                      {testCase.field.associatedEntity?.entity}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">
                      ToOneFieldInput Component
                    </Label>
                    <ToOneFieldInput
                      field={testCase.field}
                      value={testCase.value}
                      onChange={testCase.setValue}
                      placeholder={`Enter ${testCase.field.associatedEntity?.entity} ID`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">
                      ValidatedFieldInput Component (should auto-detect TO_ONE)
                    </Label>
                    <ValidatedFieldInput
                      field={testCase.field}
                      value={testCase.value}
                      onChange={testCase.setValue}
                      placeholder={`Enter ${testCase.field.associatedEntity?.entity} ID`}
                    />
                  </div>

                  <div className="p-3 bg-muted/50 rounded border space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs font-semibold">Current Value:</Label>
                      <code className="text-xs bg-background px-2 py-1 rounded border">
                        {testCase.value || '(empty)'}
                      </code>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs font-semibold">Expected Format:</Label>
                      <code className="text-xs bg-background px-2 py-1 rounded border">
                        {`{ id: ${testCase.testId} }`}
                      </code>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs font-semibold">Test ID:</Label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => testCase.setValue(testCase.testId)}
                      >
                        Use {testCase.testId}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card className="p-4 bg-accent/10 border-accent">
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <CheckCircle className="text-accent" size={20} />
                Expected Behavior
              </h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="mt-0.5 text-accent flex-shrink-0" />
                  <span>When you enter a numeric ID, it should lookup the entity and display its title/name below the input</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="mt-0.5 text-accent flex-shrink-0" />
                  <span>The lookup should show ID + title in a badge (e.g., "ID: 919540 - Allied - Radiology - CT Technician")</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="mt-0.5 text-accent flex-shrink-0" />
                  <span>When used in SmartStack/QueryStack/CSV Loader, the preview should show {`{ id: 919540, title: "..." }`}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="mt-0.5 text-accent flex-shrink-0" />
                  <span>The actual update sent to Bullhorn API should be {`{ id: 919540 }`}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="mt-0.5 text-accent flex-shrink-0" />
                  <span>If the ID is not found, it should show an error message below the input</span>
                </li>
              </ul>
            </div>
          </Card>
        </CardContent>
      </Card>
    </div>
  )
}
