/**
 * AppexQuant Markets Global - Market Taxonomy & Normalization Engine
 * Maps Deriv API active_symbols into normalized MarketInstrument records.
 */

import { DerivActiveSymbol } from './derivTypes.ts';
import { MarketInstrument, InstrumentCategory } from '../../types/market.ts';

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
    bid: 0,
    ask: 0,
    spread: 0,
    change24hPercentage: 0,
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

  const normalized: MarketInstrument[] = [];

  for (const sym of rawSymbols) {
    if (!sym.symbol || !sym.display_name) continue;

    const category = mapDerivMarketCategory(sym.market, sym.submarket);
    const pip = sym.pip || 0.0001;
    const spotPrice = typeof sym.spot === 'number' && sym.spot > 0 ? sym.spot : 0;

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

    const bid = spotPrice;
    const ask = spotPrice > 0 ? spotPrice + pip * 2 : 0;
    const spread = spotPrice > 0 ? Number((pip * 2).toFixed(5)) : 0;

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
      bid,
      ask,
      spread,
      change24hPercentage: 0.0,
      isMarketOpen: sym.is_trading_suspended !== 1,
    });
  }

  return normalized.length > 0 ? normalized : FALLBACK_INSTRUMENTS;
}
