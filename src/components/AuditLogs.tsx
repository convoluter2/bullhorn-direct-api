import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ClockCounterClockwise, DownloadSimple, MagnifyingGlass, Trash } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { exportToCSV, exportToJSON } from '@/lib/csv-utils'
import type { AuditLog } from '@/lib/types'

interface AuditLogsProps {
  logs: AuditLog[]
  onClearLogs: () => void
}

export function AuditLogs({ logs, onClearLogs }: AuditLogsProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.operation.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.message.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || log.status === filterStatus
    return matchesSearch && matchesStatus
  }).sort((a, b) => b.timestamp - a.timestamp)

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      toast.error('No logs to export')
      return
    }
    const exportData = filteredLogs.map(log => ({
      timestamp: new Date(log.timestamp).toISOString(),
      operation: log.operation,
      status: log.status,
      message: log.message,
      entity: log.entity || '',
      recordCount: log.recordCount || 0
    }))
    exportToCSV(exportData, `audit_logs_${Date.now()}.csv`)
    toast.success('Logs exported to CSV')
  }

  const handleExportJSON = () => {
    if (filteredLogs.length === 0) {
      toast.error('No logs to export')
      return
    }
    exportToJSON(filteredLogs, `audit_logs_${Date.now()}.json`)
    toast.success('Logs exported to JSON')
  }

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all logs?')) {
      onClearLogs()
      toast.success('Logs cleared')
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClockCounterClockwise className="text-accent" size={24} />
              Audit Logs
            </CardTitle>
            <CardDescription>{filteredLogs.length} operations logged</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleExportCSV}>
              <DownloadSimple />
              CSV
            </Button>
            <Button size="sm" variant="outline" onClick={handleExportJSON}>
              <DownloadSimple />
              JSON
            </Button>
            <Button size="sm" variant="destructive" onClick={handleClear}>
              <Trash />
              Clear
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="h-[500px]">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClockCounterClockwise size={48} className="mx-auto mb-4 opacity-50" />
              <p>No logs found</p>
              <p className="text-sm">Operations will be logged here automatically</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          log.status === 'success' ? 'default' :
                          log.status === 'error' ? 'destructive' :
                          'outline'
                        }>
                          {log.status}
                        </Badge>
                        <span className="font-semibold text-sm">{log.operation}</span>
                        {log.entity && (
                          <span className="text-xs text-muted-foreground">
                            • {log.entity}
                          </span>
                        )}
                        {log.recordCount !== undefined && (
                          <span className="text-xs text-muted-foreground">
                            • {log.recordCount} records
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{log.message}</p>
                      {log.details && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                            View details
                          </summary>
                          <pre className="mt-2 p-2 bg-muted rounded text-xs font-mono overflow-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
