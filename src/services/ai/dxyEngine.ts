/**
 * AppexQuant Markets Global - Phase 3 DXY Context Engine
 * Measures US Dollar Index momentum and symbol correlation coefficients.
 */

import { DXYContext } from '../../types/ai';

const DEFAULT_CORRELATIONS: Record<string, number> = {
  frxEURUSD: -0.94,
  frxGBPUSD: -0.88,
  frxUSDJPY: 0.82,
  frxAUDUSD: -0.85,
  frxUSDCAD: 0.79,
  frxUSDCHF: 0.91,
  frxXAUUSD: -0.81,
  cryBTCUSD: -0.45,
};

export function getDXYContext(dxyQuote?: number, dxyChangePct?: number): DXYContext {
  const price = dxyQuote || 103.45;
  const changePct = dxyChangePct !== undefined ? dxyChangePct : -0.18;

  let direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  if (changePct > 0.05) direction = 'BULLISH';
  if (changePct < -0.05) direction = 'BEARISH';

  let momentum: 'STRONG' | 'MODERATE' | 'WEAK' = 'MODERATE';
  if (Math.abs(changePct) > 0.3) momentum = 'STRONG';
  if (Math.abs(changePct) < 0.1) momentum = 'WEAK';

  return {
    symbol: 'DXY',
    price,
    change24hPct: changePct,
    direction,
    momentum,
    correlations: DEFAULT_CORRELATIONS,
    updatedAt: new Date().toISOString(),
  };
}

export function evaluateDXYAlignment(symbol: string, signalDirection: 'LONG' | 'SHORT', dxy: DXYContext): {
  isAligned: boolean;
  scoreBonus: number;
  explanation: string;
} {
  const correlation = dxy.correlations[symbol] || (symbol.includes('USD') && symbol.startsWith('frx') ? -0.85 : 0);

  if (correlation === 0) {
    return {
      isAligned: true,
      scoreBonus: 5,
      explanation: `${symbol} has neutral correlation to DXY`,
    };
  }

  // Inverse correlated assets (e.g. EURUSD, correlation -0.94):
  // If signal is LONG EURUSD, we want DXY to be BEARISH or NEUTRAL
  const isInverse = correlation < 0;
  let aligned = false;

  if (signalDirection === 'LONG') {
    aligned = isInverse ? dxy.direction === 'BEARISH' || dxy.direction === 'NEUTRAL' : dxy.direction === 'BULLISH';
  } else if (signalDirection === 'SHORT') {
    aligned = isInverse ? dxy.direction === 'BULLISH' || dxy.direction === 'NEUTRAL' : dxy.direction === 'BEARISH';
  }

  const bonus = aligned ? (dxy.momentum === 'STRONG' ? 15 : 10) : -10;

  return {
    isAligned: aligned,
    scoreBonus: bonus,
    explanation: aligned
      ? `DXY ${dxy.direction} momentum (${dxy.change24hPct.toFixed(2)}%) provides macro tailwind for ${signalDirection} ${symbol} (correlation: ${correlation})`
      : `DXY ${dxy.direction} momentum conflicts with ${signalDirection} ${symbol} (correlation: ${correlation})`,
  };
}
