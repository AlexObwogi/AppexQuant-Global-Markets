/**
 * AppexQuant Markets Global - PostgreSQL Database Connection Pool
 * Serverless-compatible PostgreSQL connection manager using `pg`.
 * Optimized for high-concurrency connection pooling (PgBouncer, Prisma Accelerate, Supabase Pooler).
 */

import pkg from 'pg';
const { Pool } = pkg;
import { logger } from '../observability/logger.ts';

let pool: pkg.Pool | null = null;

export interface PoolStats {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
}

export function getDatabasePool(): pkg.Pool {
  if (!pool) {
    let connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      logger.warn('DATABASE_URL environment variable is not defined. Database operations will operate in memory-fallback mode if unconfigured.');
    }

    // High-concurrency connection pooling parameters
    const maxConnections = parseInt(process.env.DB_POOL_MAX || '25', 10);
    const idleTimeout = parseInt(process.env.DB_IDLE_TIMEOUT_MS || '15000', 10);
    const connectionTimeout = parseInt(process.env.DB_CONN_TIMEOUT_MS || '3000', 10);
    const statementTimeout = parseInt(process.env.DB_STATEMENT_TIMEOUT_MS || '10000', 10);

    pool = new Pool({
      connectionString: connectionString || 'postgres://appexquant:appexquant_secure_pass@localhost:5432/appexquant_markets',
      ssl: process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
      max: maxConnections,
      min: 2,
      idleTimeoutMillis: idleTimeout,
      connectionTimeoutMillis: connectionTimeout,
      statement_timeout: statementTimeout,
      application_name: 'AppexQuant-Markets-Global-Pooler',
    });

    pool.on('error', (err) => {
      logger.error('Unexpected error on idle PostgreSQL client pool', { error: err.message });
    });

    pool.on('connect', (client) => {
      // Set query performance and isolation flags on new pooled client
      client.query(`SET statement_timeout = ${statementTimeout};`).catch(() => {});
    });
  }

  return pool;
}

export function getPoolStats(): PoolStats | null {
  if (!pool) return null;
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
}

export async function testDatabaseConnection(): Promise<{ success: boolean; latencyMs?: number; error?: string; stats?: PoolStats | null }> {
  if (!process.env.DATABASE_URL) {
    return { success: false, error: 'DATABASE_URL environment variable is not defined. Operating in memory-fallback mode.' };
  }
  const dbPool = getDatabasePool();
  const start = Date.now();
  try {
    const client = await dbPool.connect();
    await client.query('SELECT NOW() AS current_time');
    client.release();
    const latencyMs = Date.now() - start;
    return { success: true, latencyMs, stats: getPoolStats() };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to connect to PostgreSQL database' };
  }
}
