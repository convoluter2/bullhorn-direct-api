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
    const redirectUri = 'https://welcome.bullhornstaffing.com/'
    
    console.log('Using redirect URI:', redirectUri)
    return bullhornAPI.getAuthorizationUrl(clientId, redirectUri, state, manualAuth.username, manualAuth.password)
  }
  
  const handleStartOAuthFlow = async () => {
    if (!manualAuth.clientId || !manualAuth.clientSecret) {
      toast.error('Please enter your Client ID and Client Secret first')
      return
    }

    if (!manualAuth.username || !manualAuth.password) {
      toast.error('Please enter your Bullhorn username and password')
      return
    }

    let pollInterval: NodeJS.Timeout | null = null
    let timeoutId: NodeJS.Timeout | null = null
    let popup: Window | null = null
    let messageListener: ((event: MessageEvent) => void) | null = null

    try {
      console.log('🚀 STARTING OAUTH FLOW')
      console.log('📋 Credentials check:', {
        hasClientId: !!manualAuth.clientId,
        hasClientSecret: !!manualAuth.clientSecret,
        hasUsername: !!manualAuth.username,
        hasPassword: !!manualAuth.password,
        clientIdPreview: manualAuth.clientId.substring(0, 10) + '...'
      })

      setLoading(true)
      
      console.log('💾 Saving pending auth to KV store...')
      await window.spark.kv.set('pending-oauth-auth', {
        clientId: manualAuth.clientId,
        clientSecret: manualAuth.clientSecret,
        connectionId: preselectedConnection?.id,
        timestamp: Date.now()
      })

      const authUrl = getAuthUrl()
      console.log('🔗 Generated auth URL (length:', authUrl.length + '):', authUrl.substring(0, 150) + '...')
      
      const popupWidth = 600
      const popupHeight = 700
      const left = (window.screen.width - popupWidth) / 2
      const top = (window.screen.height - popupHeight) / 2

      console.log('🪟 Opening popup window...')
      toast.loading('Opening Bullhorn login...', { id: 'oauth-popup' })

      popup = window.open(
        authUrl,
        'bullhorn-oauth',
        `width=${popupWidth},height=${popupHeight},left=${left},top=${top},toolbar=no,menubar=no,location=no,status=no`
      )

      if (!popup) {
        console.error('❌ POPUP BLOCKED!')
        toast.error('Popup blocked. Please allow popups for this site.', { id: 'oauth-popup' })
        setLoading(false)
        return
      }

      console.log('✅ Popup opened successfully, setting up monitoring...')

      messageListener = (event: MessageEvent) => {
        console.log('📨 Message received:', event.origin, event.data)
        
        if (event.data && typeof event.data === 'object') {
          if (event.data.type === 'BULLHORN_OAUTH_CODE' && event.data.code) {
            console.log('✅ CODE RECEIVED VIA MESSAGE:', event.data.code.substring(0, 30) + '...')
            
            if (pollInterval) clearInterval(pollInterval)
            if (timeoutId) clearTimeout(timeoutId)
            if (popup && !popup.closed) popup.close()
            if (messageListener) window.removeEventListener('message', messageListener)
            
            toast.loading('Exchanging code for token...', { id: 'oauth-popup' })
            
            handleCodeExchange(event.data.code).catch((err) => {
              console.error('❌ CODE EXCHANGE FAILED:', err)
              toast.error('Failed to complete authentication', { id: 'oauth-popup' })
              setLoading(false)
            })
          } else if (event.data.type === 'BULLHORN_OAUTH_ERROR') {
            console.error('❌ OAuth error via message:', event.data.error)
            
            if (pollInterval) clearInterval(pollInterval)
            if (timeoutId) clearTimeout(timeoutId)
            if (popup && !popup.closed) popup.close()
            if (messageListener) window.removeEventListener('message', messageListener)
            
            toast.error(`OAuth error: ${event.data.error}`, { id: 'oauth-popup' })
            setLoading(false)
          }
        }
      }

      window.addEventListener('message', messageListener)
      console.log('✅ Message listener registered, starting polling...')

      let codeFound = false
      let pollAttempts = 0
      const maxPollAttempts = 360

      pollInterval = setInterval(() => {
        pollAttempts++
        
        if (pollAttempts > maxPollAttempts) {
          if (pollInterval) clearInterval(pollInterval)
          if (timeoutId) clearTimeout(timeoutId)
          if (popup && !popup.closed) popup.close()
          console.error('❌ POLLING TIMEOUT after', maxPollAttempts, 'attempts (', maxPollAttempts * 0.5, 'seconds)')
          toast.error('Authentication timeout - please try again', { id: 'oauth-popup' })
          setLoading(false)
          return
        }

        try {
          if (!popup || popup.closed) {
            if (pollInterval) clearInterval(pollInterval)
            if (timeoutId) clearTimeout(timeoutId)
            if (!codeFound) {
              console.warn('⚠️ Popup closed without finding code')
              toast.error('Authentication window closed', { id: 'oauth-popup' })
              setLoading(false)
            }
            return
          }

          let popupUrl: string | undefined
          try {
            popupUrl = popup.location.href
            
            if (pollAttempts % 10 === 0) {
              console.log(`[Poll ${pollAttempts}/${maxPollAttempts}] Accessible URL:`, popupUrl.substring(0, 100) + '...')
            }

            if ((popupUrl.includes('welcome.bullhornstaffing.com') || popupUrl.includes(window.location.origin)) && popupUrl.includes('code=')) {
              try {
                const url = new URL(popupUrl)
                const code = url.searchParams.get('code')
                const error = url.searchParams.get('error')

                console.log('✅ CALLBACK DETECTED (redirected to welcome page):', { 
                  hasCode: !!code, 
                  hasError: !!error,
                  codePreview: code ? code.substring(0, 30) + '...' : null,
                  error: error,
                  allParams: Array.from(url.searchParams.keys()).join(', ')
                })

                if (error) {
                  codeFound = true
                  if (pollInterval) clearInterval(pollInterval)
                  if (timeoutId) clearTimeout(timeoutId)
                  if (messageListener) window.removeEventListener('message', messageListener)
                  popup.close()
                  console.error('❌ OAuth error in URL:', error)
                  toast.error(`OAuth error: ${error}`, { id: 'oauth-popup' })
                  setLoading(false)
                  return
                }

                if (code) {
                  codeFound = true
                  if (pollInterval) clearInterval(pollInterval)
                  if (timeoutId) clearTimeout(timeoutId)
                  if (messageListener) window.removeEventListener('message', messageListener)
                  console.log('✅ CODE EXTRACTED! Processing now...')
                  popup.close()
                  
                  toast.loading('Exchanging code for token...', { id: 'oauth-popup' })
                  
                  handleCodeExchange(code).catch((err) => {
                    console.error('❌ CODE EXCHANGE FAILED:', err)
                    toast.error('Failed to complete authentication', { id: 'oauth-popup' })
                    setLoading(false)
                  })
                } else {
                  console.warn('⚠️ Callback page detected but NO CODE parameter - waiting...')
                }
              } catch (urlError) {
                console.error('❌ Error parsing popup URL:', urlError)
              }
            }
          } catch (crossOriginError) {
            if (pollAttempts % 20 === 0) {
              console.log(`[Poll ${pollAttempts}] Popup on cross-origin page (expected during Bullhorn auth flow)`)
            }
          }
        } catch (err) {
          if (pollAttempts % 30 === 0) {
            console.error(`[Poll ${pollAttempts}] Unexpected popup error:`, err)
          }
        }
      }, 500)

      timeoutId = setTimeout(() => {
        if (popup && !popup.closed) {
          if (pollInterval) clearInterval(pollInterval)
          popup.close()
          toast.error('Authentication timeout - please try again', { id: 'oauth-popup' })
          setLoading(false)
        }
      }, 180000)

    } catch (error) {
      console.error('❌ OAUTH FLOW ERROR:', error)
      console.error('❌ Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      if (pollInterval) clearInterval(pollInterval)
      if (timeoutId) clearTimeout(timeoutId)
      if (messageListener) window.removeEventListener('message', messageListener)
      if (popup && !popup.closed) {
        console.log('🧹 Closing popup due to error...')
        popup.close()
      }
      toast.error('Failed to start OAuth flow. Please try again.', { id: 'oauth-popup' })
      setLoading(false)
    }
  }

  const handleCodeExchange = async (code: string) => {
    try {
      console.log('🔄 STARTING CODE EXCHANGE')
      console.log('📝 Raw code received:', code.substring(0, 50) + '...')
      
      let codeToUse = code
      if (codeToUse.includes('%3A') || codeToUse.includes('%2F') || codeToUse.includes('%3a')) {
        const decoded = decodeURIComponent(codeToUse)
        console.log('🔓 Code was URL-encoded:', { 
          originalPreview: codeToUse.substring(0, 40), 
          decodedPreview: decoded.substring(0, 40),
          hadColon: decoded.includes(':')
        })
        codeToUse = decoded
      } else {
        console.log('✓ Code already decoded')
      }

      const redirectUri = 'https://welcome.bullhornstaffing.com/'
      console.log('🎫 Exchanging code for token (WITH redirect_uri to match authorize request)...')
      console.log('📋 Exchange parameters:', {
        codeLength: codeToUse.length,
        clientIdPreview: manualAuth.clientId.substring(0, 10) + '...',
        hasSecret: !!manualAuth.clientSecret,
        redirectUri
      })

      const tokenData = await bullhornAPI.exchangeCodeForToken(
        codeToUse,
        manualAuth.clientId,
        manualAuth.clientSecret,
        redirectUri
      )
      
      console.log('✅ Token received:', {
        hasAccessToken: !!tokenData.accessToken,
        hasRefreshToken: !!tokenData.refreshToken,
        expiresIn: tokenData.expiresIn
      })
      
      console.log('🔐 Logging in to REST API...')
      const session = await bullhornAPI.login(tokenData.accessToken)
      
      session.refreshToken = tokenData.refreshToken
      session.expiresAt = Date.now() + (tokenData.expiresIn * 1000)

      console.log('✅ Session established:', {
        hasToken: !!session.BhRestToken,
        hasRestUrl: !!session.restUrl,
        corporationId: session.corporationId,
        userId: session.userId
      })

      console.log('🧹 Cleaning up pending auth...')
      await window.spark.kv.delete('pending-oauth-auth')
      
      console.log('🎉 Authentication complete, notifying parent component...')
      toast.success('Successfully authenticated with Bullhorn', { id: 'oauth-popup' })
      
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
      setLoading(false)
      
      console.log('✅ CODE EXCHANGE COMPLETE')
    } catch (error) {
      console.error('❌ CODE EXCHANGE ERROR:', error)
      console.error('❌ Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed'
      toast.error(`Authentication failed: ${errorMessage}`, { id: 'oauth-popup' })
      setLoading(false)
      throw error
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
            Popup-based OAuth with automatic code extraction and exchange
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <p className="font-medium">✨ Popup-Based OAuth Authentication</p>
              <p className="text-xs">
                <strong>Recommended:</strong> Use "Start Popup OAuth Flow" - opens Bullhorn login in a popup window, 
                automatically logs you in, extracts the authorization code when Bullhorn redirects back, and closes the popup.
              </p>
              <p className="text-xs mt-1">
                <strong>Fallback:</strong> If popup is blocked, disable automated flow to try programmatic authentication 
                (may not work with all Bullhorn configurations).
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
                <Label className="text-sm font-medium">✨ Popup OAuth Mode (Recommended)</Label>
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
                <strong>Enabled:</strong> Opens Bullhorn login in a popup window, automatically logs you in using your credentials, 
                extracts the authorization code when Bullhorn redirects back, and closes the popup. <strong>Quick and seamless.</strong>
              </p>
              <p className="text-xs text-muted-foreground">
                <strong>Disabled:</strong> Fallback to programmatic authentication (may not work with all Bullhorn configurations) 
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
                  {loading ? 'Processing...' : '✨ Start Popup OAuth Flow'}
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
