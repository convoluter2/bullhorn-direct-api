import express from 'express';
import cors from 'cors';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PROXY_PORT || 3001;

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());

const pendingAuths = new Map();
const credentialsStore = new Map();
const connectionsStore = new Map();

const DATA_DIR = path.join(__dirname, 'data');
const CREDENTIALS_FILE = path.join(DATA_DIR, 'credentials.json');
const CONNECTIONS_FILE = path.join(DATA_DIR, 'connections.json');

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create data directory:', error);
  }
}

async function loadPersistedData() {
  await ensureDataDir();
  
  try {
    const credData = await fs.readFile(CREDENTIALS_FILE, 'utf-8');
    const credentials = JSON.parse(credData);
    Object.entries(credentials).forEach(([key, value]) => {
      credentialsStore.set(key, value);
    });
    console.log(`📂 Loaded ${credentialsStore.size} credentials from disk`);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Failed to load credentials:', error);
    }
  }
  
  try {
    const connData = await fs.readFile(CONNECTIONS_FILE, 'utf-8');
    const connections = JSON.parse(connData);
    Object.entries(connections).forEach(([key, value]) => {
      connectionsStore.set(key, value);
    });
    console.log(`📂 Loaded connections for ${connectionsStore.size} users from disk`);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Failed to load connections:', error);
    }
  }
}

