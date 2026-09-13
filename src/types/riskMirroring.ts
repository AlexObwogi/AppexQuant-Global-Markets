/**
 * AppexQuant Markets Global - Prop Firm Risk-Mirroring & Lot-Sizing Engine Types
 */

export interface MasterTraderProfile {
  id: string;
  name: string;
  accountEquity: number;
  maxDailyDrawdownPct: number;
  totalDrawdownPct: number;
  averageLotSize: number;
  leverage: number;
  instrumentMultipliers?: Record<string, number>;
}

export interface FollowerAccountProfile {
  id: string;
  name: string;
  accountType: 'EVALUATION_10K' | 'EVALUATION_25K' | 'EVALUATION_50K' | 'EVALUATION_100K' | 'EVALUATION_200K' | 'CUSTOM_PROP' | 'LIVE_PERSONAL';
  equity: number;
  maxDailyDrawdownPct: number; // e.g., 4.0%
  maxTotalDrawdownPct: number; // e.g., 8.0%
  currentDailyDrawdownPct: number;
  riskScaleFactor: number; // 0.5x, 1.0x, 1.5x (user custom multiplier)
  enforceStrictEvalProtection: boolean;
  maxAllowableRiskPerTradeUsd: number;
}

export interface AssetSizingRule {
  symbol: string;
  category: 'FOREX' | 'SYNTHETICS' | 'COMMODITIES' | 'CRYPTO';
  contractSize: number;
  minLot: number;
  maxLot: number;
  lotStep: number;
  pipValuePerStandardLot: number;
  marginRequirementPct: number;
}

export interface LotSizingCalculationRequest {
  masterEquity: number;
  masterLotSize: number;
  masterStopLossPips: number;
  followerEquity: number;
  followerMaxDailyLossPct: number;
  masterMaxDailyLossPct: number;
  symbol: string;
  riskMultiplier?: number;
  enforceHardLimit?: boolean;
}

export interface LotSizingCalculationResult {
  symbol: string;
  masterLotSize: number;
  calculatedFollowerLot: number;
  roundedFollowerLot: number;
  equityRatio: number;
  drawdownRiskRatio: number;
  effectiveRiskMultiplier: number;
  estimatedFollowerRiskUsd: number;
  estimatedFollowerRiskPct: number;
  isSafeForEvaluation: boolean;
  warnings: string[];
  explanation: string;
}
