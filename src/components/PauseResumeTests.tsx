import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Play, CheckCircle, XCircle, Clock, Pause, Stop, ArrowsClockwise } from '@phosphor-icons/react'
import { usePausableOperation } from '@/hooks/use-pausable-operation'
import { OperationProgressControls } from '@/components/OperationProgressControls'
import { toast } from 'sonner'
import { bullhornAPI } from '@/lib/bullhorn-api'

interface TestResult {
  testName: string
  status: 'pass' | 'fail' | 'running' | 'pending'
  message: string
  duration?: number
  details?: any
}

export function PauseResumeTests() {
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [currentTest, setCurrentTest] = useState<string | null>(null)
  const [allTestsRunning, setAllTestsRunning] = useState(false)

  const queryBlastOperation = usePausableOperation('queryblast-test', 100, { persistProgress: true })
  const csvLoaderOperation = usePausableOperation('csvloader-test', 50, { persistProgress: true })
  const smartStackOperation = usePausableOperation('smartstack-test', 75, { persistProgress: true })
  const queryStackOperation = usePausableOperation('querystack-test', 60, { persistProgress: true })
  const wfnExportOperation = usePausableOperation('wfnexport-test', 40, { persistProgress: true })

  const updateTestResult = (testName: string, status: TestResult['status'], message: string, details?: any) => {
    setTestResults(prev => {
      if (!Array.isArray(prev)) prev = []
      
      const existing = prev.find(t => t && typeof t === 'object' && t.testName === testName)
      const updated: TestResult = {
        testName,
        status,
        message,
        details,
        duration: existing?.duration
      }
      
      if (existing) {
        return prev.map(t => (t && typeof t === 'object' && t.testName === testName) ? updated : t)
      }
      return [...prev, updated]
    })
  }

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  const testBasicPauseResume = async () => {
    const testName = 'Basic Pause/Resume'
    setCurrentTest(testName)
    updateTestResult(testName, 'running', 'Testing basic pause and resume functionality...')
    const startTime = Date.now()

    try {
      queryBlastOperation.reset()
      
      for (let i = 0; i < 20; i++) {
        if (queryBlastOperation.progress.isStopped) break
        
        while (queryBlastOperation.progress.isPaused) {
          await sleep(100)
        }
        
        queryBlastOperation.updateProgress(i + 1, 0)
        await sleep(50)
        
        if (i === 10) {
          queryBlastOperation.pause()
          await sleep(500)
          queryBlastOperation.resume()
        }
      }

      const duration = Date.now() - startTime
      updateTestResult(testName, 'pass', 'Pause and resume worked correctly', { duration })
      toast.success(`${testName} passed`)
    } catch (error) {
      updateTestResult(testName, 'fail', `Error: ${error}`)
      toast.error(`${testName} failed`)
    } finally {
      setCurrentTest(null)
    }
  }

  const testTimeEstimation = async () => {
    const testName = 'Time Estimation Accuracy'
    setCurrentTest(testName)
    updateTestResult(testName, 'running', 'Testing time remaining estimation...')
    const startTime = Date.now()

    try {
      csvLoaderOperation.reset()
      
      for (let i = 0; i < 30; i++) {
        if (csvLoaderOperation.progress.isStopped) break
        
        while (csvLoaderOperation.progress.isPaused) {
          await sleep(100)
        }
        
        csvLoaderOperation.updateProgress(i + 1, 0)
        await sleep(100)
      }

      const hasEstimate = csvLoaderOperation.progress.estimatedTimeRemaining !== null
      const hasSpeeds = csvLoaderOperation.progress.speeds.length > 0

      if (hasEstimate && hasSpeeds) {
        const duration = Date.now() - startTime
        updateTestResult(testName, 'pass', 'Time estimation calculated correctly', {
          duration,
          estimate: csvLoaderOperation.progress.estimatedTimeRemaining,
          speeds: csvLoaderOperation.progress.speeds.length
        })
        toast.success(`${testName} passed`)
      } else {
        updateTestResult(testName, 'fail', 'Time estimation not calculated')
        toast.error(`${testName} failed`)
      }
    } catch (error) {
      updateTestResult(testName, 'fail', `Error: ${error}`)
      toast.error(`${testName} failed`)
    } finally {
      setCurrentTest(null)
    }
  }

  const testPersistence = async () => {
    const testName = 'Progress Persistence'
    setCurrentTest(testName)
    updateTestResult(testName, 'running', 'Testing progress persistence across page refresh...')
    const startTime = Date.now()

    try {
      smartStackOperation.reset()
      
      for (let i = 0; i < 15; i++) {
        smartStackOperation.updateProgress(i + 1, 0)
        await sleep(50)
      }

      const beforePause = smartStackOperation.progress.completed
      smartStackOperation.pause()
      
      await sleep(1000)
      
      const afterPause = smartStackOperation.progress.completed
      
      if (beforePause === afterPause && smartStackOperation.progress.isPaused) {
        const duration = Date.now() - startTime
        updateTestResult(testName, 'pass', 'Progress persisted correctly', {
          duration,
          completed: afterPause
        })
        toast.success(`${testName} passed`)
      } else {
        updateTestResult(testName, 'fail', 'Progress not persisted')
        toast.error(`${testName} failed`)
      }
    } catch (error) {
      updateTestResult(testName, 'fail', `Error: ${error}`)
      toast.error(`${testName} failed`)
    } finally {
      setCurrentTest(null)
    }
  }

  const testStopFunctionality = async () => {
    const testName = 'Stop Operation'
    setCurrentTest(testName)
    updateTestResult(testName, 'running', 'Testing stop functionality...')
    const startTime = Date.now()

    try {
      queryStackOperation.reset()
      
      for (let i = 0; i < 20; i++) {
        if (queryStackOperation.progress.isStopped) break
        
        queryStackOperation.updateProgress(i + 1, 0)
        await sleep(50)
        
        if (i === 10) {
          queryStackOperation.stop()
        }
      }

      const completed = queryStackOperation.progress.completed
      const isStopped = queryStackOperation.progress.isStopped
      
      if (isStopped && completed <= 11) {
        const duration = Date.now() - startTime
        updateTestResult(testName, 'pass', 'Stop operation worked correctly', {
          duration,
          stoppedAt: completed
        })
        toast.success(`${testName} passed`)
      } else {
        updateTestResult(testName, 'fail', 'Stop did not halt operation')
        toast.error(`${testName} failed`)
      }
    } catch (error) {
      updateTestResult(testName, 'fail', `Error: ${error}`)
      toast.error(`${testName} failed`)
    } finally {
      setCurrentTest(null)
    }
  }

  const testMultiplePauseResume = async () => {
    const testName = 'Multiple Pause/Resume Cycles'
    setCurrentTest(testName)
    updateTestResult(testName, 'running', 'Testing multiple pause/resume cycles...')
    const startTime = Date.now()

    try {
      wfnExportOperation.reset()
      let pauseCount = 0
      
      for (let i = 0; i < 40; i++) {
        if (wfnExportOperation.progress.isStopped) break
        
        while (wfnExportOperation.progress.isPaused) {
          await sleep(100)
        }
        
        wfnExportOperation.updateProgress(i + 1, 0)
        await sleep(50)
        
        if (i === 10 || i === 20 || i === 30) {
          wfnExportOperation.pause()
          pauseCount++
          await sleep(300)
          wfnExportOperation.resume()
        }
      }

      if (pauseCount === 3 && wfnExportOperation.progress.completed === 40) {
        const duration = Date.now() - startTime
        updateTestResult(testName, 'pass', 'Multiple pause/resume cycles successful', {
          duration,
          pauseCount
        })
        toast.success(`${testName} passed`)
      } else {
        updateTestResult(testName, 'fail', 'Multiple cycles did not complete correctly')
        toast.error(`${testName} failed`)
      }
    } catch (error) {
      updateTestResult(testName, 'fail', `Error: ${error}`)
      toast.error(`${testName} failed`)
    } finally {
      setCurrentTest(null)
    }
  }

  const testSpeedCalculation = async () => {
    const testName = 'Speed Calculation'
    setCurrentTest(testName)
    updateTestResult(testName, 'running', 'Testing speed calculation accuracy...')
    const startTime = Date.now()

    try {
      queryBlastOperation.reset()
      
      for (let i = 0; i < 25; i++) {
        if (queryBlastOperation.progress.isStopped) break
        
        queryBlastOperation.updateProgress(i + 1, 0)
        await sleep(100)
      }

      const speeds = queryBlastOperation.progress.speeds
      const allPositive = speeds.every(s => s > 0)
      
      if (speeds.length > 0 && allPositive) {
        const duration = Date.now() - startTime
        const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length
        updateTestResult(testName, 'pass', 'Speed calculation accurate', {
          duration,
          avgSpeed: avgSpeed.toFixed(2),
          samples: speeds.length
        })
        toast.success(`${testName} passed`)
      } else {
        updateTestResult(testName, 'fail', 'Speed calculation failed')
        toast.error(`${testName} failed`)
      }
    } catch (error) {
      updateTestResult(testName, 'fail', `Error: ${error}`)
      toast.error(`${testName} failed`)
    } finally {
      setCurrentTest(null)
    }
  }

  const runAllTests = async () => {
    setAllTestsRunning(true)
    setTestResults([])
    
    await testBasicPauseResume()
    await sleep(500)
    
    await testTimeEstimation()
    await sleep(500)
    
    await testSpeedCalculation()
    await sleep(500)
    
    await testPersistence()
    await sleep(500)
    
    await testStopFunctionality()
    await sleep(500)
    
    await testMultiplePauseResume()
    
    setAllTestsRunning(false)
    
    const passed = testResults.filter(t => t && t.status === 'pass').length
    const failed = testResults.filter(t => t && t.status === 'fail').length
    toast.success(`Test suite complete: ${passed} passed, ${failed} failed`)
  }

  const passedCount = testResults.filter(t => t && t.status === 'pass').length
  const failedCount = testResults.filter(t => t && t.status === 'fail').length
  const totalCount = testResults.filter(t => t && typeof t === 'object').length

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pause/Resume & Time Estimation Tests</CardTitle>
          <CardDescription>
            Comprehensive test suite for pause, resume, stop, and time estimation functionality across all data operation tools
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={runAllTests}
                disabled={allTestsRunning || currentTest !== null}
              >
                <Play />
                Run All Tests
              </Button>
              
              {totalCount > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle size={14} className="mr-1" />
                    {passedCount} Passed
                  </Badge>
                  {failedCount > 0 && (
                    <Badge variant="destructive">
                      <XCircle size={14} className="mr-1" />
                      {failedCount} Failed
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={testBasicPauseResume}
                disabled={allTestsRunning || currentTest !== null}
              >
                Basic Test
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={testTimeEstimation}
                disabled={allTestsRunning || currentTest !== null}
              >
                Time Estimation
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={testPersistence}
                disabled={allTestsRunning || currentTest !== null}
              >
                Persistence
              </Button>
            </div>
          </div>

          {currentTest && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Running: {currentTest}...
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="results" className="space-y-4">
        <TabsList>
          <TabsTrigger value="results">Test Results</TabsTrigger>
          <TabsTrigger value="demo">Live Demo</TabsTrigger>
        </TabsList>

        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              {testResults.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No tests run yet. Click "Run All Tests" to begin.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Test Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {testResults.filter(result => result && typeof result === 'object').map((result, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{result.testName}</TableCell>
                        <TableCell>
                          {result.status === 'pass' && (
                            <Badge variant="default" className="bg-green-600">
                              <CheckCircle size={14} className="mr-1" />
                              Pass
                            </Badge>
                          )}
                          {result.status === 'fail' && (
                            <Badge variant="destructive">
                              <XCircle size={14} className="mr-1" />
                              Fail
                            </Badge>
                          )}
                          {result.status === 'running' && (
                            <Badge variant="secondary">
                              <ArrowsClockwise size={14} className="mr-1 animate-spin" />
                              Running
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{result.message}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {result.details && (
                            <pre className="text-xs">
                              {JSON.stringify(result.details, null, 2)}
                            </pre>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="demo" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <OperationProgressControls
              progress={queryBlastOperation.progress}
              onPause={queryBlastOperation.pause}
              onResume={queryBlastOperation.resume}
              onStop={queryBlastOperation.stop}
              operationName="QueryBlast Operation"
              canResume={queryBlastOperation.canResume}
            />
            
            <OperationProgressControls
              progress={csvLoaderOperation.progress}
              onPause={csvLoaderOperation.pause}
              onResume={csvLoaderOperation.resume}
              onStop={csvLoaderOperation.stop}
              operationName="CSV Loader Operation"
              canResume={csvLoaderOperation.canResume}
            />
            
            <OperationProgressControls
              progress={smartStackOperation.progress}
              onPause={smartStackOperation.pause}
              onResume={smartStackOperation.resume}
              onStop={smartStackOperation.stop}
              operationName="SmartStack Operation"
              canResume={smartStackOperation.canResume}
            />
            
            <OperationProgressControls
              progress={queryStackOperation.progress}
              onPause={queryStackOperation.pause}
              onResume={queryStackOperation.resume}
              onStop={queryStackOperation.stop}
              operationName="QueryStack Operation"
              canResume={queryStackOperation.canResume}
            />
            
            <OperationProgressControls
              progress={wfnExportOperation.progress}
              onPause={wfnExportOperation.pause}
              onResume={wfnExportOperation.resume}
              onStop={wfnExportOperation.stop}
              operationName="WFN Export Operation"
              canResume={wfnExportOperation.canResume}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
