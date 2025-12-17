# OAuth Automated Authentication - Validation Checklist

Use this checklist to validate that the OAuth automated authentication is working correctly.

## Pre-Flight Checks

- [ ] Node modules are installed (`npm install`)
- [ ] No TypeScript errors (`npm run build`)
- [ ] Application starts without errors (`npm run dev`)

## Automated Test Validation

### Run Test Suite

```bash
chmod +x test-auth-flow.sh
./test-auth-flow.sh
```

### Expected Results

- [ ] ✅ OAuth Flow Automation: PASSED (28+ tests)
- [ ] ✅ Multi-Tenant Integration: PASSED (10+ tests)
- [ ] ✅ Bullhorn API Core: PASSED (30+ tests)

### Individual Test Commands

```bash
# OAuth automation tests
npm test -- auth-automation

# Multi-tenant integration tests
npm test -- oauth-integration

# Core API tests
npm test -- bullhorn-api
```

## Manual Testing with Saved Credentials

### Phase 1: Save Credentials

1. **Open Application**
   - [ ] Application loads without errors
   - [ ] No console errors visible

2. **Open Connection Manager**
   - [ ] Click "Saved Connections" button
   - [ ] Connection manager dialog opens
   - [ ] "Add Connection" button is visible

3. **Add Fastaff NPE Connection**
   - [ ] Click "Add Connection"
   - [ ] Enter connection details:
     ```
     Connection Name: Fastaff NPE
     Tenant: Fastaff/USN
     Environment: NPE
     Client ID: a6a33789-1490-4888-994e-345f22808e41
     Client Secret: [your actual secret]
     Username: [your actual username]
     Password: [your actual password]
     ```
   - [ ] Click "Save Connection"
   - [ ] Success toast appears
   - [ ] Connection appears in saved connections list

4. **Verify Connection Saved**
   - [ ] Close connection manager
   - [ ] Reopen connection manager
   - [ ] Fastaff NPE connection is still there
   - [ ] No errors in console

### Phase 2: Test Automated OAuth Flow

1. **Initiate Connection**
   - [ ] Click "Connect to Bullhorn"
   - [ ] Auth dialog opens

2. **Select Saved Connection**
   - [ ] Fastaff NPE appears in saved connections
   - [ ] Click on Fastaff NPE
   - [ ] Credentials auto-fill in the form
   - [ ] Client ID shows: `a6a33789-1490-4888-994e-345f22808e41`

3. **Verify Automated Mode**
   - [ ] "✨ Automated OAuth Mode" checkbox is checked
   - [ ] Redirect URI shows current URL
   - [ ] "✨ Start Automated OAuth Flow" button is enabled

4. **Start OAuth Flow**
   - [ ] Click "✨ Start Automated OAuth Flow"
   - [ ] Loading toast appears: "Redirecting to Bullhorn..."
   - [ ] Dialog closes

5. **Bullhorn Redirect**
   - [ ] Page redirects to `auth-east.bullhornstaffing.com`
   - [ ] Bullhorn login page appears OR auto-login happens
   - [ ] If login page: Enter credentials and authorize
   - [ ] Page redirects back to your application

6. **OAuth Callback Processing**
   - [ ] URL contains `?code=` parameter
   - [ ] OAuth callback screen appears with spinner
   - [ ] Progress messages show:
     - "Authorization code detected"
     - "Code decoded successfully"
     - "Retrieving stored credentials"
     - "Exchanging code for access token"
     - "Access token received"
     - "Logging into Bullhorn REST API"
     - "Session established successfully"
   - [ ] Success toast: "Successfully authenticated with Bullhorn"
   - [ ] Main app screen appears

7. **Verify Connected State**
   - [ ] Header shows "Connected" badge
   - [ ] Connection switcher shows "Fastaff NPE"
   - [ ] "Disconnect" button is visible
   - [ ] All tabs are accessible (QueryBlast, CSV Loader, etc.)

### Phase 3: Verify Session Persistence

1. **Reload Page**
   - [ ] Press F5 to reload
   - [ ] Page reloads
   - [ ] Still shows "Connected" state
   - [ ] Features are still accessible
   - [ ] No re-authentication required

2. **Check Browser Storage**
   - [ ] Open DevTools → Application/Storage
   - [ ] Check session data is stored
   - [ ] Verify refresh token is present
   - [ ] Check expiration timestamp is set

### Phase 4: Test API Functionality

1. **QueryBlast**
   - [ ] Navigate to QueryBlast tab
   - [ ] Select entity: "Candidate"
   - [ ] Add a simple filter (e.g., status equals "Active")
   - [ ] Click "Execute Query"
   - [ ] Results appear without errors
   - [ ] Can export results

2. **Entity Metadata**
   - [ ] Select different entities
   - [ ] Fields dropdown populates for each entity
   - [ ] Candidate shows fields (firstName, lastName, etc.)
   - [ ] No "blank dropdown" errors

3. **Audit Logs**
   - [ ] Navigate to Logs tab
   - [ ] See "Connection Switch" or similar log entry
   - [ ] Timestamp is correct
   - [ ] Status shows "success"

### Phase 5: Test Token Refresh

1. **Wait for Token Expiration** (Optional - can mock)
   - [ ] Wait 9+ minutes OR
   - [ ] Manually set session.expiresAt to near-expiry in DevTools

2. **Verify Auto-Refresh**
   - [ ] After 9 minutes, check audit logs
   - [ ] Should see "Token Refresh" success entry
   - [ ] Connection remains active
   - [ ] Can still perform API operations
   - [ ] No re-authentication prompt

### Phase 6: Test Multiple Connections

1. **Add Second Connection**
   - [ ] Open Connection Manager
   - [ ] Add "Fastaff Production" connection
   - [ ] Save successfully

