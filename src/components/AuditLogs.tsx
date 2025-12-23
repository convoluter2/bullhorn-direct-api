import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ClockCounterClockwise, DownloadSimple, MagnifyingGlass, Trash, ArrowCounterClockwise, ArrowBendUpLeft, XCircle } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { exportToCSV, exportToJSON } from '@/lib/csv-utils'
import { bullhornAPI } from '@/lib/bullhorn-api'
import type { AuditLog } from '@/lib/types'

interface AuditLogsProps {
  logs: AuditLog[]
  onClearLogs: () => void
  onUpdateLog: (logId: string, updates: Partial<AuditLog>) => void
  onLog: (operation: string, status: 'success' | 'error', message: string, details?: any) => void
}

export function AuditLogs({ logs, onClearLogs, onUpdateLog, onLog }: AuditLogsProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [highlightedLogId, setHighlightedLogId] = useState<string | null>(null)
  const [rollbackDialog, setRollbackDialog] = useState<{ open: boolean; log: AuditLog | null }>({
    open: false,
    log: null
  })
  const [isRollingBack, setIsRollingBack] = useState(false)

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

  const handleRollbackClick = (log: AuditLog) => {
    setRollbackDialog({ open: true, log })
  }

  const handleScrollToLog = (logId: string) => {
    setHighlightedLogId(logId)
    const element = document.getElementById(`log-${logId}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setTimeout(() => setHighlightedLogId(null), 2000)
    }
  }

  const handleRollbackConfirm = async () => {
    const log = rollbackDialog.log
    if (!log || !log.rollbackData || !log.entity) {
      return
    }

    setIsRollingBack(true)
    const toastId = toast.loading(`Rolling back ${log.recordCount} record(s)...`)

    try {
      let successCount = 0
      let errorCount = 0
      const errors: string[] = []
      const newRollbackData: Array<{
        entityId: number
        previousValues: Record<string, any>
      }> = []

      for (const update of log.rollbackData.updates) {
        try {
          const currentResponse = await bullhornAPI.getEntity(log.entity, update.entityId, Object.keys(update.previousValues))
          const currentValues = currentResponse.data || currentResponse
          
          await bullhornAPI.updateEntity(log.entity, update.entityId, update.previousValues)
          
          newRollbackData.push({
            entityId: update.entityId,
            previousValues: currentValues
          })
          
          successCount++
        } catch (error) {
          errorCount++
          errors.push(`ID ${update.entityId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      const rollbackHistoryEntry = {
        timestamp: Date.now(),
        successCount,
        errorCount,
        errors: errorCount > 0 ? errors : undefined
      }

      const existingHistory = log.rollbackHistory || []
      const updatedHistory = [...existingHistory, rollbackHistoryEntry]

      if (errorCount === 0) {
        toast.success(`Successfully rolled back ${successCount} record(s)`, { id: toastId })
        
        onUpdateLog(log.id, { 
          rolledBack: true,
          rollbackHistory: updatedHistory
        })

        onLog(
          'Rollback',
          'success',
          `Rolled back ${successCount} record(s) from "${log.operation}"`,
          {
            originalOperation: log.operation,
            originalLogId: log.id,
            entity: log.entity,
            successCount,
            recordCount: successCount,
            rollbackData: newRollbackData.length > 0 ? { updates: newRollbackData } : undefined
          }
        )
      } else if (successCount > 0) {
        toast.warning(`Rolled back ${successCount} record(s), ${errorCount} failed`, { id: toastId })
        
        onUpdateLog(log.id, { 
          details: { 
            ...log.details, 
            rollbackErrors: errors,
            partialRollback: true 
          },
          rollbackHistory: updatedHistory
        })

        onLog(
          'Rollback (Partial)',
          'error',
          `Partially rolled back ${successCount} of ${successCount + errorCount} record(s) from "${log.operation}"`,
          {
            originalOperation: log.operation,
            originalLogId: log.id,
            entity: log.entity,
            successCount,
            errorCount,
            errors,
            recordCount: successCount,
            rollbackData: newRollbackData.length > 0 ? { updates: newRollbackData } : undefined
          }
        )
      } else {
        toast.error(`Rollback failed for all ${errorCount} record(s)`, { id: toastId })
        
        onUpdateLog(log.id, { 
          rollbackHistory: updatedHistory
        })

        onLog(
          'Rollback Failed',
          'error',
          `Failed to rollback ${errorCount} record(s) from "${log.operation}"`,
          {
            originalOperation: log.operation,
            originalLogId: log.id,
            entity: log.entity,
            errorCount,
            errors,
            recordCount: 0
          }
        )
      }
    } catch (error) {
      toast.error(`Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: toastId })
      
      onLog(
        'Rollback Failed',
        'error',
        `Rollback operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          originalOperation: log.operation,
          originalLogId: log.id,
          entity: log.entity,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      )
    } finally {
      setIsRollingBack(false)
      setRollbackDialog({ open: false, log: null })
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
              {filteredLogs.map((log) => {
                const isRollbackLog = log.details?.originalLogId
                const originalLog = isRollbackLog ? logs.find(l => l.id === log.details.originalLogId) : null
                
                return (
                  <div
                    key={log.id}
                    id={`log-${log.id}`}
                    className={`p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors ${
                      highlightedLogId === log.id ? 'ring-2 ring-accent' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={
                            log.status === 'success' ? 'default' :
                            log.status === 'error' ? 'destructive' :
                            'outline'
                          }>
                            {log.status}
                          </Badge>
                          {log.rolledBack && (
                            <Badge variant="secondary" className="gap-1">
                              <ArrowCounterClockwise size={12} />
                              Rolled Back
                            </Badge>
                          )}
                          {isRollbackLog && (
                            <Badge variant="outline" className="gap-1 bg-accent/10 text-accent border-accent/30">
                              <ArrowBendUpLeft size={12} />
                              Rollback Operation
                            </Badge>
                          )}
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
                        
                        {(log.details?.errors && log.details.errors.length > 0) && (
                          <div className="mt-2 p-3 bg-destructive/10 rounded border border-destructive/30">
                            <div className="flex items-center gap-2 mb-2">
                              <XCircle size={14} className="text-destructive" weight="fill" />
                              <span className="text-xs font-semibold text-destructive">
                                Failed Records ({log.details.errors.length})
                              </span>
                            </div>
                            <ScrollArea className="max-h-32">
                              <div className="space-y-1 pr-3">
                                {log.details.errors.map((error: string, idx: number) => (
                                  <div key={idx} className="text-xs font-mono text-destructive/90 bg-background/50 p-1.5 rounded border border-destructive/20">
                                    {error}
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          </div>
                        )}
                        
                        {(log.details?.rollbackErrors && log.details.rollbackErrors.length > 0) && (
                          <div className="mt-2 p-3 bg-destructive/10 rounded border border-destructive/30">
                            <div className="flex items-center gap-2 mb-2">
                              <XCircle size={14} className="text-destructive" weight="fill" />
                              <span className="text-xs font-semibold text-destructive">
                                Rollback Failures ({log.details.rollbackErrors.length})
                              </span>
                            </div>
                            <ScrollArea className="max-h-32">
                              <div className="space-y-1 pr-3">
                                {log.details.rollbackErrors.map((error: string, idx: number) => (
                                  <div key={idx} className="text-xs font-mono text-destructive/90 bg-background/50 p-1.5 rounded border border-destructive/20">
                                    {error}
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          </div>
                        )}
                        
                        {(log.details?.failed > 0 && !log.details?.errors && !log.details?.rollbackErrors) && (
                          <div className="mt-2 p-2 bg-destructive/10 rounded border border-destructive/30">
                            <div className="flex items-center gap-2">
                              <XCircle size={14} className="text-destructive" weight="fill" />
                              <span className="text-xs text-destructive">
                                {log.details.failed} record(s) failed (details not available in this log)
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {(log.details?.errorCount > 0 && !log.details?.errors && !log.details?.rollbackErrors && !log.details?.failed) && (
                          <div className="mt-2 p-2 bg-destructive/10 rounded border border-destructive/30">
                            <div className="flex items-center gap-2">
                              <XCircle size={14} className="text-destructive" weight="fill" />
                              <span className="text-xs text-destructive">
                                {log.details.errorCount} record(s) failed (details not available in this log)
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {(log.status === 'error' && log.details?.error) && (
                          <div className="mt-2 p-2 bg-destructive/10 rounded border border-destructive/30">
                            <div className="flex items-center gap-2">
                              <XCircle size={14} className="text-destructive" weight="fill" />
                              <span className="text-xs text-destructive font-mono">
                                {typeof log.details.error === 'string' ? log.details.error : JSON.stringify(log.details.error)}
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {isRollbackLog && originalLog && (
                          <div className="mt-2 p-2 bg-muted/50 rounded border border-accent/30">
                            <div className="flex items-center gap-2">
                              <ArrowBendUpLeft size={14} className="text-accent" />
                              <span className="text-xs text-muted-foreground">
                                Rolled back from:
                              </span>
                              <button
                                onClick={() => handleScrollToLog(originalLog.id)}
                                className="text-xs text-accent hover:underline font-medium"
                              >
                                {originalLog.operation} ({new Date(originalLog.timestamp).toLocaleString()})
                              </button>
                            </div>
                          </div>
                        )}
                        {log.rollbackHistory && log.rollbackHistory.length > 0 && (
                          <div className="mt-2 p-2 bg-muted/50 rounded border border-border/50">
                            <p className="text-xs font-semibold text-muted-foreground mb-1">
                              Rollback History ({log.rollbackHistory.length})
                            </p>
                            <div className="space-y-1">
                              {log.rollbackHistory.map((history, idx) => (
                                <div key={idx} className="text-xs flex items-center gap-2">
                                  <span className="text-muted-foreground">
                                    {new Date(history.timestamp).toLocaleString()}
                                  </span>
                                  <span className="text-accent">
                                    ✓ {history.successCount} success
                                  </span>
                                  {history.errorCount > 0 && (
                                    <span className="text-destructive">
                                      ✗ {history.errorCount} failed
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
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
                      <div className="flex flex-col items-end gap-2">
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </div>
                        {log.rollbackData && !log.rolledBack && log.status === 'success' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRollbackClick(log)}
                            className="gap-1"
                          >
                            <ArrowCounterClockwise size={14} />
                            Rollback
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>

      <AlertDialog open={rollbackDialog.open} onOpenChange={(open) => !isRollingBack && setRollbackDialog({ open, log: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Rollback</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                This will restore the previous values for <strong>{rollbackDialog.log?.recordCount || 0} record(s)</strong> in the <strong>{rollbackDialog.log?.entity}</strong> entity.
              </p>
              <p className="text-destructive font-medium">
                This action cannot be undone. Are you sure you want to proceed?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRollingBack}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleRollbackConfirm()
              }}
              disabled={isRollingBack}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isRollingBack ? 'Rolling back...' : 'Rollback'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
