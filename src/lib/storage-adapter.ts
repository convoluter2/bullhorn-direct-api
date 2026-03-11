/**
 * @typedef {Object} KeyValueStore
 * @property {(key: string) => Promise<any|null>} get
 * @property {(key: string, value: any) => Promise<void>} set
 * @property {(key: string) => Promise<void>} delete
 * @property {(prefix?: string) => Promise<string[]>} keys
 */

/**
 * SparkKVStore – uses Spark KV when available
 */
export class SparkKVStore {
  constructor() {
    this.ready = false
    this.initPromise = this.init()
  }

  async init() {
    if (typeof window !== 'undefined' && window.spark && window.spark.kv) {
      this.ready = true
      console.log('✅ Spark KV available')
    } else {
      this.ready = false
      console.warn('⚠️ Spark KV not available')
    }
  }

  async ensureReady() {
    await this.initPromise
  }

  async keys(prefix) {
    await this.ensureReady()
    if (!this.ready) return []

    try {
      const allKeys = await window.spark.kv.keys()
      return prefix ? allKeys.filter(k => k.startsWith(prefix)) : allKeys
    } catch (err) {
      console.error('❌ Spark KV keys failed', err)
      return []
    }
  }

  async get(key) {
    await this.ensureReady()
    if (!this.ready) return null

    try {
      const value = await window.spark.kv.get(key)
      return value ?? null
    } catch (err) {
      console.error('❌ Spark KV get failed', err)
      return null
    }
  }

  async set(key, value) {
    await this.ensureReady()
    if (!this.ready) return

    await window.spark.kv.set(key, value)
  }

  async delete(key) {
    await this.ensureReady()
    if (!this.ready) return

    await window.spark.kv.delete(key)
  }
}

/**
 * FallbackStore – localStorage or memory
 */
export class FallbackStore {
  constructor() {
    this.useLocalStorage = this.canUseLocalStorage()
    this.memory = new Map()
  }

  canUseLocalStorage() {
    try {
      const k = '__test__'
      localStorage.setItem(k, k)
      localStorage.removeItem(k)
      return true
    } catch {
      return false
    }
  }

  async keys(prefix) {
    let keys = []

    if (this.useLocalStorage) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('kv:')) {
          keys.push(key.slice(3))
        }
      }
    } else {
      keys = Array.from(this.memory.keys())
    }

    return prefix ? keys.filter(k => k.startsWith(prefix)) : keys
  }

  async get(key) {
    if (this.useLocalStorage) {
      const raw = localStorage.getItem(`kv:${key}`)
      return raw ? JSON.parse(raw) : null
    }
    return this.memory.get(key) ?? null
  }

  async set(key, value) {
    if (this.useLocalStorage) {
      localStorage.setItem(`kv:${key}`, JSON.stringify(value))
    } else {
      this.memory.set(key, value)
    }
  }

  async delete(key) {
    if (this.useLocalStorage) {
      localStorage.removeItem(`kv:${key}`)
    } else {
      this.memory.delete(key)
    }
  }
}

/**
 * Factory
 */
export async function createStore() {
  const spark = new SparkKVStore()
  await spark.ensureReady()
  return spark.ready ? spark : new FallbackStore()
}
// storage-adapter.ts (bottom)
export const storageAdapter = await createStore()