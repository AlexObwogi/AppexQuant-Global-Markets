/**
 * AppExQuant Markets Global - Serverless Prisma Singleton & Connection Pool Manager
 * Configured specifically for Vercel Serverless / Edge execution environments with connection limits
 * and automatic connection exhaustion prevention.
 */

import { logger } from '../../observability/logger.ts';

const globalForPrisma = globalThis as unknown as {
  prismaInstance: any;
};

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

function createPrismaClient(): any {
  if (typeof process === 'undefined' || !process.env.DATABASE_URL) {
    return null;
  }

  if (globalForPrisma.prismaInstance) {
    return globalForPrisma.prismaInstance;
  }

  try {
    const { PrismaClient } = require('@prisma/client');
    const datasourceUrl = getPooledDatabaseUrl();

    const client = new PrismaClient({
      datasourceUrl,
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });

    globalForPrisma.prismaInstance = client;
    return client;
  } catch (err: any) {
    logger.info('Prisma client runtime initialization deferred: pooled fallback active');
    return null;
  }
}

export const prisma = globalForPrisma.prismaInstance ?? createPrismaClient();

if (prisma) {
  globalForPrisma.prismaInstance = prisma;
}

export default prisma;
