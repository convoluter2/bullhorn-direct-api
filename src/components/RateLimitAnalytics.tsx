import { useState, useEffect, useCallback } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  ChartLineUp, 
  Clock, 
  Gauge, 
  Queue, 
  ArrowsClockwise,
  DownloadSimple,
  Trash,
  TrendUp,
  TrendDown,
  Lightning,
  Warning
} from '@phosphor-icons/react'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { SpeedControl } from '@/components/SpeedControl'
import { toast } from 'sonner'

interface RateLimitSnapshot {
  timestamp: number
  limitPerMinute: number
  remaining: number
  resetTime: number
  queueLength: number
  requestsInProgress: number
  backoffMultiplier: number
}

interface RateLimitMetrics {
  totalRequests: number
  throttledRequests: number
  averageRemaining: number
  peakUsage: number
  lowestRemaining: number
  timesBelowThreshold: number
  timesExhausted: number
  averageQueueLength: number
  maxQueueLength: number
  totalThrottleTime: number
}

interface TimeRange {
  label: string
  value: string
  minutes: number
}

const TIME_RANGES: TimeRange[] = [
  { label: 'Last 5 Minutes', value: '5m', minutes: 5 },
  { label: 'Last 15 Minutes', value: '15m', minutes: 15 },
  { label: 'Last 30 Minutes', value: '30m', minutes: 30 },
  { label: 'Last Hour', value: '1h', minutes: 60 },
  { label: 'Last 6 Hours', value: '6h', minutes: 360 },
  { label: 'Last 24 Hours', value: '24h', minutes: 1440 },
  { label: 'All Time', value: 'all', minutes: Infinity },
]

