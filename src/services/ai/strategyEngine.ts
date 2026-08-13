/**
 * AppexQuant Markets Global - Phase 3 Strategy Builder & Scanner Engine
 * Converts natural language strategies into structured rules, checks syntax, and scans markets.
 */

import { UserStrategy, StrategyValidationResult, MarketCompatibilityItem } from '../../types/ai';
import { MarketInstrument } from '../../types/market';
import { NormalizedCandle } from '../deriv/derivTypes';
import { analyzeMarketStructure } from './marketStructureEngine';
import { detectHistoricalPatterns } from './patternEngine';

export const DEFAULT_USER_STRATEGIES: UserStrategy[] = [
  {
    id: 'strat-01',
    name: 'Institutional Liquidity Sweep & Structure Shift',
    description: 'Trades momentum reversals after false breakouts sweep liquidity outside key swing highs or lows during London & NY sessions.',
    version: '1.0',
    owner: 'Admin Trader',
    symbols: ['EURUSD', 'GBPUSD', 'XAUUSD', 'Volatility 75 Index'],
    timeframes: ['M15', 'H1'],
    entryConditions: ['Liquidity sweep below swing low or above swing high', 'Pin bar or engulfing candlestick confirmation'],
    exitConditions: ['Take profit hit at 1:2.5 RR', 'Market structure shift against position'],
    filters: ['Avoid high-impact news within 30m', 'ATR volatility expansion > 1.2x'],
    riskProfile: {
      maxRiskPerTradePct: 1.0,
      minRiskRewardRatio: 2.0,
      maxRiskRewardRatio: 3.0,
      stopLossPipsOrPct: 15,
    },
    sessionRestrictions: ['LONDON', 'NEW_YORK'],
    maxPositions: 3,
    cooldown: 15,
    status: 'ACTIVE',
    environment: 'PAPER',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    versionHistory: [
      { version: '1.0', status: 'ACTIVE', updatedAt: new Date().toISOString(), description: 'Initial release', entryConditions: ['Liquidity sweep'], exitConditions: ['TP 1:2.5'] },
    ],
    markets: ['FOREX', 'SYNTHETICS', 'COMMODITIES'],
    preferredSessions: ['LONDON', 'NEW_YORK'],
    isPaused: false,
  },
  {
    id: 'strat-02',
    name: 'Volatility Expansion Trend Continuation',
    description: 'Captures strong trend continuation breakouts following range contraction squeezes in Forex and Synthetic indices.',
    version: '1.2',
    owner: 'Quant Desk',
    symbols: ['EURUSD', 'USDJPY', 'Volatility 100 Index'],
    timeframes: ['H1', 'H4'],
    entryConditions: ['Candle close above upper 20-period Donchian channel', 'RSI momentum > 55'],
    exitConditions: ['Trailing stop hit', 'Price re-enters prior range mid-point'],
    filters: ['Aligned bullish market structure > 50%', 'Min volume threshold met'],
    riskProfile: {
      maxRiskPerTradePct: 1.5,
      minRiskRewardRatio: 2.0,
      maxRiskRewardRatio: 3.0,
      stopLossPipsOrPct: 25,
    },
    sessionRestrictions: ['LONDON', 'NEW_YORK', 'TOKYO'],
    maxPositions: 2,
    cooldown: 30,
    status: 'ACTIVE',
    environment: 'PAPER',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    versionHistory: [
      { version: '1.0', status: 'BACKTESTED', updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(), description: 'Initial draft', entryConditions: ['Channel breakout'], exitConditions: ['Range mid-point'] },
      { version: '1.1', status: 'PAPER_APPROVED', updatedAt: new Date(Date.now() - 86400000).toISOString(), description: 'Added RSI filter', entryConditions: ['Channel breakout', 'RSI > 55'], exitConditions: ['Trailing stop'] },
      { version: '1.2', status: 'ACTIVE', updatedAt: new Date().toISOString(), description: 'Live paper approved', entryConditions: ['Channel breakout', 'RSI > 55'], exitConditions: ['Trailing stop'] },
    ],
    markets: ['FOREX', 'SYNTHETICS'],
    preferredSessions: ['LONDON', 'NEW_YORK', 'TOKYO'],
    isPaused: false,
  },
];

/**
 * Parses natural language strategy description into normalized strategy rules
 */
