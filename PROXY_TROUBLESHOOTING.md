# Proxy Server Troubleshooting Guide

## Error: "Proxy Server Not Available"

This error means the OAuth proxy server on port 3001 is not running or not accessible.

## Quick Fix (Most Common Solution)

```bash
# Kill any stuck processes
npm run kill

# Start both servers
npm run dev
```

Wait for both servers to start. You should see:
```
🚀 OAuth Proxy Server Started Successfully
✓ Vite dev server running
```

## Step-by-Step Troubleshooting

### Step 1: Verify Proxy Status

Run the verification script:
```bash
chmod +x verify-proxy.sh
./verify-proxy.sh
```

This will check:
- ✅ Is proxy running?
- ✅ Is port 3001 available?
- ✅ Is .env configured?
- ✅ Are server files present?

### Step 2: Check What's Running

```bash
# Check if anything is on port 3001
lsof -i :3001

# Check if anything is on port 5000 (Vite)
lsof -i :5000
```

**If nothing shows:** Servers aren't running. Start them:
```bash
npm run dev
```

**If something shows:** Note the PID and check if it's your proxy:
```bash
# Kill specific process
kill -9 <PID>

# Or kill all on port
fuser -k 3001/tcp
```

### Step 3: Start Proxy Manually (Debug Mode)

Start the proxy in a separate terminal to see detailed logs:

```bash
# Terminal 1: Start proxy with full output
node server/proxy.js
```

You should see:
```
🚀 ═══════════════════════════════════════════════════
🔐 OAuth Proxy Server Started Successfully
═══════════════════════════════════════════════════
📍 Port: 3001
🔗 Callback: http://localhost:3001/oauth/callback
💚 Health: http://localhost:3001/health
⏰ Started: 2025-01-XX...
═══════════════════════════════════════════════════
```

**If you see an error instead:**

#### Error: "Port 3001 already in use"
```bash
fuser -k 3001/tcp
node server/proxy.js
```

#### Error: "Cannot find module 'express'"
```bash
npm install
node server/proxy.js
```

#### Error: "EACCES permission denied"
```bash
# Try a different port
PROXY_PORT=3002 node server/proxy.js

# Update .env
echo "VITE_PROXY_URL=http://localhost:3002" > .env
```

### Step 4: Test Proxy Manually

With the proxy running, test it:

```bash
# Health check
curl http://localhost:3001/health

# Should return:
# {"status":"healthy","service":"oauth-proxy",...}
```

If this works, the proxy is running correctly!

### Step 5: Check Browser Console

Open your app in the browser and check the console (F12):

Look for proxy-related messages:
- ✅ "Proxy server healthy"
- ❌ "Proxy server not reachable"

If you see errors, check:
1. Is `VITE_PROXY_URL` correct in .env?
2. Did you restart the Vite server after changing .env?
3. Is your browser blocking localhost connections?

### Step 6: Restart Everything

Sometimes a clean restart fixes everything:

```bash
# Kill everything
npm run kill

# Or manually
fuser -k 5000/tcp
fuser -k 3001/tcp

# Clear node cache (if needed)
rm -rf node_modules/.vite

# Start fresh
npm run dev
```

## Common Issues & Solutions

### Issue: "Connection Refused"

**Symptoms:** App shows "Proxy Offline", can't connect

**Cause:** Proxy not running or firewall blocking

**Solution:**
```bash
# Check firewall
sudo ufw status
sudo ufw allow 3001

# Start proxy
npm run dev:proxy
```

### Issue: "404 Not Found on /health"

**Symptoms:** Proxy running but health check fails

**Cause:** Wrong URL or proxy code issue

**Solution:**
```bash
# Check the actual URL
echo $VITE_PROXY_URL

# Should be: http://localhost:3001

# Test directly
curl -v http://localhost:3001/health

# Check proxy logs for errors
node server/proxy.js
```

### Issue: "Proxy Running But Auth Still Fails"

**Symptoms:** Green "Proxy Ready" badge, but OAuth errors

