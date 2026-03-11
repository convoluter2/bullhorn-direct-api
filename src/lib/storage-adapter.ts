export interface KeyValueStore {
  keys(): Promise<string[]>
  get<T>(key: string): Promise<T | undefined>
  set<T>(key: string, value: T): Promise<void>
  delete(key: string): Promise<void>
}

class SparkKVStore implements KeyValueStore {
  async keys(): Promise<string[]> {
    return await window.spark.kv.keys()
  }

  async get<T>(key: string): Promise<T | undefined> {
    return await window.spark.kv.get<T>(key)
  }

  async set<T>(key: string, value: T): Promise<void> {
    await window.spark.kv.set(key, value)
  }

  async delete(key: string): Promise<void> {
    await window.spark.kv.delete(key)
  }
}

class FallbackStore implements KeyValueStore {
  private useLocalStorage: boolean
  private memoryStore: Map<string, any>

  constructor() {
    this.useLocalStorage = this.isLocalStorageAvailable()
    this.memoryStore = new Map()
  }

  private isLocalStorageAvailable(): boolean {
    try {
      const testKey = '__ls_test__'
      localStorage.setItem(testKey, 'test')
      localStorage.removeItem(testKey)
      return true
    } catch {
      return false
    }
  }

  async keys(): Promise<string[]> {
    if (this.useLocalStorage) {
      const allKeys: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('kv:')) {
          allKeys.push(key.substring(3))
        }
      }
      return allKeys
    } else {
      return Array.from(this.memoryStore.keys())
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    if (this.useLocalStorage) {
      const item = localStorage.getItem(`kv:${key}`)
      if (item === null) return undefined
      try {
        return JSON.parse(item) as T
      } catch {
        return undefined
      }
    } else {
      return this.memoryStore.get(key)
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    if (this.useLocalStorage) {
      localStorage.setItem(`kv:${key}`, JSON.stringify(value))
    } else {
      this.memoryStore.set(key, value)
    }
  }

  async delete(key: string): Promise<void> {
    if (this.useLocalStorage) {
      localStorage.removeItem(`kv:${key}`)
    } else {
      this.memoryStore.delete(key)
    }
  }
}

class StorageAdapter implements KeyValueStore {
  private store: KeyValueStore | null = null
  private checkPromise: Promise<void> | null = null
  private isSparkKVAvailable: boolean | null = null
  private hasLoggedFallback = false

  constructor() {
    this.checkPromise = this.checkAvailability()
  }

  private async checkAvailability(): Promise<void> {
    if (this.isSparkKVAvailable !== null) {
      return
    }

    try {
      if (typeof window !== 'undefined' && window.spark && window.spark.kv) {
        await window.spark.kv.keys()
        this.isSparkKVAvailable = true
        this.store = new SparkKVStore()
      } else {
        throw new Error('Spark KV not available')
      }
    } catch (error) {
      this.isSparkKVAvailable = false
      if (!this.hasLoggedFallback) {
        console.warn('⚠️ Spark KV unavailable, using fallback storage')
        this.hasLoggedFallback = true
      }
      this.store = new FallbackStore()
    }
  }

  private async ensureReady(): Promise<void> {
    if (this.checkPromise) {
      await this.checkPromise
      this.checkPromise = null
    }

    if (!this.store) {
      this.store = new FallbackStore()
    }
  }

  async keys(): Promise<string[]> {
    await this.ensureReady()
    try {
      return await this.store!.keys()
    } catch (error) {
      console.error('Storage adapter keys() failed:', error)
      return []
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    await this.ensureReady()
    try {
      return await this.store!.get<T>(key)
    } catch (error) {
      console.error('Storage adapter get() failed:', error)
      return undefined
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.ensureReady()
    try {
      await this.store!.set(key, value)
    } catch (error) {
      console.error('Storage adapter set() failed:', error)
    }
  }

  async delete(key: string): Promise<void> {
    await this.ensureReady()
    try {
      await this.store!.delete(key)
    } catch (error) {
      console.error('Storage adapter delete() failed:', error)
    }
  }
}

export const storageAdapter = new StorageAdapter()
