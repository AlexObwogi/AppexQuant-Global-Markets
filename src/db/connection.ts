/**
 * AppexQuant Markets Global - PostgreSQL Database Connection Pool
 * Serverless-compatible PostgreSQL connection manager using `pg`.
 * Supports connection pooling, graceful error handling, and environment validation.
 */

import pkg from 'pg';
const { Pool } = pkg;
import { logger } from '../observability/logger.js';

let pool: pkg.Pool | null = null;

export function getDatabasePool(): pkg.Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      logger.warn('DATABASE_URL environment variable is not defined. Database operations will operate in memory-fallback mode if unconfigured.');
    }

    pool = new Pool({
      connectionString: connectionString || 'postgres://appexquant:appexquant_secure_pass@localhost:5432/appexquant_markets',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      logger.error('Unexpected error on idle PostgreSQL client', { error: err.message });
    });
  }

  return pool;
}

export async function testDatabaseConnection(): Promise<{ success: boolean; latencyMs?: number; error?: string }> {
  if (!process.env.DATABASE_URL) {
    return { success: false, error: 'DATABASE_URL environment variable is not defined. Operating in memory-fallback mode.' };
  }
  const dbPool = getDatabasePool();
  const start = Date.now();
  try {
    const client = await dbPool.connect();
    await client.query('SELECT NOW()');
    client.release();
    const latencyMs = Date.now() - start;
    return { success: true, latencyMs };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to connect to PostgreSQL database' };
  }
}
