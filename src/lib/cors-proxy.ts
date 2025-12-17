const CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
  'https://cors-anywhere.herokuapp.com/'
]

let currentProxyIndex = -1

export async function fetchWithCorsProxy(
  url: string,
  options?: RequestInit,
  retryCount = 0
): Promise<Response> {
  if (retryCount === 0) {
    try {
      console.log('Attempting direct fetch (no proxy)...')
      const response = await fetch(url, options)
      if (response.ok || response.status >= 400) {
        return response
      }
    } catch (error) {
      console.log('Direct fetch failed, will try with proxy:', error)
    }
  }

  if (retryCount >= CORS_PROXIES.length) {
    throw new Error('All CORS proxy attempts failed. Please check your network connection and try again.')
  }

  currentProxyIndex = retryCount
  const proxy = CORS_PROXIES[currentProxyIndex]
  const proxiedUrl = `${proxy}${encodeURIComponent(url)}`

  console.log(`Attempting fetch with proxy ${retryCount + 1}/${CORS_PROXIES.length}:`, proxy)

  try {
    const response = await fetch(proxiedUrl, {
      ...options,
      headers: {
        ...options?.headers,
        'X-Requested-With': 'XMLHttpRequest'
      }
    })

    if (!response.ok && retryCount < CORS_PROXIES.length - 1) {
      console.log(`Proxy ${retryCount + 1} failed with status ${response.status}, trying next...`)
      return fetchWithCorsProxy(url, options, retryCount + 1)
    }

    return response
  } catch (error) {
    console.error(`Proxy ${retryCount + 1} error:`, error)
    
    if (retryCount < CORS_PROXIES.length - 1) {
      return fetchWithCorsProxy(url, options, retryCount + 1)
    }
    
    throw error
  }
}

export function clearProxyCache() {
  currentProxyIndex = -1
}
