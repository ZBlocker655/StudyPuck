import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import * as schema from './schema.js';

// Configure Neon for serverless environments (Cloudflare Workers)
neonConfig.fetchConnectionCache = true;

/**
 * Create a database connection
 * Works in both Node.js development and Cloudflare Workers production
 */
function createDatabaseConnection(databaseUrl: string) {
  const pool = new Pool({ connectionString: databaseUrl });
  return drizzle(pool, { schema });
}

/**
 * Global database instance
 * In development: connects directly to Neon
 * In production: uses Cloudflare Workers environment variable
 */
export const db = createDatabaseConnection(
  process.env.DATABASE_URL || 
  (globalThis as any).DATABASE_URL || 
  (() => { throw new Error('DATABASE_URL environment variable is required'); })()
);

// Re-export schema for convenience
export * from './schema.js';

// Re-export operations modules
export * from './users.js';
export * from './cards.js';

// Export types for use in application
export type Database = typeof db;