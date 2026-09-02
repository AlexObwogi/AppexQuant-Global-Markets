/**
 * AppexQuant Markets Global - Market Normalizer
 * Normalizes Deriv active symbols retrieved via active_symbols: "full", product_type: "basic".
 * Excludes blacklisted/invalid symbols (1HZ10V, 1HZ100V, cryETHUSD).
 */

import { DerivActiveSymbol } from './derivTypes.ts';
import { MarketInstrument, InstrumentCategory } from '../../types/market.ts';

const BLACKLISTED_SYMBOLS = new Set(['1HZ10V', '1HZ100V', 'cryETHUSD']);

export function mapDerivCategory(market: string, submarket?: string): InstrumentCategory {
  const m = (market || '').toLowerCase();
  const sub = (submarket || '').toLowerCase();

  if (m.includes('forex') || m.includes('fx')) return 'FOREX';
  if (m.includes('synthetic') || m.includes('volatility') || sub.includes('random') || m.includes('basket')) return 'SYNTHETICS';
  if (m.includes('crypto')) return 'CRYPTO';
  if (m.includes('commodit') || m.includes('metal') || m.includes('energy')) return 'COMMODITIES';
  if (m.includes('index') || m.includes('indices') || m.includes('stock')) return 'INDICES';
  return 'SYNTHETICS';
}

export function normalizeDerivActiveSymbols(rawSymbols: DerivActiveSymbol[]): MarketInstrument[] {
  if (!rawSymbols || !Array.isArray(rawSymbols)) return [];

  const normalized: MarketInstrument[] = [];

  for (const sym of rawSymbols) {
    if (!sym.symbol || !sym.display_name) continue;
    const symbolClean = sym.symbol.trim();

    if (BLACKLISTED_SYMBOLS.has(symbolClean)) {
      continue;
    }

    const category = mapDerivCategory(sym.market, sym.submarket);
    const pip = typeof sym.pip === 'number' ? sym.pip : 0.0001;

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

    normalized.push({
      id: symbolClean,
      symbol: symbolClean,
      name: sym.display_name,
      category,
      baseCurrency,
      quoteCurrency,
      pipSize: pip,
      minLotSize: 0.01,
      maxLotSize: 100,
      lotStep: 0.01,
      bid: 0,
      ask: 0,
      spread: 0,
      change24hPercentage: 0,
      isMarketOpen: (sym as any).exchange_is_open === 1 || (sym as any).exchange_is_open === true || sym.is_trading_suspended !== 1,
    });
  }

  return normalized;
}
