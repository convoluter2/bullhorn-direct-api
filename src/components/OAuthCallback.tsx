import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, Spinner, ArrowLeft } from '@phosphor-icons/react'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { toast } from 'sonner'
import type { BullhornSession } from '@/lib/types'

interface OAuthCallbackProps {
  onAuthenticated: (session: BullhornSession) => void
  onCancel: () => void
  storedCredentials: { clientId: string; clientSecret: string } | null
  onSaveCredentials: (clientId: string, clientSecret: string) => void
}

export function OAuthCallback({ 
  onAuthenticated, 
  onCancel, 
  storedCredentials,
  onSaveCredentials 
}: OAuthCallbackProps) {
  const [status, setStatus] = useState<'detecting' | 'found' | 'error' | 'manual'>('detecting')
  const [authCode, setAuthCode] = useState('')
  const [error, setError] = useState('')
  const [clientId, setClientId] = useState(storedCredentials?.clientId || '')
  const [clientSecret, setClientSecret] = useState(storedCredentials?.clientSecret || '')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const handleAutoAuthenticate = async (code: string, cId: string, cSecret: string) => {
      setLoading(true)
      try {
        const tokenData = await bullhornAPI.exchangeCodeForToken(code, cId, cSecret)
        const session = await bullhornAPI.login(tokenData.accessToken)
        session.refreshToken = tokenData.refreshToken
        session.expiresAt = Date.now() + (tokenData.expiresIn * 1000)

        window.history.replaceState({}, document.title, window.location.pathname)
        
        toast.success('Successfully authenticated with Bullhorn')
        onAuthenticated(session)
      } catch (err) {
        setStatus('manual')
        setError(err instanceof Error ? err.message : 'Authentication failed')
        toast.error('Auto-authentication failed. Please enter credentials manually.')
      } finally {
        setLoading(false)
      }
    }

    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    const errorParam = urlParams.get('error')
    const errorDescription = urlParams.get('error_description')

    if (errorParam) {
      setStatus('error')
      setError(errorDescription || errorParam)
      return
    }

    if (code) {
      const decodedCode = decodeURIComponent(code)
      setAuthCode(decodedCode)
      setStatus('found')
      
      if (storedCredentials) {
        handleAutoAuthenticate(decodedCode, storedCredentials.clientId, storedCredentials.clientSecret)
      }
    } else {
      setStatus('manual')
    }
  }, [storedCredentials, onAuthenticated])

  const handleManualAuthenticate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const tokenData = await bullhornAPI.exchangeCodeForToken(authCode, clientId, clientSecret)
      const session = await bullhornAPI.login(tokenData.accessToken)
      session.refreshToken = tokenData.refreshToken
      session.expiresAt = Date.now() + (tokenData.expiresIn * 1000)

      onSaveCredentials(clientId, clientSecret)
      
      window.history.replaceState({}, document.title, window.location.pathname)
      
      toast.success('Successfully authenticated with Bullhorn')
      onAuthenticated(session)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
      toast.error(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'detecting' || (status === 'found' && loading && storedCredentials)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Spinner className="animate-spin" size={24} />
              Completing Authentication
            </CardTitle>
            <CardDescription>
              Processing your authorization code...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>✓ Authorization code detected</p>
              <p>✓ Exchanging code for access token</p>
              <p>✓ Logging into Bullhorn REST API</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === 'error') {
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {authCode ? (
              <>
                <CheckCircle size={24} weight="fill" className="text-accent" />
                Authorization Code Received
              </>
            ) : (
              'Complete Authentication'
            )}
          </CardTitle>
          <CardDescription>
            {authCode 
              ? 'Enter your OAuth credentials to complete the process'
              : 'No authorization code detected in URL'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleManualAuthenticate} className="space-y-4">
            {authCode && (
              <div className="space-y-2">
                <Label>Authorization Code</Label>
                <Input
                  value={authCode}
                  readOnly
                  className="font-mono text-xs bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Code has been automatically decoded and is ready for authentication
                </p>
              </div>
            )}

            {!authCode && (
              <div className="space-y-2">
                <Label htmlFor="manual-code">Authorization Code</Label>
                <Input
                  id="manual-code"
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value)}
                  placeholder="Paste authorization code"
                  required
                  disabled={loading}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="oauth-clientId">Client ID</Label>
              <Input
                id="oauth-clientId"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
                disabled={loading}
                placeholder="Your OAuth Client ID"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="oauth-clientSecret">Client Secret</Label>
              <Input
                id="oauth-clientSecret"
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                required
                disabled={loading}
                placeholder="Your OAuth Client Secret"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription className="text-xs">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? 'Authenticating...' : 'Complete Authentication'}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
