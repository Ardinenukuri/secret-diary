import type { Request, Response, NextFunction } from 'express';
export type AuthedRequest = Request & {
  user?: {
    sub: string;
    [key: string]: any;
  };
};

const IAA_SERVER_URL = process.env.IAA_AUTH_BACKEND_URL || 'http://localhost:5000';

let JWKS: ReturnType<typeof import('jose')['createRemoteJWKSet']>;

export async function authMiddleware(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const { createRemoteJWKSet, jwtVerify } = await import('jose');
    
    if (!JWKS) {
      JWKS = createRemoteJWKSet(
        new URL(`${IAA_SERVER_URL}/api/auth/jwks`)
      );
    }
    
    const header = req.header('authorization');
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or malformed bearer token' });
    }
    const token = header.slice(7);

    const { payload } = await jwtVerify(token, JWKS);

    if (typeof payload.sub !== 'string') {
      console.error('[authMiddleware] Missing sub claim on token');
      return res.status(401).json({ error: 'Unauthorized: token missing subject' });
    }

    req.user = { ...(payload as { [key: string]: any }), sub: payload.sub };
    next();
  } catch (e: any) {
    console.error('[authMiddleware] Error:', e.message);
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
}