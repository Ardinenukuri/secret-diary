import type { Request, Response, NextFunction } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';

export type AuthedRequest = Request & {
  user?: {
    sub: string; 
    [key: string]: any; 
  };
};

const IAA_SERVER_URL = process.env.IAA_AUTH_BACKEND_URL || 'http://localhost:5000';

const JWKS = createRemoteJWKSet(
  new URL(`${IAA_SERVER_URL}/api/auth/jwks`)
);

export async function authMiddleware(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const header = req.header('authorization');
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or malformed bearer token' });
    }
    const token = header.slice(7); 
    const { payload } = await jwtVerify(token, JWKS);
    if (!payload.sub) {
      return res.status(401).json({ error: 'Invalid token: missing sub claim' });
    }
    req.user = payload as AuthedRequest['user'];
    next();
  } catch (e: any) {
    console.error('Auth middleware error:', e.message);
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
}