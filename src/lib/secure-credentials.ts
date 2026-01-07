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
    await window.spark.kv.set(`credentials-${connectionId}`, credentials)
  }

  async getCredentials(connectionId: string): Promise<SecureCredentials | null> {
    try {
      const credentials = await window.spark.kv.get<SecureCredentials>(`credentials-${connectionId}`)
      return credentials || null
    } catch (error) {
      console.error('Failed to get credentials:', error)
      return null
    }
  }

  async deleteCredentials(connectionId: string): Promise<void> {
    await window.spark.kv.delete(`credentials-${connectionId}`)
  }

  async saveConnection(connection: SavedConnection): Promise<void> {
    const connections = await this.getConnections()
    const existingIndex = connections.findIndex(c => c.id === connection.id)
    
    if (existingIndex >= 0) {
      connections[existingIndex] = connection
    } else {
      connections.push(connection)
    }
    
    await window.spark.kv.set('bullhorn-connections', connections)
  }

  async getConnections(): Promise<SavedConnection[]> {
    const connections = await window.spark.kv.get<SavedConnection[]>('bullhorn-connections')
    return connections || []
  }

  async deleteConnection(connectionId: string): Promise<void> {
    const connections = await this.getConnections()
    const filtered = connections.filter(c => c.id !== connectionId)
    await window.spark.kv.set('bullhorn-connections', filtered)
    await this.deleteCredentials(connectionId)
  }

  async updateConnection(connectionId: string, updates: Partial<SavedConnection>): Promise<void> {
    const connections = await this.getConnections()
    const index = connections.findIndex(c => c.id === connectionId)
    
    if (index >= 0) {
      connections[index] = { ...connections[index], ...updates }
      await window.spark.kv.set('bullhorn-connections', connections)
    }
  }
}

export const secureCredentialsAPI = new SecureCredentialsAPI()
