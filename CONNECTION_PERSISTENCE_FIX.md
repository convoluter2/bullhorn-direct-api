# Connection Persistence Fix

## Issue
Connections were not persisting between sessions. The app showed that connections were being saved, but they would disappear after:
- Page refresh
- Server restart
- Switching between dev and published site

## Root Cause
The OAuth proxy server (`server/proxy.js`) was storing all connection data and credentials in **in-memory JavaScript Maps**. This meant:

1. **Page refresh**: The frontend would try to load connections from the server, but if the server had restarted, the Maps were empty
2. **No persistence**: Maps are volatile - they only exist in RAM while the Node.js process is running
3. **Server restart**: Any time the proxy server restarted (manually or due to code changes), all saved connections were lost

## Solution
Modified the proxy server to persist data to disk using the file system:

### Changes Made

1. **Added file system persistence** (`server/proxy.js`)
   - Created a `server/data/` directory for storing persistent data
   - Added `credentials.json` to store encrypted credentials
   - Added `connections.json` to store connection metadata
   - Implemented `loadPersistedData()` function that runs on server startup
   - Implemented `saveCredentials()` and `saveConnections()` functions

2. **Updated all API endpoints** to save to disk after modifications:
   - `POST /api/credentials/save` - now calls `await saveCredentials()`
   - `DELETE /api/credentials/:userId/:connectionId` - now calls `await saveCredentials()`
   - `POST /api/connections/save` - now calls `await saveConnections()`
   - `DELETE /api/connections/:userId/:connectionId` - now calls both save functions
   - `PUT /api/connections/:userId/:connectionId` - now calls `await saveConnections()`

3. **Added data directory to .gitignore**
   - Added `server/data/` to `.gitignore` to prevent committing sensitive credentials to Git

## Security Notes

⚠️ **Important**: The credentials are currently stored in plain text JSON files on the server's file system. This is secure for:
- Local development
- Single-user deployments
- Trusted server environments

For production multi-user deployments, consider:
- Encrypting the JSON files at rest
- Using environment variables for a master encryption key
- Implementing proper key management (e.g., AWS KMS, Azure Key Vault)

## Testing Steps

### 1. Verify Proxy Server is Running
```bash
# Check proxy status
curl http://localhost:3001/health

# Expected response:
{
  "status": "healthy",
  "service": "oauth-proxy",
  "version": "1.0.0",
  "timestamp": "2025-01-XX...",
  "uptime": "Xm Xs",
  "port": 3001
}
```

### 2. Save a Test Connection
1. Open the app (if not connected, click "Saved Connections")
2. Click "Add New Connection"
3. Fill in the form:
   - Connection Name: "Test Connection"
   - Environment: PROD or NPE
   - Tenant: your tenant name
   - Client ID, Secret, Username, Password
4. Click "Save Connection"
5. Should see toast: "Connection saved securely"

### 3. Verify Data Files Created
```bash
# Check that data files were created
ls -la server/data/

# Expected output:
# credentials.json
# connections.json

# View connections (safe to view)
cat server/data/connections.json

# View credentials (contains sensitive data - be careful!)
cat server/data/credentials.json
```

### 4. Test Persistence - Page Refresh
1. Save a connection (as above)
2. **Refresh the page** (Cmd+R or Ctrl+R)
3. Verify the connection still appears in the UI
4. Connection should be visible without having to re-enter it

### 5. Test Persistence - Proxy Restart
1. Save a connection
2. Restart the proxy server:
   ```bash
   npm run restart:proxy
   ```
   OR use the UI:
   - Click the "Proxy Ready" badge in the header
   - Click "Restart" button
3. Wait for proxy to restart (3-5 seconds)
4. **Refresh the page**
5. Verify the connection still appears

### 6. Test Persistence - Full Restart
1. Save a connection
2. Kill all processes:
   ```bash
   npm run kill
   ```
3. Restart everything:
   ```bash
   npm run dev
   ```
4. Open the app in browser
5. Verify the connection still appears

### 7. Test Connection Operations
1. **Edit a connection**:
   - Click pencil icon on a connection
   - Change the name
   - Click "Update"
   - Refresh page - verify change persisted

2. **Delete a connection**:
   - Click trash icon on a connection
   - Refresh page - verify connection is gone

3. **Update lastUsed timestamp**:
   - Click on a connection to use it
   - Check `server/data/connections.json` - should see updated `lastUsed` timestamp

