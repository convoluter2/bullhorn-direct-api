# OAuth Authentication - Quick Guide

## ✨ Recommended: Automated Popup Flow (Default)

**Best for:** Most users - easiest and fastest method

1. Fill in your credentials (Client ID, Secret, Username, Password)
2. Click **"✨ Start Popup OAuth Flow"**
3. Popup opens with Bullhorn login (auto-fills credentials)
4. Code is automatically extracted when Bullhorn redirects
5. Popup closes and authentication completes
6. Done! ✅

**If popup is blocked:** Browser will show popup blocker notification. Click to allow popups for this site.

---

## 📋 Manual Flow with URL Paste

**Best for:** Users who prefer manual control or if automated flow fails

### Steps:

1. Fill in your credentials (Client ID, Secret, Username, Password)
2. Toggle **OFF** the "Popup OAuth Mode" checkbox
3. Click **"Open Authorization Popup"**
4. Popup opens → Log in to Bullhorn
5. After login, Bullhorn redirects to a URL like:
   ```
   https://welcome.bullhornstaffing.com/?code=25184_8090191_44%3A0e19f0db-1c33-4409-b914-af5345c2b885&client_id=...
   ```
6. **Copy the ENTIRE URL** from the popup address bar
7. **Paste** it into the "Authorization Code or URL" field
8. Click **"Connect with Code"**
9. Done! ✅

### Pro Tips:
- ✅ **You can paste the full URL** - we'll extract the code automatically
- ✅ **The colon (:) is decoded automatically** - no need to manually change `%3A` to `:`
- ✅ You can also paste just the code if you prefer: `25184_8090191_44:0e19f0db-1c33-4409-b914-af5345c2b885`

---

## 🧪 Experimental: Iframe Method

**Best for:** Testing alternative approaches if popup blockers are an issue

1. Fill in your credentials
2. Click **"Try Iframe Method (Experimental)"**
3. OAuth flow loads in an iframe within the dialog
4. Complete authentication in the iframe
5. Code is automatically extracted when redirect occurs

**⚠️ Limitations:**
- May not work if Bullhorn blocks iframe embedding (common security practice)
- Less reliable than popup method
- Use only if popup method fails

---

## 🔧 Troubleshooting

### "Popup blocked" error
- **Solution:** Click the popup blocker icon in your browser address bar
- Allow popups for this site
- Try again

### "Invalid redirect URI" error
- **Solution:** This is now fixed - we don't send redirect_uri anymore
- If you still see this, check your OAuth credentials are correct

### "Invalid grant" or "expired code" error
- **Solution:** Authorization codes expire quickly (typically 10 minutes)
- Complete the flow promptly after getting the code
- If code expired, start over and complete faster

### Iframe method shows error
- **Solution:** This is expected if Bullhorn blocks iframes
- Use the popup method instead (recommended)

### Code with `%3A` not working
- **Solution:** This is now fixed - URL encoding is handled automatically
- Just paste the full URL and it will work

---

## 🎯 Which Method Should I Use?

| Method | When to Use | Pros | Cons |
|--------|-------------|------|------|
| **Popup (Automated)** | Default - use this first | Fastest, fully automatic, no copying needed | Requires popup permission |
| **Manual with URL** | Popup blocked or manual preference | Works with any browser, full control | Requires copy/paste |
| **Iframe** | Testing/troubleshooting only | No popup needed | Often blocked by Bullhorn |

**Recommendation:** Start with automated popup flow. If that fails, switch to manual flow with URL paste.
