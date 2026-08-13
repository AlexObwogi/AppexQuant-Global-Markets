/**
 * AppexQuant Markets Global - Market Taxonomy & Normalization Engine
 * Maps Deriv API active_symbols into normalized MarketInstrument records.
 */

import { DerivActiveSymbol } from './derivTypes';
import { MarketInstrument, InstrumentCategory } from '../../types/market';

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
    bid: 1.08450,
    ask: 1.08456,
    spread: 0.6,
    change24hPercentage: 0.14,
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
    bid: 1.29820,
    ask: 1.29828,
    spread: 0.8,
    change24hPercentage: -0.08,
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
    bid: 148.650,
    ask: 148.658,
    spread: 0.8,
    change24hPercentage: 0.35,
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
    bid: 0.65420,
    ask: 0.65426,
    spread: 0.6,
    change24hPercentage: -0.12,
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
    bid: 2045.12,
    ask: 2045.32,
    spread: 0.2,
    change24hPercentage: 1.25,
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
    bid: 284.125,
    ask: 284.150,
    spread: 0.025,
    change24hPercentage: -0.42,
    isMarketOpen: true,
  },
  {
    id: '1HZ10V',
    symbol: '1HZ10V',
    name: 'Volatility 10 (1s) Index',
    category: 'SYNTHETICS',
    baseCurrency: 'USD',
    quoteCurrency: 'USD',
    pipSize: 0.001,
    minLotSize: 0.1,
    maxLotSize: 50,
    lotStep: 0.1,
    bid: 10450.80,
    ask: 10451.10,
    spread: 0.3,
    change24hPercentage: 0.88,
    isMarketOpen: true,
  },
  {
    id: '1HZ100V',
    symbol: '1HZ100V',
    name: 'Volatility 100 (1s) Index',
    category: 'SYNTHETICS',
    baseCurrency: 'USD',
    quoteCurrency: 'USD',
    pipSize: 0.01,
    minLotSize: 0.1,
    maxLotSize: 50,
    lotStep: 0.1,
    bid: 1845.50,
    ask: 1845.75,
    spread: 0.25,
    change24hPercentage: -1.15,
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
    bid: 2742.30,
    ask: 2742.60,
    spread: 0.3,
    change24hPercentage: 0.72,
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
    bid: 96450.00,
    ask: 96465.00,
    spread: 15.0,
    change24hPercentage: 2.45,
    isMarketOpen: true,
  },
  {
    id: 'cryETHUSD',
    symbol: 'cryETHUSD',
    name: 'Ethereum / USD',
    category: 'CRYPTO',
    baseCurrency: 'ETH',
    quoteCurrency: 'USD',
    pipSize: 0.01,
    minLotSize: 0.01,
    maxLotSize: 50,
    lotStep: 0.01,
    bid: 3420.50,
    ask: 3421.20,
    spread: 0.7,
    change24hPercentage: 1.82,
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

  const normalized: MarketInstrument[] = [];

  for (const sym of rawSymbols) {
    if (!sym.symbol || !sym.display_name) continue;

    const category = mapDerivMarketCategory(sym.market, sym.submarket);
    const pip = sym.pip || 0.0001;
    const spotPrice = sym.spot && sym.spot > 0 ? sym.spot : 100.0;

    // Parse base/quote from symbol or display name
    let baseCurrency = 'USD';
    let quoteCurrency = 'USD';
    if (sym.display_name.includes('/')) {
      const parts = sym.display_name.split('/');
      baseCurrency = parts[0].trim();
      quoteCurrency = parts[1].trim();
    } else {
      baseCurrency = sym.symbol.substring(0, 3).toUpperCase();
      quoteCurrency = sym.symbol.substring(3).toUpperCase() || 'USD';
    }

    normalized.push({
      id: sym.symbol,
      symbol: sym.symbol,
      name: sym.display_name,
      category,
      baseCurrency,
      quoteCurrency,
      pipSize: pip,
      minLotSize: sym.min_stake || 0.01,
      maxLotSize: sym.max_stake || 100,
      lotStep: 0.01,
      bid: spotPrice,
      ask: spotPrice + pip * 2,
      spread: Number((pip * 2).toFixed(5)),
      change24hPercentage: 0.0,
      isMarketOpen: sym.is_trading_suspended !== 1,
    });
  }

  return normalized.length > 0 ? normalized : FALLBACK_INSTRUMENTS;
}
