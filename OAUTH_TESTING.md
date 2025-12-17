# OAuth Automated Authentication Testing

This document describes the automated OAuth testing suite and how to validate the authentication flow.

## Overview

The OAuth authentication flow has been fully automated with comprehensive test coverage. The tests validate every step of the process from credential storage through token exchange and session creation.

## Test Files

### 1. `src/__tests__/auth-automation.test.ts`
End-to-end OAuth flow testing covering:
- ✅ Credential storage and retrieval
- ✅ Authorization URL generation
- ✅ OAuth redirect callback handling
- ✅ URL-encoded code decoding
- ✅ Token exchange (code → access token + refresh token)
- ✅ REST API login (access token → session)
- ✅ Session storage with refresh token and expiration
- ✅ OAuth flow cleanup
- ✅ Complete end-to-end flow
- ✅ Error scenarios (missing code, expired code, invalid credentials)
- ✅ Token refresh functionality

### 2. `src/__tests__/oauth-integration.test.ts`
Multi-tenant connection management testing:
- ✅ Saving multiple tenant connections (Fastaff, Trustaff, Springboard, Vista/Vital, HCS)
- ✅ NPE and PROD environments for each tenant
- ✅ Connection retrieval and credential verification
- ✅ Connection updates (last used timestamp)
- ✅ Connection deletion
- ✅ OAuth URL generation for all connections
- ✅ Complete OAuth flow simulation with connection selection

### 3. `src/__tests__/bullhorn-api.test.ts`
Core API functionality testing (existing tests)

## Running the Tests

### Run All OAuth Tests
```bash
npm test -- auth-automation
npm test -- oauth-integration
```

### Run Complete Test Suite
```bash
npm test
```

### Run Tests with Watch Mode
```bash
npm test:watch
```

### Run Tests with UI
```bash
npm test:ui
```

### Run with Coverage
```bash
npm test:coverage
```

### Use the Dedicated Test Script
```bash
chmod +x test-auth-flow.sh
./test-auth-flow.sh
```

## What the Tests Validate

### Authentication Flow Steps

1. **Credential Storage**
   - Securely stores client ID, client secret, username, and password
   - Validates storage and retrieval from KV store
   - Tests multiple connection management

2. **Authorization URL Generation**
   - Generates correct OAuth URL with all required parameters
   - Includes action=Login with username/password for auto-login
   - Validates redirect URI encoding

3. **OAuth Redirect Handling**
   - Detects authorization code in URL parameters
   - Handles URL-encoded codes (e.g., `%3A` → `:`)
   - Retrieves pending OAuth session from storage
   - Validates session timeout (10-minute expiration)

4. **Token Exchange**
   - Exchanges authorization code for access token
   - Receives refresh token for later use
   - Handles API errors gracefully
   - Validates token response structure

5. **REST API Login**
   - Uses access token to get Bullhorn REST session
   - Retrieves BhRestToken and REST URL
   - Stores corporation ID and user ID

6. **Session Management**
   - Stores session with refresh token
   - Calculates expiration timestamp
   - Validates session structure
   - Tests automatic token refresh

7. **Cleanup**
   - Deletes pending OAuth data after successful auth
   - Cleans URL parameters
   - Validates cleanup completion

### Error Scenarios Tested

- ❌ Missing authorization code
- ❌ OAuth error in URL (`error` parameter)
- ❌ Expired OAuth session (>10 minutes)
- ❌ Invalid authorization code
- ❌ Token exchange failures
- ❌ REST API login failures
- ❌ Missing credentials

## Test Credentials

The tests use mock credentials for validation:

```javascript
{
  clientId: 'a6a33789-1490-4888-994e-345f22808e41',
  clientSecret: 'test-secret-key',
  username: 'test@fastaff.com',
  password: 'test-password-123'
}
```

Mock authorization code:
```
25184_8090191_44:0e19f0db-1c33-4409-b914-af5345c2b885
```

URL-encoded format (as received from Bullhorn):
```
25184_8090191_44%3A0e19f0db-1c33-4409-b914-af5345c2b885
```

## Expected Test Output

