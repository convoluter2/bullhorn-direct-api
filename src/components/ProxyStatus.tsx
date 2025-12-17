import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CheckCircle, XCircle, Circle, ArrowClockwise, Terminal, Power } from '@phosphor-icons/react'
import { oauthProxyService } from '@/lib/oauth-proxy'
import { toast } from 'sonner'

export function ProxyStatus() {
  const [proxyHealthy, setProxyHealthy] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(true)
  const [restarting, setRestarting] = useState(false)
  const [healthData, setHealthData] = useState<any>(null)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  const checkProxy = async () => {
    setChecking(true)
    try {
      const isHealthy = await oauthProxyService.checkHealth()
      setProxyHealthy(isHealthy)
      setLastCheck(new Date())
      
      if (isHealthy) {
        try {
          const response = await fetch(`${import.meta.env.VITE_PROXY_URL || 'http://localhost:3001'}/health`)
          const data = await response.json()
          setHealthData(data)
        } catch (e) {
          setHealthData(null)
        }
      }
    } catch (error) {
      setProxyHealthy(false)
      setHealthData(null)
    }
    setChecking(false)
  }

  useEffect(() => {
    checkProxy()
    const interval = setInterval(checkProxy, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleRetry = () => {
    checkProxy()
  }

  const handleRestart = async () => {
    setRestarting(true)
    toast.loading('Restarting proxy server...', { id: 'proxy-restart' })
    
    try {
      const proxyUrl = import.meta.env.VITE_PROXY_URL || 'http://localhost:3001'
      const response = await fetch(`${proxyUrl}/restart`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        toast.success('Proxy server restart initiated', { id: 'proxy-restart' })
        
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        await checkProxy()
        
        if (proxyHealthy) {
          toast.success('Proxy server restarted successfully')
        } else {
          toast.warning('Proxy restart initiated but not yet responding')
        }
      } else {
        throw new Error('Restart request failed')
      }
    } catch (error) {
      console.error('Failed to restart proxy:', error)
      toast.error('Unable to restart proxy server. Please restart manually.', { id: 'proxy-restart' })
    } finally {
      setRestarting(false)
    }
  }

  if (checking && proxyHealthy === null) {
    return (
      <Badge variant="outline" className="gap-1.5 animate-pulse">
        <Circle size={12} className="text-muted-foreground" />
        <span className="text-xs">Checking proxy...</span>
      </Badge>
    )
  }

  if (proxyHealthy) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Badge variant="outline" className="gap-1.5 border-green-500/30 bg-green-500/10 cursor-pointer hover:bg-green-500/20 transition-colors">
            <CheckCircle size={12} className="text-green-600" weight="fill" />
            <span className="text-xs text-green-700">Proxy Ready</span>
          </Badge>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Terminal size={16} className="text-green-600" />
                OAuth Proxy Status
              </h4>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleRetry}
                disabled={checking}
              >
                <ArrowClockwise size={14} className={checking ? 'animate-spin' : ''} />
              </Button>
            </div>
            
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-mono text-green-600">Healthy</span>
              </div>
              {healthData?.uptime && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Uptime:</span>
                  <span className="font-mono">{healthData.uptime}</span>
                </div>
              )}
              {healthData?.port && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Port:</span>
                  <span className="font-mono">{healthData.port}</span>
                </div>
              )}
              {lastCheck && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Check:</span>
                  <span className="font-mono">{lastCheck.toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge variant="outline" className="gap-1.5 border-red-500/30 bg-red-500/10 cursor-pointer hover:bg-red-500/20 transition-colors">
          <XCircle size={12} className="text-red-600" weight="fill" />
          <span className="text-xs text-red-700">Proxy Offline</span>
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <XCircle size={16} className="text-red-600" weight="fill" />
              Proxy Server Offline
            </h4>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRetry}
              disabled={checking}
            >
              <ArrowClockwise size={14} className={checking ? 'animate-spin' : ''} />
            </Button>
          </div>
          
          <div className="space-y-2 text-xs">
            <p className="text-muted-foreground">
              The OAuth proxy server is not responding. Authentication will not work without it.
            </p>
            
            <div className="bg-accent/10 border border-accent/20 p-3 rounded-md space-y-1">
              <div className="text-accent-foreground font-semibold text-xs flex items-center gap-1">
                <Power size={14} className="text-accent" />
                Try restarting the proxy first
              </div>
              <p className="text-muted-foreground text-xs">
                Click the Restart button below to attempt an automatic restart.
              </p>
            </div>
            
            <div className="bg-muted p-3 rounded-md space-y-2 font-mono text-xs">
              <div className="text-foreground">If restart fails, run manually:</div>
              <div className="bg-background p-2 rounded border">
                npm run dev:proxy
              </div>
              <div className="text-muted-foreground">Or restart everything:</div>
              <div className="bg-background p-2 rounded border">
                npm run kill && npm run dev
              </div>
            </div>

            {lastCheck && (
              <div className="flex justify-between pt-2 border-t">
                <span className="text-muted-foreground">Last Check:</span>
                <span className="font-mono">{lastCheck.toLocaleTimeString()}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={handleRetry}
              disabled={checking || restarting}
            >
              {checking ? (
                <>
                  <ArrowClockwise size={14} className="animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <ArrowClockwise size={14} />
                  Retry
                </>
              )}
            </Button>
            
            <Button 
              variant="default" 
              size="sm" 
              className="flex-1"
              onClick={handleRestart}
              disabled={checking || restarting}
            >
              {restarting ? (
                <>
                  <ArrowClockwise size={14} className="animate-spin" />
                  Restarting...
                </>
              ) : (
                <>
                  <Power size={14} />
                  Restart
                </>
              )}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
