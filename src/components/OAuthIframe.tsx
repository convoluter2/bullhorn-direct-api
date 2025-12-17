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
    let lastKnownUrl = ''

    console.log('🖼️ Iframe OAuth monitor initialized')
    console.log('🔗 Auth URL:', authUrl.substring(0, 100) + '...')

    const checkForCode = () => {
      try {
        if (iframeRef.current?.contentWindow?.location.href) {
          const iframeUrl = iframeRef.current.contentWindow.location.href

          if (iframeUrl !== lastKnownUrl) {
            lastKnownUrl = iframeUrl
            console.log('🔄 Iframe navigated to:', iframeUrl.substring(0, 100))
          }

          if (iframeUrl.includes('welcome.bullhornstaffing.com')) {
            console.log('🎉 WELCOME PAGE DETECTED! Extracting code immediately...')
            
            try {
              const url = new URL(iframeUrl)
              const code = url.searchParams.get('code')
              const error = url.searchParams.get('error')

              console.log('✅ Welcome page code extraction:', {
                hasCode: !!code,
                hasError: !!error,
                codePreview: code ? code.substring(0, 30) + '...' : null
              })

              if (error) {
                console.error('❌ OAuth error in welcome page:', error)
                if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
                if (timeoutRef.current) clearTimeout(timeoutRef.current)
                setStatus('error')
                setErrorMessage(`OAuth error: ${error}`)
                onError(error)
                return true
              }

              if (code) {
                console.log('✅ Successfully extracted code from Welcome to Bullhorn page!')
                if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
                if (timeoutRef.current) clearTimeout(timeoutRef.current)
                onCodeReceived(code)
                return true
              }
            } catch (urlError) {
              console.error('❌ Error parsing welcome page URL:', urlError)
            }
          }

          if (iframeUrl.includes('code=')) {
            try {
              const url = new URL(iframeUrl)
              const code = url.searchParams.get('code')
              const error = url.searchParams.get('error')

              console.log('✅ Code parameter detected in iframe URL!', {
                hasCode: !!code,
                hasError: !!error,
                codePreview: code ? code.substring(0, 30) + '...' : null
              })

              if (error) {
                console.error('❌ OAuth error in iframe URL:', error)
                if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
                if (timeoutRef.current) clearTimeout(timeoutRef.current)
                setStatus('error')
                setErrorMessage(`OAuth error: ${error}`)
                onError(error)
                return true
              }

              if (code) {
                console.log('✅ Successfully extracted code from iframe!')
                if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
                if (timeoutRef.current) clearTimeout(timeoutRef.current)
                onCodeReceived(code)
                return true
              }
            } catch (urlError) {
              console.error('❌ Error parsing iframe URL:', urlError)
            }
          }
          return false
        }
      } catch (crossOriginError) {
        return false
      }
      return false
    }

    const startMonitoring = () => {
      console.log('📱 Starting iframe URL monitoring...')
      setStatus('monitoring')

      pollIntervalRef.current = setInterval(() => {
        pollAttempts++

        if (pollAttempts > maxPollAttempts) {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
          if (timeoutRef.current) clearTimeout(timeoutRef.current)
          console.error('❌ Iframe monitoring timeout after', maxPollAttempts / 2, 'seconds')
          setStatus('error')
          setErrorMessage('Authentication timeout - the process took too long. Please try the popup method.')
          onError('Timeout')
          return
        }

        const foundCode = checkForCode()
        
        if (!foundCode && pollAttempts % 20 === 0) {
          console.log(`[Iframe Poll ${pollAttempts}/${maxPollAttempts}] Still monitoring... (${pollAttempts * 0.5}s elapsed)`)
        }
      }, 500)

      timeoutRef.current = setTimeout(() => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
        if (isMounted) {
          console.error('❌ Iframe monitoring timeout (3 minutes)')
          setStatus('error')
          setErrorMessage('Authentication timeout - Bullhorn may be blocking iframe access. Please try the popup method instead.')
          onError('Timeout after 3 minutes')
        }
      }, 180000)
    }

    const iframeLoadHandler = () => {
      console.log('📱 Iframe loaded event fired')
      const foundCode = checkForCode()
      if (!foundCode) {
        console.log('📱 No code found on initial load, starting continuous monitoring...')
        startMonitoring()
      }
    }

    const currentIframe = iframeRef.current
    if (currentIframe) {
      currentIframe.addEventListener('load', iframeLoadHandler)
      
      setTimeout(() => {
        if (isMounted && !checkForCode()) {
          console.log('📱 Initial check did not find code, starting fallback monitoring...')
          startMonitoring()
        }
      }, 1000)
    }

    return () => {
      isMounted = false
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (currentIframe) {
        currentIframe.removeEventListener('load', iframeLoadHandler)
      }
      console.log('🧹 Iframe monitor cleanup complete')
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
            {status === 'loading' ? 'Loading Authentication' : 'Waiting for Login'}
          </CardTitle>
          <CardDescription>
            {status === 'loading' 
              ? 'Preparing authentication iframe...' 
              : 'Log in to Bullhorn in the frame below - we\'ll automatically detect and extract the code'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs space-y-1">
              <p><strong>Instructions:</strong></p>
              <ul className="list-disc list-inside ml-2 space-y-0.5">
                <li>Complete your Bullhorn login in the frame below</li>
                <li>The code will be automatically extracted when you're redirected</li>
                <li>If the iframe is blank or blocked, click "Cancel & Use Popup Instead"</li>
              </ul>
            </AlertDescription>
          </Alert>
          <div className="border-2 border-accent/50 rounded-lg overflow-hidden shadow-lg bg-card" style={{ height: '600px' }}>
            <iframe
              ref={iframeRef}
              src={authUrl}
              title="Bullhorn OAuth Login"
              className="w-full h-full bg-white"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={onCancel} variant="outline" className="flex-1">
              Cancel & Use Popup Instead
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
