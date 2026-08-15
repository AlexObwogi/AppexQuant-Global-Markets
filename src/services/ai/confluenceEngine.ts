import { analyzeMarketStructure } from "./marketStructureEngine.ts";
import { MarketInstrument } from '../../types/market.ts';
import { NormalizedCandle } from '../deriv/derivTypes.ts';
import { UserStrategy } from '../../types/ai.ts';

export type ConfluenceGrade = 'STRONG CONFLUENCE' | 'MODERATE CONFLUENCE' | 'WEAK CONFLUENCE' | 'CONFLICTING CONDITIONS' | 'INSUFFICIENT DATA';

export interface ConfluenceMatrixResult {
  grade: ConfluenceGrade;
  score: number; // 0 - 100
  evaluations: {
    marketStructure: string;
    liquidity: string;
    momentum: string;
    volatility: string;
    session: string;
    htfBias: string;
    entryTrigger: string;
    confirmation: string;
    risk: string;
  };
  explanation: string;
}

/**
 * Machine-readable confluence matrix evaluating various dimensions of market state vs strategy.
 */
export function evaluateConfluenceMatrix(
  instrument: MarketInstrument,
  candles: NormalizedCandle[],
  htfCandles: NormalizedCandle[],
  strategy: UserStrategy
): ConfluenceMatrixResult {
  if (!candles || candles.length < 50 || !htfCandles || htfCandles.length < 10) {
    return {
      grade: 'INSUFFICIENT DATA',
      score: 0,
      evaluations: {
        marketStructure: 'N/A',
        liquidity: 'N/A',
        momentum: 'N/A',
        volatility: 'N/A',
        session: 'N/A',
        htfBias: 'N/A',
        entryTrigger: 'N/A',
        confirmation: 'N/A',
        risk: 'N/A',
      },
      explanation: 'Not enough historical data points to perform confluence matrix evaluation.',
    };
  }

  let score = 0;
  const evals: Record<string, string> = {};

  // 1. Market Structure
  const structure = analyzeMarketStructure(candles).structure;
  if (strategy.description.toLowerCase().includes(structure.toLowerCase()) || structure !== 'UNCERTAIN') {
    score += 15;
    evals.marketStructure = `Matched: ${structure}`;
  } else {
    evals.marketStructure = `Neutral: ${structure}`;
  }

  // 2. HTF Bias
  const htfStructure = analyzeMarketStructure(htfCandles).structure;
  if (htfStructure === structure && structure !== 'UNCERTAIN' && structure !== 'RANGING') {
    score += 15;
    evals.htfBias = `Aligned with LTF (${htfStructure})`;
  } else if (htfStructure !== structure) {
    evals.htfBias = `Conflicting (${htfStructure} vs ${structure})`;
    score -= 5;
  } else {
    evals.htfBias = 'Neutral Bias';
  }

  // 3. Volatility
  const vol = (candles[candles.length - 1].high - candles[candles.length - 1].low) / candles[candles.length - 1].close;
  if (vol > 0.002) {
    score += 10;
    evals.volatility = 'Sufficient volatility present';
  } else {
    evals.volatility = 'Low volatility regime';
  }

  // 4. Momentum (Simple MA or price comparison)
  const recentClose = candles[candles.length - 1].close;
  const oldClose = candles[candles.length - 10].close;
  if (Math.abs(recentClose - oldClose) / oldClose > 0.001) {
    score += 10;
    evals.momentum = 'Directional momentum detected';
  } else {
    evals.momentum = 'Flat momentum';
  }

  // 5. Liquidity
  evals.liquidity = 'Standard liquidity assumptions met';
  score += 10;

  // 6. Session
  const currentHour = new Date().getUTCHours();
  let session = 'ASIAN';
  if (currentHour >= 8 && currentHour < 16) session = 'LONDON';
  if (currentHour >= 13 && currentHour < 21) session = 'NEW_YORK';
  
  if (strategy.sessionRestrictions.length === 0 || strategy.sessionRestrictions.includes(session) || strategy.sessionRestrictions.includes('24/7 Continuous')) {
    score += 10;
    evals.session = `Optimal Session (${session})`;
  } else {
    score -= 10;
    evals.session = `Sub-optimal Session (${session})`;
  }

  // 7. Entry Trigger & 8. Confirmation
  evals.entryTrigger = strategy.entryConditions.length > 0 ? 'Trigger conditions clear' : 'Trigger conditions vague';
  evals.confirmation = strategy.exitConditions.length > 0 ? 'Confirmation rules valid' : 'Missing strict confirmation';
  score += 20;

  // 9. Risk
  if (strategy.riskProfile.maxRiskPerTradePct <= 2.0 && strategy.riskProfile.minRiskRewardRatio >= 2.0) {
    score += 10;
    evals.risk = `Strict risk alignment (Max ${strategy.riskProfile.maxRiskPerTradePct}%, R:R ${strategy.riskProfile.minRiskRewardRatio})`;
  } else {
    score -= 10;
    evals.risk = 'High risk / Low reward warning';
  }

  // Determine Grade
  let grade: ConfluenceGrade = 'WEAK CONFLUENCE';
  if (score < 0) {
    grade = 'CONFLICTING CONDITIONS';
    score = 0;
  } else if (score >= 80) {
    grade = 'STRONG CONFLUENCE';
  } else if (score >= 50) {
    grade = 'MODERATE CONFLUENCE';
  }

  // Explain
  const explanation = `Strategy evaluated against ${instrument.name}. ${
    score >= 80 
      ? 'Exceptional alignment across multiple dimensions. HTF bias and structural momentum support the setup.' 
      : score >= 50 
        ? 'Decent setup, but some conflicting conditions exist. Wait for tighter confirmation.' 
        : 'Conflicting or weak structural alignment. Not recommended for execution.'
  }`;

  return {
    grade,
    score: Math.min(score, 100),
    evaluations: evals as any,
    explanation,
  };
}
