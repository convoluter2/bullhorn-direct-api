import type { AuditLog } from './types'

const MAX_LOG_SIZE_BYTES = 450000
const MAX_LOGS_COUNT = 100
const MIN_LOGS_TO_KEEP = 50

export class AuditLogManager {
  private static estimateLogSize(log: AuditLog): number {
    return JSON.stringify(log).length
  }

  private static estimateTotalSize(logs: AuditLog[]): number {
    return JSON.stringify(logs).length
  }

  static sanitizeLogForStorage(log: AuditLog): AuditLog {
    const sanitized = { ...log }

    if (sanitized.details) {
      const detailsStr = JSON.stringify(sanitized.details)
      if (detailsStr.length > 50000) {
        sanitized.details = {
          _truncated: true,
          _originalSize: detailsStr.length,
          _summary: this.createDetailsSummary(sanitized.details)
        }
      }
    }

    if (sanitized.rollbackData) {
      const rollbackStr = JSON.stringify(sanitized.rollbackData)
      if (rollbackStr.length > 50000) {
        sanitized.rollbackData = undefined
        if (!sanitized.details) {
          sanitized.details = {}
        }
        sanitized.details._rollbackDataRemoved = true
        sanitized.details._rollbackDataSize = rollbackStr.length
      }
    }

    if (sanitized.failedOperations) {
      if (sanitized.failedOperations.length > 100) {
        sanitized.failedOperations = sanitized.failedOperations.slice(0, 100)
        if (!sanitized.details) {
          sanitized.details = {}
        }
        sanitized.details._failedOperationsTruncated = true
      }
    }

    return sanitized
  }

  private static createDetailsSummary(details: any): string {
    if (!details) return 'No details'

    const summary: string[] = []

    if (details.entity) summary.push(`Entity: ${details.entity}`)
    if (details.recordCount !== undefined) summary.push(`Records: ${details.recordCount}`)
    if (details.successCount !== undefined) summary.push(`Success: ${details.successCount}`)
    if (details.errorCount !== undefined) summary.push(`Errors: ${details.errorCount}`)
    if (details.versionId) summary.push(`Version ID: ${details.versionId}`)
    if (details.connectionId) summary.push(`Connection: ${details.connectionId}`)

    return summary.length > 0 ? summary.join(', ') : 'Operation completed'
  }

  static pruneLogsIfNeeded(logs: AuditLog[]): AuditLog[] {
    if (!Array.isArray(logs) || logs.length === 0) {
      return []
    }

    let prunedLogs = [...logs]

    if (prunedLogs.length > MAX_LOGS_COUNT) {
      console.log(`🔧 Pruning logs: ${prunedLogs.length} > ${MAX_LOGS_COUNT}`)
      prunedLogs = prunedLogs.slice(0, MAX_LOGS_COUNT)
    }

    const totalSize = this.estimateTotalSize(prunedLogs)

    if (totalSize > MAX_LOG_SIZE_BYTES) {
      console.log(`🔧 Log size too large: ${totalSize} bytes > ${MAX_LOG_SIZE_BYTES} bytes`)

      prunedLogs = prunedLogs.map(log => this.sanitizeLogForStorage(log))

      const newSize = this.estimateTotalSize(prunedLogs)
      console.log(`🔧 After sanitization: ${newSize} bytes`)

      if (newSize > MAX_LOG_SIZE_BYTES && prunedLogs.length > MIN_LOGS_TO_KEEP) {
        const logsToKeep = Math.max(MIN_LOGS_TO_KEEP, Math.floor(prunedLogs.length * 0.7))
        console.log(`🔧 Still too large, keeping most recent ${logsToKeep} logs`)
        prunedLogs = prunedLogs.slice(0, logsToKeep)

        const finalSize = this.estimateTotalSize(prunedLogs)
        console.log(`🔧 Final size: ${finalSize} bytes`)

        if (finalSize > MAX_LOG_SIZE_BYTES) {
          console.warn('⚠️ Logs still too large after aggressive pruning')
          prunedLogs = prunedLogs.slice(0, MIN_LOGS_TO_KEEP).map(log => ({
            ...log,
            details: log.details ? { _summary: this.createDetailsSummary(log.details) } : undefined,
            rollbackData: undefined,
            failedOperations: undefined
          }))
        }
      }
    }

    return prunedLogs
  }

  static addLogWithAutoprune(currentLogs: AuditLog[], newLog: AuditLog): AuditLog[] {
    const sanitizedLog = this.sanitizeLogForStorage(newLog)
    
    const updatedLogs = [sanitizedLog, ...(currentLogs || [])]
    
    return this.pruneLogsIfNeeded(updatedLogs)
  }
}