**Cause:** Callback URL misconfigured or CORS issue

**Solution:**
1. Check proxy logs during auth attempt
2. Look for callback hits in terminal:
   ```
   📥 OAuth callback received: { hasCode: true, ... }
   ```
3. If no callback received, check Bullhorn OAuth config
4. Verify redirect_uri in Bullhorn matches your proxy

### Issue: "Works in Dev, Not in Production"

**Cause:** Production proxy URL not configured

**Solution:**
```bash
# Production .env
VITE_PROXY_URL=https://your-production-domain.com

# Deploy proxy separately
# Option 1: Same server, different port
PROXY_PORT=3001 node server/proxy.js

# Option 2: Separate server
# Deploy proxy to dedicated server/container
# Update VITE_PROXY_URL to point to it
```

## Understanding the Proxy Flow

```
┌─────────────────┐
│   Your App      │
│  (Port 5000)    │
└────────┬────────┘
         │
         │ 1. User clicks "Connect"
         │ 2. Opens popup to Bullhorn
         │
         ▼
┌─────────────────────────────┐
│   Bullhorn OAuth Server     │
│                             │
│  User logs in, approves     │
└──────────┬──────────────────┘
           │
           │ 3. Redirects to:
           │    http://localhost:3001/oauth/callback?code=...
           │
           ▼
┌─────────────────────────────┐
│   OAuth Proxy Server        │
│      (Port 3001)            │
│                             │
│  • Receives code            │
│  • Decodes it               │
│  • Stores temporarily       │
│  • Sends HTML that posts    │
│    message to opener        │
└──────────┬──────────────────┘
           │
           │ 4. PostMessage with code
           │
           ▼
┌─────────────────┐
│   Your App      │
│                 │
│  • Receives code│
│  • Exchanges for│
│    access token │
│  • Completes    │
│    login        │
└─────────────────┘
```

**Critical Point:** If the proxy (step 3) isn't running, the OAuth redirect fails and you get "Proxy Server Not Available".

## Monitoring & Debugging

### Watch Proxy Logs Live
```bash
# Start proxy with full logging
node server/proxy.js

# In another terminal, trigger auth
# Watch for:
# 📥 OAuth callback received
# ✅ Code received and decoded
# 💾 Stored auth code
```

### Check Health Continuously
```bash
# Watch command (if available)
watch -n 1 'curl -s http://localhost:3001/health | jq'

# Or manual loop
while true; do
  curl -s http://localhost:3001/health | jq
  sleep 5
done
```

### Browser DevTools

1. Open DevTools (F12)
2. Network tab
3. Filter for "localhost:3001"
4. Try connecting
5. Look for:
   - ✅ GET /health → 200 OK
   - ❌ GET /health → Failed/CORS error

## Getting Help

If you're still stuck:

1. **Gather Information:**
   ```bash
   # Run these and save output
   ./verify-proxy.sh > debug.txt
   lsof -i :3001 >> debug.txt
   lsof -i :5000 >> debug.txt
   cat .env >> debug.txt
   ```

2. **Check Logs:**
   - Proxy server terminal output
   - Browser console errors (F12)
   - Network tab in DevTools

3. **Try Minimal Test:**
   ```bash
   # Just start proxy
   node server/proxy.js
   
   # In another terminal
   curl http://localhost:3001/health
   
   # Does this work? If not, there's a server issue
   # If yes, issue is with app connection
   ```

## Prevention

To avoid this issue in the future:

1. **Always use:** `npm run dev` (starts both servers)
2. **Check status** before authenticating (look for green "Proxy Ready" badge)
3. **Keep terminal open** to see server logs
4. **Use verification script** periodically: `npm run verify`

## Quick Reference

```bash
# Start everything
npm run dev

# Just proxy
npm run dev:proxy

# Just Vite
npm run dev:vite

# Kill everything
npm run kill

# Verify setup
npm run verify

# Manual health check
curl http://localhost:3001/health

# Check ports
lsof -i :3001
lsof -i :5000

# Kill specific port
fuser -k 3001/tcp
```
