import { describe, it, expect } from 'vitest'
import type { 
  BullhornCredentials, 
  BullhornSession, 
  QueryFilter, 
  FilterGroup,
  QueryConfig,
  AuditLog,
  CSVMapping
} from '@/lib/types'

describe('Type Definitions', () => {
  describe('BullhornCredentials', () => {
    it('should have required fields', () => {
      const credentials: BullhornCredentials = {
        clientId: 'test-id',
        clientSecret: 'test-secret',
        username: 'user@test.com',
        password: 'password123'
      }

      expect(credentials.clientId).toBeDefined()
      expect(credentials.clientSecret).toBeDefined()
      expect(credentials.username).toBeDefined()
      expect(credentials.password).toBeDefined()
    })

    it('should allow optional fields', () => {
      const credentials: BullhornCredentials = {
        clientId: 'test-id',
        clientSecret: 'test-secret',
        username: 'user@test.com',
        password: 'password123',
        restUrl: 'https://example.com',
        bhRestToken: 'token'
      }

      expect(credentials.restUrl).toBe('https://example.com')
      expect(credentials.bhRestToken).toBe('token')
    })
  })

  describe('BullhornSession', () => {
    it('should have required session fields', () => {
      const session: BullhornSession = {
        BhRestToken: 'rest-token',
        restUrl: 'https://rest.example.com/'
      }

      expect(session.BhRestToken).toBeDefined()
      expect(session.restUrl).toBeDefined()
    })

    it('should allow optional fields', () => {
      const session: BullhornSession = {
        BhRestToken: 'rest-token',
        restUrl: 'https://rest.example.com/',
        corporationId: 123,
        userId: 456,
        refreshToken: 'refresh-token',
        accessToken: 'access-token',
        expiresAt: Date.now() + 600000
      }

      expect(session.corporationId).toBe(123)
      expect(session.userId).toBe(456)
    })
  })

  describe('QueryFilter', () => {
    it('should define filter structure', () => {
      const filter: QueryFilter = {
        field: 'status',
        operator: 'equals',
        value: 'Active'
      }

      expect(filter.field).toBe('status')
      expect(filter.operator).toBe('equals')
      expect(filter.value).toBe('Active')
    })

    it('should support different operators', () => {
      const operators = [
        'equals',
        'not_equals',
        'contains',
        'greater_than',
        'less_than',
        'is_null',
        'is_not_null'
      ]

      operators.forEach(op => {
        const filter: QueryFilter = {
          field: 'testField',
          operator: op,
          value: 'testValue'
        }
        expect(filter.operator).toBe(op)
      })
    })
  })

  describe('FilterGroup', () => {
    it('should define filter group with logic', () => {
      const group: FilterGroup = {
        id: 'group-1',
        logic: 'AND',
        filters: [
          { field: 'status', operator: 'equals', value: 'Active' },
          { field: 'firstName', operator: 'contains', value: 'John' }
        ]
      }

      expect(group.logic).toBe('AND')
      expect(group.filters).toHaveLength(2)
    })

    it('should support OR logic', () => {
      const group: FilterGroup = {
        id: 'group-2',
        logic: 'OR',
        filters: []
      }

      expect(group.logic).toBe('OR')
    })
  })

  describe('QueryConfig', () => {
    it('should define complete query configuration', () => {
      const config: QueryConfig = {
        entity: 'Candidate',
        fields: ['id', 'firstName', 'lastName'],
        filters: [
          { field: 'status', operator: 'equals', value: 'Active' }
        ]
      }

      expect(config.entity).toBe('Candidate')
      expect(config.fields).toHaveLength(3)
      expect(config.filters).toHaveLength(1)
    })

    it('should support filter groups', () => {
      const config: QueryConfig = {
        entity: 'Candidate',
        fields: ['id'],
        filters: [],
        filterGroups: [
          {
            id: 'group-1',
            logic: 'AND',
            filters: [
              { field: 'status', operator: 'equals', value: 'Active' }
            ]
          }
        ],
        groupLogic: 'OR'
      }

      expect(config.filterGroups).toHaveLength(1)
      expect(config.groupLogic).toBe('OR')
    })

    it('should support pagination and sorting', () => {
      const config: QueryConfig = {
        entity: 'Candidate',
        fields: ['id'],
        filters: [],
        count: 100,
        start: 0,
        orderBy: 'dateAdded DESC'
      }

      expect(config.count).toBe(100)
      expect(config.start).toBe(0)
      expect(config.orderBy).toBe('dateAdded DESC')
    })
  })

  describe('AuditLog', () => {
    it('should define audit log structure', () => {
      const log: AuditLog = {
        id: 'log-123',
        timestamp: Date.now(),
        operation: 'Query',
        status: 'success',
        message: 'Query executed successfully'
      }

      expect(log.id).toBeDefined()
      expect(log.operation).toBeDefined()
      expect(log.status).toBe('success')
    })

    it('should support rollback data', () => {
      const log: AuditLog = {
        id: 'log-123',
        timestamp: Date.now(),
        operation: 'Update',
        status: 'success',
        message: 'Updated 10 records',
        entity: 'Candidate',
        recordCount: 10,
        rollbackData: {
          updates: [
            {
              entityId: 1,
              previousValues: { status: 'Active' }
            }
          ]
        }
      }

      expect(log.rollbackData).toBeDefined()
      expect(log.rollbackData?.updates).toHaveLength(1)
      expect(log.entity).toBe('Candidate')
      expect(log.recordCount).toBe(10)
    })

    it('should support rollback history', () => {
      const log: AuditLog = {
        id: 'log-123',
        timestamp: Date.now(),
        operation: 'Rollback',
        status: 'success',
        message: 'Rollback completed',
        rolledBack: true,
        rollbackHistory: [
          {
            timestamp: Date.now(),
            successCount: 5,
            errorCount: 0
          }
        ],
        originalLogId: 'log-original-456'
      }

      expect(log.rolledBack).toBe(true)
      expect(log.rollbackHistory).toHaveLength(1)
      expect(log.originalLogId).toBe('log-original-456')
    })
  })

  describe('CSVMapping', () => {
    it('should define CSV mapping structure', () => {
      const mapping: CSVMapping = {
        csvColumn: 'First Name',
        bullhornField: 'firstName'
      }

      expect(mapping.csvColumn).toBe('First Name')
      expect(mapping.bullhornField).toBe('firstName')
    })

    it('should support transform functions', () => {
      const mapping: CSVMapping = {
        csvColumn: 'Age',
        bullhornField: 'age',
        transform: 'number'
      }

      expect(mapping.transform).toBe('number')
    })
  })
})
