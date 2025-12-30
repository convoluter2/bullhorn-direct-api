import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Gauge, Play, Stop, CheckCircle, XCircle } from '@phosphor-icons/react'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { toast } from 'sonner'

export function SpeedTest() {
  const [testing, setTesting] = useState(false)
  const [testResults, setTestResults] = useState<{
    totalCalls: number
    successfulCalls: number
    failedCalls: number
    duration: number
    callsPerMinute: number
    avgResponseTime: number
  } | null>(null)
  const [progress, setProgress] = useState(0)
  const [currentSpeed, setCurrentSpeed] = useState(0)

  const runSpeedTest = async () => {
    setTesting(true)
    setTestResults(null)
    setProgress(0)
    setCurrentSpeed(0)

    const totalTestCalls = 100
    const startTime = Date.now()
    let successCount = 0
    let failedCount = 0
    let totalResponseTime = 0

    try {
      toast.info(`Starting speed test with ${totalTestCalls} calls...`)

      const promises: Promise<void>[] = []

      for (let i = 0; i < totalTestCalls; i++) {
        const callStartTime = Date.now()
        
        const promise = bullhornAPI.query(
          'Candidate',
          ['id', 'firstName', 'lastName'],
          'isDeleted=false',
          { count: '1' }
        )
          .then(() => {
            successCount++
            totalResponseTime += Date.now() - callStartTime
            const currentProgress = ((i + 1) / totalTestCalls) * 100
            setProgress(currentProgress)
            
            const elapsed = (Date.now() - startTime) / 1000 / 60
            const currentCPM = elapsed > 0 ? Math.round((i + 1) / elapsed) : 0
            setCurrentSpeed(currentCPM)
          })
          .catch((error) => {
            failedCount++
            console.error(`Call ${i + 1} failed:`, error)
          })

        promises.push(promise)

        if ((i + 1) % 10 === 0) {
          await Promise.all(promises.slice(-10))
        }
      }

      await Promise.all(promises)

      const endTime = Date.now()
      const durationMs = endTime - startTime
      const durationMinutes = durationMs / 1000 / 60
      const actualCallsPerMinute = Math.round(totalTestCalls / durationMinutes)
      const avgResponseTime = totalResponseTime / successCount

      const results = {
        totalCalls: totalTestCalls,
        successfulCalls: successCount,
        failedCalls: failedCount,
        duration: durationMs,
        callsPerMinute: actualCallsPerMinute,
        avgResponseTime: Math.round(avgResponseTime)
      }

      setTestResults(results)
      
      if (actualCallsPerMinute >= 1400) {
        toast.success(`Speed test passed! ${actualCallsPerMinute} calls/min`)
      } else if (actualCallsPerMinute >= 1000) {
        toast.warning(`Speed test completed at ${actualCallsPerMinute} calls/min (target: 1500)`)
      } else {
        toast.error(`Speed test below target: ${actualCallsPerMinute} calls/min`)
      }
    } catch (error) {
      toast.error('Speed test failed: ' + String(error))
      console.error('Speed test error:', error)
    } finally {
      setTesting(false)
    }
  }

  const stopTest = () => {
    setTesting(false)
    toast.info('Speed test stopped')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="text-accent" />
          API Speed Test
        </CardTitle>
        <CardDescription>
          Test actual API throughput to validate 1500 calls/minute target
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            onClick={runSpeedTest}
            disabled={testing}
            className="flex-1"
          >
            <Play />
            {testing ? 'Testing...' : 'Run Speed Test'}
          </Button>
          {testing && (
            <Button
              onClick={stopTest}
              variant="destructive"
            >
              <Stop />
              Stop
            </Button>
          )}
        </div>

        {testing && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Progress</span>
                <span className="font-mono">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">Current Speed</span>
              <div className="flex items-center gap-2">
                <Gauge size={20} className="text-accent" />
                <span className="text-lg font-bold font-mono">
                  {currentSpeed}
                </span>
                <span className="text-sm text-muted-foreground">/min</span>
              </div>
            </div>
          </div>
        )}

        {testResults && (
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Total Calls</div>
                <div className="text-2xl font-bold font-mono">
                  {testResults.totalCalls}
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Duration</div>
                <div className="text-2xl font-bold font-mono">
                  {(testResults.duration / 1000).toFixed(1)}s
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Success Rate</div>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold font-mono">
                    {Math.round((testResults.successfulCalls / testResults.totalCalls) * 100)}%
                  </div>
                  {testResults.failedCalls === 0 ? (
                    <CheckCircle className="text-green-500" size={20} />
                  ) : (
                    <XCircle className="text-destructive" size={20} />
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Avg Response</div>
                <div className="text-2xl font-bold font-mono">
                  {testResults.avgResponseTime}ms
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Actual Throughput</span>
                <Badge 
                  variant={testResults.callsPerMinute >= 1400 ? 'default' : 'secondary'}
                  className="text-base"
                >
                  {testResults.callsPerMinute >= 1400 ? 'PASS' : 'NEEDS IMPROVEMENT'}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <Gauge size={32} className="text-accent" />
                <div>
                  <div className="text-4xl font-bold font-mono">
                    {testResults.callsPerMinute}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    calls per minute
                  </div>
                </div>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                Target: 1,500 calls/min • 
                {testResults.callsPerMinute >= 1500 ? ' 🎉 Target achieved!' : 
                 testResults.callsPerMinute >= 1400 ? ' ✅ Within acceptable range' :
                 testResults.callsPerMinute >= 1000 ? ' ⚠️ Below target' :
                 ' ❌ Significantly below target'}
              </div>
            </div>

            {testResults.failedCalls > 0 && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <XCircle className="text-destructive" size={16} />
                  <span className="font-medium">
                    {testResults.failedCalls} call{testResults.failedCalls !== 1 ? 's' : ''} failed
                  </span>
                </div>
              </div>
            )}

            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Test uses lightweight Candidate queries with minimal fields</p>
              <p>• Results reflect current network conditions and API load</p>
              <p>• Run multiple tests for more accurate average throughput</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
