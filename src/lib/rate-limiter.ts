interface RateLimitInfo {
  limitPerMinute: number
  remaining: number
  resetTime: number
  lastUpdated: number
}

interface QueuedRequest {
  execute: () => Promise<Response>
  resolve: (value: Response) => void
  reject: (error: Error) => void
  priority: number
  addedAt: number
}

export class BullhornRateLimiter {
  private rateLimitInfo: RateLimitInfo | null = null
  private requestQueue: QueuedRequest[] = []
  private isProcessing = false
  private requestsInProgress = 0
  private maxConcurrentRequests = 3
  private minDelayBetweenRequests = 100
  private lastRequestTime = 0
  private consecutiveErrors = 0
  private backoffMultiplier = 1
  private targetCallsPerMinute = 1000
  private speedMultiplier = 1.0

  constructor() {
    this.updateSpeedSettings()
  }

  parseRateLimitHeaders(headers: Headers): void {
    const limitHeader = headers.get('X-RateLimit-Limit') || headers.get('X-Rate-Limit-Limit')
    const remainingHeader = headers.get('X-RateLimit-Remaining') || headers.get('X-Rate-Limit-Remaining')
    const resetHeader = headers.get('X-RateLimit-Reset') || headers.get('X-Rate-Limit-Reset')

    if (limitHeader || remainingHeader) {
      const limit = limitHeader ? parseInt(limitHeader, 10) : (this.rateLimitInfo?.limitPerMinute || 60)
      const remaining = remainingHeader ? parseInt(remainingHeader, 10) : (this.rateLimitInfo?.remaining || limit)
      const reset = resetHeader ? parseInt(resetHeader, 10) : Date.now() + 60000

      this.rateLimitInfo = {
        limitPerMinute: limit,
        remaining: remaining,
        resetTime: reset,
        lastUpdated: Date.now()
      }

      console.log('📊 Rate limit info updated:', {
        limit,
        remaining,
        resetIn: Math.round((reset - Date.now()) / 1000) + 's',
        percentUsed: Math.round(((limit - remaining) / limit) * 100) + '%'
      })

      if (remaining < limit * 0.2) {
        console.warn('⚠️ API rate limit usage high:', {
          remaining,
          limit,
          percentRemaining: Math.round((remaining / limit) * 100) + '%'
        })
      }

      if (remaining === 0) {
        console.error('🚫 API rate limit exhausted! Requests will be queued until reset.')
      }

      this.consecutiveErrors = 0
      this.backoffMultiplier = 1
    }
  }

  getRateLimitInfo(): RateLimitInfo | null {
    return this.rateLimitInfo
  }

  shouldThrottle(): boolean {
    if (!this.rateLimitInfo) {
      return false
    }

    const now = Date.now()

    if (now > this.rateLimitInfo.resetTime) {
      this.rateLimitInfo.remaining = this.rateLimitInfo.limitPerMinute
      this.rateLimitInfo.resetTime = now + 60000
      console.log('♻️ Rate limit window reset')
      return false
    }

    const bufferThreshold = Math.max(5, Math.floor(this.rateLimitInfo.limitPerMinute * 0.1))
    
    if (this.rateLimitInfo.remaining <= bufferThreshold) {
      console.warn(`🔄 Throttling: Only ${this.rateLimitInfo.remaining} requests remaining (threshold: ${bufferThreshold})`)
      return true
    }

    if (this.requestQueue.length > 0) {
      console.log(`🔄 Throttling: ${this.requestQueue.length} requests already queued`)
      return true
    }

    return false
  }

