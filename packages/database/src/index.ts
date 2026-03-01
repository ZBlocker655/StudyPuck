import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema.js';

/**
 * Create a database connection using the HTTP driver.
 * neon-http is stateless and request-scoped — safe for Cloudflare Workers
 * and any serverless environment. Each call creates a lightweight client;
 * no persistent connections are held across requests.
 */
function createDatabaseConnection(databaseUrl: string) {
  const sql = neon(databaseUrl);
  return drizzle(sql, { schema });
}

/**
 * Get a database instance for the given (or env-provided) DATABASE_URL.
 * Always creates a fresh client — do not cache the result across requests
 * in Cloudflare Workers (cross-request I/O sharing is not allowed).
 */
export function getDb(databaseUrl?: string) {
  const url = databaseUrl ||
              (typeof process !== 'undefined' ? process.env.DATABASE_URL : undefined) ||
              (globalThis as any).DATABASE_URL;

  if (!url) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  return createDatabaseConnection(url);
}

/**
 * Global database instance for Node.js dev environments only.
 * Uses process.env.DATABASE_URL. Do not use in Cloudflare Workers.
 */
export const db = new Proxy({} as ReturnType<typeof createDatabaseConnection>, {
  get(target, prop) {
    return getDb()[prop as keyof ReturnType<typeof createDatabaseConnection>];
  }
});

// Re-export schema for convenience
export * from './schema.js';

// Re-export operations modules
export * from './users.js';
export * from './cards.js';

// Re-export relations and types
// Note: validation schemas are NOT re-exported here to avoid pulling drizzle-zod
// into the SSR bundle. Import validation via '@studypuck/database/validation'.
export * from './relations.js';
export * from './types.js';

// Export types for use in application
export type Database = typeof db;