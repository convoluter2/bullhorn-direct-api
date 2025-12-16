import { useState, useEffect, useRef, useCallback } from 'react'
import { useKV } from '@github/spark/hooks'
import { bullhornAPI } from '@/lib/bullhorn-api'

const CACHE_DURATION = 1000 * 60 * 60 * 24

interface EntitiesCache {
  entities: string[]
  lastUpdated: number
}

export function useEntities() {
  const [entities, setEntities] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [entitiesCache, setEntitiesCache] = useKV<EntitiesCache | null>('entities-cache', null)
  const loadingRef = useRef(false)
  const hasLoadedRef = useRef(false)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (initializedRef.current || loadingRef.current) {
      return
    }

    const loadEntities = async () => {
      initializedRef.current = true
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
          setEntities(entitiesCache.entities)
          setLoading(false)
          loadingRef.current = false
          hasLoadedRef.current = true
          return
        }

        const fetchedEntities = await bullhornAPI.getAllEntities()
        
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
  }, [entitiesCache, setEntitiesCache])

  const refresh = useCallback(() => {
    initializedRef.current = false
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

        const fetchedEntities = await bullhornAPI.getAllEntities()
        
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

  return { entities, loading, error, refresh, addEntity }
}
