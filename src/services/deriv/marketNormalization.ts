/**
 * AppexQuant Markets Global - Market Normalization Engine
 * Normalizes Deriv active symbols retrieved via { active_symbols: "full", product_type: "basic" }.
 * Excludes blacklisted/obsolete symbols (1HZ10V, 1HZ100V, cryETHUSD) and prevents invalid subscriptions.
 */

import { DerivActiveSymbol } from './derivTypes.js';
import { MarketInstrument, InstrumentCategory } from '../../types/market.js';

export const BLACKLISTED_SYMBOLS = new Set<string>([
  '1HZ10V',
  '1HZ100V',
  'cryETHUSD',
]);

export function isSymbolBlacklisted(symbol: string): boolean {
  if (!symbol) return true;
  const clean = symbol.trim();
  if (BLACKLISTED_SYMBOLS.has(clean)) return true;
  // Exclude legacy or malformed symbols
  if (clean.startsWith('1HZ10V') || clean.startsWith('1HZ100V') || clean === 'cryETHUSD') return true;
  return false;
}

export const OFFICIAL_FALLBACK_INSTRUMENTS: MarketInstrument[] = [
  // Forex Majors
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
  // Deriv Continuous Volatility Indices
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
  // Commodities
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

export function mapDerivCategory(market: string, submarket?: string): InstrumentCategory {
  const m = (market || '').toLowerCase();
  const sub = (submarket || '').toLowerCase();

  if (m.includes('forex') || m.includes('fx')) return 'FOREX';
  if (m.includes('synthetic') || m.includes('volatility') || sub.includes('random') || m.includes('basket') || m.includes('derived')) return 'SYNTHETICS';
  if (m.includes('crypto')) return 'CRYPTO';
  if (m.includes('commodit') || m.includes('metal') || m.includes('energy') || m.includes('gold') || m.includes('oil')) return 'COMMODITIES';
  if (m.includes('index') || m.includes('indices') || m.includes('stock')) return 'INDICES';
  return 'SYNTHETICS';
}

export function normalizeDerivActiveSymbols(rawSymbols: DerivActiveSymbol[]): MarketInstrument[] {
  if (!rawSymbols || !Array.isArray(rawSymbols) || rawSymbols.length === 0) {
    return OFFICIAL_FALLBACK_INSTRUMENTS;
  }

  const normalized: MarketInstrument[] = [];
  const seenSymbols = new Set<string>();

  for (const sym of rawSymbols) {
    if (!sym.symbol || !sym.display_name) continue;
    const symbolClean = sym.symbol.trim();

    // Reject blacklisted and duplicate symbols
    if (isSymbolBlacklisted(symbolClean) || seenSymbols.has(symbolClean)) {
      continue;
    }
    seenSymbols.add(symbolClean);

    const category = mapDerivCategory(sym.market, sym.submarket);
    const pip = typeof sym.pip === 'number' && sym.pip > 0 ? sym.pip : 0.0001;
    const spotPrice = typeof sym.spot === 'number' && sym.spot > 0 ? sym.spot : 0;

    let baseCurrency = 'USD';
    let quoteCurrency = 'USD';
    if (sym.display_name.includes('/')) {
      const parts = sym.display_name.split('/');
      baseCurrency = parts[0].trim();
      quoteCurrency = parts[1].trim();
    } else {
      baseCurrency = symbolClean.substring(0, 3).toUpperCase();
      quoteCurrency = symbolClean.substring(3).toUpperCase() || 'USD';
    }

    const bid = spotPrice;
    const ask = spotPrice > 0 ? spotPrice + pip * 2 : 0;
    const spread = spotPrice > 0 ? Number((pip * 2).toFixed(5)) : 0;

    normalized.push({
      id: symbolClean,
      symbol: symbolClean,
      name: sym.display_name,
      category,
      baseCurrency,
      quoteCurrency,
      pipSize: pip,
      minLotSize: typeof (sym as any).min_stake === 'number' ? (sym as any).min_stake : 0.01,
      maxLotSize: typeof (sym as any).max_stake === 'number' ? (sym as any).max_stake : 100,
      lotStep: 0.01,
      bid,
      ask,
      spread,
      change24hPercentage: 0,
      isMarketOpen: (sym as any).exchange_is_open === 1 || (sym as any).exchange_is_open === true || sym.is_trading_suspended !== 1,
    });
  }

  return normalized.length > 0 ? normalized : OFFICIAL_FALLBACK_INSTRUMENTS;
}

export function extractAvailableSymbols(instruments: MarketInstrument[]): Set<string> {
  const set = new Set<string>();
  if (!instruments || !Array.isArray(instruments)) return set;
  for (const inst of instruments) {
    if (inst.symbol && !isSymbolBlacklisted(inst.symbol)) {
      set.add(inst.symbol);
    }
  }
  return set;
}
