import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { useKV } from '@github/spark/hooks'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { Copy, Info } from '@phosphor-icons/react'
import type { BullhornCredentials, BullhornSession } from '@/lib/types'

interface AuthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAuthenticated: (session: BullhornSession) => void
}

export function AuthDialog({ open, onOpenChange, onAuthenticated }: AuthDialogProps) {
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'credentials' | 'code'>('credentials')
  const [credentials, setCredentials] = useState<BullhornCredentials>({
    clientId: '',
    clientSecret: '',
    username: '',
    password: ''
  })
  const [manualAuth, setManualAuth] = useState({
    clientId: '',
    clientSecret: '',
    authCode: ''
  })
  const [, setStoredCredentials] = useKV<{ clientId: string; clientSecret: string } | null>('bullhorn-credentials', null)

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const session = await bullhornAPI.authenticate(credentials)
      
      setStoredCredentials(() => ({
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret
      }))
      
      toast.success('Successfully authenticated with Bullhorn')
      onAuthenticated(session)
      onOpenChange(false)
      setCredentials({
        clientId: '',
        clientSecret: '',
        username: '',
        password: ''
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const tokenData = await bullhornAPI.exchangeCodeForToken(
        manualAuth.authCode,
        manualAuth.clientId,
        manualAuth.clientSecret
      )
      const session = await bullhornAPI.login(tokenData.accessToken)
      session.refreshToken = tokenData.refreshToken
      session.expiresAt = Date.now() + (tokenData.expiresIn * 1000)
      
      setStoredCredentials(() => ({
        clientId: manualAuth.clientId,
        clientSecret: manualAuth.clientSecret
      }))
      
      toast.success('Successfully authenticated with Bullhorn')
      onAuthenticated(session)
      onOpenChange(false)
      setManualAuth({ clientId: '', clientSecret: '', authCode: '' })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const getAuthUrl = () => {
    const state = Math.random().toString(36).substring(7)
    const redirectUri = `${window.location.origin}/oauth-callback`
    return bullhornAPI.getAuthorizationUrl(manualAuth.clientId || 'YOUR_CLIENT_ID', redirectUri, state)
  }

  const copyAuthUrl = () => {
    const url = getAuthUrl()
    navigator.clipboard.writeText(url)
    toast.success('Authorization URL copied to clipboard')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Connect to Bullhorn</DialogTitle>
          <DialogDescription>
            Choose your authentication method
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as 'credentials' | 'code')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="credentials">Username & Password</TabsTrigger>
            <TabsTrigger value="code">Authorization Code</TabsTrigger>
          </TabsList>

          <TabsContent value="credentials" className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Enter your Bullhorn credentials to authenticate automatically via OAuth flow.
              </AlertDescription>
            </Alert>

            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clientId">Client ID</Label>
                <Input
                  id="clientId"
                  type="text"
                  value={credentials.clientId}
                  onChange={(e) => setCredentials({ ...credentials, clientId: e.target.value })}
                  required
                  disabled={loading}
                  placeholder="Your Bullhorn OAuth Client ID"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientSecret">Client Secret</Label>
                <Input
                  id="clientSecret"
                  type="password"
                  value={credentials.clientSecret}
                  onChange={(e) => setCredentials({ ...credentials, clientSecret: e.target.value })}
                  required
                  disabled={loading}
                  placeholder="Your Bullhorn OAuth Client Secret"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={credentials.username}
                  onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                  required
                  disabled={loading}
                  placeholder="Your Bullhorn username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  required
                  disabled={loading}
                  placeholder="Your Bullhorn password"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? 'Authenticating...' : 'Connect'}
                </Button>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                  Cancel
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="code" className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Get an authorization code from Bullhorn OAuth, then paste it here along with your client credentials.
              </AlertDescription>
            </Alert>

            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="manual-clientId">Client ID</Label>
                <Input
                  id="manual-clientId"
                  type="text"
                  value={manualAuth.clientId}
                  onChange={(e) => setManualAuth({ ...manualAuth, clientId: e.target.value })}
                  required
                  disabled={loading}
                  placeholder="Your Bullhorn OAuth Client ID"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual-clientSecret">Client Secret</Label>
                <Input
                  id="manual-clientSecret"
                  type="password"
                  value={manualAuth.clientSecret}
                  onChange={(e) => setManualAuth({ ...manualAuth, clientSecret: e.target.value })}
                  required
                  disabled={loading}
                  placeholder="Your Bullhorn OAuth Client Secret"
                />
              </div>

              <div className="space-y-2 p-3 bg-muted rounded-lg">
                <Label className="text-sm font-medium">Step 1: Get Authorization Code</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Visit the authorization URL to get your code:
                </p>
                <div className="flex gap-2">
                  <Input
                    value={getAuthUrl()}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={copyAuthUrl}
                  >
                    <Copy size={16} />
                  </Button>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => window.open(getAuthUrl(), '_blank')}
                  className="w-full mt-2"
                  disabled={!manualAuth.clientId}
                >
                  Open Authorization URL
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="authCode">Step 2: Authorization Code</Label>
                <Input
                  id="authCode"
                  type="text"
                  value={manualAuth.authCode}
                  onChange={(e) => setManualAuth({ ...manualAuth, authCode: e.target.value })}
                  required
                  disabled={loading}
                  placeholder="Paste the authorization code from the redirect URL"
                />
                <p className="text-xs text-muted-foreground">
                  After authorizing, copy the 'code' parameter from the redirect URL
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? 'Authenticating...' : 'Connect with Code'}
                </Button>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                  Cancel
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
