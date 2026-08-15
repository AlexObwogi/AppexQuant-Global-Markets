/**
 * AppexQuant Markets Global - Phase 3 Market Structure Engine
 * Analyzes market structure (Swing Highs/Lows, Trend, ATR Volatility) from real candle data.
 */

import { NormalizedCandle } from '../deriv/derivTypes.ts';
import { MarketStructureType } from '../../types/ai.ts';

export interface MarketStructureAnalysis {
  structure: MarketStructureType;
  swingHigh: number;
  swingLow: number;
  atr: number;
  trendStrengthPct: number; // 0 - 100
  reasoning: string;
}

export function analyzeMarketStructure(candles: NormalizedCandle[]): MarketStructureAnalysis {
  if (!candles || candles.length < 10) {
    return {
      structure: 'UNCERTAIN',
      swingHigh: 0,
      swingLow: 0,
      atr: 0,
      trendStrengthPct: 0,
      reasoning: 'Insufficient candle data (less than 10 periods available)',
    };
  }

  const recent = candles.slice(-30);
  const highest = Math.max(...recent.map((c) => c.high));
  const lowest = Math.min(...recent.map((c) => c.low));
  const lastClose = recent[recent.length - 1].close;
  const firstClose = recent[0].close;

  // Simple Average True Range (ATR 14)
  let trSum = 0;
  for (let i = 1; i < recent.length; i++) {
    const high = recent[i].high;
    const low = recent[i].low;
    const prevClose = recent[i - 1].close;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trSum += tr;
  }
  const atr = Number((trSum / (recent.length - 1)).toFixed(5));

  // Determine Higher Highs & Higher Lows
  const mid = Math.floor(recent.length / 2);
  const firstHalf = recent.slice(0, mid);
  const secondHalf = recent.slice(mid);

  const firstHalfHigh = Math.max(...firstHalf.map((c) => c.high));
  const firstHalfLow = Math.min(...firstHalf.map((c) => c.low));
  const secondHalfHigh = Math.max(...secondHalf.map((c) => c.high));
  const secondHalfLow = Math.min(...secondHalf.map((c) => c.low));

  const isBullish = secondHalfHigh > firstHalfHigh && secondHalfLow > firstHalfLow;
  const isBearish = secondHalfHigh < firstHalfHigh && secondHalfLow < firstHalfLow;

  const priceRange = highest - lowest;
  const priceNetChange = Math.abs(lastClose - firstClose);
  const trendStrengthPct = priceRange > 0 ? Math.min(100, Math.round((priceNetChange / priceRange) * 100)) : 0;

  let structure: MarketStructureType = 'RANGING';
  let reasoning = 'Price is consolidating within a defined horizontal range';

  if (isBullish && trendStrengthPct >= 40) {
    structure = 'BULLISH';
    reasoning = `Higher highs (${secondHalfHigh.toFixed(5)}) and higher lows (${secondHalfLow.toFixed(5)}) indicate bullish market structure`;
  } else if (isBearish && trendStrengthPct >= 40) {
    structure = 'BEARISH';
    reasoning = `Lower highs (${secondHalfHigh.toFixed(5)}) and lower lows (${secondHalfLow.toFixed(5)}) indicate bearish market structure`;
  } else if (lastClose > highest - atr) {
    structure = 'BREAKOUT_PENDING';
    reasoning = `Price close (${lastClose.toFixed(5)}) testing upper range swing high (${highest.toFixed(5)})`;
  }

  return {
    structure,
    swingHigh: highest,
    swingLow: lowest,
    atr,
    trendStrengthPct,
    reasoning,
  };
}
