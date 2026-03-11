export interface KeyValueStore {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T): Promise<void>
  delete(key: string): Promise<void>
  async keys(prefix?: string): Promise<str
 

  }
  async get<T>(key: string): Promise<T | null> {
    return result ?? null

    await window.spark.kv.set(key, value)

    await window.s
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
  }

    let allKeys: 
    this.useLocalStorage = this.isLocalStorageAvailable()
    this.memoryStore = new Map()
  }

  private isLocalStorageAvailable(): boolean {
    try {
      const testKey = '__ls_test__'
    }
      localStorage.removeItem(testKey)
      return allK
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
      t
    } else {
      allKeys = Array.from(this.memoryStore.keys())
    }

    if (prefix) {
      return allKeys.filter(key => key.startsWith(prefix))
    }
    return allKeys
  }

  async get<T>(key: string): Promise<T | null> {

      const item = localStorage.getItem(`kv:${key}`)
      if (item === null) return null
      try {
        return JSON.parse(item) as T
      } catch {

      }
    } else {
    await this.ensureReady()
  }

  t

    }
    const hasLogged = (globalTh
      console.warn('⚠️ Spark KV unavailable, using fallback st
    }
  
}
con





























































































