/**
 * AppexQuant Markets Global - High-Performance Prisma Client & Connection Pool Manager
 * Configured for PgBouncer / Prisma Accelerate & Serverless Execution.
 * Includes connection reuse, query timeouts, and automatic retry handling for transient connection drops.
 */

/**
 * AppexQuant Markets Global - High-Performance Prisma Client & Connection Pool Manager
 * Configured for PgBouncer / Prisma Accelerate & Serverless Execution.
 * Includes connection reuse, query timeouts, and automatic retry handling for transient connection drops.
 */

import { logger } from '../../observability/logger.ts';
import {
  directPrisma,
  isDirectDatabaseAvailable,
  setDirectDatabaseAvailable,
} from './directPrismaClient.ts';

export { directPrisma as prisma };

export interface LeanSession {
  id: string;
  userId: string;
  isElevated: boolean;
  expiresAt: Date | string;
  user: {
    id: string;
    email: string;
    displayName: string;
    role: string;
    status: string;
    derivAccountId?: string | null;
    accountType?: string | null;
  };
}

export interface LeanLeaderboardEntry {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatar?: string | null;
  country?: string | null;
  window: string;
  rank: number;
  winRate: number;
  profitFactor: number;
  totalProfitUsd: number;
  roiPercentage: number;
  maxDrawdownPercentage: number;
  totalTrades: number;
  firstPlaceFinishes: number;
  isAllTimeLeader: boolean;
  isVerified: boolean;
}

/**
 * High-frequency query helpers executing directly against PostgreSQL via directPrisma.
 */
