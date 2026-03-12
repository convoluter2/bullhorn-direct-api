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
  // --- small helpers to centralize adapter access ---
  private async kv() {
    return await getStorageAdapter()
  }

  private credKey(connectionId: string) {
    return `credentials-${connectionId}`
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

    console.log('✅ SecureCredentialsAPI - Connection saved. Total connections:', connections.length)
  }

  async getConnections(): Promise<SavedConnection[]> {
    console.log('🔍 SecureCredentialsAPI - Getting all connections')

    const storage = await this.kv()
    const raw = await storage.get('bullhorn-connections')

    // Normalize to array (protects you from null/undefined/non-array)
    const connections: SavedConnection[] = Array.isArray(raw) ? (raw as SavedConnection[]) : []

    console.log('📦 SecureCredentialsAPI - Retrieved connections:', {
      count: connections.length,
      connections: connections.map(c => ({ id: c.id, name: c.name }))
    })

    return connections
  }

  async deleteConnection(connectionId: string): Promise<void> {
    console.log('🗑️ SecureCredentialsAPI - Deleting connection:', connectionId)

    const connections = await this.getConnections()
    const filtered = connections.filter(c => c.id !== connectionId)

    const storage = await this.kv()
    await storage.set('bullhorn-connections', filtered)

    await this.deleteCredentials(connectionId)

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

      console.log('✅ SecureCredentialsAPI - Connection updated')
    } else {
      console.error('❌ SecureCredentialsAPI - Connection not found for update:', connectionId)
    }
  }
}

export const secureCredentialsAPI = new SecureCredentialsAPI()