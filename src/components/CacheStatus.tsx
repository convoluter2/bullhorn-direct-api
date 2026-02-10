import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Database, ArrowsClockwise, Calendar } from '@phosphor-icons/react'
import { entityCacheService } from '@/lib/entity-cache-service'
import { toast } from 'sonner'

export function CacheStatus() {
  const [status, setStatus] = useState<{
    entityCount: number
    lastRefresh: number | null
    nextRefresh: number | null
    manualCount: number
    apiCount: number
  } | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const loadStatus = async () => {
    const cacheStatus = await entityCacheService.getCacheStatus()
    setStatus(cacheStatus)
  }

  useEffect(() => {
    loadStatus()
    const interval = setInterval(loadStatus, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    toast.loading('Refreshing entity cache...', { id: 'cache-refresh' })
    
    try {
      await entityCacheService.refreshEntityList()
      await loadStatus()
      toast.success('Entity cache refreshed successfully', { id: 'cache-refresh' })
    } catch (error) {
      toast.error('Failed to refresh entity cache', { id: 'cache-refresh' })
    } finally {
      setRefreshing(false)
    }
  }

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return 'Never'
    const date = new Date(timestamp)
    const now = Date.now()
    const diff = now - timestamp
    
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return date.toLocaleString()
  }

  const formatNextRefresh = (timestamp: number | null) => {
    if (!timestamp) return 'Not scheduled'
    const date = new Date(timestamp)
    const now = Date.now()
    const diff = timestamp - now
    
    if (diff < 0) return 'Overdue'
    if (diff < 60000) return 'In less than 1 minute'
    if (diff < 3600000) return `In ${Math.floor(diff / 60000)} minutes`
    if (diff < 86400000) return `In ${Math.floor(diff / 3600000)} hours`
    return date.toLocaleString()
  }

  if (!status) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database size={24} className="text-accent" weight="duotone" />
            <div>
              <CardTitle>Entity Cache Status</CardTitle>
              <CardDescription>Persistent cache with automatic refresh</CardDescription>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <ArrowsClockwise className={refreshing ? 'animate-spin' : ''} />
            Refresh Now
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Total Entities</div>
            <div className="text-2xl font-bold">{status.entityCount}</div>
            <div className="flex gap-2">
              <Badge variant="secondary" className="text-xs">
                {status.apiCount} API
              </Badge>
              {status.manualCount > 0 && (
                <Badge variant="outline" className="text-xs">
                  {status.manualCount} Manual
                </Badge>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Calendar size={14} />
              Last Refresh
            </div>
            <div className="text-lg font-semibold">
              {formatDate(status.lastRefresh)}
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Calendar size={14} />
              Next Scheduled
            </div>
            <div className="text-lg font-semibold">
              {formatNextRefresh(status.nextRefresh)}
            </div>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-muted/50 rounded-md">
          <p className="text-xs text-muted-foreground">
            The entity cache is automatically refreshed every 12 hours and persists across sessions. 
            Manual entities you add are preserved during refreshes.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
