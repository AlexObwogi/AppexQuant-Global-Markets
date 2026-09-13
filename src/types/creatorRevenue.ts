/**
 * AppexQuant Markets Global - Creator Revenue Split & Public Profile Types
 */

export type CreatorTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND' | 'LEGEND';

export interface CreatorTierConfig {
  tier: CreatorTier;
  minFollowers: number;
  minAumUsd: number;
  revenueSplitPct: number; // e.g., 70, 75, 80, 85, 90
  badgeColor: string;
}

export interface CreatorPublicProfile {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl?: string;
  tier: CreatorTier;
  revenueSplitPct: number;
  totalFollowers: number;
  activeCopiersCount: number;
  aumUsd: number;
  totalTradesExecuted: number;
  winRatePct: number;
  profitFactor: number;
  allTimeProfitUsd: number;
  monthlySubscriptionPriceUsd: number;
  publicProfileUrl: string;
  isVerified: boolean;
  joinedDate: string;
}

export interface RevenueLedgerEntry {
  id: string;
  creatorId: string;
  batchPeriod: string; // e.g. "2026-W37"
  type: 'SUBSCRIPTION_REVENUE' | 'PERFORMANCE_FEE_SPLIT' | 'VOLUME_REBATE' | 'PAYOUT_SETTLEMENT';
  grossAmountUsd: number;
  platformCutPct: number;
  platformFeeUsd: number;
  netCreatorPayoutUsd: number;
  status: 'PENDING_AUDIT' | 'SETTLED' | 'PAID_OUT';
  hashDigest: string;
  timestamp: string;
}

export interface CreatorRevenueSummary {
  profile: CreatorPublicProfile;
  tierConfig: CreatorTierConfig;
  currentBalanceUsd: number;
  lifetimeEarningsUsd: number;
  pendingSettlementUsd: number;
  thisMonthEarningsUsd: number;
  totalSubscribers: number;
  ledgerEntries: RevenueLedgerEntry[];
}
