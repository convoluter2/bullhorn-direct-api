import { getStorageAdapter } from './storage-adapter'

export type SecureCredentials = {
  clientId: string
  clientSecret: string
  username: string
  password: string
}

export type SavedConnection = {
  id: string
  name: string
  environment: 'NPE' | 'PROD'
  tenant: string
  createdAt: number
  lastUsed?: number
}

class SecureCredentialsAPI {
  private cachedConnections: SavedConnection[] | null = null
  private inFlightConnectionsRequest: Promise<SavedConnection[]> | null = null
  private connectionsCacheTimestamp = 0
  private readonly CONNECTIONS_CACHE_DURATION = 60000

  private async kv() {
    return await getStorageAdapter()
  }

  private credKey(connectionId: string) {
    return `credentials-${connectionId}`
  }

  private invalidateConnectionsCache(): void {
    this.cachedConnections = null
    this.connectionsCacheTimestamp = 0
  }

  async saveCredentials(connectionId: string, credentials: SecureCredentials): Promise<void> {
    console.log('💾 SecureCredentialsAPI - Saving credentials:', {
      connectionId,
      hasClientId: !!credentials.clientId,
      hasClientSecret: !!credentials.clientSecret,
      hasUsername: !!credentials.username,
      hasPassword: !!credentials.password,
      username: credentials.username
    })

    const storage = await this.kv()
    await storage.set(this.credKey(connectionId), credentials)

    console.log('✅ SecureCredentialsAPI - Credentials saved successfully')
  }

  async getCredentials(connectionId: string): Promise<SecureCredentials | null> {
    try {
      console.log('🔍 SecureCredentialsAPI - Getting credentials for:', connectionId)

      const storage = await this.kv()
      const credentials = await storage.get(this.credKey(connectionId))

      console.log('📦 SecureCredentialsAPI - Retrieved credentials:', {
        found: !!credentials,
        hasClientId: !!credentials?.clientId,
        hasClientSecret: !!credentials?.clientSecret,
        hasUsername: !!credentials?.username,
        hasPassword: !!credentials?.password
      })

      return (credentials as SecureCredentials) || null
    } catch (error) {
      console.error('❌ SecureCredentialsAPI - Failed to get credentials:', error)
      return null
    }
  }

  async deleteCredentials(connectionId: string): Promise<void> {
    console.log('🗑️ SecureCredentialsAPI - Deleting credentials for:', connectionId)

    const storage = await this.kv()
    await storage.delete(this.credKey(connectionId))

    console.log('✅ SecureCredentialsAPI - Credentials deleted')
  }

  async saveConnection(connection: SavedConnection): Promise<void> {
    console.log('💾 SecureCredentialsAPI - Saving connection:', {
      id: connection.id,
      name: connection.name,
      tenant: connection.tenant,
      environment: connection.environment
    })

    const connections = await this.getConnections()
    const existingIndex = connections.findIndex(c => c.id === connection.id)

    if (existingIndex >= 0) {
      console.log('📝 SecureCredentialsAPI - Updating existing connection at index:', existingIndex)
      connections[existingIndex] = connection
    } else {
      console.log('➕ SecureCredentialsAPI - Adding new connection')
      connections.push(connection)
    }

    const storage = await this.kv()
    await storage.set('bullhorn-connections', connections)
    
    this.invalidateConnectionsCache()

    console.log('✅ SecureCredentialsAPI - Connection saved. Total connections:', connections.length)
  }

  async getConnections(): Promise<SavedConnection[]> {
    const now = Date.now()
    
    if (this.cachedConnections && (now - this.connectionsCacheTimestamp) < this.CONNECTIONS_CACHE_DURATION) {
      console.log('📦 Using cached connections (no KV call needed)')
      return this.cachedConnections
    }

    if (this.inFlightConnectionsRequest) {
      console.log('⏳ Waiting for in-flight connections request')
      return this.inFlightConnectionsRequest
    }

    console.log('🔍 SecureCredentialsAPI - Fetching connections from KV')

    this.inFlightConnectionsRequest = (async () => {
      try {
        const storage = await this.kv()
        const raw = await storage.get('bullhorn-connections')

        const connections: SavedConnection[] = Array.isArray(raw) ? (raw as SavedConnection[]) : []

        console.log('📦 SecureCredentialsAPI - Retrieved connections:', {
          count: connections.length,
          connections: connections.map(c => ({ id: c.id, name: c.name }))
        })

        this.cachedConnections = connections
        this.connectionsCacheTimestamp = Date.now()

        return connections
      } finally {
        this.inFlightConnectionsRequest = null
      }
    })()

    return this.inFlightConnectionsRequest
  }

  async deleteConnection(connectionId: string): Promise<void> {
    console.log('🗑️ SecureCredentialsAPI - Deleting connection:', connectionId)

    const connections = await this.getConnections()
    const filtered = connections.filter(c => c.id !== connectionId)

    const storage = await this.kv()
    await storage.set('bullhorn-connections', filtered)

    await this.deleteCredentials(connectionId)
    
    this.invalidateConnectionsCache()

    console.log('✅ SecureCredentialsAPI - Connection and credentials deleted')
  }

  async updateConnection(connectionId: string, updates: Partial<SavedConnection>): Promise<void> {
    console.log('📝 SecureCredentialsAPI - Updating connection:', { connectionId, updates })

    const connections = await this.getConnections()
    const index = connections.findIndex(c => c.id === connectionId)

    if (index >= 0) {
      connections[index] = { ...connections[index], ...updates }

      const storage = await this.kv()
      await storage.set('bullhorn-connections', connections)
      
      this.invalidateConnectionsCache()

      console.log('✅ SecureCredentialsAPI - Connection updated')
    } else {
      console.error('❌ SecureCredentialsAPI - Connection not found for update:', connectionId)
    }
  }
}

export const secureCredentialsAPI = new SecureCredentialsAPI()