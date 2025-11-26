import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { migrate } from './db';
import { authMiddleware } from './middleware/auth';
import entriesRouter from './routes/entries';
import type { Request, Response } from 'express';

dotenv.config();

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => res.json({ ok: true }));

// This is the protected route. The authMiddleware runs on every request.
app.use('/entries', authMiddleware, entriesRouter);

const PORT = process.env.PORT || 4000;

migrate()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[server] Backend listening on http://localhost:${PORT}`);
    });
  })
  .catch((e) => {
    console.error('[server] migration failed', e);
    process.exit(1);
  });