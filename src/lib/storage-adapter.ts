/**
 * @typedef {Object} KeyValueStore
 * @property {function(string): Promise<*>} get - Get a value by key
 * @property {function(string, *): Promise<void>} set - Set a value for a key
 * @property {function(string): Promise<void>} delete - Delete a key
 * @property {function(string=): Promise<string[]>} keys - Get all keys, optionally filtered by prefix
 */

/**
 * SparkKVStore - Uses the Spark KV API when available
 * @implements {KeyValueStore}
 */
class SparkKVStore {
  constructor() {
    this.ready = false
    this.initPromise = this.init()
  }

  async init() {
    try {
      if (window.spark && window.spark.kv) {
        this.ready = true
        console.log('✅ Spark KV store initialized')
      } else {
        console.warn('⚠️ Spark KV not available')
        this.ready = false
      }
    } catch (error) {
      console.warn('⚠️ Spark KV initialization failed:', error)
      this.ready = false
    }
  }

  async ensureReady() {
    await this.initPromise
  }

  /**
   * Get all keys, optionally filtered by prefix
   * @param {string} [prefix] - Optional prefix to filter keys
   * @returns {Promise<string[]>}
   */
  async keys(prefix) {
    await this.ensureReady()
    if (!this.ready || !window.spark || !window.spark.kv) {
      return []
    }
    
    try {
      const allKeys = await window.spark.kv.keys()
      if (prefix) {
        return allKeys.filter(key => key.startsWith(prefix))
      }
      return allKeys
    } catch (error) {
      console.error('❌ Spark KV keys() failed:', error)
      return []
    }
  }

  /**
   * Get a value by key
   * @template T
   * @param {string} key
   * @returns {Promise<T | null>}
   */
  async get(key) {
    await this.ensureReady()
    if (!this.ready || !window.spark || !window.spark.kv) {
      return null
    }
    
    try {
      const result = await window.spark.kv.get(key)
      return result !== undefined ? result : null
    } catch (error) {
      console.error('❌ Spark KV get() failed:', error)
      return null
    }
  }

  /**
   * Set a value for a key
   * @template T
   * @param {string} key
   * @param {T} value
   * @returns {Promise<void>}
   */
  async set(key, value) {
    await this.ensureReady()
    if (!this.ready || !window.spark || !window.spark.kv) {
      throw new Error('Spark KV not available')
    }
    
    try {
      await window.spark.kv.set(key, value)
    } catch (error) {
      console.error('❌ Spark KV set() failed:', error)
      throw error
    }
  }

  /**
   * Delete a key
   * @param {string} key
   * @returns {Promise<void>}
   */
  async delete(key) {
    await this.ensureReady()
    if (!this.ready || !window.spark || !window.spark.kv) {
      throw new Error('Spark KV not available')
    }
    
    try {
      await window.spark.kv.delete(key)
    } catch (error) {
      console.error('❌ Spark KV delete() failed:', error)
      throw error
    }
  }
}

/**
 * FallbackStore - Uses localStorage or in-memory Map as fallback
 * @implements {KeyValueStore}
 */
class FallbackStore {
  constructor() {
    this.useLocalStorage = this.isLocalStorageAvailable()
    this.memoryStore = new Map()
  }

  /**
   * Check if localStorage is available
   * @returns {boolean}
   */
  isLocalStorageAvailable() {
    try {
      const testKey = '__ls_test__'
      localStorage.setItem(testKey, 'test')
      localStorage.removeItem(testKey)
      return true
    } catch {
      return false
    }
  }

