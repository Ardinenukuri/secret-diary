import { Router } from 'express';
import { pool } from '../db';
import type { AuthedRequest } from '../middleware/auth';

const router = Router();


router.get('/', async (req: AuthedRequest, res) => {
  try {
    const userId = req.user?.sub; 
    if (!userId) {
      return res.status(400).json({ error: 'User ID not found in token' });
    }
    const result = await pool.query(
      'SELECT * FROM entries WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('[entries] GET error:', error);
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

router.post('/', async (req: AuthedRequest, res) => {
  try {
    const userId = req.user?.sub;
    const { content } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID not found in token' });
    }
    if (!content) {
      return res.status(400).json({ error: 'Content cannot be empty' });
    }

    const result = await pool.query(
      'INSERT INTO entries (user_id, content) VALUES ($1, $2) RETURNING *',
      [userId, content]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[entries] POST error:', error);
    res.status(500).json({ error: 'Failed to create entry' });
  }
});

export default router;