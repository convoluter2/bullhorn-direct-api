import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { XCircle, Spinner, Info } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface OAuthIframeProps {
  authUrl: string
  onCodeReceived: (code: string) => void
  onError: (error: string) => void
  onCancel: () => void
}

export function OAuthIframe({ authUrl, onCodeReceived, onError, onCancel }: OAuthIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [status, setStatus] = useState<'loading' | 'monitoring' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    let isMounted = true
    let pollAttempts = 0
    const maxPollAttempts = 360

    const startMonitoring = () => {
      console.log('📱 Starting iframe URL monitoring...')
      setStatus('monitoring')

      pollIntervalRef.current = setInterval(() => {
        pollAttempts++

        if (pollAttempts > maxPollAttempts) {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
          if (timeoutRef.current) clearTimeout(timeoutRef.current)
          console.error('❌ Iframe monitoring timeout')
          setStatus('error')
          setErrorMessage('Authentication timeout - the process took too long')
          onError('Timeout')
          return
        }

        try {
          if (iframeRef.current?.contentWindow?.location.href) {
            const iframeUrl = iframeRef.current.contentWindow.location.href

            if (pollAttempts % 10 === 0) {
              console.log(`[Iframe Poll ${pollAttempts}] URL accessible:`, iframeUrl.substring(0, 100))
            }

            if (iframeUrl.includes('code=')) {
              try {
                const url = new URL(iframeUrl)
                const code = url.searchParams.get('code')
                const error = url.searchParams.get('error')

                if (error) {
                  console.error('❌ OAuth error in iframe URL:', error)
                  if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
                  if (timeoutRef.current) clearTimeout(timeoutRef.current)
                  setStatus('error')
                  setErrorMessage(`OAuth error: ${error}`)
                  onError(error)
                  return
                }

                if (code) {
                  console.log('✅ Code extracted from iframe URL!')
                  if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
                  if (timeoutRef.current) clearTimeout(timeoutRef.current)
                  onCodeReceived(code)
                }
              } catch (urlError) {
                console.error('❌ Error parsing iframe URL:', urlError)
              }
            }
          }
        } catch (crossOriginError) {
          if (pollAttempts % 20 === 0) {
            console.log(`[Iframe Poll ${pollAttempts}] Cross-origin, continuing to monitor...`)
          }
        }
      }, 500)

      timeoutRef.current = setTimeout(() => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
        if (isMounted) {
          console.error('❌ Iframe monitoring timeout (3 minutes)')
          setStatus('error')
          setErrorMessage('Authentication timeout - please try the popup method instead')
          onError('Timeout after 3 minutes')
        }
      }, 180000)
    }

    const iframeLoadHandler = () => {
      console.log('📱 Iframe loaded, starting monitoring...')
      startMonitoring()
    }

    const currentIframe = iframeRef.current
    if (currentIframe) {
      currentIframe.addEventListener('load', iframeLoadHandler)
    }

    return () => {
      isMounted = false
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (currentIframe) {
        currentIframe.removeEventListener('load', iframeLoadHandler)
      }
    }
  }, [authUrl, onCodeReceived, onError])

  if (status === 'error') {
    return (
      <Card className="w-full border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <XCircle size={24} weight="fill" />
            Iframe Authentication Failed
          </CardTitle>
          <CardDescription>
            The iframe-based authentication encountered an error
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertDescription>
              {errorMessage}
            </AlertDescription>
          </Alert>
          <div className="text-sm text-muted-foreground">
            <p className="mb-2">Possible reasons:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Bullhorn may block iframe embedding (X-Frame-Options)</li>
              <li>Cross-origin restrictions preventing URL access</li>
              <li>Network or authentication issues</li>
            </ul>
            <p className="mt-3">
              <strong>Recommendation:</strong> Use the popup-based flow instead (enabled by default).
            </p>
          </div>
          <Button onClick={onCancel} variant="outline" className="w-full">
            Back
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Spinner className="animate-spin" size={24} />
            {status === 'loading' ? 'Loading Authentication' : 'Monitoring Authentication'}
          </CardTitle>
          <CardDescription>
            {status === 'loading' 
              ? 'Preparing authentication iframe...' 
              : 'Complete your login in the frame below'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Note:</strong> Bullhorn may block iframe embedding. If this method doesn't work, 
              the popup-based flow is more reliable and will automatically extract the code for you.
            </AlertDescription>
          </Alert>
          <div className="border border-border rounded-lg overflow-hidden" style={{ height: '600px' }}>
            <iframe
              ref={iframeRef}
              src={authUrl}
              title="Bullhorn OAuth"
              className="w-full h-full"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            />
          </div>
          <Button onClick={onCancel} variant="outline" className="w-full">
            Cancel & Use Popup Instead
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
