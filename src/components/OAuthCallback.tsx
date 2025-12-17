import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { XCircle, Spinner, ArrowLeft } from '@phosphor-icons/react'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { secureCredentialsAPI } from '@/lib/secure-credentials'
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
    const handleAutoAuthenticate = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search)
        const code = urlParams.get('code')
        const errorParam = urlParams.get('error')
        const errorDescription = urlParams.get('error_description')
        const stateParam = urlParams.get('state')

        if (errorParam) {
          setStatus('error')
          setError(errorDescription || errorParam)
          toast.error(`OAuth Error: ${errorDescription || errorParam}`)
          return
        }

        if (!code) {
          setStatus('error')
          setError('No authorization code found in URL')
          toast.error('No authorization code found')
          return
        }

        setProgress(prev => [...prev, 'Authorization code detected'])

        let codeToUse = code
        if (code.includes('%3A') || code.includes('%2F')) {
          codeToUse = decodeURIComponent(code)
          setProgress(prev => [...prev, 'Code was URL-encoded, decoded successfully'])
        } else {
          setProgress(prev => [...prev, 'Code decoded successfully'])
        }

        const pendingAuth = await window.spark.kv.get<{
          clientId: string
          clientSecret: string
          redirectUri?: string
          connectionId?: string
          timestamp: number
        }>('pending-oauth-auth')

        if (!pendingAuth) {
          setStatus('error')
          setError('OAuth session expired. Please restart the authentication process.')
          toast.error('OAuth session expired')
          return
        }

        if (Date.now() - pendingAuth.timestamp > 600000) {
          await window.spark.kv.delete('pending-oauth-auth')
          setStatus('error')
          setError('OAuth session expired (timeout). Please restart the authentication process.')
          toast.error('OAuth session expired')
          return
        }

        setProgress(prev => [...prev, 'Retrieving stored credentials'])

        const { clientId, clientSecret, redirectUri, connectionId } = pendingAuth

        setProgress(prev => [...prev, 'Exchanging code for access token'])

        const tokenData = await bullhornAPI.exchangeCodeForToken(
          codeToUse,
          clientId,
          clientSecret,
          redirectUri
        )

        setProgress(prev => [...prev, 'Access token received'])
        setProgress(prev => [...prev, 'Logging into Bullhorn REST API'])

        const session = await bullhornAPI.login(tokenData.accessToken)
        session.refreshToken = tokenData.refreshToken
        session.expiresAt = Date.now() + (tokenData.expiresIn * 1000)

        setProgress(prev => [...prev, 'Session established successfully'])

        await window.spark.kv.delete('pending-oauth-auth')

        window.history.replaceState({}, document.title, window.location.pathname)
        
        toast.success('Successfully authenticated with Bullhorn')
        onAuthenticated(session, connectionId)
      } catch (err) {
        console.error('OAuth callback error:', err)
        setStatus('error')
        const errorMessage = err instanceof Error ? err.message : 'Authentication failed'
        setError(errorMessage)
        toast.error(`Authentication failed: ${errorMessage}`)
      }
    }

    handleAutoAuthenticate()
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
