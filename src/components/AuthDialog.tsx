import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { secureCredentialsAPI } from '@/lib/secure-credentials'
import { Copy, Info, CheckCircle, Circle, Warning, Database } from '@phosphor-icons/react'
import type { SavedConnection } from '@/components/ConnectionManager'
import type { BullhornSession } from '@/lib/types'

type LoginInfo = {
  atsUrl: string
  billingSyncUrl: string
  coreUrl: string
  documentEditorUrl: string
  mobileUrl: string
  oauthUrl: string
  restUrl: string
  samlUrl: string
  novoUrl: string
  pulseInboxUrl: string
  canvasUrl: string
  npsSurveyUrl: string
  ulUrl: string
  dataCenterId: number
  superClusterId: number
}

type AuthDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAuthenticated: (session: BullhornSession, connectionId?: string) => void
  preselectedConnection?: SavedConnection | null
}

type AuthStep = 'idle' | 'opening-popup' | 'waiting-login' | 'welcome-detected' | 'extracting-code' | 'exchanging-token' | 'logging-in' | 'complete'

export function AuthDialog({ open, onOpenChange, onAuthenticated, preselectedConnection }: AuthDialogProps) {
  const [loading, setLoading] = useState(false)
  const [authStep, setAuthStep] = useState<AuthStep>('idle')
  const [authProgress, setAuthProgress] = useState(0)
  const [loginInfo, setLoginInfo] = useState<LoginInfo | null>(null)
  const [loadingLoginInfo, setLoadingLoginInfo] = useState(false)
  const [manualAuth, setManualAuth] = useState({
    clientId: '',
    clientSecret: '',
    username: '',
    password: '',
    authCode: ''
  })
  
  useEffect(() => {
    const loadConnectionCredentials = async () => {
      console.log('🔄 AuthDialog - useEffect triggered:', {
        open,
        hasPreselectedConnection: !!preselectedConnection,
        connectionName: preselectedConnection?.name,
        connectionId: preselectedConnection?.id
      })
      
      if (open && preselectedConnection) {
        console.log('🔑 AuthDialog - Loading credentials for connection:', preselectedConnection.id)
        const credentials = await secureCredentialsAPI.getCredentials(preselectedConnection.id)
        
        console.log('📦 AuthDialog - Credentials loaded:', {
          hasCredentials: !!credentials,
          hasClientId: !!credentials?.clientId,
          hasClientSecret: !!credentials?.clientSecret,
          hasUsername: !!credentials?.username,
          hasPassword: !!credentials?.password,
          username: credentials?.username
        })
        
        if (credentials) {
          setManualAuth({
            clientId: credentials.clientId,
            clientSecret: credentials.clientSecret,
            username: credentials.username,
            password: credentials.password,
            authCode: ''
          })
          console.log('✅ AuthDialog - Credentials set in form state')
          
          if (credentials.username) {
            loadLoginInfoForUsername(credentials.username)
          }
        } else {
          console.warn('⚠️ AuthDialog - No credentials found for preselected connection')
        }
      } else {
        console.log('ℹ️ AuthDialog - Clearing credentials (dialog closed or no preselection)')
        setLoginInfo(null)
      }
      setAuthStep('idle')
      setAuthProgress(0)
    }
    loadConnectionCredentials()
  }, [open, preselectedConnection])

  const loadLoginInfoForUsername = async (username: string) => {
    if (!username || username.trim() === '') {
      setLoginInfo(null)
      return
    }

    setLoadingLoginInfo(true)
    try {
      console.log('🔍 Loading loginInfo for username:', username)
      const info = await bullhornAPI.getLoginInfo(username)
      setLoginInfo(info)
      console.log('✅ LoginInfo loaded:', info)
    } catch (error) {
      console.error('❌ Failed to load loginInfo:', error)
      setLoginInfo(null)
      toast.error('Failed to load datacenter information')
    } finally {
      setLoadingLoginInfo(false)
    }
  }
  
  const extractCodeFromUrl = (input: string): string | null => {
    try {
      let codeToExtract = input.trim()
      let extractedClientId: string | null = null
      
      if (codeToExtract.includes('code=')) {
        const url = new URL(codeToExtract)
        const codeParam = url.searchParams.get('code')
        extractedClientId = url.searchParams.get('client_id')
        
        if (codeParam) {
          codeToExtract = codeParam
          console.log('📋 Extracted code from URL parameter')
        }
        
        if (extractedClientId && manualAuth.clientId && extractedClientId !== manualAuth.clientId) {
          console.error('❌ CLIENT ID MISMATCH DETECTED!')
          console.error('   Expected client_id:', manualAuth.clientId)
          console.error('   Code belongs to:', extractedClientId)
          console.error('   Connection:', preselectedConnection?.name || 'Unknown')
          console.error('   This means Bullhorn returned a cached code for a different connection!')
          console.error('   🔧 Solution: Use Incognito/Private window OR clear cookies for bullhornstaffing.com')
          
          toast.error(
            `❌ Wrong Connection! This code is for a different tenant (client_id mismatch). Clear your browser cookies for bullhornstaffing.com or use Incognito mode.`,
            { duration: 12000 }
          )
          return null
        }
      }
      
      if (codeToExtract.includes('%3A') || codeToExtract.includes('%2F') || codeToExtract.includes('%3a')) {
        const decoded = decodeURIComponent(codeToExtract)
        console.log('🔓 Decoded URL-encoded code:', { 
          original: codeToExtract.substring(0, 40), 
          decoded: decoded.substring(0, 40),
          hadColon: decoded.includes(':')
        })
        return decoded
      }
      
      return codeToExtract
    } catch (error) {
      console.error('❌ Error extracting code from input:', error)
      return input
    }
  }

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setAuthStep('exchanging-token')
    setAuthProgress(50)

    try {
      if (manualAuth.authCode) {
        const codeToUse = extractCodeFromUrl(manualAuth.authCode)
        
        if (!codeToUse) {
          toast.error('Invalid authorization code or URL')
          setLoading(false)
          setAuthStep('idle')
          setAuthProgress(0)
          return
        }
        
        console.log('🎫 Using extracted code (length:', codeToUse.length, ')')
        console.log('🔑 Expected credentials:', {
          username: manualAuth.username,
          clientId: manualAuth.clientId.substring(0, 8) + '...',
          connectionName: preselectedConnection?.name,
          expectedTenant: preselectedConnection?.tenant
        })
        
        console.log('🔍 Fetching loginInfo to get correct region URLs...')
        await bullhornAPI.prepareForAuth(manualAuth.username)
        
        setAuthProgress(60)
        const tokenData = await bullhornAPI.exchangeCodeForToken(
          codeToUse,
          manualAuth.clientId,
          manualAuth.clientSecret,
          manualAuth.username
        )
        
        setAuthStep('logging-in')
        setAuthProgress(80)
        const session = await bullhornAPI.login(tokenData.accessToken, manualAuth.username)
        session.refreshToken = tokenData.refreshToken
        session.expiresAt = Date.now() + (tokenData.expiresIn * 1000)
        
        console.log('✅ Authentication complete. Session details:', {
          corporationId: session.corporationId,
          restUrl: session.restUrl,
          userId: session.userId,
          BhRestToken: session.BhRestToken?.substring(0, 20) + '...',
          expectedConnection: preselectedConnection?.name,
          expectedTenant: preselectedConnection?.tenant
        })
        
        setAuthStep('complete')
        setAuthProgress(100)
        toast.success('Successfully authenticated with Bullhorn')
        onAuthenticated(session, preselectedConnection?.id)
        onOpenChange(false)
        setManualAuth({ 
          clientId: '', 
          clientSecret: '',
          username: '',
          password: '', 
          authCode: ''
        })
        setAuthStep('idle')
        setAuthProgress(0)
      } else {
        toast.loading('Authenticating with saved credentials...', { id: 'auto-auth' })
        
        const session = await bullhornAPI.authenticate({
          clientId: manualAuth.clientId,
          clientSecret: manualAuth.clientSecret,
          username: manualAuth.username,
          password: manualAuth.password
        })
        
        console.log('✅ Authentication complete. Session details:', {
          corporationId: session.corporationId,
          restUrl: session.restUrl,
          userId: session.userId,
          BhRestToken: session.BhRestToken?.substring(0, 20) + '...',
          expectedConnection: preselectedConnection?.name,
          expectedTenant: preselectedConnection?.tenant
        })
        
        setAuthStep('complete')
        setAuthProgress(100)
        toast.success('Successfully authenticated with Bullhorn', { id: 'auto-auth' })
        onAuthenticated(session, preselectedConnection?.id)
        onOpenChange(false)
        setManualAuth({ 
          clientId: '', 
          clientSecret: '',
          username: '',
          password: '', 
          authCode: ''
        })
        setAuthStep('idle')
        setAuthProgress(0)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Authentication failed', { id: 'auto-auth' })
      setAuthStep('idle')
      setAuthProgress(0)
    } finally {
      setLoading(false)
    }
  }

  const getAuthUrl = (): string => {
    const state = Math.random().toString(36).substring(7)
    const clientId = manualAuth.clientId || 'YOUR_CLIENT_ID'
    
    console.log('🔗 Generating auth URL (NO redirect_uri to avoid caching issues)')
    console.log('⚠️ BROWSER CACHE WARNING: Bullhorn OAuth may cache previous logins.')
    console.log('   If you get a code for the wrong tenant, use an Incognito/Private window.')
    
    return bullhornAPI.getAuthorizationUrl(manualAuth.username, clientId, state, manualAuth.password)
  }

  const copyAuthUrl = async () => {
    await bullhornAPI.prepareForAuth(manualAuth.username)
    const url = getAuthUrl()
    navigator.clipboard.writeText(url)

    await window.spark.kv.set('pending-oauth-auth', {
      clientId: manualAuth.clientId,
      clientSecret: manualAuth.clientSecret,
      username: manualAuth.username,
      connectionId: preselectedConnection?.id,
      timestamp: Date.now()
    })
    
    toast.success('Authorization URL copied to clipboard')
  }

  const handleOpenAuthUrl = async () => {
    await window.spark.kv.set('pending-oauth-auth', {
      clientId: manualAuth.clientId,
      clientSecret: manualAuth.clientSecret,
      username: manualAuth.username,
      connectionId: preselectedConnection?.id,
      timestamp: Date.now()
    })

    await bullhornAPI.prepareForAuth(manualAuth.username)
    const authUrl = getAuthUrl()
    const popupWidth = 600
    const popupHeight = 700
    const left = (window.screen.width - popupWidth) / 2
    const top = (window.screen.height - popupHeight) / 2

    const uniqueWindowName = `bullhorn-oauth-${Date.now()}-${Math.random().toString(36).substring(7)}`
    
    console.log('🪟 Opening OAuth popup with cache-busting:', {
      username: manualAuth.username,
      clientId: manualAuth.clientId.substring(0, 8) + '...',
      connectionName: preselectedConnection?.name,
      expectedTenant: preselectedConnection?.tenant,
      windowName: uniqueWindowName
    })

    const popup = window.open(
      authUrl,
      uniqueWindowName,
      `width=${popupWidth},height=${popupHeight},left=${left},top=${top},toolbar=no,menubar=no,location=no,status=no`
    )

    if (!popup) {
      toast.error('Popup blocked. Please allow popups for this site.')
      return
    }

    toast.info(
      `Opening OAuth for ${preselectedConnection?.name || manualAuth.username}. Copy the URL from the popup after logging in.`,
      { duration: 6000 }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Connect to Bullhorn</DialogTitle>
          <DialogDescription>
            Manual OAuth - Get authorization code and paste it below
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {(authStep !== 'idle' || loading) && (
            <div className="space-y-3 p-4 border border-accent/30 bg-accent/5 rounded-lg">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Authentication Progress</span>
                  <span className="text-xs font-mono text-muted-foreground">{authProgress}%</span>
                </div>
                <Progress value={authProgress} className="h-2" />
              </div>
              
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-sm">
                  {authStep === 'exchanging-token' || authStep === 'logging-in' || authStep === 'complete' ? (
                    <CheckCircle weight="fill" className="text-accent" size={16} />
                  ) : (
                    <Circle className="text-muted-foreground" size={16} />
                  )}
                  <span className={authStep === 'exchanging-token' ? 'text-accent font-medium' : authStep === 'logging-in' || authStep === 'complete' ? 'text-foreground' : 'text-muted-foreground'}>
                    Exchanging code for token
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  {authStep === 'logging-in' || authStep === 'complete' ? (
                    <CheckCircle weight="fill" className="text-accent" size={16} />
                  ) : (
                    <Circle className="text-muted-foreground" size={16} />
                  )}
                  <span className={authStep === 'logging-in' ? 'text-accent font-medium' : authStep === 'complete' ? 'text-foreground' : 'text-muted-foreground'}>
                    Logging in to REST API
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  {authStep === 'complete' ? (
                    <CheckCircle weight="fill" className="text-green-500" size={16} />
                  ) : (
                    <Circle className="text-muted-foreground" size={16} />
                  )}
                  <span className={authStep === 'complete' ? 'text-green-500 font-medium' : 'text-muted-foreground'}>
                    Authentication complete
                  </span>
                </div>
              </div>
            </div>
          )}
          
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <p className="font-medium">🔐 Manual OAuth Authentication</p>
              <p className="text-xs">
                Enter your credentials, then click the button to open the Bullhorn authorization page in a popup. 
                After logging in, copy the entire URL from the popup and paste it in the "Authorization Code or URL" field below.
              </p>
              <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded">
                <p className="text-xs text-amber-700 dark:text-amber-300 font-semibold">
                  ⚠️ IMPORTANT: Browser Cookie Cache Issue
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  Bullhorn may cache your login session in browser cookies. If you get an error about "wrong client_id" or see data from a different tenant, 
                  you must clear your browser cookies for <strong>bullhornstaffing.com</strong> or use an <strong>Incognito/Private window</strong>.
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">
                  💡 Recommended: Always use Incognito mode when switching between different Bullhorn connections.
                </p>
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer font-semibold text-amber-700 dark:text-amber-300 hover:underline">
                    🚨 Seeing HTTP 404 or Tomcat errors? Click for solutions
                  </summary>
                  <div className="mt-2 p-2 bg-white/50 dark:bg-black/20 rounded space-y-1">
                    <p className="font-semibold">Quick Solutions:</p>
                    <ol className="list-decimal ml-4 space-y-0.5">
                      <li>Click "Copy for Incognito" → Open Incognito window → Paste URL → Login → Copy final URL back here</li>
                      <li>Click "Clear Cookies & Cache" in header → Select "Clear Bullhorn Cookies & Sessions"</li>
                      <li>Try a different browser (if Safari has cached credentials, use Chrome)</li>
                    </ol>
                    <p className="mt-1 italic">See <code className="bg-black/10 px-1 rounded">OAUTH_TROUBLESHOOTING.md</code> for detailed explanation</p>
                  </div>
                </details>
              </div>
            </AlertDescription>
          </Alert>

          {loginInfo && (
            <Alert className="border-accent/50 bg-accent/5">
              <Database className="h-4 w-4 text-accent" />
              <AlertDescription>
                <p className="font-semibold text-sm mb-2">Datacenter Information</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Datacenter ID:</span>
                    <Badge variant="outline" className="font-mono text-xs">
                      {loginInfo.dataCenterId}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Super Cluster ID:</span>
                    <Badge variant="outline" className="font-mono text-xs">
                      {loginInfo.superClusterId}
                    </Badge>
                  </div>
                  <div className="col-span-2 mt-1">
                    <span className="text-muted-foreground">OAuth URL:</span>
                    <code className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded">
                      {loginInfo.oauthUrl}
                    </code>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">REST URL:</span>
                    <code className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded">
                      {loginInfo.restUrl}
                    </code>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {loadingLoginInfo && (
            <Alert className="border-accent/30 bg-accent/5">
              <Info className="h-4 w-4 text-accent animate-pulse" />
              <AlertDescription className="text-xs">
                Loading datacenter information for <strong>{manualAuth.username}</strong>...
              </AlertDescription>
            </Alert>
          )}

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
                onChange={(e) => {
                  setManualAuth({ ...manualAuth, username: e.target.value })
                  if (e.target.value && e.target.value.length > 3) {
                    loadLoginInfoForUsername(e.target.value)
                  } else {
                    setLoginInfo(null)
                  }
                }}
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

            {manualAuth.username && !loginInfo && !loadingLoginInfo && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => loadLoginInfoForUsername(manualAuth.username)}
              >
                <Database size={16} />
                Verify Datacenter & Credentials
              </Button>
            )}

            <div className="space-y-2 p-3 bg-muted rounded-lg">
              <Label className="text-sm font-medium">Get Authorization Code</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Opens Bullhorn login in a popup window. After logging in, you'll see a "Welcome to Bullhorn" page—copy the entire URL from that page and paste it below.
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
                  title="Copy link to clipboard"
                >
                  <Copy size={16} />
                </Button>
              </div>
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={handleOpenAuthUrl}
                  className="flex-1"
                  disabled={!manualAuth.clientId || !manualAuth.clientSecret || !manualAuth.username || !manualAuth.password}
                >
                  Open in Popup
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await copyAuthUrl()
                    const url = getAuthUrl()
                    window.open(url, '_blank')
                    toast.info('Link copied and opened in new window! Use Incognito/Private mode to avoid cached credentials', { duration: 6000 })
                  }}
                  className="flex-1"
                  disabled={!manualAuth.clientId || !manualAuth.clientSecret || !manualAuth.username || !manualAuth.password}
                >
                  Copy for Incognito
                </Button>
              </div>
              <Alert className="mt-3 bg-green-500/10 border-green-500/30">
                <CheckCircle className="text-green-500" size={16} weight="fill" />
                <AlertDescription className="text-xs">
                  <strong>What to expect:</strong>
                  <ol className="list-decimal ml-4 mt-1 space-y-0.5">
                    <li>Popup opens with Bullhorn login (or auto-logs in)</li>
                    <li>Page redirects to <code className="text-xs bg-black/10 px-1 rounded">https://welcome.bullhornstaffing.com/</code></li>
                    <li>You'll see "Welcome to Bullhorn - Thank you for using Bullhorn"</li>
                    <li>Copy the <strong>entire URL</strong> from the address bar (includes code parameter)</li>
                    <li>Paste it in the field below</li>
                  </ol>
                  <p className="mt-2 text-amber-600 dark:text-amber-400 font-semibold">
                    ⚠️ If you see a 404 error, your browser may have cookie conflicts. Use Incognito mode or clear Bullhorn cookies using the button in the header.
                  </p>
                </AlertDescription>
              </Alert>
            </div>

            <div className="space-y-2 p-3 bg-muted rounded-lg">
              <Label className="text-sm font-medium">Authorization Code or URL</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Paste the entire URL from the popup after authorization, or just the code. We'll extract and decode it automatically.
              </p>
              <Input
                id="manual-authCode"
                type="text"
                value={manualAuth.authCode}
                onChange={(e) => setManualAuth({ ...manualAuth, authCode: e.target.value })}
                disabled={loading}
                placeholder="https://welcome.bullhornstaffing.com/?code=25184_8090191_44%3A0e19f0db... OR 25184_8090191_44:0e19f0db..."
              />
              <p className="text-xs text-muted-foreground">
                ✨ Pro tip: Just paste the full URL from the popup - the colon (:) will be decoded automatically
              </p>
            </div>

            <Alert className="border-destructive/30 bg-destructive/5">
              <Warning className="text-destructive" size={16} weight="fill" />
              <AlertDescription className="text-xs space-y-2">
                <p className="font-semibold text-destructive">🚨 Seeing "HTTP Status 404" or Tomcat errors in the popup?</p>
                <p><strong>Root Cause:</strong> Browser cookies are cached from a previous Bullhorn login, causing authentication conflicts.</p>
                <div className="mt-2">
                  <p className="font-semibold mb-1">Solutions (in order of preference):</p>
                  <ol className="list-decimal ml-4 space-y-1">
                    <li><strong>Use Incognito/Private Mode</strong> - Click "Copy for Incognito" above, open a private window, paste the URL, log in, then copy the final URL back here</li>
                    <li><strong>Clear Bullhorn Cookies</strong> - Click the "Clear Cookies & Cache" button in the header, select "Clear Bullhorn Cookies & Sessions"</li>
                    <li><strong>Use a different browser</strong> - If Safari has cached credentials, try Chrome or Firefox</li>
                  </ol>
                </div>
                <p className="mt-2 text-destructive font-medium">
                  💡 Why this happens: Bullhorn's OAuth service remembers your last login via cookies. When switching between different tenants/connections, 
                  these cookies can return the wrong authorization code, causing 404 errors or authentication to the wrong corporation.
                </p>
              </AlertDescription>
            </Alert>

            <div className="flex gap-3 pt-2">
              <Button 
                type="submit" 
                className="flex-1" 
                disabled={loading || !manualAuth.authCode}
                onClick={(e) => {
                  if (!manualAuth.authCode) {
                    e.preventDefault()
                    toast.error('Please enter an authorization code or URL')
                  }
                }}
              >
                {loading ? 'Authenticating...' : 'Connect with Code'}
              </Button>
              <Button 
                type="button" 
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
