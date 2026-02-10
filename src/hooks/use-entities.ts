import { useState, useEffect, useRef, useCallback } from 'react'
import { useKV } from '@github/spark/hooks'
import { bullhornAPI } from '@/lib/bullhorn-api'

const CACHE_DURATION = 1000 * 60 * 60 * 24

type EntitiesCache = {
  entities: string[]
  lastUpdated: number
}

export function useEntities() {
  const [entities, setEntities] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [entitiesCache, setEntitiesCache] = useKV<EntitiesCache | null>('entities-cache', null)
  const [lastRefresh, setLastRefresh] = useState<number | null>(null)
  const loadingRef = useRef(false)
  const hasLoadedRef = useRef(false)
  const cacheCheckedRef = useRef(false)

  useEffect(() => {
    if (loadingRef.current || hasLoadedRef.current || cacheCheckedRef.current) {
      return
    }

    cacheCheckedRef.current = true

    const loadEntities = async () => {
      loadingRef.current = true
      setLoading(true)
      setError(null)

      try {
        const session = bullhornAPI.getSession()
        
        if (!session) {
          setEntities([])
          setLoading(false)
          loadingRef.current = false
          return
        }

        if (entitiesCache && entitiesCache.entities && entitiesCache.entities.length > 0 && Date.now() - entitiesCache.lastUpdated < CACHE_DURATION) {
          console.log('Loading entities from cache:', entitiesCache.entities.length)
          setEntities(entitiesCache.entities)
          setLoading(false)
          loadingRef.current = false
          hasLoadedRef.current = true
          return
        }

        console.log('Fetching fresh entities from API using meta endpoint...')
        const metaEntities = await bullhornAPI.getAllEntitiesMeta()
        const fetchedEntities = metaEntities.map(e => e.entity).sort()
        
        if (fetchedEntities.length === 0) {
          setError('No entities available')
        }
        
        setEntities(fetchedEntities)
        hasLoadedRef.current = true
        
        const newCache = {
          entities: fetchedEntities,
          lastUpdated: Date.now()
        }
        setEntitiesCache(() => newCache)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load entities'
        console.error('Failed to load entities:', err)
        setError(errorMessage)
        setEntities([])
      } finally {
        setLoading(false)
        loadingRef.current = false
      }
    }

    loadEntities()
  }, [])

  const refresh = useCallback(() => {
    cacheCheckedRef.current = false
    loadingRef.current = false
    hasLoadedRef.current = false
    setLoading(true)
    
    const loadEntities = async () => {
      loadingRef.current = true

      try {
        const session = bullhornAPI.getSession()
        
        if (!session) {
          setEntities([])
          setLoading(false)
          loadingRef.current = false
          return
        }

        const metaEntities = await bullhornAPI.getAllEntitiesMeta()
        const fetchedEntities = metaEntities.map(e => e.entity).sort()
        
        if (fetchedEntities.length === 0) {
          setError('No entities available')
        }
        
        setEntities(fetchedEntities)
        hasLoadedRef.current = true
        cacheCheckedRef.current = true
        setLastRefresh(Date.now())
        
        const newCache = {
          entities: fetchedEntities,
          lastUpdated: Date.now()
        }
        setEntitiesCache(() => newCache)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load entities'
        console.error('Failed to load entities:', err)
        setError(errorMessage)
        setEntities([])
      } finally {
        setLoading(false)
        loadingRef.current = false
      }
    }

    loadEntities()
  }, [setEntitiesCache])

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
    loadingRef.current = true

    try {
      const metaEntities = await bullhornAPI.getAllEntitiesMeta()
      const fetchedEntities = metaEntities.map(e => e.entity).sort()
      
      setEntities(fetchedEntities)
      setLastRefresh(Date.now())
      
      const newCache = {
        entities: fetchedEntities,
        lastUpdated: Date.now()
      }
      setEntitiesCache(() => newCache)
      
      console.log('✅ Background refresh completed:', fetchedEntities.length, 'entities')
    } catch (err) {
      console.error('❌ Background refresh failed:', err)
    } finally {
      loadingRef.current = false
    }
  }, [setEntitiesCache])

  const addEntity = useCallback((entityName: string) => {
    const trimmedName = entityName.trim()
    if (!trimmedName) {
      return false
    }
    
    if (entities.includes(trimmedName)) {
      return false
    }
    
    const newEntities = [...entities, trimmedName].sort()
    setEntities(newEntities)
    setEntitiesCache(() => ({
      entities: newEntities,
      lastUpdated: Date.now()
    }))
    
    return true
  }, [entities, setEntitiesCache])

  return { entities, loading, error, refresh, refreshInBackground, addEntity, lastRefresh }
}
