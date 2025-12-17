# 🔐 OAuth Proxy Server - Quick Start

## TL;DR

The proxy server solves OAuth redirect issues. Start everything with one command:

```bash
npm run dev
```

This starts both the Vite dev server AND the OAuth proxy server automatically.

## What This Solves

**Problem**: Bullhorn's OAuth flow requires a redirect URI, but reading cross-origin popup URLs is blocked by browsers.

**Solution**: A local Express server that acts as the redirect URI, captures the authorization code, and sends it back to the frontend.

## Quick Setup

### 1. Start the Application

```bash
npm run dev
```

You should see:
```
🚀 OAuth Proxy Server running on port 3001
📍 Callback URL: http://localhost:3001/oauth/callback
💚 Health check: http://localhost:3001/health

VITE v7.x.x ready in xxx ms
➜  Local:   http://localhost:5000/
```

### 2. Configure Bullhorn OAuth Redirect URI

In your Bullhorn OAuth API key settings, add this redirect URI:

```
http://localhost:3001/oauth/callback
```

### 3. Use Proxy-Based OAuth in the App

1. Open the app and click "Saved Connections"
2. Enter your credentials
3. Click **"Try Proxy-Based OAuth (Beta)"** button
4. The popup will open, authenticate, and automatically close
5. You're authenticated!

## How It Works

```mermaid
sequenceDiagram
    Frontend->>+Proxy: Generate auth URL with proxy redirect
    Frontend->>+Bullhorn: Open popup to Bullhorn OAuth
    Bullhorn->>User: Show login page (auto-filled)
    User->>Bullhorn: Authenticate
    Bullhorn->>+Proxy: Redirect to /oauth/callback with code
    Proxy->>Proxy: Decode authorization code
    Proxy->>Frontend: Display success page with postMessage
    Frontend->>-Bullhorn: Exchange code for token
    Frontend->>Bullhorn: Login with token
```

## Endpoints

### Proxy Server (Port 3001)

- `GET /oauth/callback` - OAuth redirect endpoint (receives code from Bullhorn)
- `GET /oauth/status/:state` - Polling endpoint (fallback)
- `GET /health` - Health check

### Frontend Integration

The `oauthProxyService` handles all communication:

```typescript
// Check proxy is running
const isHealthy = await oauthProxyService.checkHealth()

// Get callback URL for OAuth
const callbackUrl = oauthProxyService.getProxyCallbackUrl()

// Generate unique state
const state = oauthProxyService.generateState()

// Poll for code (fallback if postMessage fails)
const code = await oauthProxyService.pollForCode(state)
```

## Testing

### Test Proxy Health

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "oauth-proxy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "pendingAuths": 0
}
```

### Test Full Flow

1. Start app: `npm run dev`
2. Go to Saved Connections
3. Enter credentials (use saved Fastaff credentials)
4. Click "Try Proxy-Based OAuth (Beta)"
5. Popup opens → logs in → closes
6. Check console for success messages

## Troubleshooting

### "OAuth proxy server is not available"

**Cause**: Proxy server not running

**Fix**:
```bash
# Kill any existing process on port 3001
lsof -ti:3001 | xargs kill -9

# Restart dev server
npm run dev
```

### "Invalid Redirect URI" from Bullhorn

**Cause**: Redirect URI not registered in Bullhorn

**Fix**: Add `http://localhost:3001/oauth/callback` to your Bullhorn OAuth API key

### Popup shows error or blank page

**Cause**: Incorrect credentials or network issue

**Fix**:
1. Verify credentials are correct
2. Check browser console for errors
3. Check proxy terminal for incoming requests
4. Try the standard popup flow first to verify credentials work

### Code not being extracted

**Cause**: postMessage communication issue

**Fix**: Check browser console for:
- `📨 Message received: OAUTH_SUCCESS`
- `✅ OAuth code received via postMessage`

If not present, the proxy page may not be loading correctly.

## Development

### Running Separately

Start proxy only:
```bash
npm run dev:proxy
```

Start Vite only:
```bash
npm run dev:vite
```

### Environment Variables

`.env` file:
```env
VITE_PROXY_URL=http://localhost:3001
```

For production, update to your deployed URL.

### Proxy Server Code

Location: `server/proxy.js`

Key features:
- Decodes URL-encoded authorization codes
- Sends postMessage to opener window
- Stores codes temporarily for polling fallback
- Shows success/error pages

## Production Deployment

### Deploy Proxy Separately

1. Deploy `server/proxy.js` to Node.js hosting (Heroku, Railway, Render, etc.)
2. Set environment: `PORT=3001` or use assigned port
3. Update `.env`: `VITE_PROXY_URL=https://your-proxy-domain.com`
4. Update Bullhorn redirect URI to your proxy URL

### Deploy Together

Update `package.json`:
```json
{
  "scripts": {
    "start": "concurrently \"node server/proxy.js\" \"vite preview\""
  }
}
```

## Security Notes

### Current (Development)

- ✅ Decodes URL-encoded codes
- ✅ Uses postMessage for communication
- ✅ Temporary code storage (5 min expiration)
- ⚠️ CORS allows all origins
- ⚠️ No rate limiting

### Production Recommendations

1. **Restrict CORS** to your frontend domain only
2. **Add rate limiting** to prevent abuse
3. **Use HTTPS** for all communication
4. **Validate state parameter** to prevent CSRF
5. **Add authentication** to proxy endpoints
6. **Use Redis** for code storage instead of memory

## Support

For issues:
1. Check proxy terminal logs
2. Check browser console
3. Verify redirect URI in Bullhorn
4. Review `OAUTH_PROXY_SETUP.md` for detailed info

## Next Steps

After proxy is working:
1. Test with all your saved connections
2. Verify token refresh works
3. Test on different browsers
4. Deploy proxy to production
5. Update Bullhorn redirect URIs for production
