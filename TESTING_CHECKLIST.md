# OAuth Authentication Testing Checklist

## ✅ Feature Verification

### 1. Manual Flow - Full URL Input
- [ ] Open AuthDialog in manual mode (disable "Popup OAuth Mode")
- [ ] Enter credentials (Client ID, Secret, Username, Password)
- [ ] Click "Open Authorization Popup"
- [ ] Verify popup opens (not a new tab)
- [ ] Log in to Bullhorn in popup
- [ ] Copy full URL from popup address bar (e.g., `https://welcome.bullhornstaffing.com/?code=25184_8090191_44%3A0e19f0db...`)
- [ ] Paste **entire URL** into "Authorization Code or URL" field
- [ ] Click "Connect with Code"
- [ ] Verify authentication succeeds
- [ ] Verify no manual decoding was needed

### 2. Manual Flow - Code Only Input
- [ ] Repeat manual flow setup
- [ ] Extract just the code parameter value
- [ ] Test with URL-encoded code: `25184_8090191_44%3A0e19f0db...`
- [ ] Verify it decodes automatically
- [ ] Test with plain code: `25184_8090191_44:0e19f0db...`
- [ ] Verify it works without decoding

### 3. Automated Popup Flow
- [ ] Open AuthDialog (default mode - "Popup OAuth Mode" enabled)
- [ ] Enter credentials
- [ ] Click "✨ Start Popup OAuth Flow"
- [ ] Verify popup opens automatically
- [ ] Verify login happens automatically (credentials pre-filled)
- [ ] Watch console logs for code extraction
- [ ] Verify popup closes automatically
- [ ] Verify authentication completes without user intervention
- [ ] Check no errors in console

### 4. Iframe Flow (Experimental)
- [ ] Open AuthDialog (default mode)
- [ ] Enter credentials
- [ ] Click "Try Iframe Method (Experimental)"
- [ ] Verify iframe loads within dialog
- [ ] Complete authentication in iframe
- [ ] If successful: Verify code extraction happens automatically
- [ ] If fails: Verify error message is clear and helpful
- [ ] Click "Back" to return to main auth dialog

### 5. Popup Blocker Handling
- [ ] Enable popup blocker in browser
- [ ] Try automated popup flow
- [ ] Verify error message appears
- [ ] Verify instructions to allow popups are clear
- [ ] Allow popups for the site
- [ ] Verify flow works after allowing popups

### 6. Error Handling
- [ ] Test with invalid credentials
- [ ] Verify error messages are clear
- [ ] Test with expired code (wait >10 minutes)
- [ ] Verify "invalid grant" error is handled
- [ ] Test with malformed URL in manual flow
- [ ] Verify graceful fallback
- [ ] Close popup during auth
- [ ] Verify timeout handling

### 7. Saved Connections
- [ ] Save connection with credentials
- [ ] Open saved connection
- [ ] Verify credentials are pre-filled
- [ ] Test automated flow with saved credentials
- [ ] Verify connection works

## 🔍 Code Review Checklist

### AuthDialog.tsx
- [x] `extractCodeFromUrl()` function exists
- [x] Handles full URLs
- [x] Handles URL-encoded characters
- [x] Handles plain codes
- [x] Error handling in place
- [x] `handleOpenAuthUrl()` opens popup (not tab)
- [x] Popup dimensions: 600x700
- [x] Popup centered on screen
- [x] `showIframe` state variable exists
- [x] Iframe handlers implemented
- [x] UI updated with iframe option
- [x] Instructions clear and helpful

### OAuthIframe.tsx
- [x] Component created
- [x] Iframe ref setup correctly
- [x] URL monitoring implemented
- [x] Code extraction logic
- [x] Error handling
- [x] Timeout handling (3 minutes)
- [x] Cleanup on unmount
- [x] Clear error messages

## 📊 Browser Compatibility

Test in multiple browsers:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

Verify for each:
- [ ] Popup opens correctly
- [ ] URL extraction works
- [ ] Decoding works
- [ ] Iframe loads (may fail - expected)

## 🐛 Known Issues to Verify

### Expected Behaviors
- [ ] Iframe may fail with X-Frame-Options error → ✅ This is expected
- [ ] Cross-origin restrictions may prevent iframe URL access → ✅ This is expected
- [ ] Popup may be blocked initially → ✅ Clear error message shown

### Unexpected Issues
- [ ] No errors in console during successful auth
- [ ] No memory leaks (intervals/timeouts cleaned up)
- [ ] No race conditions with multiple auth attempts
- [ ] No state corruption on dialog close

## 🔐 Security Verification

- [ ] Credentials stored in Spark KV (server-side)
- [ ] No credentials in localStorage
- [ ] No credentials in sessionStorage
- [ ] No credentials in URL
- [ ] No credentials logged to console (only previews)
- [ ] OAuth flow follows Bullhorn documentation
- [ ] No redirect_uri sent (as requested)

## 📱 User Experience

### Clarity
- [ ] Instructions are clear for each method
- [ ] Error messages are helpful
- [ ] Success messages are shown
- [ ] Loading states are clear

### Consistency
- [ ] UI matches overall app design
- [ ] Buttons follow same patterns
- [ ] Icons used appropriately
- [ ] Toast notifications consistent

### Accessibility
- [ ] Labels on all inputs
- [ ] Keyboard navigation works
- [ ] Focus management correct
- [ ] Error messages announced

## 📝 Documentation

- [x] OAUTH_IMPROVEMENTS.md created
- [x] OAUTH_QUICK_GUIDE.md created
- [x] CHANGES_SUMMARY.md created
- [x] TESTING_CHECKLIST.md created (this file)
- [ ] PRD updated (if exists)
- [ ] README updated with OAuth notes

## 🚀 Deployment Readiness

- [ ] All tests pass
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Build succeeds
- [ ] Bundle size acceptable
- [ ] Performance acceptable

## ✨ Final Verification

### Manual Flow
1. [ ] Full URL paste works ✅
2. [ ] Code extraction works ✅
3. [ ] URL decoding works ✅
4. [ ] Popup opens correctly ✅

### Automated Flow
1. [ ] Popup opens ✅
2. [ ] Code extracted automatically ✅
3. [ ] Popup closes automatically ✅
4. [ ] Auth completes without user action ✅

### Iframe Flow
1. [ ] Iframe option available ✅
2. [ ] Loads within dialog ✅
3. [ ] Error handling works ✅
4. [ ] Fallback to popup suggested ✅

---

## Sign-off

- [ ] Developer tested all features
- [ ] Code reviewed
- [ ] Documentation complete
- [ ] Ready for user testing

**Tested by:** _________________
**Date:** _________________
**Notes:** _________________
