import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
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
  const [welcomePageDetected, setWelcomePageDetected] = useState(false)
  const [currentUrl, setCurrentUrl] = useState<string>('')
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    let isMounted = true
    let pollAttempts = 0
    const maxPollAttempts = 60
    let lastKnownUrl = ''
    let welcomePageRetries = 0
    const maxWelcomeRetries = 5

    console.log('🖼️ Iframe OAuth monitor initialized (30 second timeout)')
    console.log('🔗 Auth URL:', authUrl.substring(0, 100) + '...')

    const extractCodeWithRetry = async (iframeUrl: string, retryCount: number = 0): Promise<boolean> => {
      try {
        const url = new URL(iframeUrl)
        const code = url.searchParams.get('code')
        const error = url.searchParams.get('error')

        console.log(`🔍 [Attempt ${retryCount + 1}/${maxWelcomeRetries}] Welcome page code extraction:`, {
          hasCode: !!code,
          hasError: !!error,
          codePreview: code ? code.substring(0, 30) + '...' : null,
          fullUrl: iframeUrl.substring(0, 150)
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
          let finalCode = code
          if (code.includes('%3A') || code.includes('%2F') || code.includes('%3a')) {
            finalCode = decodeURIComponent(code)
            console.log('🔧 Decoded URL-encoded code:', {
              original: code.substring(0, 30),
              decoded: finalCode.substring(0, 30)
            })
          }
          
          console.log('✅ Successfully extracted code from Welcome to Bullhorn page!')
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
          if (timeoutRef.current) clearTimeout(timeoutRef.current)
          onCodeReceived(finalCode)
          return true
        }

        if (retryCount < maxWelcomeRetries - 1) {
          const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 5000)
          console.log(`⏳ Code not found yet, retrying in ${backoffDelay}ms (retry ${retryCount + 1}/${maxWelcomeRetries})`)
          
          await new Promise(resolve => setTimeout(resolve, backoffDelay))
          
          if (!isMounted) return false
          
          return extractCodeWithRetry(iframeUrl, retryCount + 1)
        } else {
          console.warn('⚠️ Max retries reached for welcome page, code still not available')
          return false
        }
      } catch (urlError) {
        console.error(`❌ [Attempt ${retryCount + 1}] Error parsing welcome page URL:`, urlError)
        
        if (retryCount < maxWelcomeRetries - 1) {
          const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 5000)
          console.log(`⏳ Retrying after error in ${backoffDelay}ms...`)
          
          await new Promise(resolve => setTimeout(resolve, backoffDelay))
          
          if (!isMounted) return false
          
          return extractCodeWithRetry(iframeUrl, retryCount + 1)
        }
        
        return false
      }
    }

    const checkForCode = () => {
      try {
        if (iframeRef.current?.contentWindow?.location.href) {
          const iframeUrl = iframeRef.current.contentWindow.location.href

          if (iframeUrl !== lastKnownUrl) {
            lastKnownUrl = iframeUrl
            setCurrentUrl(iframeUrl)
            console.log('🔄 Iframe navigated to:', iframeUrl.substring(0, 100))
          }

          if (iframeUrl.includes('welcome.bullhornstaffing.com')) {
            console.log('🎉 WELCOME PAGE DETECTED! Starting code extraction with retry logic...')
            console.log('📄 Welcome to Bullhorn page - "Thank you for using Bullhorn" page loaded')
            setWelcomePageDetected(true)
            toast.success('✅ Welcome to Bullhorn page loaded! Extracting code...', { id: 'welcome-detect' })
            
            extractCodeWithRetry(iframeUrl, 0).then(success => {
              if (!success && isMounted) {
                console.warn('⚠️ All retry attempts failed, continuing to poll...')
              }
            })
            
            return false
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
                let finalCode = code
                if (code.includes('%3A') || code.includes('%2F') || code.includes('%3a')) {
                  finalCode = decodeURIComponent(code)
                  console.log('🔧 Decoded URL-encoded code:', {
                    original: code.substring(0, 30),
                    decoded: finalCode.substring(0, 30)
                  })
                }
                
                console.log('✅ Successfully extracted code from iframe!')
                if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
                if (timeoutRef.current) clearTimeout(timeoutRef.current)
                onCodeReceived(finalCode)
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
          console.error('❌ Iframe monitoring timeout after 30 seconds - connection not established')
          setStatus('error')
          setErrorMessage('Connection timeout after 30 seconds. Unable to connect to Bullhorn. Please check your credentials or try the popup method.')
          onError('Timeout after 30 seconds')
          return
        }

        const foundCode = checkForCode()
        
        if (!foundCode && pollAttempts % 10 === 0) {
          const secondsElapsed = (pollAttempts * 0.5).toFixed(1)
          console.log(`[Iframe Poll ${pollAttempts}/${maxPollAttempts}] Still monitoring... (${secondsElapsed}s / 30s elapsed)`)
        }
      }, 500)

      timeoutRef.current = setTimeout(() => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
        if (isMounted) {
          console.error('❌ Iframe monitoring timeout after 30 seconds')
          setStatus('error')
          setErrorMessage('Connection timeout after 30 seconds. Unable to connect to Bullhorn. Bullhorn may be blocking iframe access. Please try the popup method instead.')
          onError('Timeout after 30 seconds')
        }
      }, 30000)
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
          {welcomePageDetected && (
            <Alert className="border-green-500 bg-green-500/10">
              <Info className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700 font-medium">
                ✅ Welcome to Bullhorn page detected! Extracting authorization code...
              </AlertDescription>
            </Alert>
          )}
          {currentUrl && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">Current URL in Iframe:</Label>
              <div className="p-2 bg-muted rounded border border-border font-mono text-xs break-all">
                {currentUrl}
              </div>
            </div>
          )}
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
