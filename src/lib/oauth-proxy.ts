export interface OAuthProxyConfig {
  proxyUrl: string
  clientId: string
  clientSecret: string
  username: string
  password: string
  oauthUrl: string
}

export interface OAuthProxyResponse {
  success: boolean
  code?: string
  accessToken?: string
  refreshToken?: string
  expiresIn?: number
  error?: string
  errorDescription?: string
}

export class OAuthProxyService {
  private proxyBaseUrl: string

  constructor(proxyBaseUrl?: string) {
    this.proxyBaseUrl = proxyBaseUrl || 'https://oauth-proxy.spark.github.dev'
  }

  async initiateOAuthFlow(config: OAuthProxyConfig): Promise<{ authUrl: string; flowId: string }> {
    const flowId = `flow_${Date.now()}_${Math.random().toString(36).substring(7)}`
    
    const authUrl = new URL(`${config.oauthUrl}/authorize`)
    authUrl.searchParams.set('client_id', config.clientId)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('state', flowId)
    authUrl.searchParams.set('redirect_uri', `${this.proxyBaseUrl}/callback`)
    
    if (config.password) {
      authUrl.searchParams.set('action', 'Login')
      authUrl.searchParams.set('username', config.username)
      authUrl.searchParams.set('password', config.password)
    }

    await window.spark.kv.set(`oauth_flow_${flowId}`, {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      username: config.username,
      oauthUrl: config.oauthUrl,
      timestamp: Date.now(),
      status: 'pending'
    })

    console.log('🎯 OAuth flow initiated:', { flowId, authUrl: authUrl.toString() })
    
    return {
      authUrl: authUrl.toString(),
      flowId
    }
  }

  async pollForCompletion(flowId: string, maxAttempts: number = 60): Promise<OAuthProxyResponse> {
    console.log('🔄 Starting poll for flow:', flowId)
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const flowData = await window.spark.kv.get<any>(`oauth_flow_${flowId}`)
      
      if (!flowData) {
        console.error('❌ Flow data not found for:', flowId)
        throw new Error('OAuth flow data not found')
      }

      console.log(`[Poll ${attempt + 1}/${maxAttempts}] Flow status:`, flowData.status)

      if (flowData.status === 'completed') {
        console.log('✅ OAuth flow completed successfully')
        await window.spark.kv.delete(`oauth_flow_${flowId}`)
        
        return {
          success: true,
          code: flowData.code,
          accessToken: flowData.accessToken,
          refreshToken: flowData.refreshToken,
          expiresIn: flowData.expiresIn
        }
      }

      if (flowData.status === 'error') {
        console.error('❌ OAuth flow failed:', flowData.error)
        await window.spark.kv.delete(`oauth_flow_${flowId}`)
        
        return {
          success: false,
          error: flowData.error,
          errorDescription: flowData.errorDescription
        }
      }
    }

    console.error('⏱️ OAuth flow timed out')
    throw new Error('OAuth flow timed out after 60 seconds')
  }

  async exchangeCodeViaProxy(
    code: string,
    clientId: string,
    clientSecret: string,
    oauthUrl: string
  ): Promise<OAuthProxyResponse> {
    console.log('🔄 Exchanging code via proxy...')
    
    try {
      const response = await fetch(`${this.proxyBaseUrl}/exchange`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code,
          clientId,
          clientSecret,
          oauthUrl
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Proxy exchange failed:', errorText)
        throw new Error(`Proxy exchange failed: ${errorText}`)
      }

      const data = await response.json() as OAuthProxyResponse
      console.log('✅ Code exchanged successfully via proxy')
      
      return data
    } catch (error) {
      console.error('❌ Proxy exchange error:', error)
      throw error
    }
  }

  async handleCallbackInline(callbackUrl: string): Promise<string> {
    console.log('🔍 Extracting code from callback URL...')
    
    try {
      const url = new URL(callbackUrl)
      const code = url.searchParams.get('code')
      const error = url.searchParams.get('error')
      const state = url.searchParams.get('state')

      if (error) {
        console.error('❌ OAuth error in callback:', error)
        throw new Error(`OAuth error: ${error}`)
      }

      if (!code) {
        console.error('❌ No code in callback URL')
        throw new Error('No authorization code in callback')
      }

      console.log('✅ Code extracted from callback:', {
        codeLength: code.length,
        state,
        codePreview: code.substring(0, 20) + '...'
      })

      const decodedCode = decodeURIComponent(code)
      console.log('🔓 Decoded code:', {
        original: code.substring(0, 20) + '...',
        decoded: decodedCode.substring(0, 20) + '...',
        hasColon: decodedCode.includes(':')
      })

      return decodedCode
    } catch (error) {
      console.error('❌ Error handling callback:', error)
      throw error
    }
  }

  async simulateProxyWithDirectFlow(config: OAuthProxyConfig): Promise<{ authUrl: string; flowId: string }> {
    const flowId = `local_${Date.now()}_${Math.random().toString(36).substring(7)}`
    
    const appUrl = window.location.origin
    const callbackUrl = `${appUrl}/oauth/callback`
    
    const authUrl = new URL(`${config.oauthUrl}/authorize`)
    authUrl.searchParams.set('client_id', config.clientId)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('state', flowId)
    
    if (config.password) {
      authUrl.searchParams.set('action', 'Login')
      authUrl.searchParams.set('username', config.username)
      authUrl.searchParams.set('password', config.password)
    }

    await window.spark.kv.set(`oauth_flow_${flowId}`, {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      username: config.username,
      oauthUrl: config.oauthUrl,
      timestamp: Date.now(),
      status: 'pending'
    })

    console.log('🎯 Local OAuth flow initiated (no redirect_uri):', { 
      flowId, 
      authUrl: authUrl.toString().substring(0, 100) + '...' 
    })
    
    return {
      authUrl: authUrl.toString(),
      flowId
    }
  }
}

export const oauthProxyService = new OAuthProxyService()
