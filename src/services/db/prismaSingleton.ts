/**
 * AppExQuant Markets Global - Serverless Prisma Singleton & Connection Pool Manager
 * Configured specifically for Vercel Serverless / Edge execution environments with connection limits
 * and automatic connection exhaustion prevention.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../../observability/logger.ts';

const globalForPrisma = globalThis as unknown as {
  prismaInstance: PrismaClient | undefined;
  isDbAvailable: boolean | undefined;
};

let dbAvailabilityStatus: boolean | null = null;

export function setDatabaseAvailable(status: boolean): void {
  dbAvailabilityStatus = status;
  globalForPrisma.isDbAvailable = status;
}

export function isDatabaseAvailable(): boolean {
  if (globalForPrisma.isDbAvailable !== undefined) {
    return globalForPrisma.isDbAvailable;
  }
  if (dbAvailabilityStatus !== null) {
    return dbAvailabilityStatus;
  }
  return !!process.env.DATABASE_URL;
}

function getPooledDatabaseUrl(): string | undefined {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) return undefined;

  // Append serverless pooling parameters if not already present
  try {
    const url = new URL(rawUrl);
    if (!url.searchParams.has('connection_limit')) {
      url.searchParams.set('connection_limit', '1');
    }
    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', '10');
    }
    return url.toString();
  } catch {
    return rawUrl;
  }
}

function createPrismaClient(): PrismaClient | null {
  if (typeof process === 'undefined' || !process.env.DATABASE_URL) {
    return null;
  }

  if (globalForPrisma.prismaInstance) {
    return globalForPrisma.prismaInstance;
  }

  try {
    const datasourceUrl = getPooledDatabaseUrl();
    const client = new PrismaClient({
      datasourceUrl,
      log: [
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });

    (client as any).$on('error', (e: any) => {
      const msg = typeof e === 'string' ? e : e?.message || JSON.stringify(e);
      if (
        msg.includes('Authentication failed') ||
        msg.includes('P1000') ||
        msg.includes('P1001') ||
        msg.includes('P1002') ||
        msg.includes('credentials')
      ) {
        setDatabaseAvailable(false);
        logger.warn('Prisma database authentication/connection failed. Operating in memory-fallback mode.', { error: msg });
      } else {
        logger.warn('Prisma client error event:', { error: msg });
      }
    });

    (client as any).$on('warn', (e: any) => {
      const msg = typeof e === 'string' ? e : e?.message || JSON.stringify(e);
      logger.warn('Prisma client warning:', { warning: msg });
    });

    globalForPrisma.prismaInstance = client;
    return client;
  } catch (err: any) {
    logger.error('Failed to initialize PrismaClient:', err);
    setDatabaseAvailable(false);
    return null;
  }
}

export const prisma: PrismaClient | null = globalForPrisma.prismaInstance ?? createPrismaClient();

if (prisma) {
  globalForPrisma.prismaInstance = prisma;
}

export default prisma;
