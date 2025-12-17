import { describe, it, expect, beforeAll, afterAll } from 'vitest'

const PROXY_URL = process.env.VITE_PROXY_URL || 'http://localhost:3001'

describe('Proxy Server Restart', () => {
  let proxyAvailable = false

  beforeAll(async () => {
    try {
      const response = await fetch(`${PROXY_URL}/health`)
      proxyAvailable = response.ok
    } catch (e) {
      proxyAvailable = false
      console.warn('⚠️  Proxy not available for testing. Start with: npm run dev:proxy')
    }
  })

  it('should have proxy running for tests', () => {
    expect(proxyAvailable).toBe(true)
  })

  it('should respond to health check', async () => {
    if (!proxyAvailable) return

    const response = await fetch(`${PROXY_URL}/health`)
    expect(response.ok).toBe(true)

    const data = await response.json()
    expect(data.status).toBe('healthy')
    expect(data.service).toBe('oauth-proxy')
  })

  it('should accept restart requests', async () => {
    if (!proxyAvailable) return

    const response = await fetch(`${PROXY_URL}/restart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })

    expect(response.ok).toBe(true)

    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.message).toContain('restarting')
  })

  it('should come back online after restart', async () => {
    if (!proxyAvailable) return

    await new Promise(resolve => setTimeout(resolve, 3000))

    const response = await fetch(`${PROXY_URL}/health`)
    expect(response.ok).toBe(true)
  })

  it('should clear pending auths on restart', async () => {
    if (!proxyAvailable) return

    const response = await fetch(`${PROXY_URL}/health`)
    const data = await response.json()

    expect(data.pendingAuths).toBe(0)
  })

  it('should respond to start endpoint', async () => {
    if (!proxyAvailable) return

    const response = await fetch(`${PROXY_URL}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })

    expect(response.ok).toBe(true)

    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.status).toBe('running')
  })

  it('should include uptime in health response', async () => {
    if (!proxyAvailable) return

    const response = await fetch(`${PROXY_URL}/health`)
    const data = await response.json()

    expect(data.uptime).toBeDefined()
    expect(typeof data.uptime).toBe('string')
  })

  it('should include port in health response', async () => {
    if (!proxyAvailable) return

    const response = await fetch(`${PROXY_URL}/health`)
    const data = await response.json()

    expect(data.port).toBeDefined()
    expect(typeof data.port).toBe('number')
  })

  it('should include timestamp in health response', async () => {
    if (!proxyAvailable) return

    const response = await fetch(`${PROXY_URL}/health`)
    const data = await response.json()

    expect(data.timestamp).toBeDefined()
    expect(new Date(data.timestamp).toString()).not.toBe('Invalid Date')
  })
})
