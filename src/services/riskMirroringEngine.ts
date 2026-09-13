/**
 * AppexQuant Markets Global - Prop Firm Risk-Mirroring Engine
 * Dynamic lot-size scaling to strictly protect prop evaluation and funded challenge limits.
 */

import {
  AssetSizingRule,
  LotSizingCalculationRequest,
  LotSizingCalculationResult,
  MasterTraderProfile,
  FollowerAccountProfile,
} from '../types/riskMirroring.ts';

// Comprehensive contract specifications across asset classes
export const ASSET_SIZING_RULES: Record<string, AssetSizingRule> = {
  EURUSD: { symbol: 'EURUSD', category: 'FOREX', contractSize: 100000, minLot: 0.01, maxLot: 50.0, lotStep: 0.01, pipValuePerStandardLot: 10.0, marginRequirementPct: 1.0 },
  GBPUSD: { symbol: 'GBPUSD', category: 'FOREX', contractSize: 100000, minLot: 0.01, maxLot: 50.0, lotStep: 0.01, pipValuePerStandardLot: 10.0, marginRequirementPct: 1.0 },
  USDJPY: { symbol: 'USDJPY', category: 'FOREX', contractSize: 100000, minLot: 0.01, maxLot: 50.0, lotStep: 0.01, pipValuePerStandardLot: 9.2, marginRequirementPct: 1.0 },
  XAUUSD: { symbol: 'XAUUSD', category: 'COMMODITIES', contractSize: 100, minLot: 0.01, maxLot: 20.0, lotStep: 0.01, pipValuePerStandardLot: 1.0, marginRequirementPct: 2.0 },
  BTCUSD: { symbol: 'BTCUSD', category: 'CRYPTO', contractSize: 1, minLot: 0.01, maxLot: 10.0, lotStep: 0.01, pipValuePerStandardLot: 1.0, marginRequirementPct: 5.0 },
  R_100: { symbol: 'R_100', category: 'SYNTHETICS', contractSize: 1, minLot: 0.5, maxLot: 100.0, lotStep: 0.1, pipValuePerStandardLot: 1.0, marginRequirementPct: 2.0 },
  R_50: { symbol: 'R_50', category: 'SYNTHETICS', contractSize: 1, minLot: 0.5, maxLot: 100.0, lotStep: 0.1, pipValuePerStandardLot: 1.0, marginRequirementPct: 2.0 },
  '1HZ10V': { symbol: '1HZ10V', category: 'SYNTHETICS', contractSize: 1, minLot: 0.1, maxLot: 50.0, lotStep: 0.1, pipValuePerStandardLot: 1.0, marginRequirementPct: 2.0 },
  '1HZ75V': { symbol: '1HZ75V', category: 'SYNTHETICS', contractSize: 1, minLot: 0.01, maxLot: 25.0, lotStep: 0.01, pipValuePerStandardLot: 1.0, marginRequirementPct: 2.0 },
};

export const DEFAULT_ASSET_RULE: AssetSizingRule = {
  symbol: 'DEFAULT',
  category: 'FOREX',
  contractSize: 100000,
  minLot: 0.01,
  maxLot: 50.0,
  lotStep: 0.01,
  pipValuePerStandardLot: 10.0,
  marginRequirementPct: 1.0,
};

export function getAssetRule(symbol: string): AssetSizingRule {
  return ASSET_SIZING_RULES[symbol] || { ...DEFAULT_ASSET_RULE, symbol };
}

/**
 * Calculates dynamically scaled lot size for a copy-trading follower account
 * Ensures that if a master trader risks 2% on a $100k account, a $10k follower risks <= 2% of $10k.
 */
