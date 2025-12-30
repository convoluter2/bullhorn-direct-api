import { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Gauge, Play, Stop, CheckCircle, XCircle, ArrowCounterClockwise } from '@phosphor-icons/react'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { bullhornRateLimiter } from '@/lib/rate-limiter'
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
    peakSpeed: number
    rateLimited: boolean
  } | null>(null)
  const [progress, setProgress] = useState(0)
  const [currentSpeed, setCurrentSpeed] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [completedCalls, setCompletedCalls] = useState(0)
  const [totalCalls, setTotalCalls] = useState(1500)
  const abortControllerRef = useRef<AbortController | null>(null)

  const runSpeedTest = async () => {
    setTesting(true)
    setTestResults(null)
    setProgress(0)
    setCurrentSpeed(0)
    setElapsedTime(0)
    setCompletedCalls(0)
    setTotalCalls(1500)
    abortControllerRef.current = new AbortController()

    const totalTestCalls = 1500
    const testDurationMs = 60000
    const startTime = Date.now()
    let successCount = 0
    let failedCount = 0
    let totalResponseTime = 0
    let peakSpeed = 0
    let rateLimited = false

    const elapsedInterval = setInterval(() => {
      if (!abortControllerRef.current?.signal.aborted) {
        setElapsedTime(Date.now() - startTime)
      }
    }, 100)

    const savedSettings = bullhornRateLimiter.getSpeedSettings()
    const savedMaxConcurrent = bullhornAPI.getRateLimiterStatus().requestsInProgress

    try {
      toast.info('Starting speed test - bypassing rate limiter for max throughput...', { duration: 3000 })

      bullhornRateLimiter.setMaxConcurrentRequests(100)
      bullhornRateLimiter.setMinDelay(0)
      bullhornRateLimiter.setTargetCallsPerMinute(1500)
      bullhornRateLimiter.setSpeedMultiplier(1.0)

      const promises: Promise<void>[] = []
      const maxConcurrent = 100
      let activePromises = 0

      const makeCall = async (i: number): Promise<void> => {
        if (abortControllerRef.current?.signal.aborted) {
          return
        }

        activePromises++
        const callStartTime = Date.now()
        
        try {
          const session = bullhornAPI.getSession()
          if (!session) {
            throw new Error('No session available')
          }

          const url = `${session.restUrl}query/Candidate?BhRestToken=${session.BhRestToken}&fields=id&where=isDeleted=false&count=1&start=0`
          const response = await fetch(url)

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
          }

          successCount++
          const responseTime = Date.now() - callStartTime
          totalResponseTime += responseTime
          
          if (response.headers) {
            const remaining = response.headers.get('X-RateLimit-Remaining')
            if (remaining && parseInt(remaining) === 0) {
              rateLimited = true
            }
          }
        } catch (error: any) {
          failedCount++
          if (error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
            rateLimited = true
          }
        } finally {
          activePromises--
          
          const completed = successCount + failedCount
          setCompletedCalls(completed)
          const currentProgress = (completed / totalTestCalls) * 100
          setProgress(Math.min(100, currentProgress))
          
          const elapsed = (Date.now() - startTime) / 1000 / 60
          if (elapsed > 0) {
            const currentCPM = Math.round(completed / elapsed)
            setCurrentSpeed(currentCPM)
            peakSpeed = Math.max(peakSpeed, currentCPM)
          }
        }
      }

      for (let i = 0; i < totalTestCalls; i++) {
        if (abortControllerRef.current?.signal.aborted) {
          console.log('Speed test aborted by user')
          break
        }

        while (activePromises >= maxConcurrent) {
          await new Promise(resolve => setTimeout(resolve, 10))
        }

        promises.push(makeCall(i))

        if (Date.now() - startTime >= testDurationMs) {
          console.log(`Reached test duration limit (${testDurationMs}ms), stopping...`)
          break
        }
      }

      await Promise.all(promises)

      const endTime = Date.now()
      const durationMs = endTime - startTime
      const durationMinutes = durationMs / 1000 / 60
      const totalCompleted = successCount + failedCount
      const actualCallsPerMinute = Math.round(totalCompleted / durationMinutes)
      const avgResponseTime = successCount > 0 ? totalResponseTime / successCount : 0

      const results = {
        totalCalls: totalCompleted,
        successfulCalls: successCount,
        failedCalls: failedCount,
        duration: durationMs,
        callsPerMinute: actualCallsPerMinute,
        avgResponseTime: Math.round(avgResponseTime),
        peakSpeed,
        rateLimited
      }

      setTestResults(results)
      
      console.log('🏁 Speed Test Results:', {
        totalCalls: totalCompleted,
        successful: successCount,
        failed: failedCount,
        durationSeconds: (durationMs / 1000).toFixed(1),
        callsPerMinute: actualCallsPerMinute,
        avgResponseMs: Math.round(avgResponseTime),
        peakSpeed,
        rateLimited
      })
      
      if (actualCallsPerMinute >= 1400) {
        toast.success(`✅ Speed test PASSED! ${actualCallsPerMinute} calls/min`, { duration: 5000 })
      } else if (actualCallsPerMinute >= 1000) {
        toast.warning(`⚠️ Speed test completed at ${actualCallsPerMinute} calls/min (target: 1500)`, { duration: 5000 })
      } else {
        toast.error(`❌ Speed test below target: ${actualCallsPerMinute} calls/min`, { duration: 5000 })
      }
    } catch (error) {
      toast.error('Speed test failed: ' + String(error))
      console.error('Speed test error:', error)
    } finally {
      bullhornRateLimiter.setMaxConcurrentRequests(savedSettings.maxConcurrent)
      bullhornRateLimiter.setMinDelay(savedSettings.minDelay)
      bullhornRateLimiter.setTargetCallsPerMinute(savedSettings.targetCallsPerMinute)
      bullhornRateLimiter.setSpeedMultiplier(savedSettings.speedMultiplier)
      
      clearInterval(elapsedInterval)
      setTesting(false)
      abortControllerRef.current = null
    }
  }

  const stopTest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setTesting(false)
    toast.info('Speed test stopped')
  }

  const resetRateLimiter = () => {
    bullhornRateLimiter.resetToDefaults()
    bullhornRateLimiter.clearQueue()
    toast.success('Rate limiter reset to 1500 calls/min')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="text-accent" />
          API Speed Test - 1500 Calls/Minute Validation
        </CardTitle>
        <CardDescription>
          Test raw API throughput by making 1500 direct fetch calls with 100 concurrent connections, bypassing the rate limiter to measure maximum possible speed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-3">
          <Button
            onClick={runSpeedTest}
            disabled={testing}
            className="flex-1"
          >
            <Play />
            {testing ? 'Testing...' : 'Run Speed Test (1500 calls)'}
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
          <Button
            onClick={resetRateLimiter}
            variant="outline"
            size="sm"
            disabled={testing}
          >
            <ArrowCounterClockwise />
            Reset
          </Button>
        </div>

        {testing && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Progress</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono">{Math.round(progress)}%</span>
                  <span className="text-muted-foreground">
                    {(elapsedTime / 1000).toFixed(1)}s elapsed
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({completedCalls}/{totalCalls} calls)
                  </span>
                </div>
              </div>
              <Progress value={progress} />
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center justify-between p-4 bg-accent/10 rounded-lg border border-accent/20">
                <span className="text-sm font-medium">Current Speed</span>
                <div className="flex items-center gap-2">
                  <Gauge size={24} className="text-accent" weight="duotone" />
                  <span className="text-2xl font-bold font-mono">
                    {currentSpeed}
                  </span>
                  <span className="text-sm text-muted-foreground">/min</span>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-muted/50 rounded">
                  <div className="text-xs text-muted-foreground">Target</div>
                  <div className="text-lg font-bold font-mono">1500</div>
                </div>
                <div className="p-2 bg-muted/50 rounded">
                  <div className="text-xs text-muted-foreground">Min Pass</div>
                  <div className="text-lg font-bold font-mono">1400</div>
                </div>
                <div className="p-2 bg-muted/50 rounded">
                  <div className="text-xs text-muted-foreground">Acceptable</div>
                  <div className="text-lg font-bold font-mono">1000</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {testResults && (
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Total Calls</div>
                <div className="text-2xl font-bold font-mono">
                  {testResults.totalCalls.toLocaleString()}
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
                    <CheckCircle className="text-green-500" size={20} weight="duotone" />
                  ) : (
                    <XCircle className="text-destructive" size={20} weight="duotone" />
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
                  variant={testResults.callsPerMinute >= 1400 ? 'default' : testResults.callsPerMinute >= 1000 ? 'secondary' : 'destructive'}
                  className="text-base"
                >
                  {testResults.callsPerMinute >= 1400 ? '✅ PASS' : testResults.callsPerMinute >= 1000 ? '⚠️ ACCEPTABLE' : '❌ FAIL'}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <Gauge size={40} className="text-accent" weight="duotone" />
                <div>
                  <div className="text-4xl font-bold font-mono">
                    {testResults.callsPerMinute.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    calls per minute
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-accent/20 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Peak Speed:</span>
                  <span className="ml-2 font-mono font-semibold">{testResults.peakSpeed.toLocaleString()}/min</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Rate Limited:</span>
                  <span className="ml-2 font-mono font-semibold">{testResults.rateLimited ? 'Yes ⚠️' : 'No ✓'}</span>
                </div>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                Target: 1,500 calls/min • 
                {testResults.callsPerMinute >= 1500 ? ' 🎉 Target achieved!' : 
                 testResults.callsPerMinute >= 1400 ? ' ✅ Within acceptable range (93%+)' :
                 testResults.callsPerMinute >= 1000 ? ' ⚠️ Below target but functional (67%+)' :
                 ' ❌ Significantly below target - check network/API'}
              </div>
            </div>

            {testResults.failedCalls > 0 && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <XCircle className="text-destructive" size={16} weight="duotone" />
                  <span className="font-medium">
                    {testResults.failedCalls} call{testResults.failedCalls !== 1 ? 's' : ''} failed
                  </span>
                  <span className="text-muted-foreground">
                    ({Math.round((testResults.failedCalls / testResults.totalCalls) * 100)}% failure rate)
                  </span>
                </div>
              </div>
            )}

            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="text-xs font-medium mb-2">Test Details</div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Makes 1500 direct fetch() calls with minimal query (Candidate entity, ID field only)</p>
                <p>• Uses 100 concurrent connections - BYPASSES rate limiter for raw speed measurement</p>
                <p>• Restores normal rate limiter settings after test completes</p>
                <p>• Tests actual network + API throughput without artificial throttling</p>
                <p>• Results vary based on network latency, API server load, and data center location</p>
                <p>• For production loads, use the configured rate limiter (1500 calls/min with backoff)</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