  /**
   * Get all keys, optionally filtered by prefix
   * @param {string} [prefix] - Optional prefix to filter keys
   * @returns {Promise<string[]>}
   */
  async keys(prefix) {
    let allKeys = []
    
    if (this.useLocalStorage) {
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

  /**
   * Get a value by key
   * @template T
   * @param {string} key
   * @returns {Promise<T | null>}
   */
  async get(key) {
    if (this.useLocalStorage) {
      const item = localStorage.getItem(`kv:${key}`)
      if (item === null) return null
      try {
        return JSON.parse(item)
      } catch {
        return null
      }
    } else {
      const value = this.memoryStore.get(key)
      return value !== undefined ? value : null
    }
  }

  /**
   * Set a value for a key
   * @template T
   * @param {string} key
   * @param {T} value
   * @returns {Promise<void>}
   */
  async set(key, value) {
    if (this.useLocalStorage) {
      try {
        localStorage.setItem(`kv:${key}`, JSON.stringify(value))
      } catch (error) {
        console.error('❌ localStorage.setItem failed:', error)
        this.memoryStore.set(key, value)
      }
    } else {
      this.memoryStore.set(key, value)
    }
  }

  /**
   * Delete a key
   * @param {string} key
   * @returns {Promise<void>}
   */
  async delete(key) {
    if (this.useLocalStorage) {
      localStorage.removeItem(`kv:${key}`)
    } else {
      this.memoryStore.delete(key)
    }
  }
}

/**
 * Create a storage adapter that tries Spark KV first, falls back to localStorage/memory
 * @returns {KeyValueStore}
 */
function createStorageAdapter() {
  const sparkStore = new SparkKVStore()
  const fallbackStore = new FallbackStore()
  let hasLoggedFallback = false

  return {
    /**
     * Get all keys, optionally filtered by prefix
     * @param {string} [prefix] - Optional prefix to filter keys
     * @returns {Promise<string[]>}
     */
    async keys(prefix) {
      try {
        await sparkStore.ensureReady()
        if (sparkStore.ready) {
          return await sparkStore.keys(prefix)
        }
      } catch (error) {
        console.warn('⚠️ Spark KV keys() failed, using fallback')
      }
      
      if (!hasLoggedFallback) {
        console.warn('⚠️ Spark KV unavailable, using fallback storage')
        hasLoggedFallback = true
      }
      
      return await fallbackStore.keys(prefix)
    },

    /**
     * Get a value by key
     * @template T
     * @param {string} key
     * @returns {Promise<T | null>}
     */
    async get(key) {
      try {
        await sparkStore.ensureReady()
        if (sparkStore.ready) {
          return await sparkStore.get(key)
        }
      } catch (error) {
        console.warn('⚠️ Spark KV get() failed, using fallback')
      }
      
      if (!hasLoggedFallback) {
        console.warn('⚠️ Spark KV unavailable, using fallback storage')
        hasLoggedFallback = true
      }
      
      return await fallbackStore.get(key)
    },

    /**
     * Set a value for a key
     * @template T
     * @param {string} key
     * @param {T} value
     * @returns {Promise<void>}
     */
    async set(key, value) {
      try {
        await sparkStore.ensureReady()
        if (sparkStore.ready) {
          await sparkStore.set(key, value)
          return
        }
      } catch (error) {
        console.warn('⚠️ Spark KV set() failed, using fallback')
      }
      
      if (!hasLoggedFallback) {
        console.warn('⚠️ Spark KV unavailable, using fallback storage')
        hasLoggedFallback = true
      }
      
      await fallbackStore.set(key, value)
    },

    /**
     * Delete a key
     * @param {string} key
     * @returns {Promise<void>}
     */
    async delete(key) {
      try {
        await sparkStore.ensureReady()
        if (sparkStore.ready) {
          await sparkStore.delete(key)
          return
        }
      } catch (error) {
        console.warn('⚠️ Spark KV delete() failed, using fallback')
      }
      
      if (!hasLoggedFallback) {
        console.warn('⚠️ Spark KV unavailable, using fallback storage')
        hasLoggedFallback = true
      }
      
      await fallbackStore.delete(key)
    }
  }
}

export const storageAdapter = createStorageAdapter()
