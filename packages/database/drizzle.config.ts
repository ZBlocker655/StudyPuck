import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is required. Use a secure env injection command before running Drizzle migrations.'
  );
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
