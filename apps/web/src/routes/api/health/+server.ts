import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

export async function GET(event: RequestEvent) {
	try {
		// Dynamic import to avoid build-time database connection
		const { getDb } = await import('@studypuck/database');
		const { sql } = await import('drizzle-orm');
		
		// Get DATABASE_URL from platform environment for Cloudflare Workers
		const databaseUrl = (event.platform as any)?.env?.DATABASE_URL;
		const db = getDb(databaseUrl);
		
		// Test database connectivity
		const result = await db.execute(sql`SELECT 1 as health_check`);
		
		// Verify database connection returned expected result
		if (!result.rows || result.rows.length === 0 || result.rows[0].health_check !== 1) {
			throw new Error('Database health check failed');
		}

		// Access environment variables through proper Cloudflare types (same pattern as auth)
		const version = (event.platform as any)?.env?.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'unknown';
		const environment = (event.platform as any)?.env?.NODE_ENV || 'unknown';

		return json({
			status: 'healthy',
			timestamp: new Date().toISOString(),
			database: 'connected',
			version,
			environment
		});
	} catch (error) {
		console.error('Health check failed:', error);
		
		return json({
			status: 'unhealthy',
			error: error instanceof Error ? error.message : 'Unknown error',
			timestamp: new Date().toISOString(),
			database: 'disconnected'
		}, { 
			status: 500 
		});
	}
}