import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { XCircle, Spinner, ArrowLeft } from '@phosphor-icons/react'
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
  const [status, setStatus] = useState<'processing' | 'error'>('processing')
  const [error, setError] = useState('')
  const [progress, setProgress] = useState<string[]>([])

  useEffect(() => {
    let isMounted = true

    const handleAutoAuthenticate = async () => {
      try {
        if (!isMounted) return

        const urlParams = new URLSearchParams(window.location.search)
        const code = urlParams.get('code')
        const errorParam = urlParams.get('error')
        const errorDescription = urlParams.get('error_description')

        console.log('OAuth Callback - URL params:', { code: code?.substring(0, 20) + '...', errorParam })

        if (errorParam) {
          if (isMounted) {
            setStatus('error')
            setError(errorDescription || errorParam)
            toast.error(`OAuth Error: ${errorDescription || errorParam}`)
          }
          return
        }

        if (!code) {
          if (isMounted) {
            setStatus('error')
            setError('No authorization code found in URL')
            toast.error('No authorization code found')
          }
          return
        }

        if (isMounted) setProgress(prev => [...prev, 'Authorization code detected'])

        let codeToUse = code
        if (code.includes('%3A') || code.includes('%2F')) {
          codeToUse = decodeURIComponent(code)
          if (isMounted) setProgress(prev => [...prev, 'Code was URL-encoded, decoded successfully'])
        } else {
          if (isMounted) setProgress(prev => [...prev, 'Code decoded successfully'])
        }

        console.log('OAuth Callback - Decoded code:', codeToUse.substring(0, 20) + '...')

        const pendingAuth = await window.spark.kv.get<{
          clientId: string
          clientSecret: string
          redirectUri?: string
          connectionId?: string
          timestamp: number
        }>('pending-oauth-auth')

        console.log('OAuth Callback - Pending auth:', { 
          found: !!pendingAuth, 
          hasClientId: !!pendingAuth?.clientId,
          hasRedirectUri: !!pendingAuth?.redirectUri,
          timestamp: pendingAuth?.timestamp
        })

        if (!pendingAuth) {
          if (isMounted) {
            setStatus('error')
            setError('OAuth session expired. Please restart the authentication process.')
            toast.error('OAuth session expired')
          }
          return
        }

        if (Date.now() - pendingAuth.timestamp > 600000) {
          await window.spark.kv.delete('pending-oauth-auth')
          if (isMounted) {
            setStatus('error')
            setError('OAuth session expired (timeout). Please restart the authentication process.')
            toast.error('OAuth session expired')
          }
          return
        }

        if (isMounted) setProgress(prev => [...prev, 'Retrieving stored credentials'])

        const { clientId, clientSecret, redirectUri, connectionId } = pendingAuth

        if (isMounted) setProgress(prev => [...prev, 'Exchanging code for access token'])

        console.log('OAuth Callback - Exchanging code for token...')

        const tokenData = await bullhornAPI.exchangeCodeForToken(
          codeToUse,
          clientId,
          clientSecret,
          redirectUri
        )

        console.log('OAuth Callback - Token received, logging in...')

        if (isMounted) {
          setProgress(prev => [...prev, 'Access token received'])
          setProgress(prev => [...prev, 'Logging into Bullhorn REST API'])
        }

        const session = await bullhornAPI.login(tokenData.accessToken)
        session.refreshToken = tokenData.refreshToken
        session.expiresAt = Date.now() + (tokenData.expiresIn * 1000)

        console.log('OAuth Callback - Session established')

        if (isMounted) setProgress(prev => [...prev, 'Session established successfully'])

        await window.spark.kv.delete('pending-oauth-auth')

        window.history.replaceState({}, document.title, window.location.pathname)
        
        console.log('OAuth Callback - Complete, calling onAuthenticated')

        if (isMounted) {
          toast.success('Successfully authenticated with Bullhorn')
          onAuthenticated(session, connectionId)
        }
      } catch (err) {
        console.error('OAuth callback error:', err)
        if (isMounted) {
          setStatus('error')
          const errorMessage = err instanceof Error ? err.message : 'Authentication failed'
          setError(errorMessage)
          toast.error(`Authentication failed: ${errorMessage}`)
        }
      }
    }

    handleAutoAuthenticate()

    return () => {
      isMounted = false
    }
  }, [onAuthenticated, onCancel])

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
          <CardContent>
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
