interface StorageAdapter {
  get<T>(key: string): Promise<T | undefined>
  set<T>(key: string, value: T): Promise<void>
  delete(key: string): Promise<void>
  keys(): Promise<string[]>
}

class SparkKVAdapter implements StorageAdapter {
  private kvDisabledUntil = 0
  private readonly DISABLE_DURATION = 60000

  private isTemporarilyDisabled(): boolean {
    return Date.now() < this.kvDisabledUntil
  }

  private markTemporarilyDisabled(): void {
    this.kvDisabledUntil = Date.now() + this.DISABLE_DURATION
    console.warn('⚠️ KV storage temporarily disabled for 1 minute due to repeated failures')
  }

  async get<T>(key: string): Promise<T | undefined> {
    if (this.isTemporarilyDisabled()) {
      return undefined
    }

    try {
      return await window.spark.kv.get<T>(key)
    } catch (error: any) {
      if (error?.status === 404 || error?.message?.includes('404') || error?.message?.includes('Not Found')) {
        this.markTemporarilyDisabled()
        throw new Error('KV storage unavailable')
      }
      throw error
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    if (this.isTemporarilyDisabled()) {
      return
    }

    try {
      await window.spark.kv.set(key, value)
    } catch (error: any) {
      if (error?.status === 404 || error?.message?.includes('404') || error?.message?.includes('Not Found')) {
        this.markTemporarilyDisabled()
        throw new Error('KV storage unavailable')
      }
      throw error
    }
  }

  async delete(key: string): Promise<void> {
    if (this.isTemporarilyDisabled()) {
      return
    }

    try {
      await window.spark.kv.delete(key)
    } catch (error: any) {
      if (error?.status === 404 || error?.message?.includes('404') || error?.message?.includes('Not Found')) {
        this.markTemporarilyDisabled()
        throw new Error('KV storage unavailable')
      }
      throw error
    }
  }

  async keys(): Promise<string[]> {
    if (this.isTemporarilyDisabled()) {
      return []
    }

    try {
      return await window.spark.kv.keys()
    } catch (error: any) {
      if (error?.status === 404 || error?.message?.includes('404') || error?.message?.includes('Not Found')) {
        this.markTemporarilyDisabled()
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
