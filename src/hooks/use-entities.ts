import { useState, useEffect, useRef } from 'react'
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
  const [triggerRefresh, setTriggerRefresh] = useState(0)
  const loadingRef = useRef(false)
  const hasLoadedRef = useRef(false)
  const cacheRef = useRef<EntitiesCache | null>(null)

  useEffect(() => {
    cacheRef.current = entitiesCache || null
  }, [entitiesCache])

  useEffect(() => {
    if (loadingRef.current) {
      return
    }

    const loadEntities = async () => {
      loadingRef.current = true
      setLoading(true)
      setError(null)

      try {
        const session = bullhornAPI.getSession()
        
        console.log('=== Entity Loading Debug ===')
        console.log('Has session:', !!session)
        console.log('Trigger refresh:', triggerRefresh)
        console.log('Has loaded ref:', hasLoadedRef.current)
        
        if (!session) {
          console.warn('No Bullhorn session available - waiting for authentication')
          setEntities([])
          setLoading(false)
          loadingRef.current = false
          return
        }

        const cachedData = cacheRef.current
        if (!hasLoadedRef.current && cachedData && cachedData.entities && cachedData.entities.length > 0 && Date.now() - cachedData.lastUpdated < CACHE_DURATION) {
          console.log('Using cached entities:', cachedData.entities.length, 'entities')
          setEntities(cachedData.entities)
          setLoading(false)
          loadingRef.current = false
          hasLoadedRef.current = true
          return
        }

        if (hasLoadedRef.current && triggerRefresh === 0) {
          console.log('Already loaded, skipping...')
          setLoading(false)
          loadingRef.current = false
          return
        }

        console.log('Fetching entities from Bullhorn API...')
        const fetchedEntities = await bullhornAPI.getAllEntities()
        console.log('Fetched entities count:', fetchedEntities.length)
        console.log('First 10 entities:', fetchedEntities.slice(0, 10))
        
        if (fetchedEntities.length === 0) {
          console.warn('No entities returned from API')
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
  }, [triggerRefresh])

  const refresh = () => {
    console.log('Manually refreshing entities...')
    loadingRef.current = false
    setTriggerRefresh(prev => prev + 1)
  }

  const addEntity = (entityName: string) => {
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
  }

  return { entities, loading, error, refresh, addEntity }
}