async function saveCredentials() {
  try {
    const data = Object.fromEntries(credentialsStore);
    await fs.writeFile(CREDENTIALS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save credentials:', error);
  }
}

async function saveConnections() {
  try {
    const data = Object.fromEntries(connectionsStore);
    await fs.writeFile(CONNECTIONS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save connections:', error);
  }
}

setInterval(() => {
  const now = Date.now();
  const fiveMinutesAgo = now - 300000;
  
  for (const [state, auth] of pendingAuths.entries()) {
    if (auth.timestamp < fiveMinutesAgo) {
      console.log(`🧹 Cleaning up expired auth state: ${state}`);
      pendingAuths.delete(state);
    }
  }
}, 60000);

app.get('/oauth/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;
  
  console.log('📥 OAuth callback received:', { 
    hasCode: !!code, 
    state, 
    hasError: !!error,
    timestamp: new Date().toISOString()
  });

  if (error) {
    console.error('❌ OAuth error:', error, error_description);
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Error</title>
          <style>
            body { 
              font-family: system-ui, -apple-system, sans-serif; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              min-height: 100vh; 
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              background: white;
              padding: 2rem;
              border-radius: 1rem;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              max-width: 500px;
              text-align: center;
            }
            .error { color: #dc2626; font-size: 3rem; margin-bottom: 1rem; }
            h1 { color: #1f2937; margin: 0 0 0.5rem 0; }
            p { color: #6b7280; margin: 0.5rem 0; }
            .close-btn {
              margin-top: 1.5rem;
              padding: 0.75rem 2rem;
              background: #667eea;
              color: white;
              border: none;
              border-radius: 0.5rem;
              font-size: 1rem;
              cursor: pointer;
            }
            .close-btn:hover { background: #5568d3; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error">⚠️</div>
            <h1>Authentication Failed</h1>
            <p><strong>${error}</strong></p>
            <p>${error_description || 'An error occurred during authentication.'}</p>
            <button class="close-btn" onclick="window.close()">Close Window</button>
          </div>
          <script>
            window.opener?.postMessage({ 
              type: 'OAUTH_ERROR', 
              error: '${error}',
              error_description: '${error_description || ''}'
            }, '*');
            setTimeout(() => window.close(), 3000);
          </script>
        </body>
      </html>
    `);
  }

  if (!code) {
    console.error('❌ No authorization code received');
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Error</title>
          <style>
            body { 
              font-family: system-ui, -apple-system, sans-serif; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              min-height: 100vh; 
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              background: white;
              padding: 2rem;
              border-radius: 1rem;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              max-width: 500px;
              text-align: center;
            }
            .error { color: #dc2626; font-size: 3rem; margin-bottom: 1rem; }
            h1 { color: #1f2937; margin: 0 0 0.5rem 0; }
            p { color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error">⚠️</div>
            <h1>No Authorization Code</h1>
            <p>The authentication flow did not return an authorization code.</p>
          </div>
          <script>
            window.opener?.postMessage({ 
              type: 'OAUTH_ERROR', 
              error: 'no_code',
              error_description: 'No authorization code received'
            }, '*');
            setTimeout(() => window.close(), 3000);
          </script>
        </body>
      </html>
    `);
  }

  const decodedCode = decodeURIComponent(code);
  
  console.log('✅ Code received and decoded:', { 
    original: code,
    decoded: decodedCode,
    state 
  });

  if (state) {
    pendingAuths.set(state, {
      code: decodedCode,
      timestamp: Date.now()
    });
    
    console.log(`💾 Stored auth code for state: ${state} (Total pending: ${pendingAuths.size})`);
  }

  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Authentication Successful</title>
        <style>
          body { 
            font-family: system-ui, -apple-system, sans-serif; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            min-height: 100vh; 
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            background: white;
            padding: 2rem;
            border-radius: 1rem;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 500px;
            text-align: center;
          }
          .success { color: #10b981; font-size: 3rem; margin-bottom: 1rem; }
          h1 { color: #1f2937; margin: 0 0 0.5rem 0; }
          p { color: #6b7280; }
          .spinner {
            margin: 1.5rem auto 0;
            border: 3px solid #f3f4f6;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success">✓</div>
          <h1>Authentication Successful</h1>
          <p>Completing authentication...</p>
          <div class="spinner"></div>
        </div>
        <script>
          console.log('🔐 Sending OAuth code to parent window');
          
          if (window.opener) {
            window.opener.postMessage({ 
              type: 'OAUTH_SUCCESS', 
              code: '${decodedCode}',
              state: '${state || ''}'
            }, '*');
            console.log('✅ Message sent to opener');
          } else {
            console.warn('⚠️ No window.opener available');
          }
          
          setTimeout(() => {
            console.log('🔒 Closing authentication window');
            window.close();
          }, 1000);
        </script>
      </body>
    </html>
  `);
});

app.get('/oauth/status/:state', (req, res) => {
  const { state } = req.params;
  const auth = pendingAuths.get(state);
  
  console.log(`🔍 Status check for state: ${state} - Found: ${!!auth}`);
  
  if (auth) {
    res.json({ success: true, code: auth.code });
    pendingAuths.delete(state);
    console.log(`✅ Code retrieved and removed for state: ${state}`);
  } else {
    res.json({ success: false });
  }
});

app.get('/health', (req, res) => {
  const uptime = process.uptime();
  const health = { 
    status: 'healthy', 
    service: 'oauth-proxy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
    pendingAuths: pendingAuths.size,
    port: PORT
  };
  
  res.json(health);
});

app.post('/restart', (req, res) => {
  console.log('');
  console.log('🔄 ═══════════════════════════════════════════════════');
  console.log('🔄 Restart Request Received');
  console.log('═══════════════════════════════════════════════════');
  console.log(`⏰ Time: ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════');
  console.log('');
  
  res.json({ 
    success: true, 
    message: 'Proxy server restarting...',
    timestamp: new Date().toISOString()
  });
  
  setTimeout(() => {
    console.log('');
    console.log('🔄 ═══════════════════════════════════════════════════');
    console.log('🔄 Restarting Proxy Server...');
    console.log('═══════════════════════════════════════════════════');
    console.log('');
    
    pendingAuths.clear();
    
    console.log('✅ Cleared all pending authentications');
    console.log('🔄 Attempting graceful restart...');
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('');
    
    process.exit(0);
  }, 100);
});

app.post('/start', (req, res) => {
  console.log('');
  console.log('🚀 ═══════════════════════════════════════════════════');
  console.log('🚀 Start Request Received');
  console.log('═══════════════════════════════════════════════════');
  console.log(`⏰ Time: ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════');
  console.log('');
  
  res.json({ 
    success: true, 
    message: 'Proxy server is already running',
    status: 'running',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

app.post('/api/credentials/save', async (req, res) => {
  const { userId, connectionId, credentials } = req.body;
  
  if (!userId || !connectionId || !credentials) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const key = `${userId}-${connectionId}`;
  credentialsStore.set(key, credentials);
  await saveCredentials();
  
  console.log(`🔑 Saved credentials for user ${userId}, connection ${connectionId}`);
  
  res.json({ success: true });
});

app.get('/api/credentials/:userId/:connectionId', (req, res) => {
  const { userId, connectionId } = req.params;
  const key = `${userId}-${connectionId}`;
  
  const credentials = credentialsStore.get(key);
  
  if (!credentials) {
    return res.status(404).json({ error: 'Credentials not found' });
  }
  
  console.log(`🔑 Retrieved credentials for user ${userId}, connection ${connectionId}`);
  
  res.json({ credentials });
});

app.delete('/api/credentials/:userId/:connectionId', async (req, res) => {
  const { userId, connectionId } = req.params;
  const key = `${userId}-${connectionId}`;
  
  credentialsStore.delete(key);
  await saveCredentials();
  
  console.log(`🗑️ Deleted credentials for user ${userId}, connection ${connectionId}`);
  
  res.json({ success: true });
});

app.post('/api/connections/save', async (req, res) => {
  const { userId, connection } = req.body;
  
  if (!userId || !connection) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  if (!connectionsStore.has(userId)) {
    connectionsStore.set(userId, []);
  }
  
  const connections = connectionsStore.get(userId);
  const existingIndex = connections.findIndex(c => c.id === connection.id);
  
  if (existingIndex >= 0) {
    connections[existingIndex] = connection;
  } else {
    connections.push(connection);
  }
  
  await saveConnections();
  
  console.log(`💾 Saved connection for user ${userId}: ${connection.name}`);
  
  res.json({ success: true });
});

app.get('/api/connections/:userId', (req, res) => {
  const { userId } = req.params;
  
  const connections = connectionsStore.get(userId) || [];
  
  console.log(`📋 Retrieved ${connections.length} connections for user ${userId}`);
  
  res.json({ connections });
});

app.delete('/api/connections/:userId/:connectionId', async (req, res) => {
  const { userId, connectionId } = req.params;
  
  if (!connectionsStore.has(userId)) {
    return res.json({ success: true });
  }
  
  const connections = connectionsStore.get(userId);
  const filtered = connections.filter(c => c.id !== connectionId);
  connectionsStore.set(userId, filtered);
  
  const credKey = `${userId}-${connectionId}`;
  credentialsStore.delete(credKey);
  
  await saveConnections();
  await saveCredentials();
  
  console.log(`🗑️ Deleted connection for user ${userId}: ${connectionId}`);
  
  res.json({ success: true });
});

app.put('/api/connections/:userId/:connectionId', async (req, res) => {
  const { userId, connectionId } = req.params;
  const { updates } = req.body;
  
  if (!connectionsStore.has(userId)) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const connections = connectionsStore.get(userId);
  const updated = connections.map(conn => 
    conn.id === connectionId ? { ...conn, ...updates } : conn
  );
  connectionsStore.set(userId, updated);
  
  await saveConnections();
  
  console.log(`✏️ Updated connection for user ${userId}: ${connectionId}`);
  
  res.json({ success: true });
});

app.listen(PORT, '0.0.0.0', async () => {
  await loadPersistedData();
  
  console.log('');
  console.log('🚀 ═══════════════════════════════════════════════════');
  console.log('🔐 OAuth Proxy Server Started Successfully');
  console.log('═══════════════════════════════════════════════════');
  console.log(`📍 Port: ${PORT}`);
  console.log(`🔗 Callback: http://localhost:${PORT}/oauth/callback`);
  console.log(`💚 Health: http://localhost:${PORT}/health`);
  console.log(`⏰ Started: ${new Date().toISOString()}`);
  console.log(`💾 Data Directory: ${DATA_DIR}`);
  console.log('═══════════════════════════════════════════════════');
  console.log('');
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});
