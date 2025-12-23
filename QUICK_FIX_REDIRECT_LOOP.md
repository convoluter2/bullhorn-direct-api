# OAuth Redirect Loop - Quick Fix Guide

## 🚨 Problem
```
ERR_TOO_MANY_REDIRECTS
This page isn't working - auth-west9.bullhornstaffing.com redirected you too many times.
```

## ✅ Solution (Choose One)

### 🥇 BEST: Use Incognito Mode
**Fastest and most reliable!**

1. Open Incognito/Private window:
   - **Chrome/Edge:** `Ctrl+Shift+N` (Win) or `Cmd+Shift+N` (Mac)
   - **Firefox:** `Ctrl+Shift+P` (Win) or `Cmd+Shift+P` (Mac)  
   - **Safari:** `Cmd+Shift+N` (Mac)
2. Navigate to the app
3. Complete OAuth authentication
4. Done! ✨

### 🥈 Clear Cookies
**If you prefer your regular browser:**

**Chrome/Edge:**
1. Press `F12` to open DevTools
2. Go to **Application** tab
3. Expand **Cookies** in left sidebar
4. Delete all `*.bullhornstaffing.com` cookies
5. Refresh and try again

**Firefox:**
1. Press `F12` to open DevTools
2. Go to **Storage** tab
3. Expand **Cookies**
4. Delete all `bullhornstaffing.com` cookies
5. Refresh and try again

### 🥉 Use Proxy OAuth
**Built-in workaround:**

1. In the auth dialog, click **"Try Proxy-Based OAuth (Beta)"**
2. This uses a different flow that bypasses cookie issues
3. Follow the prompts

## 🤔 Why Does This Happen?

- Your browser has **old Bullhorn session cookies**
- When OAuth starts, Bullhorn sees these cookies
- The old session conflicts with the new OAuth request
- Result: infinite redirect loop → browser error

**Why Incognito works:** No old cookies = clean OAuth flow!

## 🛡️ Prevention

- Always use **Incognito** for OAuth testing
- Don't mix Bullhorn web UI logins with API OAuth in same browser
- Clear cookies between OAuth sessions
- Use separate browser profiles for PROD vs NPE

## 📚 More Help

- See `COOKIE_REDIRECT_LOOP_FIX.md` for detailed explanations
- See `COOKIE_FIX_IMPLEMENTATION.md` for technical details
- Click the cookie help link in the auth dialog for instructions

---

**TL;DR:** Use Incognito mode (`Ctrl+Shift+N` / `Cmd+Shift+N`) and the problem goes away! 🎉
