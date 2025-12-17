# Bullhorn Data Manager - Authentication Guide

## Overview

The Bullhorn Data Manager supports multiple authentication methods to connect to your Bullhorn instance via the REST API.

## Authentication Methods

### 1. ✨ Automated OAuth Flow (Recommended)

This is the **primary and most reliable** authentication method.

**How it works:**
1. Enter your Bullhorn OAuth credentials (Client ID, Client Secret, Username, Password)
2. Click "Start Automated OAuth Flow"
3. You'll be redirected to Bullhorn's login page (credentials will auto-fill if provided)
4. After successful login, you'll be automatically redirected back to the app
5. The app automatically extracts the authorization code and exchanges it for tokens
6. You're logged in - no manual code copying needed!

**Requirements:**
- Your Bullhorn OAuth application must have a **redirect URI configured**
- The redirect URI must match the URL where this app is hosted
- Default redirect URI: Your current URL (automatically detected)

**Troubleshooting "Invalid Redirect URI" errors:**
- Verify the redirect URI in the app matches exactly what's configured in your Bullhorn OAuth application
- Contact your Bullhorn administrator to add/update the redirect URI in your OAuth app settings
- Alternative: Disable automated mode and try programmatic authentication

### 2. Quick Connect (Programmatic)

Attempts to authenticate programmatically without redirects.

**How it works:**
1. Enter your credentials
2. Disable "Automated OAuth Mode" 
3. Click "Quick Connect (Programmatic)"
4. The app attempts to get an authorization code via API calls

**Limitations:**
- May not work in all browser environments due to CORS and security restrictions
- Browser fetch API doesn't always expose redirect locations
- Less reliable than automated OAuth flow

**Use this when:**
- You can't configure a redirect URI in your Bullhorn OAuth app
- The automated flow is failing due to redirect URI mismatches

### 3. Manual Code Entry

Fallback method for when automated flows don't work.

**How it works:**
1. Enter your credentials
2. Disable "Automated OAuth Mode"
3. Click "Open Authorization URL" to get the OAuth authorization page
4. Log in to Bullhorn in the popup window
5. Copy the authorization code from the resulting URL (format: `25184_8090191_44:abc-123-def`)
6. Paste the code into the "Authorization Code" field
7. Click "Connect with Code"

**Note:** The app automatically handles URL-encoded codes (e.g., `%3A` → `:`)

## Saved Connections

You can save multiple Bullhorn tenant credentials for quick switching:

1. Go to "Saved Connections" (or "Manage Connections" when logged in)
2. Click "Add Connection"
3. Fill in:
   - Connection Name (e.g., "Fastaff NPE", "Trustaff Production")
   - Client ID
   - Client Secret  
   - Username
   - Password
   - Environment (Production/NPE/Sandbox)
4. Save the connection

**Benefits:**
- Securely stored credentials (encrypted via Spark KV)
- Quick switching between tenants while logged in
- No need to re-enter credentials each time

## Token Refresh

The app automatically refreshes access tokens before they expire:
- Access tokens are valid for 10 minutes
- Refresh happens automatically at 1 minute before expiry
- Refresh tokens are securely stored with your session
- You'll be notified if refresh fails (requires re-authentication)

## Security

- Credentials are stored using Spark's secure KV storage
- Access tokens and refresh tokens are kept in session state
- Session data includes expiration timestamps for automatic refresh
- No credentials are sent to third-party services

## Credential Requirements

To connect to Bullhorn, you need:

1. **Client ID** - Your Bullhorn OAuth application's client identifier
2. **Client Secret** - Your Bullhorn OAuth application's secret key
3. **Username** - Your Bullhorn user account username
4. **Password** - Your Bullhorn user account password

These are provided by your Bullhorn administrator when an OAuth application is created for your integration.

## Common Issues

### "No authorization code received"
- **Cause:** Programmatic authentication failed due to browser security restrictions
- **Solution:** Use the automated OAuth flow with redirect URI enabled instead

### "Invalid Redirect URI: null"
- **Cause:** Your Bullhorn OAuth app doesn't have a redirect URI configured
- **Solution 1:** Ask your Bullhorn admin to add your app URL as a redirect URI
- **Solution 2:** Disable automated mode and try Quick Connect or manual code entry

### "Invalid, expired, or revoked authorization code"
- **Cause:** The authorization code was already used or took too long to exchange
- **Solution:** Start the authentication process again from the beginning
- **Note:** Authorization codes are single-use and expire quickly (usually within 1 minute)

### "OAuth session expired"
- **Cause:** More than 10 minutes passed between starting OAuth and completing it
- **Solution:** Start the authentication process again

## Best Practices

1. **Use Automated OAuth Flow** when possible - it's the most reliable
2. **Save your connections** for quick access to multiple tenants
3. **Keep credentials secure** - don't share your Client Secret
4. **Monitor token expiry** - the app will notify you when refresh is needed
5. **Test connections** before saving them to verify credentials work

## Technical Details

**OAuth Flow:**
```
1. GET /oauth/authorize?client_id={id}&response_type=code&username={user}&password={pass}&action=Login
   → Redirects to callback with code

2. POST /oauth/token
   Body: grant_type=authorization_code&code={code}&client_id={id}&client_secret={secret}
   → Returns access_token, refresh_token, expires_in

3. POST /rest-services/login?version=*&access_token={token}
   → Returns BhRestToken, restUrl, corporationId, userId
```

**Session Structure:**
```typescript
{
  BhRestToken: string      // Session token for API calls
  restUrl: string          // Base URL for REST API
  corporationId: number    // Your Bullhorn corporation ID
  userId: number           // Your user ID
  accessToken: string      // OAuth access token
  refreshToken?: string    // OAuth refresh token
  expiresAt?: number       // Token expiration timestamp
}
```
