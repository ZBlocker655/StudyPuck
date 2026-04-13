import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DatabaseConnection = any;
type PostgresFactory = (
  databaseUrl: string,
  options?: {
    max?: number;
    prepare?: boolean;
  }
) => unknown;
type PostgresDrizzleFactory = (
  client: unknown,
  options: {
    schema: typeof schema;
  }
) => DatabaseConnection;

const nodeConnectionCache = new Map<string, DatabaseConnection>();

function isNodeRuntime() {
  return typeof process !== 'undefined' && Boolean(process.versions?.node);
}

function createNodeDatabaseConnection(databaseUrl: string): DatabaseConnection {
  const cached = nodeConnectionCache.get(databaseUrl);

  if (cached) {
    return cached;
  }

  const moduleApi = process.getBuiltinModule?.('module') as
    | typeof import('node:module')
    | undefined;

  if (!moduleApi) {
    throw new Error('Node module loader is unavailable for direct Postgres connections');
  }

  const require = moduleApi.createRequire(import.meta.url);
  const postgres = require('postgres') as PostgresFactory;
  const { drizzle: drizzlePostgres } = require('drizzle-orm/postgres-js') as {
    drizzle: PostgresDrizzleFactory;
  };

  const client = postgres(databaseUrl, {
    max: 10,
    prepare: false,
  });
  const connection = drizzlePostgres(client, { schema });

  nodeConnectionCache.set(databaseUrl, connection);

  return connection;
}

/**
 * Create a database connection using the HTTP driver.
 * neon-http is stateless and request-scoped — safe for Cloudflare Workers
 * and any serverless environment. Each call creates a lightweight client;
 * no persistent connections are held across requests.
 */
function createDatabaseConnection(databaseUrl: string) {
  if (isNodeRuntime()) {
    return createNodeDatabaseConnection(databaseUrl);
  }

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
