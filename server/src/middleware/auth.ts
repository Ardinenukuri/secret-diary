import type { Request, Response, NextFunction } from 'express';

export type AuthedRequest = Request & {
  user?: {
    sub: string;
    [key: string]: any;
  };
};

const IAA_SERVER_URL = process.env.IAA_IAA_AUTH_BACKEND_URL || 'http://localhost:5000';


export async function authMiddleware(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const header = req.header('authorization');
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or malformed bearer token' });
    }
    const token = header.slice(7);

    // 1. Call the IAA server's introspection endpoint.
    const introspectionResponse = await fetch(`${IAA_SERVER_URL}/api/auth/introspect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: token }),
    });

    if (!introspectionResponse.ok) {
      throw new Error(`Introspection endpoint returned an error status: ${introspectionResponse.status}`);
    }

    const result = await introspectionResponse.json();

    // 2. Check the "active" status from the IAA server's response.
    if (result.active === true) {
      // 3. If the token is active, attach the user payload and proceed.
      req.user = {
        sub: result.sub,
        ...result,
      };
      next();
    } else {
      // If the token is not active, deny access.
      res.status(401).json({ error: 'Unauthorized: Token is not active' });
    }
  } catch (e: any) {
    console.error('[authMiddleware] Introspection Error:', e.message);
    res.status(500).json({ error: 'Authentication service error' });
  }
}