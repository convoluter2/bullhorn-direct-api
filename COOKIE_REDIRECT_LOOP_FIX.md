# Cookie/Redirect Loop Troubleshooting Guide

## Problem: ERR_TOO_MANY_REDIRECTS

When attempting to authenticate with Bullhorn via OAuth, you may encounter an error:

```
This page isn't working
auth-west9.bullhornstaffing.com redirected you too many times.

Try deleting your cookies.
ERR_TOO_MANY_REDIRECTS
```

### Why This Happens

This error occurs when your browser has **existing Bullhorn session cookies** from previous logins. When the OAuth flow starts, Bullhorn's server sees these cookies and tries to automatically redirect to complete the authentication, but because the session state is stale or incompatible with the new OAuth request, it creates an infinite redirect loop.

**Key observation:** The same URL works fine in **Incognito mode** because incognito starts with a clean slate (no cookies).

## Solutions

### ✅ Solution 1: Use Incognito/Private Mode (Recommended)

**Easiest and fastest solution:**

1. Open an **Incognito window** (Chrome/Edge) or **Private window** (Firefox/Safari)
2. Navigate to your app
3. Complete the OAuth authentication
4. The connection will work because there are no old cookies

**Keyboard shortcuts:**
- Chrome/Edge: `Ctrl+Shift+N` (Windows) or `Cmd+Shift+N` (Mac)
- Firefox: `Ctrl+Shift+P` (Windows) or `Cmd+Shift+P` (Mac)
- Safari: `Cmd+Shift+N` (Mac)

### ✅ Solution 2: Clear Bullhorn Cookies

If you prefer to use your regular browser session:

#### Chrome/Edge
1. Open DevTools (`F12` or `Ctrl+Shift+I`)
2. Go to **Application** tab
3. Expand **Cookies** in the left sidebar
4. Find and delete cookies for:
   - `auth-east.bullhornstaffing.com`
   - `auth-west.bullhornstaffing.com`
   - `auth-west9.bullhornstaffing.com`
   - `welcome.bullhornstaffing.com`
   - Any other `*.bullhornstaffing.com` domains
5. Refresh the page and try again

#### Firefox
1. Open DevTools (`F12`)
2. Go to **Storage** tab
3. Expand **Cookies**
4. Delete all `bullhornstaffing.com` cookies
5. Refresh and retry

#### Alternative: Clear All Site Data
1. Navigate to `https://auth-east.bullhornstaffing.com` (or whichever region you use)
2. Click the lock icon 🔒 in the address bar
3. Click "Cookies" or "Site settings"
4. Click "Clear data" or "Remove"
5. Try the OAuth flow again

### ✅ Solution 3: Use Proxy-Based OAuth (Built-in)

Our app includes a **Proxy-Based OAuth** option that helps work around cookie issues:

1. In the auth dialog, look for the **"Try Proxy-Based OAuth (Beta)"** button
2. Click it instead of the standard popup OAuth
3. This uses a different flow that's less susceptible to cookie conflicts

### ✅ Solution 4: Cache-Busting Parameters (Automatic)

The app now automatically adds cache-busting parameters to the OAuth URL:
- Timestamp parameter (`_t`)
- Unique state value with timestamp

These help prevent cookie-based loops, but may not work in all cases.

## Technical Details

### Why Incognito Works

Incognito mode works because:
- No existing cookies are sent with requests
- Bullhorn server sees a "fresh" authentication attempt
- No conflicting session state
- Clean OAuth flow from start to finish

### Why Regular Browser Fails

Regular browsers fail because:
- Old session cookies from previous Bullhorn logins are still present
- OAuth server tries to use existing session
- Session state conflicts with new OAuth parameters
- Redirect loop: Auth → Session → Auth → Session → ...

### The OAuth Cookie Chain

When you log in to Bullhorn:
1. Bullhorn sets session cookies (`.bullhornstaffing.com`)
2. These cookies track your authenticated session
3. When OAuth starts, server checks for existing session
4. If session exists but is incompatible with OAuth request → redirect loop
5. Server keeps trying to reconcile the mismatch → infinite redirects

## Prevention

To avoid this issue in the future:

1. **Always use Incognito** for OAuth testing/development
2. **Clear cookies** between different OAuth app testing
3. **Don't mix** regular Bullhorn web UI logins with OAuth API logins in the same browser session
4. **Use dedicated browser profiles** for different Bullhorn environments (PROD vs NPE)

## App Improvements (Implemented)

We've added the following to help users:

1. ✅ **Cache-busting timestamp** in OAuth URLs
2. ✅ **Unique state values** to prevent session reuse
3. ✅ **Incognito mode detection** with proactive warnings
4. ✅ **Cookie help alert** in the auth dialog with clearing instructions
5. ✅ **Proxy-based OAuth** alternative method
6. ✅ **Clear error messaging** when redirect loops are detected
7. ✅ **Help link** to cookie clearing guides
8. ✅ **Keyboard shortcuts** for opening incognito windows

## Still Having Issues?

If you've tried all the above and still see redirect loops:

1. **Check your Bullhorn OAuth app configuration** - ensure redirect URIs are correct
2. **Try a different browser** - sometimes browser extensions interfere
3. **Check browser console** for specific error messages
4. **Contact Bullhorn support** - there may be account-level restrictions
5. **Use manual code entry** - disable automated OAuth and manually paste the code

## Quick Reference

| Problem | Solution |
|---------|----------|
| ERR_TOO_MANY_REDIRECTS | Use Incognito mode OR clear Bullhorn cookies |
| Works in Incognito but not regular browser | Old cookies causing conflict - clear them |
| Popup hangs on login page | Credentials incorrect OR timeout - check username/password |
| "Invalid redirect URI" | OAuth app misconfiguration - check with Bullhorn |
| Code expires too quickly | Use automated flow OR copy code immediately |

---

**Remember:** When in doubt, use **Incognito mode** - it's the quickest and most reliable solution!
