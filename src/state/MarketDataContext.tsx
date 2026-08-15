/**
 * AppexQuant Markets Global - Authoritative Market Data Context
 * Single source of truth for live ticks, active symbols, historical candles, watchlist, and freshness.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { MarketInstrument, InstrumentCategory } from '../types/market.ts';
import { derivWs, DerivConnectionState } from '../services/deriv/DerivWebSocketManager.ts';
import { normalizeDerivActiveSymbols, FALLBACK_INSTRUMENTS } from '../services/deriv/marketTaxonomy.ts';
import { NormalizedTick, NormalizedCandle, DerivContractCategory } from '../services/deriv/derivTypes.ts';

export type DataFreshness = 'LIVE' | 'RECENT' | 'STALE' | 'DISCONNECTED' | 'UNAVAILABLE';

export interface MarketDataContextType {
  instruments: MarketInstrument[];
  availableInstruments: MarketInstrument[];
  selectedSymbol: string;
  selectedInstrument: MarketInstrument | null;
  selectedCategory: InstrumentCategory | 'ALL';
  selectedTimeframe: string;
  ticks: Record<string, NormalizedTick>;
  candles: Record<string, NormalizedCandle[]>;
  candleHistory: Record<string, NormalizedCandle[]>;
  watchlist: string[];
  searchQuery: string;
  connectionState: DerivConnectionState;
  isSimulated: boolean;
  dataFreshness: DataFreshness;
  contracts: Record<string, DerivContractCategory[]>;
  isLoadingSymbols: boolean;
  
  // Actions
  setSelectedSymbol: (symbol: string) => void;
  setSelectedCategory: (cat: InstrumentCategory | 'ALL') => void;
  setSelectedTimeframe: (tf: string) => void;
  setSearchQuery: (query: string) => void;
  toggleWatchlist: (symbol: string) => void;
  fetchCandles: (symbol: string, timeframe: string) => Promise<NormalizedCandle[]>;
  fetchContractsFor: (symbol: string) => Promise<DerivContractCategory[]>;
  reconnect: () => void;
}

const WATCHLIST_STORAGE_KEY = 'apx_watchlist_v1';

export const TIMEFRAME_TO_SECONDS: Record<string, number> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '30m': 1800,
  '1h': 3600,
  '4h': 14400,
  '1D': 86400,
  '1W': 604800,
};

const MarketDataContext = createContext<MarketDataContextType | undefined>(undefined);

export const MarketDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [instruments, setInstruments] = useState<MarketInstrument[]>(FALLBACK_INSTRUMENTS);
  const [selectedSymbol, setSelectedSymbolState] = useState<string>('frxEURUSD');
  const [selectedCategory, setSelectedCategory] = useState<InstrumentCategory | 'ALL'>('ALL');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('1h');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const [ticks, setTicks] = useState<Record<string, NormalizedTick>>({});
  const [candles, setCandles] = useState<Record<string, NormalizedCandle[]>>({});
  const [contracts, setContracts] = useState<Record<string, DerivContractCategory[]>>({});
  const [connectionState, setConnectionState] = useState<DerivConnectionState>('DISCONNECTED');
  const [isSimulated, setIsSimulated] = useState<boolean>(false);
  const [isLoadingSymbols, setIsLoadingSymbols] = useState<boolean>(true);

  // Watchlist stored in localStorage
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(WATCHLIST_STORAGE_KEY);
      return saved ? JSON.parse(saved) : ['frxEURUSD', 'R_100', 'cryBTCUSD', 'frxXAUUSD'];
    } catch {
      return ['frxEURUSD', 'R_100', 'cryBTCUSD', 'frxXAUUSD'];
    }
  });

  // Save Watchlist changes
  useEffect(() => {
    try {
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist));
    } catch (e) {
      console.warn('Failed to save watchlist:', e);
    }
  }, [watchlist]);

  // Connect to Deriv WebSocket on mount
  useEffect(() => {
    const unsubStatus = derivWs.onStatusChange((status) => {
      setConnectionState(status);
      setIsSimulated(derivWs.getIsSimulated());
    });

    derivWs.connect().then(async () => {
      setIsLoadingSymbols(true);
      try {
        const rawSymbols = await derivWs.fetchActiveSymbols();
        if (rawSymbols && rawSymbols.length > 0) {
          const normalized = normalizeDerivActiveSymbols(rawSymbols);
          setInstruments(normalized);
        }
      } catch (err) {
        console.warn('[MarketData] Failed to load active symbols from Deriv, using fallback:', err);
      } finally {
        setIsLoadingSymbols(false);
      }
    }).catch((err) => {
      console.warn('[MarketData] Connection initialization error:', err);
      setIsLoadingSymbols(false);
    });

    return () => {
      unsubStatus();
    };
  }, []);

  // Tick listener for selectedSymbol and watchlist
  useEffect(() => {
    const symbolsToSubscribe = Array.from(new Set([selectedSymbol, ...watchlist]));

    const handleTick = (tick: NormalizedTick) => {
      setTicks((prev) => ({
        ...prev,
        [tick.symbol]: tick,
      }));
    };

    symbolsToSubscribe.forEach((sym) => {
      derivWs.subscribeTick(sym, handleTick);
    });

    return () => {
      symbolsToSubscribe.forEach((sym) => {
        derivWs.unsubscribeTick(sym, handleTick);
      });
    };
  }, [selectedSymbol, watchlist, connectionState]);

  // Selected Instrument lookup
  const selectedInstrument = useMemo(() => {
    const found = instruments.find((i) => i.symbol === selectedSymbol);
    if (!found) return instruments[0] || null;

    // Attach latest live tick quote/bid/ask if available
    const tick = ticks[selectedSymbol];
    if (tick) {
      return {
        ...found,
        bid: tick.bid,
        ask: tick.ask,
        spread: Number((tick.ask - tick.bid).toFixed(5)),
        change24hPercentage: tick.changePct,
      };
    }
    return found;
  }, [instruments, selectedSymbol, ticks]);

  // Calculate Data Freshness
  const dataFreshness = useMemo<DataFreshness>(() => {
    if (connectionState !== 'CONNECTED') return 'DISCONNECTED';
    
    const tick = ticks[selectedSymbol];
    if (!tick) return 'UNAVAILABLE';

    const now = Date.now();
    const tickTime = tick.lastUpdated ? tick.lastUpdated.getTime() : 0;
    const diffSec = (now - tickTime) / 1000;

    if (diffSec <= 3) return 'LIVE';
    if (diffSec <= 10) return 'RECENT';
    return 'STALE';
  }, [connectionState, ticks, selectedSymbol]);

  // Actions
  const setSelectedSymbol = useCallback((symbol: string) => {
    setSelectedSymbolState(symbol);
  }, []);

  const toggleWatchlist = useCallback((symbol: string) => {
    setWatchlist((prev) =>
      prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol]
    );
  }, []);

  const fetchCandles = useCallback(async (symbol: string, timeframe: string): Promise<NormalizedCandle[]> => {
    const cacheKey = `${symbol}_${timeframe}`;
    const granularity = TIMEFRAME_TO_SECONDS[timeframe] || 3600;

    try {
      const fetchedCandles = await derivWs.fetchCandles(symbol, granularity, 200);
      if (fetchedCandles && fetchedCandles.length > 0) {
        setCandles((prev) => ({
          ...prev,
          [cacheKey]: fetchedCandles,
        }));
        return fetchedCandles;
      }
    } catch (err) {
      console.warn(`[MarketData] Failed to fetch candles for ${symbol}:`, err);
    }

    // Return cached candles or empty array if fetch fails
    return candles[cacheKey] || [];
  }, [candles]);

  const fetchContractsFor = useCallback(async (symbol: string): Promise<DerivContractCategory[]> => {
    if (contracts[symbol]) return contracts[symbol];
    try {
      const fetched = await derivWs.fetchContractsFor(symbol);
      setContracts((prev) => ({
        ...prev,
        [symbol]: fetched,
      }));
      return fetched;
    } catch {
      return [];
    }
  }, [contracts]);

  const reconnect = useCallback(() => {
    derivWs.connect();
  }, []);

  const value = useMemo(() => ({
        instruments,
        availableInstruments: instruments,
        selectedSymbol,
        selectedInstrument,
        selectedCategory,
        selectedTimeframe,
        ticks,
        candles,
        candleHistory: candles,
        watchlist,
        searchQuery,
        connectionState,
        isSimulated,
        dataFreshness,
        contracts,
        isLoadingSymbols,
        setSelectedSymbol,
        setSelectedCategory,
        setSelectedTimeframe,
        setSearchQuery,
        toggleWatchlist,
        fetchCandles,
        fetchContractsFor,
        reconnect,
  }), [
        instruments,
        selectedSymbol,
        selectedInstrument,
        selectedCategory,
        selectedTimeframe,
        ticks,
        candles,
        watchlist,
        searchQuery,
        connectionState,
        isSimulated,
        dataFreshness,
        contracts,
        isLoadingSymbols,
        setSelectedSymbol,
        setSelectedCategory,
        setSelectedTimeframe,
        setSearchQuery,
        toggleWatchlist,
        fetchCandles,
        fetchContractsFor,
        reconnect,
  ]);

  return (
    <MarketDataContext.Provider
      value={value}
    >
      {children}
    </MarketDataContext.Provider>
  );
};

export const useMarketData = (): MarketDataContextType => {
  const context = useContext(MarketDataContext);
  if (!context) {
    throw new Error('useMarketData must be used within a MarketDataProvider');
  }
  return context;
};
