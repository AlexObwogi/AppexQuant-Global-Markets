/**
 * AppexQuant Markets Global - Community & Verification Domain Types
 */

export type VerificationStatus =
  | 'UNVERIFIED'
  | 'IDENTITY_VERIFIED'
  | 'ACCOUNT_VERIFIED'
  | 'PERFORMANCE_VERIFIED';

export type AccountType = 'SIMULATED' | 'BACKTEST' | 'PAPER' | 'LIVE';

export interface VerificationDetails {
  identityVerifiedAt?: string;
  accountVerifiedAt?: string;
  performanceVerifiedAt?: string;
  connectedBrokerAccount?: string; // e.g. "Deriv MT5 Live #CR100200"
  dataSourceName?: string; // e.g. "Deriv Live Server #1"
  verificationNotes?: string;
}

export interface TraderProfile {
  id: string;
  userId: string;
  displayName: string;
  username: string;
  avatar: string; // Avatar URL or initials icon key
  country: string;
  experience: string; // e.g. "3-5 Years", "7+ Years", "Quantitative Researcher"
  markets: string[]; // e.g. ["Forex", "Synthetic Indices", "Crypto", "Commodities"]
  strategyCategories: string[]; // e.g. ["Scalping", "SMC / ICT", "Trend Following", "Grid"]
  bio: string;
  verificationStatus: VerificationStatus;
  verificationDetails?: VerificationDetails;
  isPublic: boolean;
  followerCount: number;
  followingCount: number;
  postCount: number;
  createdAt: string;
  isFollowedByCurrentUser?: boolean;
  isBlockedByCurrentUser?: boolean;
}

export type PostCategory =
  | 'STRATEGY_DISCUSSION'
  | 'EDUCATIONAL'
  | 'PERFORMANCE_SNAPSHOT'
  | 'SUCCESS_STORY'
  | 'GENERAL';

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: string;
  authorVerificationStatus: VerificationStatus;
  content: string;
  createdAt: string;
  likes: number;
  likedByCurrentUser?: boolean;
  isFlagged?: boolean;
}

export interface SharedStrategyParams {
  strategyId?: string;
  strategyName: string;
  symbols: string[];
  timeframe: string;
  riskRewardRatio: string;
  winRatePct?: number;
  description: string;
  rules?: string[];
}

export interface PerformanceSnapshotData {
  accountType: AccountType; // SIMULATED, BACKTEST, PAPER, LIVE
  dataSource: string; // e.g. "Deriv Live Server #1", "MetaTrader 5 Feed", "Self-Reported Log"
  period: string; // e.g. "Jan 2026 - Jul 2026"
  winRatePct: number;
  netProfitUsd: number;
  startingBalanceUsd: number;
  endingBalanceUsd: number;
  profitFactor: number;
  maxDrawdownPct: number;
  totalTrades: number;
  verificationStatus: VerificationStatus; // UNVERIFIED, ACCOUNT_VERIFIED, PERFORMANCE_VERIFIED
  verificationSourceNote: string; // e.g. "Verified via Deriv Real Account #CR100200" or "Self-Reported / Unverified"
}

export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: string;
  authorCountry: string;
  authorVerificationStatus: VerificationStatus;
  category: PostCategory;
  title: string;
  content: string;
  tags: string[];
  
  // Optional Strategy Sharing Payload
  sharedStrategy?: SharedStrategyParams;
  
  // Optional Performance Snapshot / Success Story Payload
  performanceSnapshot?: PerformanceSnapshotData;
  
  likeCount: number;
  commentCount: number;
  comments?: Comment[];
  likedByCurrentUser?: boolean;
  createdAt: string;
  
  // Moderation state
  isFlagged?: boolean;
  isPinned?: boolean;
  isApprovedByAdmin?: boolean;
}

export interface CommunityReport {
  id: string;
  reporterId: string;
  reporterName: string;
  targetType: 'POST' | 'COMMENT' | 'TRADER';
  targetId: string;
  targetTitleOrName: string;
  reason: 'SPAM' | 'MISLEADING_CLAIMS' | 'FAKE_PERFORMANCE' | 'HARASSMENT' | 'OTHER';
  details: string;
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
  resolvedAt?: string;
  actionTaken?: string;
}

export interface VerificationRequest {
  id: string;
  userId: string;
  userName: string;
  userUsername: string;
  requestedLevel: 'IDENTITY_VERIFIED' | 'ACCOUNT_VERIFIED' | 'PERFORMANCE_VERIFIED';
  documentProofType: 'GOVT_ID' | 'BROKER_STATEMENT' | 'CONNECTED_DERIV_ACCOUNT';
  proofDetails: string; // e.g. "Deriv Real Account #CR882910"
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
}
