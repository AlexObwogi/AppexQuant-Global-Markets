/**
 * AppexQuant Markets Global - PostgreSQL Database Connection Pool
 * Serverless-compatible PostgreSQL connection manager using `pg`.
 * Optimized for high-concurrency connection pooling (PgBouncer, Prisma Accelerate, Supabase Pooler).
 */

import pkg from 'pg';
const { Pool } = pkg;
import { logger } from '../observability/logger.ts';

let pool: pkg.Pool | null = null;
let isConnectionVerified = false;
let verificationAttempted = false;
let cachedConnectionResult: { success: boolean; latencyMs?: number; error?: string; stats?: PoolStats | null } | null = null;

export interface PoolStats {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
}

export function getDatabasePool(): pkg.Pool {
  if (!pool) {
    let connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      connectionString = 'postgresql://localhost:5432/appexquant';
    }

    // High-concurrency connection pooling parameters
    const maxConnections = parseInt(process.env.DB_POOL_MAX || '25', 10);
    const idleTimeout = parseInt(process.env.DB_IDLE_TIMEOUT_MS || '15000', 10);
    const connectionTimeout = parseInt(process.env.DB_CONN_TIMEOUT_MS || '3000', 10);
    const statementTimeout = parseInt(process.env.DB_STATEMENT_TIMEOUT_MS || '10000', 10);

    const isProd = process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production';

    pool = new Pool({
      connectionString,
      ssl: isProd ? { rejectUnauthorized: false } : undefined,
      max: maxConnections,
      min: 0,
      idleTimeoutMillis: idleTimeout,
      connectionTimeoutMillis: connectionTimeout,
      statement_timeout: statementTimeout,
      application_name: 'AppexQuant-Markets-Global-Pooler',
    });

    pool.on('error', (err) => {
      logger.debug('PostgreSQL client pool notice:', { error: err.message });
    });

    pool.on('connect', (client) => {
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

/**
 * Startup Verification & Retry Strategy
 * Verifies the pooled PostgreSQL connection with exponential backoff retries and strict timeout handling.
 * Caches the result to prevent repeated fallback logs or connection overhead.
 */
export async function testDatabaseConnection(forceRetry = false): Promise<{ success: boolean; latencyMs?: number; error?: string; stats?: PoolStats | null }> {
  if (cachedConnectionResult && !forceRetry) {
    return cachedConnectionResult;
  }

  if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.trim()) {
    cachedConnectionResult = {
      success: false,
      error: 'DATABASE_URL environment variable is missing. Direct PostgreSQL connection is required.',
      stats: null,
    };
    return cachedConnectionResult;
  }

  const maxRetries = 3;
  let lastError = 'Unknown database connection error';
  const start = Date.now();

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const dbPool = getDatabasePool();
      const client = await Promise.race([
        dbPool.connect(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Database connection timeout (3000ms)')), 3000)
        ),
      ]);

      try {
        await client.query('SELECT NOW() AS current_time');
      } finally {
        client.release();
      }

      const latencyMs = Date.now() - start;
      isConnectionVerified = true;
      verificationAttempted = true;
      cachedConnectionResult = { success: true, latencyMs, stats: getPoolStats() };
      return cachedConnectionResult;
    } catch (err: any) {
      lastError = err?.message || String(err);
      if (attempt < maxRetries) {
        const backoffMs = Math.pow(2, attempt) * 250;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  verificationAttempted = true;
  isConnectionVerified = false;
  cachedConnectionResult = {
    success: false,
    error: `PostgreSQL connection failed after ${maxRetries} attempts: ${lastError}`,
    stats: getPoolStats(),
  };

  return cachedConnectionResult;
}

