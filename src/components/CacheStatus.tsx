import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Database, TrashSimple, ArrowClockwise } from '@phosphor-icons/react'
import { fieldValueCache } from '@/lib/field-value-cache'
import { toast } from 'sonner'

export function CacheStatus() {
  const [stats, setStats] = useState({
    size: 0,
    entities: [] as string[],
    oldestEntry: null as number | null,
    newestEntry: null as number | null
  })

  const refreshStats = () => {
    const currentStats = fieldValueCache.getCacheStats()
    setStats(currentStats)
  }

  useEffect(() => {
    refreshStats()
    const interval = setInterval(refreshStats, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleClearCache = () => {
    if (confirm('Clear all cached field values? This will require re-fetching data from the API.')) {
      fieldValueCache.invalidateAll()
      refreshStats()
      toast.success('Field value cache cleared')
    }
  }

  const handlePrefetch = async () => {
    toast.loading('Prefetching common entities...', { id: 'prefetch' })
    try {
      await fieldValueCache.prefetchCommonEntities()
      refreshStats()
      toast.success('Prefetch complete', { id: 'prefetch' })
    } catch (error) {
      toast.error('Prefetch failed', { id: 'prefetch' })
    }
  }

  const formatTimestamp = (timestamp: number | null) => {
    if (!timestamp) return 'Never'
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const seconds = Math.floor((diff % 60000) / 1000)
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s ago`
    }
    return `${seconds}s ago`
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Database size={20} />
              Field Value Cache
            </CardTitle>
            <CardDescription>
              Reduces API calls by caching TO_MANY and TO_ONE field lookups
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrefetch}>
              <ArrowClockwise />
              Prefetch
            </Button>
            <Button variant="outline" size="sm" onClick={handleClearCache}>
              <TrashSimple />
              Clear
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-muted-foreground mb-1">Cache Entries</div>
            <div className="text-2xl font-bold">{stats.size}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">Entities Cached</div>
            <div className="text-2xl font-bold">{stats.entities.length}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">Oldest Entry</div>
            <div className="text-sm font-mono">{formatTimestamp(stats.oldestEntry)}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">Newest Entry</div>
            <div className="text-sm font-mono">{formatTimestamp(stats.newestEntry)}</div>
          </div>
        </div>

        {stats.entities.length > 0 && (
          <div>
            <div className="text-sm text-muted-foreground mb-2">Cached Entities:</div>
            <div className="flex flex-wrap gap-2">
              {stats.entities.map(entity => (
                <Badge key={entity} variant="secondary">
                  {entity}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          Cache automatically expires after 5 minutes. Common entities (Skill, Category, Specialty, etc.) are prefetched on login.
        </div>
      </CardContent>
    </Card>
  )
}
