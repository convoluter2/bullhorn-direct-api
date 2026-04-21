interface StorageAdapter {
  get<T>(key: string): Promise<T | undefined>
  set<T>(key: string, value: T): Promise<void>
  delete(key: string): Promise<void>
  keys(): Promise<string[]>
}

class SparkKVAdapter implements StorageAdapter {
  async get<T>(key: string): Promise<T | undefined> {
    try {
      return await window.spark.kv.get<T>(key)
    } catch (error: any) {
      if (error?.status === 404 || error?.message?.includes('404') || error?.message?.includes('Not Found')) {
        console.warn('⚠️ KV storage unavailable (404) - falling back to graceful degradation')
        throw new Error('KV storage unavailable')
      }
      throw error
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await window.spark.kv.set(key, value)
    } catch (error: any) {
      if (error?.status === 404 || error?.message?.includes('404') || error?.message?.includes('Not Found')) {
        console.warn('⚠️ KV storage unavailable (404) - falling back to graceful degradation')
        throw new Error('KV storage unavailable')
      }
      throw error
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await window.spark.kv.delete(key)
    } catch (error: any) {
      if (error?.status === 404 || error?.message?.includes('404') || error?.message?.includes('Not Found')) {
        console.warn('⚠️ KV storage unavailable (404) - falling back to graceful degradation')
        throw new Error('KV storage unavailable')
      }
      throw error
    }
  }

  async keys(): Promise<string[]> {
    try {
      return await window.spark.kv.keys()
    } catch (error: any) {
      if (error?.status === 404 || error?.message?.includes('404') || error?.message?.includes('Not Found')) {
        console.warn('⚠️ KV storage unavailable (404) - falling back to graceful degradation')
        throw new Error('KV storage unavailable')
      }
      throw error
    }
  }
}

let adapter: StorageAdapter | null = null

export function hasSparkKV(): boolean {
  return typeof window !== 'undefined' && 
         typeof window.spark !== 'undefined' && 
         typeof window.spark.kv !== 'undefined'
}

export async function getStorageAdapter(): Promise<StorageAdapter> {
  if (!adapter) {
    adapter = new SparkKVAdapter()
  }
  return adapter
}
