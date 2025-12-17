import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Terminal, Trash, Copy, Pause, Play } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface ConsoleLog {
  id: string
  timestamp: string
  type: 'log' | 'warn' | 'error' | 'info'
  message: string
  args: any[]
}

export function ConsoleMonitor() {
  const [logs, setLogs] = useState<ConsoleLog[]>([])
  const [isPaused, setIsPaused] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const originalConsole = useRef<{
    log: typeof console.log
    warn: typeof console.warn
    error: typeof console.error
    info: typeof console.info
  } | null>(null)

  useEffect(() => {
    if (!originalConsole.current) {
      originalConsole.current = {
        log: console.log,
        warn: console.warn,
        error: console.error,
        info: console.info
      }
    }

    const addLog = (type: ConsoleLog['type'], ...args: any[]) => {
      if (!isPaused) {
        const timestamp = new Date().toISOString().split('T')[1].substring(0, 12)
        const message = args.map(arg => {
          if (typeof arg === 'string') return arg
          if (arg instanceof Error) return arg.message
          try {
            return JSON.stringify(arg)
          } catch {
            return String(arg)
          }
        }).join(' ')

        setLogs(prev => [...prev.slice(-199), {
          id: `${Date.now()}-${Math.random()}`,
          timestamp,
          type,
          message,
          args
        }])
      }

      originalConsole.current?.[type](...args)
    }

    console.log = (...args) => addLog('log', ...args)
    console.warn = (...args) => addLog('warn', ...args)
    console.error = (...args) => addLog('error', ...args)
    console.info = (...args) => addLog('info', ...args)

    return () => {
      if (originalConsole.current) {
        console.log = originalConsole.current.log
        console.warn = originalConsole.current.warn
        console.error = originalConsole.current.error
        console.info = originalConsole.current.info
      }
    }
  }, [isPaused])

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll])

  const clearLogs = () => {
    setLogs([])
    toast.success('Console cleared')
  }

  const copyLogs = () => {
    const logText = logs.map(log => 
      `[${log.timestamp}] ${log.type.toUpperCase()}: ${log.message}`
    ).join('\n')
    if (logText) {
      navigator.clipboard.writeText(logText)
      toast.success('Logs copied to clipboard')
    }
  }

  const getLogColor = (type: ConsoleLog['type']) => {
    switch (type) {
      case 'error':
        return 'text-red-400'
      case 'warn':
        return 'text-yellow-400'
      case 'info':
        return 'text-blue-400'
      default:
        return 'text-muted-foreground'
    }
  }

  const getLogBadge = (type: ConsoleLog['type']) => {
    const colors = {
      log: 'bg-gray-500/20 text-gray-400',
      info: 'bg-blue-500/20 text-blue-400',
      warn: 'bg-yellow-500/20 text-yellow-400',
      error: 'bg-red-500/20 text-red-400'
    }
    return colors[type]
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Terminal size={24} weight="fill" className="text-accent" />
              Live Console Monitor
            </CardTitle>
            <CardDescription>
              Real-time console output for debugging OAuth and API issues
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{logs.length} logs</Badge>
            <Button 
              onClick={() => setIsPaused(!isPaused)} 
              size="sm" 
              variant={isPaused ? "default" : "outline"}
            >
              {isPaused ? <Play size={16} /> : <Pause size={16} />}
              {isPaused ? 'Resume' : 'Pause'}
            </Button>
            <Button onClick={copyLogs} size="sm" variant="outline" disabled={logs.length === 0}>
              <Copy size={16} />
              Copy
            </Button>
            <Button onClick={clearLogs} size="sm" variant="outline" disabled={logs.length === 0}>
              <Trash size={16} />
              Clear
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="cursor-pointer"
              />
              <span>Auto-scroll</span>
            </label>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 h-96 overflow-y-auto font-mono text-xs">
            {logs.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No console output yet. Console logs will appear here.
              </div>
            ) : (
              <div className="space-y-1">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2">
                    <span className="text-muted-foreground shrink-0">{log.timestamp}</span>
                    <Badge variant="outline" className={`shrink-0 ${getLogBadge(log.type)}`}>
                      {log.type}
                    </Badge>
                    <span className={`break-all ${getLogColor(log.type)}`}>
                      {log.message}
                    </span>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
