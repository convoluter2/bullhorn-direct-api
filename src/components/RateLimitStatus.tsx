import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Progress } from '@/components/ui/progress'
import { Clock, Queue, Gauge } from '@phosphor-icons/react'
import { bullhornAPI } from '@/lib/bullhorn-api'

export function RateLimitStatus() {
  const [status, setStatus] = useState<{
    queueLength: number
    requestsInProgress: number
    rateLimitInfo: {
      limitPerMinute: number
      remaining: number
      resetTime: number
      lastUpdated: number
    } | null
    backoffMultiplier: number
  } | null>(null)

  useEffect(() => {
    const updateStatus = () => {
      const currentStatus = bullhornAPI.getRateLimiterStatus()
      setStatus(currentStatus)
    }

    updateStatus()
    const interval = setInterval(updateStatus, 1000)

    return () => clearInterval(interval)
  }, [])

  if (!status || !status.rateLimitInfo) {
    return null
  }

  const { rateLimitInfo, queueLength, requestsInProgress, backoffMultiplier } = status
  const percentUsed = ((rateLimitInfo.limitPerMinute - rateLimitInfo.remaining) / rateLimitInfo.limitPerMinute) * 100
  const percentRemaining = 100 - percentUsed
  const timeUntilReset = Math.max(0, rateLimitInfo.resetTime - Date.now())
  const secondsUntilReset = Math.ceil(timeUntilReset / 1000)

  const isLow = rateLimitInfo.remaining < rateLimitInfo.limitPerMinute * 0.2
  const isCritical = rateLimitInfo.remaining === 0
  const hasQueue = queueLength > 0

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-accent/50 transition-colors">
          <Gauge 
            size={20} 
            weight="duotone"
            className={
              isCritical ? 'text-destructive' : 
              isLow ? 'text-yellow-500' : 
              'text-accent'
            }
          />
          <Badge 
            variant={isCritical ? 'destructive' : isLow ? 'secondary' : 'outline'}
            className="font-mono text-xs"
          >
            {rateLimitInfo.remaining}/{rateLimitInfo.limitPerMinute}
          </Badge>
          {hasQueue && (
            <Badge variant="secondary" className="font-mono text-xs">
              <Queue size={12} className="mr-1" />
              {queueLength}
            </Badge>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Gauge size={18} weight="duotone" className="text-accent" />
              API Rate Limit Status
            </h4>
            <p className="text-xs text-muted-foreground">
              Bullhorn API usage monitoring
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Requests Remaining</span>
              <span className="font-mono font-semibold">
                {rateLimitInfo.remaining} / {rateLimitInfo.limitPerMinute}
              </span>
            </div>
            <Progress 
              value={percentRemaining} 
              className={`h-2 ${
                isCritical ? '[&>div]:bg-destructive' : 
                isLow ? '[&>div]:bg-yellow-500' : 
                '[&>div]:bg-accent'
              }`}
            />
            <div className="text-xs text-muted-foreground text-center">
              {percentRemaining.toFixed(0)}% available
            </div>
          </div>

          {timeUntilReset > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock size={14} />
                Reset in
              </span>
              <span className="font-mono">
                {secondsUntilReset}s
              </span>
            </div>
          )}

          {requestsInProgress > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Active Requests</span>
              <Badge variant="secondary" className="font-mono">
                {requestsInProgress}
              </Badge>
            </div>
          )}

          {queueLength > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Queue size={14} />
                Queued Requests
              </span>
              <Badge variant="secondary" className="font-mono">
                {queueLength}
              </Badge>
            </div>
          )}

          {backoffMultiplier > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Backoff Multiplier</span>
              <Badge variant="outline" className="font-mono">
                {backoffMultiplier.toFixed(1)}x
              </Badge>
            </div>
          )}

          {isCritical && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-xs text-destructive font-medium">
                ⚠️ Rate limit reached! Requests are queued until reset.
              </p>
            </div>
          )}

          {isLow && !isCritical && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-xs text-yellow-700 dark:text-yellow-300 font-medium">
                ⚡ Rate limit usage high. Throttling active.
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
