import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Terminal, Trash } from '@phosphor-icons/react'

interface LogEntry {
  id: string
  timestamp: number
  type: 'test' | 'setter' | 'render' | 'change' | 'success' | 'warning' | 'update' | 'inspect'
  message: string
  data?: any
}

export function ConsoleMonitorForTests() {
  const [logs, setLogs] = useState<LogEntry[]>([])

  useEffect(() => {
    const originalLog = console.log
    const originalWarn = console.warn

    console.log = function(...args: any[]) {
      originalLog.apply(console, args)
      
      const message = args.map(arg => 
        typeof arg === 'string' ? arg : JSON.stringify(arg, null, 2)
      ).join(' ')

      if (message.includes('🧪') || message.includes('ToManyFieldTest')) {
        setLogs(prev => [...prev, {
          id: `log-${Date.now()}-${Math.random()}`,
          timestamp: Date.now(),
          type: 'test',
          message,
          data: args.length > 1 ? args.slice(1) : undefined
        }])
      } else if (message.includes('🔧') || message.includes('Setting test')) {
        setLogs(prev => [...prev, {
          id: `log-${Date.now()}-${Math.random()}`,
          timestamp: Date.now(),
          type: 'setter',
          message,
          data: args.length > 1 ? args.slice(1) : undefined
        }])
      } else if (message.includes('🎯') || message.includes('ToManyFieldInput - Render')) {
        setLogs(prev => [...prev, {
          id: `log-${Date.now()}-${Math.random()}`,
          timestamp: Date.now(),
          type: 'render',
          message,
          data: args.length > 1 ? args.slice(1) : undefined
        }])
      } else if (message.includes('🔄') || message.includes('Value changed')) {
        setLogs(prev => [...prev, {
          id: `log-${Date.now()}-${Math.random()}`,
          timestamp: Date.now(),
          type: 'change',
          message,
          data: args.length > 1 ? args.slice(1) : undefined
        }])
      } else if (message.includes('✅') || message.includes('successfully')) {
        setLogs(prev => [...prev, {
          id: `log-${Date.now()}-${Math.random()}`,
          timestamp: Date.now(),
          type: 'success',
          message,
          data: args.length > 1 ? args.slice(1) : undefined
        }])
      } else if (message.includes('📤') || message.includes('Updating parent')) {
        setLogs(prev => [...prev, {
          id: `log-${Date.now()}-${Math.random()}`,
          timestamp: Date.now(),
          type: 'update',
          message,
          data: args.length > 1 ? args.slice(1) : undefined
        }])
      } else if (message.includes('🔍') || message.includes('FieldTypeDebugger')) {
        setLogs(prev => [...prev, {
          id: `log-${Date.now()}-${Math.random()}`,
          timestamp: Date.now(),
          type: 'inspect',
          message,
          data: args.length > 1 ? args.slice(1) : undefined
        }])
      }
    }

    console.warn = function(...args: any[]) {
      originalWarn.apply(console, args)
      
      const message = args.map(arg => 
        typeof arg === 'string' ? arg : JSON.stringify(arg, null, 2)
      ).join(' ')

      if (message.includes('⚠️') || message.includes('ToManyFieldInput')) {
        setLogs(prev => [...prev, {
          id: `log-${Date.now()}-${Math.random()}`,
          timestamp: Date.now(),
          type: 'warning',
          message,
          data: args.length > 1 ? args.slice(1) : undefined
        }])
      }
    }

    return () => {
      console.log = originalLog
      console.warn = originalWarn
    }
  }, [])

  const clearLogs = () => {
    setLogs([])
  }

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'test': return 'bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-400'
      case 'setter': return 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400'
      case 'render': return 'bg-cyan-500/10 border-cyan-500/30 text-cyan-700 dark:text-cyan-400'
      case 'change': return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-700 dark:text-yellow-400'
      case 'success': return 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400'
      case 'warning': return 'bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-400'
      case 'update': return 'bg-indigo-500/10 border-indigo-500/30 text-indigo-700 dark:text-indigo-400'
      case 'inspect': return 'bg-pink-500/10 border-pink-500/30 text-pink-700 dark:text-pink-400'
      default: return 'bg-muted/50 border-border'
    }
  }

  const getLogBadge = (type: LogEntry['type']) => {
    switch (type) {
      case 'test': return '🧪 Test'
      case 'setter': return '🔧 Setter'
      case 'render': return '🎯 Render'
      case 'change': return '🔄 Change'
      case 'success': return '✅ Success'
      case 'warning': return '⚠️ Warning'
      case 'update': return '📤 Update'
      case 'inspect': return '🔍 Inspect'
      default: return 'Log'
    }
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3
    })
  }

  return (
    <Card className="border-2 border-accent/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Terminal className="text-accent" size={20} />
            Live Console Monitor
            {logs.length > 0 && (
              <Badge variant="secondary" className="font-mono">
                {logs.length} {logs.length === 1 ? 'log' : 'logs'}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearLogs}
            disabled={logs.length === 0}
          >
            <Trash />
            Clear
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Debug logs from ToManyFieldTest, ToManyFieldInput, and FieldTypeDebugger components
        </p>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] rounded border bg-black/5 dark:bg-black/20">
          <div className="p-3 space-y-2 font-mono text-xs">
            {logs.length === 0 ? (
              <div className="text-muted-foreground text-center py-8">
                No logs yet. Click "Test ADD" on a test case to see logs appear here.
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className={`p-2 rounded border ${getLogColor(log.type)}`}
                >
                  <div className="flex items-start gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] px-1 py-0 whitespace-nowrap">
                      {formatTimestamp(log.timestamp)}
                    </Badge>
                    <Badge className="text-[10px] px-1 py-0 whitespace-nowrap">
                      {getLogBadge(log.type)}
                    </Badge>
                  </div>
                  <div className="break-words whitespace-pre-wrap">
                    {log.message}
                  </div>
                  {log.data && log.data.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-[10px] text-muted-foreground hover:text-foreground">
                        View data ({log.data.length} item{log.data.length !== 1 ? 's' : ''})
                      </summary>
                      <pre className="mt-1 p-2 bg-black/10 dark:bg-black/30 rounded overflow-auto text-[10px]">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