export const dbQueries = {
  /**
   * Fast session validation using composite index [userId, expiresAt]
   */
  async findActiveSession(token: string): Promise<LeanSession | null> {
    if (!isDirectDatabaseAvailable()) return null;
    try {
      return await directPrisma.session.findUnique({
        where: { token },
        select: {
          id: true,
          userId: true,
          isElevated: true,
          expiresAt: true,
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
              role: true,
              status: true,
              derivAccountId: true,
              accountType: true,
            },
          },
        },
      });
    } catch (err: any) {
      setDirectDatabaseAvailable(false);
      const cleanMsg = (err?.message || String(err)).split('\n').filter((l: string) => !l.includes('invocation') && !l.includes('→') && l.trim().length > 0).pop() || 'Database query failed';
      logger.warn('Prisma session lookup fallback:', { detail: cleanMsg.trim() });
      return null;
    }
  },

  /**
   * Lean top leaderboard query with selective projection and indexed sort
   */
  async getTopLeaderboard(window: string = 'MONTHLY', limit: number = 20): Promise<LeanLeaderboardEntry[] | null> {
    if (!isDirectDatabaseAvailable()) return null;
    try {
      const records = await directPrisma.leaderboardEntry.findMany({
        where: { window },
        orderBy: { rank: 'asc' },
        take: limit,
        select: {
          id: true,
          userId: true,
          username: true,
          displayName: true,
          avatar: true,
          country: true,
          window: true,
          rank: true,
          winRate: true,
          profitFactor: true,
          totalProfitUsd: true,
          roiPercentage: true,
          maxDrawdownPercentage: true,
          totalTrades: true,
          firstPlaceFinishes: true,
          isAllTimeLeader: true,
          isVerified: true,
        },
      });
      return records.map((r: any) => ({
        ...r,
        winRate: Number(r.winRate),
        profitFactor: Number(r.profitFactor),
        totalProfitUsd: Number(r.totalProfitUsd),
        roiPercentage: Number(r.roiPercentage),
        maxDrawdownPercentage: Number(r.maxDrawdownPercentage),
      }));
    } catch (err: any) {
      setDirectDatabaseAvailable(false);
      const cleanMsg = (err?.message || String(err)).split('\n').filter((l: string) => !l.includes('invocation') && !l.includes('→') && l.trim().length > 0).pop() || 'Database query failed';
      logger.warn('Prisma leaderboard query fallback:', { detail: cleanMsg.trim() });
      return null;
    }
  },

  /**
   * High-speed user profile query using unique index on email or id
   */
  async findUserById(id: string): Promise<any | null> {
    if (!isDirectDatabaseAvailable()) return null;
    try {
      return await directPrisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          status: true,
          derivAccountId: true,
          accountType: true,
          createdAt: true,
          profile: {
            select: {
              country: true,
              experienceLevel: true,
              kycStatus: true,
            },
          },
          derivAccounts: {
            select: {
              id: true,
              accountType: true,
              currency: true,
              balance: true,
              equity: true,
              isVirtual: true,
              status: true,
              lastSyncedAt: true,
            },
          },
        },
      });
    } catch (err: any) {
      setDirectDatabaseAvailable(false);
      const cleanMsg = (err?.message || String(err)).split('\n').filter((l: string) => !l.includes('invocation') && !l.includes('→') && l.trim().length > 0).pop() || 'Database query failed';
      logger.warn('Prisma findUserById fallback:', { detail: cleanMsg.trim() });
      return null;
    }
  },

  /**
   * Idempotently upserts a DerivAccount record mapped to a user
   */
  async upsertDerivAccount(data: {
    id: string; // Deriv loginid
    userId: string;
    accountType?: string;
    currency?: string;
    balance?: number;
    equity?: number;
    isVirtual?: boolean;
    isDisabled?: boolean;
    status?: string;
    lastSyncedAt?: Date | string;
  }): Promise<any | null> {
    if (!isDirectDatabaseAvailable()) return null;
    try {
      const now = new Date();
      const lastSynced = data.lastSyncedAt ? new Date(data.lastSyncedAt) : now;
      const balance = data.balance ?? 0;
      const equity = data.equity ?? balance;
      const accountType = data.accountType || (data.id.startsWith('VR') ? 'demo' : 'real');
      const currency = data.currency || 'USD';
      const isVirtual = data.isVirtual ?? data.id.startsWith('VR');

      return await directPrisma.derivAccount.upsert({
        where: { id: data.id },
        create: {
          id: data.id,
          userId: data.userId,
          accountType,
          currency,
          balance,
          equity,
          isVirtual,
          isDisabled: data.isDisabled ?? false,
          status: data.status || 'ACTIVE',
          lastSyncedAt: lastSynced,
          createdAt: now,
          updatedAt: now,
        },
        update: {
          accountType,
          currency,
          balance,
          equity,
          isVirtual,
          status: data.status || 'ACTIVE',
          lastSyncedAt: lastSynced,
          updatedAt: now,
        },
      });
    } catch (err: any) {
      setDirectDatabaseAvailable(false);
      const cleanMsg = (err?.message || String(err)).split('\n').filter((l: string) => !l.includes('invocation') && !l.includes('→') && l.trim().length > 0).pop() || 'Database query failed';
      logger.warn('Prisma upsertDerivAccount fallback:', { detail: cleanMsg.trim() });
      return null;
    }
  },

  /**
   * Idempotently captures an account snapshot (balance & equity)
   */
  async recordAccountSnapshot(data: {
    derivAccountId: string;
    userId: string;
    balance: number;
    equity?: number;
    currency?: string;
    timestamp?: Date;
  }): Promise<any | null> {
    if (!isDirectDatabaseAvailable()) return null;
    try {
      const ts = data.timestamp || new Date();
      const hourKey = ts.toISOString().substring(0, 13);
      const snapshotKey = `${data.derivAccountId}_${hourKey}`;
      const equity = data.equity ?? data.balance;
      const currency = data.currency || 'USD';

      return await directPrisma.derivAccountSnapshot.upsert({
        where: {
          derivAccountId_snapshotKey: {
            derivAccountId: data.derivAccountId,
            snapshotKey,
          },
        },
        create: {
          derivAccountId: data.derivAccountId,
          userId: data.userId,
          balance: data.balance,
          equity,
          currency,
          snapshotKey,
          timestamp: ts,
        },
        update: {
          balance: data.balance,
          equity,
          currency,
          timestamp: ts,
        },
      });
    } catch (err: any) {
      setDirectDatabaseAvailable(false);
      const cleanMsg = (err?.message || String(err)).split('\n').filter((l: string) => !l.includes('invocation') && !l.includes('→') && l.trim().length > 0).pop() || 'Database query failed';
      logger.warn('Prisma recordAccountSnapshot fallback:', { detail: cleanMsg.trim() });
      return null;
    }
  },

  /**
   * Maps an external Deriv account ID to an internal user and active session
   */
  async mapDerivAccountToUserSession(derivAccountId: string, userId: string): Promise<boolean> {
    if (!isDirectDatabaseAvailable()) return false;
    try {
      await directPrisma.user.update({
        where: { id: userId },
        data: {
          derivAccountId,
          accountType: derivAccountId.startsWith('VR') ? 'demo' : 'real',
          updatedAt: new Date(),
        },
      });
      return true;
    } catch (err: any) {
      setDirectDatabaseAvailable(false);
      const cleanMsg = (err?.message || String(err)).split('\n').filter((l: string) => !l.includes('invocation') && !l.includes('→') && l.trim().length > 0).pop() || 'Database query failed';
      logger.warn('Prisma mapDerivAccountToUserSession fallback:', { detail: cleanMsg.trim() });
      return false;
    }
  },
};
