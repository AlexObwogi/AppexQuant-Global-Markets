/**
 * AppexQuant Markets Global - Database Initialization Helper
 * Automatically runs migrations and seeds database on server start if connected.
 */

import { testDatabaseConnection } from './connection';
import { runDatabaseMigrations } from './migrations';
import { seedDatabase } from './seed';
import { logger } from '../observability/logger';

export async function initializeDatabaseSystem(): Promise<void> {
  const connTest = await testDatabaseConnection();
  if (connTest.success) {
    logger.info(`PostgreSQL database connected successfully (Latency: ${connTest.latencyMs}ms). Initializing schema & seed data...`);
    const migResult = await runDatabaseMigrations();
    if (migResult.success) {
      await seedDatabase();
    } else {
      logger.error('Database migration failed during startup', { error: migResult.error });
    }
  } else {
    logger.warn(`PostgreSQL database connection unavailable (${connTest.error}). Running in memory fallback mode.`);
  }
}
