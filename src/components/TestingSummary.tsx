import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { TestTube, CheckCircle, ArrowRight, BookOpen, PlayCircle } from '@phosphor-icons/react'

export function TestingSummary() {
  return (
    <div className="space-y-6">
      <Alert className="border-accent bg-accent/10">
        <TestTube className="text-accent" />
        <AlertTitle>Field Input Testing Suite</AlertTitle>
        <AlertDescription>
          Comprehensive testing for To-Many and To-One field inputs including automated tests,
          integration tests, and manual verification tools.
        </AlertDescription>
      </Alert>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-2 border-accent/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <PlayCircle className="text-accent" size={24} />
              Integration Tests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Run automated integration tests with real components and visual feedback.
            </p>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Test Coverage:</h4>
              <ul className="text-sm space-y-1">
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="mt-0.5 text-accent shrink-0" />
                  <span>To-Many Add/Remove/Replace operations</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="mt-0.5 text-accent shrink-0" />
                  <span>To-One field lookup and validation</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="mt-0.5 text-accent shrink-0" />
                  <span>Search functionality</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="mt-0.5 text-accent shrink-0" />
                  <span>JSON format validation</span>
                </li>
              </ul>
            </div>
            <Button className="w-full gap-2" asChild>
              <a href="#" onClick={(e) => { e.preventDefault(); window.location.hash = 'field-tests' }}>
                <PlayCircle />
                Run Integration Tests
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TestTube className="text-blue-600" size={24} />
              Manual Test Harness
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Interactive testing environment for visual inspection and debugging.
            </p>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Features:</h4>
              <ul className="text-sm space-y-1">
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="mt-0.5 text-blue-600 shrink-0" />
                  <span>Visual component inspection</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="mt-0.5 text-blue-600 shrink-0" />
                  <span>Field type debugging</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="mt-0.5 text-blue-600 shrink-0" />
                  <span>Console monitoring</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="mt-0.5 text-blue-600 shrink-0" />
                  <span>Expected behavior checklist</span>
                </li>
              </ul>
            </div>
            <Button variant="outline" className="w-full gap-2" asChild>
              <a href="#" onClick={(e) => { e.preventDefault(); window.location.hash = 'to-many-test' }}>
                <TestTube />
                Open Manual Tests
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="text-accent" size={24} />
            Test Documentation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="p-4 bg-muted/50 rounded-lg">
              <h3 className="font-semibold mb-2">To-Many Field Input</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Comprehensive UI for managing many-to-many associations with Add/Remove/Replace operations.
              </p>
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <div>
                  <h4 className="font-semibold mb-1">Required Features:</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Operation selection (Add/Remove/Replace)</li>
                    <li>• Sub-field selector for association mode</li>
                    <li>• Multi-ID entry with badges</li>
                    <li>• Search and multi-select interface</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Validation:</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Real-time ID validation</li>
                    <li>• Visual feedback (✓/✗)</li>
                    <li>• Lookup data display</li>
                    <li>• Invalid ID warnings</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <h3 className="font-semibold mb-2">To-One Field Input</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Simplified UI for single entity associations with search and validation.
              </p>
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <div>
                  <h4 className="font-semibold mb-1">Required Features:</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Search interface</li>
                    <li>• Direct ID input</li>
                    <li>• Real-time validation</li>
                    <li>• Lookup result display</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">User Experience:</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Search by name/title/email</li>
                    <li>• Select from dropdown</li>
                    <li>• Visual validation feedback</li>
                    <li>• Clear button to reset</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <Alert>
            <ArrowRight className="text-accent" />
            <AlertTitle>API Format</AlertTitle>
            <AlertDescription className="space-y-2">
              <div className="space-y-1">
                <p className="font-semibold text-sm">To-Many:</p>
                <code className="text-xs bg-background px-2 py-1 rounded block overflow-auto">
                  {`{"operation":"add","ids":[100,200,300],"subField":"id"}`}
                </code>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-sm">To-One:</p>
                <code className="text-xs bg-background px-2 py-1 rounded block overflow-auto">
                  {`{ "id": 919540 }`}
                </code>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card className="border-green-500/30 bg-green-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle size={24} weight="fill" />
            Success Criteria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold">Integration Tests</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0">1</Badge>
                  <span>All automated tests show green checkmarks</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0">2</Badge>
                  <span>Components render with correct UI elements</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0">3</Badge>
                  <span>JSON format matches API requirements</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0">4</Badge>
                  <span>Validation shows correct results</span>
                </li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Manual Verification</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0">5</Badge>
                  <span>Visual appearance matches design specs</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0">6</Badge>
                  <span>User interactions feel smooth and responsive</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0">7</Badge>
                  <span>Error states display helpful messages</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0">8</Badge>
                  <span>Search and selection work as expected</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
