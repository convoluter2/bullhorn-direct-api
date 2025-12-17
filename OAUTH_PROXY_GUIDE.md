# OAuth Proxy Implementation Guide

## Overview

This document describes the proxy-based OAuth implementation added to handle Bullhorn's redirect URI restrictions.

## Problem Statement

Bullhorn OAuth has strict redirect URI requirements:
1. The redirect URI must be pre-configured in the Bullhorn OAuth application
2. Dynamic URLs (like GitHub Codespaces) cannot be pre-registered
3. CORS restrictions prevent direct popup/iframe URL reading
4. The authorization code needs to be extracted and decoded properly

## Solution Architecture

### Three-Tiered Approach

#### 1. Standard Popup OAuth (Current Default)
- Opens Bullhorn auth in a popup without a redirect_uri parameter
- Monitors popup URL for welcome.bullhornstaffing.com
- Extracts code when welcome page is detected
- Works when redirect_uri can be omitted

#### 2. Proxy-Based OAuth (New Beta Feature)
- Uses same popup mechanism but with enhanced monitoring
- Better error handling and retry logic
- Improved code extraction with automatic decoding
- Fallback when standard method fails

#### 3. External Proxy Service (Future Enhancement)
- Backend service acts as redirect URI handler
- Service URL is pre-registered with Bullhorn
- Handles code exchange server-side
- Returns tokens to client via secure channel

## Implementation Details

### Core Components

#### 1. `oauth-proxy.ts`
Service layer that handles:
- OAuth flow initialization
- Polling for completion
- Code exchange via proxy
- Inline callback handling
- Local flow simulation

#### 2. `OAuthProxyHandler.tsx`
UI component that:
- Processes OAuth callbacks
- Extracts authorization codes
- Handles errors gracefully
- Provides user feedback

#### 3. Enhanced `AuthDialog.tsx`
Updated authentication dialog with:
- `handleProxyBasedAuth()` - New proxy-based flow
- Better popup monitoring
- Automatic code decoding
- Improved error recovery

### Flow Diagram

```
User Clicks "Try Proxy-Based OAuth"
    ↓
System fetches LoginInfo for OAuth URL
    ↓
Generate auth URL without redirect_uri
    ↓
Open popup with auth URL
    ↓
Monitor popup URL (1s intervals)
    ↓
Detect welcome.bullhornstaffing.com
    ↓
Extract code parameter from URL
    ↓
Decode URL-encoded characters (%3A → :)
    ↓
Exchange code for access token
    ↓
Login to REST API
    ↓
Success! Store session
```

## Usage

### For Users

1. **Standard Method (Recommended)**
   - Click "Start Popup OAuth"
   - Wait for automatic authentication
   - Code is extracted automatically

2. **Proxy Method (If Standard Fails)**
   - Click "Try Proxy-Based OAuth (Beta)"
   - Enhanced monitoring and retry logic
   - Better for problematic configurations

3. **Manual Method (Last Resort)**
   - Disable "Popup OAuth Mode"
   - Open authorization popup manually
   - Copy entire URL from popup
   - Paste into code field

### For Developers

#### Adding Proxy Service

To implement a full backend proxy:

1. **Create Backend Service**
```typescript
// Example Express endpoint
app.get('/oauth/callback', async (req, res) => {
  const { code, state } = req.query
  
  // Get flow data from KV store
  const flowData = await kv.get(`oauth_flow_${state}`)
  
  // Exchange code for token
  const tokenResponse = await fetch(
    `${flowData.oauthUrl}/token?` +
    `grant_type=authorization_code&` +
    `code=${code}&` +
    `client_id=${flowData.clientId}&` +
    `client_secret=${flowData.clientSecret}`
  )
  
  const tokens = await tokenResponse.json()
  
  // Store completion status
  await kv.set(`oauth_flow_${state}`, {
    ...flowData,
    status: 'completed',
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in
  })
  
  // Redirect to success page
  res.redirect('/oauth/success')
})
```

