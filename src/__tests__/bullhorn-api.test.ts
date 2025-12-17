import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BullhornAPI } from '@/lib/bullhorn-api'
import type { BullhornSession, QueryConfig } from '@/lib/types'

global.fetch = vi.fn()

describe('BullhornAPI', () => {
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
  })

  describe('getAuthorizationUrl', () => {
    it('should generate correct authorization URL without username/password', () => {
      const url = api.getAuthorizationUrl('client-id', 'state-123')
      expect(url).toContain('client_id=client-id')
      expect(url).toContain('response_type=code')
      expect(url).toContain('state=state-123')
      expect(url).not.toContain('redirect_uri')
      expect(url).not.toContain('username')
      expect(url).not.toContain('password')
    })

    it('should include username and password when provided', () => {
      const url = api.getAuthorizationUrl('client-id', 'state-123', 'user@test.com', 'pass123')
      expect(url).toContain('action=Login')
      expect(url).toContain('username=user%40test.com')
      expect(url).toContain('password=pass123')
      expect(url).not.toContain('redirect_uri')
    })
  })

  describe('exchangeCodeForToken', () => {
    it('should exchange authorization code for tokens', async () => {
      const mockResponse = {
        access_token: 'access-token-123',
        refresh_token: 'refresh-token-456',
        expires_in: 600
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await api.exchangeCodeForToken('auth-code', 'client-id', 'client-secret')

      expect(result).toEqual({
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
        expiresIn: 600
      })
    })

    it('should throw error on failed token exchange', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        text: async () => 'Invalid code'
      })

      await expect(api.exchangeCodeForToken('bad-code', 'client-id', 'client-secret'))
        .rejects.toThrow('Failed to exchange code for token')
    })
  })

  describe('refreshAccessToken', () => {
    it('should refresh access token successfully', async () => {
      const mockResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 600
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await api.refreshAccessToken('refresh-token', 'client-id', 'client-secret')

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 600
      })
    })
  })

  describe('login', () => {
    it('should login with access token and return session', async () => {
      const mockResponse = {
        BhRestToken: 'bh-rest-token',
        restUrl: 'https://rest.example.com/',
        corporationId: 123,
        userId: 456
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const session = await api.login('access-token')

      expect(session.BhRestToken).toBe('bh-rest-token')
      expect(session.restUrl).toBe('https://rest.example.com/')
      expect(session.corporationId).toBe(123)
      expect(session.userId).toBe(456)
    })
  })

  describe('search', () => {
    beforeEach(() => {
      api.setSession(mockSession)
    })

    it('should perform basic search', async () => {
      const mockResponse = {
        data: [{ id: 1, name: 'Test' }],
        total: 1,
        count: 1,
        start: 0
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const config: QueryConfig = {
        entity: 'Candidate',
        fields: ['id', 'name'],
        filters: [],
        count: 500,
        start: 0
      }

      const result = await api.search(config)

      expect(result.data).toHaveLength(1)
      expect(result.total).toBe(1)
    })

    it('should build query with filters', async () => {
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

      const config: QueryConfig = {
        entity: 'Candidate',
        fields: ['id', 'name'],
        filters: [
          { field: 'status', operator: 'equals', value: 'Active' }
        ]
      }

      await api.search(config)

      const callUrl = (global.fetch as any).mock.calls[0][0]
      expect(callUrl).toContain('query=status%3AActive')
    })

    it('should throw error when not authenticated', async () => {
      const unauthenticatedApi = new BullhornAPI()

      const config: QueryConfig = {
        entity: 'Candidate',
        fields: ['id'],
        filters: []
      }

      await expect(unauthenticatedApi.search(config))
        .rejects.toThrow('Not authenticated')
    })
  })

  describe('updateEntity', () => {
    beforeEach(() => {
      api.setSession(mockSession)
    })

    it('should update entity successfully', async () => {
      const mockResponse = {
        changedEntityId: 123,
        changeType: 'UPDATE'
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await api.updateEntity('Candidate', 123, { firstName: 'John' })

      expect(result.changedEntityId).toBe(123)
    })
  })

  describe('getMetadata', () => {
    beforeEach(() => {
      api.setSession(mockSession)
    })

    it('should fetch entity metadata', async () => {
      const mockResponse = {
        entity: 'Candidate',
        label: 'Candidate',
        fields: [
          { name: 'id', label: 'ID', type: 'ID', dataType: 'Integer' },
          { name: 'firstName', label: 'First Name', type: 'SCALAR', dataType: 'String' }
        ]
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const metadata = await api.getMetadata('Candidate')

      expect(metadata.entity).toBe('Candidate')
      expect(metadata.fields).toHaveLength(2)
    })

    it('should try alternative approach when no fields returned', async () => {
      const mockEmptyResponse = {
        entity: 'Candidate',
        label: 'Candidate',
        fields: []
      }

      const mockFullResponse = {
        entity: 'Candidate',
        label: 'Candidate',
        fields: [
          { name: 'id', label: 'ID', type: 'ID', dataType: 'Integer' }
        ]
      }

      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEmptyResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockFullResponse
        })

      const metadata = await api.getMetadata('Candidate')

      expect(metadata.fields).toHaveLength(1)
    })
  })

  describe('associateToMany', () => {
    beforeEach(() => {
      api.setSession(mockSession)
    })

    it('should associate to-many relationships', async () => {
      const mockResponse = {
        changedEntityId: 123,
        changeType: 'ASSOCIATE'
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await api.associateToMany('ClientCorporation', 123, 'certifications', [1, 2, 3])

      expect(result.changedEntityId).toBe(123)
    })
  })

  describe('disassociateToMany', () => {
    beforeEach(() => {
      api.setSession(mockSession)
    })

    it('should disassociate to-many relationships', async () => {
      const mockResponse = {
        changedEntityId: 123,
        changeType: 'DISASSOCIATE'
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await api.disassociateToMany('ClientCorporation', 123, 'certifications', [1, 2])

      expect(result.changedEntityId).toBe(123)
    })
  })

  describe('updateToManyAssociation', () => {
    beforeEach(() => {
      api.setSession(mockSession)
    })

    it('should add associations', async () => {
      const mockResponse = {
        changedEntityId: 123,
        changeType: 'ASSOCIATE'
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await api.updateToManyAssociation('ClientCorporation', 123, 'certifications', [4, 5], 'add')

      expect(result.changedEntityId).toBe(123)
    })

    it('should remove associations', async () => {
      const mockResponse = {
        changedEntityId: 123,
        changeType: 'DISASSOCIATE'
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await api.updateToManyAssociation('ClientCorporation', 123, 'certifications', [1], 'remove')

      expect(result.changedEntityId).toBe(123)
    })

    it('should replace associations', async () => {
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

      const result = await api.updateToManyAssociation('ClientCorporation', 123, 'certifications', [3, 4], 'replace')

      expect(result.changedEntityId).toBe(123)
    })
  })

  describe('getAllEntities', () => {
    beforeEach(() => {
      api.setSession(mockSession)
    })

    it('should fetch all entities from settings endpoint', async () => {
      const mockResponse = {
        settings: {
          allEntities: ['Candidate', 'ClientContact', 'JobOrder']
        }
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const entities = await api.getAllEntities()

      expect(entities).toContain('Candidate')
      expect(entities).toContain('ClientContact')
      expect(entities).toContain('JobOrder')
    })

    it('should return fallback entities when settings endpoint fails', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        text: async () => 'Settings not found'
      })

      const entities = await api.getAllEntities()

      expect(entities).toContain('Candidate')
      expect(entities.length).toBeGreaterThan(0)
    })
  })

  describe('query building', () => {
    beforeEach(() => {
      api.setSession(mockSession)
    })

    it('should build query with filter groups', async () => {
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

      const config: QueryConfig = {
        entity: 'Candidate',
        fields: ['id', 'name'],
        filters: [],
        filterGroups: [
          {
            id: 'group1',
            logic: 'AND',
            filters: [
              { field: 'status', operator: 'equals', value: 'Active' },
              { field: 'firstName', operator: 'contains', value: 'John' }
            ]
          }
        ],
        groupLogic: 'AND'
      }

      await api.search(config)

      const callUrl = (global.fetch as any).mock.calls[0][0]
      expect(callUrl).toContain('query=')
    })

    it('should handle is_null operator', async () => {
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

      const config: QueryConfig = {
        entity: 'Candidate',
        fields: ['id'],
        filters: [
          { field: 'email', operator: 'is_null', value: '' }
        ]
      }

      await api.search(config)

      const callUrl = (global.fetch as any).mock.calls[0][0]
      expect(callUrl).toContain('IS+NULL')
    })
  })
})
