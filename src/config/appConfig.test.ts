/**
 * Direct Server-Side Prisma client utility.
 * This module is the single source of truth for direct Prisma availability.
 * Database failures must not be treated as a successful empty result.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../../observability/logger.ts';

const globalForDirectPrisma = globalThis as unknown as {
  directPrismaInstance: PrismaClient | undefined;
};

function getRequiredDatabaseUrl(): string | undefined {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl || !rawUrl.trim()) {
    return undefined;
  }

  try {
    const url = new URL(rawUrl);
    if (!url.searchParams.has('connection_limit')) {
      url.searchParams.set('connection_limit', '10');
    }
    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', '15');
    }
    return url.toString();
  } catch {
    return rawUrl;
  }
}

function createDirectPrismaClient(): PrismaClient {
  if (globalForDirectPrisma.directPrismaInstance) {
    return globalForDirectPrisma.directPrismaInstance;
  }

  const datasourceUrl = getRequiredDatabaseUrl();

  try {
    const client = new PrismaClient(datasourceUrl ? { datasourceUrl } : undefined);
    globalForDirectPrisma.directPrismaInstance = client;
    return client;
  } catch (err: any) {
    const errMsg = (err?.message || String(err)).trim().replace(/^\n+/, '');
    logger.warn('PrismaClient instantiation notice:', { detail: errMsg });
    return null as unknown as PrismaClient;
  }
}

export const directPrisma: PrismaClient = globalForDirectPrisma.directPrismaInstance ?? createDirectPrismaClient();
globalForDirectPrisma.directPrismaInstance = directPrisma;

let isDirectDbAvailableState = false;
let dbAvailabilityTested = false;

export function isDirectDatabaseAvailable(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim()) && isDirectDbAvailableState;
}

export function setDirectDatabaseAvailable(status: boolean): void {
  dbAvailabilityTested = true;
  isDirectDbAvailableState = status;
}

export async function verifyDirectDatabaseConnection(): Promise<boolean> {
  dbAvailabilityTested = true;
  if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.trim()) {
    isDirectDbAvailableState = false;
    return false;
  }

  try {
    if (!directPrisma) {
      isDirectDbAvailableState = false;
      return false;
    }
    await directPrisma.$queryRaw`SELECT 1 AS health_check`;
    logger.info('Direct PostgreSQL database connection successfully established and verified via Prisma.');
    isDirectDbAvailableState = true;
    return true;
  } catch (err: any) {
    isDirectDbAvailableState = false;
    const cleanErrMsg = (err?.message || String(err)).trim().replace(/^\n+/, '').split('\n').pop() || 'Unreachable';
    logger.info(`Direct PostgreSQL database connection unavailable (${cleanErrMsg}).`);
    return false;
  }
}

export default directPrisma;
