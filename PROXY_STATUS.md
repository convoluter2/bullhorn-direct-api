# OAuth Proxy Server Status

## Overview
The Bullhorn Data Manager uses a Node.js proxy server to handle OAuth callbacks securely. This proxy runs on port 3001 and must be running for authentication to work.

## Quick Start

### Start Both Services (Recommended)
```bash
npm run dev
```

This command starts:
1. OAuth Proxy Server (port 3001)
2. Vite Dev Server (port 5000)

### Start Services Separately

#### Start Proxy Only
```bash
npm run dev:proxy
```

#### Start Vite Only (after proxy is running)
```bash
npm run dev:vite
```

### Alternative: Use Helper Script
```bash
chmod +x start-proxy.sh
./start-proxy.sh
```

## Health Check

### Via Browser
Open: http://localhost:3001/health

Expected response:
```json
{
  "status": "healthy",
  "service": "oauth-proxy",
  "version": "1.0.0",
  "timestamp": "2025-01-XX...",
  "uptime": "5m 32s",
  "pendingAuths": 0,
  "port": 3001
}
```

### Via Command Line
```bash
curl http://localhost:3001/health
```

## Troubleshooting

### Issue: "Proxy Offline" Badge Shows

**Cause:** The proxy server isn't running on port 3001.

**Solution:**
```bash
# Check if port is in use
lsof -i :3001

# If nothing running, start the proxy
npm run dev:proxy

# If something else is using port 3001, kill it
lsof -ti:3001 | xargs kill -9
npm run dev:proxy
```

### Issue: Port 3001 Already in Use

**Solution:**
```bash
# Kill any process on port 3001
fuser -k 3001/tcp

# Or use the npm script
npm run kill

# Then restart
npm run dev
```

### Issue: Proxy Starts But Health Check Fails

**Solution:**
```bash
# Check proxy logs
npm run dev:proxy

# Look for startup message:
# 🚀 OAuth Proxy Server Started Successfully
# 📍 Port: 3001

# Test health endpoint
curl -v http://localhost:3001/health
```

### Issue: Cannot Connect to Proxy from App

**Possible causes:**
1. Firewall blocking port 3001
2. Wrong VITE_PROXY_URL in .env
3. Proxy crashed after starting

**Solution:**
```bash
# Check .env file
cat .env
# Should show: VITE_PROXY_URL=http://localhost:3001

# Restart both services
npm run kill
npm run dev
```

## Proxy Server Endpoints

### GET /health
Returns server health status
- **URL:** http://localhost:3001/health
- **Method:** GET
- **Response:** JSON object with status info

### GET /oauth/callback
Handles OAuth redirect from Bullhorn
- **URL:** http://localhost:3001/oauth/callback
- **Method:** GET
- **Query Params:** code, state, error, error_description
- **Response:** HTML page with postMessage to parent window

### GET /oauth/status/:state
Polls for OAuth code by state
- **URL:** http://localhost:3001/oauth/status/{state}
- **Method:** GET
- **Response:** JSON with success flag and code if available

## How Authentication Works

1. **User clicks "Connect"** in the app
2. **App opens popup** to Bullhorn OAuth page
3. **User logs in** to Bullhorn (or auto-login with saved creds)
4. **Bullhorn redirects** to `http://localhost:3001/oauth/callback?code=...`
5. **Proxy receives code**, stores it temporarily, sends HTML that:
   - Posts message to parent window with the code
   - Closes the popup automatically
6. **App receives code** via postMessage
7. **App exchanges code** for access token
8. **App completes login** and stores session

## Monitoring

The app UI shows proxy status in the header:
- 🟢 **Proxy Ready** - Server is healthy and accepting requests
- 🟡 **Proxy Offline** - Server is not responding
- ⚪ **Checking proxy...** - Initial health check in progress

## Technical Details

- **Server:** Express.js
- **Port:** 3001 (configurable via PROXY_PORT env var)
- **CORS:** Enabled for all origins
- **Cleanup:** Expired auth codes cleaned every 60 seconds
- **Timeout:** Auth codes expire after 5 minutes

## Environment Variables

```bash
# .env file
VITE_PROXY_URL=http://localhost:3001

# Alternative for production
VITE_PROXY_URL=https://your-domain.com
```

## Production Deployment

For production, deploy the proxy server separately:

```bash
# Install dependencies
npm install --production

# Start proxy (with PM2 for example)
pm2 start server/proxy.js --name oauth-proxy

# Or with Docker
docker build -t oauth-proxy -f Dockerfile.proxy .
docker run -d -p 3001:3001 oauth-proxy
```

Update `.env`:
```bash
VITE_PROXY_URL=https://your-proxy-domain.com
```

## Logs

Proxy server logs include:
- 📥 OAuth callbacks received
- ✅ Successful code exchanges
- ❌ Errors and failures
- 🔍 Status check polls
- 💾 Code storage operations
- 🧹 Cleanup operations

Example log output:
```
🚀 ═══════════════════════════════════════════════════
🔐 OAuth Proxy Server Started Successfully
═══════════════════════════════════════════════════
📍 Port: 3001
🔗 Callback: http://localhost:3001/oauth/callback
💚 Health: http://localhost:3001/health
⏰ Started: 2025-01-XX...
═══════════════════════════════════════════════════

📥 OAuth callback received: { hasCode: true, state: 'abc123', hasError: false, timestamp: '...' }
✅ Code received and decoded: { original: '...', decoded: '...', state: 'abc123' }
💾 Stored auth code for state: abc123 (Total pending: 1)
🔍 Status check for state: abc123 - Found: true
✅ Code retrieved and removed for state: abc123
```
