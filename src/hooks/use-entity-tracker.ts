import { useEffect } from 'react'
import { useKV } from '@github/spark/hooks'

export function useEntityTracker() {
  const [trackedEntities, setTrackedEntities] = useKV<string[]>('tracked-entities', [])

  const trackEntity = (entityName: string) => {
    setTrackedEntities((current) => {
      const entities = current || []
      if (!entities.includes(entityName)) {
        return [...entities, entityName]
      }
      return entities
    })
  }

  return { trackedEntities: trackedEntities || [], trackEntity }
}

export function trackEntityUsage(entityName: string) {
  const event = new CustomEvent('entity-usage', { detail: { entityName } })
  window.dispatchEvent(event)
}
