import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { secureCredentialsAPI } from '@/lib/secure-credentials'
import { Copy, Info, Database } from '@phosphor-icons/react'
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
    useRedirectUri: false,
    redirectUri: ''
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
            useRedirectUri: false,
            redirectUri: ''
          })
        }
      }
    }
    loadConnectionCredentials()
  }, [open, preselectedConnection])
  
  const currentUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : ''

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const redirectUri = manualAuth.useRedirectUri && manualAuth.redirectUri 
        ? manualAuth.redirectUri 
        : undefined
      
      const decodedCode = decodeURIComponent(manualAuth.authCode)
        
      const tokenData = await bullhornAPI.exchangeCodeForToken(
        decodedCode,
        manualAuth.clientId,
        manualAuth.clientSecret,
        redirectUri
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
        useRedirectUri: false, 
        redirectUri: '' 
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const getAuthUrl = () => {
    const state = Math.random().toString(36).substring(7)
    const clientId = manualAuth.clientId || 'YOUR_CLIENT_ID'
    const redirectUri = manualAuth.useRedirectUri && manualAuth.redirectUri 
      ? manualAuth.redirectUri 
      : undefined
    
    return bullhornAPI.getAuthorizationUrl(clientId, redirectUri, state, manualAuth.username, manualAuth.password)
  }
  
  const handleStartOAuthFlow = async () => {
    if (!manualAuth.clientId || !manualAuth.clientSecret) {
      toast.error('Please enter your Client ID and Client Secret first')
      return
    }
    
    const redirectUri = manualAuth.useRedirectUri && manualAuth.redirectUri 
      ? manualAuth.redirectUri 
      : undefined

    try {
      await window.spark.kv.set('pending-oauth-auth', {
        clientId: manualAuth.clientId,
        clientSecret: manualAuth.clientSecret,
        redirectUri: redirectUri,
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
    
    const redirectUri = manualAuth.useRedirectUri && manualAuth.redirectUri 
      ? manualAuth.redirectUri 
      : undefined

    await window.spark.kv.set('pending-oauth-auth', {
      clientId: manualAuth.clientId,
      clientSecret: manualAuth.clientSecret,
      redirectUri: redirectUri,
      connectionId: preselectedConnection?.id,
      timestamp: Date.now()
    })
    
    toast.success('Authorization URL copied to clipboard')
  }

  const handleOpenAuthUrl = async () => {
    const redirectUri = manualAuth.useRedirectUri && manualAuth.redirectUri 
      ? manualAuth.redirectUri 
      : undefined

    await window.spark.kv.set('pending-oauth-auth', {
      clientId: manualAuth.clientId,
      clientSecret: manualAuth.clientSecret,
      redirectUri: redirectUri,
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
            Fully automated OAuth authentication - no manual code entry needed!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <p className="font-medium">✨ Fully Automated OAuth Flow</p>
              <p className="text-xs">
                The app now automatically extracts, decodes, and exchanges the authorization code for tokens. 
                Simply authorize with Bullhorn and you'll be logged in instantly - no manual code copying required!
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
                <Label className="text-sm font-medium">Redirect URI Configuration</Label>
                <div className="flex items-center gap-2">
                  <Label htmlFor="useRedirectUri" className="text-xs text-muted-foreground cursor-pointer">
                    Use Redirect URI
                  </Label>
                  <input
                    id="useRedirectUri"
                    type="checkbox"
                    checked={manualAuth.useRedirectUri}
                    onChange={(e) => setManualAuth({ 
                      ...manualAuth, 
                      useRedirectUri: e.target.checked,
                      redirectUri: e.target.checked && !manualAuth.redirectUri ? currentUrl : manualAuth.redirectUri
                    })}
                    className="cursor-pointer"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                <strong>Important:</strong> Only enable this if your Bullhorn OAuth app has a redirect URI configured. 
                If you're getting "Invalid Redirect URI: null" errors, leave this <strong>unchecked</strong>.
              </p>
              {manualAuth.useRedirectUri && (
                <div className="space-y-1">
                  <Input
                    id="redirectUri"
                    type="text"
                    value={manualAuth.redirectUri}
                    onChange={(e) => setManualAuth({ ...manualAuth, redirectUri: e.target.value })}
                    placeholder={currentUrl}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    This must exactly match the redirect URI configured in your Bullhorn OAuth app.
                    Current URL pre-filled: <code className="text-xs">{currentUrl}</code>
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2 p-3 bg-muted rounded-lg">
              <Label className="text-sm font-medium">Get Authorization</Label>
              <p className="text-xs text-muted-foreground mb-2">
                {manualAuth.useRedirectUri 
                  ? 'Click to start the OAuth flow. You will be redirected to Bullhorn to authenticate, then automatically returned.'
                  : 'When you authorize, the app will automatically capture and process the authorization code. No manual entry needed!'
                }
              </p>
              {!manualAuth.useRedirectUri && (
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
              )}
              <Button
                type="button"
                size="sm"
                variant={manualAuth.useRedirectUri ? "default" : "secondary"}
                onClick={manualAuth.useRedirectUri ? handleStartOAuthFlow : handleOpenAuthUrl}
                className="w-full mt-2"
                disabled={!manualAuth.clientId || !manualAuth.clientSecret || !manualAuth.username || !manualAuth.password}
              >
                {manualAuth.useRedirectUri ? 'Start Automated OAuth Flow' : 'Authorize with Bullhorn'}
              </Button>
              {manualAuth.useRedirectUri && (
                <p className="text-xs text-muted-foreground mt-2">
                  ✨ Fully automated: After authorization, the app will automatically exchange the code for tokens and log you in.
                </p>
              )}
              {!manualAuth.useRedirectUri && (
                <p className="text-xs text-muted-foreground mt-2">
                  ✨ Fully automated: After you authorize in the popup, return to this app and the authentication will complete automatically.
                </p>
              )}
            </div>

            {manualAuth.useRedirectUri && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  The entire OAuth process is now automated. You'll be redirected to Bullhorn to log in, 
                  then automatically returned and authenticated without any manual code entry.
                </AlertDescription>
              </Alert>
            )}

            {!manualAuth.useRedirectUri && (
              <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? 'Authenticating...' : 'Connect with Code'}
                </Button>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                  Cancel
                </Button>
              </div>
            )}
            
            {manualAuth.useRedirectUri && (
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full">
                  Cancel
                </Button>
              </div>
            )}
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
