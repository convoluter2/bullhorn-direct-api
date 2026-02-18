# Platform 429 Error Guide

## What is the 429 Error?

When you see this error accessing the deployed Spark app:

```
Failed to load resource: the server responded with a status of 429 ()
GET https://bullhorn-direct-api--convoluter2.github.app/ 429 (Too Many Requests)
```

This is a **hosting platform rate limit**, NOT a Bullhorn API rate limit or an issue with your application code.

## Why Does This Happen?

The GitHub/Spark hosting infrastructure has rate limits on how many requests can be made to access the application URL itself. This can be triggered by:

1. **Multiple rapid refreshes** - Repeatedly refreshing the page in quick succession
2. **Multiple browser tabs** - Opening the same app URL in many tabs simultaneously
3. **Browser extensions** - Extensions that automatically refresh or poll the page
4. **Development tools** - Auto-reload features in browser dev tools
5. **Platform load** - High traffic across all Spark apps on the platform
6. **Cached failures** - Browser caching a failed state and retrying repeatedly

## This is NOT Fixable in Code

This is important to understand: **the 429 error from the platform cannot be fixed by changing application code**. It's a platform infrastructure limitation enforced at the network/hosting layer, before your application even loads.

## Solutions

### For Users

#### Solution 1: Wait and Retry (Recommended)
1. **Wait 60-120 seconds** before attempting to access the app again
2. Do not spam refresh - this makes it worse
3. Close other tabs with the same app URL open
4. Refresh once after waiting

#### Solution 2: Clear Browser State
1. Open browser settings
2. Clear browsing data for the last hour:
   - Cached images and files
   - Cookies and site data for `*.github.app`
3. Close all tabs with the app
4. Wait 30 seconds
5. Open the app in a single new tab

#### Solution 3: Incognito/Private Mode
1. Open a new incognito/private browser window
2. Navigate to the app URL
3. Incognito mode bypasses cached state and some extensions

#### Solution 4: Different Browser
1. Try accessing the app in a completely different browser
2. This eliminates browser-specific caching or extension issues

### For Developers

#### Prevention
1. **During development**: Use the local dev server, not the deployed URL
2. **When testing**: Avoid rapid refreshes; wait between tests
3. **Share the app**: Warn users not to spam refresh if it's slow to load
4. **Optimize initialization**: Minimize requests made during app startup

#### What We've Implemented
1. **Enhanced error handling** in `ErrorFallback.tsx` to detect and explain platform 429 errors
2. **Pre-load detection** in `index.html` to catch 429s before React loads
3. **User guidance** with clear instructions on what to do
4. **Automatic retry suggestions** with recommended wait times

## Technical Details

### How the Platform Rate Limit Works

```
User Browser → GitHub/Spark Edge Network → Rate Limiter → Your App
                                              ↑
                                        429 if exceeded
```

The rate limiter operates at the edge network level, tracking:
- Requests per IP address
- Requests per session
- Requests per app URL
- Overall platform load

When thresholds are exceeded, it returns a 429 status before your application code even executes.

### Why Code Can't Fix This

Your application code runs **after** the platform serves the HTML. The 429 happens **before** that:

1. Browser requests `https://your-app.github.app/`
2. Request hits GitHub/Spark edge network
3. Rate limiter checks request against thresholds
4. **If exceeded**: Returns 429, never serves HTML
5. **If within limits**: Serves HTML, loads your app

### What We Can Control

We can only provide better user experience when the error occurs:
- Clear error messages explaining it's a platform issue
- Guidance on how to resolve it
- Automatic retry with appropriate wait times
- Detection of the error state early

## Monitoring & Reporting

### If This Happens Frequently

If you're experiencing 429 errors repeatedly (multiple times per day):

1. **Contact GitHub/Spark Support** - This may indicate:
   - Your app needs to be moved to higher-tier infrastructure
   - Platform-wide rate limit issues
   - Configuration problems with your deployment

2. **Check your usage patterns**:
   - How many users are accessing concurrently?
   - Are there automated tools/bots hitting your URL?
   - Are browser extensions causing excessive requests?

3. **Review application initialization**:
   - Does your app make many API calls on load?
   - Could initialization be optimized or deferred?

### What to Report

When reporting to support, include:
- The exact URL receiving 429 errors
- Time and frequency of errors
- Number of concurrent users (if known)
- Whether it happens to all users or specific ones
- Browser and network details

## Summary

**Key Takeaways:**
- ✅ 429 from the app URL is a **platform rate limit**
- ✅ This is **not fixable in application code**
- ✅ Wait 60-120 seconds and try again
- ✅ Clear browser cache/cookies if persistent
- ✅ Use incognito mode or different browser as workaround
- ❌ Do NOT repeatedly refresh - this makes it worse
- ❌ Do NOT open many tabs with the same URL simultaneously

**For Development:**
- Use local dev server (`npm run dev`) instead of deployed URL
- Optimize app initialization to minimize startup requests
- Implement proper error boundaries to handle platform errors gracefully

## Updated Error Handling

We've implemented two layers of 429 detection:

### 1. Pre-React Detection (index.html)
A lightweight detection layer that shows a styled error page if the platform returns 429, before React even loads.

### 2. React Error Boundary (ErrorFallback.tsx)
Enhanced error boundary that detects platform 429s and provides:
- Clear explanation that it's a platform issue
- Step-by-step solutions
- Recommended wait times
- Refresh and retry buttons

Both work together to provide the best possible user experience when platform rate limits are hit.
