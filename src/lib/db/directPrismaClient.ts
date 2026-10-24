/**
 * AppexQuant Markets Global - Direct Server-Side Prisma Client Utility
 * Implements a 10-second circuit breaker and Supabase connection pool optimizations.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../../observability/logger.ts';

const globalForDirectPrisma = globalThis as unknown as {
  directPrismaInstance: PrismaClient | undefined;
};

function buildDatabaseUrl(): string | undefined {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl || !rawUrl.trim()) {
    return undefined;
  }

  try {
    const url = new URL(rawUrl);
    const isSupabasePooler = url.host.includes('pooler.supabase.com') || url.port === '6543';
    if (isSupabasePooler && !url.searchParams.has('pgbouncer')) {
      url.searchParams.set('pgbouncer', 'true');
    }
    const connLimit = process.env.VERCEL ? '1' : '10';
    url.searchParams.set('connection_limit', connLimit);
    url.searchParams.set('pool_timeout', '15');
    return url.toString();
  } catch {
    return rawUrl;
  }
}

function createDirectPrismaClient(): PrismaClient {
  if (globalForDirectPrisma.directPrismaInstance) {
    return globalForDirectPrisma.directPrismaInstance;
  }

  const datasourceUrl = buildDatabaseUrl();
  const client = new PrismaClient(
    datasourceUrl ? { datasourceUrl } : undefined
  );

  globalForDirectPrisma.directPrismaInstance = client;
  return client;
}

export const directPrisma: PrismaClient =
  globalForDirectPrisma.directPrismaInstance ?? createDirectPrismaClient();

globalForDirectPrisma.directPrismaInstance = directPrisma;

let downUntil = 0;

export function isDirectDatabaseAvailable(): boolean {
  const hasUrl = Boolean(process.env.DATABASE_URL?.trim());
  return hasUrl && Date.now() >= downUntil;
}

export function setDirectDatabaseAvailable(status: boolean): void {
  if (!status) {
    downUntil = Date.now() + 10000; // 10 second circuit breaker
  } else {
    downUntil = 0;
  }
}

export function isConnectivityError(err: any): boolean {
  const code = err?.code;
  const codes = ['P1000', 'P1001', 'P1002', 'P1008', 'P1017', 'P2024'];
  return (code && codes.includes(code)) || err?.name === 'PrismaClientInitializationError';
}

export async function verifyDirectDatabaseConnection(forceRetry = false): Promise<boolean> {
  if (!isDirectDatabaseAvailable() && !forceRetry) {
    return false;
  }

  if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.trim()) {
    setDirectDatabaseAvailable(false);
    return false;
  }

  try {
    await Promise.race([
      directPrisma.$queryRaw`SELECT 1 AS health_check`,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Prisma database health check timeout (3000ms)')), 3000)
      ),
    ]);
    setDirectDatabaseAvailable(true);
    return true;
  } catch (err: any) {
    setDirectDatabaseAvailable(false);
    return false;
  }
}

export default directPrisma;