  private calculateDelay(): number {
    if (!this.rateLimitInfo) {
      return this.minDelayBetweenRequests * this.backoffMultiplier
    }

    const now = Date.now()
    const timeUntilReset = Math.max(0, this.rateLimitInfo.resetTime - now)

    if (this.rateLimitInfo.remaining === 0) {
      console.log(`⏳ Rate limit exhausted, waiting ${Math.round(timeUntilReset / 1000)}s for reset`)
      return timeUntilReset + 1000
    }

    const bufferThreshold = Math.max(5, Math.floor(this.rateLimitInfo.limitPerMinute * 0.1))
    
    if (this.rateLimitInfo.remaining < bufferThreshold && timeUntilReset > 0) {
      const conservativeDelay = Math.max(
        timeUntilReset / Math.max(1, this.rateLimitInfo.remaining),
        this.minDelayBetweenRequests * 2
      )
      console.log(`⏱️ Conservative throttling: ${Math.round(conservativeDelay)}ms delay (${this.rateLimitInfo.remaining} requests remaining)`)
      return conservativeDelay * this.backoffMultiplier
    }

    const timeSinceLastRequest = now - this.lastRequestTime
    const minDelay = this.minDelayBetweenRequests * this.backoffMultiplier
    
    if (timeSinceLastRequest < minDelay) {
      return minDelay - timeSinceLastRequest
    }

    return 0
  }

  async executeRequest(
    requestFn: () => Promise<Response>,
    priority: number = 0
  ): Promise<Response> {
    if (this.shouldThrottle() || this.requestsInProgress >= this.maxConcurrentRequests) {
      console.log(`📥 Queuing request (priority: ${priority}, queue size: ${this.requestQueue.length})`)
      return new Promise<Response>((resolve, reject) => {
        this.requestQueue.push({
          execute: requestFn,
          resolve,
          reject,
          priority,
          addedAt: Date.now()
        })
        this.requestQueue.sort((a, b) => {
          if (a.priority !== b.priority) {
            return b.priority - a.priority
          }
          return a.addedAt - b.addedAt
        })
        this.processQueue()
      })
    }

    return this.executeRequestInternal(requestFn)
  }

