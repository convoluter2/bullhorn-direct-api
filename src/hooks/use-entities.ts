import { useState, useEffect, useRef, useCallback } from 'react'
import { entityCacheService } from '@/lib/entity-cache-service'
import { bullhornAPI } from '@/lib/bullhorn-api'

export function useEntities() {
  const [entities, setEntities] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<number | null>(null)
  const [cacheStatus, setCacheStatus] = useState<{
    entityCount: number
    lastRefresh: number | null
    nextRefresh: number | null
    manualCount: number
    apiCount: number
  } | null>(null)
  const loadingRef = useRef(false)
  const hasLoadedRef = useRef(false)
  const backgroundRefreshStarted = useRef(false)

  useEffect(() => {
    if (loadingRef.current || hasLoadedRef.current) {
      return
    }

    const loadEntities = async () => {
      loadingRef.current = true
      setLoading(true)
      setError(null)

      try {
        const session = bullhornAPI.getSession()
        
        if (!session) {
          console.log('⚠️ No session found, skipping entity load')
          setEntities([])
          setLoading(false)
          loadingRef.current = false
          hasLoadedRef.current = true
          return
        }

        console.log('📦 Loading entities...')
        const cachedEntities = await entityCacheService.getEntityList()
        
        if (cachedEntities && cachedEntities.length > 0) {
          console.log('✅ Loading entities from persistent cache:', cachedEntities.length)
          setEntities(cachedEntities.map(e => e.entity))
          const status = await entityCacheService.getCacheStatus()
          setCacheStatus(status)
          setLastRefresh(status.lastRefresh)
        } else {
          console.log('🔄 No cache found, performing initial refresh...')
          const refreshedEntities = await entityCacheService.refreshEntityList()
          setEntities(refreshedEntities.map(e => e.entity))
          const status = await entityCacheService.getCacheStatus()
          setCacheStatus(status)
          setLastRefresh(status.lastRefresh)
        }
        
        hasLoadedRef.current = true
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load entities'
        console.error('❌ Failed to load entities:', err)
        setError(errorMessage)
        setEntities([])
        hasLoadedRef.current = true
      } finally {
        setLoading(false)
        loadingRef.current = false
      }
    }

    loadEntities().catch(err => {
      console.error('❌ Unexpected error in loadEntities:', err)
      setLoading(false)
      loadingRef.current = false
      hasLoadedRef.current = true
    })
  }, [])

  useEffect(() => {
    const session = bullhornAPI.getSession()
    if (session && !backgroundRefreshStarted.current) {
      backgroundRefreshStarted.current = true
      console.log('🔄 Starting background entity refresh service...')
      entityCacheService.startBackgroundRefresh()
    }

    return () => {
      if (backgroundRefreshStarted.current) {
        entityCacheService.stopBackgroundRefresh()
        backgroundRefreshStarted.current = false
      }
    }
  }, [])

  const refresh = useCallback(async () => {
    loadingRef.current = false
    hasLoadedRef.current = false
    setLoading(true)
    
    try {
      const session = bullhornAPI.getSession()
      
      if (!session) {
        setEntities([])
        setLoading(false)
        return
      }

      const refreshedEntities = await entityCacheService.refreshEntityList()
      setEntities(refreshedEntities.map(e => e.entity))
      const status = await entityCacheService.getCacheStatus()
      setCacheStatus(status)
      setLastRefresh(Date.now())
      hasLoadedRef.current = true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load entities'
      console.error('Failed to load entities:', err)
      setError(errorMessage)
      setEntities([])
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshInBackground = useCallback(async () => {
    if (loadingRef.current) {
      console.log('🔄 Background refresh skipped - already loading')
      return
    }

    const session = bullhornAPI.getSession()
    if (!session) {
      console.log('🔄 Background refresh skipped - no session')
      return
    }

    console.log('🔄 Background refresh starting...')

    try {
      const refreshedEntities = await entityCacheService.refreshEntityList(true)
      setEntities(refreshedEntities.map(e => e.entity))
      const status = await entityCacheService.getCacheStatus()
      setCacheStatus(status)
      setLastRefresh(Date.now())
      
      console.log('✅ Background refresh completed:', refreshedEntities.length, 'entities')
    } catch (err) {
      console.error('❌ Background refresh failed:', err)
    }
  }, [])

  const addEntity = useCallback(async (entityName: string) => {
    const trimmedName = entityName.trim()
    if (!trimmedName) {
      return false
    }
    
    if (entities.includes(trimmedName)) {
      return false
    }
    
    const added = await entityCacheService.addManualEntity(trimmedName)
    if (added) {
      const updatedEntities = await entityCacheService.getEntityList()
      setEntities(updatedEntities.map(e => e.entity))
      const status = await entityCacheService.getCacheStatus()
      setCacheStatus(status)
    }
    
    return added
  }, [entities])

  return { 
    entities, 
    loading, 
    error, 
    refresh, 
    refreshInBackground, 
    addEntity, 
    lastRefresh,
    cacheStatus
  }
}
