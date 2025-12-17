import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { BullhornAPI } from '@/lib/bullhorn-api'
import { secureCredentialsAPI } from '@/lib/secure-credentials'
import type { BullhornSession } from '@/lib/types'

global.fetch = vi.fn()

const MOCK_CREDENTIALS = {
  clientId: 'a6a33789-1490-4888-994e-345f22808e41',
  clientSecret: 'test-secret-key',
  username: 'test@fastaff.com',
  password: 'test-password-123'
}

const MOCK_AUTH_CODE = '25184_8090191_44:0e19f0db-1c33-4409-b914-af5345c2b885'
const MOCK_AUTH_CODE_ENCODED = '25184_8090191_44%3A0e19f0db-1c33-4409-b914-af5345c2b885'

const MOCK_ACCESS_TOKEN = 'mock-access-token-abc123'
const MOCK_REFRESH_TOKEN = 'mock-refresh-token-xyz789'
const MOCK_BH_REST_TOKEN = 'mock-bh-rest-token-def456'
const MOCK_REST_URL = 'https://rest-test.bullhornstaffing.com/rest-services/12345/'

describe('Automated OAuth Flow End-to-End', () => {
  let api: BullhornAPI

  beforeEach(() => {
    api = new BullhornAPI()
    vi.clearAllMocks()
    
    global.window = {
      location: {
        origin: 'https://test.app',
        pathname: '/',
        search: '',
        href: 'https://test.app/',
        host: 'test.app',
        hostname: 'test.app',
        protocol: 'https:',
        hash: '',
        port: '',
        assign: vi.fn(),
        reload: vi.fn(),
        replace: vi.fn(),
      },
      history: {
        replaceState: vi.fn(),
        pushState: vi.fn(),
        back: vi.fn(),
        forward: vi.fn(),
        go: vi.fn(),
        length: 0,
        scrollRestoration: 'auto',
        state: null,
      },
      spark: {
        kv: {
          get: vi.fn(),
          set: vi.fn(),
          delete: vi.fn(),
          keys: vi.fn(),
        },
        llm: vi.fn(),
        llmPrompt: vi.fn(),
        user: vi.fn(),
      },
    } as any
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Step 1: Store Credentials', () => {
    it('should securely store credentials for a connection', async () => {
      const connection = {
        id: 'conn-fastaff-npe',
        name: 'Fastaff NPE',
        environment: 'NPE' as const,
        tenant: 'Fastaff',
        createdAt: Date.now(),
        lastUsed: undefined,
      }

      await secureCredentialsAPI.saveConnection(connection)
      await secureCredentialsAPI.saveCredentials(connection.id, MOCK_CREDENTIALS)

      const savedCreds = await secureCredentialsAPI.getCredentials(connection.id)
      expect(savedCreds).toBeDefined()
      expect(savedCreds?.clientId).toBe(MOCK_CREDENTIALS.clientId)
      expect(savedCreds?.username).toBe(MOCK_CREDENTIALS.username)
    })
  })

  describe('Step 2: Generate Authorization URL', () => {
    it('should generate correct OAuth URL with credentials pre-filled', () => {
      const redirectUri = 'https://test.app/'
      const state = 'test-state-123'

      const authUrl = api.getAuthorizationUrl(
        MOCK_CREDENTIALS.clientId,
        redirectUri,
        state,
        MOCK_CREDENTIALS.username,
        MOCK_CREDENTIALS.password
      )

      expect(authUrl).toContain('https://auth-east.bullhornstaffing.com/oauth/authorize')
      expect(authUrl).toContain(`client_id=${MOCK_CREDENTIALS.clientId}`)
      expect(authUrl).toContain('response_type=code')
      expect(authUrl).toContain(`state=${state}`)
      expect(authUrl).toContain(`redirect_uri=${encodeURIComponent(redirectUri)}`)
      expect(authUrl).toContain('action=Login')
      expect(authUrl).toContain(`username=${encodeURIComponent(MOCK_CREDENTIALS.username)}`)
      expect(authUrl).toContain(`password=${encodeURIComponent(MOCK_CREDENTIALS.password)}`)
    })
  })

  describe('Step 3: Handle OAuth Redirect Callback', () => {
    it('should detect authorization code in URL params', () => {
      const urlWithCode = new URL(`https://test.app/?code=${MOCK_AUTH_CODE_ENCODED}&state=test-123`)
      const params = new URLSearchParams(urlWithCode.search)
      
      const code = params.get('code')
      expect(code).toBeTruthy()
      expect(code).toBe(MOCK_AUTH_CODE_ENCODED)
    })

    it('should decode URL-encoded authorization code', () => {
      const encoded = MOCK_AUTH_CODE_ENCODED
      const decoded = decodeURIComponent(encoded)
      
      expect(decoded).toBe(MOCK_AUTH_CODE)
      expect(decoded).toContain(':')
      expect(decoded).not.toContain('%3A')
    })

    it('should retrieve pending OAuth session from KV storage', async () => {
      const pendingAuth = {
        clientId: MOCK_CREDENTIALS.clientId,
        clientSecret: MOCK_CREDENTIALS.clientSecret,
        redirectUri: 'https://test.app/',
        connectionId: 'conn-fastaff-npe',
        timestamp: Date.now(),
      }

      ;(window.spark.kv.get as any).mockResolvedValue(pendingAuth)

      const stored = await window.spark.kv.get<typeof pendingAuth>('pending-oauth-auth')
      
      expect(stored).toBeDefined()
      expect(stored?.clientId).toBe(MOCK_CREDENTIALS.clientId)
      expect(stored?.connectionId).toBe('conn-fastaff-npe')
    })

    it('should reject expired OAuth sessions', async () => {
      const expiredAuth = {
        clientId: MOCK_CREDENTIALS.clientId,
        clientSecret: MOCK_CREDENTIALS.clientSecret,
        redirectUri: 'https://test.app/',
        connectionId: 'conn-fastaff-npe',
        timestamp: Date.now() - 700000, // 11+ minutes ago
      }

      ;(window.spark.kv.get as any).mockResolvedValue(expiredAuth)

      const stored = await window.spark.kv.get<typeof expiredAuth>('pending-oauth-auth')
      const isExpired = stored ? Date.now() - stored.timestamp > 600000 : true // 10 minutes

      expect(isExpired).toBe(true)
    })
  })

  describe('Step 4: Exchange Code for Token', () => {
    it('should exchange authorization code for access and refresh tokens', async () => {
      const mockTokenResponse = {
        access_token: MOCK_ACCESS_TOKEN,
        refresh_token: MOCK_REFRESH_TOKEN,
        expires_in: 600,
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      })

      const result = await api.exchangeCodeForToken(
        MOCK_AUTH_CODE,
        MOCK_CREDENTIALS.clientId,
        MOCK_CREDENTIALS.clientSecret,
        'https://test.app/'
      )

      expect(result).toBeDefined()
      expect(result.accessToken).toBe(MOCK_ACCESS_TOKEN)
      expect(result.refreshToken).toBe(MOCK_REFRESH_TOKEN)
      expect(result.expiresIn).toBe(600)

      // Verify the API call was made correctly
      const fetchCall = (global.fetch as any).mock.calls[0]
      expect(fetchCall[0]).toContain('https://auth-east.bullhornstaffing.com/oauth/token')
      expect(fetchCall[1].method).toBe('POST')
      expect(fetchCall[1].body).toContain(`code=${encodeURIComponent(MOCK_AUTH_CODE)}`)
      expect(fetchCall[1].body).toContain(`client_id=${MOCK_CREDENTIALS.clientId}`)
      expect(fetchCall[1].body).toContain(`redirect_uri=${encodeURIComponent('https://test.app/')}`)
    })

    it('should handle URL-encoded code correctly', async () => {
      const mockTokenResponse = {
        access_token: MOCK_ACCESS_TOKEN,
        refresh_token: MOCK_REFRESH_TOKEN,
        expires_in: 600,
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      })

      // Pass encoded code - should be decoded internally
      const result = await api.exchangeCodeForToken(
        MOCK_AUTH_CODE_ENCODED,
        MOCK_CREDENTIALS.clientId,
        MOCK_CREDENTIALS.clientSecret,
        'https://test.app/'
      )

      expect(result).toBeDefined()

      // Verify decoded code was used in the API call
      const fetchCall = (global.fetch as any).mock.calls[0]
      const bodyParams = new URLSearchParams(fetchCall[1].body)
      const sentCode = bodyParams.get('code')
      
      expect(sentCode).toBe(MOCK_AUTH_CODE)
      expect(sentCode).toContain(':')
      expect(sentCode).not.toContain('%3A')
    })

    it('should handle token exchange errors gracefully', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        text: async () => '{ "error": "invalid_grant", "error_description": "Invalid, expired, or revoked authorization code." }',
      })

      await expect(
        api.exchangeCodeForToken(
          'invalid-code',
          MOCK_CREDENTIALS.clientId,
          MOCK_CREDENTIALS.clientSecret,
          'https://test.app/'
        )
      ).rejects.toThrow('Failed to exchange code for token')
    })
  })

  describe('Step 5: Login with Access Token', () => {
    it('should login to Bullhorn REST API with access token', async () => {
      const mockLoginResponse = {
        BhRestToken: MOCK_BH_REST_TOKEN,
        restUrl: MOCK_REST_URL,
        corporationId: 25184,
        userId: 123456,
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockLoginResponse,
      })

      const session = await api.login(MOCK_ACCESS_TOKEN)

      expect(session).toBeDefined()
      expect(session.BhRestToken).toBe(MOCK_BH_REST_TOKEN)
      expect(session.restUrl).toBe(MOCK_REST_URL)
      expect(session.corporationId).toBe(25184)
      expect(session.accessToken).toBe(MOCK_ACCESS_TOKEN)

      // Verify the API call
      const fetchCall = (global.fetch as any).mock.calls[0]
      expect(fetchCall[0]).toContain('https://rest.bullhornstaffing.com/rest-services/login')
      expect(fetchCall[0]).toContain(`access_token=${MOCK_ACCESS_TOKEN}`)
    })
  })

  describe('Step 6: Store Session with Refresh Token', () => {
    it('should store session with refresh token and expiration', async () => {
      const mockTokenResponse = {
        access_token: MOCK_ACCESS_TOKEN,
        refresh_token: MOCK_REFRESH_TOKEN,
        expires_in: 600,
      }

      const mockLoginResponse = {
        BhRestToken: MOCK_BH_REST_TOKEN,
        restUrl: MOCK_REST_URL,
        corporationId: 25184,
        userId: 123456,
      }

      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockLoginResponse,
        })

      const tokenData = await api.exchangeCodeForToken(
        MOCK_AUTH_CODE,
        MOCK_CREDENTIALS.clientId,
        MOCK_CREDENTIALS.clientSecret,
        'https://test.app/'
      )

      const session = await api.login(tokenData.accessToken)
      
      // Augment session with refresh token and expiration
      const fullSession: BullhornSession = {
        ...session,
        refreshToken: tokenData.refreshToken,
        expiresAt: Date.now() + (tokenData.expiresIn * 1000),
      }

      expect(fullSession.refreshToken).toBe(MOCK_REFRESH_TOKEN)
      expect(fullSession.expiresAt).toBeDefined()
      expect(fullSession.expiresAt! > Date.now()).toBe(true)
    })
  })

  describe('Step 7: Clean Up OAuth Flow', () => {
    it('should delete pending OAuth data after successful authentication', async () => {
      ;(window.spark.kv.delete as any).mockResolvedValue(undefined)

      await window.spark.kv.delete('pending-oauth-auth')

      expect(window.spark.kv.delete).toHaveBeenCalledWith('pending-oauth-auth')
    })

    it('should clean URL parameters after processing', () => {
      const replaceState = vi.fn()
      window.history.replaceState = replaceState

      window.history.replaceState({}, document.title, window.location.pathname)

      expect(replaceState).toHaveBeenCalledWith({}, expect.any(String), '/')
    })
  })

  describe('Complete End-to-End Flow', () => {
    it('should complete full automated OAuth flow from start to finish', async () => {
      // Step 1: Store credentials
      const connection = {
        id: 'conn-test',
        name: 'Test Connection',
        environment: 'NPE' as const,
        tenant: 'Test',
        createdAt: Date.now(),
        lastUsed: undefined,
      }

      await secureCredentialsAPI.saveConnection(connection)
      await secureCredentialsAPI.saveCredentials(connection.id, MOCK_CREDENTIALS)

      // Step 2: Generate auth URL
      const authUrl = api.getAuthorizationUrl(
        MOCK_CREDENTIALS.clientId,
        'https://test.app/',
        'state-123',
        MOCK_CREDENTIALS.username,
        MOCK_CREDENTIALS.password
      )

      expect(authUrl).toBeTruthy()

      // Step 3: Simulate redirect with code
      const urlWithCode = `https://test.app/?code=${MOCK_AUTH_CODE_ENCODED}&state=state-123`
      const params = new URLSearchParams(new URL(urlWithCode).search)
      const code = params.get('code')
      const decodedCode = decodeURIComponent(code!)

      expect(decodedCode).toBe(MOCK_AUTH_CODE)

      // Step 4: Exchange code for token
      const mockTokenResponse = {
        access_token: MOCK_ACCESS_TOKEN,
        refresh_token: MOCK_REFRESH_TOKEN,
        expires_in: 600,
      }

      const mockLoginResponse = {
        BhRestToken: MOCK_BH_REST_TOKEN,
        restUrl: MOCK_REST_URL,
        corporationId: 25184,
        userId: 123456,
      }

      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockLoginResponse,
        })

      const tokenData = await api.exchangeCodeForToken(
        decodedCode,
        MOCK_CREDENTIALS.clientId,
        MOCK_CREDENTIALS.clientSecret,
        'https://test.app/'
      )

      // Step 5: Login with access token
      const session = await api.login(tokenData.accessToken)
      session.refreshToken = tokenData.refreshToken
      session.expiresAt = Date.now() + (tokenData.expiresIn * 1000)

      // Step 6: Verify session is valid
      expect(session.BhRestToken).toBe(MOCK_BH_REST_TOKEN)
      expect(session.refreshToken).toBe(MOCK_REFRESH_TOKEN)
      expect(session.expiresAt).toBeDefined()
      expect(session.accessToken).toBe(MOCK_ACCESS_TOKEN)

      // Step 7: Session is ready for API calls
      api.setSession(session)
      const retrievedSession = api.getSession()

      expect(retrievedSession).toBeDefined()
      expect(retrievedSession?.BhRestToken).toBe(MOCK_BH_REST_TOKEN)

      console.log('✅ Complete end-to-end OAuth flow test passed')
    })
  })

  describe('Error Scenarios', () => {
    it('should handle missing authorization code in URL', () => {
      const urlWithoutCode = 'https://test.app/?state=test-123'
      const params = new URLSearchParams(new URL(urlWithoutCode).search)
      const code = params.get('code')

      expect(code).toBeNull()
    })

    it('should handle OAuth error in URL', () => {
      const urlWithError = 'https://test.app/?error=access_denied&error_description=User%20denied%20access'
      const params = new URLSearchParams(new URL(urlWithError).search)
      
      const error = params.get('error')
      const errorDescription = params.get('error_description')

      expect(error).toBe('access_denied')
      expect(errorDescription).toBe('User denied access')
    })

    it('should handle invalid or expired authorization code', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        text: async () => '{ "error": "invalid_grant", "error_description": "Invalid, expired, or revoked authorization code." }',
      })

      await expect(
        api.exchangeCodeForToken(
          'expired-code',
          MOCK_CREDENTIALS.clientId,
          MOCK_CREDENTIALS.clientSecret,
          'https://test.app/'
        )
      ).rejects.toThrow()
    })
  })

  describe('Token Refresh', () => {
    it('should refresh access token before expiration', async () => {
      const mockRefreshResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 600,
      }

      const mockLoginResponse = {
        BhRestToken: 'new-bh-rest-token',
        restUrl: MOCK_REST_URL,
        corporationId: 25184,
        userId: 123456,
      }

      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRefreshResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockLoginResponse,
        })

      const newTokenData = await api.refreshAccessToken(
        MOCK_REFRESH_TOKEN,
        MOCK_CREDENTIALS.clientId,
        MOCK_CREDENTIALS.clientSecret
      )

      expect(newTokenData.accessToken).toBe('new-access-token')
      expect(newTokenData.refreshToken).toBe('new-refresh-token')

      const newSession = await api.login(newTokenData.accessToken)
      newSession.refreshToken = newTokenData.refreshToken
      newSession.expiresAt = Date.now() + (newTokenData.expiresIn * 1000)

      expect(newSession.BhRestToken).toBe('new-bh-rest-token')
    })
  })
})
