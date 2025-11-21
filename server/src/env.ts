import dotenv from 'dotenv';
dotenv.config();

export const env = {
  PORT: process.env.SERVER_PORT ? Number(process.env.SERVER_PORT) : 4000,
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  DATABASE_URL: process.env.DATABASE_URL ?? '',
  IAA_AUTH_URL: process.env.IAA_AUTH_URL ?? process.env.NEXT_PUBLIC_IAA_AUTH_URL ?? '',
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:3001'
};

if (!env.DATABASE_URL) {
  console.warn('[env] DATABASE_URL not set. Set it in server .env file.');
}
if (!env.IAA_AUTH_URL) {
  console.warn('[env] IAA_AUTH_URL not set. Using NEXT_PUBLIC_IAA_AUTH_URL if available.');
}
