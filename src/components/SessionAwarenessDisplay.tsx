import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Users, ArrowClockwise, Info } from '@phosphor-icons/react'
import { sessionManager, type SessionAwareness } from '@/lib/session-manager'

type SessionAwarenessDisplayProps = {
  connectionId: string | null
  isRefreshing?: boolean
}

export function SessionAwarenessDisplay({ connectionId, isRefreshing = false }: SessionAwarenessDisplayProps) {
  const [awareness, setAwareness] = useState<SessionAwareness | null>(null)
  const [loading, setLoading] = useState(false)

  const loadAwareness = async () => {
    if (!connectionId) {
      setAwareness(null)
      return
    }

    setLoading(true)
    try {
      const data = await sessionManager.getSessionAwareness(connectionId)
      setAwareness(data)
    } catch (error) {
      console.error('Failed to load session awareness:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAwareness()

    const interval = setInterval(loadAwareness, 10000)
    return () => clearInterval(interval)
  }, [connectionId])

  if (!connectionId || !awareness) {
    return null
  }

  const hasOtherActiveSessions = awareness.activeSessions.length > 1
  const currentBrowserId = sessionManager.getBrowserId()
  const otherSessions = awareness.activeSessions.filter(s => s.browserId !== currentBrowserId)

  return (
    <Card className="border-accent/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="text-accent" size={20} weight="duotone" />
            <CardTitle className="text-lg">Session Awareness</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadAwareness}
            disabled={loading}
          >
            <ArrowClockwise className={loading ? 'animate-spin' : ''} size={16} />
            Refresh
          </Button>
        </div>
        <CardDescription>
          Browser ID: <code className="text-xs font-mono bg-muted px-1 py-0.5 rounded">{currentBrowserId}</code>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {awareness.activeRefreshCount > 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              {awareness.activeRefreshCount} active token refresh{awareness.activeRefreshCount > 1 ? 'es' : ''} in progress
              {isRefreshing && ' (including this browser)'}
            </AlertDescription>
          </Alert>
        )}

        {hasOtherActiveSessions && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Other Active Sessions ({otherSessions.length})</div>
            <div className="space-y-2">
              {otherSessions.map((session) => (
                <div
                  key={session.browserId}
                  className="flex items-center justify-between p-2 border rounded-lg text-sm"
                >
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono bg-muted px-1 py-0.5 rounded">
                      {session.browserId.substring(0, 20)}...
                    </code>
                  </div>
                  <div className="flex items-center gap-2">
                    {session.isRefreshing && (
                      <Badge variant="secondary" className="gap-1">
                        <ArrowClockwise className="animate-spin" size={12} />
                        Refreshing
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {Math.floor((Date.now() - session.lastActivity) / 1000)}s ago
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!hasOtherActiveSessions && (
          <div className="text-sm text-muted-foreground text-center py-4">
            No other active sessions for this connection
          </div>
        )}

        <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
          <div>Total Active Sessions: {awareness.activeSessions.length}</div>
          <div>Current Browser Has Session: {awareness.currentBrowserHasSession ? 'Yes' : 'No'}</div>
        </div>
      </CardContent>
    </Card>
  )
}
