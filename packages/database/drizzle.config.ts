import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

// Only load .env if it exists (safe for production environments)
const envPath = resolve(__dirname, '../../apps/web/.env');
if (existsSync(envPath)) {
  config({ path: envPath });
}

export default defineConfig({
  schema: ['./src/schema/users.ts', './src/schema/cards.ts', './src/schema/card-entry.ts', './src/schema/card-review.ts', './src/schema/translation-drills.ts'],
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});