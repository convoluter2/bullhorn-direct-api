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
  private async getUserId(): Promise<string> {
    const user = await window.spark.user()
    if (!user) {
      throw new Error('User not authenticated')
    }
    return String(user.id)
  }

  private getCredentialKey(connectionId: string, userId: string): string {
    return `secure-cred-${userId}-${connectionId}`
  }

  private getConnectionsKey(userId: string): string {
    return `connections-${userId}`
  }

  async saveCredentials(connectionId: string, credentials: SecureCredentials): Promise<void> {
    const userId = await this.getUserId()
    const key = this.getCredentialKey(connectionId, userId)
    
    await window.spark.kv.set(key, credentials)
  }

  async getCredentials(connectionId: string): Promise<SecureCredentials | null> {
    try {
      const userId = await this.getUserId()
      const key = this.getCredentialKey(connectionId, userId)
      
      const credentials = await window.spark.kv.get<SecureCredentials>(key)
      return credentials || null
    } catch (error) {
      console.error('Failed to get credentials:', error)
      return null
    }
  }

  async deleteCredentials(connectionId: string): Promise<void> {
    const userId = await this.getUserId()
    const key = this.getCredentialKey(connectionId, userId)
    
    await window.spark.kv.delete(key)
  }

  async saveConnection(connection: SavedConnection): Promise<void> {
    const userId = await this.getUserId()
    const key = this.getConnectionsKey(userId)
    
    const connections = await window.spark.kv.get<SavedConnection[]>(key) || []
    const existingIndex = connections.findIndex(c => c.id === connection.id)
    
    if (existingIndex >= 0) {
      connections[existingIndex] = connection
    } else {
      connections.push(connection)
    }
    
    await window.spark.kv.set(key, connections)
  }

  async getConnections(): Promise<SavedConnection[]> {
    const userId = await this.getUserId()
    const key = this.getConnectionsKey(userId)
    
    const connections = await window.spark.kv.get<SavedConnection[]>(key) || []
    return connections
  }

  async deleteConnection(connectionId: string): Promise<void> {
    const userId = await this.getUserId()
    const key = this.getConnectionsKey(userId)
    
    const connections = await window.spark.kv.get<SavedConnection[]>(key) || []
    const filtered = connections.filter(c => c.id !== connectionId)
    
    await window.spark.kv.set(key, filtered)
    await this.deleteCredentials(connectionId)
  }

  async updateConnection(connectionId: string, updates: Partial<SavedConnection>): Promise<void> {
    const userId = await this.getUserId()
    const key = this.getConnectionsKey(userId)
    
    const connections = await window.spark.kv.get<SavedConnection[]>(key) || []
    const updated = connections.map(conn => 
      conn.id === connectionId ? { ...conn, ...updates } : conn
    )
    
    await window.spark.kv.set(key, updated)
  }
}

export const secureCredentialsAPI = new SecureCredentialsAPI()
