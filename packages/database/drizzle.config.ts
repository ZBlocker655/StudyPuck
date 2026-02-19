import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

// Only load .env if it exists (safe for production environments)
const envPath = resolve(__dirname, '../../.env');
if (existsSync(envPath)) {
  config({ path: envPath });
}

export default defineConfig({
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});