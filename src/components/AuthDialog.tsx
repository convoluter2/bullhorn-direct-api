import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { secureCredentialsAPI } from '@/lib/secure-credentials'
import { Copy, Info } from '@phosphor-icons/react'
import type { SavedConnection } from '@/components/ConnectionManager'
import type { BullhornSession } from '@/lib/types'

interface AuthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAuthenticated: (session: BullhornSession, connectionId?: string) => void
  preselectedConnection?: SavedConnection | null
}

export function AuthDialog({ open, onOpenChange, onAuthenticated, preselectedConnection }: AuthDialogProps) {
  const [loading, setLoading] = useState(false)
  const [manualAuth, setManualAuth] = useState({
    clientId: '',
    clientSecret: '',
    username: '',
    password: '',
    authCode: '',
    useAutomatedFlow: true
  })

  useEffect(() => {
    const loadConnectionCredentials = async () => {
      if (open && preselectedConnection) {
        const credentials = await secureCredentialsAPI.getCredentials(preselectedConnection.id)
        if (credentials) {
          setManualAuth({
            clientId: credentials.clientId,
            clientSecret: credentials.clientSecret,
            username: credentials.username,
            password: credentials.password,
            authCode: '',
            useAutomatedFlow: true
          })
        }
      } else if (open && !preselectedConnection) {
        setManualAuth(prev => ({
          ...prev,
          useAutomatedFlow: true
        }))
      }
    }
    loadConnectionCredentials()
  }, [open, preselectedConnection])
  
  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (manualAuth.authCode) {
        let codeToUse = manualAuth.authCode
        if (codeToUse.includes('%3A') || codeToUse.includes('%2F')) {
          codeToUse = decodeURIComponent(codeToUse)
          console.log('Code was URL-encoded, decoded it')
        }
          
        const tokenData = await bullhornAPI.exchangeCodeForToken(
          codeToUse,
          manualAuth.clientId,
          manualAuth.clientSecret
        )
        const session = await bullhornAPI.login(tokenData.accessToken)
        session.refreshToken = tokenData.refreshToken
        session.expiresAt = Date.now() + (tokenData.expiresIn * 1000)
        
        toast.success('Successfully authenticated with Bullhorn')
        onAuthenticated(session, preselectedConnection?.id)
        onOpenChange(false)
        setManualAuth({ 
          clientId: '', 
          clientSecret: '',
          username: '',
          password: '', 
          authCode: '', 
          useAutomatedFlow: true
        })
      } else {
        toast.loading('Authenticating with saved credentials...', { id: 'auto-auth' })
        
        const session = await bullhornAPI.authenticate({
          clientId: manualAuth.clientId,
          clientSecret: manualAuth.clientSecret,
          username: manualAuth.username,
          password: manualAuth.password
        })
        
        toast.success('Successfully authenticated with Bullhorn', { id: 'auto-auth' })
        onAuthenticated(session, preselectedConnection?.id)
        onOpenChange(false)
        setManualAuth({ 
          clientId: '', 
          clientSecret: '',
          username: '',
          password: '', 
          authCode: '', 
          useAutomatedFlow: true
        })
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Authentication failed', { id: 'auto-auth' })
    } finally {
      setLoading(false)
    }
  }

  const getAuthUrl = () => {
    const state = Math.random().toString(36).substring(7)
    const clientId = manualAuth.clientId || 'YOUR_CLIENT_ID'
    
    return bullhornAPI.getAuthorizationUrl(clientId, undefined, state, manualAuth.username, manualAuth.password)
  }
  
  const handleStartOAuthFlow = async () => {
    if (!manualAuth.clientId || !manualAuth.clientSecret) {
      toast.error('Please enter your Client ID and Client Secret first')
      return
    }

    try {
      await window.spark.kv.set('pending-oauth-auth', {
        clientId: manualAuth.clientId,
        clientSecret: manualAuth.clientSecret,
        connectionId: preselectedConnection?.id,
        timestamp: Date.now()
      })

      toast.loading('Redirecting to Bullhorn...', { id: 'oauth-redirect' })

      const authUrl = getAuthUrl()
      window.location.href = authUrl
    } catch (error) {
      toast.error('Failed to store OAuth session. Please try again.', { id: 'oauth-redirect' })
      console.error('Failed to store pending auth:', error)
    }
  }

  const copyAuthUrl = async () => {
    const url = getAuthUrl()
    navigator.clipboard.writeText(url)

    await window.spark.kv.set('pending-oauth-auth', {
      clientId: manualAuth.clientId,
      clientSecret: manualAuth.clientSecret,
      connectionId: preselectedConnection?.id,
      timestamp: Date.now()
    })
    
    toast.success('Authorization URL copied to clipboard')
  }

  const handleOpenAuthUrl = async () => {
    await window.spark.kv.set('pending-oauth-auth', {
      clientId: manualAuth.clientId,
      clientSecret: manualAuth.clientSecret,
      connectionId: preselectedConnection?.id,
      timestamp: Date.now()
    })

    window.open(getAuthUrl(), '_blank')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Connect to Bullhorn</DialogTitle>
          <DialogDescription>
            Fully automated OAuth authentication - no redirect URI needed!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <p className="font-medium">✨ Simplified OAuth Authentication</p>
              <p className="text-xs">
                <strong>Recommended:</strong> Use "Start Automated OAuth Flow" for fully automatic authentication. 
                No redirect URI configuration needed - we'll handle everything automatically.
              </p>
              <p className="text-xs mt-1">
                <strong>Fallback:</strong> If automated flow doesn't work, disable it to try programmatic authentication.
              </p>
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
                placeholder="a6a33789-1490-4888-994e-345f22808e41"
              />
              <p className="text-xs text-muted-foreground">
                Your Bullhorn OAuth Client ID
              </p>
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

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={manualAuth.username}
                onChange={(e) => setManualAuth({ ...manualAuth, username: e.target.value })}
                required
                disabled={loading}
                placeholder="Your Bullhorn username"
              />
              <p className="text-xs text-muted-foreground">
                Added to authorization URL for automatic login
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={manualAuth.password}
                onChange={(e) => setManualAuth({ ...manualAuth, password: e.target.value })}
                required
                disabled={loading}
                placeholder="Your Bullhorn password"
              />
              <p className="text-xs text-muted-foreground">
                Added to authorization URL for automatic login
              </p>
            </div>

            <div className="space-y-3 p-4 bg-muted/50 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">✨ Automated OAuth Mode (Recommended)</Label>
                <div className="flex items-center gap-2">
                  <Label htmlFor="useAutomatedFlow" className="text-xs text-muted-foreground cursor-pointer">
                    Enable
                  </Label>
                  <input
                    id="useAutomatedFlow"
                    type="checkbox"
                    checked={manualAuth.useAutomatedFlow}
                    onChange={(e) => setManualAuth({ 
                      ...manualAuth, 
                      useAutomatedFlow: e.target.checked
                    })}
                    className="cursor-pointer"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                <strong>Enabled:</strong> Fully automated authentication - you'll be redirected to Bullhorn to log in, 
                then automatically returned. <strong>No redirect URI configuration needed</strong> - the app handles everything.
              </p>
              <p className="text-xs text-muted-foreground">
                <strong>Disabled:</strong> Fallback to programmatic authentication (may not work in all browsers) 
                or manual code entry.
              </p>
            </div>

            {!manualAuth.useAutomatedFlow && (
              <>
                <div className="space-y-2 p-3 bg-muted rounded-lg">
                  <Label className="text-sm font-medium">Authorization Code (Optional)</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Only needed if using manual OAuth flow. Leave blank to use Quick Connect (programmatic auth).
                  </p>
                  <Input
                    id="manual-authCode"
                    type="text"
                    value={manualAuth.authCode}
                    onChange={(e) => setManualAuth({ ...manualAuth, authCode: e.target.value })}
                    disabled={loading}
                    placeholder="25184_8090191_44:0e19f0db-1c33-4409-b914-af5345c2b885"
                  />
                  <p className="text-xs text-muted-foreground">
                    Get this from the Bullhorn OAuth authorization response URL
                  </p>
                </div>

                <div className="space-y-2 p-3 bg-muted rounded-lg">
                  <Label className="text-sm font-medium">Get Authorization Code (Manual)</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Open the authorization URL in a popup, log in to Bullhorn, and copy the code from the result URL.
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
                    onClick={handleOpenAuthUrl}
                    className="w-full mt-2"
                    disabled={!manualAuth.clientId || !manualAuth.clientSecret || !manualAuth.username || !manualAuth.password}
                  >
                    Open Authorization URL
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    After authorizing, copy the code from the URL and paste it in the field above.
                  </p>
                </div>
              </>
            )}

            {manualAuth.useAutomatedFlow ? (
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  className="flex-1"
                  onClick={handleStartOAuthFlow}
                  disabled={!manualAuth.clientId || !manualAuth.clientSecret || !manualAuth.username || !manualAuth.password || loading}
                >
                  {loading ? 'Redirecting...' : '✨ Start Automated OAuth Flow'}
                </Button>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex gap-3 pt-2">
                <Button 
                  type="submit" 
                  className="flex-1" 
                  disabled={loading || !manualAuth.clientId || !manualAuth.clientSecret || !manualAuth.username || !manualAuth.password}
                >
                  {loading ? 'Authenticating...' : 'Quick Connect (Programmatic)'}
                </Button>
                <Button 
                  type="submit" 
                  variant="outline"
                  className="flex-1" 
                  disabled={loading || !manualAuth.authCode}
                  onClick={(e) => {
                    if (!manualAuth.authCode) {
                      e.preventDefault()
                      toast.error('Please enter an authorization code')
                    }
                  }}
                >
                  {loading ? 'Authenticating...' : 'Connect with Code'}
                </Button>
              </div>
            )}
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
