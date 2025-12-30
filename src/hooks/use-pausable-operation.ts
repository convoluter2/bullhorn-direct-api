import { useState, useCallback, useRef, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'

export interface OperationProgress {
  total: number
  completed: number
  failed: number
  isPaused: boolean
  isStopped: boolean
  startTime: number
  pausedTime: number
  totalPausedDuration: number
  speeds: number[]
  estimatedTimeRemaining: number | null
}

export interface PausableOperationState {
  progress: OperationProgress
  pause: () => void
  resume: () => void
  stop: () => void
  reset: () => void
  updateProgress: (completed: number, failed: number) => void
  canResume: boolean
}

const calculateSpeed = (completed: number, elapsedMs: number): number => {
  if (elapsedMs === 0) return 0
  return (completed / elapsedMs) * 1000
}

const calculateEstimate = (remaining: number, speeds: number[]): number | null => {
  if (speeds.length === 0 || remaining === 0) return null
  
  const recentSpeeds = speeds.slice(-10)
  const avgSpeed = recentSpeeds.reduce((a, b) => a + b, 0) / recentSpeeds.length
  
  if (avgSpeed === 0) return null
  return Math.ceil(remaining / avgSpeed)
}

export function usePausableOperation(
  operationKey: string,
  total: number,
  options?: {
    persistProgress?: boolean
    onComplete?: () => void
  }
): PausableOperationState {
  const persistKey = options?.persistProgress ? `pausable-op-${operationKey}` : null
  
  const [persistedProgress, setPersistedProgress, deletePersistedProgress] = useKV<OperationProgress | null>(
    persistKey || 'temp-key',
    null
  )

  const initialProgress: OperationProgress = {
    total,
    completed: 0,
    failed: 0,
    isPaused: false,
    isStopped: false,
    startTime: Date.now(),
    pausedTime: 0,
    totalPausedDuration: 0,
    speeds: [],
    estimatedTimeRemaining: null
  }

  const [progress, setProgress] = useState<OperationProgress>(() => {
    if (options?.persistProgress && persistedProgress) {
      return { ...persistedProgress, total, isPaused: false }
    }
    return initialProgress
  })

  const pauseResolveRef = useRef<(() => void) | null>(null)
  const lastUpdateTimeRef = useRef<number>(Date.now())
  const lastCompletedRef = useRef<number>(0)

  useEffect(() => {
    if (options?.persistProgress && persistKey) {
      setPersistedProgress(() => progress)
    }
  }, [progress, options?.persistProgress, persistKey, setPersistedProgress])

  useEffect(() => {
    if (progress.completed >= progress.total && progress.total > 0 && !progress.isStopped) {
      options?.onComplete?.()
      if (persistKey && options?.persistProgress) {
        deletePersistedProgress()
      }
    }
  }, [progress.completed, progress.total, progress.isStopped, options, persistKey, deletePersistedProgress])

  const pause = useCallback(() => {
    setProgress(prev => ({
      ...prev,
      isPaused: true,
      pausedTime: Date.now()
    }))
  }, [])

  const resume = useCallback(() => {
    setProgress(prev => {
      const pauseDuration = prev.pausedTime > 0 ? Date.now() - prev.pausedTime : 0
      return {
        ...prev,
        isPaused: false,
        totalPausedDuration: prev.totalPausedDuration + pauseDuration,
        pausedTime: 0
      }
    })
    
    if (pauseResolveRef.current) {
      pauseResolveRef.current()
      pauseResolveRef.current = null
    }
  }, [])

  const stop = useCallback(() => {
    setProgress(prev => ({
      ...prev,
      isStopped: true,
      isPaused: false
    }))
    
    if (pauseResolveRef.current) {
      pauseResolveRef.current()
      pauseResolveRef.current = null
    }
  }, [])

  const reset = useCallback(() => {
    setProgress(initialProgress)
    lastUpdateTimeRef.current = Date.now()
    lastCompletedRef.current = 0
    
    if (persistKey && options?.persistProgress) {
      deletePersistedProgress()
    }
  }, [persistKey, options?.persistProgress, deletePersistedProgress])

  const updateProgress = useCallback((completed: number, failed: number) => {
    setProgress(prev => {
      const now = Date.now()
      const elapsedSinceStart = now - prev.startTime - prev.totalPausedDuration
      const timeSinceLastUpdate = now - lastUpdateTimeRef.current
      const itemsSinceLastUpdate = completed - lastCompletedRef.current
      
      const newSpeeds = [...prev.speeds]
      if (timeSinceLastUpdate > 0 && itemsSinceLastUpdate > 0) {
        const currentSpeed = calculateSpeed(itemsSinceLastUpdate, timeSinceLastUpdate)
        newSpeeds.push(currentSpeed)
        
        if (newSpeeds.length > 20) {
          newSpeeds.shift()
        }
      }
      
      const remaining = prev.total - completed
      const estimate = calculateEstimate(remaining, newSpeeds)
      
      lastUpdateTimeRef.current = now
      lastCompletedRef.current = completed
      
      return {
        ...prev,
        completed,
        failed,
        speeds: newSpeeds,
        estimatedTimeRemaining: estimate
      }
    })
  }, [])

  const canResume = progress.isPaused && progress.completed < progress.total && !progress.isStopped

  return {
    progress,
    pause,
    resume,
    stop,
    reset,
    updateProgress,
    canResume
  }
}

export async function checkPauseState(
  isPaused: boolean,
  isStopped: boolean
): Promise<boolean> {
  if (isStopped) {
    return false
  }
  
  if (isPaused) {
    return new Promise<boolean>((resolve) => {
      const checkInterval = setInterval(() => {
        resolve(true)
        clearInterval(checkInterval)
      }, 100)
    })
  }
  
  return true
}
