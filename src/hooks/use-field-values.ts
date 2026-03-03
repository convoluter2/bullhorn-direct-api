import { useState, useEffect, useCallback } from 'react'
import { fieldValueCache, type CachedFieldValue } from '@/lib/field-value-cache'

export interface UseFieldValuesOptions {
  entityType: string
  fields?: string[]
  searchTerm?: string
  enabled?: boolean
  autoLoad?: boolean
}

export function useFieldValues({
  entityType,
  fields = ['id', 'name'],
  searchTerm,
  enabled = true,
  autoLoad = true
}: UseFieldValuesOptions) {
  const [values, setValues] = useState<CachedFieldValue[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const loadValues = useCallback(async (forceRefresh: boolean = false) => {
    if (!enabled || !entityType) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await fieldValueCache.getFieldValues(
        entityType,
        fields,
        searchTerm,
        forceRefresh
      )
      setValues(result)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      console.error(`Failed to load field values for ${entityType}:`, error)
    } finally {
      setIsLoading(false)
    }
  }, [entityType, fields, searchTerm, enabled])

  useEffect(() => {
    if (autoLoad && enabled) {
      loadValues()
    }
  }, [autoLoad, enabled, loadValues])

  const refresh = useCallback(() => {
    return loadValues(true)
  }, [loadValues])

  return {
    values,
    isLoading,
    error,
    refresh,
    loadValues
  }
}

export function useFieldValueById(
  entityType: string,
  id: number | null,
  fields: string[] = ['id', 'name']
) {
  const [value, setValue] = useState<CachedFieldValue | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!entityType || id === null) {
      setValue(null)
      return
    }

    const loadValue = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await fieldValueCache.getFieldValueById(
          entityType,
          id,
          fields
        )
        setValue(result)
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        console.error(`Failed to load field value for ${entityType} id=${id}:`, error)
      } finally {
        setIsLoading(false)
      }
    }

    loadValue()
  }, [entityType, id, fields])

  return {
    value,
    isLoading,
    error
  }
}
