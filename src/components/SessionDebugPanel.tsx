import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Database, Copy, CheckCircle } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useState } from 'react'
import type { BullhornSession } from '@/lib/types'

interface SessionDebugPanelProps {
  session: BullhornSession | null
  currentConnectionId: string | null
  connectionName?: string
  tenant?: string
  environment?: string
}

export function SessionDebugPanel({ 
  session, 
  currentConnectionId,
  connectionName,
  tenant,
  environment
}: SessionDebugPanelProps) {
  const [copied, setCopied] = useState<string | null>(null)

  if (!session) {
    return null
  }

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    toast.success(`${label} copied to clipboard`)
    setTimeout(() => setCopied(null), 2000)
  }

  const extractCorpToken = (restUrl: string) => {
    const match = restUrl.match(/rest-services\/([^/]+)\/?/)
    return match ? match[1] : 'Unknown'
  }

  const corpToken = session.restUrl ? extractCorpToken(session.restUrl) : 'Unknown'

  return (
    <Card className="p-4 bg-card/30 border-accent/20">
      <div className="flex items-start gap-3">
        <Database className="text-accent mt-1" size={20} weight="duotone" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-semibold text-sm text-foreground">Session Debug Info</h3>
            <Badge variant="outline" className="text-xs">
              Active Connection
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Connection:</span>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-xs">{connectionName || 'Unknown'}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Environment:</span>
                <Badge 
                  variant={environment === 'PROD' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {environment || 'Unknown'}
                </Badge>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Tenant:</span>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-xs">{tenant || 'Unknown'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Corporation ID:</span>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-xs font-semibold text-accent">
                    {session.corporationId || 'Unknown'}
                  </span>
                  {session.corporationId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0"
                      onClick={() => handleCopy(session.corporationId!.toString(), 'Corporation ID')}
                    >
                      {copied === 'Corporation ID' ? (
                        <CheckCircle size={14} className="text-green-500" weight="fill" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Corp Token:</span>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-xs">{corpToken}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0"
                    onClick={() => handleCopy(corpToken, 'Corp Token')}
                  >
                    {copied === 'Corp Token' ? (
                      <CheckCircle size={14} className="text-green-500" weight="fill" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">User ID:</span>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-xs">{session.userId || 'Unknown'}</span>
                  {session.userId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0"
                      onClick={() => handleCopy(session.userId!.toString(), 'User ID')}
                    >
                      {copied === 'User ID' ? (
                        <CheckCircle size={14} className="text-green-500" weight="fill" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">REST URL:</span>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-xs truncate max-w-[200px]" title={session.restUrl}>
                    {session.restUrl.replace('https://', '').split('/')[0]}...
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0"
                    onClick={() => handleCopy(session.restUrl, 'REST URL')}
                  >
                    {copied === 'REST URL' ? (
                      <CheckCircle size={14} className="text-green-500" weight="fill" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Connection ID:</span>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-xs truncate max-w-[150px]" title={currentConnectionId || 'Unknown'}>
                    {currentConnectionId ? currentConnectionId.substring(0, 12) + '...' : 'Unknown'}
                  </span>
                  {currentConnectionId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0"
                      onClick={() => handleCopy(currentConnectionId, 'Connection ID')}
                    >
                      {copied === 'Connection ID' ? (
                        <CheckCircle size={14} className="text-green-500" weight="fill" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
