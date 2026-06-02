# OAuth Proxy Server - Documentation Index

This document provides an overview and index of all proxy-related documentation.

## 📚 Documentation Overview

### Primary Documentation

1. **[PROXY_SERVER_DOCUMENTATION.md](./PROXY_SERVER_DOCUMENTATION.md)** ⭐ **START HERE**
   - **Purpose**: Comprehensive technical documentation
   - **Audience**: Developers
   - **Contents**: 
     - Why the proxy exists
     - Complete architecture
     - Full API reference
     - Security considerations
     - Deployment guides
     - Troubleshooting

2. **[server/README.md](./server/README.md)**
   - **Purpose**: Quick reference guide
   - **Audience**: All users
   - **Contents**:
     - Quick start commands
     - Endpoint summary
     - Basic troubleshooting
     - Configuration options

### Setup & Usage Guides

3. **[README_PROXY.md](./README_PROXY.md)**
   - **Purpose**: Quick start guide for users
   - **Audience**: End users
   - **Contents**:
     - TL;DR setup instructions
     - How to use proxy-based OAuth
     - Common issues and fixes

4. **[OAUTH_PROXY_SETUP.md](./OAUTH_PROXY_SETUP.md)**
   - **Purpose**: Detailed setup instructions
   - **Audience**: Developers and DevOps
   - **Contents**:
     - Step-by-step setup
     - Environment configuration
     - Bullhorn redirect URI registration
     - Testing procedures

5. **[OAUTH_PROXY_GUIDE.md](./OAUTH_PROXY_GUIDE.md)**
   - **Purpose**: Implementation details
   - **Audience**: Developers
   - **Contents**:
     - Three-tiered authentication approach
     - Flow diagrams
     - Frontend integration
     - Backend proxy implementation

## 🎯 Quick Navigation

### I want to...

#### Get Started Quickly
→ Read **[README_PROXY.md](./README_PROXY.md)** (5 min read)
- Run `npm run dev`
- Register redirect URI in Bullhorn
- Start authenticating

#### Understand the Architecture
→ Read **[PROXY_SERVER_DOCUMENTATION.md](./PROXY_SERVER_DOCUMENTATION.md)** (15 min read)
- Learn why it exists
- Understand the OAuth flow
- Review the component architecture

#### Set Up for Production
→ Read **[OAUTH_PROXY_SETUP.md](./OAUTH_PROXY_SETUP.md)** + Security section in **[PROXY_SERVER_DOCUMENTATION.md](./PROXY_SERVER_DOCUMENTATION.md)** (20 min read)
- Deployment options
- Security hardening checklist
- Production configuration

#### Troubleshoot Issues
→ Check **[server/README.md](./server/README.md)** Troubleshooting section (5 min read)
- Common issues and solutions
- Port conflicts
- Redirect URI errors
- CORS issues

#### Integrate with Frontend
→ Read **[OAUTH_PROXY_GUIDE.md](./OAUTH_PROXY_GUIDE.md)** (10 min read)
- Frontend service layer
- postMessage communication
- Fallback polling mechanism

#### Work Without the Proxy
→ Read **[PROXY_SERVER_DOCUMENTATION.md](./PROXY_SERVER_DOCUMENTATION.md)** - "Working Without the Proxy" section
- Manual code entry method
- Direct OAuth approach
- Third-party proxy services

## 📖 Reading Order by Role

### End User (Non-Technical)
1. [README_PROXY.md](./README_PROXY.md) - Quick start

### Frontend Developer
1. [README_PROXY.md](./README_PROXY.md) - Overview
2. [OAUTH_PROXY_GUIDE.md](./OAUTH_PROXY_GUIDE.md) - Implementation details
3. [PROXY_SERVER_DOCUMENTATION.md](./PROXY_SERVER_DOCUMENTATION.md) - Full reference

### Backend Developer / DevOps
1. [server/README.md](./server/README.md) - Server overview
2. [OAUTH_PROXY_SETUP.md](./OAUTH_PROXY_SETUP.md) - Setup guide
3. [PROXY_SERVER_DOCUMENTATION.md](./PROXY_SERVER_DOCUMENTATION.md) - Full documentation (especially security section)

### Technical Lead / Architect
1. [PROXY_SERVER_DOCUMENTATION.md](./PROXY_SERVER_DOCUMENTATION.md) - Complete architecture
2. Review security considerations
3. Evaluate deployment options

## 🔍 Key Concepts

### What is it?
An Express.js server that acts as an OAuth redirect URI to capture authorization codes from Bullhorn's OAuth flow.

### Why is it needed?
Browsers block reading URLs from cross-origin popups. The proxy provides a registered endpoint that can capture codes and send them back to the frontend.

### Is it required?
No, but strongly recommended. The app can work with manual code entry if the proxy isn't available.

### How does it work?
```
Frontend → Opens OAuth popup with proxy redirect URI
Bullhorn → Authenticates user, redirects to proxy
Proxy    → Captures code, sends to frontend via postMessage
Frontend → Exchanges code for access token
```

### What are the security considerations?
The default configuration is for development. Production deployments should:
- Restrict CORS to specific domains
- Add rate limiting
- Use HTTPS
- Implement authentication on storage endpoints
- Use Redis/database for persistence

