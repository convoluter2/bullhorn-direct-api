const PROXY_URL = import.meta.env.VITE_PROXY_URL || 'http://localhost:3001';

export const oauthProxyService = {
  getProxyCallbackUrl(): string {
    return `${PROXY_URL}/oauth/callback`;
  },

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${PROXY_URL}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        console.error('❌ Proxy health check failed:', response.status);
        return false;
      }
      
      const data = await response.json();
      console.log('✅ Proxy server healthy:', data);
      return data.status === 'healthy';
    } catch (error) {
      console.error('❌ Proxy server not reachable:', error);
      return false;
    }
  },

  async pollForCode(state: string, maxAttempts: number = 30): Promise<string | null> {
    console.log(`🔄 Polling proxy for OAuth code (state: ${state})`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(`${PROXY_URL}/oauth/status/${state}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
          console.warn(`⚠️ Poll attempt ${attempt}/${maxAttempts} failed:`, response.status);
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        
        const data = await response.json();
        
        if (data.success && data.code) {
          console.log('✅ Code retrieved from proxy:', data.code.substring(0, 30) + '...');
          return data.code;
        }
        
        console.log(`⏳ Poll attempt ${attempt}/${maxAttempts} - code not ready yet`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`❌ Poll attempt ${attempt}/${maxAttempts} error:`, error);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.error('❌ Max polling attempts reached, code not found');
    return null;
  },

  generateState(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
};
