# Publishing Blockers - Bug Report




---

## CRITICAL ISSUES

### 🚨 CRITICAL #1: Node.js Proxy Server Dependency
**Severity**: BLOCKER  
**Location**: `package.json`, `server/proxy.js`  
**Issue**: The application depends on a Node.js proxy server that won't run in Spark's browser-only environment.

**Evidence**:
- `package.json` line 9: `"dev:proxy": "node server/proxy.js"`
- Script references: `start-proxy.sh`, `restart-proxy.sh`, `verify-proxy.sh`
- The app makes API calls that likely route through this proxy

**Impact**: Application will fail to make API requests in production Spark environment.

**Required Action**: 
- Remove or refactor proxy dependencies
- Ensure all API calls work directly from browser
- OR clearly document that this app requires external proxy setup

---

### 🚨 CRITICAL #2: Missing StrictMode Wrapper
**Severity**: BLOCKER  
**Location**: `src/main.tsx` line 17  
**Issue**: The app is not wrapped in `<StrictMode>` despite importing it.

**Current Code**:
```tsx
import { StrictMode } from 'react'
// ... imports ...

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <App />
  </ErrorBoundary>
)
###

**Expected Code**:
```tsx
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <App />
    </ErrorBoundary>
  </StrictMode>
)
```

**Impact**: Missing React best practices, potential issues not caught in development.

---

## HIGH PRIORITY ISSUES

### ⚠️ HIGH #1: Disabled Audit Logs Flag
**Severity**: HIGH  
**Location**: `src/main.tsx` line 3  
**Issue**: Audit logs are globally disabled with a window flag.

```tsx
;(window as any).__SPARK_DISABLE_AUDIT_LOGS__ = true;
```

**Impact**: This appears to be a debug/development flag that should not be in production. The app has a full audit log feature but it's disabled.

**Required Action**: Remove this line or document why audit logs must be disabled.

---

### ⚠️ HIGH #2: TypeScript Build Errors Ignored
**Severity**: HIGH  
**Location**: `package.json` line 15  
**Issue**: TypeScript errors are suppressed during build.

```json
"build": "tsc -b --noCheck && vite build"
```

```html

**Impact**: If this is a template or general-purpose tool, it should ha

---

**Location**: `src/App.ts




**Severity**: MEDIUM  

**Examp
- OAUTH_DEBUGGING.md, OAUTH_TROUBLESHOOTING.md
- M

**Recommendation**: Move to `/docs` folder or remove before publishing.

## LOW PRIORITY ISSUES

**L



**Severity**: LOW  
**Issue**: `candidate_skills_test.csv`, `test_candidates.csv`

---

Before publishing, verify:

- [

- [ ] Application works without Node.js proxy in 
- [ ] Application titl



1. **StrictMo
3. **EntityLookup.tsx Corruption** - Co
### 🔧 Code Changes Made:
- `src/components/EntityLooku
---

**CRITICAL BLOCKERS REMAIN** - The application still has fundamental issues:



- C










































