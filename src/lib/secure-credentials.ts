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
  private serverUrl = 'http://localhost:3001'

  private async getUserId(): Promise<string> {
    const user = await window.spark.user()
    if (!user) {
      throw new Error('User not authenticated')
    }
    return String(user.id)
  }

  async saveCredentials(connectionId: string, credentials: SecureCredentials): Promise<void> {
    const userId = await this.getUserId()
    
    const response = await fetch(`${this.serverUrl}/api/credentials/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, connectionId, credentials })
    })

    if (!response.ok) {
      throw new Error('Failed to save credentials')
    }

  async getCredentials(connectionId: string): Promise<SecureCredentials | null> {
    try {
      const userId = await this.getUserId()
      
      ls/${userId}/${connectionId}`)
      const response = await fetch(`${this.serverUrl}/api/credentials/${userId}/${connectionId}`)
      if (response.status === 404) {
      if (response.status === 404) {
        return null
      }

      if (!response.ok) {
        throw new Error('Failed to get credentials')
      }

      const data = await response.json()
      return data.credentials
      console.error('Failed to get credentials:', error)
      return null
    }
  }

  async deleteCredentials(connectionId: string): Promise<void> {
    const userId = await this.getUserId()
    
      method: 'DELETE'
    const response = await fetch(`${this.serverUrl}/api/credentials/${userId}/${connectionId}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      throw new Error('Failed to delete credentials')
    }
  async saveConnection(connection: SavedConnection): Promise<void> {
    const userId = await this.getUserId()
    
    const response = await fetch(`${this.serverUrl}/api/connections/save`, {
      headers: { 'Content-Type': 'application/json' },
    const response = await fetch(`${this.serverUrl}/api/connections/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, connection })
    })

    if (!response.ok) {
      throw new Error('Failed to save connection')
  async getConnections(): Promise<SavedConnection[]> {
    const response = await fetch(`${this.serverUrl}/api/connections/${userId}`)
    
    if (!response.ok) {
      throw new Error('Failed to get connections')
    
    const response = await fetch(`${this.serverUrl}/api/connections/${userId}`)
    const data = await response.json()
    if (!response.ok) {
      throw new Error('Failed to get connections')
    }

    const data = await response.json()
    return data.connections
    const response = await fetch(`${this.serverUrl}/api/connections/${userId}/${connectionId}`, {
      method: 'DELETE'
    })

      throw new Error('Failed to delete connection')
    const response = await fetch(`${this.serverUrl}/api/connections/${userId}/${connectionId}`, {
      method: 'DELETE'
    })this.deleteCredentials(connectionId)

    if (!response.ok) {
      throw new Error('Failed to delete connection')
    }

    const response = await fetch(`${this.serverUrl}/api/connections/${userId}/${connectionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates })
    })
    if (!response.ok) {
    const response = await fetch(`${this.serverUrl}/api/connections/${userId}/${connectionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates })
    })
ureCredentialsAPI()
    if (!response.ok) {
      throw new Error('Failed to update connection')
    }
