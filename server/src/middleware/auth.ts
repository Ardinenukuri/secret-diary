import type { Request, Response, NextFunction } from 'express';
import { importSPKI, jwtVerify, type KeyLike } from 'jose';

export type AuthedRequest = Request & {
  user?: {
    sub: string;
    [key: string]: any;
  };
};

let localPublicKey: KeyLike;

export async function authMiddleware(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    if (!localPublicKey) {
      console.log('[authMiddleware] Initializing static public key from environment...');
      const publicKeyPem = process.env.IAA_PUBLIC_KEY?.replace(/\\n/g, '\n');
      if (!publicKeyPem) {
        throw new Error('IAA_PUBLIC_KEY is not configured in environment variables.');
      }
      localPublicKey = await importSPKI(publicKeyPem, 'RS256');
    }

    const header = req.header('authorization');
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or malformed bearer token' });
    }
    const token = header.slice(7);

    const { payload } = await jwtVerify(token, localPublicKey);
    console.log("Successfully verified token for user:", payload.sub);

    if (typeof payload.sub !== 'string') {
      console.error('[authMiddleware] Token is missing the required "sub" (subject) claim.');
      return res.status(401).json({ error: 'Unauthorized: Invalid token claims' });
    }

    req.user = { 
      ...(payload as { [key: string]: any }), 
      sub: payload.sub 
    };
    
    next();
  } catch (e: any) {
    console.error('[authMiddleware] Static key validation failed:', e.message);
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
}