export function calculateRiskMirroredLot(
  params: LotSizingCalculationRequest,
): LotSizingCalculationResult {
  const {
    masterEquity,
    masterLotSize,
    masterStopLossPips,
    followerEquity,
    followerMaxDailyLossPct,
    masterMaxDailyLossPct,
    symbol,
    riskMultiplier = 1.0,
    enforceHardLimit = true,
  } = params;

  const rule = getAssetRule(symbol);
  const warnings: string[] = [];

  // Safe checks
  const safeMasterEquity = Math.max(100, masterEquity);
  const safeFollowerEquity = Math.max(100, followerEquity);
  const safeMasterLot = Math.max(rule.minLot, masterLotSize);

  // 1. Raw Equity Ratio (e.g., $10k follower / $100k master = 0.10)
  const equityRatio = safeFollowerEquity / safeMasterEquity;

  // 2. Drawdown Normalization Factor (e.g. Follower daily limit 4% / Master daily limit 5% = 0.8)
  const drawdownRiskRatio = (followerMaxDailyLossPct > 0 && masterMaxDailyLossPct > 0)
    ? followerMaxDailyLossPct / masterMaxDailyLossPct
    : 1.0;

  // 3. Effective Risk Multiplier
  const effectiveMultiplier = riskMultiplier * drawdownRiskRatio;

  // 4. Raw Follower Lot
  let rawLot = safeMasterLot * equityRatio * effectiveMultiplier;

  // 5. Hard Drawdown Protection Check
  // Estimate risk in USD if SL hits
  const pipValue = rule.pipValuePerStandardLot;
  const slPips = Math.max(1, masterStopLossPips || 20);
  const maxAllowableDailyRiskUsd = safeFollowerEquity * (followerMaxDailyLossPct / 100);
  const singleTradeRiskLimitUsd = maxAllowableDailyRiskUsd * 0.5; // Max 50% of daily drawdown on a single trade

  const estimatedRiskUsd = rawLot * slPips * pipValue;

  if (estimatedRiskUsd > singleTradeRiskLimitUsd && enforceHardLimit) {
    const cappedLot = singleTradeRiskLimitUsd / (slPips * pipValue);
    warnings.push(`Lot scaled down from ${rawLot.toFixed(3)} to ${cappedLot.toFixed(3)} to satisfy Prop Firm max daily loss ceiling.`);
    rawLot = cappedLot;
  }

  // 6. Step & Boundary Rounding
  const step = rule.lotStep;
  let roundedLot = Math.floor(rawLot / step) * step;
  roundedLot = parseFloat(roundedLot.toFixed(step < 0.01 ? 3 : 2));

  // Minimum & Maximum lot clamping
  if (roundedLot < rule.minLot) {
    if (roundedLot > 0) {
      warnings.push(`Calculated lot was below instrument minimum (${rule.minLot}). Adjusted to ${rule.minLot}.`);
    }
    roundedLot = rule.minLot;
  }
  if (roundedLot > rule.maxLot) {
    warnings.push(`Calculated lot exceeded instrument maximum (${rule.maxLot}). Clamped to ${rule.maxLot}.`);
    roundedLot = rule.maxLot;
  }

  const finalRiskUsd = roundedLot * slPips * pipValue;
  const finalRiskPct = (finalRiskUsd / safeFollowerEquity) * 100;
  const isSafe = finalRiskPct <= followerMaxDailyLossPct;

  const explanation = `Scaled from Master lot ${masterLotSize} on $${masterEquity.toLocaleString()} account to ${roundedLot} on $${followerEquity.toLocaleString()} follower account (Equity Ratio: ${equityRatio.toFixed(3)}x, Drawdown Weight: ${drawdownRiskRatio.toFixed(2)}x).`;

  return {
    symbol,
    masterLotSize,
    calculatedFollowerLot: parseFloat(rawLot.toFixed(4)),
    roundedFollowerLot: roundedLot,
    equityRatio: parseFloat(equityRatio.toFixed(4)),
    drawdownRiskRatio: parseFloat(drawdownRiskRatio.toFixed(2)),
    effectiveRiskMultiplier: parseFloat(effectiveMultiplier.toFixed(2)),
    estimatedFollowerRiskUsd: parseFloat(finalRiskUsd.toFixed(2)),
    estimatedFollowerRiskPct: parseFloat(finalRiskPct.toFixed(2)),
    isSafeForEvaluation: isSafe,
    warnings,
    explanation,
  };
}

export const PRESET_FOLLOWER_ACCOUNTS: FollowerAccountProfile[] = [
  {
    id: 'EVAL-10K',
    name: '10K Evaluation Challenge',
    accountType: 'EVALUATION_10K',
    equity: 10000,
    maxDailyDrawdownPct: 4.0,
    maxTotalDrawdownPct: 8.0,
    currentDailyDrawdownPct: 0.5,
    riskScaleFactor: 1.0,
    enforceStrictEvalProtection: true,
    maxAllowableRiskPerTradeUsd: 200,
  },
  {
    id: 'EVAL-50K',
    name: '50K Evaluation Challenge',
    accountType: 'EVALUATION_50K',
    equity: 50000,
    maxDailyDrawdownPct: 4.0,
    maxTotalDrawdownPct: 8.0,
    currentDailyDrawdownPct: 0.0,
    riskScaleFactor: 1.0,
    enforceStrictEvalProtection: true,
    maxAllowableRiskPerTradeUsd: 1000,
  },
  {
    id: 'EVAL-100K',
    name: '100K Funded Pro Account',
    accountType: 'EVALUATION_100K',
    equity: 100000,
    maxDailyDrawdownPct: 5.0,
    maxTotalDrawdownPct: 10.0,
    currentDailyDrawdownPct: 1.2,
    riskScaleFactor: 1.0,
    enforceStrictEvalProtection: true,
    maxAllowableRiskPerTradeUsd: 2500,
  },
];
