export interface KeyValueStore {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T): Promise<void>
  delete(key: string): Promise<void>
  keys(prefix?: string): Promise<string[]>
}

export class SparkKVStore implements KeyValueStore {
  async keys(prefix?: string): Promise<string[]> {
    const allKeys = await window.spark.kv.keys()
    if (prefix) {
      return allKeys.filter(key => key.startsWith(prefix))
    }
    return allKeys
  }

  async get<T>(key: string): Promise<T | null> {
    const result = await window.spark.kv.get<T>(key)
    return result ?? null
  }

  async set<T>(key: string, value: T): Promise<void> {
    await window.spark.kv.set(key, value)
  }

  async delete(key: string): Promise<void> {
    await window.spark.kv.delete(key)
  }
}

export class FallbackStore implements KeyValueStore {
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

  async keys(prefix?: string): Promise<string[]> {
    let allKeys: string[]
    
    if (this.useLocalStorage) {
      allKeys = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('kv:')) {
          allKeys.push(key.substring(3))
        }
      }
    } else {
      allKeys = Array.from(this.memoryStore.keys())
    }

    if (prefix) {
      return allKeys.filter(key => key.startsWith(prefix))
    }
    return allKeys
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.useLocalStorage) {
      const item = localStorage.getItem(`kv:${key}`)
      if (item === null) return null
      try {
        return JSON.parse(item) as T
      } catch {
        return null
      }
    } else {
      const value = this.memoryStore.get(key)
      return value ?? null
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
    }
    
    if (!this.store) {
      this.store = new FallbackStore()
    }
  }

  async keys(prefix?: string): Promise<string[]> {
    await this.ensureReady()
    return this.store!.keys(prefix)
  }

  async get<T>(key: string): Promise<T | null> {
    await this.ensureReady()
    return this.store!.get<T>(key)
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.ensureReady()
    await this.store!.set(key, value)
  }

  async delete(key: string): Promise<void> {
    await this.ensureReady()
    await this.store!.delete(key)
  }
}

export async function createStore(): Promise<KeyValueStore> {
  try {
    if (typeof window !== 'undefined' && window.spark?.kv) {
      await window.spark.kv.keys()
      return new SparkKVStore()
    }
  } catch (error) {
    const hasLogged = (globalThis as any).__storage_fallback_logged
    if (!hasLogged) {
      console.warn('⚠️ Spark KV unavailable, using fallback storage');
      (globalThis as any).__storage_fallback_logged = true
    }
  }
  
  return new FallbackStore()
}

const storageInstance = new StorageAdapter()
export const storageAdapter = storageInstance
export default storageInstance
