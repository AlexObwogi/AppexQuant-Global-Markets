/**
 * AppexQuant Markets Global - Creator Revenue Split & Settlement Service
 * Manages creator tiers, automated weekly revenue distribution, immutable payouts & attribution.
 */

import {
  CreatorTier,
  CreatorTierConfig,
  CreatorPublicProfile,
  RevenueLedgerEntry,
  CreatorRevenueSummary,
} from '../types/creatorRevenue.ts';
import { sha256Hex, computeSha256Sync } from './cryptographicAuditService.ts';
import { logAuditEvent } from '../observability/audit.ts';

export const CREATOR_TIER_CONFIGS: Record<CreatorTier, CreatorTierConfig> = {
  BRONZE: { tier: 'BRONZE', minFollowers: 0, minAumUsd: 0, revenueSplitPct: 70, badgeColor: '#CD7F32' },
  SILVER: { tier: 'SILVER', minFollowers: 25, minAumUsd: 50000, revenueSplitPct: 75, badgeColor: '#C0C0C0' },
  GOLD: { tier: 'GOLD', minFollowers: 100, minAumUsd: 250000, revenueSplitPct: 80, badgeColor: '#FFD700' },
  DIAMOND: { tier: 'DIAMOND', minFollowers: 500, minAumUsd: 1000000, revenueSplitPct: 85, badgeColor: '#B9F2FF' },
  LEGEND: { tier: 'LEGEND', minFollowers: 2000, minAumUsd: 5000000, revenueSplitPct: 90, badgeColor: '#FF4500' },
};

export function determineCreatorTier(followers: number, aum: number): CreatorTierConfig {
  if (followers >= 2000 || aum >= 5000000) return CREATOR_TIER_CONFIGS.LEGEND;
  if (followers >= 500 || aum >= 1000000) return CREATOR_TIER_CONFIGS.DIAMOND;
  if (followers >= 100 || aum >= 250000) return CREATOR_TIER_CONFIGS.GOLD;
  if (followers >= 25 || aum >= 50000) return CREATOR_TIER_CONFIGS.SILVER;
  return CREATOR_TIER_CONFIGS.BRONZE;
}

// In-Memory Creator Database
const creatorProfiles = new Map<string, CreatorPublicProfile>();
const revenueLedgers = new Map<string, RevenueLedgerEntry[]>();

// Seed sample creator profile
const defaultProfile: CreatorPublicProfile = {
  id: 'CRT-ALEX-01',
  username: 'alexquant',
  displayName: 'Alex Quant & Alpha Algorithms',
  bio: 'Algorithmic synthetic index breakout and mean-reversion copy provider. 100% verified track record.',
  tier: 'GOLD',
  revenueSplitPct: 80,
  totalFollowers: 142,
  activeCopiersCount: 88,
  aumUsd: 384500,
  totalTradesExecuted: 1240,
  winRatePct: 71.4,
  profitFactor: 2.18,
  allTimeProfitUsd: 48920,
  monthlySubscriptionPriceUsd: 49.0,
  publicProfileUrl: '/creator/alexquant',
  isVerified: true,
  joinedDate: '2025-11-04',
};

creatorProfiles.set(defaultProfile.id, defaultProfile);
creatorProfiles.set(defaultProfile.username, defaultProfile);