```
OAuth Automated Authentication Test Suite
==========================================

Running authentication automation tests...

 ✓ src/__tests__/auth-automation.test.ts (28 tests)
   ✓ Automated OAuth Flow End-to-End
     ✓ Step 1: Store Credentials
     ✓ Step 2: Generate Authorization URL  
     ✓ Step 3: Handle OAuth Redirect Callback
     ✓ Step 4: Exchange Code for Token
     ✓ Step 5: Login with Access Token
     ✓ Step 6: Store Session with Refresh Token
     ✓ Step 7: Clean Up OAuth Flow
     ✓ Complete End-to-End Flow
     ✓ Error Scenarios
     ✓ Token Refresh

✅ All OAuth automation tests passed!

Test Coverage:
  ✓ Credential storage
  ✓ Authorization URL generation
  ✓ OAuth redirect callback handling
  ✓ Code decoding (URL-encoded to decoded)
  ✓ Token exchange
  ✓ Session creation with refresh token
  ✓ Session cleanup
  ✓ Complete end-to-end flow
  ✓ Error handling scenarios
  ✓ Token refresh flow

The automated OAuth flow is ready to use!
```

## Manual Testing with Saved Credentials

To test with your actual Bullhorn credentials:

1. **Save your connection:**
   - Click "Saved Connections" in the app
   - Add a new connection with your credentials
   - Verify the connection is saved

2. **Start Automated OAuth Flow:**
   - Click "Connect to Bullhorn"
   - Select your saved connection (or enter credentials)
   - Ensure "Automated OAuth Mode" is enabled
   - Click "Start Automated OAuth Flow"

3. **Verify the flow:**
   - You should be redirected to Bullhorn
   - Log in if prompted (or auto-login if username/password provided)
   - You should be redirected back automatically
   - The app should authenticate without manual code entry
   - Check that you're connected and can use the app features

4. **Check for errors:**
   - Open browser console (F12)
   - Look for OAuth callback logs
   - Verify no errors during redirect/token exchange
   - Check that session is stored correctly

## Troubleshooting

### "Invalid Redirect URI" Error

**Problem:** Bullhorn rejects the redirect URI

**Solutions:**
1. Ensure the redirect URI in your OAuth app configuration matches exactly
2. Check that the current URL is set as the redirect URI
3. Try disabling automated mode and using programmatic auth instead

### "OAuth Session Expired" Error

**Problem:** More than 10 minutes passed between starting OAuth and receiving the code

**Solution:** Restart the OAuth flow - the session times out for security

### "No Authorization Code Received" Error

**Problem:** The programmatic auth flow failed to extract the code

**Solution:** Use the automated redirect flow (enable "Automated OAuth Mode")

### Blank Screen After OAuth

**Problem:** The OAuthCallback component isn't rendering or has an error

**Solutions:**
1. Check browser console for React errors
2. Verify pending OAuth session is stored in KV
3. Try clearing browser cache and cookies
4. Check that the code parameter is in the URL

### Token Exchange Fails

**Problem:** The authorization code is invalid or expired

**Solutions:**
1. Ensure code is decoded properly (`:` not `%3A`)
2. Check that the same redirect URI is used in both requests
3. Verify credentials are correct
4. Try generating a new code (restart OAuth flow)

## Integration with Application

The OAuth callback component (`OAuthCallback.tsx`) automatically:

1. Detects OAuth redirect (code in URL)
2. Retrieves pending OAuth session from KV store
3. Decodes the authorization code if needed
4. Exchanges code for tokens
5. Logs into Bullhorn REST API
6. Creates session with refresh token
7. Cleans up pending OAuth data
8. Calls `onAuthenticated` callback
9. Updates UI state

All of this happens automatically without user interaction!

## Security Considerations

✅ **Credentials stored securely in KV store**
- Not in localStorage or sessionStorage
- Not exposed in URLs or logs
- Encrypted at rest

✅ **OAuth session timeout**
- 10-minute expiration prevents replay attacks
- Cleaned up after use

✅ **Token refresh**
- Automatic refresh before expiration
- Uses refresh token (not password)
- Falls back to re-authentication if refresh fails

✅ **Error handling**
- No sensitive data in error messages
- Graceful degradation
- Clear user feedback

## Next Steps

After tests pass:

1. ✅ Test with real Bullhorn credentials
2. ✅ Verify token refresh works automatically
3. ✅ Test multiple tenant connections
4. ✅ Test connection switching
5. ✅ Verify audit logging of auth events
6. ✅ Test session persistence across page reloads
7. ✅ Validate error handling with invalid credentials

## Success Criteria

The OAuth flow is working correctly when:

- ✅ All automated tests pass
- ✅ Manual OAuth flow completes without errors
- ✅ Session persists across page reloads
- ✅ Token refreshes automatically before expiration
- ✅ Connection switching works seamlessly
- ✅ No blank screens or console errors
- ✅ Audit logs show authentication events
- ✅ Multiple connections can be saved and used
