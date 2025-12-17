# Proxy Server Restart & Start Guide

## Overview
The OAuth proxy server includes restart and health monitoring functionality to ensure reliable operation during development and production use.

## Features

### 1. Health Monitoring
The proxy includes a `/health` endpoint that returns:
- Service status
- Uptime
- Pending authentications count
- Port number
- Timestamp

### 2. Restart Functionality
The proxy can be restarted via:
- UI button (ProxyStatus component)
- API endpoint (`POST /restart`)
- Command line (`npm run restart:proxy`)

### 3. Start Detection
The proxy includes a `/start` endpoint that confirms if the server is running.

## Usage

### Starting the Proxy

#### Option 1: With Vite (Recommended)
```bash
npm run dev
```
This starts both the proxy and Vite development server.

#### Option 2: Proxy Only
```bash
npm run dev:proxy
```

#### Option 3: Using Start Script
```bash
npm run start:proxy
```
or
```bash
bash start-proxy.sh
```

### Restarting the Proxy

#### Option 1: Via UI
1. Click on the "Proxy Offline" or "Proxy Ready" badge in the header
2. Click the "Restart" button
3. Wait for confirmation

#### Option 2: Via Command Line
```bash
npm run restart:proxy
```
or
```bash
bash restart-proxy.sh
```

#### Option 3: Via API
```bash
curl -X POST http://localhost:3001/restart
```

### Stopping the Proxy

#### Kill Proxy Process
```bash
npm run kill:proxy
```

#### Kill All Services
```bash
npm run kill
```

## Restart Process

When you trigger a restart:

1. **Request Received**: The proxy receives the restart request
2. **Clear State**: Pending authentications are cleared
3. **Graceful Shutdown**: Process exits with code 0
4. **Auto-Restart**: If using `concurrently` or process manager, proxy automatically restarts
5. **Health Check**: UI polls health endpoint to confirm restart

## Troubleshooting

### Proxy Won't Start

**Symptom**: Port 3001 shows as in use
```bash
Error: listen EADDRINUSE: address already in use :::3001
```

**Solution**: Kill the existing process
```bash
npm run kill:proxy
# or
lsof -ti:3001 | xargs kill -9
```

### Restart Not Working

**Symptom**: Restart button doesn't bring proxy back online

**Solutions**:

1. **Manual Restart**:
```bash
npm run restart:proxy
```

2. **Full Process Kill and Restart**:
```bash
npm run kill
npm run dev
```

3. **Check if process is actually running**:
```bash
lsof -i :3001
```

### Proxy Status Shows Offline

**Symptom**: Badge shows "Proxy Offline" but proxy is running

**Solutions**:

1. **Click Retry**: Use the retry button to re-check
2. **Check URL**: Ensure `VITE_PROXY_URL` matches your proxy location
3. **CORS Issues**: Make sure CORS is properly configured

### Authentication Stuck

**Symptom**: OAuth flow hangs with no response

**Solutions**:

1. **Restart Proxy**: Clears pending auth state
2. **Check Logs**: Look at proxy console for errors
3. **Clear Browser State**: Close auth popup/iframe and try again

## Testing

### Run Automated Tests
```bash
# Shell script tests
bash test-proxy-restart.sh

# Vitest tests
npm test -- proxy-restart
```

### Manual Health Check
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "oauth-proxy",
  "version": "1.0.0",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": "5m 23s",
  "pendingAuths": 0,
  "port": 3001
}
```

### Test Restart
```bash
curl -X POST http://localhost:3001/restart
```

Expected response:
```json
{
  "success": true,
  "message": "Proxy server restarting...",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Architecture

### Process Management

The proxy uses a simple restart mechanism:
1. Receives restart request
2. Clears internal state
3. Exits with code 0
4. Process manager (concurrently) detects exit and restarts

### State Management

The proxy maintains:
- `pendingAuths`: Map of state -> auth code
- Cleanup interval: Removes expired auths every 60 seconds
- Expiration time: 5 minutes

### Health Monitoring

Client-side (ProxyStatus component):
- Polls health every 30 seconds
- Shows status badge in header
- Provides restart button when offline

## Best Practices

1. **Always use `npm run dev`**: Ensures both services start together
2. **Monitor proxy status**: Keep an eye on the badge in the header
3. **Restart on auth issues**: If OAuth hangs, restart the proxy
4. **Check logs**: Proxy logs detailed information about all operations
5. **Use automated tests**: Run tests before deploying changes

## Environment Variables

- `PROXY_PORT`: Port for proxy server (default: 3001)
- `VITE_PROXY_URL`: URL for proxy in UI (default: http://localhost:3001)

## Scripts Reference

| Script | Command | Description |
|--------|---------|-------------|
| Start Both | `npm run dev` | Starts proxy and Vite |
| Proxy Only | `npm run dev:proxy` | Starts only proxy |
| Start Proxy | `npm run start:proxy` | Starts proxy with script |
| Restart Proxy | `npm run restart:proxy` | Restarts proxy |
| Kill Proxy | `npm run kill:proxy` | Kills proxy process |
| Kill All | `npm run kill` | Kills all services |
| Test Restart | `bash test-proxy-restart.sh` | Tests restart functionality |

## Support

If you encounter issues not covered here:

1. Check console logs (both browser and server)
2. Run diagnostic tests: `bash test-proxy-restart.sh`
3. Review proxy logs for error messages
4. Try a full restart: `npm run kill && npm run dev`
