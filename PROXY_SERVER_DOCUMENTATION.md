# Node.js Proxy Server Documentation

## Table of Contents

1. [Overview](#overview)
2. [Why This Exists](#why-this-exists)
3. [Architecture](#architecture)
4. [Getting Started](#getting-started)
5. [Dependencies](#dependencies)
6. [API Reference](#api-reference)
7. [Configuration](#configuration)
8. [Development Workflow](#development-workflow)
9. [Deployment](#deployment)
10. [Working Without the Proxy](#working-without-the-proxy)
11. [Troubleshooting](#troubleshooting)
12. [Security Considerations](#security-considerations)

---

## Overview

The Node.js proxy server is an **optional but recommended** Express.js server that solves OAuth redirect challenges when integrating with Bullhorn's API. It runs on port 3001 and provides:

- OAuth callback handling
- Authorization code capture and decoding
- Cross-origin communication bridge
- Credential and connection persistence (optional storage layer)
- Health monitoring

**Location**: `/server/proxy.js`

**Default Port**: 3001

**Primary Purpose**: Act as a legitimate OAuth redirect URI to capture authorization codes from Bullhorn's OAuth flow.

---

## Why This Exists

### The Problem

Bullhorn's OAuth 2.0 implementation has specific requirements that create challenges for client-side applications:

1. **Redirect URI Registration**: OAuth redirect URIs must be pre-registered with Bullhorn
2. **Cross-Origin Restrictions**: Browsers prevent reading URLs from cross-origin popup windows
3. **URL Encoding Issues**: Authorization codes contain special characters (`:`) that are URL-encoded
4. **Dynamic URLs**: Development environments (Codespaces, localhost) have non-static URLs

### The Solution

The proxy server provides a stable, registered OAuth redirect endpoint that:

- Captures the authorization code when Bullhorn redirects
- Automatically decodes URL-encoded characters
- Communicates the code back to the frontend via `postMessage`
- Provides a fallback polling mechanism
- Stores codes temporarily for reliable retrieval

### How It Works

```
┌─────────────┐         ┌──────────────┐         ┌────────────┐
│   Frontend  │         │    Proxy     │         │  Bullhorn  │
│  (React)    │         │  (Express)   │         │   OAuth    │
└─────────────┘         └──────────────┘         └────────────┘
       │                        │                        │
       │ 1. Open OAuth popup    │                        │
       ├───────────────────────────────────────────────►│
       │    with redirect_uri=  │                        │
       │    http://localhost:3001/oauth/callback        │
       │                        │                        │
       │                        │   2. User authenticates│
       │                        │                        │
       │                        │◄───────────────────────┤
       │                        │   3. Redirect with code│
       │                        │                        │
       │                        │ 4. Decode & store code │
       │                        │                        │
       │◄───────────────────────┤                        │
       │  5. postMessage with   │                        │
       │     decoded code       │                        │
       │                        │                        │
       │ 6. Exchange for token  │                        │
       ├───────────────────────────────────────────────►│
       │                        │                        │
       │◄───────────────────────────────────────────────┤
       │  7. Access token       │                        │
       │                        │                        │
```

---

## Architecture

### Core Components

#### 1. OAuth Flow Handler

**Endpoints:**
- `GET /oauth/callback` - Receives OAuth redirect from Bullhorn
- `GET /oauth/status/:state` - Polling fallback for code retrieval

**Functionality:**
- Captures authorization code from query parameters
- Decodes URL-encoded characters (`%3A` → `:`)
- Stores code temporarily with state parameter (5-minute expiration)
- Displays success page with `postMessage` communication
- Handles OAuth errors gracefully

#### 2. Optional Storage Layer

**Endpoints:**
- `POST /api/credentials/save` - Store encrypted credentials
- `GET /api/credentials/:userId/:connectionId` - Retrieve credentials
- `DELETE /api/credentials/:userId/:connectionId` - Delete credentials
- `POST /api/connections/save` - Store connection configurations
- `GET /api/connections/:userId` - Retrieve user's connections
- `DELETE /api/connections/:userId/:connectionId` - Delete connection
- `PUT /api/connections/:userId/:connectionId` - Update connection

**Functionality:**
- File-based persistence in `server/data/` directory
- In-memory cache with disk synchronization
- Automatic cleanup of expired data

#### 3. Service Management

**Endpoints:**
- `GET /health` - Health check with uptime and status
- `POST /restart` - Graceful restart endpoint
- `POST /start` - Start confirmation endpoint

**Functionality:**
- Process monitoring and management
- Health status reporting
- Graceful shutdown handling

### Data Flow

1. **Initialization**: Frontend checks proxy health (`/health`)
2. **OAuth Start**: Frontend generates state and opens OAuth popup
3. **Redirect**: Bullhorn redirects to `/oauth/callback?code=...&state=...`
4. **Capture**: Proxy captures and decodes authorization code
5. **Communication**: Success page posts message to opener window
6. **Fallback**: Frontend can poll `/oauth/status/:state` if needed
7. **Cleanup**: Code is removed after retrieval or 5-minute expiration

---

## Getting Started

### Quick Start

Start everything with one command:

```bash
npm run dev
```

This uses `concurrently` to start both:
- Vite dev server (port 5000)
- OAuth proxy server (port 3001)

### Verify It's Running

Check the proxy health:

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "oauth-proxy",
  "version": "1.0.0",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": "5m 23s",
  "pendingAuths": 0,
  "port": 3001
}
```

### Register Redirect URI

In your Bullhorn OAuth API key settings, add:

```
http://localhost:3001/oauth/callback
```

For production, use your deployed URL:
```
https://your-domain.com/oauth/callback
```

---

## Dependencies

### Required Dependencies

The proxy server requires these npm packages:

```json
{
  "express": "^5.2.1",      // Web server framework
  "cors": "^2.8.5"          // Cross-origin resource sharing
}
```

### Development Dependencies

```json
{
  "concurrently": "^9.2.1"  // Run multiple processes simultaneously
}
```

### Installation

Dependencies are installed automatically with:

```bash
npm install
```

---

## API Reference

### OAuth Endpoints

#### `GET /oauth/callback`

Receives OAuth redirect from Bullhorn.

**Query Parameters:**
- `code` (string, required) - Authorization code from Bullhorn
- `state` (string, optional) - State parameter for CSRF protection
- `error` (string, optional) - Error code if authentication failed
- `error_description` (string, optional) - Human-readable error description

**Response:**
- HTML page with success/error message
- JavaScript that posts message to opener window

**Example:**
```
GET /oauth/callback?code=25184_8090191_44%3Aead82de4&state=abc123
```

**Success Response:**
```html
<html>
  <!-- Success page with postMessage script -->
  <script>
    window.opener.postMessage({ 
      type: 'OAUTH_SUCCESS', 
      code: '25184_8090191_44:ead82de4',
      state: 'abc123'
    }, '*');
  </script>
</html>
```

---

#### `GET /oauth/status/:state`

Poll for authorization code (fallback mechanism).

**URL Parameters:**
- `state` (string, required) - Unique state identifier

**Response:**
```json
{
  "success": true,
  "code": "25184_8090191_44:ead82de4"
}
```

Or if not ready:
```json
{
  "success": false
}
```

**Example:**
```bash
curl http://localhost:3001/oauth/status/abc123
```

---

### Storage Endpoints (Optional)

#### `POST /api/credentials/save`

Store encrypted credentials for a connection.

**Request Body:**
```json
{
  "userId": "user-123",
  "connectionId": "conn-456",
  "credentials": {
    "clientId": "...",
    "clientSecret": "...",
    "username": "...",
    "password": "..."
  }
}
```

**Response:**
```json
{
  "success": true
}
```

---

#### `GET /api/credentials/:userId/:connectionId`

Retrieve stored credentials.

**Response:**
```json
{
  "credentials": {
    "clientId": "...",
    "clientSecret": "...",
    "username": "...",
    "password": "..."
  }
}
```

---

#### `POST /api/connections/save`

Save connection configuration.

**Request Body:**
```json
{
  "userId": "user-123",
  "connection": {
    "id": "conn-456",
    "name": "Production",
    "tenant": "cls55",
    "environment": "PROD",
    "lastUsed": 1234567890
  }
}
```

**Response:**
```json
{
  "success": true
}
```

---

### Service Endpoints

#### `GET /health`

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "oauth-proxy",
  "version": "1.0.0",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": "15m 42s",
  "pendingAuths": 2,
  "port": 3001
}
```

---

#### `POST /restart`

Gracefully restart the proxy server.

**Response:**
```json
{
  "success": true,
  "message": "Proxy server restarting...",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## Configuration

### Environment Variables

```env
# Proxy server port (default: 3001)
PROXY_PORT=3001

# Frontend URL for VITE
VITE_PROXY_URL=http://localhost:3001
```

### Port Configuration

The proxy uses port 3001 by default. To change it:

1. Update `server/proxy.js`:
   ```javascript
   const PORT = process.env.PROXY_PORT || 3001;
   ```

2. Update `.env`:
   ```env
   PROXY_PORT=3002
   VITE_PROXY_URL=http://localhost:3002
   ```

3. Update Bullhorn redirect URI to match new port

---

## Development Workflow

### Running Separately

Start only the proxy:
```bash
npm run dev:proxy
```

Start only Vite:
```bash
npm run dev:vite
```

Start both together:
```bash
npm run dev
```

### Restarting the Proxy

Kill and restart the proxy:
```bash
npm run restart:proxy
```

Or manually:
```bash
npm run kill:proxy
npm run dev:proxy
```

### Debugging

Enable detailed logging by checking the proxy terminal output:

```
🚀 OAuth Proxy Server Started Successfully
📥 OAuth callback received: { hasCode: true, state: 'abc123' }
✅ Code received and decoded
💾 Stored auth code for state: abc123 (Total pending: 1)
🔍 Status check for state: abc123 - Found: true
✅ Code retrieved and removed for state: abc123
```

---

## Deployment

### Option 1: Deploy with Frontend

Use the same deployment platform:

```json
{
  "scripts": {
    "start": "concurrently \"node server/proxy.js\" \"vite preview\""
  }
}
```

**Platforms:**
- Render (Web Service)
- Railway
- Fly.io

---

### Option 2: Separate Deployment

Deploy proxy independently on Node.js hosting:

**Step 1: Deploy proxy server**
```bash
# Deploy server/proxy.js to your platform
# Set environment: PROXY_PORT=3001
```

**Step 2: Update environment variables**
```env
VITE_PROXY_URL=https://your-proxy-domain.com
```

**Step 3: Update Bullhorn redirect URI**
```
https://your-proxy-domain.com/oauth/callback
```

**Recommended Platforms:**
- AWS Lambda + API Gateway
- Google Cloud Functions
- Heroku
- DigitalOcean App Platform

---

### Docker Deployment

Create a `Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY server ./server

EXPOSE 3001

CMD ["node", "server/proxy.js"]
```

Build and run:
```bash
docker build -t oauth-proxy .
docker run -p 3001:3001 oauth-proxy
```

---

## Working Without the Proxy

The application can work **without** the proxy server using alternative authentication methods:

### Method 1: Manual Code Entry

1. Disable "Popup OAuth Mode" in the Auth Dialog
2. Click "Open Authorization Popup"
3. Authenticate in Bullhorn
4. Copy the **entire URL** from the welcome page
5. Paste it into the code input field
6. The code will be extracted and decoded automatically

### Method 2: Direct OAuth (When Possible)

Some Bullhorn configurations allow omitting the `redirect_uri` parameter. The "Standard Popup OAuth" method attempts this:

1. Opens Bullhorn auth without redirect_uri
2. Monitors popup URL for welcome.bullhornstaffing.com
3. Extracts code when detected
4. Works when redirect_uri is optional

### Method 3: Alternative Proxy Services

Use a third-party OAuth proxy service:

1. Register your application with the service
2. Update `VITE_PROXY_URL` to point to the service
3. Register the service URL with Bullhorn

### Disabling the Proxy

To run without the proxy:

1. **Use Vite only**:
   ```bash
   npm run dev:vite
   ```

2. **Update package.json** (optional):
   ```json
   {
     "scripts": {
       "dev": "vite"
     }
   }
   ```

3. **Use manual authentication** in the application

---

## Troubleshooting

### Port 3001 Already in Use

**Symptom:**
```
Error: listen EADDRINUSE: address already in use :::3001
```

**Solution:**
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Or use the npm script
npm run kill:proxy

# Restart
npm run dev
```

---

### Proxy Not Reachable

**Symptom:**
"OAuth proxy server is not available"

**Solution:**
1. Check if proxy is running:
   ```bash
   curl http://localhost:3001/health
   ```

2. Check proxy logs in terminal

3. Verify firewall isn't blocking port 3001

4. Restart dev server:
   ```bash
   npm run dev
   ```

---

### Invalid Redirect URI Error

**Symptom:**
Bullhorn shows "Invalid Redirect URI" or "redirect_uri_mismatch"

**Solution:**
1. Verify redirect URI in Bullhorn **exactly** matches proxy URL
2. Check for trailing slashes (use without trailing slash)
3. Ensure protocol (http/https) matches
4. Verify port number is correct
5. Contact Bullhorn support to add redirect URI if needed

---

### Code Not Received via postMessage

**Symptom:**
Popup closes but code isn't captured

**Solution:**
1. Check browser console for `postMessage` errors
2. Verify popup isn't blocked by browser
3. Check if proxy success page is loading (view proxy terminal)
4. Use fallback polling method (automatic)
5. Try manual code entry method

---

### CORS Errors

**Symptom:**
"Blocked by CORS policy" in browser console

**Solution:**
1. Verify proxy CORS configuration allows your origin
2. Check `Access-Control-Allow-Origin` header
3. Clear browser cache and cookies
4. For production, update CORS to allow specific origins

---

## Security Considerations

### Current Implementation (Development)

**Strengths:**
- ✅ Codes are decoded properly
- ✅ postMessage for secure communication
- ✅ Temporary storage (5-minute expiration)
- ✅ State parameter support

**Limitations:**
- ⚠️ CORS allows all origins (`origin: true`)
- ⚠️ No rate limiting
- ⚠️ No request authentication
- ⚠️ In-memory storage (lost on restart)
- ⚠️ File-based persistence (not encrypted at rest)

---

### Production Hardening

#### 1. Restrict CORS

```javascript
app.use(cors({
  origin: ['https://your-frontend-domain.com'],
  credentials: true
}));
```

#### 2. Add Rate Limiting

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/oauth/', limiter);
```

#### 3. Validate State Parameter

```javascript
// Store state server-side and validate on callback
const validStates = new Set();

// When generating auth URL
const state = generateState();
validStates.add(state);

// On callback
if (!validStates.has(state)) {
  return res.status(400).json({ error: 'Invalid state' });
}
validStates.delete(state);
```

#### 4. Use Redis for Storage

```javascript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

app.get('/oauth/callback', async (req, res) => {
  const { code, state } = req.query;
  
  // Store with automatic expiration
  await redis.setex(`oauth:${state}`, 300, code);
  
  // ... rest of handler
});
```

#### 5. Add Authentication

```javascript
import jwt from 'jsonwebtoken';

const authenticateRequest = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

app.use('/api/', authenticateRequest);
```

#### 6. Enable HTTPS

```javascript
import https from 'https';
import fs from 'fs';

const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};

https.createServer(options, app).listen(443);
```

#### 7. Add Security Headers

```javascript
import helmet from 'helmet';

app.use(helmet());
```

#### 8. Sanitize and Validate Inputs

```javascript
import validator from 'validator';

app.get('/oauth/callback', (req, res) => {
  const { code, state } = req.query;
  
  // Validate inputs
  if (!code || typeof code !== 'string' || code.length > 500) {
    return res.status(400).json({ error: 'Invalid code' });
  }
  
  if (state && !validator.isAlphanumeric(state)) {
    return res.status(400).json({ error: 'Invalid state' });
  }
  
  // ... rest of handler
});
```

---

## Additional Resources

### Related Documentation

- [README_PROXY.md](./README_PROXY.md) - Quick start guide
- [OAUTH_PROXY_GUIDE.md](./OAUTH_PROXY_GUIDE.md) - Implementation details
- [OAUTH_PROXY_SETUP.md](./OAUTH_PROXY_SETUP.md) - Setup instructions

### Scripts

- `start-proxy.sh` - Start proxy with health check
- `restart-proxy.sh` - Restart proxy gracefully
- `verify-proxy.sh` - Verify proxy is working

### Frontend Integration

The frontend uses `src/lib/oauth-proxy.ts` service:

```typescript
import { oauthProxyService } from '@/lib/oauth-proxy';

// Check health
const isHealthy = await oauthProxyService.checkHealth();

// Get callback URL
const callbackUrl = oauthProxyService.getProxyCallbackUrl();

// Generate state
const state = oauthProxyService.generateState();

// Poll for code (fallback)
const code = await oauthProxyService.pollForCode(state);
```

---

## Summary

The Node.js proxy server is a **robust, optional component** that significantly improves the OAuth authentication experience with Bullhorn. While the application can function without it using manual authentication methods, the proxy provides:

- **Automatic code capture** - No manual copying required
- **Better UX** - Seamless popup-based flow
- **Reliability** - Handles encoding issues automatically
- **Flexibility** - Supports both postMessage and polling
- **Optional storage** - Can persist credentials and connections

For production deployments, follow the security hardening guidelines to ensure safe operation.
