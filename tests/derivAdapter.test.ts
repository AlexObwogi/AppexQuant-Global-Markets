/**
 * AppexQuant Markets Global - Phase 2 Deriv WebSocket Adapter Tests
 */

import { describe, it, expect } from 'vitest';
import { normalizeDerivActiveSymbols, mapDerivMarketCategory, FALLBACK_INSTRUMENTS } from '../src/services/deriv/marketTaxonomy';
import { DerivActiveSymbol } from '../src/services/deriv/derivTypes';

describe('Deriv Market Taxonomy & Normalization Engine', () => {
  it('correctly maps Deriv market names to normalized categories', () => {
    expect(mapDerivMarketCategory('forex')).toBe('FOREX');
    expect(mapDerivMarketCategory('synthetic_index')).toBe('SYNTHETICS');
    expect(mapDerivMarketCategory('cryptocurrency')).toBe('CRYPTO');
    expect(mapDerivMarketCategory('commodities')).toBe('COMMODITIES');
    expect(mapDerivMarketCategory('indices')).toBe('INDICES');
  });

  it('normalizes raw Deriv active_symbols list into MarketInstrument array', () => {
    const rawSymbols: DerivActiveSymbol[] = [
      {
        symbol: 'frxEURUSD',
        display_name: 'EUR/USD',
        market: 'forex',
        market_display_name: 'Forex',
        submarket: 'major_pairs',
        submarket_display_name: 'Major Pairs',
        pip: 0.00001,
        is_trading_suspended: 0,
        spot: 1.0850,
      },
      {
        symbol: 'R_100',
        display_name: 'Volatility 100 Index',
        market: 'synthetic_index',
        market_display_name: 'Synthetic Indices',
        submarket: 'random_index',
        submarket_display_name: 'Continuous Indices',
        pip: 0.01,
        is_trading_suspended: 0,
        spot: 2045.50,
      },
    ];

    const normalized = normalizeDerivActiveSymbols(rawSymbols);

    expect(normalized).toHaveLength(2);
    expect(normalized[0].symbol).toBe('frxEURUSD');
    expect(normalized[0].category).toBe('FOREX');
    expect(normalized[0].bid).toBe(1.0850);

    expect(normalized[1].symbol).toBe('R_100');
    expect(normalized[1].category).toBe('SYNTHETICS');
    expect(normalized[1].bid).toBe(2045.50);
  });

  it('returns fallback instruments if Deriv raw list is empty or invalid', () => {
    const emptyResult = normalizeDerivActiveSymbols([]);
    expect(emptyResult).toEqual(FALLBACK_INSTRUMENTS);
    expect(emptyResult.length).toBeGreaterThan(0);
  });
});
