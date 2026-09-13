import { describe, it, expect } from 'vitest';
import { normalizeDerivActiveSymbols, extractAvailableSymbols } from '../src/services/deriv/marketNormalization';

describe('Deriv Active Symbols and Closed Market Handling', () => {
  it('correctly maps exchange_is_open flag to isMarketOpen boolean', () => {
    const rawData = [
      {
        underlying_symbol: 'frxEURUSD',
        underlying_symbol_name: 'EUR/USD',
        market: 'forex',
        submarket: 'major_pairs',
        exchange_is_open: 0,
        is_trading_suspended: 0,
        pip_size: 0.00001,
      },
      {
        underlying_symbol: '1HZ100V',
        underlying_symbol_name: 'Volatility 100 (1s) Index',
        market: 'synthetic_index',
        submarket: 'random_index',
        exchange_is_open: 1,
        is_trading_suspended: 0,
        pip_size: 0.01,
      },
      {
        symbol: 'cryBTCUSD',
        display_name: 'BTC/USD',
        market: 'cryptocurrency',
        submarket: 'crypto',
        exchange_is_open: 1,
        is_trading_suspended: 1, // suspended
        pip: 0.01,
      },
    ];

    const normalized = normalizeDerivActiveSymbols(rawData as any);
    expect(normalized.length).toBe(3);

    const eurUsd = normalized.find((i) => i.symbol === 'frxEURUSD');
    expect(eurUsd).toBeDefined();
    expect(eurUsd?.name).toBe('EUR/USD');
    expect(eurUsd?.isMarketOpen).toBe(false);

    const vol100 = normalized.find((i) => i.symbol === '1HZ100V');
    expect(vol100).toBeDefined();
    expect(vol100?.isMarketOpen).toBe(true);

    const btc = normalized.find((i) => i.symbol === 'cryBTCUSD');
    expect(btc).toBeDefined();
    expect(btc?.isMarketOpen).toBe(false); // Suspended
  });

  it('extractAvailableSymbols extracts all valid symbols', () => {
    const instruments = [
      { id: 'frxEURUSD', symbol: 'frxEURUSD' },
      { id: '1HZ100V', symbol: '1HZ100V' },
    ];
    const available = extractAvailableSymbols(instruments as any);
    expect(available.has('frxEURUSD')).toBe(true);
    expect(available.has('1HZ100V')).toBe(true);
    expect(available.has('unknown')).toBe(false);
  });
});
