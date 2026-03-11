export interface KeyValueStore {
  keys(): Promise<string[]>
  get<T>(key: string): Promise<T | undefined>
  set<T>(key: string, value: T): Promise<void>
}
c


    return await window.spark.kv.ge

   

    await window.spark.kv.delete(key)
}
cla

  constructor() {
    this.memoryStore = new Map()


      localStorage.setItem(testKey, 'test')
      return true
   
 

      const allKeys: string[] = []
        const key = localStorage.k
          allKeys.push(key.substring(3)

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
    }

    a

      console.error('S
  }
  asy
   

    }
}
export co





































