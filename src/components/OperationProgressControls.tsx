import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Pause, Play, Stop, Clock, TrendUp } from '@phosphor-icons/react'
import type { OperationProgress } from '@/hooks/use-pausable-operation'

interface OperationProgressControlsProps {
  progress: OperationProgress
  onPause: () => void
  onResume: () => void
  onStop: () => void
  operationName?: string
  canResume?: boolean
}

function formatTime(seconds: number | null): string {
  if (seconds === null || !isFinite(seconds)) return 'Calculating...'
  
  if (seconds < 60) {
    return `${seconds}s`
  } else if (seconds < 3600) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  } else {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${mins}m`
  }
}

function calculateCurrentSpeed(speeds: number[]): number {
  if (speeds.length === 0) return 0
  const recentSpeeds = speeds.slice(-5)
  return recentSpeeds.reduce((a, b) => a + b, 0) / recentSpeeds.length
}

export function OperationProgressControls({
  progress,
  onPause,
  onResume,
  onStop,
  operationName = 'Operation',
  canResume = false
}: OperationProgressControlsProps) {
  const percentComplete = progress.total > 0 
    ? Math.round((progress.completed / progress.total) * 100) 
    : 0
  
  const currentSpeed = calculateCurrentSpeed(progress.speeds)
  const speedPerMinute = Math.round(currentSpeed * 60)
  
  const isComplete = progress.completed >= progress.total && progress.total > 0
  const isRunning = !progress.isPaused && !progress.isStopped && !isComplete

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{operationName}</h3>
            {progress.isPaused && (
              <Badge variant="secondary">
                <Pause size={14} className="mr-1" />
                Paused
              </Badge>
            )}
            {progress.isStopped && (
              <Badge variant="destructive">
                <Stop size={14} className="mr-1" />
                Stopped
              </Badge>
            )}
            {isRunning && (
              <Badge variant="default">
                <Play size={14} className="mr-1" />
                Running
              </Badge>
            )}
            {isComplete && (
              <Badge variant="default" className="bg-green-600">
                Complete
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>
              {progress.completed.toLocaleString()} / {progress.total.toLocaleString()} items
            </span>
            {progress.failed > 0 && (
              <span className="text-destructive">
                {progress.failed.toLocaleString()} failed
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isRunning && (
            <Button
              variant="outline"
              size="sm"
              onClick={onPause}
            >
              <Pause />
              Pause
            </Button>
          )}
          
          {(progress.isPaused || canResume) && !progress.isStopped && (
            <Button
              variant="default"
              size="sm"
              onClick={onResume}
            >
              <Play />
              Resume
            </Button>
          )}
          
          {!isComplete && !progress.isStopped && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onStop}
            >
              <Stop />
              Stop
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Progress value={percentComplete} className="h-2" />
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {percentComplete}% complete
          </span>
          
          {isRunning && progress.estimatedTimeRemaining !== null && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock size={14} />
              <span>{formatTime(progress.estimatedTimeRemaining)} remaining</span>
            </div>
          )}
          
          {isRunning && speedPerMinute > 0 && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <TrendUp size={14} />
              <span>{speedPerMinute.toLocaleString()}/min</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