  private async executeRequestInternal(requestFn: () => Promise<Response>): Promise<Response> {
    const delay = this.calculateDelay()
    
    if (delay > 0) {
      console.log(`⏰ Delaying request by ${Math.round(delay)}ms`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }

    this.requestsInProgress++
    this.lastRequestTime = Date.now()

    try {
      const response = await requestFn()

      this.parseRateLimitHeaders(response.headers)

      if (response.status === 429) {
        console.error('🚫 Received 429 Too Many Requests!')
        
        const retryAfter = response.headers.get('Retry-After')
        const retryDelay = retryAfter 
          ? parseInt(retryAfter, 10) * 1000 
          : 60000

        this.consecutiveErrors++
        this.backoffMultiplier = Math.min(5, 1 + (this.consecutiveErrors * 0.5))

        if (this.rateLimitInfo) {
          this.rateLimitInfo.remaining = 0
          this.rateLimitInfo.resetTime = Date.now() + retryDelay
        }

        console.warn(`⏳ Rate limited - waiting ${Math.round(retryDelay / 1000)}s before retry (backoff: ${this.backoffMultiplier}x)`)
        
        await new Promise(resolve => setTimeout(resolve, retryDelay))
        
        return this.executeRequestInternal(requestFn)
      }

      if (response.ok) {
        this.consecutiveErrors = 0
        this.backoffMultiplier = 1
      }

      return response
    } catch (error) {
      this.consecutiveErrors++
      this.backoffMultiplier = Math.min(5, 1 + (this.consecutiveErrors * 0.5))
      throw error
    } finally {
      this.requestsInProgress--
      this.processQueue()
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return
    }

    if (this.requestsInProgress >= this.maxConcurrentRequests) {
      return
    }

    this.isProcessing = true

    while (this.requestQueue.length > 0 && this.requestsInProgress < this.maxConcurrentRequests) {
      if (this.rateLimitInfo && this.rateLimitInfo.remaining === 0) {
        const now = Date.now()
        if (now < this.rateLimitInfo.resetTime) {
          const waitTime = this.rateLimitInfo.resetTime - now
          console.log(`⏳ Queue paused: waiting ${Math.round(waitTime / 1000)}s for rate limit reset`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
          this.rateLimitInfo.remaining = this.rateLimitInfo.limitPerMinute
        }
      }

      const queuedRequest = this.requestQueue.shift()
      if (!queuedRequest) {
        break
      }

      const queueTime = Date.now() - queuedRequest.addedAt
      console.log(`📤 Processing queued request (waited: ${Math.round(queueTime)}ms, remaining queue: ${this.requestQueue.length})`)

      this.executeRequestInternal(queuedRequest.execute)
        .then(queuedRequest.resolve)
        .catch(queuedRequest.reject)
    }

    this.isProcessing = false
  }

  getQueueStatus(): { 
    queueLength: number
    requestsInProgress: number
    rateLimitInfo: RateLimitInfo | null
    backoffMultiplier: number
  } {
    return {
      queueLength: this.requestQueue.length,
      requestsInProgress: this.requestsInProgress,
      rateLimitInfo: this.rateLimitInfo,
      backoffMultiplier: this.backoffMultiplier
    }
  }

  clearQueue(): void {
    const clearedCount = this.requestQueue.length
    this.requestQueue.forEach(req => {
      req.reject(new Error('Request queue cleared'))
    })
    this.requestQueue = []
    console.log(`🗑️ Cleared ${clearedCount} queued requests`)
  }

  setMaxConcurrentRequests(max: number): void {
    this.maxConcurrentRequests = Math.max(1, Math.min(10, max))
    console.log(`⚙️ Max concurrent requests set to ${this.maxConcurrentRequests}`)
  }

  setMinDelay(delayMs: number): void {
    this.minDelayBetweenRequests = Math.max(0, delayMs)
    console.log(`⚙️ Min delay between requests set to ${this.minDelayBetweenRequests}ms`)
  }

  setTargetCallsPerMinute(targetCalls: number): void {
    this.targetCallsPerMinute = Math.max(60, Math.min(1500, targetCalls))
    this.updateSpeedSettings()
    console.log(`🎯 Target calls per minute set to ${this.targetCallsPerMinute}`)
  }

  setSpeedMultiplier(multiplier: number): void {
    this.speedMultiplier = Math.max(0.1, Math.min(2.0, multiplier))
    this.updateSpeedSettings()
    console.log(`⚡ Speed multiplier set to ${this.speedMultiplier}x`)
  }

  private updateSpeedSettings(): void {
    const effectiveCallsPerMinute = Math.min(
      this.targetCallsPerMinute * this.speedMultiplier,
      1500
    )
    
    const baseMinDelay = Math.ceil(60000 / effectiveCallsPerMinute)
    this.minDelayBetweenRequests = baseMinDelay
    
    const baseConcurrency = Math.ceil(effectiveCallsPerMinute / 600)
    this.maxConcurrentRequests = Math.max(1, Math.min(10, baseConcurrency))
    
    console.log(`📊 Speed settings updated:`, {
      targetCPM: this.targetCallsPerMinute,
      speedMultiplier: this.speedMultiplier,
      effectiveCPM: Math.round(effectiveCallsPerMinute),
      minDelay: this.minDelayBetweenRequests,
      maxConcurrent: this.maxConcurrentRequests
    })
  }

  getSpeedSettings(): {
    targetCallsPerMinute: number
    speedMultiplier: number
    effectiveCallsPerMinute: number
    minDelay: number
    maxConcurrent: number
  } {
    const effectiveCallsPerMinute = Math.min(
      this.targetCallsPerMinute * this.speedMultiplier,
      1500
    )
    
    return {
      targetCallsPerMinute: this.targetCallsPerMinute,
      speedMultiplier: this.speedMultiplier,
      effectiveCallsPerMinute: Math.round(effectiveCallsPerMinute),
      minDelay: this.minDelayBetweenRequests,
      maxConcurrent: this.maxConcurrentRequests
    }
  }

  resetToDefaults(): void {
    this.targetCallsPerMinute = 1000
    this.speedMultiplier = 1.0
    this.updateSpeedSettings()
    console.log(`🔄 Rate limiter reset to defaults`)
  }
}

export const bullhornRateLimiter = new BullhornRateLimiter()
