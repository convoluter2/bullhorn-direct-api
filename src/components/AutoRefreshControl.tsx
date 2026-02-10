import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Play, Pause, Clock } from '@phosphor-icons/react'
import { useAutoRefresh } from '@/hooks/use-auto-refresh'

interface AutoRefreshControlProps {
  onRefresh: () => void | Promise<void>
  configKey?: string
  compact?: boolean
}

const INTERVAL_OPTIONS = [
  { value: 30, label: '30 seconds' },
  { value: 60, label: '1 minute' },
  { value: 120, label: '2 minutes' },
  { value: 300, label: '5 minutes' },
  { value: 600, label: '10 minutes' },
  { value: 900, label: '15 minutes' },
  { value: 1800, label: '30 minutes' }
]

export function AutoRefreshControl({ onRefresh, configKey = 'auto-refresh-config', compact = false }: AutoRefreshControlProps) {
  const {
    enabled,
    intervalSeconds,
    enable,
    disable,
    setIntervalSeconds,
    toggle
  } = useAutoRefresh(configKey, onRefresh)

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant={enabled ? 'default' : 'outline'}
          size="sm"
          onClick={toggle}
        >
          {enabled ? <Pause weight="fill" /> : <Play weight="fill" />}
          {enabled ? 'Auto-refresh On' : 'Auto-refresh Off'}
        </Button>
        {enabled && (
          <Badge variant="secondary" className="font-mono">
            {intervalSeconds < 60 
              ? `${intervalSeconds}s` 
              : `${Math.floor(intervalSeconds / 60)}m`}
          </Badge>
        )}
      </div>
    )
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="text-accent" size={24} weight="duotone" />
              <div>
                <Label className="text-base font-semibold">Auto-Refresh</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically reload entity lists in the background
                </p>
              </div>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={(checked) => checked ? enable() : disable()}
            />
          </div>

          {enabled && (
            <div className="space-y-2">
              <Label htmlFor="refresh-interval" className="text-sm">
                Refresh Interval
              </Label>
              <Select
                value={String(intervalSeconds)}
                onValueChange={(value) => setIntervalSeconds(Number(value))}
              >
                <SelectTrigger id="refresh-interval">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERVAL_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {enabled && (
            <div className="rounded-md bg-accent/10 border border-accent/20 p-3">
              <p className="text-sm text-accent-foreground">
                <span className="font-semibold">Active:</span> Lists will refresh every{' '}
                {intervalSeconds < 60 
                  ? `${intervalSeconds} seconds` 
                  : intervalSeconds < 3600
                  ? `${Math.floor(intervalSeconds / 60)} minute${Math.floor(intervalSeconds / 60) > 1 ? 's' : ''}`
                  : `${Math.floor(intervalSeconds / 3600)} hour${Math.floor(intervalSeconds / 3600) > 1 ? 's' : ''}`}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
