/**
 * AppexQuant Markets Global - Phase 3 AI & Intelligence Types
 */

export type SignalDirection = 'LONG' | 'SHORT' | 'NEUTRAL';

export type SignalStatus =
  | 'ANALYZING'
  | 'ACTIVE'
  | 'INVALIDATED'
  | 'EXPIRED'
  | 'STALE'
  | 'REJECTED';

export type MarketStructureType = 'BULLISH' | 'BEARISH' | 'RANGING' | 'BREAKOUT_PENDING' | 'UNCERTAIN';

export type NewsSentimentType = 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'MIXED' | 'UNKNOWN';

export type NewsImpactType = 'LOW' | 'MEDIUM' | 'HIGH';

export interface HistoricalSimilarityResult {
  sampleSize: number;
  positiveOutcomes: number;
  negativeOutcomes: number;
  conditionalFrequencyPct: number;
  evaluationPeriod: string;
}

export interface ConfidenceBreakdown {
  marketStructure: number;
  patternSimilarity: number;
  sentimentAlignment: number;
  dxyAlignment: number;
  volatilitySuitability: number;
  dataQuality: number;
  conflictPenalty: number;
  totalScore: number; // 0 - 100
}

export interface DataFreshnessInfo {
  marketDataCapturedAt: string;
  newsDataCapturedAt: string;
  analysisGeneratedAt: string;
  isStale: boolean;
  staleReason?: string;
}

export interface Signal {
  id: string;
  symbol: string;
  symbolName: string;
  category: string;
  direction: SignalDirection;
  confidence: number; // 0 - 100
  confidenceBreakdown: ConfidenceBreakdown;
  entryZone: { min: number; max: number };
  stopLoss: number;
  takeProfit: number;
  riskRewardRatio: number; // Must strictly satisfy 2.0 <= ratio <= 3.0 to pass
  timeframe: string;
  strategyName: string;
  patternDetected: string;
  marketStructure: MarketStructureType;
  sentiment: NewsSentimentType;
  dxyContext: string;
  newsContext: string;
  generatedAt: string;
  expiresAt: string;
  status: SignalStatus;
  rejectionReason?: string;
  reasoning: {
    what: string;
    why: string;
    where: string;
    invalidation: string;
    risk: string;
    reward: string;
    dataEvidence: string[];
  };
  historicalMatches?: {
    sampleSize: number;
    positiveOutcomes: number;
    negativeOutcomes: number;
    conditionalFrequencyPct: number;
  };
  riskWarnings: string[];
  dataFreshness: DataFreshnessInfo;
  modelVersion: string; // e.g. "signal-engine-v1.0"
}

export type StrategyStatus =
  | 'DRAFT'
  | 'BACKTEST_REQUIRED'
  | 'BACKTESTED'
  | 'PAPER_APPROVED'
  | 'LIVE_APPROVED'
  | 'ACTIVE'
  | 'PAUSED'
  | 'DISABLED'
  | 'ARCHIVED';

export type StrategyEnvironment = 'PAPER' | 'LIVE';

export interface StrategyVersionSnapshot {
  version: string;
  status: StrategyStatus;
  updatedAt: string;
  description: string;
  entryConditions: string[];
  exitConditions: string[];
}

export interface UserStrategy {
  id: string;
  name: string;
  description: string;
  version: string; // e.g. "1.0", "1.1"
  owner: string;
  symbols: string[];
  timeframes: string[];
  entryConditions: string[];
  exitConditions: string[];
  filters: string[];
  riskProfile: {
    maxRiskPerTradePct: number;
    minRiskRewardRatio: number;
    maxRiskRewardRatio: number;
    stopLossPipsOrPct: number;
  };
  sessionRestrictions: string[];
  maxPositions: number;
  cooldown: number; // minutes
  status: StrategyStatus;
  environment: StrategyEnvironment;
  createdAt: string;
  updatedAt: string;
  versionHistory: StrategyVersionSnapshot[];
  // Legacy compatibility fields if referenced elsewhere
  rawNaturalLanguage?: string;
  markets?: string[];
  preferredSessions?: string[];
  confirmationConditions?: string[];
  invalidationConditions?: string[];
  excludedConditions?: string[];
  preferredVolatility?: 'LOW' | 'MEDIUM' | 'HIGH' | 'ANY';
  newsRules?: { avoidHighImpactNewsMinutes: number };
  isPaused?: boolean;
}

export interface StrategyValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  interpretedRules?: UserStrategy;
}

export interface MarketCompatibilityItem {
  symbol: string;
  symbolName: string;
  category: string;
  compatibilityScore: number; // 0 - 100
  matchGrade: 'BEST MATCH' | 'GOOD MATCH' | 'WATCH' | 'NOT SUITABLE' | 'INSUFFICIENT DATA';
  pros: string[];
  cons: string[];
  volatilityStatus: string;
  structureMatch: boolean;
  newsConflict: boolean;
  analyzedAt: string;
}

export interface MarketScanProgress {
  currentSymbol: string;
  completedCount: number;
  totalCount: number;
  status: 'IDLE' | 'SCANNING' | 'COMPLETE' | 'FAILED';
  results: MarketCompatibilityItem[];
}

export interface NewsItem {
  id: string;
  headline: string;
  source: string;
  publishedAt: string;
  url: string;
  category: string;
  relatedSymbols: string[];
  sentiment: NewsSentimentType;
  sentimentConfidence: number;
  importance: NewsImpactType;
  summary: string;
}

export interface EconomicEvent {
  id: string;
  title: string;
  country: string;
  currency: string;
  date: string;
  time: string;
  impact: NewsImpactType;
  forecast?: string;
  previous?: string;
  actual?: string;
}

export interface DXYContext {
  symbol: 'DXY';
  price: number;
  change24hPct: number;
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  momentum: 'STRONG' | 'MODERATE' | 'WEAK';
  correlations: Record<string, number>; // e.g. { 'frxEURUSD': -0.92, 'frxXAUUSD': -0.85 }
  updatedAt: string;
}

export interface MarketComparisonMatrix {
  symbols: string[];
  volatility: Record<string, string>;
  structure: Record<string, MarketStructureType>;
  sentiment: Record<string, NewsSentimentType>;
  dxyRelationship: Record<string, string>;
  strategyCompatibility: Record<string, number>;
  dataQuality: Record<string, string>;
  generatedAt: string;
}
