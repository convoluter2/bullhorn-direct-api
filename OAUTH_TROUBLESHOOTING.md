# Bullhorn OAuth Troubleshooting Guide

## Common Issue: HTTP 404 Error in OAuth Popup

### Symptoms
When you click "Open in Popup" for OAuth authentication, you see:
```
HTTP Status 404 - 
type Status report

message

description The requested resource is not available.

Apache Tomcat/7.0.76
```

Or the URL shows something like:
```
https://auth-east.bullhornstaffing.com/oauth/welcome.bullhornstaffing.com?code=...
```

### Root Cause
**Browser cookie caching** - Bullhorn's OAuth service caches your previous login session via browser cookies. When you try to authenticate with a different connection/tenant, these cached cookies cause Bullhorn to:
1. Return an authorization code for the **wrong tenant** (the previously cached one)
2. Redirect to a malformed URL that results in a 404 error
3. Authenticate you to the wrong corporation entirely

### Why This is a Security/Data Concern
If you're trying to connect to **Tenant A** but browser cookies are cached from **Tenant B**, you could:
- See data from the wrong corporation
- Make changes to the wrong tenant
- Violate data access policies

This is why the app includes tenant validation and client_id mismatch detection.

## Solutions

### Solution 1: Use Incognito/Private Mode (RECOMMENDED)
This is the **fastest and most reliable** solution:

1. In the auth dialog, click **"Copy for Incognito"**
2. Open an **Incognito/Private window** in your browser:
   - Chrome: Ctrl+Shift+N (Windows) or Cmd+Shift+N (Mac)
   - Firefox: Ctrl+Shift+P (Windows) or Cmd+Shift+P (Mac)
   - Safari: File → New Private Window
3. Paste the OAuth URL into the address bar
4. Log in to Bullhorn (or it may auto-login)
5. Wait for redirect to `https://welcome.bullhornstaffing.com/?code=...`
6. Copy the **entire URL** from the address bar
7. Go back to the main window and paste it in "Authorization Code or URL"
8. Click "Connect with Code"

**Why this works**: Incognito mode has no cookies, so Bullhorn can't use cached credentials.

### Solution 2: Clear Bullhorn Cookies
If you prefer to stay in your main browser:

1. Click **"Clear Cookies & Cache"** button in the app header
2. Select **"Clear Bullhorn Cookies & Sessions"**
3. Wait for confirmation
4. Now click "Open in Popup" again
5. Log in and copy the URL as normal

**Why this works**: Removes the conflicting cached cookies.

### Solution 3: Use a Different Browser
If you've been using Safari and it has cached credentials:
- Try Chrome, Firefox, or Edge instead
- The new browser won't have the cached Bullhorn cookies

### Solution 4: Manual Cookie Clearing (Browser Settings)
If the app's cookie clearer doesn't work:

**Chrome:**
1. Go to Settings → Privacy and Security → Cookies and other site data
2. Click "See all site data and permissions"
3. Search for "bullhornstaffing.com"
4. Click the trash icon next to each bullhorn domain
5. Specifically clear cookies for:
   - `.bullhornstaffing.com`
   - `auth-east.bullhornstaffing.com`
   - `auth-west.bullhornstaffing.com`
   - `auth-west9.bullhornstaffing.com`
   - `welcome.bullhornstaffing.com`

**Firefox:**
1. Go to Settings → Privacy & Security → Cookies and Site Data
2. Click "Manage Data"
3. Search for "bullhornstaffing"
4. Remove all related entries

**Safari:**
1. Safari → Preferences → Privacy → Manage Website Data
2. Search for "bullhornstaffing"
3. Remove all entries

## Understanding the OAuth Flow

### Normal Flow (What SHOULD Happen)
1. User clicks "Open in Popup"
2. Popup opens: `https://auth-{region}.bullhornstaffing.com/oauth/authorize?client_id=...&username=...&password=...`
3. Bullhorn authenticates (or uses existing session)
4. Bullhorn redirects to: `https://welcome.bullhornstaffing.com/?code={CODE}&client_id={CLIENT_ID}`
5. User sees "Welcome to Bullhorn - Thank you for using Bullhorn"
6. User copies the entire URL
7. User pastes it in the app
8. App extracts the `code` parameter and decodes it (converts `%3A` to `:`)
9. App exchanges code for access token
10. App logs in to REST API
11. App validates the session matches the expected tenant

### What Happens with Cached Cookies
1. User clicks "Open in Popup" for **Connection A** (e.g., Fastaff Prod)
2. Popup opens with correct URL for Connection A
3. **BUT**: Browser sends cached cookies from **Connection B** (e.g., Trustaff NPE)
4. Bullhorn OAuth sees the cached session and returns a code for **Connection B**
5. The redirect URL is malformed or the code belongs to the wrong client_id
6. Result: 404 error OR authentication to wrong tenant

