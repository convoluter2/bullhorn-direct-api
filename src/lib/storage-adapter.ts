interface StorageAdapter {
  get<T>(key: string): Promise<T | undefined>
  set<T>(key: string, value: T): Promise<void>
  delete(key: string): Promise<void>
  keys(): Promise<string[]>
}

class FallbackStorageAdapter implements StorageAdapter {
  private memoryStore = new Map<string, unknown>()

  async get<T>(key: string): Promise<T | undefined> {
    return this.memoryStore.get(key) as T | undefined
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.memoryStore.set(key, value)
  }

  async delete(key: string): Promise<void> {
    this.memoryStore.delete(key)
  }

  async keys(): Promise<string[]> {
    return [...this.memoryStore.keys()]
  }
}

class SparkKVAdapter implements StorageAdapter {
  private kvDisabledUntil = 0
  private readonly DISABLE_DURATION = 60000
  private readonly fallbackAdapter = new FallbackStorageAdapter()
  private hasLoggedFallbackWarning = false

  private isTemporarilyDisabled(): boolean {
    return Date.now() < this.kvDisabledUntil
  }

  private markTemporarilyDisabled(): void {
    this.kvDisabledUntil = Date.now() + this.DISABLE_DURATION
    console.warn('⚠️ KV storage temporarily disabled for 1 minute due to repeated failures')
  }

  private isUnavailableError(error: any): boolean {
    const message = error?.message ?? ''

    return (
      error?.status === 404 ||
      error?.statusCode === 404 ||
      message.includes('404') ||
      message.includes('Not Found') ||
      message.includes('Failed to fetch') ||
      message.includes('NetworkError')
    )
  }

  private logFallbackWarning(reason: string): void {
    if (this.hasLoggedFallbackWarning) {
      return
    }

    this.hasLoggedFallbackWarning = true
    console.warn(`⚠️ Spark KV unavailable, using fallback storage (${reason})`)
  }

  private async useFallback<T>(reason: string, operation: () => Promise<T>): Promise<T> {
    this.logFallbackWarning(reason)
    return operation()
  }

  async get<T>(key: string): Promise<T | undefined> {
    if (!hasSparkKV()) {
      return this.useFallback('Spark KV not available', () => this.fallbackAdapter.get<T>(key))
    }

    if (this.isTemporarilyDisabled()) {
      return this.useFallback('temporarily disabled', () => this.fallbackAdapter.get<T>(key))
    }

    try {
      return await window.spark.kv.get<T>(key)
    } catch (error: any) {
      if (this.isUnavailableError(error)) {
        this.markTemporarilyDisabled()
        return this.useFallback('request failure', () => this.fallbackAdapter.get<T>(key))
      }
      throw error
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    if (!hasSparkKV()) {
      return this.useFallback('Spark KV not available', () => this.fallbackAdapter.set(key, value))
    }

    if (this.isTemporarilyDisabled()) {
      return this.useFallback('temporarily disabled', () => this.fallbackAdapter.set(key, value))
    }

    try {
      await window.spark.kv.set(key, value)
    } catch (error: any) {
      if (this.isUnavailableError(error)) {
        this.markTemporarilyDisabled()
        return this.useFallback('request failure', () => this.fallbackAdapter.set(key, value))
      }
      throw error
    }
  }

  async delete(key: string): Promise<void> {
    if (!hasSparkKV()) {
      return this.useFallback('Spark KV not available', () => this.fallbackAdapter.delete(key))
    }

    if (this.isTemporarilyDisabled()) {
      return this.useFallback('temporarily disabled', () => this.fallbackAdapter.delete(key))
    }

    try {
      await window.spark.kv.delete(key)
    } catch (error: any) {
      if (this.isUnavailableError(error)) {
        this.markTemporarilyDisabled()
        return this.useFallback('request failure', () => this.fallbackAdapter.delete(key))
      }
      throw error
    }
  }

  async keys(): Promise<string[]> {
    if (!hasSparkKV()) {
      return this.useFallback('Spark KV not available', () => this.fallbackAdapter.keys())
    }

    if (this.isTemporarilyDisabled()) {
      return this.useFallback('temporarily disabled', () => this.fallbackAdapter.keys())
    }

    try {
      return await window.spark.kv.keys()
    } catch (error: any) {
      if (this.isUnavailableError(error)) {
        this.markTemporarilyDisabled()
        return this.useFallback('request failure', () => this.fallbackAdapter.keys())
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
