/**
 * AppexQuant Markets Global - Phase 3 AI Intelligence Types (Re-export Bridge)
 * Aligns legacy aiIntelligence types with primary /src/types/ai.ts
 */

import {
  Signal,
  SignalStatus,
  SignalDirection,
  MarketStructureType,
  ConfidenceBreakdown,
  NewsItem,
  UserStrategy,
  MarketCompatibilityItem,
  DXYContext,
  HistoricalSimilarityResult,
} from './ai.ts';

export type {
  Signal as SignalObject,
  SignalStatus,
  SignalDirection,
  MarketStructureType,
  ConfidenceBreakdown,
  NewsItem,
  UserStrategy,
  MarketCompatibilityItem as MarketMatchResult,
  DXYContext,
  HistoricalSimilarityResult,
};

export interface UserStrategyRules {
  markets: string[];
  preferredSessions: string[];
  timeframes: string[];
  entryConditions: string[];
  newsRules: string;
  minRiskReward: number;
}
