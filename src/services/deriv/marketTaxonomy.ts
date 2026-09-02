/**
 * AppexQuant Markets Global - Market Taxonomy & Normalization Engine
 * Maps Deriv API active_symbols into normalized MarketInstrument records.
 */

import { DerivActiveSymbol } from './derivTypes.ts';
import { MarketInstrument, InstrumentCategory } from '../../types/market.ts';
import { BLACKLISTED_SYMBOLS, normalizeDerivActiveSymbols as normalizeDerivSymbols, mapDerivCategory } from './marketNormalization.ts';

export { BLACKLISTED_SYMBOLS, mapDerivCategory };

export const FALLBACK_INSTRUMENTS: MarketInstrument[] = [
  // Forex Majors & Minors
  {
    id: 'frxEURUSD',
    symbol: 'frxEURUSD',
    name: 'EUR/USD',
    category: 'FOREX',
    baseCurrency: 'EUR',
    quoteCurrency: 'USD',
    pipSize: 0.00001,
    minLotSize: 0.01,
    maxLotSize: 100,
    lotStep: 0.01,
    bid: 0,
    ask: 0,
    spread: 0,
    change24hPercentage: 0,
    isMarketOpen: true,
  },
  {
    id: 'frxGBPUSD',
    symbol: 'frxGBPUSD',
    name: 'GBP/USD',
    category: 'FOREX',
    baseCurrency: 'GBP',
    quoteCurrency: 'USD',
    pipSize: 0.00001,
    minLotSize: 0.01,
    maxLotSize: 100,
    lotStep: 0.01,
    bid: 0,
    ask: 0,
    spread: 0,
    change24hPercentage: 0,
    isMarketOpen: true,
  },
  {
    id: 'frxUSDJPY',
    symbol: 'frxUSDJPY',
    name: 'USD/JPY',
    category: 'FOREX',
    baseCurrency: 'USD',
    quoteCurrency: 'JPY',
    pipSize: 0.001,
    minLotSize: 0.01,
    maxLotSize: 100,
    lotStep: 0.01,
    bid: 0,
    ask: 0,
    spread: 0,
    change24hPercentage: 0,
    isMarketOpen: true,
  },
  {
    id: 'frxAUDUSD',
    symbol: 'frxAUDUSD',
    name: 'AUD/USD',
    category: 'FOREX',
    baseCurrency: 'AUD',
    quoteCurrency: 'USD',
    pipSize: 0.00001,
    minLotSize: 0.01,
    maxLotSize: 100,
    lotStep: 0.01,
    bid: 0,
    ask: 0,
    spread: 0,
    change24hPercentage: 0,
    isMarketOpen: true,
  },
  // Deriv Volatility & Synthetic Indices
  {
    id: 'R_100',
    symbol: 'R_100',
    name: 'Volatility 100 Index',
    category: 'SYNTHETICS',
    baseCurrency: 'USD',
    quoteCurrency: 'USD',
    pipSize: 0.01,
    minLotSize: 0.1,
    maxLotSize: 50,
    lotStep: 0.1,
    bid: 0,
    ask: 0,
    spread: 0,
    change24hPercentage: 0,
    isMarketOpen: true,
  },
  {
    id: 'R_50',
    symbol: 'R_50',
    name: 'Volatility 50 Index',
    category: 'SYNTHETICS',
    baseCurrency: 'USD',
    quoteCurrency: 'USD',
    pipSize: 0.001,
    minLotSize: 0.1,
    maxLotSize: 50,
    lotStep: 0.1,
    bid: 0,
    ask: 0,
    spread: 0,
    change24hPercentage: 0,
    isMarketOpen: true,
  },
  {
    id: 'R_75',
    symbol: 'R_75',
    name: 'Volatility 75 Index',
    category: 'SYNTHETICS',
    baseCurrency: 'USD',
    quoteCurrency: 'USD',
    pipSize: 0.0001,
    minLotSize: 0.01,
    maxLotSize: 50,
    lotStep: 0.01,
    bid: 0,
    ask: 0,
    spread: 0,
    change24hPercentage: 0,
    isMarketOpen: true,
  },
  // Commodities / Metals
  {
    id: 'frxXAUUSD',
    symbol: 'frxXAUUSD',
    name: 'Gold / USD',
    category: 'COMMODITIES',
    baseCurrency: 'XAU',
    quoteCurrency: 'USD',
    pipSize: 0.01,
    minLotSize: 0.01,
    maxLotSize: 20,
    lotStep: 0.01,
    bid: 0,
    ask: 0,
    spread: 0,
    change24hPercentage: 0,
    isMarketOpen: true,
  },
  // Crypto
  {
    id: 'cryBTCUSD',
    symbol: 'cryBTCUSD',
    name: 'Bitcoin / USD',
    category: 'CRYPTO',
    baseCurrency: 'BTC',
    quoteCurrency: 'USD',
    pipSize: 0.01,
    minLotSize: 0.01,
    maxLotSize: 10,
    lotStep: 0.01,
    bid: 0,
    ask: 0,
    spread: 0,
    change24hPercentage: 0,
    isMarketOpen: true,
  },
];

export function mapDerivMarketCategory(derivMarket: string, derivSubmarket?: string): InstrumentCategory {
  const m = (derivMarket || '').toLowerCase();
  const sub = (derivSubmarket || '').toLowerCase();

  if (m.includes('forex') || m.includes('fx')) {
    return 'FOREX';
  }
  if (m.includes('synthetic') || m.includes('volatility') || sub.includes('random') || m.includes('basket')) {
    return 'SYNTHETICS';
  }
  if (m.includes('crypto')) {
    return 'CRYPTO';
  }
  if (m.includes('commodit') || m.includes('metal') || m.includes('energy')) {
    return 'COMMODITIES';
  }
  if (m.includes('index') || m.includes('indices') || m.includes('stock')) {
    return 'INDICES';
  }
  return 'SYNTHETICS';
}

export function normalizeDerivActiveSymbols(rawSymbols: DerivActiveSymbol[]): MarketInstrument[] {
  if (!rawSymbols || !Array.isArray(rawSymbols) || rawSymbols.length === 0) {
    return FALLBACK_INSTRUMENTS;
  }
  const result = normalizeDerivSymbols(rawSymbols);
  return result.length > 0 ? result : FALLBACK_INSTRUMENTS;
}
