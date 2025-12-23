import { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { XCircle, Spinner, ArrowLeft, Warning } from '@phosphor-icons/react'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { toast } from 'sonner'
import type { BullhornSession } from '@/lib/types'

interface OAuthCallbackProps {
  onAuthenticated: (session: BullhornSession, connectionId?: string) => void
  onCancel: () => void
}

export function OAuthCallback({ 
  onAuthenticated, 
  onCancel
}: OAuthCallbackProps) {
  const [status, setStatus] = useState<'processing' | 'error' | 'timeout'>('processing')
  const [error, setError] = useState('')
  const [progress, setProgress] = useState<string[]>([])
  const [welcomePageDetected, setWelcomePageDetected] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const processedRef = useRef(false)

  useEffect(() => {
    let isMounted = true

    timeoutRef.current = setTimeout(() => {
      if (isMounted && status === 'processing' && !processedRef.current) {
        console.warn('OAuth callback timeout - preventing blank screen')
        setStatus('timeout')
        setError('Authentication is taking longer than expected. This might indicate a configuration issue.')
        toast.error('Authentication timeout', {
          description: 'Please try again or contact support if the issue persists.'
        })
      }
    }, 30000)

    const extractCodeFromUrl = async (): Promise<{ code: string | null, error: string | null }> => {
      try {
        console.log(`🔍 Extracting code from URL IMMEDIATELY to prevent expiration...`)
        
        const urlParams = new URLSearchParams(window.location.search)
        const code = urlParams.get('code')
        const errorParam = urlParams.get('error')
        
        console.log('OAuth Callback - URL params:', { 
          code: code ? code.substring(0, 20) + '...' : null, 
          errorParam,
          fullUrl: window.location.href.substring(0, 150),
          hasColon: code ? code.includes(':') || code.includes('%3A') || code.includes('%3a') : false
        })
        
        if (errorParam) {
          return { code: null, error: errorParam }
        }
        
        if (code) {
          console.log('⚡ Code found immediately - processing without delay (codes expire in 60 seconds)')
          return { code, error: null }
        }
        
        if (window.location.href.includes('welcome.bullhornstaffing.com')) {
          console.log('⚠️ WELCOME TO BULLHORN page detected but NO CODE parameter')
          console.log('⚠️ This indicates the OAuth flow failed silently or the code was already consumed')
          return { code: null, error: 'No code found on welcome page' }
        }
        
        return { code: null, error: null }
      } catch (error) {
        console.error(`❌ Error extracting code:`, error)
        return { code: null, error: 'Failed to extract code from URL' }
      }
    }

    const handleAutoAuthenticate = async () => {
      try {
        if (!isMounted || processedRef.current) return
        processedRef.current = true

        if (window.location.href.includes('welcome.bullhornstaffing.com')) {
          console.log('🎉 WELCOME TO BULLHORN page detected!')
          setWelcomePageDetected(true)
          if (isMounted) setProgress(prev => [...prev, '✅ Welcome to Bullhorn page loaded'])
        }

        if (isMounted) setProgress(prev => [...prev, 'Analyzing OAuth callback URL...'])

        const { code, error: errorParam } = await extractCodeFromUrl()
        
        const errorDescription = new URLSearchParams(window.location.search).get('error_description')

        if (errorParam) {
          if (isMounted) {
            setStatus('error')
            const errorMsg = errorDescription || errorParam
            setError(`OAuth authorization failed: ${errorMsg}`)
            toast.error(`OAuth Error: ${errorMsg}`)
            
            setTimeout(() => {
              window.history.replaceState({}, document.title, window.location.pathname)
            }, 3000)
          }
          return
        }

        if (!code) {
          if (isMounted) {
            setStatus('error')
            setError('No authorization code found in URL after multiple retry attempts. The OAuth callback may have failed or been cancelled.')
            toast.error('No authorization code received')
            
            setTimeout(() => {
              window.history.replaceState({}, document.title, window.location.pathname)
              onCancel()
            }, 3000)
          }
          return
        }

        if (isMounted) setProgress(prev => [...prev, 'Authorization code detected'])

        let codeToUse = code
        
        let decodedOnce = code
        try {
          decodedOnce = decodeURIComponent(code)
        } catch (e) {
          console.log('⚠️ Code is not URL-encoded or already decoded')
        }
        
        if (decodedOnce !== code) {
          console.log('🔓 Code was URL-encoded (1st decode):', { 
            original: code.substring(0, 40), 
            decoded: decodedOnce.substring(0, 40),
            hasColon: decodedOnce.includes(':')
          })
          codeToUse = decodedOnce
          if (isMounted) setProgress(prev => [...prev, 'Code was URL-encoded, decoded successfully'])
        }
        
        while (codeToUse.includes('%3A') || codeToUse.includes('%3a') || codeToUse.includes('%2F') || codeToUse.includes('%2f')) {
          try {
            const furtherDecoded = decodeURIComponent(codeToUse)
            if (furtherDecoded === codeToUse) {
              break
            }
            console.log('🔓 Code had multiple encoding layers, decoded again:', {
              before: codeToUse.substring(0, 40),
              after: furtherDecoded.substring(0, 40)
            })
            codeToUse = furtherDecoded
            if (isMounted) setProgress(prev => [...prev, 'Code had multiple encoding layers, decoded again'])
          } catch (e) {
            console.log('⚠️ Could not decode further, using current value')
            break
          }
        }
        
        if (codeToUse === code) {
          if (isMounted) setProgress(prev => [...prev, 'Code format validated (no encoding detected)'])
        }
        
        console.log('✅ Final code to exchange:', {
          length: codeToUse.length,
          preview: codeToUse.substring(0, 20) + '...' + codeToUse.substring(codeToUse.length - 10),
          hasColon: codeToUse.includes(':')
        })

        const pendingAuth = await window.spark.kv.get<{
          clientId: string
          clientSecret: string
          username: string
          connectionId?: string
          timestamp: number
        }>('pending-oauth-auth')

        console.log('OAuth Callback - Pending auth:', { 
          found: !!pendingAuth, 
          hasClientId: !!pendingAuth?.clientId,
          hasUsername: !!pendingAuth?.username,
          timestamp: pendingAuth?.timestamp,
          age: pendingAuth ? Date.now() - pendingAuth.timestamp : 0
        })

        if (!pendingAuth || !pendingAuth.username) {
          if (isMounted) {
            setStatus('error')
            setError('OAuth session data not found. Please restart the authentication process.')
            toast.error('OAuth session expired')
            
            setTimeout(() => {
              window.history.replaceState({}, document.title, window.location.pathname)
              onCancel()
            }, 3000)
          }
          return
        }

        if (Date.now() - pendingAuth.timestamp > 600000) {
          await window.spark.kv.delete('pending-oauth-auth')
          if (isMounted) {
            setStatus('error')
            setError('OAuth session expired (10 minute timeout). Please restart the authentication process.')
            toast.error('OAuth session expired')
            
            setTimeout(() => {
              window.history.replaceState({}, document.title, window.location.pathname)
              onCancel()
            }, 3000)
          }
          return
        }

        if (isMounted) setProgress(prev => [...prev, 'Retrieving stored credentials'])

        const { clientId, clientSecret, username, connectionId } = pendingAuth

        if (isMounted) setProgress(prev => [...prev, 'Exchanging code for access token'])

        console.log('OAuth Callback - Exchanging code for token WITHOUT redirect_uri')

        const tokenData = await bullhornAPI.exchangeCodeForToken(
          codeToUse,
          clientId,
          clientSecret,
          username
        )

        console.log('OAuth Callback - Token received, logging in...')

        if (isMounted) {
          setProgress(prev => [...prev, 'Access token received'])
          setProgress(prev => [...prev, 'Logging into Bullhorn REST API'])
        }

        const session = await bullhornAPI.login(tokenData.accessToken, username)
        session.refreshToken = tokenData.refreshToken
        session.expiresAt = Date.now() + (tokenData.expiresIn * 1000)

        console.log('OAuth Callback - Session established:', {
          hasToken: !!session.BhRestToken,
          hasRestUrl: !!session.restUrl,
          corporationId: session.corporationId
        })

        if (isMounted) setProgress(prev => [...prev, 'Session established successfully'])

        await window.spark.kv.delete('pending-oauth-auth')

        window.history.replaceState({}, document.title, window.location.pathname)
        
        console.log('OAuth Callback - Complete, calling onAuthenticated')

        if (isMounted) {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
          }
          toast.success('Successfully authenticated with Bullhorn')
          
          setTimeout(() => {
            onAuthenticated(session, connectionId)
          }, 500)
        }
      } catch (err) {
        console.error('OAuth callback error:', err)
        if (isMounted) {
          setStatus('error')
          const errorMessage = err instanceof Error ? err.message : 'Authentication failed'
          setError(`Authentication failed: ${errorMessage}`)
          toast.error(`Authentication failed: ${errorMessage}`)
          
          setTimeout(() => {
            window.history.replaceState({}, document.title, window.location.pathname)
          }, 5000)
        }
      }
    }

    handleAutoAuthenticate()

    return () => {
      isMounted = false
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [onAuthenticated, onCancel, status])

  if (status === 'timeout') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-yellow-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-500">
              <Warning size={24} weight="fill" />
              Authentication Timeout
            </CardTitle>
            <CardDescription>
              The authentication process is taking longer than expected
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-yellow-500">
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>This could be caused by:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Network connectivity issues</li>
                <li>Bullhorn service delays</li>
                <li>Incorrect OAuth configuration</li>
                <li>Browser blocking the authentication flow</li>
              </ul>
            </div>
            <div className="flex gap-2">
              <Button onClick={onCancel} variant="outline" className="flex-1">
                <ArrowLeft />
                Back to Login
              </Button>
              <Button onClick={() => window.location.reload()} className="flex-1">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === 'processing') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Spinner className="animate-spin" size={24} />
              Completing Authentication
            </CardTitle>
            <CardDescription>
              Automatically processing your authorization...
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {welcomePageDetected && (
              <Alert className="border-green-500 bg-green-500/10">
                <AlertDescription className="text-green-700 font-medium">
                  ✅ Welcome to Bullhorn - Thank you for using Bullhorn
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-2 text-sm">
              {progress.map((step, index) => (
                <p key={index} className="text-muted-foreground">
                  ✓ {step}
                </p>
              ))}
              {progress.length === 0 && (
                <p className="text-muted-foreground">Initializing...</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <XCircle size={24} weight="fill" />
            Authentication Error
          </CardTitle>
          <CardDescription>
            There was a problem with the OAuth authorization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertDescription className="font-mono text-xs">
              {error}
            </AlertDescription>
          </Alert>
          <Button onClick={onCancel} variant="outline" className="w-full">
            <ArrowLeft />
            Back to Login
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
