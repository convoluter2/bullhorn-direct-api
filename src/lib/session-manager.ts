import type { BullhornSession } from './types'

export type SessionInfo = {
  browserId: string
  connectionId: string
  session: BullhornSession
  lastActivity: number
  isRefreshing: boolean
  refreshStartedAt?: number
}

export type SessionAwareness = {
  activeRefreshCount: number
  activeSessions: Array<{
    browserId: string
    connectionId: string
    lastActivity: number
    isRefreshing: boolean
  }>
  currentBrowserHasSession: boolean
}

class SessionManager {
  private browserId: string
  private heartbeatInterval: NodeJS.Timeout | null = null
  private readonly HEARTBEAT_INTERVAL = 5000
  private readonly SESSION_TIMEOUT = 300000
  private readonly REFRESH_TIMEOUT = 60000

  constructor() {
    this.browserId = this.getOrCreateBrowserId()
    this.startHeartbeat()
    console.log('🆔 SessionManager initialized with browserId:', this.browserId)
  }

  private getOrCreateBrowserId(): string {
    const storageKey = 'browser-session-id'
    let browserId = sessionStorage.getItem(storageKey)
    
    if (!browserId) {
      browserId = `browser-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
      sessionStorage.setItem(storageKey, browserId)
      console.log('🆕 Created new browser session ID:', browserId)
    } else {
      console.log('♻️ Using existing browser session ID:', browserId)
    }
    
    return browserId
  }

  getBrowserId(): string {
    return this.browserId
  }

  async saveSession(connectionId: string, session: BullhornSession): Promise<void> {
    const sessionInfo: SessionInfo = {
      browserId: this.browserId,
      connectionId,
      session,
      lastActivity: Date.now(),
      isRefreshing: false
    }

    const key = `session-${this.browserId}-${connectionId}`
    await window.spark.kv.set(key, sessionInfo)
    
    console.log('💾 Session saved:', {
      browserId: this.browserId,
      connectionId,
      corporationId: session.corporationId,
      key
    })
  }

  async getSession(connectionId: string): Promise<BullhornSession | null> {
    const key = `session-${this.browserId}-${connectionId}`
    const sessionInfo = await window.spark.kv.get<SessionInfo>(key)
    
    if (!sessionInfo) {
      console.log('📭 No session found for this browser:', { browserId: this.browserId, connectionId })
      return null
    }

    const now = Date.now()
    const age = now - sessionInfo.lastActivity
    
    if (age > this.SESSION_TIMEOUT) {
      console.log('⏰ Session expired:', {
        browserId: this.browserId,
        connectionId,
        ageMs: age,
        timeoutMs: this.SESSION_TIMEOUT
      })
      await this.clearSession(connectionId)
      return null
    }

    sessionInfo.lastActivity = now
    await window.spark.kv.set(key, sessionInfo)
    
    console.log('📬 Session retrieved and heartbeat updated:', {
      browserId: this.browserId,
      connectionId,
      corporationId: sessionInfo.session.corporationId
    })
    
    return sessionInfo.session
  }

  async clearSession(connectionId: string): Promise<void> {
    const key = `session-${this.browserId}-${connectionId}`
    await window.spark.kv.delete(key)
    console.log('🗑️ Session cleared:', { browserId: this.browserId, connectionId })
  }

  async markRefreshStarted(connectionId: string): Promise<void> {
    const key = `session-${this.browserId}-${connectionId}`
    const sessionInfo = await window.spark.kv.get<SessionInfo>(key)
    
    if (sessionInfo) {
      sessionInfo.isRefreshing = true
      sessionInfo.refreshStartedAt = Date.now()
      sessionInfo.lastActivity = Date.now()
      await window.spark.kv.set(key, sessionInfo)
      
      console.log('🔄 Marked session as refreshing:', {
        browserId: this.browserId,
        connectionId
      })
    }
  }

  async markRefreshCompleted(connectionId: string, newSession: BullhornSession): Promise<void> {
    const sessionInfo: SessionInfo = {
      browserId: this.browserId,
      connectionId,
      session: newSession,
      lastActivity: Date.now(),
      isRefreshing: false,
      refreshStartedAt: undefined
    }

    const key = `session-${this.browserId}-${connectionId}`
    await window.spark.kv.set(key, sessionInfo)
    
    console.log('✅ Marked session refresh complete:', {
      browserId: this.browserId,
      connectionId,
      corporationId: newSession.corporationId
    })
  }

  async getSessionAwareness(connectionId: string): Promise<SessionAwareness> {
    const allKeys = await window.spark.kv.keys()
    const sessionKeys = allKeys.filter(key => 
      key.startsWith('session-') && key.endsWith(`-${connectionId}`)
    )

    const now = Date.now()
    const activeSessions: SessionAwareness['activeSessions'] = []
    let activeRefreshCount = 0
    let currentBrowserHasSession = false

    for (const key of sessionKeys) {
      const sessionInfo = await window.spark.kv.get<SessionInfo>(key)
      
      if (!sessionInfo) continue

      const age = now - sessionInfo.lastActivity
      
      if (sessionInfo.isRefreshing && sessionInfo.refreshStartedAt) {
        const refreshAge = now - sessionInfo.refreshStartedAt
        if (refreshAge > this.REFRESH_TIMEOUT) {
          console.log('⚠️ Stale refresh detected, cleaning up:', {
            browserId: sessionInfo.browserId,
            connectionId: sessionInfo.connectionId,
            refreshAge
          })
          sessionInfo.isRefreshing = false
          sessionInfo.refreshStartedAt = undefined
          await window.spark.kv.set(key, sessionInfo)
        }
      }

      if (age < this.SESSION_TIMEOUT) {
        activeSessions.push({
          browserId: sessionInfo.browserId,
          connectionId: sessionInfo.connectionId,
          lastActivity: sessionInfo.lastActivity,
          isRefreshing: sessionInfo.isRefreshing
        })

        if (sessionInfo.isRefreshing) {
          activeRefreshCount++
        }

        if (sessionInfo.browserId === this.browserId) {
          currentBrowserHasSession = true
        }
      } else {
        console.log('🧹 Cleaning up expired session:', {
          browserId: sessionInfo.browserId,
          connectionId: sessionInfo.connectionId,
          age
        })
        await window.spark.kv.delete(key)
      }
    }

    const awareness: SessionAwareness = {
      activeRefreshCount,
      activeSessions,
      currentBrowserHasSession
    }

    console.log('👀 Session awareness:', {
      connectionId,
      currentBrowser: this.browserId,
      ...awareness
    })

    return awareness
  }

  async cleanupExpiredSessions(): Promise<void> {
    const allKeys = await window.spark.kv.keys()
    const sessionKeys = allKeys.filter(key => key.startsWith('session-'))
    
    const now = Date.now()
    let cleanedCount = 0

    for (const key of sessionKeys) {
      const sessionInfo = await window.spark.kv.get<SessionInfo>(key)
      
      if (!sessionInfo) {
        await window.spark.kv.delete(key)
        cleanedCount++
        continue
      }

      const age = now - sessionInfo.lastActivity
      
      if (age > this.SESSION_TIMEOUT) {
        console.log('🧹 Cleaning expired session:', {
          browserId: sessionInfo.browserId,
          connectionId: sessionInfo.connectionId,
          age,
          key
        })
        await window.spark.kv.delete(key)
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      console.log(`✨ Cleaned ${cleanedCount} expired session(s)`)
    }
  }

  private async updateHeartbeat(): Promise<void> {
    const allKeys = await window.spark.kv.keys()
    const mySessionKeys = allKeys.filter(key => 
      key.startsWith(`session-${this.browserId}-`)
    )

    for (const key of mySessionKeys) {
      const sessionInfo = await window.spark.kv.get<SessionInfo>(key)
      
      if (sessionInfo) {
        sessionInfo.lastActivity = Date.now()
        await window.spark.kv.set(key, sessionInfo)
      }
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }

    this.heartbeatInterval = setInterval(() => {
      this.updateHeartbeat().catch(err => {
        console.error('❌ Heartbeat update failed:', err)
      })
      
      this.cleanupExpiredSessions().catch(err => {
        console.error('❌ Session cleanup failed:', err)
      })
    }, this.HEARTBEAT_INTERVAL)

    console.log('💓 Session heartbeat started')
  }

  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
      console.log('💔 Session heartbeat stopped')
    }
  }

  async getAllActiveSessions(): Promise<SessionInfo[]> {
    const allKeys = await window.spark.kv.keys()
    const sessionKeys = allKeys.filter(key => key.startsWith('session-'))
    
    const sessions: SessionInfo[] = []
    const now = Date.now()

    for (const key of sessionKeys) {
      const sessionInfo = await window.spark.kv.get<SessionInfo>(key)
      
      if (sessionInfo && (now - sessionInfo.lastActivity) < this.SESSION_TIMEOUT) {
        sessions.push(sessionInfo)
      }
    }

    return sessions
  }
}

export const sessionManager = new SessionManager()
