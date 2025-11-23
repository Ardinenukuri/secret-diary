import express from 'express';
import cors from 'cors';
import { generateKeyPair, exportJWK, SignJWT, jwtVerify, importJWK } from 'jose';
import type { Request, Response } from 'express';

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 5000;

// Generate or reuse a key pair for signing JWTs
let keyPair: { publicKey: CryptoKey; privateKey: CryptoKey } | null = null;
let jwksCache: any = null;

async function getKeyPair() {
  if (!keyPair) {
    keyPair = await generateKeyPair('RS256');
    // Cache the JWKS
    const publicKey = await exportJWK(keyPair.publicKey);
    jwksCache = {
      keys: [{
        ...publicKey,
        use: 'sig',
        alg: 'RS256',
        kid: 'mock-key-1'
      }]
    };
  }
  return keyPair;
}

// Store authorization codes temporarily (in production, use a proper database)
const authCodes = new Map<string, { clientId: string; redirectUri: string; expiresAt: number }>();

// Store registered clients (for development, auto-register any client)
const registeredClients = new Map<string, { clientId: string; clientSecret?: string; redirectUris: string[] }>();

// Auto-register client endpoint (for development - accepts any client)
app.post('/api/auth/register-client', (req: Request, res: Response) => {
  const { client_id, client_secret, redirect_uri } = req.body;
  
  if (!client_id) {
    return res.status(400).json({ error: 'Missing client_id' });
  }

  // Auto-register the client for development
  if (!registeredClients.has(client_id)) {
    registeredClients.set(client_id, {
      clientId: client_id,
      clientSecret: client_secret,
      redirectUris: redirect_uri ? [redirect_uri] : []
    });
    console.log(`[auth-server] Auto-registered client: ${client_id}`);
  } else {
    // Add redirect URI if not already present
    const client = registeredClients.get(client_id)!;
    if (redirect_uri && !client.redirectUris.includes(redirect_uri)) {
      client.redirectUris.push(redirect_uri);
    }
  }

  res.json({ 
    client_id,
    message: 'Client registered successfully (development mode)'
  });
});

// Endpoint to register authorization codes (called by login page)
app.post('/api/auth/code', (req: Request, res: Response) => {
  const { code, client_id, redirect_uri } = req.body;
  if (!code || !client_id || !redirect_uri) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  // Auto-register client if not already registered (development mode)
  if (!registeredClients.has(client_id)) {
    registeredClients.set(client_id, {
      clientId: client_id,
      redirectUris: [redirect_uri]
    });
    console.log(`[auth-server] Auto-registered client during code registration: ${client_id}`);
  }

  // Store code with 10 minute expiration
  authCodes.set(code, {
    clientId: client_id,
    redirectUri: redirect_uri,
    expiresAt: Date.now() + 10 * 60 * 1000
  });
  res.json({ ok: true });
});

// JWKS endpoint - required by the server middleware
app.get('/api/auth/jwks', async (_req: Request, res: Response) => {
  try {
    await getKeyPair();
    res.json(jwksCache);
  } catch (error: any) {
    console.error('Error generating JWKS:', error);
    res.status(500).json({ error: 'Failed to generate JWKS' });
  }
});

// Token exchange endpoint
app.post('/api/auth/tokens', async (req: Request, res: Response) => {
  try {
    const { grant_type, code, redirect_uri, client_id, client_secret } = req.body;

    if (grant_type !== 'authorization_code') {
      return res.status(400).json({ error: 'unsupported_grant_type' });
    }

    if (!code || !redirect_uri || !client_id) {
      return res.status(400).json({ error: 'invalid_request', error_description: 'Missing required parameters' });
    }

    // Auto-register client if not already registered (development mode)
    if (!registeredClients.has(client_id)) {
      registeredClients.set(client_id, {
        clientId: client_id,
        clientSecret: client_secret,
        redirectUris: [redirect_uri]
      });
      console.log(`[auth-server] Auto-registered client during token exchange: ${client_id}`);
    }

    // For mock server: accept codes that start with "mock_auth_code_", check stored codes, or accept any code in dev mode
    let isValidCode = false;
    if (code.startsWith('mock_auth_code_')) {
      // Extract timestamp from code (format: mock_auth_code_TIMESTAMP_RANDOM)
      const parts = code.split('_');
      if (parts.length >= 4) {
        const timestamp = parseInt(parts[3]);
        const age = Date.now() - timestamp;
        // Accept codes less than 10 minutes old
        isValidCode = age < 10 * 60 * 1000 && age >= 0;
      }
    } else {
      // Check stored codes first
      const codeData = authCodes.get(code);
      if (codeData) {
        if (codeData.expiresAt < Date.now()) {
          authCodes.delete(code);
          return res.status(400).json({ error: 'invalid_grant', error_description: 'Authorization code expired' });
        }
        if (codeData.clientId !== client_id || codeData.redirectUri !== redirect_uri) {
          return res.status(400).json({ error: 'invalid_grant', error_description: 'Client ID or redirect URI mismatch' });
        }
        isValidCode = true;
        authCodes.delete(code);
      } else {
        // Development mode: accept any code format (for testing with real IAA backend codes)
        // In production, this should be removed and only accept registered codes
        console.log(`[auth-server] Accepting unregistered code in development mode: ${code.substring(0, 20)}...`);
        isValidCode = true;
      }
    }

    if (!isValidCode) {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'Invalid authorization code' });
    }

    // Generate JWT tokens
    const { privateKey } = await getKeyPair();
    const now = Math.floor(Date.now() / 1000);

    const accessToken = await new SignJWT({ 
      sub: 'mock-user-123',
      name: 'Mock User',
      email: 'mock@example.com'
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'mock-key-1' })
      .setIssuedAt(now)
      .setExpirationTime(now + 3600) // 1 hour
      .setIssuer('http://localhost:5000')
      .setAudience(client_id)
      .sign(privateKey);

    const refreshToken = await new SignJWT({ 
      sub: 'mock-user-123',
      type: 'refresh'
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'mock-key-1' })
      .setIssuedAt(now)
      .setExpirationTime(now + 86400 * 7) // 7 days
      .setIssuer('http://localhost:5000')
      .setAudience(client_id)
      .sign(privateKey);

    res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: 3600
    });
  } catch (error: any) {
    console.error('Token exchange error:', error);
    res.status(500).json({ error: 'server_error', error_description: error.message });
  }
});

