import { json } from '@sveltejs/kit';

export async function GET() {
	try {
		// Dynamic import to avoid build-time database connection
		const { db } = await import('@studypuck/database');
		const { sql } = await import('drizzle-orm');
		
		// Test database connectivity
		const result = await db.execute(sql`SELECT 1 as health_check`);
		
		// Verify database connection returned expected result
		if (!result.rows || result.rows.length === 0 || result.rows[0].health_check !== 1) {
			throw new Error('Database health check failed');
		}

		return json({
			status: 'healthy',
			timestamp: new Date().toISOString(),
			database: 'connected',
			version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'unknown',
			environment: process.env.NODE_ENV || 'unknown'
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