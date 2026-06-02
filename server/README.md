# OAuth Proxy Server

**Purpose**: Handles OAuth redirect callbacks for Bullhorn API authentication

**Port**: 3001 (configurable via `PROXY_PORT` environment variable)

**Status**: Optional but Recommended

## Quick Reference

### Start the Server

```bash
# Start with Vite (recommended)
npm run dev

# Start proxy only
npm run dev:proxy

# Start with shell script
bash start-proxy.sh
```

### Check Health

```bash
curl http://localhost:3001/health
```

### Restart

```bash
npm run restart:proxy
# or
bash restart-proxy.sh
```

## Why This Server Exists

Bullhorn's OAuth flow requires a registered redirect URI. Browsers block reading URLs from cross-origin popup windows, making it impossible to capture authorization codes directly in the frontend. This proxy server:

1. **Acts as a legitimate redirect URI** that's registered with Bullhorn
2. **Captures authorization codes** when Bullhorn redirects after authentication
3. **Decodes URL-encoded characters** (e.g., `%3A` → `:`)
4. **Communicates with frontend** via `postMessage` and polling fallback
5. **Optionally stores** credentials and connections for persistence

## Files

```
server/
├── proxy.js              # Main Express server
├── restart-helper.js     # Helper for graceful restarts
├── data/                 # Optional: File-based storage
│   ├── credentials.json  # Encrypted credentials cache
│   └── connections.json  # Connection configurations cache
└── README.md            # This file
```

## Key Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/oauth/callback` | GET | OAuth redirect URI - captures authorization code |
| `/oauth/status/:state` | GET | Polling fallback for code retrieval |
| `/health` | GET | Health check and status |
| `/restart` | POST | Graceful server restart |
| `/api/credentials/save` | POST | Save encrypted credentials (optional) |
| `/api/credentials/:userId/:connectionId` | GET | Retrieve credentials (optional) |
| `/api/connections/save` | POST | Save connection config (optional) |
| `/api/connections/:userId` | GET | List connections (optional) |

## Configuration

### Environment Variables

```env
PROXY_PORT=3001              # Server port (default: 3001)
```

### CORS Configuration

**Default**: Allows all origins (development)

**Production**: Restrict to specific domains

```javascript
app.use(cors({
  origin: ['https://your-frontend-domain.com'],
  credentials: true
}));
```

## OAuth Flow

```
┌────────────┐    ┌───────────┐    ┌──────────┐
│  Frontend  │    │   Proxy   │    │ Bullhorn │
└────────────┘    └───────────┘    └──────────┘
       │                 │                │
       │ 1. Open popup   │                │
       ├────────────────────────────────►│
       │    with redirect_uri=proxy       │
       │                 │                │
       │                 │ 2. Redirect    │
       │                 │◄───────────────┤
       │                 │    with code   │
       │                 │                │
       │                 │ 3. Store code  │
       │                 │    & decode    │
       │                 │                │
       │◄────────────────┤                │
       │  4. postMessage │                │
       │     with code   │                │
       │                 │                │
       │ 5. Exchange for token            │
       ├────────────────────────────────►│
       │                 │                │
       │◄────────────────────────────────┤
       │  6. Access token                 │
```

## Dependencies

```json
{
  "express": "^5.2.1",     // Web server
  "cors": "^2.8.5"         // CORS middleware
}
```

## Storage (Optional)

The proxy includes optional file-based storage for:

- **Credentials**: Encrypted API credentials
- **Connections**: Saved connection configurations

**Location**: `server/data/`

**Format**: JSON files

**Note**: This is an optional convenience feature. The frontend can use its own storage mechanism (Spark KV store, localStorage, etc.) instead.

## Security Considerations

### Development (Current)

✅ Decodes authorization codes properly  
✅ Uses `postMessage` for communication  
✅ Temporary storage (5-minute expiration)  
⚠️ CORS allows all origins  
⚠️ No rate limiting  
⚠️ In-memory storage only (lost on restart)  

### Production Hardening

**Required Changes**:

1. **Restrict CORS** to specific frontend domains
2. **Add rate limiting** to prevent abuse
3. **Use HTTPS** with valid SSL certificate
4. **Validate state parameter** for CSRF protection
5. **Add authentication** to storage endpoints
6. **Use Redis or database** instead of in-memory storage
7. **Add security headers** (helmet.js)
8. **Implement logging** and monitoring

**Example**: See `/PROXY_SERVER_DOCUMENTATION.md` for detailed security hardening guide.

## Deployment Options

### Option 1: With Frontend (Simple)

Deploy proxy alongside the frontend application:

```json
{
  "scripts": {
    "start": "concurrently \"node server/proxy.js\" \"vite preview\""
  }
}
```

**Best for**: Small deployments, single-server setups

### Option 2: Separate Service (Scalable)

Deploy proxy as independent service:

1. Deploy `server/proxy.js` to Node.js hosting
2. Update `VITE_PROXY_URL` in frontend
3. Register new callback URL with Bullhorn

**Best for**: Production, high-traffic applications

**Recommended Platforms**:
- AWS Lambda + API Gateway
- Google Cloud Functions  
- Heroku
- Railway
- Render
- DigitalOcean App Platform

## Working Without the Proxy

The application **can function without this proxy** using:

1. **Manual Code Entry**: Users paste the authorization code
2. **Direct OAuth**: When Bullhorn allows omitting `redirect_uri`
3. **Third-party OAuth Service**: Use external OAuth handler

See `/PROXY_SERVER_DOCUMENTATION.md` for detailed alternatives.

## Troubleshooting

### Port Already in Use

```bash
lsof -ti:3001 | xargs kill -9
npm run dev
```

### Proxy Not Reachable

1. Verify it's running: `curl http://localhost:3001/health`
2. Check firewall settings
3. Verify port 3001 is accessible
4. Review proxy logs in terminal

### Invalid Redirect URI

1. Verify `http://localhost:3001/oauth/callback` is registered in Bullhorn
2. Check for exact match (no trailing slash)
3. Ensure protocol and port match exactly

### Code Not Received

1. Check browser console for `postMessage` errors
2. Verify popup isn't blocked
3. Check proxy terminal for incoming requests
4. Try polling fallback (automatic)

## Logging

The proxy includes comprehensive logging:

```
🚀 OAuth Proxy Server Started Successfully
📥 OAuth callback received: { hasCode: true, state: 'abc123' }
✅ Code received and decoded
💾 Stored auth code for state: abc123
🔍 Status check for state: abc123 - Found: true
✅ Code retrieved and removed
🧹 Cleaning up expired auth state: xyz789
```

## Testing

### Manual Test

```bash
# Start server
npm run dev

# Check health
curl http://localhost:3001/health

# Test OAuth flow in browser
# 1. Open application
# 2. Click "Try Proxy-Based OAuth"
# 3. Authenticate
# 4. Check console logs
```

### Automated Test

```bash
bash test-proxy-restart.sh
```

## Additional Documentation

- `/PROXY_SERVER_DOCUMENTATION.md` - Comprehensive guide with API reference
- `/README_PROXY.md` - Quick start guide
- `/OAUTH_PROXY_GUIDE.md` - Implementation details
- `/OAUTH_PROXY_SETUP.md` - Setup instructions

## Support

For issues:

1. Check proxy terminal logs
2. Review browser console
3. Verify Bullhorn redirect URI configuration
4. See troubleshooting sections in documentation
5. Check that all required dependencies are installed

## Version

**Current Version**: 1.0.0

**Node.js**: Requires Node.js 18+ (uses ES modules)

**Express**: 5.2.1+

## License

Same as parent project
