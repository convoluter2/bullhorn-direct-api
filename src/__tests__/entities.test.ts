import { describe, it, expect } from 'vitest'
import { getEntityById, getEntityFields, BULLHORN_ENTITIES } from '@/lib/entities'

describe('entities', () => {
  describe('BULLHORN_ENTITIES', () => {
    it('should have entities defined', () => {
      expect(BULLHORN_ENTITIES).toBeDefined()
      expect(BULLHORN_ENTITIES.length).toBeGreaterThan(0)
    })

    it('should have Candidate entity', () => {
      const candidate = BULLHORN_ENTITIES.find(e => e.id === 'Candidate')
      expect(candidate).toBeDefined()
      expect(candidate?.label).toBe('Candidate')
    })

    it('should have required fields for each entity', () => {
      BULLHORN_ENTITIES.forEach(entity => {
        expect(entity.id).toBeDefined()
        expect(entity.label).toBeDefined()
        expect(entity.fields).toBeDefined()
        expect(Array.isArray(entity.fields)).toBe(true)
        expect(entity.fields.length).toBeGreaterThan(0)
      })
    })

    it('should have id field in all entities', () => {
      BULLHORN_ENTITIES.forEach(entity => {
        expect(entity.fields).toContain('id')
      })
    })
  })

  describe('getEntityById', () => {
    it('should return entity for valid id', () => {
      const candidate = getEntityById('Candidate')
      expect(candidate).toBeDefined()
      expect(candidate?.id).toBe('Candidate')
    })

    it('should return undefined for invalid id', () => {
      const result = getEntityById('NonExistentEntity')
      expect(result).toBeUndefined()
    })

    it('should be case sensitive', () => {
      const result = getEntityById('candidate')
      expect(result).toBeUndefined()
    })
  })

  describe('getEntityFields', () => {
    it('should return fields for valid entity', () => {
      const fields = getEntityFields('Candidate')
      expect(fields).toBeDefined()
      expect(Array.isArray(fields)).toBe(true)
      expect(fields.length).toBeGreaterThan(0)
      expect(fields).toContain('id')
    })

    it('should return empty array for invalid entity', () => {
      const fields = getEntityFields('NonExistentEntity')
      expect(fields).toEqual([])
    })

    it('should return fields array for JobOrder', () => {
      const fields = getEntityFields('JobOrder')
      expect(fields).toBeDefined()
      expect(fields).toContain('id')
      expect(fields).toContain('title')
    })
  })
})
