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

/* ---------------- KV CIRCUIT BREAKER ---------------- */

const KV_DISABLED_KEY = '__KV_DISABLED__'

function isKVDisabled(): boolean {
  return Boolean((window as any)[KV_DISABLED_KEY])
}

function disableKV() {
  ;(window as any)[KV_DISABLED_KEY] = true
  console.warn('🛑 Spark KV permanently disabled (rate‑limit protection)')
}

/* ---------------- API ---------------- */

class SecureCredentialsAPI {
  private cachedConnections: SavedConnection[] | null = null
  private inFlightConnectionsRequest: Promise<SavedConnection[]> | null = null
  private connectionsCacheTimestamp = 0
  private readonly CONNECTIONS_CACHE_DURATION = 60_000

  private async kv() {
    if (isKVDisabled()) {
      throw new Error('KV disabled')
    }
    return await getStorageAdapter()
  }

  private credKey(connectionId: string) {
    return `credentials-${connectionId}`
  }

  private invalidateConnectionsCache() {
    this.cachedConnections = null
    this.connectionsCacheTimestamp = 0
  }

  /* ---------------- CREDENTIALS ---------------- */

  async saveCredentials(connectionId: string, credentials: SecureCredentials): Promise<void> {
    if (isKVDisabled()) return

    try {
      const storage = await this.kv()
      await storage.set(this.credKey(connectionId), credentials)

      console.log('💾 Credentials saved:', { connectionId })
    } catch (e) {
      console.warn('🛑 saveCredentials failed — disabling KV')
      disableKV()
    }
  }

  async getCredentials(connectionId: string): Promise<SecureCredentials | null> {
    if (isKVDisabled()) return null

    try {
      const storage = await this.kv()
      const credentials = await storage.get(this.credKey(connectionId))
      return (credentials as SecureCredentials) || null
    } catch (e) {
      console.warn('🛑 getCredentials failed — disabling KV')
      disableKV()
      return null
    }
  }

  async deleteCredentials(connectionId: string): Promise<void> {
    if (isKVDisabled()) return

    try {
      const storage = await this.kv()
      await storage.delete(this.credKey(connectionId))
    } catch (e) {
      console.warn('🛑 deleteCredentials failed — disabling KV')
      disableKV()
    }
  }

  /* ---------------- CONNECTIONS ---------------- */

  async saveConnection(connection: SavedConnection): Promise<void> {
    if (isKVDisabled()) return

    try {
      const connections = await this.getConnections()
      const index = connections.findIndex(c => c.id === connection.id)

      if (index >= 0) {
        connections[index] = connection
      } else {
        connections.push(connection)
      }

      const storage = await this.kv()
      await storage.set('bullhorn-connections', connections)

      this.invalidateConnectionsCache()
      console.log('✅ Connection saved:', connection.id)
    } catch (e) {
      console.warn('🛑 saveConnection failed — disabling KV')
      disableKV()
    }
  }

  async getConnections(): Promise<SavedConnection[]> {
    if (isKVDisabled()) return this.cachedConnections ?? []

    const now = Date.now()

    // ✅ Memory cache
    if (
      this.cachedConnections &&
      now - this.connectionsCacheTimestamp < this.CONNECTIONS_CACHE_DURATION
    ) {
      return this.cachedConnections
    }

    // ✅ Single‑flight
    if (this.inFlightConnectionsRequest) {
      return this.inFlightConnectionsRequest
    }

    this.inFlightConnectionsRequest = (async () => {
      try {
        const storage = await this.kv()
        const raw = await storage.get('bullhorn-connections')
        const connections = Array.isArray(raw) ? raw : []

        this.cachedConnections = connections
        this.connectionsCacheTimestamp = Date.now()

        return connections
      } catch (e) {
        console.warn('🛑 getConnections failed — disabling KV')
        disableKV()
        return []
      } finally {
        this.inFlightConnectionsRequest = null
      }
    })()

    return this.inFlightConnectionsRequest
  }

  async deleteConnection(connectionId: string): Promise<void> {
    if (isKVDisabled()) return

    try {
      const connections = await this.getConnections()
      const filtered = connections.filter(c => c.id !== connectionId)

      const storage = await this.kv()
      await storage.set('bullhorn-connections', filtered)

      await this.deleteCredentials(connectionId)
      this.invalidateConnectionsCache()
    } catch (e) {
      console.warn('🛑 deleteConnection failed — disabling KV')
      disableKV()
    }
  }

  async updateConnection(
    connectionId: string,
    updates: Partial<SavedConnection>
  ): Promise<void> {
    if (isKVDisabled()) return

    try {
      const connections = await this.getConnections()
      const index = connections.findIndex(c => c.id === connectionId)

      if (index < 0) return

      connections[index] = { ...connections[index], ...updates }

      const storage = await this.kv()
      await storage.set('bullhorn-connections', connections)

      this.invalidateConnectionsCache()
    } catch (e) {
      console.warn('🛑 updateConnection failed — disabling KV')
      disableKV()
    }
  }
}

export const secureCredentialsAPI = new SecureCredentialsAPI()
``