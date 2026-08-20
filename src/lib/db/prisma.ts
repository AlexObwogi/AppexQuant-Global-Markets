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
import { prisma } from '../../services/db/prismaSingleton.ts';

export { prisma };

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
 * High-frequency query helpers with lean projection (strips unnecessary blobs / large text)
 */
export const dbQueries = {
  /**
   * Fast session validation using composite index [userId, expiresAt]
   */
  async findActiveSession(token: string): Promise<LeanSession | null> {
    if (!prisma || !process.env.DATABASE_URL) return null;
    try {
      return await prisma.session.findUnique({
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
      logger.warn('Prisma session check fallback:', { error: err.message });
      return null;
    }
  },

  /**
   * Lean top leaderboard query with selective projection and indexed sort
   */
  async getTopLeaderboard(window: string = 'MONTHLY', limit: number = 20): Promise<LeanLeaderboardEntry[] | null> {
    if (!prisma || !process.env.DATABASE_URL) return null;
    try {
      return await prisma.leaderboardEntry.findMany({
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
    } catch (err: any) {
      logger.warn('Prisma leaderboard query fallback:', { error: err.message });
      return null;
    }
  },

  /**
   * High-speed user profile query using unique index on email or id
   */
  async findUserById(id: string): Promise<any | null> {
    if (!prisma || !process.env.DATABASE_URL) return null;
    try {
      return await prisma.user.findUnique({
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
      logger.warn('Prisma findUserById fallback:', { error: err.message });
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
    if (!prisma || !process.env.DATABASE_URL) return null;
    try {
      const now = new Date();
      const lastSynced = data.lastSyncedAt ? new Date(data.lastSyncedAt) : now;
      const balance = data.balance ?? 0;
      const equity = data.equity ?? balance;
      const accountType = data.accountType || (data.id.startsWith('VR') ? 'demo' : 'real');
      const currency = data.currency || 'USD';
      const isVirtual = data.isVirtual ?? data.id.startsWith('VR');

      return await prisma.derivAccount.upsert({
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
      logger.warn('Prisma upsertDerivAccount fallback:', { error: err.message });
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
    if (!prisma || !process.env.DATABASE_URL) return null;
    try {
      const ts = data.timestamp || new Date();
      // Format hour-level idempotency key e.g. CR12345_2026-08-20T04
      const hourKey = ts.toISOString().substring(0, 13);
      const snapshotKey = `${data.derivAccountId}_${hourKey}`;
      const equity = data.equity ?? data.balance;
      const currency = data.currency || 'USD';

      return await prisma.derivAccountSnapshot.upsert({
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
      logger.warn('Prisma recordAccountSnapshot fallback:', { error: err.message });
      return null;
    }
  },

  /**
   * Maps an external Deriv account ID to an internal user and active session
   */
  async mapDerivAccountToUserSession(derivAccountId: string, userId: string): Promise<boolean> {
    if (!prisma || !process.env.DATABASE_URL) return false;
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          derivAccountId,
          accountType: derivAccountId.startsWith('VR') ? 'demo' : 'real',
          updatedAt: new Date(),
        },
      });
      return true;
    } catch (err: any) {
      logger.warn('Prisma mapDerivAccountToUserSession fallback:', { error: err.message });
      return false;
    }
  },
};
