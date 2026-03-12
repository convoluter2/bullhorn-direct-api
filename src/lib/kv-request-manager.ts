type QueuedRequest<T> = {
  key: string
  operation: () => Promise<T>
  resolve: (value: T) => void
  reject: (error: Error) => void
  retries: number
}

type InFlightRequest<T> = {
  promise: Promise<T>
  timestamp: number
}

export class KVRequestManager {
  private queue: QueuedRequest<any>[] = []
  private processing = false
  private inFlightRequests: Map<string, InFlightRequest<any>> = new Map()
  private memoryCache: Map<string, { data: any; timestamp: number }> = new Map()
  
  private readonly MAX_CONCURRENT = 2
  private readonly MAX_RETRIES = 3
  private readonly INITIAL_BACKOFF = 1000
  private readonly MAX_BACKOFF = 30000
  private readonly MEMORY_CACHE_DURATION = 5 * 60 * 1000
  private readonly INFLIGHT_TIMEOUT = 30000
  
  private currentConcurrent = 0
  private circuitBreakerOpen = false
  private circuitBreakerOpenUntil = 0
  private consecutiveFailures = 0
  private readonly CIRCUIT_BREAKER_THRESHOLD = 3
  private readonly CIRCUIT_BREAKER_COOLDOWN = 10000
  
  private has429Warning = false

  private calculateBackoff(retries: number): number {
    const backoff = Math.min(
      this.INITIAL_BACKOFF * Math.pow(2, retries),
      this.MAX_BACKOFF
    )
    const jitter = Math.random() * 0.3 * backoff
    return backoff + jitter
  }

  private openCircuitBreaker(): void {
    if (!this.circuitBreakerOpen) {
      console.warn('⚠️ Circuit breaker opened - pausing KV requests for cooldown')
      this.circuitBreakerOpen = true
      this.circuitBreakerOpenUntil = Date.now() + this.CIRCUIT_BREAKER_COOLDOWN
      
      setTimeout(() => {
        console.log('✅ Circuit breaker reset - resuming KV requests')
        this.circuitBreakerOpen = false
        this.consecutiveFailures = 0
        this.processQueue()
      }, this.CIRCUIT_BREAKER_COOLDOWN)
    }
  }

  private checkCircuitBreaker(): boolean {
    if (this.circuitBreakerOpen && Date.now() < this.circuitBreakerOpenUntil) {
      return true
    }
    
    if (this.circuitBreakerOpen && Date.now() >= this.circuitBreakerOpenUntil) {
      this.circuitBreakerOpen = false
      this.consecutiveFailures = 0
    }
    
    return false
  }

  private getMemoryCached<T>(key: string): T | null {
    const cached = this.memoryCache.get(key)
    if (!cached) return null
    
    const age = Date.now() - cached.timestamp
    if (age > this.MEMORY_CACHE_DURATION) {
      this.memoryCache.delete(key)
      return null
    }
    
    return cached.data as T
  }

  private setMemoryCache<T>(key: string, data: T): void {
    this.memoryCache.set(key, {
      data,
      timestamp: Date.now()
    })
    
    if (this.memoryCache.size > 200) {
      const oldestKey = Array.from(this.memoryCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0]
      this.memoryCache.delete(oldestKey)
    }
  }

  private cleanupStaleInFlightRequests(): void {
    const now = Date.now()
    for (const [key, request] of this.inFlightRequests.entries()) {
      if (now - request.timestamp > this.INFLIGHT_TIMEOUT) {
        console.warn(`⚠️ Removing stale in-flight request: ${key}`)
        this.inFlightRequests.delete(key)
      }
    }
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return
    if (this.queue.length === 0) return
    if (this.checkCircuitBreaker()) {
      console.log('⏸️ Circuit breaker open, queue paused')
      return
    }

    this.processing = true
    this.cleanupStaleInFlightRequests()

    while (
      this.queue.length > 0 &&
      this.currentConcurrent < this.MAX_CONCURRENT &&
      !this.checkCircuitBreaker()
    ) {
      const request = this.queue.shift()
      if (!request) continue

      this.currentConcurrent++
      
      this.executeRequest(request).finally(() => {
        this.currentConcurrent--
        this.processQueue()
      })
    }

    this.processing = false
  }

