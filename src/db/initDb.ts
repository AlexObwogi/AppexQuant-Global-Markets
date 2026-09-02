/**
 * AppexQuant Markets Global - Database Initialization Helper
 * Automatically runs migrations and seeds database on server start if connected.
 * Implements singleton initialization to prevent repeated execution and startup spam.
 */

import { testDatabaseConnection } from './connection.ts';
import { runDatabaseMigrations } from './migrations.ts';
import { seedDatabase } from './seed.ts';
import { logger } from '../observability/logger.ts';
import { verifyDirectDatabaseConnection } from '../lib/db/directPrismaClient.ts';

let dbInitPromise: Promise<void> | null = null;
let dbInitialized = false;
let dbInitializationLogged = false;

export async function initializeDatabaseSystem(): Promise<void> {
  if (dbInitialized) return;
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
    if (!dbInitializationLogged) {
      logger.info('Initializing direct PostgreSQL database system (singleton)...');
      dbInitializationLogged = true;
    }
    
    try {
      const isDirectConnected = await verifyDirectDatabaseConnection();
      if (!isDirectConnected) {
        logger.info('Direct PostgreSQL database connection is unavailable. Continuing without DB persistence.');
        dbInitialized = true;
        return;
      }

      const connTest = await testDatabaseConnection();
      if (!connTest.success) {
        logger.info(`PostgreSQL database connection unavailable (${connTest.error}). Continuing without DB persistence.`);
        dbInitialized = true;
        return;
      }

      logger.info(`PostgreSQL database connected successfully (Latency: ${connTest.latencyMs}ms). Initializing schema & seed data...`);
      const migResult = await runDatabaseMigrations();
      if (migResult.success) {
        await seedDatabase();
      } else {
        logger.warn('Database migration skipped or failed during startup:', { detail: migResult.error });
      }
      dbInitialized = true;
    } catch (err: any) {
      logger.info(`Database initialization notice (${err?.message || String(err)}). Continuing operation.`);
      dbInitialized = true;
    }
  })();

  return dbInitPromise;
}
