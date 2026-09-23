import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getStorageAdapter } from '@/lib/storage-adapter'

describe('storage adapter fallback', () => {
  beforeEach(() => {
    localStorage.clear()
    delete (window as any).__KV_DISABLED__
  })

  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('uses fallback storage when Spark KV requests return 404', async () => {
    vi.spyOn(window.spark.kv, 'set').mockRejectedValue(new Error('404 Not Found'))
    vi.spyOn(window.spark.kv, 'get').mockRejectedValue(new Error('404 Not Found'))
    vi.spyOn(window.spark.kv, 'keys').mockRejectedValue(new Error('404 Not Found'))
    vi.spyOn(window.spark.kv, 'delete').mockRejectedValue(new Error('404 Not Found'))

    const storage = await getStorageAdapter()
    const testKey = 'kv-fallback-test'
    const testValue = { tenant: 'Fastaff', timestamp: Date.now() }

    await storage.set(testKey, testValue)

    expect(await storage.get<typeof testValue>(testKey)).toEqual(testValue)
    expect(await storage.keys()).toContain(testKey)

    await storage.delete(testKey)

    expect(await storage.get(testKey)).toBeUndefined()
  })
})
