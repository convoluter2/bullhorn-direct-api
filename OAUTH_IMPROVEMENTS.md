# OAuth Authentication Improvements

## Summary of Changes

### 1. Enhanced Manual Flow - URL-based Code Input
**Problem:** Users had to manually extract and decode the authorization code from URLs
**Solution:** 
- Manual code input field now accepts **full URLs** or just the code
- Automatic extraction of `code` parameter from URL
- Automatic decoding of URL-encoded characters (`:` appears as `%3A` in URLs)
- Smart parsing handles both formats seamlessly

**Example Usage:**
```
User can paste:
- Full URL: https://welcome.bullhornstaffing.com/?code=25184_8090191_44%3A0e19f0db...
- Just code: 25184_8090191_44:0e19f0db...
- URL-encoded: 25184_8090191_44%3A0e19f0db...

All formats are automatically handled and decoded correctly.
```

### 2. Manual Auth URL Opens as Popup
**Problem:** Manual auth URL opened in new tab, making it harder to copy the result
**Solution:**
- "Open Authorization Popup" button now opens centered popup window (600x700px)
- Consistent with automated flow UX
- Easier to copy URL from popup address bar
- Toast notification guides user to copy the code

### 3. Iframe-Based Authentication (Experimental)
**Problem:** Popup blockers can interfere with automated OAuth flow
**Solution:**
- Added experimental iframe-based authentication option
- Loads OAuth flow within dialog instead of popup
- Monitors iframe URL for redirect with authorization code
- Automatic code extraction when redirect occurs

**Limitations:**
- May not work if Bullhorn blocks iframe embedding (X-Frame-Options)
- Cross-origin restrictions can prevent URL access
- Falls back gracefully with error messages
- Popup method is still recommended as primary approach

**Access:**
- Available via "Try Iframe Method (Experimental)" button
- Only shown in automated flow mode
- Clear messaging about experimental nature

### 4. Improved Code Extraction Logic
**Function:** `extractCodeFromUrl(input: string)`
- Checks if input contains `code=` parameter
- Extracts code from URL query parameters
- Decodes URL-encoded characters (`%3A` → `:`, `%2F` → `/`)
- Returns clean code ready for token exchange
- Handles edge cases and errors gracefully

### 5. Better User Guidance
- Clear descriptions of what each authentication method does
- Pro tips for manual flow (paste full URL)
- Popup vs iframe trade-offs explained
- Status messages during authentication process

## Technical Implementation

### New Component: OAuthIframe
**Location:** `src/components/OAuthIframe.tsx`
**Purpose:** Embed OAuth flow in iframe with monitoring
**Features:**
- Loads auth URL in sandboxed iframe
- Polls iframe URL every 500ms for redirect
- Extracts code when callback URL detected
- 3-minute timeout with graceful failure
- Error handling for blocked embeds

### Updated Component: AuthDialog
**Location:** `src/components/AuthDialog.tsx`
**Changes:**
- Added `showIframe` state for iframe mode
- Added `extractCodeFromUrl()` helper function
- Updated `handleCodeSubmit()` to use extraction logic
- Updated `handleOpenAuthUrl()` to open popup instead of tab
- Added iframe handlers: `handleStartIframeFlow()`, `handleIframeCodeReceived()`, `handleIframeError()`, `handleIframeCancel()`
- Enhanced UI with iframe option button
- Better messaging and tooltips

## Testing Recommendations

### Test Manual Flow
1. Open auth dialog in manual mode (disable automated flow)
2. Click "Open Authorization Popup"
3. Log in to Bullhorn in popup
4. Copy **full URL** from popup address bar after redirect
5. Paste into "Authorization Code or URL" field
6. Verify code is extracted and decoded automatically
7. Verify authentication succeeds

### Test Automated Popup Flow
1. Open auth dialog (default mode)
2. Click "Start Popup OAuth Flow"
3. Verify popup opens and login occurs automatically
4. Verify code extraction happens automatically
5. Verify popup closes after code is extracted
6. Verify authentication completes

### Test Iframe Flow (Experimental)
1. Open auth dialog (default mode)
2. Click "Try Iframe Method (Experimental)"
3. Verify iframe loads within dialog
4. Complete authentication in iframe
5. Verify code extraction when redirect occurs
6. Note: May fail if Bullhorn blocks iframes - this is expected

## Known Issues & Limitations

### Iframe Limitations
- **X-Frame-Options:** Bullhorn may block iframe embedding entirely
- **Cross-Origin:** Cannot access iframe URL if on different origin
- **Recommendation:** Use popup method as primary, iframe as fallback only

### Popup Blockers
- Users must allow popups for the application
- Browser extensions may block popups
- Clear error messages guide users to enable popups

### Code Expiration
- Authorization codes expire quickly (usually within 10 minutes)
- Users must complete flow promptly
- Session timeout after 3 minutes with clear error

## Future Enhancements

### Potential Improvements
1. **Headless OAuth:** Server-side code exchange to avoid browser restrictions
2. **Service Worker:** Intercept redirect to avoid popup closing issues  
3. **WebExtension:** Browser extension to capture redirects reliably
4. **Mobile Support:** Optimized flows for mobile devices
5. **Auto-retry:** Automatically retry failed code exchanges once

### Not Implemented (Browser Limitations)
- **Fully Headless:** Cannot avoid user interaction due to OAuth security requirements
- **Completely Silent:** Bullhorn requires interactive login for security
- **Direct Token Access:** Must follow OAuth code flow, cannot skip steps