  private async executeRequest<T>(request: QueuedRequest<T>): Promise<void> {
    try {
      const result = await request.operation()
      this.consecutiveFailures = 0
      request.resolve(result)
    } catch (error: any) {
      const is429 = error?.message?.includes('429') || 
                    error?.status === 429 ||
                    error?.statusCode === 429

      if (is429) {
        if (!this.has429Warning) {
          console.warn('🚨 KV rate limit (429) detected - applying backoff and circuit breaker')
          this.has429Warning = true
        }
        
        this.consecutiveFailures++

        if (request.retries < this.MAX_RETRIES) {
          const backoff = this.calculateBackoff(request.retries)
          console.log(`⏳ Retry ${request.retries + 1}/${this.MAX_RETRIES} for ${request.key} after ${Math.round(backoff)}ms`)
          
          request.retries++
          
          setTimeout(() => {
            this.queue.unshift(request)
            this.processQueue()
          }, backoff)
        } else {
          console.error(`❌ Max retries exceeded for ${request.key}`)
          request.reject(new Error(`KV request failed after ${this.MAX_RETRIES} retries: ${error.message}`))
        }

        if (this.consecutiveFailures >= this.CIRCUIT_BREAKER_THRESHOLD) {
          this.openCircuitBreaker()
        }
      } else {
        this.consecutiveFailures++
        
        if (this.consecutiveFailures >= this.CIRCUIT_BREAKER_THRESHOLD) {
          this.openCircuitBreaker()
        }
        
        request.reject(error)
      }
    }
  }

  async enqueueKVGet<T>(key: string, getter: () => Promise<T>): Promise<T> {
    const memoryCached = this.getMemoryCached<T>(key)
    if (memoryCached !== null) {
      return memoryCached
    }

    const inFlight = this.inFlightRequests.get(key)
    if (inFlight) {
      return inFlight.promise as Promise<T>
    }

    return new Promise<T>((resolve, reject) => {
      const promise = new Promise<T>((innerResolve, innerReject) => {
        const request: QueuedRequest<T> = {
          key,
          operation: async () => {
            try {
              const result = await getter()
              this.setMemoryCache(key, result)
              this.inFlightRequests.delete(key)
              return result
            } catch (error) {
              this.inFlightRequests.delete(key)
              throw error
            }
          },
          resolve: innerResolve,
          reject: innerReject,
          retries: 0
        }

        this.queue.push(request)
        this.processQueue()
      })

      this.inFlightRequests.set(key, {
        promise,
        timestamp: Date.now()
      })

      promise.then(resolve, reject)
    })
  }

  async enqueueKVSet<T>(key: string, setter: () => Promise<T>): Promise<T> {
    this.memoryCache.delete(key)
    
    return new Promise<T>((resolve, reject) => {
      const request: QueuedRequest<T> = {
        key: `set:${key}`,
        operation: setter,
        resolve,
        reject,
        retries: 0
      }

      this.queue.push(request)
      this.processQueue()
    })
  }

  async enqueueKVKeys(keysGetter: () => Promise<string[]>): Promise<string[]> {
    const cacheKey = '__kv_keys_list__'
    const memoryCached = this.getMemoryCached<string[]>(cacheKey)
    if (memoryCached !== null) {
      return memoryCached
    }

    return new Promise<string[]>((resolve, reject) => {
      const request: QueuedRequest<string[]> = {
        key: cacheKey,
        operation: async () => {
          const result = await keysGetter()
          this.setMemoryCache(cacheKey, result)
          return result
        },
        resolve,
        reject,
        retries: 0
      }

      this.queue.push(request)
      this.processQueue()
    })
  }

  invalidateMemoryCache(keyPattern?: string): void {
    if (!keyPattern) {
      this.memoryCache.clear()
      console.log('🗑️ Cleared all KV memory cache')
      return
    }

    const keysToDelete: string[] = []
    for (const key of this.memoryCache.keys()) {
      if (key.includes(keyPattern)) {
        keysToDelete.push(key)
      }
    }

    for (const key of keysToDelete) {
      this.memoryCache.delete(key)
    }

    console.log(`🗑️ Invalidated ${keysToDelete.length} KV memory cache entries matching: ${keyPattern}`)
  }

  getStats(): {
    queueLength: number
    inFlightCount: number
    memoryCacheSize: number
    circuitBreakerOpen: boolean
    consecutiveFailures: number
  } {
    return {
      queueLength: this.queue.length,
      inFlightCount: this.inFlightRequests.size,
      memoryCacheSize: this.memoryCache.size,
      circuitBreakerOpen: this.circuitBreakerOpen,
      consecutiveFailures: this.consecutiveFailures
    }
  }
}

export const kvRequestManager = new KVRequestManager()
