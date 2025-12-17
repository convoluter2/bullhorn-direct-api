# OAuth Debugging Guide

## Issue: Popup Just Loads / Stuck in Processing State

This document explains how to diagnose and fix OAuth authentication issues in the Bullhorn Data Manager.

## Quick Fix Steps

1. **Navigate to OAuth Test Tab**
   - Connect to your app
   - Click on the "OAuth Test" tab (test tube icon)
   - This tab now has THREE debugging tools

2. **Use the Console Monitor (Top)**
   - Shows ALL console logs in real-time
   - Look for errors marked in RED
   - Look for warnings marked in YELLOW
   - Logs prefixed with ❌ indicate failures
   - Logs prefixed with ✅ indicate success
   - Use "Copy" button to share logs with support

3. **Run OAuth Diagnostics (Middle)**
   - Click "Run Diagnostics"
   - Tests 7 different aspects of OAuth:
     1. Saved connections existence
     2. Finding Fastaff credentials
     3. Credential validation
     4. OAuth URL generation
     5. Popup support
     6. KV storage
     7. Programmatic authentication
   - Each test shows success/error/warning status
   - Expand "View details" to see technical information
   - Use "Copy Logs" to share diagnostic results

4. **Check Automated OAuth Test Suite (Bottom)**
   - Click "Run Test" to test with Fastaff credentials
   - Shows step-by-step progress
   - Identifies exactly where the flow fails

## Common Issues and Solutions

### Issue 1: "Popup blocked"
**Symptom:** Error message about popups being blocked
**Solution:** 
- Enable popups in your browser for this site
- In Chrome: Click the icon in address bar and allow popups
- In Firefox: Click "Preferences" in address bar and allow popups

### Issue 2: "No authorization code received"
**Symptom:** Popup opens, loads Bullhorn, but then fails
**Solution:**
- Check Console Monitor for detailed error messages
- Look for OAuth errors in the URL parameters
- Verify credentials are correct (Client ID, Secret, Username, Password)

### Issue 3: "Popup just sits there"
**Symptom:** Popup opens but nothing happens, stays on loading screen
**Possible Causes:**
1. **Cross-origin issues** - Check Console Monitor for CORS errors
2. **Polling not detecting welcome page** - Look for polling logs in Console Monitor
3. **Welcome page never loads** - Could indicate network issues or incorrect credentials

**Debugging Steps:**
1. Open Console Monitor BEFORE starting OAuth
2. Click "Start Popup OAuth Flow"
3. Watch the Console Monitor for:
   - "🚀 STARTING OAUTH FLOW" - Flow initiated
   - "🪟 Opening popup window..." - Popup created
   - "✅ Popup opened successfully" - Popup ready
   - "[Poll X/360] Current URL: ..." - Polling working
   - "✅ WELCOME PAGE DETECTED" - Welcome page reached
   - "✅ CODE EXTRACTED" - Authorization code found
   - "✅ CODE EXCHANGE COMPLETE" - Success!

4. If you see errors at any step, that's where the problem is

### Issue 4: "Invalid redirect URI"
**Symptom:** Bullhorn error page showing "Invalid Redirect URI"
**Solution:**
- This app uses NO redirect URI
- If you see this error, your OAuth client configuration in Bullhorn may be wrong
- Contact Bullhorn support to remove redirect URI requirement from your OAuth client

### Issue 5: "Failed to exchange code for token"
**Symptom:** Code is extracted but token exchange fails
**Possible Causes:**
1. Code expired (they expire in 10 minutes)
2. Client Secret is incorrect
3. Code was already used

**Solution:**
- Run OAuth Diagnostics to verify credentials
- Try authentication again (generates new code)
- Double-check Client Secret matches Bullhorn configuration

## Enhanced Logging

The updated code now includes comprehensive logging at every step:

### AuthDialog.tsx Logs:
- 🚀 Flow initiation
- 💾 KV storage operations
- 🔗 URL generation
- 🪟 Popup operations
- [Poll X/Y] Polling status
- ✅ Success indicators
- ❌ Error indicators

### OAuthCallback.tsx Logs:
- OAuth Callback detection
- Code decoding
- Token exchange
- Session establishment

### bullhorn-api.ts Logs:
- API call details
- Response status
- Error messages

## Testing Workflow

### Before Testing:
1. Save a connection with valid credentials
2. Open OAuth Test tab
3. Have Console Monitor visible

### During Testing:
1. Start Console Monitor (auto-starts)
2. Run OAuth Diagnostics first
3. If diagnostics pass, try actual OAuth in main UI
4. Watch Console Monitor for real-time feedback

### After Testing:
1. Copy logs from Console Monitor
2. Copy diagnostic results
3. Share with support if issues persist

## Support Information

If you continue to experience issues:

1. **Capture Evidence:**
   - Copy Console Monitor logs
   - Copy Diagnostic results
   - Take screenshot of error
   - Note exact steps to reproduce

2. **Check These:**
   - Browser: Chrome/Firefox/Safari version
   - Popup blocker status
   - Network connectivity
   - Bullhorn instance (Fastaff, USN, etc.)
   - Environment (NPE vs PROD)

3. **Share Information:**
   - All copied logs
   - Browser and version
   - Connection name being tested
   - Exact error message

## Technical Details

### OAuth Flow:
1. User clicks "Start Popup OAuth Flow"
2. App generates OAuth URL with username/password
3. Popup opens to Bullhorn authorization page
4. Bullhorn auto-logs user in (credentials in URL)
5. Bullhorn redirects to welcome.bullhornstaffing.com with code
6. App polls popup URL every 500ms
7. App detects welcome page and extracts code
8. App closes popup
9. App exchanges code for access token
10. App uses token to login to REST API
11. Session established

### Key Code Locations:
- **AuthDialog.tsx**: Lines 124-273 (handleStartOAuthFlow)
- **AuthDialog.tsx**: Lines 275-333 (handleCodeExchange)
- **OAuthCallback.tsx**: Lines 25-209 (handleAutoAuthenticate)
- **bullhorn-api.ts**: Lines 11-73 (OAuth methods)

### Polling Details:
- Interval: 500ms (twice per second)
- Max attempts: 360 (3 minutes total)
- Timeout: 180 seconds (3 minutes)
- Detection: Looks for "welcome.bullhornstaffing.com" in URL
- Code extraction: Parses URL parameters
- Auto-decode: Handles URL-encoded colons (%3A)

## Advanced Troubleshooting

### Enable Browser Developer Console:
1. Press F12 (Windows) or Cmd+Option+I (Mac)
2. Click "Console" tab
3. Keep open while testing OAuth
4. Look for red errors
5. Errors starting with "❌" are from our app

### Check Network Tab:
1. Open Developer Console (F12)
2. Click "Network" tab
3. Start OAuth flow
4. Look for failed requests (red)
5. Check request/response details

### Verify Popup Can Access Parent:
- Modern browsers restrict cross-origin popup communication
- App uses polling instead of postMessage
- Polling only works when popup is same-origin as app
- Welcome page is external, so code must be extracted from URL

## Success Indicators

You'll know OAuth is working when you see:
- ✅ Console logs without ❌ errors
- Toast notification: "Successfully authenticated with Bullhorn"
- Connection status changes to "Connected"
- Tabs become available (QueryBlast, CSV Loader, etc.)
- Session token visible in browser tools

## Last Resort

If nothing works:
1. Clear browser cache and cookies
2. Close all browser windows
3. Reopen app
4. Try different browser
5. Try incognito/private mode
6. Contact Bullhorn support to verify OAuth client configuration
