import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AuditLogs } from '@/components/AuditLogs'
import type { AuditLog } from '@/lib/types'

describe('AuditLogs Component', () => {
  const mockOnClearLogs = vi.fn()
  const mockOnUpdateLog = vi.fn()
  const mockOnLog = vi.fn()

  it('renders without crashing with empty logs', () => {
    render(
      <AuditLogs
        logs={[]}
        onClearLogs={mockOnClearLogs}
        onUpdateLog={mockOnUpdateLog}
        onLog={mockOnLog}
      />
    )
    expect(screen.getByText('Audit Logs')).toBeInTheDocument()
  })

  it('renders without crashing with valid logs', () => {
    const validLogs: AuditLog[] = [
      {
        id: 'log-1',
        timestamp: Date.now(),
        operation: 'Test Operation',
        status: 'success',
        message: 'Test message',
        entity: 'Candidate',
        recordCount: 5
      }
    ]

    render(
      <AuditLogs
        logs={validLogs}
        onClearLogs={mockOnClearLogs}
        onUpdateLog={mockOnUpdateLog}
        onLog={mockOnLog}
      />
    )
    expect(screen.getByText('Test Operation')).toBeInTheDocument()
  })

  it('handles logs with error objects in details', () => {
    const logsWithError: AuditLog[] = [
      {
        id: 'log-error',
        timestamp: Date.now(),
        operation: 'Failed Operation',
        status: 'error',
        message: 'Operation failed',
        details: {
          error: new Error('Test error message')
        }
      }
    ]

    render(
      <AuditLogs
        logs={logsWithError}
        onClearLogs={mockOnClearLogs}
        onUpdateLog={mockOnUpdateLog}
        onLog={mockOnLog}
      />
    )
    expect(screen.getByText('Failed Operation')).toBeInTheDocument()
  })

  it('handles logs with circular references in details', () => {
    const circularObj: any = { prop: 'value' }
    circularObj.self = circularObj

    const logsWithCircular: AuditLog[] = [
      {
        id: 'log-circular',
        timestamp: Date.now(),
        operation: 'Circular Operation',
        status: 'success',
        message: 'Has circular reference',
        details: circularObj
      }
    ]

    render(
      <AuditLogs
        logs={logsWithCircular}
        onClearLogs={mockOnClearLogs}
        onUpdateLog={mockOnUpdateLog}
        onLog={mockOnLog}
      />
    )
    expect(screen.getByText('Circular Operation')).toBeInTheDocument()
  })

  it('handles logs with missing timestamps', () => {
    const logsWithoutTimestamp: AuditLog[] = [
      {
        id: 'log-no-time',
        timestamp: 0,
        operation: 'No Time',
        status: 'success',
        message: 'Missing timestamp'
      }
    ]

    render(
      <AuditLogs
        logs={logsWithoutTimestamp}
        onClearLogs={mockOnClearLogs}
        onUpdateLog={mockOnUpdateLog}
        onLog={mockOnLog}
      />
    )
    expect(screen.getByText('No Time')).toBeInTheDocument()
  })

  it('handles logs with rollback history', () => {
    const logsWithRollback: AuditLog[] = [
      {
        id: 'log-rollback',
        timestamp: Date.now(),
        operation: 'Update',
        status: 'success',
        message: 'Updated records',
        rollbackHistory: [
          {
            timestamp: Date.now() - 1000,
            successCount: 5,
            errorCount: 0
          }
        ]
      }
    ]

    render(
      <AuditLogs
        logs={logsWithRollback}
        onClearLogs={mockOnClearLogs}
        onUpdateLog={mockOnUpdateLog}
        onLog={mockOnLog}
      />
    )
    expect(screen.getByText('Update')).toBeInTheDocument()
  })

  it('handles logs with failed operations', () => {
    const logsWithFailures: AuditLog[] = [
      {
        id: 'log-failures',
        timestamp: Date.now(),
        operation: 'Bulk Update',
        status: 'error',
        message: 'Some operations failed',
        entity: 'Candidate',
        failedOperations: [
          {
            entityId: 123,
            operation: 'update',
            data: { firstName: 'Test' },
            error: 'Network error'
          }
        ]
      }
    ]

    render(
      <AuditLogs
        logs={logsWithFailures}
        onClearLogs={mockOnClearLogs}
        onUpdateLog={mockOnUpdateLog}
        onLog={mockOnLog}
      />
    )
    expect(screen.getByText('Bulk Update')).toBeInTheDocument()
  })

  it('handles logs with complex nested error objects', () => {
    const logsWithComplexError: AuditLog[] = [
      {
        id: 'log-complex',
        timestamp: Date.now(),
        operation: 'Complex Error',
        status: 'error',
        message: 'Complex error occurred',
        details: {
          error: {
            error: {
              message: 'Nested error message',
              code: 500
            }
          },
          metadata: {
            timestamp: Date.now(),
            user: 'test@example.com'
          }
        }
      }
    ]

    render(
      <AuditLogs
        logs={logsWithComplexError}
        onClearLogs={mockOnClearLogs}
        onUpdateLog={mockOnUpdateLog}
        onLog={mockOnLog}
      />
    )
    expect(screen.getByText('Complex Error')).toBeInTheDocument()
  })

  it('handles malformed log entries gracefully', () => {
    const malformedLogs: any[] = [
      null,
      undefined,
      { id: 'valid', timestamp: Date.now(), operation: 'Valid', status: 'success', message: 'Valid log' },
      { },
      'not an object'
    ]

    render(
      <AuditLogs
        logs={malformedLogs}
        onClearLogs={mockOnClearLogs}
        onUpdateLog={mockOnUpdateLog}
        onLog={mockOnLog}
      />
    )
    expect(screen.getByText('Audit Logs')).toBeInTheDocument()
  })
})
