import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTri
import { toast } from 'sonner'
import type { AuditLog } from '@/lib/types'
interface PlacementPayRulesetErrorAnalyzerProps {
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Warning, DownloadSimple, MagnifyingGlass, ClipboardText, Info, ArrowsClockwise } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { exportToCSV } from '@/lib/csv-utils'
import type { AuditLog } from '@/lib/types'

interface PlacementPayRulesetErrorAnalyzerProps {
  logs: AuditLog[]
 

  requestUrl?: string
  recordId: number

  errorCode?: number
  const [selectedVi
  timestamp: number
    const errors: Erro
  lastAttempt: number
  logId: string
  requestUrl?: string
      const isPla
}

export function PlacementPayRulesetErrorAnalyzer({ logs }: PlacementPayRulesetErrorAnalyzerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedView, setSelectedView] = useState<'all' | 'unique' | 'by-error'>('all')

  const placementPayRulesetErrors = useMemo(() => {
    const errors: ErrorAnalysis[] = []
    const safeLogs = Array.isArray(logs) ? logs : []

    safeLogs.forEach(log => {
      if (!log || typeof log !== 'object') return

      const isPlacementPayRulesetError = 
        log.entity === 'PlacementPayRuleset' ||
        log.operation?.toLowerCase().includes('placementpayruleset') ||
        log.message?.toLowerCase().includes('placementpayruleset') ||
        log.details?.entity === 'PlacementPayRuleset'

      if (isPlacementPayRulesetError && log.status === 'error') {
        const errorMessage = log.details?.error || log.message || 'Unknown error'
        const errorCode = log.details?.errorCode
        
        if (log.details?.recordId) {
          errors.push({
            recordId: log.details.recordId,
            errorMessage,
            errorCode,
            operation: log.operation || 'Unknown',
            timestamp: log.timestamp || Date.now(),
            attemptCount: 1,
            lastAttempt: log.timestamp || Date.now(),
            logId: log.id,
                  errorMessage: error,
            fields: log.details?.fields

  }, [log

    placementPayRulesetErrors.forEach(error => {
      if (!grouped.has(key)) {
      }
    })
      .map(([errorMessage, records]) => ({ e
  }, [placementPayRulesetErrors])
  const uniqueRecordIds = useMemo(() => {
  }, [placementPayRulesetErrors])
  const filteredErrors = placementPayRulesetErrors.filt
      error.recordId.toString().
      error.operation.toLowerCase().includes(searchTerm.t
  })
  const handleExportCSV = () => {
      toast.error('No PlacementPayRuleset errors to export')
    }
    const exp
      errorM
      ope

      requestUrl: error.requestUrl || '',
    }))
    exportToCSV(exportData, `placementpayrul
  }
  const handleCopyRecordId
    navigator.clipboard.write
    }).catch(() => {
    })

    const ids = records.map(r => r.recordId).join(',')
      toast.success(`Copied ${records.length} record IDs 
      toast.error('Failed to copy 
  }
  if (placementPayRulesetErrors.
      <Card>
          <CardTitle className="flex items-ce
            Placem
          <Card
        <Card
            
         
       
      

  return (
      <CardHeader>
          <div>
              <Warnin
            </CardTitle>
              {uniqueRecordIds.size} unique failing r
          </div>
            <Button size="sm" variant="outline" onCl
              Copy IDs
            <Button size="sm" variant="outline
              Export CSV
          </div>
      </CardHeader>
        <
          <Ale
            Records with multiple attempts may in
       
      

    return Array.from(grouped.values()).sort((a, b) => b.lastAttempt - a.lastAttempt)
  }, [logs])

  const errorsByType = useMemo(() => {
    const grouped = new Map<string, ErrorAnalysis[]>()
    placementPayRulesetErrors.forEach(error => {
      const key = error.errorMessage
      if (!grouped.has(key)) {
        grouped.set(key, [])
      }
      grouped.get(key)!.push(error)
    })
    return Array.from(grouped.entries())
      .map(([errorMessage, records]) => ({ errorMessage, records, count: records.length }))
      .sort((a, b) => b.count - a.count)
  }, [placementPayRulesetErrors])

  const uniqueRecordIds = useMemo(() => {
    return new Set(placementPayRulesetErrors.map(e => e.recordId))
  }, [placementPayRulesetErrors])

  const filteredErrors = placementPayRulesetErrors.filter(error => {
    const matchesSearch = 
      error.recordId.toString().includes(searchTerm) ||
      error.errorMessage.toLowerCase().includes(searchTerm.toLowerCase()) ||
      error.operation.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const handleExportCSV = () => {
    if (placementPayRulesetErrors.length === 0) {
      toast.error('No PlacementPayRuleset errors to export')
      return
    }

    const exportData = placementPayRulesetErrors.map(error => ({
      recordId: error.recordId,
      errorMessage: error.errorMessage,
      errorCode: error.errorCode || '',
      operation: error.operation,
      attemptCount: error.attemptCount,
      lastAttempt: new Date(error.lastAttempt).toISOString(),
      firstAttempt: new Date(error.timestamp).toISOString(),
      requestUrl: error.requestUrl || '',
      fields: error.fields || ''
    }))

    exportToCSV(exportData, `placementpayruleset_errors_${Date.now()}.csv`)
    toast.success('PlacementPayRuleset errors exported to CSV')
  }

  const handleCopyRecordIds = () => {
    const ids = Array.from(uniqueRecordIds).join(',')
    navigator.clipboard.writeText(ids).then(() => {
      toast.success(`Copied ${uniqueRecordIds.size} record IDs to clipboard`)
    }).catch(() => {
      toast.error('Failed to copy to clipboard')
    })
  }

  const handleCopyErrorRecordIds = (records: ErrorAnalysis[]) => {
    const ids = records.map(r => r.recordId).join(',')
    navigator.clipboard.writeText(ids).then(() => {
      toast.success(`Copied ${records.length} record IDs to clipboard`)
    }).catch(() => {
      toast.error('Failed to copy to clipboard')
    })
  }

  if (placementPayRulesetErrors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="text-accent" size={24} />
            PlacementPayRuleset Error Analysis
          </CardTitle>
          <CardDescription>No PlacementPayRuleset errors found in audit logs</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              All PlacementPayRuleset operations completed successfully or no operations have been logged yet.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Warning className="text-destructive" size={24} />
              PlacementPayRuleset Error Analysis
            </CardTitle>
            <CardDescription>
              {uniqueRecordIds.size} unique failing record{uniqueRecordIds.size !== 1 ? 's' : ''} · {placementPayRulesetErrors.length} total error{placementPayRulesetErrors.length !== 1 ? 's' : ''}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleCopyRecordIds}>
              <ClipboardText />
              Copy IDs
            </Button>
            <Button size="sm" variant="outline" onClick={handleExportCSV}>
              <DownloadSimple />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <Warning className="h-4 w-4" />
          <AlertDescription>
            <strong>Critical:</strong> {uniqueRecordIds.size} PlacementPayRuleset record{uniqueRecordIds.size !== 1 ? 's are' : ' is'} failing. 
            Records with multiple attempts may indicate persistent data issues.
          </AlertDescription>
        </Alert>

        <Tabs value={selectedView} onValueChange={(v) => setSelectedView(v as any)} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">
              All Errors ({placementPayRulesetErrors.length})
              <div classNa
            <TabsTrigger value="unique">
              Unique Records ({uniqueRecordIds.size})
                          
            <TabsTrigger value="by-error">
              By Error Type ({errorsByType.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
                        <div className="text-
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    
                placeholder="Search by record ID, error message, or operation..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Record ID</TableHead>
                    <TableHead>Error Message</TableHead>

                    <TableHead>Attempts</TableHead>
                    <TableHead>Last Attempt</TableHead>
                    <TableHead>Status</TableHead>

                </TableHeader>
                <TableBody>
                  {filteredErrors.map((error, idx) => (
                    <TableRow key={`${error.recordId}-${idx}`}>
                      <TableCell className="font-mono font-semibold">{error.recordId}</TableCell>

                        <div className="space-y-1">
                          <div className="text-sm">{error.errorMessage}</div>
                          {error.errorCode && (
                            <Badge variant="outline" className="text-xs">
                              Code: {error.errorCode}

                          )}
                          {error.requestUrl && (
                            <div className="text-xs text-muted-foreground font-mono break-all">

                            </div>

                        </div>

                      <TableCell>{error.operation}</TableCell>

                        <Badge variant={error.attemptCount > 1 ? 'destructive' : 'secondary'}>
                          {error.attemptCount}
                        </Badge>

                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(error.lastAttempt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive">Failed</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>


            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Showing unique failing record IDs. Records with multiple attempts indicate repeated failures.
              </AlertDescription>


            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {Array.from(uniqueRecordIds).map(recordId => {
                  const recordErrors = placementPayRulesetErrors.filter(e => e.recordId === recordId)

                  const totalAttempts = recordErrors.reduce((sum, e) => sum + e.attemptCount, 0)

                  return (
                    <div key={recordId} className="p-4 rounded-lg border bg-card">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-lg">{recordId}</span>
                            <Badge variant={totalAttempts > 1 ? 'destructive' : 'secondary'}>
                              {totalAttempts} attempt{totalAttempts !== 1 ? 's' : ''}
                            </Badge>

                          <div className="text-sm text-muted-foreground">

                          </div>
                          {latestError.requestUrl && (
                            <div className="text-xs text-muted-foreground font-mono break-all bg-muted p-2 rounded">
                              {latestError.requestUrl}
                            </div>

                          {latestError.fields && (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-semibold">Fields:</span> {latestError.fields}

                          )}

                            Last attempt: {new Date(latestError.lastAttempt).toLocaleString()}
                          </div>
                        </div>

                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </TabsContent>


            <Alert>

              <AlertDescription>
                Errors grouped by error message. This helps identify systematic issues affecting multiple records.
              </AlertDescription>


            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {errorsByType.map((group, idx) => (
                  <div key={idx} className="p-4 rounded-lg border bg-card space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive">
                            {group.count} record{group.count !== 1 ? 's' : ''}
                          </Badge>
                          {group.records[0].errorCode && (
                            <Badge variant="outline">
                              Code: {group.records[0].errorCode}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm font-semibold">{group.errorMessage}</div>
                        <div className="text-xs text-muted-foreground">
                          Affected IDs: {group.records.map(r => r.recordId).join(', ')}
                        </div>

                      <Button

                        variant="outline"
                        onClick={() => handleCopyErrorRecordIds(group.records)}
                      >

                        Copy IDs
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

        </Tabs>

    </Card>

}