## 🛠️ Technical Stack

**Server**: Express.js 5.2.1  
**Language**: JavaScript (ES Modules)  
**Port**: 3001 (configurable)  
**Dependencies**: `express`, `cors`  
**Node.js**: 18+ required  

## 📁 File Structure

```
/workspaces/spark-template/
├── server/
│   ├── proxy.js              # Main server file
│   ├── restart-helper.js     # Restart utilities
│   ├── data/                 # Optional storage (gitignored)
│   └── README.md            # Quick reference
├── PROXY_SERVER_DOCUMENTATION.md  # ⭐ Main documentation
├── PROXY_INDEX.md                 # This file
├── README_PROXY.md                # Quick start
├── OAUTH_PROXY_GUIDE.md           # Implementation guide
├── OAUTH_PROXY_SETUP.md           # Setup instructions
├── start-proxy.sh                 # Startup script
├── restart-proxy.sh               # Restart script
├── verify-proxy.sh                # Health check script
└── package.json                   # Contains proxy scripts
```

## 🚀 Common Commands

```bash
# Start everything (proxy + Vite)
npm run dev

# Start proxy only
npm run dev:proxy

# Start Vite only
npm run dev:vite

# Check proxy health
curl http://localhost:3001/health

# Restart proxy
npm run restart:proxy

# Kill proxy process
npm run kill:proxy

# Verify proxy is working
bash verify-proxy.sh
```

## 🔗 Related Documentation

### OAuth & Authentication
- [OAUTH_GUIDE.md](./OAUTH_GUIDE.md) - General OAuth implementation
- [OAUTH_TESTING.md](./OAUTH_TESTING.md) - OAuth testing procedures
- [OAUTH_TROUBLESHOOTING.md](./OAUTH_TROUBLESHOOTING.md) - OAuth issues
- [AUTHENTICATION.md](./AUTHENTICATION.md) - Authentication overview

### Proxy-Specific Testing
- [PROXY_TROUBLESHOOTING.md](./PROXY_TROUBLESHOOTING.md) - Proxy issues
- [PROXY_STATUS.md](./PROXY_STATUS.md) - Status monitoring
- [PROXY_RESTART_FIX.md](./PROXY_RESTART_FIX.md) - Restart procedures
- [PROXY_RESTART_GUIDE.md](./PROXY_RESTART_GUIDE.md) - Restart guide

### Scripts
- `start-proxy.sh` - Start proxy with health check wait
- `restart-proxy.sh` - Gracefully restart proxy
- `verify-proxy.sh` - Verify proxy health
- `test-proxy-restart.sh` - Automated restart test

## 📞 Support

### Having Issues?

1. **Check logs**: Look at proxy terminal output
2. **Verify health**: `curl http://localhost:3001/health`
3. **Review docs**: Check troubleshooting sections
4. **Check Bullhorn**: Verify redirect URI is registered
5. **Browser console**: Look for error messages

### Common Issues

| Issue | Quick Fix | Documentation |
|-------|-----------|---------------|
| Port in use | `npm run kill:proxy` | [server/README.md](./server/README.md#port-already-in-use) |
| Proxy not reachable | `npm run dev` | [server/README.md](./server/README.md#proxy-not-reachable) |
| Invalid redirect URI | Register in Bullhorn | [OAUTH_PROXY_SETUP.md](./OAUTH_PROXY_SETUP.md#configure-redirect-uri) |
| Code not received | Check postMessage | [PROXY_SERVER_DOCUMENTATION.md](./PROXY_SERVER_DOCUMENTATION.md#code-not-received-via-postmessage) |
| CORS errors | Update CORS config | [PROXY_SERVER_DOCUMENTATION.md](./PROXY_SERVER_DOCUMENTATION.md#restrict-cors) |

## 🎓 Learning Path

### Beginner
1. Run `npm run dev`
2. Read [README_PROXY.md](./README_PROXY.md)
3. Try proxy-based OAuth in the app
4. Check proxy logs to see it working

### Intermediate
1. Read [OAUTH_PROXY_GUIDE.md](./OAUTH_PROXY_GUIDE.md)
2. Review `server/proxy.js` code
3. Understand the OAuth flow diagram
4. Explore frontend integration code

### Advanced
1. Read [PROXY_SERVER_DOCUMENTATION.md](./PROXY_SERVER_DOCUMENTATION.md) completely
2. Review security hardening recommendations
3. Plan production deployment strategy
4. Implement additional security measures

## ✅ Next Steps

After understanding the proxy:

1. **Development**: Use proxy-based OAuth for seamless authentication
2. **Testing**: Test with multiple connections and error scenarios
3. **Production**: Review security hardening checklist
4. **Deployment**: Choose deployment strategy (with frontend or separate)
5. **Monitoring**: Set up health checks and logging

## 📊 Status

**Current Version**: 1.0.0  
**Status**: Production-ready (with security hardening)  
**Maintenance**: Active  
**Dependencies**: Up to date  

---

**Last Updated**: 2024  
**Maintainer**: Project Team  
**Feedback**: Welcome via issues or pull requests
