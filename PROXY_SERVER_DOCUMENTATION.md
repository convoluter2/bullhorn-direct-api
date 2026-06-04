# Node.js Proxy Server Documentation

## Table of Contents

3. [Architecture](#archi
5. [Dependencies](#dependencies)
7. [Configuration](#configuratio
9. [Deployment](#deployment)
5. [Dependencies](#dependencies)
6. [API Reference](#api-reference)
7. [Configuration](#configuration)
8. [Development Workflow](#development-workflow)
9. [Deployment](#deployment)
10. [Working Without the Proxy](#working-without-the-proxy)
11. [Troubleshooting](#troubleshooting)
12. [Security Considerations](#security-considerations)

- C

## Overview

The Node.js proxy server is an **optional but recommended** Express.js server that solves OAuth redirect challenges when integrating with Bullhorn's API. It runs on port 3001 and provides:

- OAuth callback handling
- Authorization code capture and decoding
- Cross-origin communication bridge
- Credential and connection persistence (optional storage layer)
- Health monitoring

**Location**: `/server/proxy.js`

**Default Port**: 3001

**Primary Purpose**: Act as a legitimate OAuth redirect URI to capture authorization codes from Bullhorn's OAuth flow.

---





- Provides a fallback polling mechanism


┌─────────────┐         ┌──────────────┐         ┌────────────┐
│  (React)    │         │  (Express)   │         │   OAuth    │
       │                        │                        │

       │    http

       │                        │◄───────────────────────┤

       │                        │                        
       │  5. postMessage with   │             
       │                        │                        │
       ├───────────────────────────────
       │◄────────────────────────────────────────






- `GET /oauth/callback` - Receives OAuth redirect from Bullhorn

- Captures authorization code from query parameters
- Stores code temporarily with state parameter (5-minute e
- Handles OAuth errors gracefully
#### 2. Optional Storage Layer
**Endpoints:**
- `GET /api/credentials/:userId/:connectionId` - Retrieve 
- `POST /api/connections/save` - Store connection configur
- `DELETE /api/connections/:userId/:connectionId` - Delete

- File-based persistence in `server/data/` directory
- Automatic cleanup of expired data
#### 3. Service Management
**Endpoints:**
- `POST /restart` - Graceful restart endpoint

- Process monitoring and management
- Graceful shutdown handling
### Data Flow
1. **Initialization**: Frontend checks proxy health (`/he
3. **Redirect**: Bullhorn redirects to `/oauth/callback?co
5. **Communication**: Success page posts message to opene
7. **Cleanup**: Code is removed after retrieval or 5-minut
---
## 

Sta

```

- OAuth proxy serve

Check the proxy health:

```
Expected response:
{

  "timestamp": "20
  "pendingAuths": 0,
}






```
---
## Dependencies
### Required Dependencies
The proxy server requires these npm packages:
```json
  "express": "^5.2.1",      // Web server framework
}


{
}










- `code` (string, required) - Autho
- `error` (string, option




```
**Success Response:**
<html>
  <script>
      type: 'OAUTH_SUCCESS', 
      state: 'abc123'
  </script>

---

Poll for authoriza



  "success": true,


```json
  "

**Example:**
curl http://localhost:3001/oa






  "user
  "credentials": {
   

}

`
  "success": true
```
---
#### `GET /api/credentials/:userId/:connec
Retrieve stored crede
**Response:**
{
 
   

```

#### `POST /api/connections/save`

**R
{
  "

    "environment": "PROD",
  }
```
**R

}





```json

  "vers
 
  "port": 3001
```
-
###

**Response:**

  "mess
}




# Proxy server p

VITE_PROXY_URL=http://localhost:3001



   

2. 

   ```

---

### Running Separately

npm run dev:proxy

```bash
```
Start both together:
npm run dev


```bash
```
Or manually:

```
###
Enable detailed logging by checking the proxy terminal output:
```

💾 Stored auth code f
✅ Code 





{
    "start": "concurr
}

- Rende
- F

###

**Step 1: Deploy proxy server**

```

VITE_PROXY_URL=http


```
**Recom
-
- DigitalOcean App
---
#
Cre



R
COPY server ./serv
E
CMD

```bash
docker 





2. Click "Open Authorization Pop

6. The code will be extracted and

Some Bullhorn configurations allow omitting t

3. Extracts code 



2. Update `VITE_PROXY_URL` to



   ```bash
   ```
2. 
 
   






```

**S



# Restart

---
### Pro
*

1. Check if proxy is r
   curl http://localhost:3



 
   

###



3. Ensure protocol (http/https

---
### Cod
*

1. Check browser 
3. Check if proxy suc
5. Try manual code entry 
---
### CORS Errors
**Symptom:**

1
3. 




- ✅ Codes are dec
-


- ⚠

---

#### 1. Restrict C

  origin: ['https://yo



i
const limiter = rateLi
  max: 100 // limit each IP

```
#### 3. Validate State
```javascript
const validSta
/
val

  r



import Redis from 'ioredis';

app.get('/oau
  
 
  // ... rest of h
```
#### 5. Add Authentication
`


  i

  try {

  } catch (error) {


```
#### 6. Enable 

import fs from 'fs';
const options = {
  c

```

```javascript

```
#### 8. Sanitize
```javascript


  // Validate inp
    retur
  
    return res.status(400).json({ error
  





- [OAUTH_PROXY_GUIDE.md






imp


const c
// Generate stat







- **Flexibility** - Supp


















































































































































































































































































































































































































































