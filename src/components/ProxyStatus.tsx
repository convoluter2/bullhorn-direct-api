import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Circle } from '@phosphor-icons/react'
import { oauthProxyService } from '@/lib/oauth-proxy'

export function ProxyStatus() {
  const [proxyHealthy, setProxyHealthy] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const checkProxy = async () => {
      setChecking(true)
      const isHealthy = await oauthProxyService.checkHealth()
      setProxyHealthy(isHealthy)
      setChecking(false)
    }

    checkProxy()

    const interval = setInterval(checkProxy, 30000)

    return () => clearInterval(interval)
  }, [])

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
      <Badge variant="outline" className="gap-1.5 border-green-500/30 bg-green-500/10">
        <CheckCircle size={12} className="text-green-600" weight="fill" />
        <span className="text-xs text-green-700">Proxy Ready</span>
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="gap-1.5 border-yellow-500/30 bg-yellow-500/10">
      <XCircle size={12} className="text-yellow-600" weight="fill" />
      <span className="text-xs text-yellow-700">Proxy Offline</span>
    </Badge>
  )
}
