import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ChartLineUp, Clock, Gauge } from '@phosphor-icons/react'
import { bullhornAPI } from '@/lib/bullhorn-api'

export function APIBandwidthTracker() {
  const [rateLimitInfo, setRateLimitInfo] = useState<{
    limitPerMinute: number
    remaining: number
    resetTime: number
    lastUpdated: number
  } | null>(null)
  const [queueStatus, setQueueStatus] = useState<{
    queueLength: number
    requestsInProgress: number
  }>({ queueLength: 0, requestsInProgress: 0 })

  useEffect(() => {
    const updateStatus = () => {
      const limitInfo = bullhornAPI.getRateLimitInfo()
      const status = bullhornAPI.getRateLimiterStatus()
      
      setRateLimitInfo(limitInfo)
      setQueueStatus({
        queueLength: status.queueLength,
        requestsInProgress: status.requestsInProgress
      })
    }

    updateStatus()
    const interval = setInterval(updateStatus, 1000)
    return () => clearInterval(interval)
  }, [])

  const getTimeUntilReset = () => {
    if (!rateLimitInfo) return null
    const now = Date.now()
    const timeRemaining = Math.max(0, rateLimitInfo.resetTime - now)
    const seconds = Math.floor(timeRemaining / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`
    }
    return `${seconds}s`
  }

  const getUsagePercentage = () => {
    if (!rateLimitInfo) return 0
    return Math.round(((rateLimitInfo.limitPerMinute - rateLimitInfo.remaining) / rateLimitInfo.limitPerMinute) * 100)
  }

  const getUsageColor = () => {
    const usage = getUsagePercentage()
    if (usage >= 90) return 'text-destructive'
    if (usage >= 70) return 'text-yellow-500'
    return 'text-accent'
  }

  if (!rateLimitInfo) {
    return null
  }

  const timeUntilReset = getTimeUntilReset()
  const usagePercentage = getUsagePercentage()

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border/50">
      <CardContent className="p-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 min-w-[140px]">
            <Gauge className={getUsageColor()} size={20} weight="duotone" />
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">API Bandwidth</span>
              <span className={`text-sm font-bold ${getUsageColor()}`}>
                {rateLimitInfo.remaining}/{rateLimitInfo.limitPerMinute}
              </span>
            </div>
          </div>

          <div className="flex-1 min-w-[100px] max-w-[200px]">
            <Progress 
              value={100 - usagePercentage} 
              className="h-2"
            />
            <span className="text-xs text-muted-foreground">
              {100 - usagePercentage}% available
            </span>
          </div>

          <div className="flex items-center gap-2 min-w-[100px]">
            <Clock size={18} className="text-muted-foreground" weight="duotone" />
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Reset in</span>
              <span className="text-sm font-mono font-semibold">
                {timeUntilReset}
              </span>
            </div>
          </div>

          {(queueStatus.queueLength > 0 || queueStatus.requestsInProgress > 0) && (
            <div className="flex items-center gap-2">
              <ChartLineUp size={18} className="text-accent" weight="duotone" />
              <div className="flex gap-2">
                {queueStatus.requestsInProgress > 0 && (
                  <Badge variant="default" className="text-xs">
                    {queueStatus.requestsInProgress} active
                  </Badge>
                )}
                {queueStatus.queueLength > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {queueStatus.queueLength} queued
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
