import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().url().default('http://localhost:3001'),
  IAA_AUTH_BACKEND_URL: z.string().url().default('http://localhost:5000'),
});

export const env = envSchema.parse(process.env);