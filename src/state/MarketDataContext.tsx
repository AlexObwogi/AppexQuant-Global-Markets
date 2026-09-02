/**
 * AppexQuant Markets Global - Centralized Authoritative Market Data Context & WebSocket Manager
 * Single source of truth for live ticks, active symbols, historical candles, watchlist,
 * centralized WebSocket subscription deduplication, and per-feed freshness/stale tracking.
 * 
 * Strict Startup Sequence:
 * 1. active_symbols("full")
 * 2. normalize returned symbols
 * 3. subscribe ONLY if returned by Deriv (availableSymbols.has(symbol))
 * Fallback instruments exist solely for initial UI display and are NEVER auto-subscribed.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo, useRef } from 'react';
import { MarketInstrument, InstrumentCategory } from '../types/market.ts';
import { derivWs, DerivConnectionState } from '../services/deriv/DerivWebSocketManager.ts';
import { derivAuthService } from '../services/deriv/authService.ts';
import {
  normalizeDerivActiveSymbols,
  extractAvailableSymbols,
  isSymbolBlacklisted,
} from '../services/deriv/marketNormalization.ts';
import { FALLBACK_INSTRUMENTS } from '../services/deriv/marketTaxonomy.ts';
import { NormalizedTick, NormalizedCandle, DerivContractCategory } from '../services/deriv/derivTypes.ts';

export type DataFreshness = 'LIVE' | 'RECENT' | 'STALE' | 'DISCONNECTED' | 'UNAVAILABLE';

export interface MarketDataContextType {
  instruments: MarketInstrument[];
  availableInstruments: MarketInstrument[];
  availableSymbols: Set<string>;
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
  const [availableSymbols, setAvailableSymbols] = useState<Set<string>>(new Set<string>());
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
  const availableSymbolsRef = useRef<Set<string>>(new Set<string>());

  // Centralized WebSocket subscription registry (prevents duplicate Deriv subscriptions)
  // Map of symbol -> Set of consumer listener callbacks
  const subscribersRef = useRef<Map<string, Set<(tick: NormalizedTick) => void>>>(new Map());

  // Watchlist stored in localStorage
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(WATCHLIST_STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : ['frxEURUSD', 'R_100', 'cryBTCUSD', 'frxXAUUSD'];
      return Array.isArray(parsed)
        ? parsed.filter((s) => typeof s === 'string' && !isSymbolBlacklisted(s))
        : ['frxEURUSD', 'R_100', 'cryBTCUSD', 'frxXAUUSD'];
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

  // Centralized Subscribe API (Reference-counted deduplication with strict availability check)
  const subscribeSymbol = useCallback((symbol: string, callback?: (tick: NormalizedTick) => void): (() => void) => {
    if (!symbol) return () => {};
    const cleanSymbol = symbol.trim();

    // 1. Never subscribe using hardcoded fallback or blacklisted symbols
    if (isSymbolBlacklisted(cleanSymbol)) {
      console.warn(`[MarketDataContext] Refused subscription for blacklisted symbol: ${cleanSymbol}`);
      return () => {};
    }

    // 2. Strict validation against availableSymbols returned by Deriv active_symbols(full)
    if (availableSymbolsRef.current.size > 0 && !availableSymbolsRef.current.has(cleanSymbol)) {
      console.warn(`[MarketDataContext] Subscription rejected: Symbol '${cleanSymbol}' is not present in available active symbols.`);
      return () => {};
    }

    let subs = subscribersRef.current.get(cleanSymbol);
    const isFirstSubscriber = !subs || subs.size === 0;

    if (!subs) {
      subs = new Set();
      subscribersRef.current.set(cleanSymbol, subs);
    }

    if (callback) {
      subs.add(callback);
      // If we already have a cached tick, immediately dispatch to subscriber to avoid blank initial state
      const cached = ticksRef.current.get(cleanSymbol);
      if (cached) {
        try {
          callback(cached);
        } catch (e) {
          console.error(`[MarketDataContext] Immediate tick dispatch error for ${cleanSymbol}:`, e);
        }
      }
    }

    // Only subscribe to Deriv WS once per symbol across the entire application
    if (isFirstSubscriber) {
      derivWs.subscribeTick(cleanSymbol, handleCentralIncomingTick);
    }

    // Return idempotently managed cleanup function
    return () => {
      const currentSubs = subscribersRef.current.get(cleanSymbol);
      if (currentSubs) {
        if (callback) currentSubs.delete(callback);
        if (currentSubs.size === 0) {
          derivWs.unsubscribeTick(cleanSymbol, handleCentralIncomingTick);
          subscribersRef.current.delete(cleanSymbol);
        }
      }
    };
  }, [handleCentralIncomingTick]);

  const unsubscribeSymbol = useCallback((symbol: string, callback?: (tick: NormalizedTick) => void) => {
    if (!symbol) return;
    const cleanSymbol = symbol.trim();
    const subs = subscribersRef.current.get(cleanSymbol);
    if (subs) {
      if (callback) subs.delete(callback);
      if (subs.size === 0) {
        derivWs.unsubscribeTick(cleanSymbol, handleCentralIncomingTick);
        subscribersRef.current.delete(cleanSymbol);
      }
    }
  }, [handleCentralIncomingTick]);

  // Synchronous accessor for latest normalized tick
  const getLatestTick = useCallback((symbol: string): NormalizedTick | undefined => {
    return ticksRef.current.get(symbol) || ticks[symbol];
  }, [ticks]);

  // Refresh active symbols from Deriv API (Startup sequence step 1 & 2)
  const refreshSymbols = useCallback(async () => {
    setIsLoadingSymbols(true);
    try {
      // 1. Call active_symbols('full')
      const rawSymbols = await derivWs.fetchActiveSymbols('full');
      if (rawSymbols && rawSymbols.length > 0) {
        // 2. Normalize returned symbols
        const normalized = normalizeDerivActiveSymbols(rawSymbols);
        const available = extractAvailableSymbols(normalized);

        availableSymbolsRef.current = available;
        setAvailableSymbols(available);
        setInstruments(normalized);

        // Update WebSocket manager with authoritative set
        derivWs.setAvailableSymbols(available);
        console.log(`[MarketDataContext] Successfully initialized ${normalized.length} normalized symbols from Deriv.`);
      }
    } catch (err) {
      console.warn('[MarketDataContext] Failed to load active symbols from Deriv:', err);
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

  // Central subscription coordinator for verified symbols
  // Rule: If a fallback instrument exists for UI rendering, it must NEVER automatically subscribe.
  // Rule: Startup sequence only subscribes after active_symbols returns and availableSymbols.has(symbol) is verified.
  useEffect(() => {
    // Do not automatically subscribe before active_symbols has loaded authoritative availableSymbols
    if (availableSymbols.size === 0 || connectionState !== 'CONNECTED') {
      return;
    }

    const validWatchlist = watchlist.filter((sym) => availableSymbols.has(sym));
    const activeSymbols = instruments
      .map((i) => i.symbol)
      .filter((sym) => availableSymbols.has(sym))
      .slice(0, 10);

    const targetSymbols = new Set<string>();
    if (availableSymbols.has(selectedSymbol)) {
      targetSymbols.add(selectedSymbol);
    }
    validWatchlist.forEach((sym) => targetSymbols.add(sym));
    activeSymbols.forEach((sym) => targetSymbols.add(sym));

    const symbolsToMaintain = Array.from(targetSymbols);
    const cleanups = symbolsToMaintain.map((sym) => subscribeSymbol(sym));

    return () => {
      cleanups.forEach((unsub) => unsub());
    };
  }, [selectedSymbol, watchlist, instruments, availableSymbols, connectionState, subscribeSymbol]);

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

  // Compute live instruments dynamically merging real Deriv ticks
  const liveInstruments = useMemo<MarketInstrument[]>(() => {
    return instruments.map((inst) => {
      const tick = ticks[inst.symbol];
      if (tick && (tick.quote > 0 || tick.bid > 0)) {
        const bid = tick.bid || tick.quote;
        const ask = tick.ask || tick.quote;
        return {
          ...inst,
          bid,
          ask,
          spread: Number((ask - bid).toFixed(5)),
          change24hPercentage: tick.changePct || 0,
        };
      }
      return inst;
    });
  }, [instruments, ticks]);

  // Selected Instrument lookup with live merged quote
  const selectedInstrument = useMemo(() => {
    const found = liveInstruments.find((i) => i.symbol === selectedSymbol);
    if (!found) return liveInstruments[0] || null;
    return found;
  }, [liveInstruments, selectedSymbol]);

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
    if (isSymbolBlacklisted(symbol)) return;
    setSelectedSymbolState(symbol);
  }, []);

  const toggleWatchlist = useCallback((symbol: string) => {
    if (isSymbolBlacklisted(symbol)) return;
    setWatchlist((prev) =>
      prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol]
    );
  }, []);

  const fetchCandles = useCallback(async (symbol: string, timeframe: string): Promise<NormalizedCandle[]> => {
    if (isSymbolBlacklisted(symbol)) return [];
    if (availableSymbolsRef.current.size > 0 && !availableSymbolsRef.current.has(symbol)) {
      console.warn(`[MarketDataContext] Rejected candle fetch for unlisted symbol: ${symbol}`);
      return [];
    }

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
    if (isSymbolBlacklisted(symbol)) return [];
    if (availableSymbolsRef.current.size > 0 && !availableSymbolsRef.current.has(symbol)) {
      return [];
    }
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
    instruments: liveInstruments,
    availableInstruments: liveInstruments,
    availableSymbols,
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
    liveInstruments,
    availableSymbols,
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
