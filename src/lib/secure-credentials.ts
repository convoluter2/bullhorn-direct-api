export interface SecureCredentials {
  clientId: string
  clientSecret: string
  username: string
  password: string
}

export interface SavedConnection {
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
    await window.spark.kv.set(`credentials-${connectionId}`, credentials)
    console.log('✅ SecureCredentialsAPI - Credentials saved successfully')
  }

  async getCredentials(connectionId: string): Promise<SecureCredentials | null> {
    try {
      console.log('🔍 SecureCredentialsAPI - Getting credentials for:', connectionId)
      const credentials = await window.spark.kv.get<SecureCredentials>(`credentials-${connectionId}`)
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
    await window.spark.kv.delete(`credentials-${connectionId}`)
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
    
    await window.spark.kv.set('bullhorn-connections', connections)
    console.log('✅ SecureCredentialsAPI - Connection saved. Total connections:', connections.length)
  }

  async getConnections(): Promise<SavedConnection[]> {
    console.log('🔍 SecureCredentialsAPI - Getting all connections')
    const connections = await window.spark.kv.get<SavedConnection[]>('bullhorn-connections')
    console.log('📦 SecureCredentialsAPI - Retrieved connections:', {
      count: connections?.length || 0,
      connections: connections?.map(c => ({ id: c.id, name: c.name })) || []
    })
    return connections || []
  }

  async deleteConnection(connectionId: string): Promise<void> {
    console.log('🗑️ SecureCredentialsAPI - Deleting connection:', connectionId)
    const connections = await this.getConnections()
    const filtered = connections.filter(c => c.id !== connectionId)
    await window.spark.kv.set('bullhorn-connections', filtered)
    await this.deleteCredentials(connectionId)
    console.log('✅ SecureCredentialsAPI - Connection and credentials deleted')
  }

  async updateConnection(connectionId: string, updates: Partial<SavedConnection>): Promise<void> {
    console.log('📝 SecureCredentialsAPI - Updating connection:', { connectionId, updates })
    const connections = await this.getConnections()
    const index = connections.findIndex(c => c.id === connectionId)
    
    if (index >= 0) {
      connections[index] = { ...connections[index], ...updates }
      await window.spark.kv.set('bullhorn-connections', connections)
      console.log('✅ SecureCredentialsAPI - Connection updated')
    } else {
      console.error('❌ SecureCredentialsAPI - Connection not found for update:', connectionId)
    }
  }
}

export const secureCredentialsAPI = new SecureCredentialsAPI()
