import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Lightning, Gauge, ArrowsClockwise } from '@phosphor-icons/react'
import { bullhornAPI } from '@/lib/bullhorn-api'

interface SpeedControlProps {
  onSpeedChange?: (settings: {
    targetCallsPerMinute: number
    speedMultiplier: number
    effectiveCallsPerMinute: number
  }) => void
  compact?: boolean
}

export function SpeedControl({ onSpeedChange, compact = false }: SpeedControlProps) {
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0)
  const [targetCallsPerMinute, setTargetCallsPerMinute] = useState(1000)
  const [effectiveCallsPerMinute, setEffectiveCallsPerMinute] = useState(1000)

  useEffect(() => {
    const settings = bullhornAPI.getSpeedSettings()
    setSpeedMultiplier(settings.speedMultiplier)
    setTargetCallsPerMinute(settings.targetCallsPerMinute)
    setEffectiveCallsPerMinute(settings.effectiveCallsPerMinute)
  }, [])

  const handleSpeedMultiplierChange = (value: number[]) => {
    const newMultiplier = value[0]
    setSpeedMultiplier(newMultiplier)
    bullhornAPI.setSpeedMultiplier(newMultiplier)
    
    const newEffective = Math.min(targetCallsPerMinute * newMultiplier, 1500)
    setEffectiveCallsPerMinute(Math.round(newEffective))
    
    onSpeedChange?.({
      targetCallsPerMinute,
      speedMultiplier: newMultiplier,
      effectiveCallsPerMinute: Math.round(newEffective)
    })
  }

  const handleTargetCallsChange = (value: number[]) => {
    const newTarget = value[0]
    setTargetCallsPerMinute(newTarget)
    bullhornAPI.setTargetCallsPerMinute(newTarget)
    
    const newEffective = Math.min(newTarget * speedMultiplier, 1500)
    setEffectiveCallsPerMinute(Math.round(newEffective))
    
    onSpeedChange?.({
      targetCallsPerMinute: newTarget,
      speedMultiplier,
      effectiveCallsPerMinute: Math.round(newEffective)
    })
  }

  const handleReset = () => {
    bullhornAPI.resetRateLimiter()
    setSpeedMultiplier(1.0)
    setTargetCallsPerMinute(1000)
    setEffectiveCallsPerMinute(1000)
    
    onSpeedChange?.({
      targetCallsPerMinute: 1000,
      speedMultiplier: 1.0,
      effectiveCallsPerMinute: 1000
    })
  }

  const getSpeedLabel = () => {
    if (speedMultiplier >= 1.8) return 'Very Fast'
    if (speedMultiplier >= 1.5) return 'Fast'
    if (speedMultiplier >= 1.2) return 'Faster'
    if (speedMultiplier >= 0.8) return 'Normal'
    if (speedMultiplier >= 0.5) return 'Slower'
    return 'Very Slow'
  }

  const getSpeedColor = () => {
    if (speedMultiplier >= 1.5) return 'default'
    if (speedMultiplier >= 0.8) return 'secondary'
    return 'outline'
  }

  if (compact) {
    return (
      <div className="flex items-center gap-4 p-3 border border-border rounded-lg bg-card/50">
        <div className="flex items-center gap-2">
          <Gauge size={20} className="text-accent" />
          <span className="text-sm font-medium">Processing Speed</span>
        </div>
        
        <div className="flex-1 max-w-xs">
          <Slider
            value={[speedMultiplier]}
            onValueChange={handleSpeedMultiplierChange}
            min={0.1}
            max={2.0}
            step={0.1}
            className="flex-1"
          />
        </div>
        
        <Badge variant={getSpeedColor()}>
          {getSpeedLabel()} ({speedMultiplier.toFixed(1)}x)
        </Badge>
        
        <Badge variant="outline" className="font-mono">
          {effectiveCallsPerMinute}/min
        </Badge>
        
        <Button variant="ghost" size="sm" onClick={handleReset}>
          <ArrowsClockwise />
        </Button>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightning className="text-accent" />
          Processing Speed Control
        </CardTitle>
        <CardDescription>
          Adjust the speed of bulk operations. API limit: 1,500 calls/minute with automatic 429 backoff.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="speed-multiplier">Speed Multiplier</Label>
            <div className="flex items-center gap-2">
              <Badge variant={getSpeedColor()}>
                {getSpeedLabel()}
              </Badge>
              <Badge variant="outline" className="font-mono">
                {speedMultiplier.toFixed(1)}x
              </Badge>
            </div>
          </div>
          <Slider
            id="speed-multiplier"
            value={[speedMultiplier]}
            onValueChange={handleSpeedMultiplierChange}
            min={0.1}
            max={2.0}
            step={0.1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0.1x (Very Slow)</span>
            <span>1.0x (Normal)</span>
            <span>2.0x (Maximum)</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="target-calls">Target Calls Per Minute</Label>
            <Badge variant="outline" className="font-mono">
              {targetCallsPerMinute}
            </Badge>
          </div>
          <Slider
            id="target-calls"
            value={[targetCallsPerMinute]}
            onValueChange={handleTargetCallsChange}
            min={60}
            max={1500}
            step={60}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>60/min</span>
            <span>750/min</span>
            <span>1,500/min (Max)</span>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="space-y-1">
            <div className="text-sm font-medium">Effective Rate</div>
            <div className="text-xs text-muted-foreground">
              Actual API calls per minute
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Gauge size={24} className="text-accent" />
            <span className="text-2xl font-bold font-mono">
              {effectiveCallsPerMinute}
            </span>
            <span className="text-sm text-muted-foreground">/min</span>
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <Button 
            variant="outline" 
            onClick={handleReset}
            className="w-full"
          >
            <ArrowsClockwise />
            Reset to Defaults
          </Button>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Higher speeds use more concurrent requests and lower delays</p>
          <p>• 429 errors trigger automatic exponential backoff</p>
          <p>• API limits are enforced at 1,500 calls/minute maximum</p>
          <p>• Adjust speed based on load size and API response times</p>
        </div>
      </CardContent>
    </Card>
  )
}
