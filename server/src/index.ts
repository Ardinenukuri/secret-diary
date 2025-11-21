import express from 'express';
import cors from 'cors';
import { env } from './env';
import { migrate } from './db';
import { authMiddleware } from './middleware/auth';
import entriesRouter from './routes/entries';
import type { Request, Response } from 'express';

const app = express();
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => res.json({ ok: true }));

app.use('/entries', authMiddleware, entriesRouter);

migrate()
  .then(() => {
    app.listen(env.PORT, () => {
      console.log(`[server] listening on http://localhost:${env.PORT}`);
    });
  })
  .catch((e) => {
    console.error('[server] migration failed', e);
    process.exit(1);
  });
