# Bullhorn Data Manager

A comprehensive Bullhorn ATS/CRM data management platform that enables enterprise users to query, import, export, and manipulate candidate and job data through direct REST API integration.

## 🚨 Important - Published App Known Issue

**If you see a 429 error** when accessing the published Spark app, this is a GitHub infrastructure rate limit, not a bug in the application. 

**Quick fixes:**
- Wait 60 seconds and refresh
- Clear browser cache or use incognito mode
- **Best solution**: Run locally with `npm run dev` for full functionality

See [DEPLOYMENT_NOTES.md](./DEPLOYMENT_NOTES.md) for details.

## Features

### QueryBlast
Advanced search with complex query building, field selection, and support for both simple and grouped filters with AND/OR logic.

### CSV Data Loader
Bulk import records via CSV with intelligent field mapping, validation, and dry-run preview capabilities.

### SmartStack v2
Batch processing with CSV upload of IDs, query filters, field updates, and **conditional association logic**.

### QueryStack
Combines QueryBlast with SmartStack - query records first, then apply bulk updates with **conditional association logic**.

### Conditional Association Logic ⚡ NEW
Apply different to-many association operations (add/remove/replace) based on field values of each record. Create sophisticated rules like:
- Add certifications when status becomes "Active"
- Assign specialties based on experience level and location
- Update categories using multi-condition logic with AND/OR operators

[📖 Full Documentation](./CONDITIONAL_ASSOCIATIONS.md) | [⚡ Quick Reference](./CONDITIONAL_ASSOCIATIONS_QUICK_REF.md)

### Audit & Logging
Comprehensive tracking of all operations with timestamps, rollback capability, and detailed history.

### Connection Management
Save and quickly switch between multiple Bullhorn tenant connections (NPE/PROD for different clients).

## Getting Started

### Quick Start

```bash
npm run dev
```

This starts both the frontend (Vite) and the OAuth proxy server automatically.

### Authentication Setup

1. **Configure Bullhorn OAuth Redirect URI**
   - Add `http://localhost:3001/oauth/callback` to your Bullhorn OAuth API key
   - See [README_PROXY.md](./README_PROXY.md) for detailed setup

2. **Connect to Bullhorn**
   - Click "Saved Connections" when app loads
   - Enter your OAuth credentials (Client ID, Client Secret, Username, Password)
   - Click "Try Proxy-Based OAuth (Beta)" for seamless authentication
   - Or use standard popup OAuth flow

3. **Start Managing Data**
   - Use QueryBlast, CSV Loader, SmartStack, or QueryStack

### OAuth Proxy Server

The app includes a backend proxy server to handle OAuth redirects properly. The proxy solves cross-origin issues and automatically extracts authorization codes.

**Key Features:**
- ✅ Handles OAuth redirect URI
- ✅ Automatically decodes authorization codes
- ✅ Works around browser CORS restrictions
- ✅ Seamless popup-based authentication

See [README_PROXY.md](./README_PROXY.md) for complete proxy documentation.

## Documentation

- [README_PROXY.md](./README_PROXY.md) - **OAuth Proxy Quick Start** 🔐
- [OAUTH_PROXY_SETUP.md](./OAUTH_PROXY_SETUP.md) - Detailed Proxy Setup Guide
- [PRD.md](./PRD.md) - Product Requirements Document
- [CONDITIONAL_ASSOCIATIONS.md](./CONDITIONAL_ASSOCIATIONS.md) - Conditional Logic Guide
- [CONDITIONAL_ASSOCIATIONS_QUICK_REF.md](./CONDITIONAL_ASSOCIATIONS_QUICK_REF.md) - Quick Reference
- [OAUTH_GUIDE.md](./OAUTH_GUIDE.md) - OAuth Setup Guide

### 🔧 Troubleshooting

**Getting ERR_TOO_MANY_REDIRECTS during OAuth?**
- [QUICK_FIX_REDIRECT_LOOP.md](./QUICK_FIX_REDIRECT_LOOP.md) - **Quick Fix Guide** ⚡
- [COOKIE_REDIRECT_LOOP_FIX.md](./COOKIE_REDIRECT_LOOP_FIX.md) - Detailed Troubleshooting
- [COOKIE_FIX_IMPLEMENTATION.md](./COOKIE_FIX_IMPLEMENTATION.md) - Technical Details
- [COOKIE_REDIRECT_SOLUTION.md](./COOKIE_REDIRECT_SOLUTION.md) - Complete Solution Package

**TL;DR:** Use Incognito mode (`Ctrl+Shift+N` or `Cmd+Shift+N`) to avoid cookie conflicts!

## Key Capabilities

✅ Direct Bullhorn REST API integration  
✅ **OAuth2 Proxy Server for seamless authentication** 🆕  
✅ OAuth2 authentication with automatic token refresh  
✅ Complex query building with grouped filters  
✅ CSV import/export with field mapping  
✅ Batch updates with dry-run preview  
✅ **Conditional association logic based on field values**  
✅ To-many association management (add/remove/replace)  
✅ Comprehensive audit logging  
✅ Rollback capability for bulk operations  
✅ Multi-tenant connection management  

## Technology Stack

- React 19 + TypeScript
- Tailwind CSS v4
- shadcn/ui components
- **Express.js (OAuth Proxy Server)** 🆕
- Bullhorn REST API
- Spark Runtime SDK

## License

The Spark Template files and resources from GitHub are licensed under the terms of the MIT license, Copyright GitHub, Inc.
