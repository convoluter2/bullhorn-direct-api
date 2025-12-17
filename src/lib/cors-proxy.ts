const CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
  'https://cors-anywhere.herokuapp.com/'
]

let currentProxyIndex = 0
let useProxyByDefault = true

export async function fetchWithCorsProxy(
  url: string,
  options?: RequestInit,
  tryDirectFirst?: boolean
): Promise<Response> {
  if (tryDirectFirst) {
    try {
      console.log('🔗 Attempting direct fetch (no proxy)...')
      const response = await fetch(url, options)
      if (response.ok || response.status >= 400) {
        console.log('✅ Direct fetch succeeded')
        return response
      }
    } catch (error) {
      console.log('❌ Direct fetch failed, switching to proxy:', error)
    }
  }

  return fetchWithProxy(url, 0, options)
}

async function fetchWithProxy(
  url: string,
  proxyIndex: number,
  options?: RequestInit
): Promise<Response> {
  if (proxyIndex >= CORS_PROXIES.length) {
    throw new Error('All CORS proxy attempts failed. Please check your network connection and try again.')
  }

  const proxy = CORS_PROXIES[proxyIndex]
  const proxiedUrl = `${proxy}${encodeURIComponent(url)}`

  console.log(`🌐 Using CORS proxy ${proxyIndex + 1}/${CORS_PROXIES.length}:`, proxy.replace(/\?$/, ''))

  try {
    const response = await fetch(proxiedUrl, {
      ...options,
      headers: {
        ...options?.headers,
        'X-Requested-With': 'XMLHttpRequest'
      }
    })

    if (!response.ok && proxyIndex < CORS_PROXIES.length - 1) {
      console.log(`⚠️ Proxy ${proxyIndex + 1} failed with status ${response.status}, trying next...`)
      return fetchWithProxy(url, proxyIndex + 1, options)
    }

    console.log(`✅ Proxy ${proxyIndex + 1} succeeded`)
    currentProxyIndex = proxyIndex
    return response
  } catch (error) {
    console.error(`❌ Proxy ${proxyIndex + 1} error:`, error)
    
    if (proxyIndex < CORS_PROXIES.length - 1) {
      return fetchWithProxy(url, proxyIndex + 1, options)
    }
    
    throw error
  }
}

export function clearProxyCache() {
  currentProxyIndex = 0
}

export function setUseProxyByDefault(useProxy: boolean) {
  useProxyByDefault = useProxy
}

export function shouldUseProxy(): boolean {
  return useProxyByDefault
}
