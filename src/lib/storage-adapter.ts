export interface KeyValueStore {
  keys(): Promise<string[]>
  get<T>(key: string): Promise<T | undefined>
  set<T>(key: string, value: T): Promise<void>

}

class SparkKVStore implements KeyValueStore {
  async set<T>(key: string, value: 
  }
  a


  private useLocalStorage: boolean


  async set<T>(key: string, value: T): Promise<void> {
    await window.spark.kv.set(key, value)
   

  async delete(key: string): Promise<void> {
    await window.spark.kv.delete(key)

}

class FallbackStore implements KeyValueStore {
  private useLocalStorage: boolean
  private memoryStore: Map<string, any>

  constructor() {
    this.useLocalStorage = this.isLocalStorageAvailable()
    this.memoryStore = new Map()
  as
      const item = localStorage.
      try {
     
   

  }
  async s
      localStorage.setItem(`kv:${key}
      this.memoryStore.set(key, value)
  }
  async delete(ke
      localSt
      this.memoryS
  }


  private isSparkKVAvailable: boole

    this.checkPromise = this.ch

    if (this.isSparkKVAvailable !== nul
    }
    try {
        m
      }
      this.isSpar
      if (th
      } else {
     
   

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
      const response = await fetch('/_spark/kv', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      })
      
      this.isSparkKVAvailable = response.ok
      
      if (this.isSparkKVAvailable) {
        this.store = new SparkKVStore()
      } else {
        if (!this.hasLoggedFallback) {
          console.warn('⚠️ Spark KV unavailable (/_spark/kv returned non-OK), using fallback storage')
          this.hasLoggedFallback = true
        }
        this.store = new FallbackStore()
      }
    } catch (error) {

        console.warn('⚠️ Spark KV unavailable (connection failed), using fallback storage')
        this.hasLoggedFallback = true
      }

      this.store = new FallbackStore()

  }

  private async ensureReady(): Promise<void> {

      await this.checkPromise
      this.checkPromise = null
    }

      this.store = new FallbackStore()

  }

  async keys(): Promise<string[]> {

    try {
      return await this.store!.keys()
    } catch (error) {
      console.error('Storage adapter keys() failed:', error)
      return []
    }
  }

  async get<T>(key: string): Promise<T | undefined> {

    try {



























