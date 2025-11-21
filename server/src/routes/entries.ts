import { Router } from 'express';
import { pool } from '../db';
import type { AuthedRequest } from '../middleware/auth';
import { z } from 'zod';
import type { Response } from 'express';

const router = Router();

const bodySchema = z.object({ content: z.string().min(1).max(10000) });

router.get('/', async (req: AuthedRequest, res: Response) => {
  const userId = req.user!.id;
  const { rows } = await pool.query(
    'SELECT id, content, created_at, updated_at FROM diary_entries WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  res.json(rows);
});

router.post('/', async (req: AuthedRequest, res: Response) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body', issues: parsed.error.flatten() });
  const userId = req.user!.id;
  const { content } = parsed.data;
  const { rows } = await pool.query(
    "INSERT INTO diary_entries (user_id, content) VALUES ($1, $2) RETURNING id, content, created_at, updated_at",
    [userId, content]
  );
  res.status(201).json(rows[0]);
});

router.put('/:id', async (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body', issues: parsed.error.flatten() });
  const userId = req.user!.id;
  const { content } = parsed.data;
  const { rowCount, rows } = await pool.query(
    `UPDATE diary_entries SET content=$1, updated_at=NOW() WHERE id=$2 AND user_id=$3 RETURNING id, content, created_at, updated_at`,
    [content, id, userId]
  );
  if (rowCount === 0) return res.status(404).json({ error: 'Entry not found' });
  res.json(rows[0]);
});

router.delete('/:id', async (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
  const userId = req.user!.id;
  const { rowCount } = await pool.query('DELETE FROM diary_entries WHERE id=$1 AND user_id=$2', [id, userId]);
  if (rowCount === 0) return res.status(404).json({ error: 'Entry not found' });
  res.status(204).end();
});

export default router;
