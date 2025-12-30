import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Cookie, Trash, Warning, CheckCircle, Broom, Database } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface CookieSessionClearerProps {
  onClear?: () => void
}

export function CookieSessionClearer({ onClear }: CookieSessionClearerProps) {
  const [open, setOpen] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [clearedItems, setClearedItems] = useState<string[]>([])

  const getAllCookies = () => {
    return document.cookie.split(';').map(c => c.trim()).filter(c => c.length > 0)
  }

  const getBullhornCookies = () => {
    const allCookies = getAllCookies()
    return allCookies.filter(cookie => {
      const name = cookie.split('=')[0].toLowerCase()
      return name.includes('bullhorn') || 
             name.includes('bh') || 
             name.includes('auth') ||
             name.includes('oauth') ||
             name.includes('session')
    })
  }

  const getKVStorageKeys = async () => {
    try {
      const keys = await window.spark.kv.keys()
      return keys
    } catch (error) {
      console.error('Failed to get KV keys:', error)
      return []
    }
  }

  const clearBullhornCookies = () => {
    const bullhornCookies = getBullhornCookies()
    const clearedCookieNames: string[] = []

    bullhornCookies.forEach(cookie => {
      const cookieName = cookie.split('=')[0]
      
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname};`
      
      const bullhornDomains = [
        '.bullhornstaffing.com',
        '.bullhorn.com',
        'auth-east.bullhornstaffing.com',
        'auth-west.bullhornstaffing.com',
        'auth-west9.bullhornstaffing.com',
        'welcome.bullhornstaffing.com'
      ]
      
      bullhornDomains.forEach(domain => {
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain};`
      })

      clearedCookieNames.push(cookieName)
    })

    return clearedCookieNames
  }

  const clearAllCookies = () => {
    const allCookies = getAllCookies()
    const clearedCookieNames: string[] = []

    allCookies.forEach(cookie => {
      const cookieName = cookie.split('=')[0]
      
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname};`

      clearedCookieNames.push(cookieName)
    })

    return clearedCookieNames
  }

  const clearSessionStorage = () => {
    const keys = Object.keys(sessionStorage)
    sessionStorage.clear()
    return keys
  }

  const clearLocalStorage = () => {
    const keys = Object.keys(localStorage)
    localStorage.clear()
    return keys
  }

  const handleClearBullhornOnly = async () => {
    setClearing(true)
    setClearedItems([])
    const cleared: string[] = []

    try {
      const cookieNames = clearBullhornCookies()
      if (cookieNames.length > 0) {
        cleared.push(`${cookieNames.length} Bullhorn-related cookies`)
      }

      const sessionKeys = clearSessionStorage()
      if (sessionKeys.length > 0) {
        cleared.push(`${sessionKeys.length} session storage items`)
      }

      setClearedItems(cleared)
      toast.success(`Cleared Bullhorn cookies and session data`)
      
      if (onClear) {
        setTimeout(() => {
          onClear()
        }, 1000)
      }
    } catch (error) {
      console.error('Error clearing Bullhorn data:', error)
      toast.error('Failed to clear some data')
    } finally {
      setClearing(false)
    }
  }

  const handleClearEverything = async () => {
    if (!confirm('⚠️ This will clear ALL cookies, session storage, and local storage. You will lose all saved connections and settings. Continue?')) {
      return
    }

    setClearing(true)
    setClearedItems([])
    const cleared: string[] = []

    try {
      const cookieNames = clearAllCookies()
      if (cookieNames.length > 0) {
        cleared.push(`${cookieNames.length} cookies`)
      }

      const sessionKeys = clearSessionStorage()
      if (sessionKeys.length > 0) {
        cleared.push(`${sessionKeys.length} session storage items`)
      }

      const localKeys = clearLocalStorage()
      if (localKeys.length > 0) {
        cleared.push(`${localKeys.length} local storage items`)
      }

      const kvKeys = await getKVStorageKeys()
      for (const key of kvKeys) {
        await window.spark.kv.delete(key)
      }
      if (kvKeys.length > 0) {
        cleared.push(`${kvKeys.length} KV storage items`)
      }

      setClearedItems(cleared)
      toast.success('Cleared all browser data')
      
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (error) {
      console.error('Error clearing all data:', error)
      toast.error('Failed to clear some data')
    } finally {
      setClearing(false)
    }
  }

  const handleClearKVOnly = async () => {
    if (!confirm('This will clear all saved connections, sessions, and app data from KV storage. Continue?')) {
      return
    }

    setClearing(true)
    setClearedItems([])

    try {
      const kvKeys = await getKVStorageKeys()
      for (const key of kvKeys) {
        await window.spark.kv.delete(key)
      }
      
      setClearedItems([`${kvKeys.length} KV storage items (connections, sessions, logs)`])
      toast.success(`Cleared ${kvKeys.length} KV storage items`)
      
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (error) {
      console.error('Error clearing KV data:', error)
      toast.error('Failed to clear KV data')
    } finally {
      setClearing(false)
    }
  }

  const bullhornCookies = getBullhornCookies()
  const allCookies = getAllCookies()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Cookie />
          Clear Cookies & Cache
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cookie className="text-accent" size={24} weight="duotone" />
            Clear Cookies & Session Data
          </DialogTitle>
          <DialogDescription>
            Clear cached authentication data to resolve connection switching issues
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Alert>
            <Warning className="text-yellow-500" size={18} weight="fill" />
            <AlertDescription className="text-sm">
              <strong>Common Issue:</strong> Browser cookies can cause Bullhorn to return the wrong tenant/corporation when switching connections.
              Clearing Bullhorn-specific cookies usually fixes authentication problems.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-2">Current Browser Data</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Card className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Bullhorn Cookies:</span>
                    <Badge variant={bullhornCookies.length > 0 ? 'default' : 'secondary'}>
                      {bullhornCookies.length}
                    </Badge>
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">All Cookies:</span>
                    <Badge variant="secondary">
                      {allCookies.length}
                    </Badge>
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Session Storage:</span>
                    <Badge variant="secondary">
                      {Object.keys(sessionStorage).length}
                    </Badge>
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Local Storage:</span>
                    <Badge variant="secondary">
                      {Object.keys(localStorage).length}
                    </Badge>
                  </div>
                </Card>
              </div>
            </div>

            {bullhornCookies.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Bullhorn Cookies Found</h4>
                <Card className="p-3 max-h-32 overflow-y-auto">
                  <div className="space-y-1 text-xs font-mono">
                    {bullhornCookies.map((cookie, idx) => (
                      <div key={idx} className="text-muted-foreground truncate">
                        {cookie.split('=')[0]}
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            <Separator />

            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Clear Options</h4>
              
              <Card className="p-4 space-y-3 border-accent/30">
                <div className="flex items-start gap-3">
                  <Broom className="text-accent mt-1" size={20} weight="duotone" />
                  <div className="flex-1">
                    <h5 className="font-semibold text-sm mb-1">Clear Bullhorn Data (Recommended)</h5>
                    <p className="text-xs text-muted-foreground mb-3">
                      Clears Bullhorn-related cookies and session storage. Your saved connections and app data remain intact.
                      <strong className="block mt-1">Use this to fix connection switching issues.</strong>
                    </p>
                    <Button 
                      onClick={handleClearBullhornOnly}
                      disabled={clearing}
                      variant="default"
                      className="w-full"
                    >
                      <Cookie />
                      {clearing ? 'Clearing...' : 'Clear Bullhorn Cookies & Sessions'}
                    </Button>
                  </div>
                </div>
              </Card>

              <Card className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Database className="text-blue-500 mt-1" size={20} weight="duotone" />
                  <div className="flex-1">
                    <h5 className="font-semibold text-sm mb-1">Clear Saved Connections & App Data</h5>
                    <p className="text-xs text-muted-foreground mb-3">
                      Clears all saved connections, credentials, sessions, and logs from KV storage. 
                      <strong className="block mt-1">You will need to re-add all connections.</strong>
                    </p>
                    <Button 
                      onClick={handleClearKVOnly}
                      disabled={clearing}
                      variant="outline"
                      className="w-full"
                    >
                      <Database />
                      {clearing ? 'Clearing...' : 'Clear KV Storage'}
                    </Button>
                  </div>
                </div>
              </Card>

              <Card className="p-4 space-y-3 border-destructive/30">
                <div className="flex items-start gap-3">
                  <Trash className="text-destructive mt-1" size={20} weight="duotone" />
                  <div className="flex-1">
                    <h5 className="font-semibold text-sm mb-1 text-destructive">Clear Everything (Nuclear Option)</h5>
                    <p className="text-xs text-muted-foreground mb-3">
                      Clears ALL cookies, storage, and app data. The page will reload automatically.
                      <strong className="block mt-1 text-destructive">You will lose all saved connections and settings!</strong>
                    </p>
                    <Button 
                      onClick={handleClearEverything}
                      disabled={clearing}
                      variant="destructive"
                      className="w-full"
                    >
                      <Trash />
                      {clearing ? 'Clearing...' : 'Clear Everything & Reload'}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>

            {clearedItems.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <CheckCircle className="text-green-500" size={18} weight="fill" />
                    Items Cleared
                  </h4>
                  <Card className="p-3">
                    <ul className="space-y-1 text-xs">
                      {clearedItems.map((item, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <CheckCircle className="text-green-500" size={14} weight="fill" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </Card>
                </div>
              </>
            )}
          </div>

          <Alert className="border-blue-500/30 bg-blue-500/5">
            <Database className="text-blue-500" size={18} weight="fill" />
            <AlertDescription className="text-xs">
              <strong>Pro Tip:</strong> If you're seeing the wrong tenant after switching connections, first try "Clear Bullhorn Cookies & Sessions".
              This is usually enough to fix authentication caching issues without losing your saved connections.
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  )
}
