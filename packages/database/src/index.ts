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

// Cache for lazy-initialized database connection
let _db: ReturnType<typeof createDatabaseConnection> | null = null;

/**
 * Get database instance with lazy initialization
 * In development: uses process.env.DATABASE_URL
 * In Cloudflare Workers: requires DATABASE_URL to be passed in
 */
export function getDb(databaseUrl?: string) {
  if (!_db) {
    const url = databaseUrl ||
                (typeof process !== 'undefined' ? process.env.DATABASE_URL : undefined) ||
                (globalThis as any).DATABASE_URL;
    
    if (!url) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    
    _db = createDatabaseConnection(url);
  }
  return _db;
}

/**
 * Global database instance for backwards compatibility
 * Only use this in Node.js development environments
 * For Cloudflare Workers, use getDb(databaseUrl) instead
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