2. **Register Redirect URI**
   - Contact Bullhorn support
   - Register `https://your-proxy.com/oauth/callback`
   - Update `OAuthProxyService` constructor with proxy URL

3. **Enable Proxy in Client**
```typescript
const oauthProxyService = new OAuthProxyService(
  'https://your-proxy.com'
)

const { authUrl, flowId } = await oauthProxyService.initiateOAuthFlow({
  proxyUrl: 'https://your-proxy.com',
  clientId: credentials.clientId,
  clientSecret: credentials.clientSecret,
  username: credentials.username,
  password: credentials.password,
  oauthUrl: loginInfo.oauthUrl
})
```

## Key Features

### 1. Automatic Code Decoding
```typescript
// Input: 25184_8090191_44%3Aead82de4-121c-45c5-845b-84a290f03afc
// Output: 25184_8090191_44:ead82de4-121c-45c5-845b-84a290f03afc
const decodedCode = decodeURIComponent(code)
```

### 2. URL Extraction
```typescript
// Accepts full URL or just code
if (input.includes('code=')) {
  const url = new URL(input)
  const code = url.searchParams.get('code')
}
```

### 3. Dynamic OAuth URL
```typescript
// Fetches correct data center
const loginInfo = await bullhornAPI.getLoginInfo(username)
// Uses region-specific OAuth URL
const authUrl = `${loginInfo.oauthUrl}/authorize?...`
```

### 4. Enhanced Error Handling
- Popup blocked detection
- Timeout after 60 seconds
- Cross-origin handling
- Automatic retry logic

## Testing

### Test Proxy-Based Flow

1. **Start the application**
2. **Open Connection Dialog**
3. **Enter credentials**
4. **Click "Try Proxy-Based OAuth (Beta)"**
5. **Verify:**
   - Popup opens with Bullhorn login
   - Welcome page is detected
   - Code is extracted automatically
   - Token exchange succeeds
   - Session is established

### Manual Testing

```bash
# Test OAuth URL generation
const authUrl = bullhornAPI.getAuthorizationUrl(
  'test@example.com',
  'client-id',
  'state-123',
  'password'
)
console.log(authUrl)

# Test code extraction
const code = oauthProxyService.handleCallbackInline(
  'https://welcome.bullhornstaffing.com/?code=25184_8090191_44%3Aead82de4...'
)
console.log(code)
```

## Troubleshooting

### Issue: Popup is blocked
**Solution:** Allow popups in browser settings for this site

### Issue: Code not extracted
**Solution:** 
- Check console logs for popup URL
- Verify welcome page is loading
- Try proxy-based method
- Fall back to manual code entry

### Issue: Invalid redirect_uri error
**Solution:**
- Ensure redirect_uri is NOT being sent
- Use proxy-based method which handles this
- Contact Bullhorn to register redirect URI

### Issue: Invalid authorization code
**Solution:**
- Code may be double-encoded
- Try pasting full URL instead of code
- System will decode automatically

## Future Enhancements

1. **Backend Proxy Service**
   - Deploy dedicated OAuth proxy
   - Register with Bullhorn
   - Handle code exchange server-side

2. **Enhanced Security**
   - State validation
   - PKCE support
   - Token encryption

3. **Better UX**
   - Progress indicators
   - Real-time URL display
   - QR code for mobile auth

4. **Multi-Region Support**
   - Automatic region detection
   - Region-specific proxy endpoints
   - Fallback to alternative regions

## Security Considerations

1. **Credentials Storage**
   - Uses secure KV store
   - Server-side encryption
   - Never exposed in URLs

2. **Token Handling**
   - Short-lived access tokens
   - Refresh token rotation
   - Secure session management

3. **State Parameter**
   - Random state generation
   - State validation on callback
   - CSRF protection

## Conclusion

The proxy-based OAuth implementation provides multiple authentication paths to ensure users can always connect to Bullhorn, regardless of configuration restrictions. The three-tiered approach (standard popup → proxy-based → manual) ensures maximum compatibility while maintaining security and user experience.
