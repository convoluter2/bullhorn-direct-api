import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { secureCredentialsAPI } from '@/lib/secure-credentials'
import { Copy, Info, CheckCircle, Circle } from '@phosphor-icons/react'
import type { SavedConnection } from '@/components/ConnectionManager'
import type { BullhornSession } from '@/lib/types'

interface AuthDialogProps {
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
  const [manualAuth, setManualAuth] = useState({
    clientId: '',
    clientSecret: '',
    username: '',
    password: '',
    authCode: ''
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
            authCode: ''
          })
        }
      }
      setAuthStep('idle')
      setAuthProgress(0)
    }
    loadConnectionCredentials()
  }, [open, preselectedConnection])
  
  const extractCodeFromUrl = (input: string): string | null => {
    try {
      let codeToExtract = input.trim()
      
      if (codeToExtract.includes('code=')) {
        const url = new URL(codeToExtract)
        const codeParam = url.searchParams.get('code')
        if (codeParam) {
          codeToExtract = codeParam
          console.log('📋 Extracted code from URL parameter')
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
    
    console.log('🔗 Generating auth URL (NO redirect_uri)')
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

    const authUrl = getAuthUrl()
    const popupWidth = 600
    const popupHeight = 700
    const left = (window.screen.width - popupWidth) / 2
    const top = (window.screen.height - popupHeight) / 2

    const popup = window.open(
      authUrl,
      'bullhorn-oauth-manual',
      `width=${popupWidth},height=${popupHeight},left=${left},top=${top},toolbar=no,menubar=no,location=no,status=no`
    )

    if (!popup) {
      toast.error('Popup blocked. Please allow popups for this site.')
      return
    }

    toast.success('Copy the code from the popup URL after logging in')
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

            <div className="space-y-2 p-3 bg-muted rounded-lg">
              <Label className="text-sm font-medium">Get Authorization Code</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Opens Bullhorn login in a popup window. After logging in, copy the entire URL and paste it in the field below.
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
                Open Authorization Popup
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                After the popup redirects, copy the entire URL from the address bar and paste it in the field below.
              </p>
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
