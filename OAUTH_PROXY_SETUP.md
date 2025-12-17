# OAuth Proxy Server Setup

## Overview

The OAuth proxy server solves cross-origin issues when handling Bullhorn OAuth redirects. Instead of trying to read URLs from cross-origin popups, the proxy acts as a legitimate redirect URI that can capture the authorization code and communicate it back to the frontend.

## Architecture

```
1. Frontend opens popup → Bullhorn OAuth (with redirect_uri=http://localhost:3001/oauth/callback)
2. User authenticates → Bullhorn redirects to proxy server with code
3. Proxy server → Captures code and displays success page
4. Success page → Posts message back to frontend via window.opener.postMessage
5. Frontend → Receives code and exchanges it for token
```

## Setup

### 1. Install Dependencies

The required dependencies are already installed:
- `express` - Web server framework
- `cors` - Handle cross-origin requests
- `concurrently` - Run multiple processes

### 2. Configure Redirect URI in Bullhorn

When creating or updating your OAuth API key in Bullhorn, add the following redirect URI:

```
http://localhost:3001/oauth/callback
```

For production deployments, use your deployed proxy URL:
```
https://your-domain.com/oauth/callback
```

### 3. Environment Configuration

The `.env` file is already configured:

```env
VITE_PROXY_URL=http://localhost:3001
```

For production, update this to your deployed proxy URL.

### 4. Start the Application

The `npm run dev` command now starts both the Vite dev server and the proxy server:

```bash
npm run dev
```

This will start:
- Vite dev server on port 5000 (or configured port)
- OAuth proxy server on port 3001

### 5. Verify Proxy is Running

Check the proxy health endpoint:
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

## How It Works

### Proxy Server Endpoints

#### `GET /oauth/callback`
- Receives OAuth redirect from Bullhorn
- Captures authorization code
- Decodes URL-encoded code (fixes `:` encoding issue)
- Displays success page that posts message to opener
- Stores code temporarily for polling fallback

#### `GET /oauth/status/:state`
- Polling endpoint (fallback if postMessage fails)
- Returns code for given state parameter
- Code is deleted after retrieval

#### `GET /health`
- Health check endpoint
- Returns proxy status

### Frontend Integration

The `oauthProxyService` in `src/lib/oauth-proxy.ts` provides:

- `getProxyCallbackUrl()` - Returns proxy callback URL
- `checkHealth()` - Verifies proxy is running
- `generateState()` - Generates unique state parameter
- `pollForCode(state)` - Fallback polling method

### Updated Auth Flow

The `AuthDialog` component now uses `handleProxyBasedAuth()`:

1. Checks proxy health
2. Generates unique state parameter
3. Builds OAuth URL with proxy redirect URI
4. Opens popup to Bullhorn OAuth
5. Listens for postMessage from proxy success page
6. Exchanges code for token
7. Completes authentication

## Security Considerations

### Current Implementation (Development)

- Proxy accepts CORS from all origins
- Codes stored in memory (cleared after 5 minutes)
- No authentication on proxy endpoints

### Production Recommendations

1. **Restrict CORS Origins**
   ```javascript
   app.use(cors({
     origin: ['https://your-frontend-domain.com'],
     credentials: true
   }))
   ```

2. **Add State Validation**
   - Verify state parameter matches frontend
   - Prevent CSRF attacks

3. **Secure Code Storage**
   - Use Redis or encrypted session storage
   - Set shorter expiration times

4. **Rate Limiting**
   - Limit requests per IP
   - Prevent abuse

5. **HTTPS Only**
   - Use SSL/TLS certificates
   - Enforce HTTPS redirect

6. **Add Logging**
   - Log all authentication attempts
   - Monitor for suspicious activity

## Deployment

### Option 1: Deploy with Frontend

Use the same deployment platform and run both servers:

```json
{
  "scripts": {
    "start": "concurrently \"node server/proxy.js\" \"vite preview\""
  }
}
```

### Option 2: Separate Deployment

Deploy proxy server separately (e.g., on a Node.js hosting platform):

1. Deploy `server/proxy.js` to hosting platform
2. Set environment variable: `PROXY_PORT=3001` (or platform-assigned port)
3. Update `.env` with deployed proxy URL
4. Update Bullhorn OAuth redirect URI

### Example Platforms

- **Heroku**: Deploy as Node.js app
- **Railway**: Deploy from GitHub
- **Render**: Deploy as Web Service
- **AWS Lambda**: Deploy as serverless function
- **Google Cloud Run**: Deploy as container

## Troubleshooting

### Proxy not reachable

**Symptom**: "OAuth proxy server is not available"

**Solutions**:
- Verify proxy is running: `curl http://localhost:3001/health`
- Check if port 3001 is in use: `lsof -i :3001`
- Restart dev server: `npm run dev`

### Popup blocked

**Symptom**: "Popup blocked. Please allow popups"

**Solutions**:
- Enable popups in browser settings
- Add site to popup exception list
- Try different browser

### Code not received

**Symptom**: Authentication timeout, no code received

**Solutions**:
- Check browser console for errors
- Verify redirect URI in Bullhorn matches proxy URL exactly
- Check proxy logs for incoming requests
- Ensure credentials are correct

### Invalid redirect URI error

**Symptom**: Bullhorn shows "Invalid Redirect URI" error

**Solutions**:
- Verify redirect URI is registered in Bullhorn OAuth API key
- Check that proxy URL matches exactly (including protocol and port)
- Contact Bullhorn support to add redirect URI

### CORS errors

**Symptom**: Blocked by CORS policy errors

**Solutions**:
- Verify proxy CORS configuration
- Check that frontend origin is allowed
- Clear browser cache and cookies

## Testing

### Manual Testing

1. Start dev server: `npm run dev`
2. Check proxy health: `curl http://localhost:3001/health`
3. Open frontend and try OAuth flow
4. Check browser console for logs
5. Check proxy terminal for logs

### Automated Testing

The proxy includes comprehensive logging. Look for these log messages:

- `🚀 OAuth Proxy Server running on port 3001`
- `📥 OAuth callback received`
- `✅ Code received and decoded`
- `❌ OAuth error:` (if error occurs)

## Support

If you encounter issues:

1. Check proxy and browser console logs
2. Verify all environment variables are set
3. Ensure Bullhorn redirect URI is configured
4. Review this documentation
5. Check OAuth flow diagram above

## Migration Notes

### From Previous Implementation

The proxy replaces the previous attempts to:
- Read popup URLs directly (blocked by CORS)
- Use iframes (blocked by X-Frame-Options)
- Use CORS proxies (unreliable)

The new implementation:
- ✅ Properly handles OAuth redirect
- ✅ Fixes URL encoding issues (`:` character)
- ✅ Works with all browsers
- ✅ More secure and reliable
- ✅ Follows OAuth 2.0 best practices
