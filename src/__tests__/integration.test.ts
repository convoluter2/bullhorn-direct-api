import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BullhornAPI } from '@/lib/bullhorn-api'
import type { BullhornSession } from '@/lib/types'

describe('Integration Tests', () => {
  let api: BullhornAPI
  const mockSession: BullhornSession = {
    BhRestToken: 'test-token',
    restUrl: 'https://rest.bullhornstaffing.com/rest-services/test/',
    corporationId: 123,
    userId: 456
  }

  beforeEach(() => {
    api = new BullhornAPI()
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  describe('Authentication Flow', () => {
    it('should handle full OAuth flow', async () => {
      const mockTokenResponse = {
        access_token: 'access-token-123',
        refresh_token: 'refresh-token-456',
        expires_in: 600
      }

      const mockLoginResponse = {
        BhRestToken: 'bh-rest-token',
        restUrl: 'https://rest.example.com/',
        corporationId: 123,
        userId: 456
      }

      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockLoginResponse
        })

      const tokenData = await api.exchangeCodeForToken('auth-code', 'client-id', 'client-secret')
      const session = await api.login(tokenData.accessToken)

      expect(session.BhRestToken).toBe('bh-rest-token')
      expect(session.restUrl).toBe('https://rest.example.com/')
    })

    it('should handle token refresh', async () => {
      const mockRefreshResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 600
      }

      const mockLoginResponse = {
        BhRestToken: 'new-bh-rest-token',
        restUrl: 'https://rest.example.com/',
        corporationId: 123,
        userId: 456
      }

      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRefreshResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockLoginResponse
        })

      const tokenData = await api.refreshAccessToken('old-refresh-token', 'client-id', 'client-secret')
      const session = await api.login(tokenData.accessToken)

      expect(session.BhRestToken).toBe('new-bh-rest-token')
    })
  })

  describe('Data Operations', () => {
    beforeEach(() => {
      api.setSession(mockSession)
    })

    it('should complete full search workflow', async () => {
      const mockSearchResponse = {
        data: [
          { id: 1, firstName: 'John', lastName: 'Doe', status: 'Active' },
          { id: 2, firstName: 'Jane', lastName: 'Smith', status: 'Active' }
        ],
        total: 2,
        count: 2,
        start: 0
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSearchResponse
      })

      const result = await api.search({
        entity: 'Candidate',
        fields: ['id', 'firstName', 'lastName', 'status'],
        filters: [{ field: 'status', operator: 'equals', value: 'Active' }]
      })

      expect(result.data).toHaveLength(2)
      expect(result.total).toBe(2)
    })

    it('should handle paginated results', async () => {
      const mockPage1Response = {
        data: Array(500).fill(null).map((_, i) => ({ id: i + 1, name: `Record ${i + 1}` })),
        total: 1000,
        count: 500,
        start: 0
      }

      const mockPage2Response = {
        data: Array(500).fill(null).map((_, i) => ({ id: i + 501, name: `Record ${i + 501}` })),
        total: 1000,
        count: 500,
        start: 500
      }

      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPage1Response
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPage2Response
        })

      const page1 = await api.search({
        entity: 'Candidate',
        fields: ['id', 'name'],
        filters: [],
        count: 500,
        start: 0
      })

      const page2 = await api.search({
        entity: 'Candidate',
        fields: ['id', 'name'],
        filters: [],
        count: 500,
        start: 500
      })

      expect(page1.data).toHaveLength(500)
      expect(page2.data).toHaveLength(500)
      expect(page1.start).toBe(0)
      expect(page2.start).toBe(500)
    })

    it('should handle bulk update operations', async () => {
      const mockUpdateResponse = {
        changedEntityId: 1,
        changeType: 'UPDATE'
      }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockUpdateResponse
      })

      const updates = [
        { id: 1, data: { status: 'Updated' } },
        { id: 2, data: { status: 'Updated' } },
        { id: 3, data: { status: 'Updated' } }
      ]

      const result = await api.updateMultipleEntities('Candidate', updates)

      expect(result.successCount).toBe(3)
      expect(result.errorCount).toBe(0)
    })

    it('should handle to-many association updates', async () => {
      const mockGetResponse = {
        data: [{ id: 1 }, { id: 2 }],
        total: 2
      }

      const mockDisassociateResponse = {
        changedEntityId: 123,
        changeType: 'DISASSOCIATE'
      }

      const mockAssociateResponse = {
        changedEntityId: 123,
        changeType: 'ASSOCIATE'
      }

      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockGetResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockDisassociateResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockAssociateResponse
        })

      const result = await api.updateToManyAssociation(
        'ClientCorporation',
        123,
        'certifications',
        [3, 4, 5],
        'replace'
      )

      expect(result.changedEntityId).toBe(123)
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      api.setSession(mockSession)
    })

    it('should handle network errors', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      await expect(api.search({
        entity: 'Candidate',
        fields: ['id'],
        filters: []
      })).rejects.toThrow()
    })

    it('should handle API errors', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        text: async () => 'Invalid entity'
      })

      await expect(api.search({
        entity: 'InvalidEntity',
        fields: ['id'],
        filters: []
      })).rejects.toThrow('Search failed')
    })

    it('should handle authentication errors', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        text: async () => 'Invalid credentials'
      })

      await expect(api.exchangeCodeForToken('bad-code', 'client-id', 'client-secret'))
        .rejects.toThrow('Failed to exchange code for token')
    })

    it('should handle missing session errors', async () => {
      const unauthenticatedApi = new BullhornAPI()

      await expect(unauthenticatedApi.search({
        entity: 'Candidate',
        fields: ['id'],
        filters: []
      })).rejects.toThrow('Not authenticated')

      await expect(unauthenticatedApi.updateEntity('Candidate', 1, {}))
        .rejects.toThrow('Not authenticated')

      await expect(unauthenticatedApi.getMetadata('Candidate'))
        .rejects.toThrow('Not authenticated')
    })
  })

  describe('Metadata Operations', () => {
    beforeEach(() => {
      api.setSession(mockSession)
    })

    it('should fetch and parse entity metadata', async () => {
      const mockMetadataResponse = {
        entity: 'Candidate',
        label: 'Candidate',
        fields: [
          {
            name: 'id',
            label: 'ID',
            type: 'ID',
            dataType: 'Integer',
            optional: false
          },
          {
            name: 'firstName',
            label: 'First Name',
            type: 'SCALAR',
            dataType: 'String',
            optional: true
          },
          {
            name: 'status',
            label: 'Status',
            type: 'SCALAR',
            dataType: 'String',
            optional: false,
            optionsType: 'CandidateStatus',
            options: [
              { value: 'Active', label: 'Active' },
              { value: 'Inactive', label: 'Inactive' }
            ]
          }
        ]
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetadataResponse
      })

      const metadata = await api.getMetadata('Candidate')

      expect(metadata.fields).toHaveLength(3)
      expect(metadata.fields.some(f => f.name === 'status')).toBe(true)
    })

    it('should fetch field options', async () => {
      const mockOptionsResponse = {
        data: [
          { value: 'Active', label: 'Active' },
          { value: 'Inactive', label: 'Inactive' },
          { value: 'New Lead', label: 'New Lead' }
        ]
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockOptionsResponse
      })

      const options = await api.getFieldOptions('Candidate', 'status')

      expect(options).toHaveLength(3)
      expect(options[0].value).toBe('Active')
    })

    it('should handle entities list', async () => {
      const mockSettingsResponse = {
        settings: {
          allEntities: [
            'Candidate',
            'ClientContact',
            'ClientCorporation',
            'JobOrder'
          ]
        }
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSettingsResponse
      })

      const entities = await api.getAllEntities()

      expect(entities).toContain('Candidate')
      expect(entities).toContain('ClientContact')
      expect(entities.length).toBeGreaterThan(0)
    })
  })

  describe('Complex Query Scenarios', () => {
    beforeEach(() => {
      api.setSession(mockSession)
    })

    it('should handle complex filter groups', async () => {
      const mockResponse = {
        data: [],
        total: 0,
        count: 0,
        start: 0
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await api.search({
        entity: 'Candidate',
        fields: ['id', 'firstName', 'lastName'],
        filters: [],
        filterGroups: [
          {
            id: 'group1',
            logic: 'AND',
            filters: [
              { field: 'status', operator: 'equals', value: 'Active' },
              { field: 'firstName', operator: 'contains', value: 'John' }
            ]
          },
          {
            id: 'group2',
            logic: 'OR',
            filters: [
              { field: 'email', operator: 'is_not_null', value: '' },
              { field: 'phone', operator: 'is_not_null', value: '' }
            ]
          }
        ],
        groupLogic: 'AND'
      })

      expect(result).toBeDefined()
    })

    it('should handle null operators', async () => {
      const mockResponse = {
        data: [],
        total: 0,
        count: 0,
        start: 0
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await api.search({
        entity: 'Candidate',
        fields: ['id', 'email'],
        filters: [
          { field: 'email', operator: 'is_null', value: '' }
        ]
      })

      expect(result).toBeDefined()
    })
  })
})
