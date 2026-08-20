/**
 * AppExQuant Markets Global - Serverless Direct Prisma Singleton
 * Forces direct PostgreSQL connection without in-memory fallback.
 */

import { PrismaClient } from '@prisma/client';
import {
  directPrisma,
  verifyDirectDatabaseConnection,
  isDirectDatabaseAvailable,
  setDirectDatabaseAvailable,
} from '../../lib/db/directPrismaClient.ts';

export function setDatabaseAvailable(status: boolean): void {
  setDirectDatabaseAvailable(status);
}

export function isDatabaseAvailable(): boolean {
  return isDirectDatabaseAvailable();
}

export const prisma: PrismaClient = directPrisma;
export { directPrisma, verifyDirectDatabaseConnection };
export default prisma;

