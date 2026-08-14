/**
 * AppexQuant Markets Global - Database Migration Runner
 * Executes schema initialization and idempotent migrations against PostgreSQL.
 */

import fs from 'fs';
import path from 'path';
import { getDatabasePool } from './connection.js';
import { logger } from '../observability/logger.js';

export async function runDatabaseMigrations(): Promise<{ success: boolean; error?: string }> {
  const pool = getDatabasePool();
  try {
    const schemaPath = path.join(process.cwd(), 'src/db/schema.sql');
    if (!fs.existsSync(schemaPath)) {
      return { success: false, error: 'schema.sql file not found' };
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      await client.query(schemaSql);
      await client.query('COMMIT');
      logger.info('Database migrations executed successfully.');
      return { success: true };
    } catch (err: any) {
      await client.query('ROLLBACK');
      logger.error('Migration execution failed, transaction rolled back', { error: err.message });
      return { success: false, error: err.message };
    } finally {
      client.release();
    }
  } catch (err: any) {
    logger.error('Failed to connect to database for migrations', { error: err.message });
    return { success: false, error: err.message };
  }
}
