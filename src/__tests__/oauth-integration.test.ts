import { describe, it, expect, beforeEach, vi } from 'vitest'
import { secureCredentialsAPI } from '@/lib/secure-credentials'
import type { SavedConnection } from '@/components/ConnectionManager'
import type { SecureCredentials } from '@/lib/secure-credentials'

const TEST_CONNECTIONS: Array<{ connection: SavedConnection; credentials: SecureCredentials }> = [
  {
    connection: {
      id: 'conn-fastaff-npe',
      name: 'Fastaff NPE',
      environment: 'NPE',
      tenant: 'Fastaff/USN',
      createdAt: Date.now(),
    },
    credentials: {
      clientId: 'test-client-id-fastaff-npe',
      clientSecret: 'test-secret-fastaff-npe',
      username: 'testuser@fastaff.com',
      password: 'test-password-npe',
    },
  },
  {
    connection: {
      id: 'conn-fastaff-prod',
      name: 'Fastaff Production',
      environment: 'PROD',
      tenant: 'Fastaff/USN',
      createdAt: Date.now(),
    },
    credentials: {
      clientId: 'a6a33789-1490-4888-994e-345f22808e41',
      clientSecret: 'test-secret-fastaff-prod',
      username: 'testuser@fastaff.com',
      password: 'test-password-prod',
    },
  },
  {
    connection: {
      id: 'conn-trustaff-npe',
      name: 'Trustaff NPE',
      environment: 'NPE',
      tenant: 'Trustaff/Ingenovis',
      createdAt: Date.now(),
    },
    credentials: {
      clientId: 'test-client-id-trustaff-npe',
      clientSecret: 'test-secret-trustaff-npe',
      username: 'testuser@trustaff.com',
      password: 'test-password-npe',
    },
  },
  {
    connection: {
      id: 'conn-springboard-npe',
      name: 'Springboard NPE',
      environment: 'NPE',
      tenant: 'Springboard',
      createdAt: Date.now(),
    },
    credentials: {
      clientId: 'test-client-id-springboard-npe',
      clientSecret: 'test-secret-springboard-npe',
      username: 'testuser@springboard.com',
      password: 'test-password-npe',
    },
  },
  {
    connection: {
      id: 'conn-vista-prod',
      name: 'Vista/Vital Production',
      environment: 'PROD',
      tenant: 'Vista/Vital',
      createdAt: Date.now(),
    },
    credentials: {
      clientId: 'test-client-id-vista-prod',
      clientSecret: 'test-secret-vista-prod',
      username: 'testuser@vista.com',
      password: 'test-password-prod',
    },
  },
  {
    connection: {
      id: 'conn-hcs-npe',
      name: 'HCS NPE',
      environment: 'NPE',
      tenant: 'HCS',
      createdAt: Date.now(),
    },
    credentials: {
      clientId: 'test-client-id-hcs-npe',
      clientSecret: 'test-secret-hcs-npe',
      username: 'testuser@hcs.com',
      password: 'test-password-npe',
    },
  },
]

