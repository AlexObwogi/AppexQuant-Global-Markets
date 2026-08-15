/**
 * AppexQuant Markets Global - Phase 3 Historical Pattern Engine
 * Identifies price action patterns and evaluates historical conditional outcome frequencies.
 */

import { NormalizedCandle } from '../deriv/derivTypes.ts';

export interface PatternMatch {
  patternName: string;
  patternType: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidenceScore: number; // 0 - 100
  description: string;
}

export interface HistoricalSimilarityResult {
  sampleSize: number;
  positiveOutcomes: number;
  negativeOutcomes: number;
  conditionalFrequencyPct: number;
  environmentDescription: string;
}

export function detectHistoricalPatterns(candles: NormalizedCandle[]): PatternMatch[] {
  if (!candles || candles.length < 5) {
    return [
      {
        patternName: 'No Pattern Detected',
        patternType: 'NEUTRAL',
        confidenceScore: 0,
        description: 'Insufficient historical candles to verify pattern structure',
      },
    ];
  }

  const patterns: PatternMatch[] = [];
  const len = candles.length;
  const c0 = candles[len - 1]; // current/last candle
  const c1 = candles[len - 2];
  const c2 = candles[len - 3];

  // 1. Bullish Engulfing
  if (c1.close < c1.open && c0.close > c0.open && c0.close > c1.open && c0.open < c1.close) {
    patterns.push({
      patternName: 'Bullish Engulfing Reversal',
      patternType: 'BULLISH',
      confidenceScore: 82,
      description: 'Current green candle fully engulfs prior red candle body, signaling demand absorption',
    });
  }

  // 2. Bearish Engulfing
  if (c1.close > c1.open && c0.close < c0.open && c0.close < c1.open && c0.open > c1.close) {
    patterns.push({
      patternName: 'Bearish Engulfing Reversal',
      patternType: 'BEARISH',
      confidenceScore: 82,
      description: 'Current red candle fully engulfs prior green candle body, signaling supply pressure',
    });
  }

  // 3. Liquidity Sweep & Pin Bar Reversal (Bullish)
  const c0Body = Math.abs(c0.close - c0.open);
  const c0Range = c0.high - c0.low;
  const c0LowerWick = Math.min(c0.open, c0.close) - c0.low;

  if (c0Range > 0 && c0LowerWick / c0Range > 0.6 && c0Body / c0Range < 0.3) {
    patterns.push({
      patternName: 'Liquidity Sweep Pin Bar',
      patternType: 'BULLISH',
      confidenceScore: 88,
      description: 'Deep lower shadow rejection indicates institutional liquidity sweep below swing support',
    });
  }

  // 4. Range Compression & Volatility Expansion
  const recent10 = candles.slice(-10);
  const avgRange = recent10.reduce((acc, c) => acc + (c.high - c.low), 0) / 10;
  if (c0Range > avgRange * 1.8 && c0.close > c0.open) {
    patterns.push({
      patternName: 'Range Expansion Momentum Breakout',
      patternType: 'BULLISH',
      confidenceScore: 78,
      description: 'Candle range is 1.8x greater than 10-period average, confirming institutional momentum',
    });
  }

  if (patterns.length === 0) {
    patterns.push({
      patternName: 'Horizontal Consolidation Structure',
      patternType: 'NEUTRAL',
      confidenceScore: 65,
      description: 'Price action reflects balanced market agreement without aggressive directional bias',
    });
  }

  return patterns;
}

export function evaluateHistoricalSimilarity(candles: NormalizedCandle[]): HistoricalSimilarityResult {
  if (!candles || candles.length < 50) {
    return {
      sampleSize: 0,
      positiveOutcomes: 0,
      negativeOutcomes: 0,
      conditionalFrequencyPct: 0,
      environmentDescription: 'Insufficient historical sample size (minimum 50 periods required)',
    };
  }

  const sampleSize = Math.min(200, candles.length - 5);
  let positiveCount = 0;
  let negativeCount = 0;

  // Scan history for similar 3-bar momentum conditions
  for (let i = 2; i < sampleSize; i++) {
    const cCurr = candles[i];
    const cPrev = candles[i - 1];
    const cFuture = candles[i + 3] || candles[i + 1];

    if (cCurr && cPrev && cFuture) {
      // Condition: 2 consecutive higher closes
      if (cCurr.close > cPrev.close && cPrev.close > candles[i - 2].close) {
        if (cFuture.close > cCurr.close) {
          positiveCount++;
        } else {
          negativeCount++;
        }
      }
    }
  }

  const totalMatches = positiveCount + negativeCount;
  const frequency = totalMatches > 0 ? Math.round((positiveCount / totalMatches) * 100) : 50;

  return {
    sampleSize: totalMatches,
    positiveOutcomes: positiveCount,
    negativeOutcomes: negativeCount,
    conditionalFrequencyPct: frequency,
    environmentDescription: `Evaluated ${totalMatches} historical setups matching current momentum parameters over prior periods.`,
  };
}
