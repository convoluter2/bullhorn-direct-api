import { describe, it, expect } from 'vitest'
import {
  evaluateCondition,
  evaluateConditionalAssociation,
  getAssociationsForRecord,
  mergeAssociationActions,
  describeCondition,
  describeAssociation
} from '@/lib/conditional-logic'
import type { ConditionalRule, ConditionalAssociation } from '@/components/ConditionalAssociationBuilder'

describe('Conditional Logic', () => {
  describe('evaluateCondition', () => {
    it('should evaluate equals operator correctly', () => {
      const rule: ConditionalRule = {
        id: '1',
        field: 'status',
        operator: 'equals',
        value: 'Active'
      }
      
      expect(evaluateCondition(rule, { status: 'Active' })).toBe(true)
      expect(evaluateCondition(rule, { status: 'Inactive' })).toBe(false)
    })

    it('should evaluate notEquals operator correctly', () => {
      const rule: ConditionalRule = {
        id: '1',
        field: 'status',
        operator: 'notEquals',
        value: 'Inactive'
      }
      
      expect(evaluateCondition(rule, { status: 'Active' })).toBe(true)
      expect(evaluateCondition(rule, { status: 'Inactive' })).toBe(false)
    })

    it('should evaluate contains operator correctly', () => {
      const rule: ConditionalRule = {
        id: '1',
        field: 'notes',
        operator: 'contains',
        value: 'VIP'
      }
      
      expect(evaluateCondition(rule, { notes: 'This is a VIP candidate' })).toBe(true)
      expect(evaluateCondition(rule, { notes: 'Regular candidate' })).toBe(false)
      expect(evaluateCondition(rule, { notes: 'vip customer' })).toBe(true)
    })

    it('should evaluate notContains operator correctly', () => {
      const rule: ConditionalRule = {
        id: '1',
        field: 'notes',
        operator: 'notContains',
        value: 'blocked'
      }
      
      expect(evaluateCondition(rule, { notes: 'Good candidate' })).toBe(true)
      expect(evaluateCondition(rule, { notes: 'Candidate is blocked' })).toBe(false)
    })

    it('should evaluate greaterThan operator correctly', () => {
      const rule: ConditionalRule = {
        id: '1',
        field: 'salary',
        operator: 'greaterThan',
        value: '100000'
      }
      
      expect(evaluateCondition(rule, { salary: 150000 })).toBe(true)
      expect(evaluateCondition(rule, { salary: 90000 })).toBe(false)
      expect(evaluateCondition(rule, { salary: 100000 })).toBe(false)
    })

    it('should evaluate lessThan operator correctly', () => {
      const rule: ConditionalRule = {
        id: '1',
        field: 'age',
        operator: 'lessThan',
        value: '30'
      }
      
      expect(evaluateCondition(rule, { age: 25 })).toBe(true)
      expect(evaluateCondition(rule, { age: 35 })).toBe(false)
      expect(evaluateCondition(rule, { age: 30 })).toBe(false)
    })

    it('should evaluate isEmpty operator correctly', () => {
      const rule: ConditionalRule = {
        id: '1',
        field: 'middleName',
        operator: 'isEmpty',
        value: ''
      }
      
      expect(evaluateCondition(rule, { middleName: null })).toBe(true)
      expect(evaluateCondition(rule, { middleName: undefined })).toBe(true)
      expect(evaluateCondition(rule, { middleName: '' })).toBe(true)
      expect(evaluateCondition(rule, { middleName: '   ' })).toBe(true)
      expect(evaluateCondition(rule, { middleName: 'James' })).toBe(false)
    })

    it('should evaluate isNotEmpty operator correctly', () => {
      const rule: ConditionalRule = {
        id: '1',
        field: 'email',
        operator: 'isNotEmpty',
        value: ''
      }
      
      expect(evaluateCondition(rule, { email: 'test@example.com' })).toBe(true)
      expect(evaluateCondition(rule, { email: null })).toBe(false)
      expect(evaluateCondition(rule, { email: undefined })).toBe(false)
      expect(evaluateCondition(rule, { email: '' })).toBe(false)
    })

    it('should evaluate in operator correctly', () => {
      const rule: ConditionalRule = {
        id: '1',
        field: 'state',
        operator: 'in',
        value: 'CA,NY,TX'
      }
      
      expect(evaluateCondition(rule, { state: 'CA' })).toBe(true)
      expect(evaluateCondition(rule, { state: 'NY' })).toBe(true)
      expect(evaluateCondition(rule, { state: 'FL' })).toBe(false)
      expect(evaluateCondition(rule, { state: 'ca' })).toBe(true)
    })

    it('should evaluate notIn operator correctly', () => {
      const rule: ConditionalRule = {
        id: '1',
        field: 'department',
        operator: 'notIn',
        value: 'HR,Legal'
      }
      
      expect(evaluateCondition(rule, { department: 'Sales' })).toBe(true)
      expect(evaluateCondition(rule, { department: 'HR' })).toBe(false)
      expect(evaluateCondition(rule, { department: 'Legal' })).toBe(false)
    })
  })

  describe('evaluateConditionalAssociation', () => {
    it('should evaluate AND logic correctly', () => {
      const association: ConditionalAssociation = {
        id: '1',
        enabled: true,
        conditions: [
          { id: '1', field: 'status', operator: 'equals', value: 'Active' },
          { id: '2', field: 'state', operator: 'equals', value: 'CA' }
        ],
        conditionLogic: 'AND',
        associationField: 'certifications',
        operation: 'add',
        ids: [101, 102]
      }
      
      expect(evaluateConditionalAssociation(association, { status: 'Active', state: 'CA' })).toBe(true)
      expect(evaluateConditionalAssociation(association, { status: 'Active', state: 'NY' })).toBe(false)
      expect(evaluateConditionalAssociation(association, { status: 'Inactive', state: 'CA' })).toBe(false)
    })

    it('should evaluate OR logic correctly', () => {
      const association: ConditionalAssociation = {
        id: '1',
        enabled: true,
        conditions: [
          { id: '1', field: 'status', operator: 'equals', value: 'Active' },
          { id: '2', field: 'isPreferred', operator: 'equals', value: 'true' }
        ],
        conditionLogic: 'OR',
        associationField: 'certifications',
        operation: 'add',
        ids: [101, 102]
      }
      
      expect(evaluateConditionalAssociation(association, { status: 'Active', isPreferred: 'false' })).toBe(true)
      expect(evaluateConditionalAssociation(association, { status: 'Inactive', isPreferred: 'true' })).toBe(true)
      expect(evaluateConditionalAssociation(association, { status: 'Active', isPreferred: 'true' })).toBe(true)
      expect(evaluateConditionalAssociation(association, { status: 'Inactive', isPreferred: 'false' })).toBe(false)
    })

    it('should return false if association is disabled', () => {
      const association: ConditionalAssociation = {
        id: '1',
        enabled: false,
        conditions: [
          { id: '1', field: 'status', operator: 'equals', value: 'Active' }
        ],
        conditionLogic: 'AND',
        associationField: 'certifications',
        operation: 'add',
        ids: [101]
      }
      
      expect(evaluateConditionalAssociation(association, { status: 'Active' })).toBe(false)
    })
  })

  describe('getAssociationsForRecord', () => {
    it('should return actions for matching rules', () => {
      const associations: ConditionalAssociation[] = [
        {
          id: '1',
          enabled: true,
          conditions: [{ id: '1', field: 'status', operator: 'equals', value: 'Active' }],
          conditionLogic: 'AND',
          associationField: 'certifications',
          operation: 'add',
          ids: [101, 102]
        },
        {
          id: '2',
          enabled: true,
          conditions: [{ id: '1', field: 'state', operator: 'equals', value: 'CA' }],
          conditionLogic: 'AND',
          associationField: 'specialties',
          operation: 'add',
          ids: [201]
        }
      ]
      
      const actions = getAssociationsForRecord(associations, { status: 'Active', state: 'CA' })
      
      expect(actions).toHaveLength(2)
      expect(actions[0]).toEqual({ field: 'certifications', operation: 'add', ids: [101, 102] })
      expect(actions[1]).toEqual({ field: 'specialties', operation: 'add', ids: [201] })
    })

    it('should not return actions for non-matching rules', () => {
      const associations: ConditionalAssociation[] = [
        {
          id: '1',
          enabled: true,
          conditions: [{ id: '1', field: 'status', operator: 'equals', value: 'Active' }],
          conditionLogic: 'AND',
          associationField: 'certifications',
          operation: 'add',
          ids: [101]
        }
      ]
      
      const actions = getAssociationsForRecord(associations, { status: 'Inactive' })
      
      expect(actions).toHaveLength(0)
    })
  })

  describe('mergeAssociationActions', () => {
    it('should merge add operations for same field', () => {
      const actions = [
        { field: 'certifications', operation: 'add' as const, ids: [101, 102] },
        { field: 'certifications', operation: 'add' as const, ids: [102, 103] }
      ]
      
      const merged = mergeAssociationActions(actions)
      const result = merged.get('certifications')
      
      expect(result?.operation).toBe('add')
      expect(result?.ids).toEqual([101, 102, 103])
    })

    it('should replace takes precedence over add', () => {
      const actions = [
        { field: 'certifications', operation: 'add' as const, ids: [101, 102] },
        { field: 'certifications', operation: 'replace' as const, ids: [201, 202] }
      ]
      
      const merged = mergeAssociationActions(actions)
      const result = merged.get('certifications')
      
      expect(result?.operation).toBe('replace')
      expect(result?.ids).toEqual([201, 202])
    })

    it('should merge remove operations', () => {
      const actions = [
        { field: 'certifications', operation: 'remove' as const, ids: [101] },
        { field: 'certifications', operation: 'remove' as const, ids: [102] }
      ]
      
      const merged = mergeAssociationActions(actions)
      const result = merged.get('certifications')
      
      expect(result?.operation).toBe('remove')
      expect(result?.ids).toEqual([101, 102])
    })

    it('should handle different fields independently', () => {
      const actions = [
        { field: 'certifications', operation: 'add' as const, ids: [101] },
        { field: 'specialties', operation: 'add' as const, ids: [201] }
      ]
      
      const merged = mergeAssociationActions(actions)
      
      expect(merged.size).toBe(2)
      expect(merged.get('certifications')?.ids).toEqual([101])
      expect(merged.get('specialties')?.ids).toEqual([201])
    })
  })

  describe('describeCondition', () => {
    it('should describe equals condition', () => {
      const rule: ConditionalRule = {
        id: '1',
        field: 'status',
        operator: 'equals',
        value: 'Active'
      }
      
      expect(describeCondition(rule)).toBe('status equals "Active"')
    })

    it('should describe contains condition', () => {
      const rule: ConditionalRule = {
        id: '1',
        field: 'notes',
        operator: 'contains',
        value: 'VIP'
      }
      
      expect(describeCondition(rule)).toBe('notes contains "VIP"')
    })

    it('should describe isEmpty condition', () => {
      const rule: ConditionalRule = {
        id: '1',
        field: 'middleName',
        operator: 'isEmpty',
        value: ''
      }
      
      expect(describeCondition(rule)).toBe('middleName is empty')
    })

    it('should use field label if provided', () => {
      const rule: ConditionalRule = {
        id: '1',
        field: 'status',
        operator: 'equals',
        value: 'Active'
      }
      
      expect(describeCondition(rule, 'Status Field')).toBe('Status Field equals "Active"')
    })
  })

  describe('describeAssociation', () => {
    it('should describe add operation', () => {
      const association: ConditionalAssociation = {
        id: '1',
        enabled: true,
        conditions: [{ id: '1', field: 'status', operator: 'equals', value: 'Active' }],
        conditionLogic: 'AND',
        associationField: 'certifications',
        operation: 'add',
        ids: [101, 102]
      }
      
      const description = describeAssociation(association)
      expect(description).toContain('When status equals "Active"')
      expect(description).toContain('add 2 IDs to certifications')
    })

    it('should describe remove operation with single ID', () => {
      const association: ConditionalAssociation = {
        id: '1',
        enabled: true,
        conditions: [{ id: '1', field: 'status', operator: 'equals', value: 'Inactive' }],
        conditionLogic: 'AND',
        associationField: 'certifications',
        operation: 'remove',
        ids: [101]
      }
      
      const description = describeAssociation(association)
      expect(description).toContain('remove ID 101 from certifications')
    })

    it('should describe multiple conditions with AND logic', () => {
      const association: ConditionalAssociation = {
        id: '1',
        enabled: true,
        conditions: [
          { id: '1', field: 'status', operator: 'equals', value: 'Active' },
          { id: '2', field: 'state', operator: 'equals', value: 'CA' }
        ],
        conditionLogic: 'AND',
        associationField: 'specialties',
        operation: 'replace',
        ids: [201]
      }
      
      const description = describeAssociation(association)
      expect(description).toContain('AND')
      expect(description).toContain('replace specialties with ID 201')
    })

    it('should use field labels if provided', () => {
      const association: ConditionalAssociation = {
        id: '1',
        enabled: true,
        conditions: [{ id: '1', field: 'status', operator: 'equals', value: 'Active' }],
        conditionLogic: 'AND',
        associationField: 'certifications',
        operation: 'add',
        ids: [101]
      }
      
      const fieldsMap = new Map([
        ['status', 'Status Field'],
        ['certifications', 'Certifications List']
      ])
      
      const description = describeAssociation(association, fieldsMap)
      expect(description).toContain('Status Field equals "Active"')
      expect(description).toContain('Certifications List')
    })
  })
})
