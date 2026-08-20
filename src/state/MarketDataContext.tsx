/**
 * AppexQuant Markets Global - Centralized Authoritative Market Data Context & WebSocket Manager
 * Single source of truth for live ticks, active symbols, historical candles, watchlist,
 * centralized WebSocket subscription deduplication, and per-feed freshness/stale tracking.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo, useRef } from 'react';
import { MarketInstrument, InstrumentCategory } from '../types/market.ts';
import { derivWs, DerivConnectionState } from '../services/deriv/DerivWebSocketManager.ts';
import { derivAuthService } from '../services/deriv/authService.ts';
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
  
  // Per-feed and global freshness/stale tracking
  dataFreshness: DataFreshness;
  isStale: Record<string, boolean>;
  feedStatus: Record<string, DataFreshness>;
  feedLatencyMs: Record<string, number>;
  lastTickReceivedAt: Record<string, number>;
  isSymbolStale: (symbol: string) => boolean;
  getSymbolFreshness: (symbol: string) => DataFreshness;
  getSymbolLatency: (symbol: string) => number;
  getLatestTick: (symbol: string) => NormalizedTick | undefined;

  contracts: Record<string, DerivContractCategory[]>;
  isLoadingSymbols: boolean;
  balance: number | null;
  currency: string;
  loginid: string;
  
  // Actions & Centralized Subscription Management
  setSelectedSymbol: (symbol: string) => void;
  setSelectedCategory: (cat: InstrumentCategory | 'ALL') => void;
  setSelectedTimeframe: (tf: string) => void;
  setSearchQuery: (query: string) => void;
  toggleWatchlist: (symbol: string) => void;
  fetchCandles: (symbol: string, timeframe: string) => Promise<NormalizedCandle[]>;
  fetchContractsFor: (symbol: string) => Promise<DerivContractCategory[]>;
  subscribeSymbol: (symbol: string, callback?: (tick: NormalizedTick) => void) => () => void;
  unsubscribeSymbol: (symbol: string, callback?: (tick: NormalizedTick) => void) => void;
  reconnect: () => void;
  refreshSymbols: () => Promise<void>;
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

// Thresholds for stale detection in milliseconds
const FRESHNESS_LIVE_THRESHOLD_MS = 4000;
const FRESHNESS_RECENT_THRESHOLD_MS = 10000;

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
  const [isLoadingSymbols, setIsLoadingSymbols] = useState<boolean>(true);
  const [balance, setBalance] = useState<number | null>(null);
  const [currency, setCurrency] = useState<string>('USD');
  const [loginid, setLoginid] = useState<string>('');

  // Per-feed latency and freshness state
  const [feedStatus, setFeedStatus] = useState<Record<string, DataFreshness>>({});
  const [isStaleMap, setIsStaleMap] = useState<Record<string, boolean>>({});
  const [feedLatencyMs, setFeedLatencyMs] = useState<Record<string, number>>({});
  const [lastTickReceivedAt, setLastTickReceivedAt] = useState<Record<string, number>>({});

  // Synchronous references for high-frequency access without React re-render lags
  const ticksRef = useRef<Map<string, NormalizedTick>>(new Map());
  const lastTickReceivedRef = useRef<Map<string, number>>(new Map());
  const feedLatencyRef = useRef<Map<string, number>>(new Map());

  // Centralized WebSocket subscription registry (prevents duplicate Deriv subscriptions)
  // Map of symbol -> Set of consumer listener callbacks
  const subscribersRef = useRef<Map<string, Set<(tick: NormalizedTick) => void>>>(new Map());

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
      console.warn('[MarketDataContext] Failed to save watchlist:', e);
    }
  }, [watchlist]);

  // Centralized tick ingress handler: receives normalized ticks from Deriv WebSocket
  const handleCentralIncomingTick = useCallback((tick: NormalizedTick) => {
    if (!tick || !tick.symbol) return;
    const now = Date.now();
    const symbol = tick.symbol;

    // Record reception timestamp
    lastTickReceivedRef.current.set(symbol, now);
    ticksRef.current.set(symbol, tick);

    // Compute tick latency (epoch vs reception)
    const tickEpochMs = tick.epoch ? tick.epoch * 1000 : now;
    const latency = Math.max(0, now - tickEpochMs);
    feedLatencyRef.current.set(symbol, latency);

    // Update React states in batch
    setTicks((prev) => ({
      ...prev,
      [symbol]: tick,
    }));

    setLastTickReceivedAt((prev) => ({
      ...prev,
      [symbol]: now,
    }));

    setFeedLatencyMs((prev) => ({
      ...prev,
      [symbol]: latency,
    }));

    setFeedStatus((prev) => ({
      ...prev,
      [symbol]: latency < FRESHNESS_LIVE_THRESHOLD_MS ? 'LIVE' : latency < FRESHNESS_RECENT_THRESHOLD_MS ? 'RECENT' : 'STALE',
    }));

    setIsStaleMap((prev) => ({
      ...prev,
      [symbol]: latency >= FRESHNESS_RECENT_THRESHOLD_MS,
    }));

    // Dispatch to registered subscriber callbacks (widgets, charts, orderbooks)
    const subs = subscribersRef.current.get(symbol);
    if (subs && subs.size > 0) {
      subs.forEach((cb) => {
        try {
          cb(tick);
        } catch (e) {
          console.error(`[MarketDataContext] Subscriber callback error for ${symbol}:`, e);
        }
      });
    }
  }, []);

  // Centralized Subscribe API (Reference-counted deduplication)
  const subscribeSymbol = useCallback((symbol: string, callback?: (tick: NormalizedTick) => void): (() => void) => {
    if (!symbol) return () => {};

    let subs = subscribersRef.current.get(symbol);
    const isFirstSubscriber = !subs || subs.size === 0;

    if (!subs) {
      subs = new Set();
      subscribersRef.current.set(symbol, subs);
    }

    if (callback) {
      subs.add(callback);
      // If we already have a cached tick, immediately dispatch to subscriber to avoid blank initial state
      const cached = ticksRef.current.get(symbol);
      if (cached) {
        try {
          callback(cached);
        } catch (e) {
          console.error(`[MarketDataContext] Immediate tick dispatch error for ${symbol}:`, e);
        }
      }
    }

    // Only subscribe to Deriv WS once per symbol across the entire application
    if (isFirstSubscriber) {
      derivWs.subscribeTick(symbol, handleCentralIncomingTick);
    }

    // Return idempotently managed cleanup function
    return () => {
      const currentSubs = subscribersRef.current.get(symbol);
      if (currentSubs) {
        if (callback) currentSubs.delete(callback);
        if (currentSubs.size === 0) {
          derivWs.unsubscribeTick(symbol, handleCentralIncomingTick);
          subscribersRef.current.delete(symbol);
        }
      }
    };
  }, [handleCentralIncomingTick]);

  const unsubscribeSymbol = useCallback((symbol: string, callback?: (tick: NormalizedTick) => void) => {
    const subs = subscribersRef.current.get(symbol);
    if (subs) {
      if (callback) subs.delete(callback);
      if (subs.size === 0) {
        derivWs.unsubscribeTick(symbol, handleCentralIncomingTick);
        subscribersRef.current.delete(symbol);
      }
    }
  }, [handleCentralIncomingTick]);

  // Synchronous accessor for latest normalized tick
  const getLatestTick = useCallback((symbol: string): NormalizedTick | undefined => {
    return ticksRef.current.get(symbol) || ticks[symbol];
  }, [ticks]);

  // Refresh active symbols from Deriv API
  const refreshSymbols = useCallback(async () => {
    setIsLoadingSymbols(true);
    try {
      const rawSymbols = await derivWs.fetchActiveSymbols();
      if (rawSymbols && rawSymbols.length > 0) {
        const normalized = normalizeDerivActiveSymbols(rawSymbols);
        setInstruments(normalized);
      }
    } catch (err) {
      console.warn('[MarketDataContext] Failed to load active symbols from Deriv, maintaining fallbacks:', err);
    } finally {
      setIsLoadingSymbols(false);
    }
  }, []);

  // Connect to Deriv WebSocket on mount & initialize active symbols
  useEffect(() => {
    const unsubStatus = derivWs.onStatusChange((status) => {
      setConnectionState(status);
      if (status !== 'CONNECTED') {
        // Mark feeds as disconnected / stale when WS is offline
        const now = Date.now();
        const newStatus: Record<string, DataFreshness> = {};
        const newStale: Record<string, boolean> = {};
        ticksRef.current.forEach((_, sym) => {
          newStatus[sym] = 'DISCONNECTED';
          newStale[sym] = true;
        });
        setFeedStatus(newStatus);
        setIsStaleMap(newStale);
      }
    });

    const unsubBalance = derivWs.onBalanceChange((bal) => {
      if (bal) {
        if (bal.balance !== undefined) setBalance(Number(bal.balance));
        if (bal.currency) setCurrency(bal.currency);
        if (bal.loginid) setLoginid(bal.loginid);
      }
    });

    const unsubAuth = derivAuthService.onBalanceChange((b) => {
      if (b) {
        setBalance(b.balance);
        if (b.currency) setCurrency(b.currency);
        if (b.loginid) setLoginid(b.loginid);
      }
    });

    derivWs.connect().then(() => {
      refreshSymbols();
    }).catch((err) => {
      console.warn('[MarketDataContext] Connection initialization error:', err);
      setIsLoadingSymbols(false);
    });

    return () => {
      unsubStatus();
      unsubBalance();
      unsubAuth();
    };
  }, [refreshSymbols]);

  // Central subscription coordinator for core symbols (selected symbol, watchlist, major instruments)
  // Ensures core symbols are pre-subscribed with zero duplicate requests
  useEffect(() => {
    const activeSymbols = instruments.slice(0, 12).map((i) => i.symbol);
    const symbolsToMaintain = Array.from(new Set([selectedSymbol, ...watchlist, ...activeSymbols]));

    const cleanups = symbolsToMaintain.map((sym) => subscribeSymbol(sym));

    return () => {
      cleanups.forEach((unsub) => unsub());
    };
  }, [selectedSymbol, watchlist, instruments, subscribeSymbol]);

  // Stale detection heartbeat (evaluates every 1 second)
  useEffect(() => {
    const staleInterval = setInterval(() => {
      const now = Date.now();
      const newStatusMap: Record<string, DataFreshness> = {};
      const newStaleMap: Record<string, boolean> = {};
      const newLatencyMap: Record<string, number> = {};

      if (connectionState !== 'CONNECTED') {
        Object.keys(ticks).forEach((sym) => {
          newStatusMap[sym] = 'DISCONNECTED';
          newStaleMap[sym] = true;
        });
        setFeedStatus(newStatusMap);
        setIsStaleMap(newStaleMap);
        return;
      }

      Object.keys(ticks).forEach((sym) => {
        const lastTime = lastTickReceivedRef.current.get(sym) || 0;
        const diffMs = now - lastTime;
        newLatencyMap[sym] = diffMs;

        if (lastTime === 0) {
          newStatusMap[sym] = 'UNAVAILABLE';
          newStaleMap[sym] = true;
        } else if (diffMs <= FRESHNESS_LIVE_THRESHOLD_MS) {
          newStatusMap[sym] = 'LIVE';
          newStaleMap[sym] = false;
        } else if (diffMs <= FRESHNESS_RECENT_THRESHOLD_MS) {
          newStatusMap[sym] = 'RECENT';
          newStaleMap[sym] = false;
        } else {
          newStatusMap[sym] = 'STALE';
          newStaleMap[sym] = true;
        }
      });

      setFeedStatus(newStatusMap);
      setIsStaleMap(newStaleMap);
      setFeedLatencyMs((prev) => ({ ...prev, ...newLatencyMap }));
    }, 1000);

    return () => clearInterval(staleInterval);
  }, [connectionState, ticks]);

  // Selected Instrument lookup with live merged quote
  const selectedInstrument = useMemo(() => {
    const found = instruments.find((i) => i.symbol === selectedSymbol);
    if (!found) return instruments[0] || null;

    // Attach latest verified live tick quote/bid/ask
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

  // Calculate Data Freshness for currently selected symbol
  const dataFreshness = useMemo<DataFreshness>(() => {
    if (connectionState !== 'CONNECTED') return 'DISCONNECTED';
    
    const tick = ticks[selectedSymbol];
    if (!tick) return 'UNAVAILABLE';

    const lastTime = lastTickReceivedRef.current.get(selectedSymbol) || (tick.lastUpdated ? tick.lastUpdated.getTime() : 0);
    const diffMs = Date.now() - lastTime;

    if (diffMs <= FRESHNESS_LIVE_THRESHOLD_MS) return 'LIVE';
    if (diffMs <= FRESHNESS_RECENT_THRESHOLD_MS) return 'RECENT';
    return 'STALE';
  }, [connectionState, ticks, selectedSymbol]);

  const isSymbolStale = useCallback((symbol: string): boolean => {
    if (connectionState !== 'CONNECTED') return true;
    if (isStaleMap[symbol] !== undefined) return isStaleMap[symbol];
    const lastTime = lastTickReceivedRef.current.get(symbol) || 0;
    return lastTime === 0 || Date.now() - lastTime > FRESHNESS_RECENT_THRESHOLD_MS;
  }, [connectionState, isStaleMap]);

  const getSymbolFreshness = useCallback((symbol: string): DataFreshness => {
    if (connectionState !== 'CONNECTED') return 'DISCONNECTED';
    if (feedStatus[symbol]) return feedStatus[symbol];
    const lastTime = lastTickReceivedRef.current.get(symbol) || 0;
    if (lastTime === 0) return 'UNAVAILABLE';
    const diffMs = Date.now() - lastTime;
    if (diffMs <= FRESHNESS_LIVE_THRESHOLD_MS) return 'LIVE';
    if (diffMs <= FRESHNESS_RECENT_THRESHOLD_MS) return 'RECENT';
    return 'STALE';
  }, [connectionState, feedStatus]);

  const getSymbolLatency = useCallback((symbol: string): number => {
    return feedLatencyRef.current.get(symbol) || feedLatencyMs[symbol] || 0;
  }, [feedLatencyMs]);

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
      console.warn(`[MarketDataContext] Failed to fetch candles for ${symbol}:`, err);
    }

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
    
    dataFreshness,
    isStale: isStaleMap,
    feedStatus,
    feedLatencyMs,
    lastTickReceivedAt,
    isSymbolStale,
    getSymbolFreshness,
    getSymbolLatency,
    getLatestTick,

    contracts,
    isLoadingSymbols,
    balance,
    currency,
    loginid,
    setSelectedSymbol,
    setSelectedCategory,
    setSelectedTimeframe,
    setSearchQuery,
    toggleWatchlist,
    fetchCandles,
    fetchContractsFor,
    subscribeSymbol,
    unsubscribeSymbol,
    reconnect,
    refreshSymbols,
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
    
    dataFreshness,
    isStaleMap,
    feedStatus,
    feedLatencyMs,
    lastTickReceivedAt,
    isSymbolStale,
    getSymbolFreshness,
    getSymbolLatency,
    getLatestTick,

    contracts,
    isLoadingSymbols,
    balance,
    currency,
    loginid,
    setSelectedSymbol,
    setSelectedCategory,
    setSelectedTimeframe,
    setSearchQuery,
    toggleWatchlist,
    fetchCandles,
    fetchContractsFor,
    subscribeSymbol,
    unsubscribeSymbol,
    reconnect,
    refreshSymbols,
  ]);

  return (
    <MarketDataContext.Provider value={value}>
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

