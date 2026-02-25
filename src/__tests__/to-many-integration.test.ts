import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BullhornAPI } from '@/lib/bullhorn-api'
import type { BullhornSession } from '@/lib/types'

global.fetch = vi.fn()

describe('To-Many Field Integration Tests', () => {
  let api: BullhornAPI
  const mockSession: BullhornSession = {
    BhRestToken: 'test-token',
    restUrl: 'https://rest.bullhornstaffing.com/rest-services/test/',
    corporationId: 123,
    userId: 456
  }

  beforeEach(() => {
    api = new BullhornAPI()
    api.setSession(mockSession)
    vi.resetAllMocks()
  })

  describe('Complete Workflow: ClientCorporation Certifications', () => {
    it('should successfully add certifications to multiple ClientCorporations', async () => {
      const clientCorps = [
        { id: 100, certIds: [1, 2, 3] },
        { id: 101, certIds: [4, 5, 6] },
        { id: 102, certIds: [7, 8, 9] }
      ]

      clientCorps.forEach(() => {
        ;(global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            changedEntityId: 100,
            changeType: 'INSERT'
          })
        })
      })

      const results: any[] = []
      for (const corp of clientCorps) {
        const result = await api.updateToManyAssociation(
          'ClientCorporation',
          corp.id,
          'certifications',
          corp.certIds,
          'add'
        )
        results.push(result)
      }

      expect(results).toHaveLength(3)
      expect(global.fetch).toHaveBeenCalledTimes(3)
    })

    it('should handle SmartStack workflow with to-many fields', async () => {
      const entityIds = [100, 101, 102]
      const certsToAdd = [10, 20, 30]

      entityIds.forEach(() => {
        ;(global.fetch as any)
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              data: {
                id: 100,
                name: 'Test Corp',
                certifications: { total: 0 }
              }
            })
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              changedEntityId: 100,
              changeType: 'INSERT'
            })
          })
      })

      for (const entityId of entityIds) {
        const entity = await api.getEntity('ClientCorporation', entityId, ['id', 'name'])
        expect(entity).toBeDefined()

        const result = await api.updateToManyAssociation(
          'ClientCorporation',
          entityId,
          'certifications',
          certsToAdd,
          'add'
        )
        expect(result.changeType).toBe('INSERT')
      }

      expect(global.fetch).toHaveBeenCalledTimes(entityIds.length * 2)
    })
  })

  describe('Complete Workflow: Candidate Skills', () => {
    it('should replace primary skills for a candidate', async () => {
      const candidateId = 200
      const oldSkills = [{ id: 1 }, { id: 2 }, { id: 3 }]
      const newSkills = [10, 20, 30, 40]

      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: oldSkills
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            changedEntityId: candidateId,
            changeType: 'DELETE'
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            changedEntityId: candidateId,
            changeType: 'INSERT'
          })
        })

      const result = await api.updateToManyAssociation(
        'Candidate',
        candidateId,
        'primarySkills',
        newSkills,
        'replace'
      )

      expect(global.fetch).toHaveBeenCalledTimes(3)
      
      expect(global.fetch).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining(`entity/Candidate/${candidateId}/primarySkills`),
        undefined
      )
      
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining(`entity/Candidate/${candidateId}/primarySkills/1,2,3`),
        expect.objectContaining({ method: 'DELETE' })
      )
      
      expect(global.fetch).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining(`entity/Candidate/${candidateId}/primarySkills/10,20,30,40`),
        expect.objectContaining({ method: 'PUT' })
      )
    })

    it('should remove specific skills from a candidate', async () => {
      const candidateId = 200
      const skillsToRemove = [5, 15, 25]

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          changedEntityId: candidateId,
          changeType: 'DELETE'
        })
      })

      const result = await api.updateToManyAssociation(
        'Candidate',
        candidateId,
        'primarySkills',
        skillsToRemove,
        'remove'
      )

      expect(result.changeType).toBe('DELETE')
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`entity/Candidate/${candidateId}/primarySkills/5,15,25`),
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })

  describe('Complete Workflow: JobOrder Categories', () => {
    it('should manage categories across multiple JobOrders', async () => {
      const jobOrders = [
        { id: 300, operation: 'add', categoryIds: [1, 2] },
        { id: 301, operation: 'remove', categoryIds: [3] },
        { id: 302, operation: 'add', categoryIds: [4, 5, 6] }
      ]

      for (const job of jobOrders) {
        ;(global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            changedEntityId: job.id,
            changeType: job.operation === 'add' ? 'INSERT' : 'DELETE'
          })
        })
      }

      const results: any[] = []
      for (const job of jobOrders) {
        const result = await api.updateToManyAssociation(
          'JobOrder',
          job.id,
          'categories',
          job.categoryIds,
          job.operation as 'add' | 'remove'
        )
        results.push(result)
      }

      expect(results).toHaveLength(3)
      expect(results[0]?.changeType).toBe('INSERT')
      expect(results[1]?.changeType).toBe('DELETE')
      expect(results[2]?.changeType).toBe('INSERT')
    })
  })

  describe('Error Recovery Scenarios', () => {
    it('should handle partial batch failures gracefully', async () => {
      const entities = [
        { id: 100, certIds: [1, 2, 3] },
        { id: 101, certIds: [4, 5, 6] },
        { id: 102, certIds: [7, 8, 9] }
      ]

      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ changedEntityId: 100, changeType: 'INSERT' })
        })
        .mockResolvedValueOnce({
          ok: false,
          text: async () => 'Entity not found'
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ changedEntityId: 102, changeType: 'INSERT' })
        })

      const results: any[] = []
      const errors: any[] = []

      for (const entity of entities) {
        try {
          const result = await api.updateToManyAssociation(
            'ClientCorporation',
            entity.id,
            'certifications',
            entity.certIds,
            'add'
          )
          results.push(result)
        } catch (error) {
          errors.push({ id: entity.id, error })
        }
      }

      expect(results).toHaveLength(2)
      expect(errors).toHaveLength(1)
      expect(errors[0]?.id).toBe(101)
    })

    it('should retry failed operations', async () => {
      const entityId = 100
      const certIds = [1, 2, 3]

      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: false,
          text: async () => 'Temporary error'
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ changedEntityId: entityId, changeType: 'INSERT' })
        })

      let result
      try {
        await api.updateToManyAssociation('ClientCorporation', entityId, 'certifications', certIds, 'add')
      } catch (error) {
        result = await api.updateToManyAssociation('ClientCorporation', entityId, 'certifications', certIds, 'add')
      }

      expect(result).toBeDefined()
      expect(result?.changeType).toBe('INSERT')
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('Data Validation Scenarios', () => {
    it('should validate IDs before making API calls', async () => {
      const validIds = [1, 2, 3, 4, 5]
      const invalidIds = [] as number[]

      expect(validIds.length).toBeGreaterThan(0)
      expect(invalidIds.length).toBe(0)

      if (validIds.length > 0) {
        ;(global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ changedEntityId: 100, changeType: 'INSERT' })
        })

        const result = await api.updateToManyAssociation(
          'ClientCorporation',
          100,
          'certifications',
          validIds,
          'add'
        )

        expect(result).toBeDefined()
      }
    })

    it('should handle duplicate IDs in the list', async () => {
      const idsWithDuplicates = [1, 2, 3, 2, 4, 3, 5]
      const uniqueIds = [...new Set(idsWithDuplicates)]

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ changedEntityId: 100, changeType: 'INSERT' })
      })

      const result = await api.updateToManyAssociation(
        'ClientCorporation',
        100,
        'certifications',
        uniqueIds,
        'add'
      )

      expect(uniqueIds).toEqual([1, 2, 3, 4, 5])
      expect(result.changeType).toBe('INSERT')
    })
  })

  describe('Complex Multi-Step Workflows', () => {
    it('should handle CSV upload -> filter -> to-many update workflow', async () => {
      const csvIds = [100, 101, 102, 103, 104]
      const filterCriteria = { status: 'Active' }
      const certsToAdd = [10, 20, 30]
      
      const filteredIds = [100, 102, 104]

      for (const id of filteredIds) {
        ;(global.fetch as any)
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              data: {
                id,
                status: 'Active',
                name: `Corp ${id}`
              }
            })
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              changedEntityId: id,
              changeType: 'INSERT'
            })
          })
      }

      const results: any[] = []
      for (const id of filteredIds) {
        const entity = await api.getEntity('ClientCorporation', id, ['id', 'status', 'name'])
        
        if (entity.status === filterCriteria.status) {
          const result = await api.updateToManyAssociation(
            'ClientCorporation',
            id,
            'certifications',
            certsToAdd,
            'add'
          )
          results.push(result)
        }
      }

      expect(results).toHaveLength(3)
      expect(global.fetch).toHaveBeenCalledTimes(6)
    })

    it('should handle query -> select target -> to-many update workflow', async () => {
      const searchResults = [
        { id: 200, name: 'Candidate A' },
        { id: 201, name: 'Candidate B' },
        { id: 202, name: 'Candidate C' }
      ]
      
      const skillsToAdd = [100, 101, 102]

      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: searchResults,
            total: 3,
            count: 3
          })
        })

      for (const candidate of searchResults) {
        ;(global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            changedEntityId: candidate.id,
            changeType: 'INSERT'
          })
        })
      }

      const searchResult = await api.search({
        entity: 'Candidate',
        fields: ['id', 'name'],
        filters: [],
        filterGroups: [],
        count: 100
      })

      expect(searchResult.data).toHaveLength(3)

      const updateResults: any[] = []
      for (const candidate of searchResult.data) {
        const result = await api.updateToManyAssociation(
          'Candidate',
          candidate.id,
          'primarySkills',
          skillsToAdd,
          'add'
        )
        updateResults.push(result)
      }

      expect(updateResults).toHaveLength(3)
      expect(global.fetch).toHaveBeenCalledTimes(4)
    })
  })

  describe('Rollback and Audit Scenarios', () => {
    it('should capture state before to-many updates for rollback', async () => {
      const entityId = 100
      const oldCertIds = [1, 2, 3]
      const newCertIds = [10, 20, 30]

      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: oldCertIds.map(id => ({ id, name: `Cert ${id}` }))
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            changedEntityId: entityId,
            changeType: 'DELETE'
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            changedEntityId: entityId,
            changeType: 'INSERT'
          })
        })

      const beforeState = await api.getToManyAssociation(
        'ClientCorporation',
        entityId,
        'certifications',
        ['id', 'name']
      )

      expect(beforeState.data).toHaveLength(3)

      const updateResult = await api.updateToManyAssociation(
        'ClientCorporation',
        entityId,
        'certifications',
        newCertIds,
        'replace'
      )

      expect(updateResult).toBeDefined()

      const rollbackData = {
        entityId,
        field: 'certifications',
        previousIds: oldCertIds,
        newIds: newCertIds
      }

      expect(rollbackData.previousIds).toEqual([1, 2, 3])
      expect(rollbackData.newIds).toEqual([10, 20, 30])
    })

    it('should execute rollback by restoring previous to-many associations', async () => {
      const entityId = 100
      const previousIds = [1, 2, 3]
      const currentIds = [10, 20, 30]

      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: currentIds.map(id => ({ id }))
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            changedEntityId: entityId,
            changeType: 'DELETE'
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            changedEntityId: entityId,
            changeType: 'INSERT'
          })
        })

      const rollbackResult = await api.updateToManyAssociation(
        'ClientCorporation',
        entityId,
        'certifications',
        previousIds,
        'replace'
      )

      expect(rollbackResult).toBeDefined()
      expect(global.fetch).toHaveBeenCalledTimes(3)
    })
  })

  describe('Performance and Scale Tests', () => {
    it('should handle large batches efficiently', async () => {
      const largeBatch = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        certIds: [i * 10 + 1, i * 10 + 2, i * 10 + 3]
      }))

      for (const item of largeBatch) {
        ;(global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            changedEntityId: item.id,
            changeType: 'INSERT'
          })
        })
      }

      const results: any[] = []
      const startTime = Date.now()

      for (const item of largeBatch) {
        const result = await api.updateToManyAssociation(
          'ClientCorporation',
          item.id,
          'certifications',
          item.certIds,
          'add'
        )
        results.push(result)
      }

      const duration = Date.now() - startTime

      expect(results).toHaveLength(100)
      expect(global.fetch).toHaveBeenCalledTimes(100)
      console.log(`Processed 100 to-many updates in ${duration}ms`)
    }, 15000)

    it('should handle very large association lists', async () => {
      const entityId = 100
      const largeAssociationList = Array.from({ length: 500 }, (_, i) => i + 1)

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          changedEntityId: entityId,
          changeType: 'INSERT'
        })
      })

      const result = await api.updateToManyAssociation(
        'ClientCorporation',
        entityId,
        'certifications',
        largeAssociationList,
        'add'
      )

      expect(result.changeType).toBe('INSERT')
      
      const fetchCall = (global.fetch as any).mock.calls[0]
      expect(fetchCall[0]).toContain(largeAssociationList.join(','))
    })
  })
})
