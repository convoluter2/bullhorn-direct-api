interface StorageAdapter {
  get<T>(key: string): Promise<T | undefined>
  set<T>(key: string, value: T): Promise<void>
  delete(key: string): Promise<void>
  keys(): Promise<string[]>
}

class SparkKVAdapter implements StorageAdapter {
  async get<T>(key: string): Promise<T | undefined> {
    return await window.spark.kv.get<T>(key)
  }

  async set<T>(key: string, value: T): Promise<void> {
    await window.spark.kv.set(key, value)
  }

  async delete(key: string): Promise<void> {
    await window.spark.kv.delete(key)
  }

  async keys(): Promise<string[]> {
    return await window.spark.kv.keys()
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
