import type { Request, Response, NextFunction } from 'express';
import { env } from '../env';

export type AuthedRequest = Request & { user?: { id: string; [k: string]: unknown } };

export async function authMiddleware(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const header = req.header('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) return res.status(401).json({ error: 'Missing bearer token' });

    if (!env.IAA_AUTH_URL) return res.status(500).json({ error: 'Auth server not configured' });

    const userinfoUrl = new URL('/api/auth/userinfo', env.IAA_AUTH_URL).toString();
    const r = await fetch(userinfoUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!r.ok) {
      const t = await r.text();
      return res.status(401).json({ error: 'Invalid token', details: t });
    }
    const user = await r.json();
    // Expecting at least a stable user id field
    const id = user.sub || user.id || user.user_id || user.email;
    if (!id) return res.status(400).json({ error: 'Userinfo missing id' });

    req.user = { id, ...user };
    next();
  } catch (e: any) {
    res.status(500).json({ error: 'Auth error', message: e?.message ?? String(e) });
  }
}
