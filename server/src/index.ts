import express from 'express';
import cors from 'cors';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import type { Request, Response } from 'express';

import { env } from './env';
import { migrate } from './db';
import { authMiddleware } from './middleware/auth';
import entriesRouter from './routes/entries';

type RegisteredClient = {
  clientId: string;
  clientSecret?: string;
  redirectUris: string[];
};

type StoredAuthCode = {
  clientId: string;
  redirectUri: string;
  expiresAt: number;
};

const app = express();
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const authCodes = new Map<string, StoredAuthCode>();
const registeredClients = new Map<string, RegisteredClient>();

let keyPair: Awaited<ReturnType<typeof generateKeyPair>> | null = null;
let jwksCache: { keys: any[] } | null = null;

async function getKeyPair() {
  if (!keyPair) {
    keyPair = await generateKeyPair('RS256');
    const publicKey = await exportJWK(keyPair.publicKey);
    jwksCache = {
      keys: [
        {
          ...publicKey,
          use: 'sig',
          alg: 'RS256',
          kid: 'mock-key-1',
        },
      ],
    };
  }

  return keyPair;
}

app.post('/api/auth/register-client', (req: Request, res: Response) => {
  const { client_id, client_secret, redirect_uri } = req.body ?? {};

  if (!client_id) {
    return res.status(400).json({ error: 'Missing client_id' });
  }

  if (!registeredClients.has(client_id)) {
    registeredClients.set(client_id, {
      clientId: client_id,
      clientSecret: client_secret,
      redirectUris: redirect_uri ? [redirect_uri] : [],
    });
    console.log(`[server] Auto-registered client: ${client_id}`);
  } else if (redirect_uri) {
    const client = registeredClients.get(client_id)!;
    if (!client.redirectUris.includes(redirect_uri)) {
      client.redirectUris.push(redirect_uri);
    }
  }

  res.json({
    client_id,
    message: 'Client registered successfully (development mode)',
  });
});

app.post('/api/auth/code', (req: Request, res: Response) => {
  const { code, client_id, redirect_uri } = req.body ?? {};

  if (!code || !client_id || !redirect_uri) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  if (!registeredClients.has(client_id)) {
    registeredClients.set(client_id, {
      clientId: client_id,
      redirectUris: [redirect_uri],
    });
    console.log(`[server] Auto-registered client during code registration: ${client_id}`);
  }

  authCodes.set(code, {
    clientId: client_id,
    redirectUri: redirect_uri,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  res.json({ ok: true });
});

app.get('/api/auth/jwks', async (_req: Request, res: Response) => {
  try {
    await getKeyPair();
    res.json(jwksCache);
  } catch (error: any) {
    console.error('[server] Error generating JWKS:', error);
    res.status(500).json({ error: 'Failed to generate JWKS' });
  }
});

app.post('/api/auth/tokens', async (req: Request, res: Response) => {
  try {
    const { grant_type, code, redirect_uri, client_id, client_secret } = req.body ?? {};

    if (grant_type !== 'authorization_code') {
      return res.status(400).json({ error: 'unsupported_grant_type' });
    }

    if (!code || !redirect_uri || !client_id) {
      return res.status(400).json({ error: 'invalid_request', error_description: 'Missing required parameters' });
    }

    if (!registeredClients.has(client_id)) {
      registeredClients.set(client_id, {
        clientId: client_id,
        clientSecret: client_secret,
        redirectUris: [redirect_uri],
      });
      console.log(`[server] Auto-registered client during token exchange: ${client_id}`);
    }

    let isValidCode = false;
    if (typeof code === 'string' && code.startsWith('mock_auth_code_')) {
      const parts = code.split('_');
      if (parts.length >= 4) {
        const timestamp = Number(parts[3]);
        const age = Date.now() - timestamp;
        isValidCode = age < 10 * 60 * 1000 && age >= 0;
      }
    } else {
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
        console.log(`[server] Accepting unregistered code in development mode: ${String(code).substring(0, 20)}...`);
        isValidCode = true;
      }
    }

    if (!isValidCode) {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'Invalid authorization code' });
    }

    const { privateKey } = await getKeyPair();
    const now = Math.floor(Date.now() / 1000);

    const accessToken = await new SignJWT({
      sub: 'mock-user-123',
      name: 'Mock User',
      email: 'mock@example.com',
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'mock-key-1' })
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .setIssuer(`http://localhost:${env.PORT}`)
      .setAudience(client_id)
      .sign(privateKey);

    const refreshToken = await new SignJWT({
      sub: 'mock-user-123',
      type: 'refresh',
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'mock-key-1' })
      .setIssuedAt(now)
      .setExpirationTime(now + 86400 * 7)
      .setIssuer(`http://localhost:${env.PORT}`)
      .setAudience(client_id)
      .sign(privateKey);

    res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: 3600,
    });
  } catch (error: any) {
    console.error('[server] Token exchange error:', error);
    res.status(500).json({ error: 'server_error', error_description: error.message });
  }
});

app.get('/auth/authenticate', (req: Request, res: Response) => {
  const { client_id, redirect_uri, state } = req.query;

  if (!client_id || !redirect_uri) {
    return res.status(400).send('Missing client_id or redirect_uri');
  }

  if (!registeredClients.has(client_id as string)) {
    registeredClients.set(client_id as string, {
      clientId: client_id as string,
      redirectUris: [redirect_uri as string],
    });
    console.log(`[server] Auto-registered client during login: ${client_id}`);
  } else {
    const client = registeredClients.get(client_id as string)!;
    if (!client.redirectUris.includes(redirect_uri as string)) {
      client.redirectUris.push(redirect_uri as string);
    }
  }

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
      
      const code = 'mock_auth_code_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      
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
        if (window.opener) {
          window.opener.postMessage({
            type: 'iaa-auth-callback',
            code: code,
            state: state
          }, window.location.origin);
          window.close();
        } else {
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

app.get('/api/auth/clients/:clientId', (req: Request, res: Response) => {
  const { clientId } = req.params;
  const client = registeredClients.get(clientId);

  if (client) {
    res.json({
      client_id: clientId,
      registered: true,
      redirect_uris: client.redirectUris,
    });
  } else {
    registeredClients.set(clientId, {
      clientId,
      redirectUris: [],
    });
    console.log(`[server] Auto-registered client via validation endpoint: ${clientId}`);
    res.json({
      client_id: clientId,
      registered: true,
      auto_registered: true,
      message: 'Client auto-registered (development mode)',
    });
  }
});

app.get('/health', (_req: Request, res: Response) =>
  res.json({
    ok: true,
    service: 'secret-diary-server',
    registered_clients: Array.from(registeredClients.keys()),
  }),
);

app.use('/entries', authMiddleware, entriesRouter);

Promise.all([migrate(), getKeyPair()])
  .then(() => {
    app.listen(env.PORT, () => {
      console.log(`[server] listening on http://localhost:${env.PORT}`);
      console.log(`[server] JWKS endpoint: http://localhost:${env.PORT}/api/auth/jwks`);
      console.log(`[server] Login endpoint: http://localhost:${env.PORT}/auth/authenticate`);
    });
  })
  .catch((e) => {
    console.error('[server] startup failed', e);
    process.exit(1);
  });