export function RateLimitAnalytics() {
  const [snapshots, setSnapshots] = useKV<RateLimitSnapshot[]>('rate-limit-history', [])
  const [currentStatus, setCurrentStatus] = useState<any>(null)
  const [selectedRange, setSelectedRange] = useState<string>('1h')
  const [isRecording, setIsRecording] = useKV<boolean>('rate-limit-recording', true)

  useEffect(() => {
    if (!isRecording) return

    const captureSnapshot = () => {
      const status = bullhornAPI.getRateLimiterStatus()
      
      if (status && status.rateLimitInfo) {
        const snapshot: RateLimitSnapshot = {
          timestamp: Date.now(),
          limitPerMinute: status.rateLimitInfo.limitPerMinute,
          remaining: status.rateLimitInfo.remaining,
          resetTime: status.rateLimitInfo.resetTime,
          queueLength: status.queueLength,
          requestsInProgress: status.requestsInProgress,
          backoffMultiplier: status.backoffMultiplier,
        }

        setSnapshots((current) => {
          const existing = current || []
          const updated = [...existing, snapshot]
          const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000)
          return updated.filter(s => s.timestamp > cutoff)
        })
      }

      setCurrentStatus(status)
    }

    captureSnapshot()
    const interval = setInterval(captureSnapshot, 5000)

    return () => clearInterval(interval)
  }, [isRecording, setSnapshots])

  useEffect(() => {
    const updateStatus = () => {
      const status = bullhornAPI.getRateLimiterStatus()
      setCurrentStatus(status)
    }

    updateStatus()
    const interval = setInterval(updateStatus, 1000)

    return () => clearInterval(interval)
  }, [])

  const getFilteredSnapshots = useCallback(() => {
    const allSnapshots = snapshots || []
    const range = TIME_RANGES.find(r => r.value === selectedRange)
    if (!range || range.minutes === Infinity) {
      return allSnapshots
    }

    const cutoff = Date.now() - (range.minutes * 60 * 1000)
    return allSnapshots.filter(s => s.timestamp >= cutoff)
  }, [snapshots, selectedRange])

  const calculateMetrics = useCallback((): RateLimitMetrics => {
    const filtered = getFilteredSnapshots()
    
    if (filtered.length === 0) {
      return {
        totalRequests: 0,
        throttledRequests: 0,
        averageRemaining: 0,
        peakUsage: 0,
        lowestRemaining: 0,
        timesBelowThreshold: 0,
        timesExhausted: 0,
        averageQueueLength: 0,
        maxQueueLength: 0,
        totalThrottleTime: 0,
      }
    }

    const totalRequests = filtered.reduce((sum, s) => {
      const used = s.limitPerMinute - s.remaining
      return sum + used
    }, 0) / filtered.length

    const throttledRequests = filtered.filter(s => s.queueLength > 0).length
    const averageRemaining = filtered.reduce((sum, s) => sum + s.remaining, 0) / filtered.length
    
    const peakUsage = Math.max(...filtered.map(s => {
      const percentUsed = ((s.limitPerMinute - s.remaining) / s.limitPerMinute) * 100
      return percentUsed
    }))

    const lowestRemaining = Math.min(...filtered.map(s => s.remaining))
    
    const timesBelowThreshold = filtered.filter(s => {
      const threshold = s.limitPerMinute * 0.2
      return s.remaining < threshold
    }).length

    const timesExhausted = filtered.filter(s => s.remaining === 0).length
    const averageQueueLength = filtered.reduce((sum, s) => sum + s.queueLength, 0) / filtered.length
    const maxQueueLength = Math.max(...filtered.map(s => s.queueLength))

    return {
      totalRequests,
      throttledRequests,
      averageRemaining,
      peakUsage,
      lowestRemaining,
      timesBelowThreshold,
      timesExhausted,
      averageQueueLength,
      maxQueueLength,
      totalThrottleTime: 0,
    }
  }, [getFilteredSnapshots])

  const clearHistory = () => {
    if (confirm('Are you sure you want to clear all rate limit history?')) {
      setSnapshots(() => [])
      toast.success('Rate limit history cleared')
    }
  }

  const exportData = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      timeRange: selectedRange,
      metrics: calculateMetrics(),
      snapshots: getFilteredSnapshots(),
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rate-limit-analytics-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Analytics data exported')
  }

  const toggleRecording = () => {
    setIsRecording((current) => !current)
    toast.success(isRecording ? 'Recording paused' : 'Recording resumed')
  }

  const metrics = calculateMetrics()
  const filtered = getFilteredSnapshots()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ChartLineUp className="text-accent" size={28} weight="duotone" />
            Rate Limit Analytics
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Detailed API usage metrics and historical trends
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge 
            variant={isRecording ? 'default' : 'secondary'}
            className="gap-1.5"
          >
            <div className={`h-2 w-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-muted-foreground'}`} />
            {isRecording ? 'Recording' : 'Paused'}
          </Badge>
          <Button 
            variant="outline" 
            size="sm"
            onClick={toggleRecording}
          >
            <ArrowsClockwise size={16} />
            {isRecording ? 'Pause' : 'Resume'}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={exportData}
            disabled={filtered.length === 0}
          >
            <DownloadSimple size={16} />
            Export
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={clearHistory}
            disabled={!snapshots || snapshots.length === 0}
          >
            <Trash size={16} />
            Clear
          </Button>
        </div>
      </div>

      {currentStatus && currentStatus.rateLimitInfo && (
        <Card className="border-accent/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Gauge size={20} weight="duotone" className="text-accent" />
              Current Status
            </CardTitle>
            <CardDescription>Real-time rate limit information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Requests Remaining</div>
                <div className="text-2xl font-bold font-mono">
                  {currentStatus.rateLimitInfo.remaining}
                  <span className="text-sm text-muted-foreground ml-1">
                    / {currentStatus.rateLimitInfo.limitPerMinute}
                  </span>
                </div>
                <Progress 
                  value={(currentStatus.rateLimitInfo.remaining / currentStatus.rateLimitInfo.limitPerMinute) * 100}
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <Queue size={14} />
                  Queue Length
                </div>
                <div className="text-2xl font-bold font-mono">
                  {currentStatus.queueLength}
                </div>
                {currentStatus.queueLength > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {currentStatus.requestsInProgress} in progress
                  </Badge>
                )}
              </div>

              <div className="space-y-2">
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock size={14} />
                  Reset In
                </div>
                <div className="text-2xl font-bold font-mono">
                  {Math.max(0, Math.ceil((currentStatus.rateLimitInfo.resetTime - Date.now()) / 1000))}s
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <Lightning size={14} />
                  Backoff
                </div>
                <div className="text-2xl font-bold font-mono">
                  {currentStatus.backoffMultiplier.toFixed(1)}x
                </div>
                {currentStatus.backoffMultiplier > 1 && (
                  <Badge variant="outline" className="text-xs">
                    Throttling active
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {filtered.length} snapshots • Updated every 5 seconds
        </div>
        <Select value={selectedRange} onValueChange={setSelectedRange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIME_RANGES.map(range => (
              <SelectItem key={range.value} value={range.value}>
                {range.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="speed" className="gap-2">
            <Lightning size={16} />
            Speed
          </TabsTrigger>
          <TabsTrigger value="details">Detailed Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Peak Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-mono flex items-center gap-2">
                  {metrics.peakUsage.toFixed(1)}%
                  <TrendUp size={24} className="text-accent" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Highest API usage observed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Lowest Remaining
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-mono flex items-center gap-2">
                  {metrics.lowestRemaining}
                  <TrendDown size={24} className="text-destructive" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Minimum requests available
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Times Throttled
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-mono flex items-center gap-2">
                  {metrics.timesBelowThreshold}
                  <Warning size={24} className="text-yellow-500" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Below 20% threshold
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Times Exhausted
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-mono flex items-center gap-2">
                  {metrics.timesExhausted}
                  <Warning size={24} className="text-destructive" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Reached rate limit (0 remaining)
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Queue Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Average Queue Length</span>
                  <span className="font-mono font-semibold">{metrics.averageQueueLength.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Max Queue Length</span>
                  <span className="font-mono font-semibold">{metrics.maxQueueLength}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Throttled Snapshots</span>
                  <span className="font-mono font-semibold">
                    {metrics.throttledRequests} / {filtered.length}
                  </span>
                </div>
                {metrics.throttledRequests > 0 && (
                  <Progress 
                    value={(metrics.throttledRequests / filtered.length) * 100}
                    className="h-2"
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Usage Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Average Remaining</span>
                  <span className="font-mono font-semibold">{metrics.averageRemaining.toFixed(0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Average Requests/Min</span>
                  <span className="font-mono font-semibold">{metrics.totalRequests.toFixed(1)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Snapshots Collected</span>
                  <span className="font-mono font-semibold">{filtered.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Usage Timeline</CardTitle>
              <CardDescription>Rate limit consumption over time</CardDescription>
            </CardHeader>
            <CardContent>
              {filtered.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No data available for the selected time range
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered.slice(-20).reverse().map((snapshot, idx) => {
                    const percentUsed = ((snapshot.limitPerMinute - snapshot.remaining) / snapshot.limitPerMinute) * 100
                    const isLow = snapshot.remaining < snapshot.limitPerMinute * 0.2
                    const isExhausted = snapshot.remaining === 0
                    
                    return (
                      <div key={idx} className="flex items-center gap-4">
                        <div className="text-xs text-muted-foreground font-mono w-24 flex-shrink-0">
                          {new Date(snapshot.timestamp).toLocaleTimeString()}
                        </div>
                        <div className="flex-1">
                          <Progress 
                            value={percentUsed}
                            className={`h-3 ${
                              isExhausted ? '[&>div]:bg-destructive' :
                              isLow ? '[&>div]:bg-yellow-500' :
                              '[&>div]:bg-accent'
                            }`}
                          />
                        </div>
                        <div className="text-xs font-mono w-32 flex-shrink-0 text-right">
                          {snapshot.remaining} / {snapshot.limitPerMinute}
                        </div>
                        {snapshot.queueLength > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            Q: {snapshot.queueLength}
                          </Badge>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detailed Snapshot History</CardTitle>
              <CardDescription>Complete historical data</CardDescription>
            </CardHeader>
            <CardContent>
              {filtered.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No data available for the selected time range
                </div>
              ) : (
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  <div className="grid grid-cols-7 gap-4 pb-2 border-b text-xs font-semibold text-muted-foreground sticky top-0 bg-card">
                    <div>Timestamp</div>
                    <div>Limit</div>
                    <div>Remaining</div>
                    <div>Used %</div>
                    <div>Queue</div>
                    <div>In Progress</div>
                    <div>Backoff</div>
                  </div>
                  {filtered.slice().reverse().map((snapshot, idx) => {
                    const percentUsed = ((snapshot.limitPerMinute - snapshot.remaining) / snapshot.limitPerMinute) * 100
                    
                    return (
                      <div key={idx} className="grid grid-cols-7 gap-4 py-2 text-sm font-mono border-b border-border/50 hover:bg-muted/30">
                        <div className="text-xs">
                          {new Date(snapshot.timestamp).toLocaleTimeString()}
                        </div>
                        <div>{snapshot.limitPerMinute}</div>
                        <div className={
                          snapshot.remaining === 0 ? 'text-destructive font-semibold' :
                          snapshot.remaining < snapshot.limitPerMinute * 0.2 ? 'text-yellow-600 dark:text-yellow-400' :
                          ''
                        }>
                          {snapshot.remaining}
                        </div>
                        <div>{percentUsed.toFixed(1)}%</div>
                        <div>{snapshot.queueLength}</div>
                        <div>{snapshot.requestsInProgress}</div>
                        <div>{snapshot.backoffMultiplier.toFixed(1)}x</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="speed" className="space-y-4">
          <SpeedControl />
        </TabsContent>
      </Tabs>

      {metrics.timesExhausted > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <Warning size={20} weight="fill" />
              Rate Limit Exhaustion Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              The API rate limit was exhausted {metrics.timesExhausted} times during the selected period. 
              Consider optimizing your request patterns or increasing the time between operations.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
