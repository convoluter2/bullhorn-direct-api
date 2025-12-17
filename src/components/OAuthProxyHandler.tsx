import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, XCircle, ArrowsClockwise } from '@phosphor-icons/react'

interface OAuthProxyHandlerProps {
  onCodeExtracted: (code: string, state: string) => void
  onError: (error: string) => void
}

export function OAuthProxyHandler({ onCodeExtracted, onError }: OAuthProxyHandlerProps) {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [message, setMessage] = useState('Processing OAuth callback...')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('🔍 OAuthProxyHandler: Processing callback URL')
        setProgress(20)

        const urlParams = new URLSearchParams(window.location.search)
        const code = urlParams.get('code')
        const error = urlParams.get('error')
        const errorDescription = urlParams.get('error_description')
        const state = urlParams.get('state')

        setProgress(40)

        if (error) {
          console.error('❌ OAuth error in callback:', error, errorDescription)
          setStatus('error')
          setMessage(`OAuth Error: ${error}${errorDescription ? ` - ${errorDescription}` : ''}`)
          onError(error)
          return
        }

        if (!code) {
          console.error('❌ No authorization code in callback')
          setStatus('error')
          setMessage('No authorization code received in callback')
          onError('No authorization code')
          return
        }

        console.log('✅ Code found in callback:', {
          codeLength: code.length,
          state,
          codePreview: code.substring(0, 20) + '...'
        })

        setProgress(60)
        setMessage('Authorization code received, decoding...')

        const decodedCode = decodeURIComponent(code)
        console.log('🔓 Code decoded:', {
          original: code.substring(0, 20) + '...',
          decoded: decodedCode.substring(0, 20) + '...',
          hasColon: decodedCode.includes(':')
        })

        setProgress(80)
        setMessage('Forwarding code to authentication handler...')

        await new Promise(resolve => setTimeout(resolve, 500))

        setProgress(100)
        setStatus('success')
        setMessage('Authorization successful! Completing login...')

        console.log('✅ Passing code to parent handler')
        onCodeExtracted(decodedCode, state || '')

        setTimeout(() => {
          window.history.replaceState({}, document.title, window.location.pathname)
        }, 1000)

      } catch (error) {
        console.error('❌ Error processing OAuth callback:', error)
        setStatus('error')
        setMessage(error instanceof Error ? error.message : 'Unknown error processing callback')
        onError(error instanceof Error ? error.message : 'Unknown error')
      }
    }

    handleCallback()
  }, [onCodeExtracted, onError])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status === 'processing' && (
              <>
                <ArrowsClockwise className="animate-spin text-primary" size={24} />
                Processing Authorization
              </>
            )}
            {status === 'success' && (
              <>
                <CheckCircle className="text-green-500" size={24} weight="fill" />
                Authorization Successful
              </>
            )}
            {status === 'error' && (
              <>
                <XCircle className="text-destructive" size={24} weight="fill" />
                Authorization Failed
              </>
            )}
          </CardTitle>
          <CardDescription>
            {status === 'processing' && 'Please wait while we complete your authentication...'}
            {status === 'success' && 'Your Bullhorn connection is being established...'}
            {status === 'error' && 'There was a problem with the authorization process'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progress} className="w-full" />
          
          <Alert variant={status === 'error' ? 'destructive' : 'default'}>
            <AlertDescription className="text-sm">
              {message}
            </AlertDescription>
          </Alert>

          {status === 'processing' && (
            <p className="text-xs text-muted-foreground text-center">
              This should only take a few seconds...
            </p>
          )}

          {status === 'error' && (
            <p className="text-xs text-muted-foreground text-center">
              Please close this window and try again, or contact support if the issue persists.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
