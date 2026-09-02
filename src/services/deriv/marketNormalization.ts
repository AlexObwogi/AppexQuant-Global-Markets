/**
 * AppexQuant Markets Global - Market Normalization Engine
 * Normalizes Deriv active symbols retrieved via active_symbols: "full", product_type: "basic".
 * Excludes blacklisted/invalid symbols (1HZ10V, 1HZ100V, cryETHUSD) and symbols rejected by Deriv.
 */

import { DerivActiveSymbol } from './derivTypes.ts';
import { MarketInstrument, InstrumentCategory } from '../../types/market.ts';

export const BLACKLISTED_SYMBOLS = new Set<string>([
  '1HZ10V',
  '1HZ100V',
  'cryETHUSD',
]);

export function isSymbolBlacklisted(symbol: string): boolean {
  if (!symbol) return true;
  return BLACKLISTED_SYMBOLS.has(symbol.trim());
}

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
  if (!rawSymbols || !Array.isArray(rawSymbols)) return [];

  const normalized: MarketInstrument[] = [];
  const seenSymbols = new Set<string>();

  for (const sym of rawSymbols) {
    if (!sym.symbol || !sym.display_name) continue;
    const symbolClean = sym.symbol.trim();

    // Reject blacklisted and duplicate symbols
    if (BLACKLISTED_SYMBOLS.has(symbolClean) || seenSymbols.has(symbolClean)) {
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

  return normalized;
}

export function extractAvailableSymbols(instruments: MarketInstrument[]): Set<string> {
  const set = new Set<string>();
  if (!instruments || !Array.isArray(instruments)) return set;
  for (const inst of instruments) {
    if (inst.symbol && !BLACKLISTED_SYMBOLS.has(inst.symbol)) {
      set.add(inst.symbol);
    }
  }
  return set;
}
