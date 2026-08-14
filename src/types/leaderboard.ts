/**
 * AppexQuant Markets Global - Leaderboard & Hall of Fame Data Types
 * Multi-Tier Real-Time Tracking, 2-Year Rolling Retention, Hall of Fame Archives & Verified Badges
 */

export type LeaderboardWindow = 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'ALL_TIME';

export type VerifiedBadgeType = 
  | 'TRIPLE_LEADER_PURPLE'  // Triple-Leader Purple Badge: Achieved 3x #1 Leaderboard finishes
  | 'ALL_TIME_EARNER_GOLD'   // All-Time Earner Gold Badge: Reigning all-time top earner (social checkmark style)
  | 'INSTITUTIONAL_CYAN'    // Institutional / Pro Verified
  | 'ALGO_MASTER_EMERALD';  // 1000+ Automated EA execution passes

export interface VerifiedBadge {
  type: VerifiedBadgeType;
  label: string;
  description: string;
  iconType: 'crown' | 'check-circle' | 'sparkles' | 'shield-check';
  badgeColor: string; // Tailwind/CSS color tokens
  glowColor: string;
  grantedAt: string;
}

export interface MonthlyRecord {
  month: string; // e.g. "2024-03" ... "2026-08" (2-Year rolling retention = 24 months)
  pnlUsd: number;
  winRatePct: number;
  tradeCount: number;
  maxDrawdownPct: number;
  rankInWindow: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  username: string;
  avatar: string;
  country: string;
  accountType: 'LIVE_DERIV_AUDITED' | 'PRO_PAPER' | 'PROP_VERIFIED';
  pnlUsd: number;
  roiPct: number;
  winRatePct: number;
  profitFactor: number;
  totalTrades: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  streakWins: number;
  primaryStrategy: string;
  brokerFeed: string; // e.g. "Deriv Real MT5 Server #1"
  firstPlaceFinishesCount: number; // Count of #1 ranks across past windows
  isAllTimeLeader: boolean; // Flag if top all-time profit earner
  badges: VerifiedBadge[];
  // 2-Year Rolling Historical Performance Log (24 months)
  historicalRetentionLogs: MonthlyRecord[];
  lastUpdated: string;
}

export interface HallOfFameInductee {
  id: string;
  userId: string;
  displayName: string;
  username: string;
  avatar: string;
  country: string;
  inductionTitle: string; // e.g. "2025 Yearly Grandmaster Champion", "August 2025 #1 Sovereign"
  inductionPeriod: string; // e.g. "Year 2025", "Q2 2025", "Year 2024"
  inductionWindow: 'YEARLY' | 'MONTHLY';
  totalPnlCapturedUsd: number;
  roiCapturedPct: number;
  winRatePct: number;
  totalVerifiedTrades: number;
  profitFactor: number;
  maxDrawdownPct: number;
  inducteeQuote: string;
  verifiedTelemetryThumbnail: string; // High-resolution visual performance snapshot / telemetry thumb
  badges: VerifiedBadge[];
  inductedAt: string;
  auditVerificationHash: string; // Cryptographic audit fingerprint
}