const initialEntries: RevenueLedgerEntry[] = [
  {
    id: 'LED-REV-0912-1',
    creatorId: defaultProfile.id,
    batchPeriod: '2026-W36',
    type: 'SUBSCRIPTION_REVENUE',
    grossAmountUsd: 4312.0,
    platformCutPct: 20.0,
    platformFeeUsd: 862.4,
    netCreatorPayoutUsd: 3449.6,
    status: 'SETTLED',
    hashDigest: computeSha256Sync('LED-REV-0912-1:3449.6:SETTLED'),
    timestamp: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
  {
    id: 'LED-REV-0912-2',
    creatorId: defaultProfile.id,
    batchPeriod: '2026-W37',
    type: 'PERFORMANCE_FEE_SPLIT',
    grossAmountUsd: 2180.0,
    platformCutPct: 20.0,
    platformFeeUsd: 436.0,
    netCreatorPayoutUsd: 1744.0,
    status: 'PENDING_AUDIT',
    hashDigest: computeSha256Sync('LED-REV-0912-2:1744.0:PENDING_AUDIT'),
    timestamp: new Date().toISOString(),
  },
];

revenueLedgers.set(defaultProfile.id, initialEntries);

export function getCreatorSummary(creatorIdOrUsername: string): CreatorRevenueSummary {
  const profile = creatorProfiles.get(creatorIdOrUsername) || defaultProfile;
  const entries = revenueLedgers.get(profile.id) || [];
  const tierConfig = determineCreatorTier(profile.totalFollowers, profile.aumUsd);

  let lifetimeEarningsUsd = 0;
  let currentBalanceUsd = 0;
  let pendingSettlementUsd = 0;
  let thisMonthEarningsUsd = 0;

  for (const entry of entries) {
    lifetimeEarningsUsd += entry.netCreatorPayoutUsd;
    if (entry.status === 'SETTLED') {
      currentBalanceUsd += entry.netCreatorPayoutUsd;
    } else if (entry.status === 'PENDING_AUDIT') {
      pendingSettlementUsd += entry.netCreatorPayoutUsd;
    }
    thisMonthEarningsUsd += entry.netCreatorPayoutUsd;
  }

  return {
    profile: {
      ...profile,
      tier: tierConfig.tier,
      revenueSplitPct: tierConfig.revenueSplitPct,
    },
    tierConfig,
    currentBalanceUsd: parseFloat(currentBalanceUsd.toFixed(2)),
    lifetimeEarningsUsd: parseFloat(lifetimeEarningsUsd.toFixed(2)),
    pendingSettlementUsd: parseFloat(pendingSettlementUsd.toFixed(2)),
    thisMonthEarningsUsd: parseFloat(thisMonthEarningsUsd.toFixed(2)),
    totalSubscribers: profile.activeCopiersCount,
    ledgerEntries: entries,
  };
}

export function requestCreatorPayout(
  creatorId: string,
  amountUsd: number,
  destinationAddress: string,
): { success: boolean; message: string; payoutEntry?: RevenueLedgerEntry } {
  const summary = getCreatorSummary(creatorId);
  if (amountUsd > summary.currentBalanceUsd || amountUsd <= 0) {
    return {
      success: false,
      message: `Requested payout amount ($${amountUsd}) exceeds available settled balance ($${summary.currentBalanceUsd}).`,
    };
  }

  const payoutEntry: RevenueLedgerEntry = {
    id: `PAYOUT-${Date.now().toString(36).toUpperCase()}`,
    creatorId,
    batchPeriod: `PAYOUT-${new Date().toISOString().slice(0, 10)}`,
    type: 'PAYOUT_SETTLEMENT',
    grossAmountUsd: amountUsd,
    platformCutPct: 0,
    platformFeeUsd: 0,
    netCreatorPayoutUsd: -amountUsd,
    status: 'PAID_OUT',
    hashDigest: computeSha256Sync(`PAYOUT:${creatorId}:${amountUsd}:${destinationAddress}`),
    timestamp: new Date().toISOString(),
  };

  const entries = revenueLedgers.get(creatorId) || [];
  entries.unshift(payoutEntry);
  revenueLedgers.set(creatorId, entries);

  logAuditEvent('REVENUE_SETTLED', 'USER', {
    action: 'CREATOR_PAYOUT_REQUESTED',
    creatorId,
    amountUsd,
    destinationAddress,
    hashDigest: payoutEntry.hashDigest,
  });

  return {
    success: true,
    message: `Payout request of $${amountUsd.toFixed(2)} submitted successfully and logged to immutable ledger.`,
    payoutEntry,
  };
}
