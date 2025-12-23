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
import { oauthProxyService } from '@/lib/oauth-proxy'
import { Copy, Info, CheckCircle, Circle, Lightning } from '@phosphor-icons/react'
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
  const [welcomePageDetected, setWelcomePageDetected] = useState(false)
  const [authStep, setAuthStep] = useState<AuthStep>('idle')
  const [authProgress, setAuthProgress] = useState(0)
  const [popupUrl, setPopupUrl] = useState<string>('')
  const [manualAuth, setManualAuth] = useState({
    clientId: '',
    clientSecret: '',
    username: '',
    password: '',
    authCode: '',
    useAutomatedFlow: true
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
            authCode: '',
            useAutomatedFlow: true
          })
        }
      } else if (open && !preselectedConnection) {
        setManualAuth(prev => ({
          ...prev,
          useAutomatedFlow: true
        }))
      }
      setWelcomePageDetected(false)
      setAuthStep('idle')
      setAuthProgress(0)
      setPopupUrl('')
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
          authCode: '', 
          useAutomatedFlow: true
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
          authCode: '', 
          useAutomatedFlow: true
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
  
  const handleStartOAuthFlow = async () => {
    if (!manualAuth.clientId || !manualAuth.clientSecret) {
      toast.error('Please enter your Client ID and Client Secret first')
      return
    }

    if (!manualAuth.username || !manualAuth.password) {
      toast.error('Please enter your Bullhorn username and password')
      return
    }

    let pollInterval: NodeJS.Timeout | null = null
    let timeoutId: NodeJS.Timeout | null = null
    let popup: Window | null = null
    let messageListener: ((event: MessageEvent) => void) | null = null

    try {
      console.log('🚀 STARTING OAUTH FLOW')
      console.log('📋 Credentials check:', {
        hasClientId: !!manualAuth.clientId,
        hasClientSecret: !!manualAuth.clientSecret,
        hasUsername: !!manualAuth.username,
        hasPassword: !!manualAuth.password,
        clientIdPreview: manualAuth.clientId.substring(0, 10) + '...'
      })

      setLoading(true)
      setWelcomePageDetected(false)
      setAuthStep('opening-popup')
      setAuthProgress(10)
      
      console.log('💾 Saving pending auth to KV store...')
      await window.spark.kv.set('pending-oauth-auth', {
        clientId: manualAuth.clientId,
        clientSecret: manualAuth.clientSecret,
        username: manualAuth.username,
        connectionId: preselectedConnection?.id,
        timestamp: Date.now()
      })

      console.log('🔍 Fetching loginInfo to determine OAuth URL...')
      await bullhornAPI.prepareForAuth(manualAuth.username)
      
      const authUrl = getAuthUrl()
      console.log('🔗 Generated auth URL (length:', authUrl.length + '):', authUrl.substring(0, 150) + '...')
      
      const popupWidth = 600
      const popupHeight = 700
      const left = (window.screen.width - popupWidth) / 2
      const top = (window.screen.height - popupHeight) / 2

      console.log('🪟 Opening popup window...')
      setAuthProgress(15)
      toast.loading('Opening Bullhorn login...', { id: 'oauth-popup' })

      popup = window.open(
        authUrl,
        'bullhorn-oauth',
        `width=${popupWidth},height=${popupHeight},left=${left},top=${top},toolbar=no,menubar=no,location=no,status=no`
      )

      if (!popup) {
        console.error('❌ POPUP BLOCKED!')
        toast.error('Popup blocked. Please allow popups for this site.', { id: 'oauth-popup' })
        setLoading(false)
        setAuthStep('idle')
        setAuthProgress(0)
        return
      }

      console.log('✅ Popup opened successfully, setting up monitoring...')
      setAuthStep('waiting-login')
      setAuthProgress(25)
      toast.loading('Waiting for login...', { id: 'oauth-popup' })

      messageListener = (event: MessageEvent) => {
        console.log('📨 Message received from:', event.origin, 'Data type:', event.data?.type)
        
        if (event.origin !== window.location.origin) {
          console.warn('⚠️ Ignoring message from different origin:', event.origin)
          return
        }
        
        if (event.data && typeof event.data === 'object') {
          if (event.data.type === 'BULLHORN_OAUTH_CODE' && event.data.code) {
            console.log('✅ CODE RECEIVED VIA POSTMESSAGE:', event.data.code.substring(0, 30) + '...')
            
            if (pollInterval) clearInterval(pollInterval)
            if (timeoutId) clearTimeout(timeoutId)
            if (popup && !popup.closed) popup.close()
            if (messageListener) window.removeEventListener('message', messageListener)
            
            setAuthStep('exchanging-token')
            setAuthProgress(60)
            toast.loading('Exchanging code for token...', { id: 'oauth-popup' })
            
            handleCodeExchange(event.data.code).catch((err) => {
              console.error('❌ CODE EXCHANGE FAILED:', err)
              toast.error('Failed to complete authentication', { id: 'oauth-popup' })
              setLoading(false)
              setAuthStep('idle')
              setAuthProgress(0)
            })
          } else if (event.data.type === 'BULLHORN_OAUTH_ERROR') {
            console.error('❌ OAuth error via message:', event.data.error)
            
            if (pollInterval) clearInterval(pollInterval)
            if (timeoutId) clearTimeout(timeoutId)
            if (popup && !popup.closed) popup.close()
            if (messageListener) window.removeEventListener('message', messageListener)
            
            toast.error(`OAuth error: ${event.data.error}`, { id: 'oauth-popup' })
            setLoading(false)
          }
        }
      }

      window.addEventListener('message', messageListener)
      console.log('✅ Message listener registered, starting 30-second polling window...')

      let codeFound = false
      let pollAttempts = 0
      const maxPollAttempts = 60

      pollInterval = setInterval(() => {
        pollAttempts++
        
        if (pollAttempts > maxPollAttempts) {
          if (pollInterval) clearInterval(pollInterval)
          if (timeoutId) clearTimeout(timeoutId)
          if (popup && !popup.closed) popup.close()
          if (messageListener) window.removeEventListener('message', messageListener)
          console.error('❌ POLLING TIMEOUT after 30 seconds - connection not established')
          console.error('💡 TROUBLESHOOTING:')
          console.error('   1. Verify your credentials are correct (username, password, client ID, client secret)')
          console.error('   2. Check if you can log in manually at auth-east/west.bullhornstaffing.com')
          console.error('   3. Ensure the OAuth app has the correct permissions')
          console.error('   4. Try disabling automated mode and using manual code entry')
          toast.error('Connection timeout after 30 seconds. Bullhorn login did not complete. Please verify your credentials and try again, or use manual mode.', { 
            id: 'oauth-popup',
            duration: 7000
          })
          setLoading(false)
          setAuthStep('idle')
          setAuthProgress(0)
          return
        }

        try {
          if (!popup || popup.closed) {
            if (pollInterval) clearInterval(pollInterval)
            if (timeoutId) clearTimeout(timeoutId)
            if (messageListener) window.removeEventListener('message', messageListener)
            if (!codeFound) {
              console.warn('⚠️ Popup closed without finding code')
              toast.error('Authentication window closed. Connection not established.', { 
                id: 'oauth-popup',
                duration: 4000
              })
              setLoading(false)
              setAuthStep('idle')
              setAuthProgress(0)
            }
            return
          }

          let popupUrlValue: string | undefined
          try {
            popupUrlValue = popup.location.href
            
            setPopupUrl(popupUrlValue)
            
            if (pollAttempts % 10 === 0) {
              const secondsElapsed = (pollAttempts * 0.5).toFixed(1)
              console.log(`[Poll ${pollAttempts}/${maxPollAttempts}] ${secondsElapsed}s elapsed - Accessible URL:`, popupUrlValue.substring(0, 100) + '...')
            }

            if (popupUrlValue.includes('welcome.bullhornstaffing.com')) {
              if (!welcomePageDetected) {
                console.log('🎉 WELCOME PAGE DETECTED in popup! Extracting code IMMEDIATELY to prevent expiration...')
                console.log('📄 Welcome to Bullhorn page - "Thank you for using Bullhorn" page loaded')
                setWelcomePageDetected(true)
                setAuthStep('welcome-detected')
                setAuthProgress(40)
                toast.success('✅ Welcome page detected! Extracting code...', { id: 'welcome-detect' })
                
                const extractCodeImmediately = async (): Promise<void> => {
                  try {
                    if (!popup) return
                    
                    const currentUrl = popup.location.href
                    const url = new URL(currentUrl)
                    const code = url.searchParams.get('code')
                    const error = url.searchParams.get('error')

                    console.log(`🔍 IMMEDIATE CODE EXTRACTION:`, { 
                      hasCode: !!code, 
                      hasError: !!error,
                      codePreview: code ? code.substring(0, 30) + '...' : null,
                      error: error,
                      fullUrl: currentUrl.substring(0, 150) + '...'
                    })

                    if (error) {
                      codeFound = true
                      if (pollInterval) clearInterval(pollInterval)
                      if (timeoutId) clearTimeout(timeoutId)
                      if (messageListener) window.removeEventListener('message', messageListener)
                      popup.close()
                      console.error('❌ OAuth error in URL:', error)
                      toast.error(`OAuth error: ${error}`, { id: 'oauth-popup' })
                      setLoading(false)
                      setAuthStep('idle')
                      setAuthProgress(0)
                      return
                    }

                    if (code) {
                      codeFound = true
                      if (pollInterval) clearInterval(pollInterval)
                      if (timeoutId) clearTimeout(timeoutId)
                      if (messageListener) window.removeEventListener('message', messageListener)
                      console.log(`⚡ CODE EXTRACTED! Processing IMMEDIATELY to avoid expiration (codes expire in 60 seconds)...`)
                      popup.close()
                      
                      setAuthStep('extracting-code')
                      setAuthProgress(50)
                      toast.loading('Code extracted! Exchanging immediately...', { id: 'oauth-popup' })
                      
                      handleCodeExchange(code).catch((err) => {
                        console.error('❌ CODE EXCHANGE FAILED:', err)
                        const errorMsg = err instanceof Error ? err.message : 'Authentication failed'
                        toast.error(errorMsg, { id: 'oauth-popup', duration: 7000 })
                        setLoading(false)
                        setAuthStep('idle')
                        setAuthProgress(0)
                      })
                    } else {
                      console.warn(`⚠️ Welcome page detected but NO CODE parameter yet - this is unusual`)
                      console.warn(`⚠️ URL was:`, currentUrl)
                      console.warn(`⚠️ This may indicate the OAuth flow failed silently`)
                    }
                  } catch (urlError) {
                    console.error(`❌ Error extracting code from popup URL:`, urlError)
                  }
                }
                
                extractCodeImmediately()
              }
            }
          } catch (crossOriginError) {
            setPopupUrl('(Cross-origin - cannot access URL during Bullhorn authentication)')
            
            if (pollAttempts % 20 === 0) {
              const secondsElapsed = (pollAttempts * 0.5).toFixed(1)
              console.log(`[Poll ${pollAttempts}/${maxPollAttempts}] ${secondsElapsed}s elapsed - Popup on cross-origin page (expected during Bullhorn auth flow)`)
            }
          }
        } catch (err) {
          if (pollAttempts % 30 === 0) {
            console.error(`[Poll ${pollAttempts}] Unexpected popup error:`, err)
          }
        }
      }, 500)

      timeoutId = setTimeout(() => {
        if (popup && !popup.closed) {
          if (pollInterval) clearInterval(pollInterval)
          if (messageListener) window.removeEventListener('message', messageListener)
          popup.close()
          toast.error('Connection timeout after 30 seconds. Unable to connect to Bullhorn. Please check your credentials and try again.', { 
            id: 'oauth-popup',
            duration: 5000
          })
          setLoading(false)
          setAuthStep('idle')
          setAuthProgress(0)
        }
      }, 30000)

    } catch (error) {
      console.error('❌ OAUTH FLOW ERROR:', error)
      console.error('❌ Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      if (pollInterval) clearInterval(pollInterval)
      if (timeoutId) clearTimeout(timeoutId)
      if (messageListener) window.removeEventListener('message', messageListener)
      if (popup && !popup.closed) {
        console.log('🧹 Closing popup due to error...')
        popup.close()
      }
      toast.error('Failed to start OAuth flow. Please try again.', { id: 'oauth-popup' })
      setLoading(false)
    }
  }

  const handleCodeExchange = async (code: string) => {
    const exchangeStartTime = Date.now()
    try {
      console.log('🔄 STARTING CODE EXCHANGE')
      console.log('⏱️  CRITICAL: Authorization codes expire in 60 seconds from generation')
      console.log('📝 Raw code received:', code.substring(0, 50) + '...')
      setAuthStep('exchanging-token')
      setAuthProgress(60)
      
      let codeToUse = code.trim()
      
      let decodedOnce = codeToUse
      try {
        decodedOnce = decodeURIComponent(codeToUse)
      } catch (e) {
        console.log('Code is not URL-encoded or already decoded')
      }
      
      if (decodedOnce !== codeToUse) {
        console.log('🔓 Code was URL-encoded (1st decode):', { 
          originalPreview: codeToUse.substring(0, 40), 
          decodedPreview: decodedOnce.substring(0, 40),
          hadColon: decodedOnce.includes(':')
        })
        codeToUse = decodedOnce
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
        } catch (e) {
          console.log('⚠️ Could not decode further, using current value')
          break
        }
      }

      console.log('🎫 Final code prepared for exchange')
      console.log('📋 Exchange parameters:', {
        codeLength: codeToUse.length,
        codePreview: codeToUse.substring(0, 20) + '...' + codeToUse.substring(codeToUse.length - 10),
        hasColon: codeToUse.includes(':'),
        clientIdPreview: manualAuth.clientId.substring(0, 10) + '...',
        hasSecret: !!manualAuth.clientSecret,
        username: manualAuth.username
      })

      setAuthProgress(70)
      console.log('⏱️  Attempting token exchange - this must complete within 60 seconds of code generation')
      const tokenData = await bullhornAPI.exchangeCodeForToken(
        codeToUse,
        manualAuth.clientId,
        manualAuth.clientSecret,
        manualAuth.username
      )
      
      const exchangeElapsed = ((Date.now() - exchangeStartTime) / 1000).toFixed(2)
      console.log(`✅ Token received in ${exchangeElapsed}s:`, {
        hasAccessToken: !!tokenData.accessToken,
        hasRefreshToken: !!tokenData.refreshToken,
        expiresIn: tokenData.expiresIn
      })
      
      console.log('🔐 Logging in to REST API...')
      setAuthStep('logging-in')
      setAuthProgress(85)
      const session = await bullhornAPI.login(tokenData.accessToken, manualAuth.username)
      
      session.refreshToken = tokenData.refreshToken
      session.expiresAt = Date.now() + (tokenData.expiresIn * 1000)

      const totalElapsed = ((Date.now() - exchangeStartTime) / 1000).toFixed(2)
      console.log(`✅ Session established in ${totalElapsed}s total:`, {
        hasToken: !!session.BhRestToken,
        hasRestUrl: !!session.restUrl,
        corporationId: session.corporationId,
        userId: session.userId
      })

      console.log('🧹 Cleaning up pending auth...')
      await window.spark.kv.delete('pending-oauth-auth')
      
      console.log('🎉 Authentication complete, notifying parent component...')
      setAuthStep('complete')
      setAuthProgress(100)
      toast.success('Successfully authenticated with Bullhorn', { id: 'oauth-popup' })
      
      onAuthenticated(session, preselectedConnection?.id)
      onOpenChange(false)
      
      setManualAuth({ 
        clientId: '', 
        clientSecret: '',
        username: '',
        password: '', 
        authCode: '', 
        useAutomatedFlow: true
      })
      setLoading(false)
      setAuthStep('idle')
      setAuthProgress(0)
      
      console.log(`✅ CODE EXCHANGE COMPLETE - Total time: ${totalElapsed}s`)
    } catch (error) {
      const exchangeElapsed = ((Date.now() - exchangeStartTime) / 1000).toFixed(2)
      console.error(`❌ CODE EXCHANGE ERROR after ${exchangeElapsed}s:`, error)
      console.error('❌ Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timeElapsed: `${exchangeElapsed}s`
      })
      
      let errorMessage = error instanceof Error ? error.message : 'Authentication failed'
      
      if (errorMessage.includes('invalid_grant') || errorMessage.includes('expired')) {
        errorMessage = `Authorization code expired or invalid. The code must be used within 60 seconds of generation. Time elapsed: ${exchangeElapsed}s. Please try again.`
        console.error('💡 TROUBLESHOOTING:')
        console.error('   1. The authorization code expires in 60 seconds')
        console.error('   2. Each code can only be used once')
        console.error('   3. Verify your system clock is accurate')
        console.error('   4. Check that the correct OAuth region is being used')
        console.error(`   5. This exchange took ${exchangeElapsed}s - may have timed out`)
      }
      
      toast.error(errorMessage, { id: 'oauth-popup', duration: 8000 })
      setLoading(false)
      setAuthStep('idle')
      setAuthProgress(0)
      throw error
    }
  }

  const handleProxyBasedAuth = async () => {
    if (!manualAuth.clientId || !manualAuth.clientSecret || !manualAuth.username || !manualAuth.password) {
      toast.error('Please enter all required credentials')
      return
    }

    try {
      console.log('🚀 Starting proxy-based OAuth flow')
      
      const isHealthy = await oauthProxyService.checkHealth()
      if (!isHealthy) {
        toast.error('OAuth proxy server is not available. Please check server logs.')
        return
      }
      
      setLoading(true)
      setAuthStep('opening-popup')
      setAuthProgress(10)
      
      await bullhornAPI.prepareForAuth(manualAuth.username)
      const loginInfo = await bullhornAPI.getLoginInfo(manualAuth.username)
      
      console.log('🎯 Building OAuth URL with proxy redirect')
      setAuthProgress(20)
      
      const state = oauthProxyService.generateState()
      const proxyCallbackUrl = oauthProxyService.getProxyCallbackUrl()
      
      const authUrl = `${loginInfo.oauthUrl}/authorize?client_id=${manualAuth.clientId}&response_type=code&state=${state}&redirect_uri=${encodeURIComponent(proxyCallbackUrl)}&action=Login&username=${encodeURIComponent(manualAuth.username)}&password=${encodeURIComponent(manualAuth.password)}`
      
      console.log('🔗 Opening auth window with state:', state)
      console.log('📍 Redirect URI:', proxyCallbackUrl)
      setAuthProgress(25)
      setAuthStep('waiting-login')
      
      const popupWidth = 600
      const popupHeight = 700
      const left = (window.screen.width - popupWidth) / 2
      const top = (window.screen.height - popupHeight) / 2

      const popup = window.open(
        authUrl,
        'bullhorn-oauth-proxy',
        `width=${popupWidth},height=${popupHeight},left=${left},top=${top},toolbar=no,menubar=no,location=no,status=no`
      )

      if (!popup) {
        toast.error('Popup blocked. Please allow popups for this site.')
        setLoading(false)
        setAuthStep('idle')
        setAuthProgress(0)
        return
      }

      toast.loading('Waiting for authentication...', { id: 'proxy-auth' })
      setAuthProgress(30)

      let messageReceived = false

      const messageListener = (event: MessageEvent) => {
        console.log('📨 Message received:', event.data?.type)
        
        if (event.data?.type === 'OAUTH_SUCCESS' && event.data.code) {
          messageReceived = true
          console.log('✅ OAuth code received via postMessage')
          window.removeEventListener('message', messageListener)
          
          if (popup && !popup.closed) {
            popup.close()
          }
          
          setAuthStep('extracting-code')
          setAuthProgress(60)
          toast.loading('Exchanging code for token...', { id: 'proxy-auth' })
          
          handleCodeExchange(event.data.code).catch((err) => {
            console.error('❌ Code exchange failed:', err)
            toast.error('Failed to complete authentication', { id: 'proxy-auth' })
            setLoading(false)
            setAuthStep('idle')
            setAuthProgress(0)
          })
        } else if (event.data?.type === 'OAUTH_ERROR') {
          messageReceived = true
          console.error('❌ OAuth error received:', event.data.error)
          window.removeEventListener('message', messageListener)
          
          if (popup && !popup.closed) {
            popup.close()
          }
          
          toast.error(`Authentication failed: ${event.data.error_description || event.data.error}`, { id: 'proxy-auth' })
          setLoading(false)
          setAuthStep('idle')
          setAuthProgress(0)
        }
      }

      window.addEventListener('message', messageListener)

      const checkPopupClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopupClosed)
          window.removeEventListener('message', messageListener)
          
          if (!messageReceived && !loading) {
            console.warn('⚠️ Popup closed without receiving code')
            toast.error('Authentication cancelled', { id: 'proxy-auth' })
            setLoading(false)
            setAuthStep('idle')
            setAuthProgress(0)
          }
        }
      }, 500)

      setTimeout(() => {
        clearInterval(checkPopupClosed)
        window.removeEventListener('message', messageListener)
        
        if (!messageReceived && popup && !popup.closed) {
          popup.close()
          toast.error('Authentication timeout. Please try again.', { id: 'proxy-auth' })
          setLoading(false)
          setAuthStep('idle')
          setAuthProgress(0)
        }
      }, 60000)
      
    } catch (error) {
      console.error('❌ Proxy-based auth failed:', error)
      toast.error(error instanceof Error ? error.message : 'Authentication failed', { id: 'proxy-auth' })
      setLoading(false)
      setAuthStep('idle')
      setAuthProgress(0)
    }
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
            ✨ Automated OAuth - Popup window will handle authentication automatically
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
                  {authStep === 'opening-popup' || authStep !== 'idle' ? (
                    <CheckCircle weight="fill" className="text-accent" size={16} />
                  ) : (
                    <Circle className="text-muted-foreground" size={16} />
                  )}
                  <span className={authStep === 'opening-popup' ? 'text-accent font-medium' : 'text-muted-foreground'}>
                    Opening authentication window
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  {authStep === 'waiting-login' || authStep === 'welcome-detected' || authStep === 'extracting-code' || authStep === 'exchanging-token' || authStep === 'logging-in' || authStep === 'complete' ? (
                    <CheckCircle weight="fill" className="text-accent" size={16} />
                  ) : (
                    <Circle className="text-muted-foreground" size={16} />
                  )}
                  <span className={authStep === 'waiting-login' ? 'text-accent font-medium' : authStep === 'opening-popup' || authStep === 'idle' ? 'text-muted-foreground' : 'text-foreground'}>
                    Waiting for Bullhorn login
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  {authStep === 'welcome-detected' || authStep === 'extracting-code' || authStep === 'exchanging-token' || authStep === 'logging-in' || authStep === 'complete' ? (
                    <CheckCircle weight="fill" className="text-accent" size={16} />
                  ) : (
                    <Circle className="text-muted-foreground" size={16} />
                  )}
                  <span className={authStep === 'welcome-detected' ? 'text-accent font-medium' : (authStep === 'extracting-code' || authStep === 'exchanging-token' || authStep === 'logging-in' || authStep === 'complete') ? 'text-foreground' : 'text-muted-foreground'}>
                    Welcome page detected
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  {authStep === 'extracting-code' || authStep === 'exchanging-token' || authStep === 'logging-in' || authStep === 'complete' ? (
                    <CheckCircle weight="fill" className="text-accent" size={16} />
                  ) : (
                    <Circle className="text-muted-foreground" size={16} />
                  )}
                  <span className={authStep === 'extracting-code' ? 'text-accent font-medium' : authStep === 'exchanging-token' || authStep === 'logging-in' || authStep === 'complete' ? 'text-foreground' : 'text-muted-foreground'}>
                    Extracting authorization code
                  </span>
                </div>
                
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
          
          {popupUrl && loading && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">Current URL in Popup:</Label>
              <div className="p-2 bg-muted rounded border border-border font-mono text-xs break-all">
                {popupUrl}
              </div>
            </div>
          )}
          
          {welcomePageDetected && (
            <Alert className="border-green-500 bg-green-500/10">
              <Info className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700 font-medium">
                ✅ Welcome to Bullhorn page detected in popup! Extracting authorization code...
              </AlertDescription>
            </Alert>
          )}
          
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <p className="font-medium">🔐 Automated OAuth Authentication</p>
              <p className="text-xs">
                <strong>🪟 Popup Method (Recommended):</strong> Opens Bullhorn login in a popup window. Automatically logs you in, 
                extracts the authorization code, and closes the popup. This is the only reliable method due to Bullhorn's X-Frame-Options security policy.
              </p>
              <p className="text-xs mt-1">
                <strong>⚡ Manual/Programmatic:</strong> Fallback options if the popup method doesn't work with your Bullhorn configuration or browser settings.
              </p>
              <p className="text-xs mt-2 text-muted-foreground">
                ⚠️ Note: Iframe method is disabled because Bullhorn blocks iframe embedding for security reasons (X-Frame-Options header).
              </p>
              <p className="text-xs mt-2 p-2 bg-muted rounded border border-border">
                <strong>⏱️ 30-Second Timeout:</strong> If the popup doesn't complete within 30 seconds, verify your credentials are correct. 
                Incorrect credentials will cause the popup to hang on the login page. If this persists, disable automated mode and manually paste the code.
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

            <div className="space-y-3 p-4 bg-muted/50 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">✨ Popup OAuth Mode (Recommended)</Label>
                <div className="flex items-center gap-2">
                  <Label htmlFor="useAutomatedFlow" className="text-xs text-muted-foreground cursor-pointer">
                    Enable
                  </Label>
                  <input
                    id="useAutomatedFlow"
                    type="checkbox"
                    checked={manualAuth.useAutomatedFlow}
                    onChange={(e) => setManualAuth({ 
                      ...manualAuth, 
                      useAutomatedFlow: e.target.checked
                    })}
                    className="cursor-pointer"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                <strong>Enabled:</strong> Opens Bullhorn login in a popup window, automatically logs you in using your credentials, 
                extracts the authorization code when Bullhorn redirects back, and closes the popup. <strong>Quick and seamless.</strong>
              </p>
              <p className="text-xs text-muted-foreground">
                <strong>Disabled:</strong> Fallback to programmatic authentication (may not work with all Bullhorn configurations) 
                or manual code entry.
              </p>
            </div>

            {!manualAuth.useAutomatedFlow && (
              <>
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

                <div className="space-y-2 p-3 bg-muted rounded-lg">
                  <Label className="text-sm font-medium">Get Authorization Code (Manual)</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Opens Bullhorn login in a popup window. After logging in, copy the entire URL and paste it above.
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
                    After the popup redirects, copy the entire URL from the address bar and paste it in the field above.
                  </p>
                </div>
              </>
            )}

            {manualAuth.useAutomatedFlow ? (
              <div className="space-y-3 pt-2">
                <Button
                  type="button"
                  variant="default"
                  className="w-full"
                  onClick={handleStartOAuthFlow}
                  disabled={!manualAuth.clientId || !manualAuth.clientSecret || !manualAuth.username || !manualAuth.password || loading}
                >
                  {loading ? 'Processing...' : '🪟 Start Popup OAuth (Recommended)'}
                </Button>
                
                <Alert className="bg-accent/10 border-accent/30">
                  <Lightning className="h-4 w-4 text-accent" weight="fill" />
                  <AlertDescription className="text-xs">
                    <strong>New: Proxy-Based OAuth</strong> - Uses an enhanced flow that works around redirect URI restrictions. 
                    Try this if the standard popup method fails.
                  </AlertDescription>
                </Alert>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-accent text-accent hover:bg-accent/10"
                  onClick={handleProxyBasedAuth}
                  disabled={!manualAuth.clientId || !manualAuth.clientSecret || !manualAuth.username || !manualAuth.password || loading}
                >
                  <Lightning className="mr-2" weight="fill" size={16} />
                  {loading ? 'Processing...' : 'Try Proxy-Based OAuth (Beta)'}
                </Button>

                <div className="flex justify-center">
                  <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                </div>
                <div className="text-center pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    💡 <strong>Tip:</strong> The popup will open, log you in automatically, and extract the code. 
                    Make sure popups are allowed for this site.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex gap-3 pt-2">
                <Button 
                  type="submit" 
                  className="flex-1" 
                  disabled={loading || !manualAuth.clientId || !manualAuth.clientSecret || !manualAuth.username || !manualAuth.password}
                >
                  {loading ? 'Authenticating...' : 'Quick Connect (Programmatic)'}
                </Button>
                <Button 
                  type="submit" 
                  variant="outline"
                  className="flex-1" 
                  disabled={loading || !manualAuth.authCode}
                  onClick={(e) => {
                    if (!manualAuth.authCode) {
                      e.preventDefault()
                      toast.error('Please enter an authorization code')
                    }
                  }}
                >
                  {loading ? 'Authenticating...' : 'Connect with Code'}
                </Button>
              </div>
            )}
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