## How the App Protects You

The app includes multiple safety checks:

1. **Client ID Mismatch Detection**: If the `code` URL contains a different `client_id` than expected, the app shows an error and refuses to proceed

2. **Tenant Validation**: After authentication, the app compares the session's `restUrl` tenant with the expected tenant from the saved connection

3. **Session Debugging**: The "Session Debug Panel" shows the current corporation ID, tenant, and REST URL so you can verify you're connected to the right instance

4. **Connection Switching Validation**: When switching connections, the app clears the session, waits 100ms, then authenticates fresh to avoid cookie conflicts

## Cache-Busting Techniques Used

The app tries to prevent cookie caching by:

1. **Adding cache-busting parameters**: `_t={timestamp}`, `_r={random}`, `prompt=login`, `max_age=0`
2. **Unique window names**: Each popup has a unique name to prevent window reuse
3. **No redirect_uri**: We don't send a redirect_uri to avoid Bullhorn's redirect caching
4. **Region-specific URLs**: Fetches `loginInfo` to use the correct auth region (east vs west)

However, **browser cookies bypass all of these** because the cookies are sent by the browser automatically before the request reaches Bullhorn.

## Best Practices

### For Multiple Connections
1. **Always use Incognito** when switching between different Bullhorn instances
2. **Clear cookies** after each session if staying in the main browser
3. **Label connections clearly** with tenant names (e.g., "Fastaff Prod - 25184" vs "Trustaff NPE - 22090")
4. **Verify the Session Debug Panel** after connecting to confirm correct tenant

### For Developers/Admins
1. **Different browsers** for different tenants (e.g., Chrome for Prod, Firefox for NPE)
2. **Browser profiles** - Create separate Chrome profiles for each major tenant
3. **Never reuse codes** - OAuth codes expire after ~60 seconds and are single-use only

## Technical Details

### Why We Can't Fully Automate This
The OAuth popup **must** run in the user's browser (not headless) because:
1. Bullhorn requires user interaction for security compliance
2. Cross-origin restrictions prevent reading the popup URL programmatically
3. The `welcome.bullhornstaffing.com` domain is separate from our app domain
4. Modern browsers block cross-origin iframe/popup URL reading (CORS policy)

### Why Redirect URI Causes Issues
When we include a `redirect_uri` parameter:
- Bullhorn caches the redirect per client_id
- Browser cookies compound this caching
- Result: Even more redirect conflicts and 404 errors

By **omitting** the redirect_uri, we rely on Bullhorn's default (`welcome.bullhornstaffing.com`), which is more reliable.

### The Tomcat 404 Error Explained
The specific error you see:
```
HTTP Status 404 -
Apache Tomcat/7.0.76
```

This is Bullhorn's auth server (running on Tomcat) returning a 404 because:
- The redirect URL is malformed (e.g., `auth-east.../oauth/welcome.bullhorn...`)
- OR the cached session is invalid/expired
- OR there's a client_id mismatch and Bullhorn rejects the request

## Still Having Issues?

If none of the above solutions work:

1. **Check the Console Logs**:
   - Open browser DevTools (F12)
   - Look for errors in the Console tab
   - Copy any errors and share them with support

2. **Verify Credentials**:
   - Ensure Client ID, Client Secret, Username, and Password are correct
   - Test the credentials manually in Postman or via direct API calls

3. **Contact Bullhorn Support**:
   - If a specific client_id always fails, the OAuth app may need to be reconfigured
   - Bullhorn can reset OAuth apps on their end

4. **Use the "Clear Everything" Option**:
   - Last resort: Clear all app data and reconnect
   - This removes all saved connections and logs
   - Only use if directed by support

## Frequently Asked Questions

**Q: Why don't other OAuth apps have this issue?**  
A: Most OAuth apps use a fixed redirect_uri on their own domain, so they can programmatically capture the code. We can't do this in a browser-based app without a backend server to receive the redirect.

**Q: Can we add a backend proxy to handle OAuth?**  
A: Yes, and we have one (`oauth-proxy.ts`), but it requires a server to be running. For the default setup, we use the manual flow to avoid server dependencies.

**Q: Why does Incognito always work?**  
A: Incognito mode doesn't share cookies with your normal browsing session, so there's no cached Bullhorn login to conflict with.

**Q: Will this be fixed in the future?**  
A: We're exploring server-side OAuth handling, but for now, the manual flow with Incognito mode is the most reliable approach for multi-tenant environments.

---

**Last Updated**: January 2025