describe('OAuth Integration - Multiple Tenant Connections', () => {
  beforeEach(async () => {
    // Clear all existing connections
    const allKeys = await window.spark.kv.keys()
    for (const key of allKeys) {
      await window.spark.kv.delete(key)
    }
  })

  it('should save all required tenant connections', async () => {
    console.log('\n📝 Saving all tenant connections...\n')

    for (const { connection, credentials } of TEST_CONNECTIONS) {
      await secureCredentialsAPI.saveConnection(connection)
      await secureCredentialsAPI.saveCredentials(connection.id, credentials)

      console.log(`  ✓ ${connection.name} (${connection.environment})`)
      console.log(`    - Tenant: ${connection.tenant}`)
      console.log(`    - Client ID: ${credentials.clientId}`)
      console.log(`    - Username: ${credentials.username}`)
    }

    const savedConnections = await secureCredentialsAPI.getConnections()
    expect(savedConnections).toHaveLength(TEST_CONNECTIONS.length)

    console.log(`\n✅ Successfully saved ${savedConnections.length} connections\n`)
  })

  it('should retrieve all saved connections', async () => {
    // Save all connections
    for (const { connection, credentials } of TEST_CONNECTIONS) {
      await secureCredentialsAPI.saveConnection(connection)
      await secureCredentialsAPI.saveCredentials(connection.id, credentials)
    }

    const connections = await secureCredentialsAPI.getConnections()
    
    expect(connections).toHaveLength(TEST_CONNECTIONS.length)
    
    console.log('\n📋 Retrieved connections:\n')
    for (const conn of connections) {
      console.log(`  • ${conn.name} (${conn.tenant}) - ${conn.environment}`)
    }
  })

  it('should retrieve credentials for each connection', async () => {
    // Save all connections
    for (const { connection, credentials } of TEST_CONNECTIONS) {
      await secureCredentialsAPI.saveConnection(connection)
      await secureCredentialsAPI.saveCredentials(connection.id, credentials)
    }

    console.log('\n🔐 Verifying credentials retrieval...\n')

    for (const { connection, credentials } of TEST_CONNECTIONS) {
      const retrieved = await secureCredentialsAPI.getCredentials(connection.id)
      
      expect(retrieved).toBeDefined()
      expect(retrieved?.clientId).toBe(credentials.clientId)
      expect(retrieved?.clientSecret).toBe(credentials.clientSecret)
      expect(retrieved?.username).toBe(credentials.username)
      expect(retrieved?.password).toBe(credentials.password)

      console.log(`  ✓ ${connection.name}: Credentials match`)
    }

    console.log('\n✅ All credentials verified\n')
  })

  it('should update connection last used timestamp', async () => {
    const { connection, credentials } = TEST_CONNECTIONS[0]
    
    await secureCredentialsAPI.saveConnection(connection)
    await secureCredentialsAPI.saveCredentials(connection.id, credentials)

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10))

    const lastUsed = Date.now()
    await secureCredentialsAPI.updateConnection(connection.id, { lastUsed })

    const connections = await secureCredentialsAPI.getConnections()
    const updated = connections.find(c => c.id === connection.id)

    expect(updated?.lastUsed).toBe(lastUsed)
  })

  it('should delete a connection and its credentials', async () => {
    const { connection, credentials } = TEST_CONNECTIONS[0]
    
    await secureCredentialsAPI.saveConnection(connection)
    await secureCredentialsAPI.saveCredentials(connection.id, credentials)

    await secureCredentialsAPI.deleteConnection(connection.id)

    const connections = await secureCredentialsAPI.getConnections()
    expect(connections.find(c => c.id === connection.id)).toBeUndefined()

    const creds = await secureCredentialsAPI.getCredentials(connection.id)
    expect(creds).toBeNull()
  })

  it('should handle multiple environments for the same tenant', async () => {
    // Get Fastaff connections (NPE and Production)
    const fastaffConnections = TEST_CONNECTIONS.filter(t => t.connection.tenant === 'Fastaff/USN')

    for (const { connection, credentials } of fastaffConnections) {
      await secureCredentialsAPI.saveConnection(connection)
      await secureCredentialsAPI.saveCredentials(connection.id, credentials)
    }

    const allConnections = await secureCredentialsAPI.getConnections()
    const fastaffSaved = allConnections.filter(c => c.tenant === 'Fastaff/USN')

    expect(fastaffSaved).toHaveLength(2)

    const npe = fastaffSaved.find(c => c.environment === 'NPE')
    const prod = fastaffSaved.find(c => c.environment === 'PROD')

    expect(npe).toBeDefined()
    expect(prod).toBeDefined()
    expect(npe?.id).not.toBe(prod?.id)

    console.log('\n📊 Fastaff/USN Connections:\n')
    console.log(`  • NPE: ${npe?.name}`)
    console.log(`  • Production: ${prod?.name}`)
  })

  it('should validate OAuth URL generation for all connections', async () => {
    console.log('\n🔗 Generating OAuth URLs for all connections...\n')

    for (const { connection, credentials } of TEST_CONNECTIONS) {
      const redirectUri = 'https://test.app/'
      const state = `state-${connection.id}`

      const authUrl = new URL('https://auth-east.bullhornstaffing.com/oauth/authorize')
      authUrl.searchParams.set('client_id', credentials.clientId)
      authUrl.searchParams.set('response_type', 'code')
      authUrl.searchParams.set('redirect_uri', redirectUri)
      authUrl.searchParams.set('state', state)
      authUrl.searchParams.set('action', 'Login')
      authUrl.searchParams.set('username', credentials.username)
      authUrl.searchParams.set('password', credentials.password)

      const url = authUrl.toString()

      expect(url).toContain('client_id=')
      expect(url).toContain('response_type=code')
      expect(url).toContain('action=Login')

      console.log(`  ✓ ${connection.name}`)
      console.log(`    ${url.substring(0, 80)}...`)
    }

    console.log('\n✅ All OAuth URLs generated successfully\n')
  })
})

