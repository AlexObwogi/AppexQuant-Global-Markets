/**
 * AppexQuant Markets Global - Phase 4 EA & Strategy Ecosystem Types
 */

export type EACategory =
  | 'SCALPING'
  | 'TREND_FOLLOWING'
  | 'BREAKOUT'
  | 'MOMENTUM'
  | 'MEAN_REVERSION'
  | 'PRICE_ACTION'
  | 'ICT'
  | 'SMC'
  | 'NEWS'
  | 'MULTI_STRATEGY'
  | 'RISK_MANAGEMENT'
  | 'EXPERIMENTAL';

export type EALicenseType = 'FREE_FOREVER' | 'OPEN_SOURCE' | 'PARTNER_VERIFIED' | 'USER_SUBMITTED';

export type EASourceType = 'IN_HOUSE' | 'OPEN_SOURCE' | 'PARTNER' | 'USER_SUBMISSION';

export type EAStatus = 'ONLINE' | 'OFFLINE' | 'UNKNOWN' | 'STALE' | 'ERROR';

export interface EAPerformanceMetrics {
  netProfitUsd: number;
  grossProfitUsd: number;
  grossLossUsd: number;
  winRatePct: number;
  lossRatePct: number;
  profitFactor: number;
  maxDrawdownPct: number;
  totalTrades: number;
  averageWinUsd: number;
  averageLossUsd: number;
  expectancyUsd: number;
  sharpeRatio: number;
  sortinoRatio: number;
  recoveryFactor: number;
  largestWinUsd: number;
  largestLossUsd: number;
}

export interface EADatasetInfo {
  type: 'BACKTEST' | 'FORWARD_TEST' | 'DEMO' | 'LIVE';
  period: string;
  symbol: string;
  timeframe: string;
  initialBalance: number;
  commissionAssumption: string;
  spreadAssumption: string;
  slippageAssumption: string;
  dataSource: string;
  sampleSize: number;
}

export interface ExpertAdvisor {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: EACategory;
  developer: string;
  owner: string;
  license: EALicenseType;
  isFreeForever: boolean;
  version: string;
  sourceType: EASourceType;
  fileType: '.mq5' | '.ex5' | 'SOURCE_AVAILABLE' | 'COMPILED_ONLY';
  fileSizeKb: number;
  checksum: string;
  redistributionPermission: boolean;
  modificationPermission: boolean;
  commercialPermission: boolean;
  terms: string;
  publishedDate: string;
  lastUpdated: string;
  supportedPlatform: 'MetaTrader 5';
  broker: 'Deriv MT5' | 'Universal MT5';
  supportedSymbols: string[];
  recommendedTimeframes: string[];
  riskProfile: 'Conservative' | 'Moderate' | 'Aggressive';
  performance: EAPerformanceMetrics;
  datasetInfo: EADatasetInfo;
  status: EAStatus;
  isInstalled?: boolean;
  isFavorite?: boolean;
  installedVersion?: string;
  linkedStrategyId?: string;
}

export interface EASubmissionPayload {
  name: string;
  tagline: string;
  description: string;
  category: EACategory;
  developer: string;
  owner: string;
  license: EALicenseType;
  fileType: '.mq5' | '.ex5';
  fileName: string;
  fileSizeKb: number;
  supportedSymbols: string[];
  recommendedTimeframes: string[];
  riskProfile: 'Conservative' | 'Moderate' | 'Aggressive';
  ownershipConfirmed: boolean;
  licenseConfirmed: boolean;
  termsAccepted: boolean;
}

export interface DailyPerformanceRecord {
  date: string; // YYYY-MM-DD
  netPl: number;
  tradeCount: number;
  status: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
}

export interface SuccessStory {
  id: string;
  traderName: string;
  displayMode: 'REAL_NAME' | 'DISPLAY_NAME' | 'ANONYMOUS';
  country: string;
  experienceYears: number;
  markets: string[];
  strategyUsed: string;
  timePeriod: string;
  startingBalance: number;
  endingBalance: number;
  netResultUsd: number;
  riskProfile: string;
  quote: string;
  verificationStatus: 'VERIFIED' | 'COMMUNITY_SUBMITTED' | 'PENDING_REVIEW' | 'UNVERIFIED';
  linkedAnalyticsAccountId?: string;
  createdAt: string;
}

export interface QuantValidationGateResult {
  gateName: 'Stationarity (ADF)' | 'Volatility (GARCH)' | 'Momentum (Derivatives)' | 'Probability Edge' | 'Expectancy';
  status: 'PASS' | 'FAIL' | 'NOT_APPLICABLE' | 'INSUFFICIENT_DATA';
  score: number; // 0-100
  details: string;
  metrics: Record<string, string | number>;
}

export interface QuantValidationReport {
  overallValid: boolean;
  confidenceScore: number;
  gates: QuantValidationGateResult[];
  rejectionReason?: string;
}
