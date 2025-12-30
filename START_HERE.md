# Bullhorn Data Manager - Quick Start

## 🚀 Starting the Application

### Option 1: Start Everything (Recommended)
```bash
npm run dev
```

This starts:
- OAuth Proxy Server (port 3001)
- Vite Dev Server (port 5000)

### Option 2: Start Separately
```bash
# Terminal 1
npm run dev:proxy

# Terminal 2
npm run dev:vite
```

## ✅ Verify Everything is Running

Look for the **"Proxy Ready"** badge (green) in the top right of the app.

- 🟢 **Proxy Ready** = Everything is working! You can authenticate.
- 🔴 **Proxy Offline** = Proxy server not running. See troubleshooting below.

Or run the verification script:
```bash
npm run verify
```

## 🔧 Troubleshooting

### "Proxy Server Not Available" Error

**Quick Fix:**
```bash
npm run kill
npm run dev
```

**Detailed Help:**
See [PROXY_TROUBLESHOOTING.md](./PROXY_TROUBLESHOOTING.md)

### OAuth Authentication Issues (404 Errors, Wrong Tenant, etc.)

**Seeing "HTTP Status 404" or Tomcat errors in the OAuth popup?**

This is caused by **browser cookie caching** from previous Bullhorn logins.

**Quick Fixes:**
1. **Use Incognito Mode** (Recommended):
   - Click "Copy for Incognito" in the auth dialog
   - Open an Incognito/Private window
   - Paste the URL, login, copy the final URL back

2. **Clear Bullhorn Cookies**:
   - Click "Clear Cookies & Cache" button in the app header
   - Select "Clear Bullhorn Cookies & Sessions"

3. **Try a different browser**

**Detailed Help:**
See [OAUTH_TROUBLESHOOTING.md](./OAUTH_TROUBLESHOOTING.md) for comprehensive solutions and technical details.

### Port Already in Use

```bash
# Kill processes on both ports
npm run kill

# Or individually
fuser -k 3001/tcp  # Proxy
fuser -k 5000/tcp  # Vite
```

## 📚 Documentation

- **[OAUTH_TROUBLESHOOTING.md](./OAUTH_TROUBLESHOOTING.md)** - ⭐ **Common OAuth/Auth Issues (404 errors, wrong tenant, cookie problems)**
- [PROXY_STATUS.md](./PROXY_STATUS.md) - Proxy server details
- [PROXY_TROUBLESHOOTING.md](./PROXY_TROUBLESHOOTING.md) - Proxy troubleshooting
- [PRD.md](./PRD.md) - Product requirements
- [README.md](./README.md) - Main project readme

## 🎯 First Time Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the servers:**
   ```bash
   npm run dev
   ```

3. **Open in browser:**
   ```
   http://localhost:5000
   ```

4. **Verify proxy status:**
   - Look for green "Proxy Ready" badge
   - Or visit: http://localhost:3001/health

5. **Connect to Bullhorn:**
   - Click "Saved Connections"
   - Add a new connection with your credentials
   - Test the connection

## 🆘 Getting Help

If something isn't working:

1. Check the green/red badge in the UI
2. Run: `npm run verify`
3. Check terminal output for errors
4. See troubleshooting guide

## 🔑 Key Components

- **Port 3001** - OAuth Proxy Server (handles authentication callbacks)
- **Port 5000** - Vite Dev Server (the main application)
- **.env file** - Contains `VITE_PROXY_URL=http://localhost:3001`

Both must be running for authentication to work!