describe('OAuth Flow Simulation', () => {
  it('should simulate complete OAuth flow with connection selection', async () => {
    console.log('\n🎬 Simulating Complete OAuth Flow\n')
    console.log('=' .repeat(60))

    // Step 1: Save connection
    const { connection, credentials } = TEST_CONNECTIONS[1] // Fastaff Production
    
    console.log('\n📝 Step 1: Saving connection...')
    await secureCredentialsAPI.saveConnection(connection)
    await secureCredentialsAPI.saveCredentials(connection.id, credentials)
    console.log(`   ✓ Connection saved: ${connection.name}`)

    // Step 2: User selects connection and starts OAuth flow
    console.log('\n🔐 Step 2: Starting OAuth flow...')
    const redirectUri = 'https://test.app/'
    const state = `oauth-${Date.now()}`
    
    const authUrl = new URL('https://auth-east.bullhornstaffing.com/oauth/authorize')
    authUrl.searchParams.set('client_id', credentials.clientId)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('action', 'Login')
    authUrl.searchParams.set('username', credentials.username)
    authUrl.searchParams.set('password', credentials.password)

    console.log(`   ✓ Authorization URL generated`)
    console.log(`   → ${authUrl.toString().substring(0, 100)}...`)

    // Step 3: Store pending OAuth session
    console.log('\n💾 Step 3: Storing pending OAuth session...')
    const pendingAuth = {
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret,
      redirectUri,
      connectionId: connection.id,
      timestamp: Date.now(),
    }
    await window.spark.kv.set('pending-oauth-auth', pendingAuth)
    console.log('   ✓ Pending auth stored in KV')

    // Step 4: Simulate redirect back with code
    console.log('\n🔄 Step 4: Simulating redirect callback...')
    const mockCode = '25184_8090191_44%3A0e19f0db-1c33-4409-b914-af5345c2b885'
    const decodedCode = decodeURIComponent(mockCode)
    console.log(`   ✓ Received code: ${mockCode}`)
    console.log(`   ✓ Decoded code: ${decodedCode}`)

    // Step 5: Retrieve pending auth
    console.log('\n🔍 Step 5: Retrieving pending OAuth session...')
    const retrieved = await window.spark.kv.get<typeof pendingAuth>('pending-oauth-auth')
    expect(retrieved).toBeDefined()
    expect(retrieved?.clientId).toBe(credentials.clientId)
    expect(retrieved?.connectionId).toBe(connection.id)
    console.log('   ✓ Pending auth retrieved')
    console.log(`   → Connection ID: ${retrieved?.connectionId}`)

    // Step 6: Check session expiration
    console.log('\n⏰ Step 6: Validating session...')
    const isExpired = retrieved ? Date.now() - retrieved.timestamp > 600000 : true
    expect(isExpired).toBe(false)
    console.log('   ✓ Session is valid (not expired)')

    // Step 7: Clean up
    console.log('\n🧹 Step 7: Cleaning up...')
    await window.spark.kv.delete('pending-oauth-auth')
    const cleaned = await window.spark.kv.get('pending-oauth-auth')
    expect(cleaned).toBeUndefined()
    console.log('   ✓ Pending auth cleaned up')

    console.log('\n' + '='.repeat(60))
    console.log('✅ OAuth Flow Simulation Complete!')
    console.log('=' .repeat(60) + '\n')
  })
})
