import { storage } from './storage-adapter'

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
  async saveCredentials(connectionId: string, credentials: SecureCredentials): Promise<void> {
    console.log('💾 SecureCredentialsAPI - Saving credentials:', {
      connectionId,
      hasClientId: !!credentials.clientId,
      hasClientSecret: !!credentials.clientSecret,
      hasUsername: !!credentials.username,
      hasPassword: !!credentials.password,
      username: credentials.username
    })

    await storage.set(`credentials-${connectionId}`, credentials)
    console.log('✅ SecureCredentialsAPI - Credentials saved successfully')
  }

  async getCredentials(connectionId: string): Promise<SecureCredentials | null> {
    try {
      console.log('🔍 SecureCredentialsAPI - Getting credentials for:', connectionId)

      // JS-safe: no generic type args
      const credentials = await storage.get(`credentials-${connectionId}`)

      console.log('📦 SecureCredentialsAPI - Retrieved credentials:', {
        found: !!credentials,
        hasClientId: !!credentials?.clientId,
        hasClientSecret: !!credentials?.clientSecret,
        hasUsername: !!credentials?.username,
        hasPassword: !!credentials?.password
      })

      return credentials || null
    } catch (error) {
      console.error('❌ SecureCredentialsAPI - Failed to get credentials:', error)
      return null
    }
  }

  async deleteCredentials(connectionId: string): Promise<void> {
    console.log('🗑️ SecureCredentialsAPI - Deleting credentials for:', connectionId)
    await storage.delete(`credentials-${connectionId}`)
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

    await storage.set('bullhorn-connections', connections)
    console.log('✅ SecureCredentialsAPI - Connection saved. Total connections:', connections.length)
  }

  async getConnections(): Promise<SavedConnection[]> {
    console.log('🔍 SecureCredentialsAPI - Getting all connections')
    const connections = await storage.get('bullhorn-connections')

    console.log('📦 SecureCredentialsAPI - Retrieved connections:', {
      count: connections?.length || 0,
      connections: connections?.map((c: any) => ({ id: c.id, name: c.name })) || []
    })

    return connections || []
  }

  async deleteConnection(connectionId: string): Promise<void> {
    console.log('🗑️ SecureCredentialsAPI - Deleting connection:', connectionId)
    const connections = await this.getConnections()
    const filtered = connections.filter(c => c.id !== connectionId)
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
      await storage.set('bullhorn-connections', connections)
      console.log('✅ SecureCredentialsAPI - Connection updated')
    } else {
      console.error('❌ SecureCredentialsAPI - Connection not found for update:', connectionId)
    }
  }
}

export const secureCredentialsAPI = new SecureCredentialsAPI()