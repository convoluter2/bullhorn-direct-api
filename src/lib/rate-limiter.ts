type RateLimitInfo = {
  limitPerMinute: number
  remaining: number
  resetTime: number
  lastUpdated: number
}

type QueuedRequest = {
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
  private maxConcurrentRequests = 100
  private minDelayBetweenRequests = 50
  private lastRequestTime = 0
  private consecutiveErrors = 0
  private backoffMultiplier = 1
  private targetCallsPerMinute = 1000
  private speedMultiplier = 1.0
  private requestTimestamps: number[] = []
  private readonly HARD_LIMIT_PER_MINUTE = 1500
  private readonly SAFE_LIMIT_PER_MINUTE = 1400
  private backoffUntil = 0
  private maxRetries = 3
  private enableRetry = true

  constructor() {
    this.updateSpeedSettings()
  }

  private cleanupOldRequestTimestamps(): void {
    const oneMinuteAgo = Date.now() - 60000
    this.requestTimestamps = this.requestTimestamps.filter(ts => ts > oneMinuteAgo)
  }

  private getRequestsInLastMinute(): number {
    this.cleanupOldRequestTimestamps()
    return this.requestTimestamps.length
  }

  private isAtHardLimit(): boolean {
    const requestsInLastMinute = this.getRequestsInLastMinute()
    return requestsInLastMinute >= this.SAFE_LIMIT_PER_MINUTE
  }

  parseRateLimitHeaders(headers: Headers): void {
    if (!headers) return
    const limitHeader = headers.get('X-RateLimit-Limit') || headers.get('X-Rate-Limit-Limit')
    const remainingHeader = headers.get('X-RateLimit-Remaining') || headers.get('X-Rate-Limit-Remaining')
    const resetHeader = headers.get('X-RateLimit-Reset') || headers.get('X-Rate-Limit-Reset')

    if (limitHeader || remainingHeader) {
      const limit = limitHeader ? parseInt(limitHeader, 10) : (this.rateLimitInfo?.limitPerMinute || 1500)
      const remaining = remainingHeader ? parseInt(remainingHeader, 10) : (this.rateLimitInfo?.remaining || limit)
      const reset = resetHeader ? parseInt(resetHeader, 10) : Date.now() + 60000

      this.rateLimitInfo = {
        limitPerMinute: limit,
        remaining: remaining,
        resetTime: reset,
        lastUpdated: Date.now()
      }

      console.log('📊 Rate limit info updated from API headers:', {
        limit,
        remaining,
        resetIn: Math.round((reset - Date.now()) / 1000) + 's',
        percentUsed: Math.round(((limit - remaining) / limit) * 100) + '%',
        localTracking: this.getRequestsInLastMinute()
      })

      if (this.targetCallsPerMinute > this.SAFE_LIMIT_PER_MINUTE) {
        console.log(`🎯 Capping target calls/minute to safe limit: ${this.SAFE_LIMIT_PER_MINUTE}`)
        this.targetCallsPerMinute = this.SAFE_LIMIT_PER_MINUTE
        this.updateSpeedSettings()
      }

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
    if (Date.now() < this.backoffUntil) {
      const waitSeconds = Math.ceil((this.backoffUntil - Date.now()) / 1000)
      console.log(`🚫 In backoff period, waiting ${waitSeconds}s more`)
      return true
    }

    if (this.isAtHardLimit()) {
      const requestsInLastMinute = this.getRequestsInLastMinute()
      console.warn(`🔄 Hard limit reached: ${requestsInLastMinute}/${this.SAFE_LIMIT_PER_MINUTE} requests in last minute`)
      return true
    }

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
    if (Date.now() < this.backoffUntil) {
      return this.backoffUntil - Date.now() + 1000
    }

    const requestsInLastMinute = this.getRequestsInLastMinute()
    if (requestsInLastMinute >= this.SAFE_LIMIT_PER_MINUTE) {
      const oldestRequest = this.requestTimestamps[0] || Date.now()
      const timeSinceOldest = Date.now() - oldestRequest
      const timeUntilOldestExpires = 60000 - timeSinceOldest
      console.log(`⏳ At safe limit (${requestsInLastMinute}/${this.SAFE_LIMIT_PER_MINUTE}), waiting ${Math.round(timeUntilOldestExpires / 1000)}s`)
      return Math.max(timeUntilOldestExpires, 1000)
    }

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

    return this.executeRequestInternal(requestFn, 0, 3)
  }

  private async executeRequestInternal(
    requestFn: () => Promise<Response>,
    retryCount: number = 0,
    maxRetries: number = 3
  ): Promise<Response> {
    const effectiveMaxRetries = this.enableRetry ? maxRetries : 0
    
    const delay = this.calculateDelay()
    
    if (delay > 0) {
      console.log(`⏰ Delaying request by ${Math.round(delay)}ms`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }

    this.requestsInProgress++
    this.lastRequestTime = Date.now()
    this.requestTimestamps.push(Date.now())
    this.cleanupOldRequestTimestamps()

    try {
      const response = await requestFn()

      if (!response) {
        throw new Error('No response received from server')
      }

      this.parseRateLimitHeaders(response.headers)

      if (response.status === 429) {
        console.error('🚫 Received 429 Too Many Requests!')
        
        const retryAfter = response.headers?.get('Retry-After')
        let backoffDelay = retryAfter 
          ? parseInt(retryAfter, 10) * 1000 
          : 60000

        this.consecutiveErrors++
        this.backoffMultiplier = Math.min(5, 1 + (this.consecutiveErrors * 0.5))

        backoffDelay = Math.max(backoffDelay, 60000 * this.backoffMultiplier)

        this.backoffUntil = Date.now() + backoffDelay

        if (this.rateLimitInfo) {
          this.rateLimitInfo.remaining = 0
          this.rateLimitInfo.resetTime = Date.now() + backoffDelay
        }

        console.warn(`⏳ 429 received - backing off for ${Math.round(backoffDelay / 1000)}s (attempt ${this.consecutiveErrors}, multiplier: ${this.backoffMultiplier}x)`)
        
        this.requestsInProgress--
        this.processQueue()
        
        await new Promise(resolve => setTimeout(resolve, backoffDelay))
        
        this.requestsInProgress++
        return this.executeRequestInternal(requestFn, retryCount, effectiveMaxRetries)
      }

      if (response.status === 503 || response.status === 502 || response.status === 504) {
        if (retryCount < effectiveMaxRetries) {
          const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 30000)
          console.warn(`⚠️ Server error ${response.status}, retrying in ${retryDelay}ms (attempt ${retryCount + 1}/${effectiveMaxRetries})`)
          
          this.requestsInProgress--
          this.processQueue()
          
          await new Promise(resolve => setTimeout(resolve, retryDelay))
          
          this.requestsInProgress++
          return this.executeRequestInternal(requestFn, retryCount + 1, effectiveMaxRetries)
        } else {
          console.error(`❌ Server error ${response.status} after ${effectiveMaxRetries} retries, giving up`)
        }
      }

      if (response.status >= 500 && response.status < 600) {
        if (retryCount < effectiveMaxRetries) {
          const retryDelay = Math.min(2000 * Math.pow(2, retryCount), 60000)
          console.warn(`⚠️ Server error ${response.status}, retrying in ${retryDelay}ms (attempt ${retryCount + 1}/${effectiveMaxRetries})`)
          
          this.requestsInProgress--
          this.processQueue()
          
          await new Promise(resolve => setTimeout(resolve, retryDelay))
          
          this.requestsInProgress++
          return this.executeRequestInternal(requestFn, retryCount + 1, effectiveMaxRetries)
        } else {
          console.error(`❌ Server error ${response.status} after ${effectiveMaxRetries} retries, giving up`)
        }
      }

      if (response.ok) {
        this.consecutiveErrors = 0
        this.backoffMultiplier = 1
        this.backoffUntil = 0
      }

      return response
    } catch (error) {
      this.requestsInProgress--
      this.processQueue()

      if (error instanceof TypeError && error.message.includes('fetch')) {
        if (retryCount < effectiveMaxRetries) {
          const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 30000)
          console.warn(`⚠️ Network error, retrying in ${retryDelay}ms (attempt ${retryCount + 1}/${effectiveMaxRetries}):`, error.message)
          
          await new Promise(resolve => setTimeout(resolve, retryDelay))
          
          this.requestsInProgress++
          return this.executeRequestInternal(requestFn, retryCount + 1, effectiveMaxRetries)
        } else {
          console.error(`❌ Network error after ${effectiveMaxRetries} retries, giving up:`, error)
          this.consecutiveErrors++
          this.backoffMultiplier = Math.min(5, 1 + (this.consecutiveErrors * 0.5))
          throw error
        }
      }

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

      this.executeRequestInternal(queuedRequest.execute, 0, 3)
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
    requestsInLastMinute: number
    backoffUntil: number
    safeLimit: number
  } {
    return {
      queueLength: this.requestQueue.length,
      requestsInProgress: this.requestsInProgress,
      rateLimitInfo: this.rateLimitInfo,
      backoffMultiplier: this.backoffMultiplier,
      requestsInLastMinute: this.getRequestsInLastMinute(),
      backoffUntil: this.backoffUntil,
      safeLimit: this.SAFE_LIMIT_PER_MINUTE
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
    this.maxConcurrentRequests = Math.max(1, Math.min(200, max))
    console.log(`⚙️ Max concurrent requests set to ${this.maxConcurrentRequests}`)
  }

  setMinDelay(delayMs: number): void {
    this.minDelayBetweenRequests = Math.max(0, delayMs)
    console.log(`⚙️ Min delay between requests set to ${this.minDelayBetweenRequests}ms`)
  }

  setTargetCallsPerMinute(targetCalls: number): void {
    this.targetCallsPerMinute = Math.max(60, Math.min(this.SAFE_LIMIT_PER_MINUTE, targetCalls))
    this.updateSpeedSettings()
    console.log(`🎯 Target calls per minute set to ${this.targetCallsPerMinute} (capped at safe limit: ${this.SAFE_LIMIT_PER_MINUTE})`)
  }

  setSpeedMultiplier(multiplier: number): void {
    this.speedMultiplier = Math.max(0.1, Math.min(2.0, multiplier))
    this.updateSpeedSettings()
    console.log(`⚡ Speed multiplier set to ${this.speedMultiplier}x`)
  }

  private updateSpeedSettings(): void {
    const effectiveCallsPerMinute = this.targetCallsPerMinute * this.speedMultiplier
    
    const baseMinDelay = Math.floor(60000 / effectiveCallsPerMinute)
    this.minDelayBetweenRequests = Math.max(50, baseMinDelay)
    
    const baseConcurrency = Math.max(
      20,
      Math.min(200, Math.ceil(effectiveCallsPerMinute / 10))
    )
    this.maxConcurrentRequests = Math.max(20, Math.min(200, baseConcurrency))
    
    console.log(`📊 Speed settings updated:`, {
      targetCPM: this.targetCallsPerMinute,
      speedMultiplier: this.speedMultiplier,
      effectiveCPM: Math.round(effectiveCallsPerMinute),
      minDelay: this.minDelayBetweenRequests,
      maxConcurrent: this.maxConcurrentRequests,
      theoreticalMaxCPM: Math.round(60000 / Math.max(1, this.minDelayBetweenRequests) * this.maxConcurrentRequests)
    })
  }

  getSpeedSettings(): {
    targetCallsPerMinute: number
    speedMultiplier: number
    effectiveCallsPerMinute: number
    minDelay: number
    maxConcurrent: number
  } {
    const effectiveCallsPerMinute = this.targetCallsPerMinute * this.speedMultiplier
    
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
    this.maxRetries = 3
    this.enableRetry = true
    this.updateSpeedSettings()
    console.log(`🔄 Rate limiter reset to defaults (1000 calls/min, retry enabled with max 3 attempts)`)
  }

  setMaxRetries(maxRetries: number): void {
    this.maxRetries = Math.max(0, Math.min(10, maxRetries))
    console.log(`⚙️ Max retries set to ${this.maxRetries}`)
  }

  setEnableRetry(enable: boolean): void {
    this.enableRetry = enable
    console.log(`⚙️ Retry ${enable ? 'enabled' : 'disabled'}`)
  }

  getRetrySettings(): {
    maxRetries: number
    enableRetry: boolean
  } {
    return {
      maxRetries: this.maxRetries,
      enableRetry: this.enableRetry
    }
  }
}

export const bullhornRateLimiter = new BullhornRateLimiter()
