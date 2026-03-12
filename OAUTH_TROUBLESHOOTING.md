# OAuth Troubleshooting Guide

## Common OAuth Issues and Solutions

### Issue 1: HTTP 404 Error - "Welcome to Bullhorn" Page Not Found

**Symptom:**
After logging in through the OAuth popup, you see:
```
HTTP Status 404 - 
type Status report
message
description The requested resource is not available.
Apache Tomcat/7.0.76
```

**Root Cause:**
Browser cookies are cached from a previous Bullhorn login session. When you authenticate to a different tenant/connection, Bullhorn's OAuth service uses the cached session cookies and returns an authorization code that belongs to the wrong tenant or creates a malformed redirect URL.

**Solutions (in order of preference):**

1. **Use Incognito/Private Mode** ✅ Most Reliable
   - Click "Copy for Incognito" in the auth dialog
   - Open a new incognito/private window (Ctrl+Shift+N on Windows/Linux, Cmd+Shift+N on Mac)
   - Paste the URL and press Enter
   - Complete the login
   - Copy the entire URL from the address bar
   - Paste it back into the main window's "Authorization Code or URL" field

2. **Clear Bullhorn Cookies**
   - Open browser developer tools (F12)
   - Go to Application/Storage tab
   - Expand "Cookies"
   - Delete all cookies for:
     - `bullhornstaffing.com`
     - `auth-east.bullhornstaffing.com`
     - `auth-west.bullhornstaffing.com`
     - `welcome.bullhornstaffing.com`
   - Try authenticating again

3. **Use a Different Browser**
   - If Safari has cached credentials, try Chrome or Firefox
   - If Chrome has cached credentials, try Safari or Firefox

---

### Issue 2: Malformed Redirect URL (HCS NPE Specific)

**Symptom:**
The OAuth redirect URL looks like this:
```
https://auth-east.bullhornstaffing.com/oauth/welcome.bullhornstaffing.com?code=2749_6613561_40%3A7b1d4552-29b9-477f-8fdc-e2e2e5d15c0d&client_id=...
```

Instead of the correct format:
```
https://welcome.bullhornstaffing.com/?code=2749_6613561_40%3A7b1d4552-29b9-477f-8fdc-e2e2e5d15c0d&client_id=...
```

**Root Cause:**
This is a Bullhorn OAuth configuration issue where the `redirect_uri` is not properly configured for this specific tenant. The OAuth service is incorrectly appending `/oauth/` to the welcome page URL.

**Solutions:**

1. **Manual Code Extraction** (Immediate Workaround)
   - The app will automatically detect this malformed URL
   - If you paste the full malformed URL, the app will extract the code parameter
   - Alternatively, you can manually copy just the code value:
     - Look for `code=` in the URL
     - Copy everything after `code=` up to the next `&` (or end of URL)
     - Paste just that code value into the "Authorization Code or URL" field
   - Example:
     ```
     From: https://auth-east.bullhornstaffing.com/oauth/welcome.bullhornstaffing.com?code=2749_6613561_40%3A7b1d4552...&client_id=...
     Copy: 2749_6613561_40%3A7b1d4552... (or the decoded version: 2749_6613561_40:7b1d4552...)
     ```

2. **Contact Bullhorn Support** (Permanent Fix)
   - This is an OAuth configuration issue on Bullhorn's side
   - Contact Bullhorn support and provide:
     - The malformed URL you're seeing
     - Your client_id
     - Your username
     - Request that they fix the OAuth redirect_uri configuration for your tenant

---

### Issue 3: "Wrong client_id" or Client ID Mismatch

**Symptom:**
Error message: "Wrong Connection! This code is for a different tenant (client_id mismatch)"

**Root Cause:**
Browser cookies are causing Bullhorn to return an authorization code for a different tenant than the one you're trying to authenticate to.

**Solution:**
1. Clear all Bullhorn cookies (see Issue 1, Solution 2)
2. Use Incognito mode (see Issue 1, Solution 1)
3. Ensure you're using the correct credentials for the connection you selected

---

### Issue 4: Authorization Code Expired

**Symptom:**
Error message: "Authorization code expired or already used"

**Root Cause:**
OAuth authorization codes expire 60 seconds after generation. If you wait too long between getting the code and pasting it, it will expire.

**Solution:**
1. Complete the OAuth flow quickly (within 60 seconds)
2. Have the authentication dialog ready before opening the OAuth popup
3. Copy the URL immediately after seeing the "Welcome to Bullhorn" page
4. If the code expires, get a new one by clicking "Open in Popup" again

---

### Issue 5: CORS Errors

**Symptom:**
Console errors about CORS (Cross-Origin Resource Sharing) when trying to authenticate

**Root Cause:**
Browser security restrictions prevent direct API calls to Bullhorn OAuth endpoints from the browser.

**Solution:**
The app automatically uses a CORS proxy when direct requests fail. No action needed from users. If you continue to see CORS errors, ensure:
1. You're using a modern browser (Chrome, Firefox, Safari, Edge)
2. You don't have browser extensions blocking requests
3. Your network/firewall isn't blocking the proxy service

---

## Technical Details

### OAuth Flow Overview

1. User enters credentials (client_id, client_secret, username, password)
2. App generates authorization URL with cache-busting parameters
3. User opens URL in popup or new window
4. User logs in to Bullhorn
5. Bullhorn redirects to welcome page with authorization code
6. User copies the URL from the welcome page
7. App extracts and decodes the authorization code
8. App exchanges code for access token
9. App uses access token to get REST session

### Why Browser Cookies Cause Issues

Bullhorn's OAuth service uses browser cookies to remember logged-in sessions. These cookies are domain-scoped to `*.bullhornstaffing.com`, which means:

- All Bullhorn tenants share the same cookie domain
- When you log in to one tenant, the cookies persist
- When you try to log in to a different tenant, the old cookies may interfere
- The OAuth service may return a code for the wrong tenant based on cached cookies

### Cache-Busting Parameters

The app includes these parameters in the OAuth URL to try to prevent cookie caching:
- `_t` - Current timestamp
- `_r` - Random string
- `prompt=login` - Force login prompt
- `max_age=0` - Don't use cached authentication

However, these don't always prevent cookie-based issues, which is why Incognito mode is the most reliable solution.

---

## Quick Reference

| Error | Solution |
|-------|----------|
| HTTP 404 on welcome page | Use Incognito mode or clear cookies |
| Malformed URL (`/oauth/welcome.bullhornstaffing.com`) | Manually extract code or paste full URL (app will auto-extract) |
| Client ID mismatch | Clear cookies and try again |
| Code expired | Get new code within 60 seconds |
| CORS error | App auto-retries with proxy; ensure browser is up-to-date |

---

## Still Having Issues?

1. Check the browser console (F12) for detailed error messages
2. Look for logs starting with 🚨, ❌, or ⚠️
3. Copy the full error message and provide it to your administrator
4. Include the connection name and tenant you're trying to access
5. Note whether you're using the standard flow or Incognito mode