2. **Switch Between Connections**
   - [ ] Click connection switcher dropdown
   - [ ] Both connections appear
   - [ ] Click "Fastaff Production"
   - [ ] Shows switching loading state
   - [ ] Switches successfully
   - [ ] Success toast appears
   - [ ] Can perform operations on new connection

3. **Verify Connection Isolation**
   - [ ] Audit logs show connection switch
   - [ ] Operations use correct connection
   - [ ] Switching back works correctly

## Error Scenario Testing

### Test Invalid Credentials

1. **Add Connection with Wrong Secret**
   - [ ] Add connection with invalid client secret
   - [ ] Try to authenticate
   - [ ] Error message appears
   - [ ] Error is clear and actionable
   - [ ] Can retry with correct credentials

### Test Expired OAuth Session

1. **Start OAuth Then Wait**
   - [ ] Start OAuth flow
   - [ ] Wait 11+ minutes before completing
   - [ ] Try to complete OAuth
   - [ ] Error: "OAuth session expired"
   - [ ] Can restart flow successfully

### Test Invalid Redirect URI

1. **Use Wrong Redirect URI**
   - [ ] Manually change redirect URI to invalid value
   - [ ] Try to start OAuth
   - [ ] Bullhorn shows "Invalid Redirect URI" error
   - [ ] User can fix and retry

### Test Network Errors

1. **Simulate Network Failure**
   - [ ] Disconnect internet during token exchange
   - [ ] Appropriate error message shown
   - [ ] Can retry when network restored

## Browser Compatibility

Test in multiple browsers:

### Chrome/Edge
- [ ] Automated OAuth works
- [ ] Session persists
- [ ] Token refresh works
- [ ] No console errors

### Firefox
- [ ] Automated OAuth works
- [ ] Session persists
- [ ] Token refresh works
- [ ] No console errors

### Safari
- [ ] Automated OAuth works
- [ ] Session persists
- [ ] Token refresh works
- [ ] No console errors

## Console Validation

During OAuth flow, check console logs:

- [ ] "OAuth Callback - URL params" shows code
- [ ] "OAuth Callback - Decoded code" shows decoded version
- [ ] "OAuth Callback - Pending auth" shows credentials retrieved
- [ ] "OAuth Callback - Exchanging code for token"
- [ ] "OAuth Callback - Token received, logging in"
- [ ] "OAuth Callback - Session established"
- [ ] "OAuth Callback - Complete, calling onAuthenticated"
- [ ] No React errors
- [ ] No "content is blocked" errors
- [ ] No undefined errors

## Performance Validation

- [ ] OAuth callback processes in < 3 seconds
- [ ] UI remains responsive during auth
- [ ] No memory leaks (check DevTools Memory tab)
- [ ] Network requests are efficient (check Network tab)

## Security Validation

- [ ] Credentials not visible in URL
- [ ] Credentials not in localStorage (check Application tab)
- [ ] Credentials stored in KV store only
- [ ] OAuth session times out properly
- [ ] Refresh token used (not password) for renewal
- [ ] No sensitive data in console logs
- [ ] No sensitive data in error messages

## Accessibility Validation

- [ ] Can navigate with keyboard
- [ ] Tab order is logical
- [ ] Focus indicators visible
- [ ] Error messages are announced
- [ ] Success messages are announced
- [ ] Loading states are clear

## Mobile Responsiveness

Test on mobile device or responsive mode:

- [ ] OAuth dialog is readable
- [ ] Buttons are tappable
- [ ] Forms are usable
- [ ] Redirect works on mobile
- [ ] Can complete OAuth on mobile

## Final Validation

### Must Pass
- [ ] All automated tests pass
- [ ] Can save credentials
- [ ] Can start automated OAuth
- [ ] No blank screen after redirect
- [ ] Session is created successfully
- [ ] Can use all features after auth
- [ ] Session persists across reloads
- [ ] Token refresh works automatically

### Should Pass
- [ ] Multiple connections work
- [ ] Connection switching works
- [ ] Audit logs are accurate
- [ ] Error handling is graceful
- [ ] Performance is acceptable
- [ ] Works in all major browsers

### Nice to Have
- [ ] Mobile experience is smooth
- [ ] Accessibility is good
- [ ] Console logs are helpful for debugging
- [ ] Documentation is clear

## Sign-Off

Once all items above are checked:

- [ ] **Automated Tests**: All passing ✅
- [ ] **Manual OAuth Flow**: Working correctly ✅
- [ ] **Session Persistence**: Confirmed ✅
- [ ] **Token Refresh**: Working automatically ✅
- [ ] **Error Handling**: Graceful and clear ✅
- [ ] **Browser Compatibility**: Tested ✅
- [ ] **Security**: Validated ✅
- [ ] **Performance**: Acceptable ✅

**Validated By:** ___________________  
**Date:** ___________________  
**Environment:** NPE / Production  
**Bullhorn Tenant:** ___________________  

---

## Troubleshooting Reference

If any validation fails, see:
- `OAUTH_TESTING.md` - Detailed testing guide
- `OAUTH_FIX_SUMMARY.md` - What was fixed and why
- Browser console - Error details
- Network tab - API call details
- Audit logs - Authentication events

## Success Criteria

The OAuth automated authentication is **READY FOR PRODUCTION** when:

✅ All automated tests pass  
✅ Manual validation checklist complete  
✅ No critical issues found  
✅ Tested with real credentials  
✅ Tested in production environment  
✅ Documentation is accurate  
✅ Team has validated  

---

**Status:** 🟢 Ready | 🟡 In Progress | 🔴 Issues Found

**Notes:**
_Add any additional notes or observations here_