// Login page endpoint
app.get('/auth/authenticate', (req: Request, res: Response) => {
  const { client_id, redirect_uri, state, response_type } = req.query;

  if (!client_id || !redirect_uri) {
    return res.status(400).send('Missing client_id or redirect_uri');
  }

  // Auto-register client if not already registered (development mode)
  if (!registeredClients.has(client_id as string)) {
    registeredClients.set(client_id as string, {
      clientId: client_id as string,
      redirectUris: [redirect_uri as string]
    });
    console.log(`[auth-server] Auto-registered client during login: ${client_id}`);
  } else {
    // Validate redirect URI matches registered URIs (for development, be lenient)
    const client = registeredClients.get(client_id as string)!;
    if (!client.redirectUris.includes(redirect_uri as string)) {
      client.redirectUris.push(redirect_uri as string);
    }
  }

  // Simple HTML login page
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>IST Africa Auth - Login</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .login-container {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      max-width: 400px;
      width: 100%;
    }
    h1 {
      margin-top: 0;
      color: #333;
    }
    button {
      width: 100%;
      padding: 12px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 16px;
      cursor: pointer;
      margin-top: 1rem;
    }
    button:hover {
      background: #5568d3;
    }
    .info {
      font-size: 14px;
      color: #666;
      margin-top: 1rem;
    }
  </style>
</head>
<body>
  <div class="login-container">
    <h1>IST Africa Auth</h1>
    <p>Mock authentication server for development</p>
    <button onclick="handleLogin()">Login as Mock User</button>
    <div class="info">
      This is a development mock server. In production, this would be a real authentication page.
    </div>
  </div>
  <script>
    function handleLogin() {
      const params = new URLSearchParams(window.location.search);
      const redirectUri = params.get('redirect_uri');
      const state = params.get('state');
      
      // Generate a mock authorization code
      const code = 'mock_auth_code_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      
      // Register the code with the server
      fetch('/api/auth/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code,
          client_id: params.get('client_id'),
          redirect_uri: redirectUri
        })
      }).then(response => {
        if (!response.ok) {
          return response.json().then(err => {
            throw new Error(err.error || 'Failed to register authorization code');
          });
        }
        return response.json();
      }).then(() => {
        // Send message to parent window if in popup
        if (window.opener) {
          window.opener.postMessage({
            type: 'iaa-auth-callback',
            code: code,
            state: state
          }, window.location.origin);
          window.close();
        } else {
          // Redirect directly if not in popup
          const url = new URL(redirectUri);
          url.searchParams.set('code', code);
          if (state) url.searchParams.set('state', state);
          window.location.href = url.toString();
        }
      }).catch(err => {
        console.error('Failed to register auth code:', err);
        document.getElementById('error-message')?.remove();
        const errorDiv = document.createElement('div');
        errorDiv.id = 'error-message';
        errorDiv.style.color = 'red';
        errorDiv.style.marginTop = '1rem';
        errorDiv.textContent = 'Error: ' + err.message;
        document.querySelector('.login-container')?.appendChild(errorDiv);
      });
    }
  </script>
</body>
</html>
  `;

  res.send(html);
});

// Client validation endpoint (for checking if client is registered)
app.get('/api/auth/clients/:clientId', (req: Request, res: Response) => {
  const { clientId } = req.params;
  const client = registeredClients.get(clientId);
  
  if (client) {
    res.json({ 
      client_id: clientId,
      registered: true,
      redirect_uris: client.redirectUris
    });
  } else {
    // Auto-register for development
    registeredClients.set(clientId, {
      clientId: clientId,
      redirectUris: []
    });
    console.log(`[auth-server] Auto-registered client via validation endpoint: ${clientId}`);
    res.json({ 
      client_id: clientId,
      registered: true,
      auto_registered: true,
      message: 'Client auto-registered (development mode)'
    });
  }
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ 
    ok: true, 
    service: 'iaa-auth-mock-server',
    registered_clients: Array.from(registeredClients.keys())
  });
});

// Initialize key pair on startup
getKeyPair()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[auth-server] Mock IAA Auth server listening on http://localhost:${PORT}`);
      console.log(`[auth-server] JWKS endpoint: http://localhost:${PORT}/api/auth/jwks`);
      console.log(`[auth-server] Login endpoint: http://localhost:${PORT}/auth/authenticate`);
    });
  })
  .catch((error) => {
    console.error('[auth-server] Failed to initialize:', error);
    process.exit(1);
  });

