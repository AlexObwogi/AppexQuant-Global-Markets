/**
 * AppexQuant Markets Global - Database Initialization Helper
 * Automatically runs migrations and seeds database on server start if connected.
 */

import { testDatabaseConnection } from './connection.ts';
import { runDatabaseMigrations } from './migrations.ts';
import { seedDatabase } from './seed.ts';
import { logger } from '../observability/logger.ts';
import { verifyDirectDatabaseConnection } from '../lib/db/directPrismaClient.ts';

export async function initializeDatabaseSystem(): Promise<void> {
  logger.info('Initializing direct PostgreSQL database system...');
  
  try {
    // Verify direct Prisma database connection
    const isDirectConnected = await verifyDirectDatabaseConnection();
    if (!isDirectConnected) {
      logger.info('Direct PostgreSQL database connection is unavailable. Operating in fallback mode.');
      return;
    }

    const connTest = await testDatabaseConnection();
    if (!connTest.success) {
      logger.info(`PostgreSQL database connection unavailable (${connTest.error}). Operating in fallback mode.`);
      return;
    }

    logger.info(`PostgreSQL database connected successfully (Latency: ${connTest.latencyMs}ms). Initializing schema & seed data...`);
    const migResult = await runDatabaseMigrations();
    if (migResult.success) {
      await seedDatabase();
    } else {
      logger.warn('Database migration skipped or failed during startup:', { detail: migResult.error });
    }
  } catch (err: any) {
    logger.info(`Database initialization notice (${err?.message || String(err)}). Operating in fallback mode.`);
  }
}
