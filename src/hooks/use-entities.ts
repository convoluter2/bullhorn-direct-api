import { useState, useEffect } from 'react'
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

  useEffect(() => {
    const loadEntities = async () => {
      setLoading(true)
      setError(null)

      try {
        if (entitiesCache && Date.now() - entitiesCache.lastUpdated < CACHE_DURATION) {
          setEntities(entitiesCache.entities)
          setLoading(false)
          return
        }

        const fetchedEntities = await bullhornAPI.getAllEntities()
        
        setEntities(fetchedEntities)
        setEntitiesCache(() => ({
          entities: fetchedEntities,
          lastUpdated: Date.now()
        }))
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load entities'
        setError(errorMessage)
        setEntities([])
      } finally {
        setLoading(false)
      }
    }

    loadEntities()
  }, [])

  return { entities, loading, error }
}