export function parseNaturalLanguageStrategy(promptText: string): StrategyValidationResult {
  const text = promptText.trim();
  const lower = text.toLowerCase();

  const errors: string[] = [];
  const warnings: string[] = [];

  if (text.length < 15) {
    errors.push('Strategy description is too short. Please provide details on markets, session, entry triggers, and risk rules.');
    return { isValid: false, errors, warnings };
  }

  // Extract Symbols/Markets
  const symbols: string[] = ['EURUSD', 'GBPUSD', 'XAUUSD'];
  if (lower.includes('gold') || lower.includes('xau')) symbols.push('XAUUSD');
  if (lower.includes('eur')) symbols.push('EURUSD');
  if (lower.includes('synth') || lower.includes('volatility')) symbols.push('Volatility 75 Index');

  // Extract Sessions
  const sessionRestrictions: string[] = [];
  if (lower.includes('london')) sessionRestrictions.push('LONDON');
  if (lower.includes('ny') || lower.includes('new york')) sessionRestrictions.push('NEW_YORK');
  if (sessionRestrictions.length === 0) sessionRestrictions.push('LONDON', 'NEW_YORK');

  // Extract Timeframes
  const timeframes: string[] = [];
  if (lower.includes('1m') || lower.includes('m1')) timeframes.push('M1');
  if (lower.includes('5m') || lower.includes('m5')) timeframes.push('M5');
  if (lower.includes('15m') || lower.includes('m15')) timeframes.push('M15');
  if (lower.includes('1h') || lower.includes('h1')) timeframes.push('H1');
  if (timeframes.length === 0) timeframes.push('M15', 'H1');

  const interpretedRules: UserStrategy = {
    id: `strat-user-${Date.now()}`,
    name: text.split('.')[0].substring(0, 45) || 'Custom Natural Language Strategy',
    description: text,
    version: '1.0',
    owner: 'Current Trader',
    symbols,
    timeframes,
    entryConditions: [
      lower.includes('sweep') ? 'Liquidity sweep outside key swing levels' : 'Market structure breakout trigger',
      lower.includes('pin') || lower.includes('engulf') ? 'Candlestick reversal pattern confirmation' : 'Momentum indicator alignment',
    ],
    exitConditions: [
      'Take profit hit at 1:2.5 Risk:Reward',
      'Stop loss triggered or market structure invalidation',
    ],
    filters: [
      'Avoid high-impact news within 30 minutes',
      'Minimum ATR volatility threshold met',
    ],
    riskProfile: {
      maxRiskPerTradePct: 1.0,
      minRiskRewardRatio: 2.0,
      maxRiskRewardRatio: 3.0,
      stopLossPipsOrPct: 20,
    },
    sessionRestrictions,
    maxPositions: 3,
    cooldown: 15,
    status: 'DRAFT', // Starts at DRAFT per lifecycle mandate (cannot go direct to LIVE)
    environment: 'PAPER',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    versionHistory: [
      { version: '1.0', status: 'DRAFT', updatedAt: new Date().toISOString(), description: 'Initial NL draft', entryConditions: ['Market structure trigger'], exitConditions: ['TP 1:2.5'] },
    ],
    rawNaturalLanguage: text,
    markets: lower.includes('gold') || lower.includes('xau') ? ['FOREX', 'COMMODITIES'] : ['FOREX', 'SYNTHETICS'],
    preferredSessions: sessionRestrictions,
    confirmationConditions: ['Market structure shift'],
    invalidationConditions: ['Candle close beyond swing boundary'],
    excludedConditions: ['High-impact news'],
    preferredVolatility: 'MEDIUM',
    newsRules: { avoidHighImpactNewsMinutes: 30 },
    isPaused: false,
  };

  return {
    isValid: true,
    errors,
    warnings,
    interpretedRules,
  };
}

/**
 * Evaluates market compatibility against a strategy
 */
export function evaluateMarketCompatibility(
  instrument: MarketInstrument,
  candles: NormalizedCandle[],
  strategy: UserStrategy
): MarketCompatibilityItem {
  const pros: string[] = [];
  const cons: string[] = [];

  // Check Category Match
  const categoryMatch = ((strategy.markets || strategy.symbols) || []).includes(instrument.category) || ((strategy.markets || strategy.symbols) || []).includes(instrument.symbol);
  if (categoryMatch) {
    pros.push(`Instrument category (${instrument.category}) matches strategy preferences`);
  } else {
    cons.push(`Instrument category (${instrument.category}) is not in strategy allowed list [${((strategy.markets || strategy.symbols) || []).join(', ')}]`);
  }

  // Analyze Structure & Patterns
  const structureAnalysis = analyzeMarketStructure(candles);
  const patterns = detectHistoricalPatterns(candles);

  let score = 50;

  if (categoryMatch) score += 20;

  if (structureAnalysis.structure === 'BULLISH' || structureAnalysis.structure === 'BEARISH') {
    score += 18;
    pros.push(`Current market structure is clean ${structureAnalysis.structure} (${structureAnalysis.trendStrengthPct}% trend strength)`);
  } else if (structureAnalysis.structure === 'BREAKOUT_PENDING') {
    score += 12;
    pros.push('Price is testing key range boundaries for potential breakout');
  } else {
    score -= 10;
    cons.push('Market structure is currently ranging/consolidating without clear directional bias');
  }

  const strongPattern = patterns.find((p) => p.confidenceScore > 75);
  if (strongPattern) {
    score += 15;
    pros.push(`Detected price pattern: ${strongPattern.patternName} (${strongPattern.description})`);
  }

  if (instrument.isMarketOpen) {
    pros.push('Market session is currently active with live tick liquidity');
    score += 5;
  } else {
    cons.push('Market session is currently closed');
    score -= 20;
  }

  const finalScore = Math.max(0, Math.min(100, score));

  let matchGrade: MarketCompatibilityItem['matchGrade'] = 'WATCH';
  if (finalScore >= 85) matchGrade = 'BEST MATCH';
  else if (finalScore >= 70) matchGrade = 'GOOD MATCH';
  else if (finalScore < 50) matchGrade = 'NOT SUITABLE';

  return {
    symbol: instrument.symbol,
    symbolName: instrument.name,
    category: instrument.category,
    compatibilityScore: finalScore,
    matchGrade,
    pros,
    cons,
    volatilityStatus: `${(structureAnalysis.atr * 10000).toFixed(1)} pips ATR`,
    structureMatch: structureAnalysis.structure !== 'UNCERTAIN' && structureAnalysis.structure !== 'RANGING',
    newsConflict: false,
    analyzedAt: new Date().toISOString(),
  };
}
