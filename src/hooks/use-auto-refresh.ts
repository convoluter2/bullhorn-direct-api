import { useEffect, useRef, useCallback } from 'react'
import { useKV } from '@github/spark/hooks'

export interface AutoRefreshConfig {
  enabled: boolean
  intervalSeconds: number
}

const DEFAULT_CONFIG: AutoRefreshConfig = {
  enabled: false,
  intervalSeconds: 300
}

export function useAutoRefresh(
  refreshCallback: () => void | Promise<void>,
  configKey: string = 'auto-refresh-config'
) {
  const [config, setConfig] = useKV<AutoRefreshConfig>(configKey, DEFAULT_CONFIG)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const refreshCallbackRef = useRef(refreshCallback)

  useEffect(() => {
    refreshCallbackRef.current = refreshCallback
  }, [refreshCallback])

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (!config?.enabled || !config?.intervalSeconds) {
      return
    }

    console.log(`🔄 Auto-refresh enabled: every ${config.intervalSeconds}s`)

    const intervalMs = config.intervalSeconds * 1000

    intervalRef.current = globalThis.setInterval(async () => {
      console.log('🔄 Auto-refresh triggered')
      try {
        await refreshCallbackRef.current()
      } catch (error) {
        console.error('Auto-refresh error:', error)
      }
    }, intervalMs) as ReturnType<typeof setInterval>

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [config?.enabled, config?.intervalSeconds])

  const enable = useCallback((intervalSeconds?: number) => {
    setConfig((current) => ({
      enabled: true,
      intervalSeconds: intervalSeconds ?? current?.intervalSeconds ?? DEFAULT_CONFIG.intervalSeconds
    }))
  }, [setConfig])

  const disable = useCallback(() => {
    setConfig((current) => ({
      enabled: false,
      intervalSeconds: current?.intervalSeconds ?? DEFAULT_CONFIG.intervalSeconds
    }))
  }, [setConfig])

  const setIntervalSeconds = useCallback((intervalSeconds: number) => {
    setConfig((current) => ({
      enabled: current?.enabled ?? false,
      intervalSeconds
    }))
  }, [setConfig])

  const toggle = useCallback(() => {
    setConfig((current) => ({
      enabled: !(current?.enabled ?? false),
      intervalSeconds: current?.intervalSeconds ?? DEFAULT_CONFIG.intervalSeconds
    }))
  }, [setConfig])

  return {
    config: config ?? DEFAULT_CONFIG,
    enabled: config?.enabled ?? false,
    intervalSeconds: config?.intervalSeconds ?? DEFAULT_CONFIG.intervalSeconds,
    enable,
    disable,
    setIntervalSeconds,
    toggle
  }
}
