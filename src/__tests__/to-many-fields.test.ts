import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BullhornAPI } from '@/lib/bullhorn-api'
import type { BullhornSession } from '@/lib/types'

global.fetch = vi.fn()

describe('To-Many Field Operations', () => {
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
    vi.clearAllMocks()
  })

  describe('associateToMany', () => {
    it('should add associations to a to-many field', async () => {
      const mockResponse = {
        changedEntityId: 100,
        changeType: 'INSERT'
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await api.associateToMany(
        'ClientCorporation',
        100,
        'certifications',
        [1, 2, 3]
      )

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('entity/ClientCorporation/100/certifications/1,2,3'),
        expect.objectContaining({
          method: 'PUT'
        })
      )
      expect(result).toEqual(mockResponse)
    })

    it('should handle single ID association', async () => {
      const mockResponse = {
        changedEntityId: 100,
        changeType: 'INSERT'
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await api.associateToMany(
        'ClientCorporation',
        100,
        'certifications',
        [5]
      )

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('entity/ClientCorporation/100/certifications/5'),
        expect.objectContaining({
          method: 'PUT'
        })
      )
    })

    it('should fail when not authenticated', async () => {
      const unauthenticatedApi = new BullhornAPI()
      
      await expect(
        unauthenticatedApi.associateToMany('ClientCorporation', 100, 'certifications', [1, 2, 3])
      ).rejects.toThrow('Not authenticated')
    })

    it('should handle API errors gracefully', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        text: async () => 'Association failed: Invalid entity ID'
      })

      await expect(
        api.associateToMany('ClientCorporation', 999999, 'certifications', [1, 2, 3])
      ).rejects.toThrow('Associate to-many failed')
    })
  })

  describe('disassociateToMany', () => {
    it('should remove associations from a to-many field', async () => {
      const mockResponse = {
        changedEntityId: 100,
        changeType: 'DELETE'
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await api.disassociateToMany(
        'ClientCorporation',
        100,
        'certifications',
        [1, 2]
      )

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('entity/ClientCorporation/100/certifications/1,2'),
        expect.objectContaining({
          method: 'DELETE'
        })
      )
      expect(result).toEqual(mockResponse)
    })

    it('should fail when not authenticated', async () => {
      const unauthenticatedApi = new BullhornAPI()
      
      await expect(
        unauthenticatedApi.disassociateToMany('ClientCorporation', 100, 'certifications', [1, 2])
      ).rejects.toThrow('Not authenticated')
    })

    it('should handle API errors gracefully', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        text: async () => 'Disassociation failed: Invalid entity ID'
      })

      await expect(
        api.disassociateToMany('ClientCorporation', 999999, 'certifications', [1, 2])
      ).rejects.toThrow('Disassociate to-many failed')
    })
  })

  describe('getToManyAssociation', () => {
    it('should retrieve to-many associations', async () => {
      const mockResponse = {
        data: [
          { id: 1, name: 'Certification A' },
          { id: 2, name: 'Certification B' }
        ],
        count: 2,
        start: 0,
        total: 2
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await api.getToManyAssociation(
        'ClientCorporation',
        100,
        'certifications',
        ['id', 'name']
      )

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('entity/ClientCorporation/100/certifications'),
        undefined
      )
      expect(result).toEqual(mockResponse)
    })

    it('should handle pagination parameters', async () => {
      const mockResponse = {
        data: [{ id: 3, name: 'Certification C' }],
        count: 1,
        start: 10,
        total: 15
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      await api.getToManyAssociation(
        'ClientCorporation',
        100,
        'certifications',
        ['id', 'name'],
        10,
        5
      )

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('start=10'),
        undefined
      )
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('count=5'),
        undefined
      )
    })

    it('should fail when not authenticated', async () => {
      const unauthenticatedApi = new BullhornAPI()
      
      await expect(
        unauthenticatedApi.getToManyAssociation('ClientCorporation', 100, 'certifications')
      ).rejects.toThrow('Not authenticated')
    })

    it('should handle API errors gracefully', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        text: async () => 'Get association failed: Invalid field'
      })

      await expect(
        api.getToManyAssociation('ClientCorporation', 100, 'invalidField')
      ).rejects.toThrow('Get to-many association failed')
    })
  })

  describe('updateToManyAssociation', () => {
    it('should add associations when operation is "add"', async () => {
      const mockResponse = {
        changedEntityId: 100,
        changeType: 'INSERT'
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await api.updateToManyAssociation(
        'ClientCorporation',
        100,
        'certifications',
        [1, 2, 3],
        'add'
      )

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('entity/ClientCorporation/100/certifications/1,2,3'),
        expect.objectContaining({
          method: 'PUT'
        })
      )
      expect(result).toEqual(mockResponse)
    })

    it('should remove associations when operation is "remove"', async () => {
      const mockResponse = {
        changedEntityId: 100,
        changeType: 'DELETE'
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await api.updateToManyAssociation(
        'ClientCorporation',
        100,
        'certifications',
        [1, 2],
        'remove'
      )

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('entity/ClientCorporation/100/certifications/1,2'),
        expect.objectContaining({
          method: 'DELETE'
        })
      )
      expect(result).toEqual(mockResponse)
    })

    it('should replace all associations when operation is "replace"', async () => {
      const mockGetResponse = {
        data: [
          { id: 10, name: 'Old Cert 1' },
          { id: 20, name: 'Old Cert 2' }
        ]
      }

      const mockDeleteResponse = {
        changedEntityId: 100,
        changeType: 'DELETE'
      }

      const mockAddResponse = {
        changedEntityId: 100,
        changeType: 'INSERT'
      }

      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockGetResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockDeleteResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockAddResponse
        })

      const result = await api.updateToManyAssociation(
        'ClientCorporation',
        100,
        'certifications',
        [5, 6, 7],
        'replace'
      )

      expect(global.fetch).toHaveBeenCalledTimes(3)
      
      expect(global.fetch).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('entity/ClientCorporation/100/certifications'),
        undefined
      )
      
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('entity/ClientCorporation/100/certifications/10,20'),
        expect.objectContaining({
          method: 'DELETE'
        })
      )
      
      expect(global.fetch).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('entity/ClientCorporation/100/certifications/5,6,7'),
        expect.objectContaining({
          method: 'PUT'
        })
      )
    })

    it('should handle replace with no existing associations', async () => {
      const mockGetResponse = {
        data: []
      }

      const mockAddResponse = {
        changedEntityId: 100,
        changeType: 'INSERT'
      }

      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockGetResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockAddResponse
        })

      const result = await api.updateToManyAssociation(
        'ClientCorporation',
        100,
        'certifications',
        [1, 2, 3],
        'replace'
      )

      expect(global.fetch).toHaveBeenCalledTimes(2)
      
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('entity/ClientCorporation/100/certifications/1,2,3'),
        expect.objectContaining({
          method: 'PUT'
        })
      )
    })

    it('should handle replace with empty new associations', async () => {
      const mockGetResponse = {
        data: [
          { id: 10, name: 'Old Cert 1' },
          { id: 20, name: 'Old Cert 2' }
        ]
      }

      const mockDeleteResponse = {
        changedEntityId: 100,
        changeType: 'DELETE'
      }

      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockGetResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockDeleteResponse
        })

      const result = await api.updateToManyAssociation(
        'ClientCorporation',
        100,
        'certifications',
        [],
        'replace'
      )

      expect(global.fetch).toHaveBeenCalledTimes(2)
      expect(result).toEqual({ success: true, message: 'Association replaced successfully' })
    })

    it('should throw error for invalid operation', async () => {
      await expect(
        api.updateToManyAssociation(
          'ClientCorporation',
          100,
          'certifications',
          [1, 2, 3],
          'invalid' as any
        )
      ).rejects.toThrow('Invalid operation: invalid')
    })

    it('should default to "add" operation when not specified', async () => {
      const mockResponse = {
        changedEntityId: 100,
        changeType: 'INSERT'
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      await api.updateToManyAssociation(
        'ClientCorporation',
        100,
        'certifications',
        [1, 2, 3]
      )

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('entity/ClientCorporation/100/certifications/1,2,3'),
        expect.objectContaining({
          method: 'PUT'
        })
      )
    })

    it('should fail when not authenticated', async () => {
      const unauthenticatedApi = new BullhornAPI()
      
      await expect(
        unauthenticatedApi.updateToManyAssociation(
          'ClientCorporation',
          100,
          'certifications',
          [1, 2, 3],
          'add'
        )
      ).rejects.toThrow('Not authenticated')
    })
  })

  describe('Real-world scenarios', () => {
    it('should handle adding certifications to a ClientCorporation', async () => {
      const mockResponse = {
        changedEntityId: 100,
        changeType: 'INSERT'
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await api.updateToManyAssociation(
        'ClientCorporation',
        100,
        'certifications',
        [101, 102, 103],
        'add'
      )

      expect(result.changedEntityId).toBe(100)
      expect(result.changeType).toBe('INSERT')
    })

    it('should handle removing skills from a Candidate', async () => {
      const mockResponse = {
        changedEntityId: 200,
        changeType: 'DELETE'
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await api.updateToManyAssociation(
        'Candidate',
        200,
        'primarySkills',
        [50, 51],
        'remove'
      )

      expect(result.changedEntityId).toBe(200)
      expect(result.changeType).toBe('DELETE')
    })

    it('should handle replacing all business sectors for a ClientContact', async () => {
      const mockGetResponse = {
        data: [
          { id: 1, name: 'Healthcare' },
          { id: 2, name: 'Technology' }
        ]
      }

      const mockDeleteResponse = {
        changedEntityId: 300,
        changeType: 'DELETE'
      }

      const mockAddResponse = {
        changedEntityId: 300,
        changeType: 'INSERT'
      }

      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockGetResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockDeleteResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockAddResponse
        })

      const result = await api.updateToManyAssociation(
        'ClientContact',
        300,
        'businessSectors',
        [10, 11, 12],
        'replace'
      )

      expect(global.fetch).toHaveBeenCalledTimes(3)
    })

    it('should handle batch operations across multiple entities', async () => {
      const entities = [
        { id: 100, certificationIds: [1, 2, 3] },
        { id: 101, certificationIds: [4, 5, 6] },
        { id: 102, certificationIds: [7, 8, 9] }
      ]

      for (const entity of entities) {
        ;(global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            changedEntityId: entity.id,
            changeType: 'INSERT'
          })
        })
      }

      const results: any[] = []
      for (const entity of entities) {
        const result = await api.updateToManyAssociation(
          'ClientCorporation',
          entity.id,
          'certifications',
          entity.certificationIds,
          'add'
        )
        results.push(result)
      }

      expect(results).toHaveLength(3)
      expect(results[0]?.changedEntityId).toBe(100)
      expect(results[1]?.changedEntityId).toBe(101)
      expect(results[2]?.changedEntityId).toBe(102)
    })
  })

  describe('Error handling and edge cases', () => {
    it('should handle empty ID array for add operation', async () => {
      const mockResponse = {
        changedEntityId: 100,
        changeType: 'INSERT'
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await api.updateToManyAssociation(
        'ClientCorporation',
        100,
        'certifications',
        [],
        'add'
      )

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('entity/ClientCorporation/100/certifications/'),
        expect.objectContaining({
          method: 'PUT'
        })
      )
    })

    it('should handle network errors', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      await expect(
        api.updateToManyAssociation(
          'ClientCorporation',
          100,
          'certifications',
          [1, 2, 3],
          'add'
        )
      ).rejects.toThrow('Network error')
    })

    it('should handle invalid JSON response', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON')
        }
      })

      await expect(
        api.updateToManyAssociation(
          'ClientCorporation',
          100,
          'certifications',
          [1, 2, 3],
          'add'
        )
      ).rejects.toThrow('Invalid JSON')
    })

    it('should handle very large ID arrays', async () => {
      const largeIdArray = Array.from({ length: 1000 }, (_, i) => i + 1)
      
      const mockResponse = {
        changedEntityId: 100,
        changeType: 'INSERT'
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await api.updateToManyAssociation(
        'ClientCorporation',
        100,
        'certifications',
        largeIdArray,
        'add'
      )

      expect(result).toEqual(mockResponse)
    })

    it('should handle special entity names and field names', async () => {
      const mockResponse = {
        changedEntityId: 100,
        changeType: 'INSERT'
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await api.updateToManyAssociation(
        'CustomObject1',
        100,
        'customField_123',
        [1, 2, 3],
        'add'
      )

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('entity/CustomObject1/100/customField_123/1,2,3'),
        expect.objectContaining({
          method: 'PUT'
        })
      )
    })
  })
})