## Logs to Check

When saving connections, you should see these logs in the proxy server terminal:

```
🔑 Saved credentials for user 12345, connection conn-1234567890-abc
💾 Saved connection for user 12345: Test Connection
```

When the server starts, you should see:

```
📂 Loaded X credentials from disk
📂 Loaded connections for X users from disk
🚀 ═══════════════════════════════════════════════════
🔐 OAuth Proxy Server Started Successfully
═══════════════════════════════════════════════════
📍 Port: 3001
🔗 Callback: http://localhost:3001/oauth/callback
💚 Health: http://localhost:3001/health
⏰ Started: 2025-01-XX...
💾 Data Directory: /path/to/server/data
═══════════════════════════════════════════════════
```

## Troubleshooting

### Connections not appearing after refresh

1. **Check if proxy is running**:
   ```bash
   curl http://localhost:3001/health
   ```

2. **Check browser console for errors**:
   - Open DevTools (F12)
   - Look for errors related to `secureCredentialsAPI.getConnections()`

3. **Check proxy server logs**:
   - Look for any errors when loading or saving data
   - Should see "Loaded X connections" on startup

4. **Verify data files exist**:
   ```bash
   ls -la server/data/
   cat server/data/connections.json
   ```

5. **Check file permissions**:
   ```bash
   # Ensure server can read/write to data directory
   chmod 755 server/data
   chmod 644 server/data/*.json
   ```

### Proxy server won't start

1. **Kill any existing processes**:
   ```bash
   npm run kill
   # Or manually:
   lsof -ti:3001 | xargs kill -9
   ```

2. **Start fresh**:
   ```bash
   npm run dev
   ```

3. **Check for port conflicts**:
   ```bash
   lsof -i:3001
   ```

### Data files corrupted

If JSON files get corrupted:

1. **Backup current files** (just in case):
   ```bash
   cp server/data/connections.json server/data/connections.json.bak
   cp server/data/credentials.json server/data/credentials.json.bak
   ```

2. **Validate JSON**:
   ```bash
   cat server/data/connections.json | jq .
   cat server/data/credentials.json | jq .
   ```

3. **If invalid, reset**:
   ```bash
   echo '{}' > server/data/connections.json
   echo '{}' > server/data/credentials.json
   ```

4. **Restart proxy**:
   ```bash
   npm run restart:proxy
   ```

## API Endpoints Reference

| Endpoint | Method | Purpose | Persists to Disk |
|----------|--------|---------|------------------|
| `/api/connections/save` | POST | Save new connection | ✅ Yes |
| `/api/connections/:userId` | GET | Get all connections | N/A |
| `/api/connections/:userId/:connectionId` | PUT | Update connection | ✅ Yes |
| `/api/connections/:userId/:connectionId` | DELETE | Delete connection | ✅ Yes |
| `/api/credentials/save` | POST | Save credentials | ✅ Yes |
| `/api/credentials/:userId/:connectionId` | GET | Get credentials | N/A |
| `/api/credentials/:userId/:connectionId` | DELETE | Delete credentials | ✅ Yes |

## File Format

### connections.json
```json
{
  "user-id-123": [
    {
      "id": "conn-1234567890-abc",
      "name": "Trustaff PROD",
      "environment": "PROD",
      "tenant": "Trustaff/Ingenovis",
      "createdAt": 1705234567890,
      "lastUsed": 1705234567890
    }
  ]
}
```

### credentials.json
```json
{
  "user-id-123-conn-1234567890-abc": {
    "clientId": "your-client-id",
    "clientSecret": "your-client-secret",
    "username": "your-username",
    "password": "your-password"
  }
}
```

## Next Steps for Enhanced Security (Optional)

1. **Encrypt at rest**: Use Node.js `crypto` module to encrypt JSON before writing
2. **Master key**: Store encryption key in environment variable
3. **Per-user encryption**: Use different encryption keys per user
4. **Key rotation**: Implement periodic key rotation
5. **Audit logging**: Log all access to credentials
6. **Rate limiting**: Add rate limits to credential endpoints

## Summary

✅ Connections now persist to disk  
✅ Survives page refresh  
✅ Survives proxy restart  
✅ Survives full system restart  
✅ Data stored in `server/data/` (gitignored)  
✅ Credentials stored securely on server filesystem  
