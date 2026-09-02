/**
 * AppexQuant Markets Global - Deriv WebSocket Manager (Frontend Gateway Consumer)
 * 
 * Consumes real-time multiplexed market data and account streams from the Authoritative Backend Gateway.
 * - Connects to the backend gateway stream (/api/deriv/stream) instead of opening multiple direct Deriv sockets.
 * - Subscribes and unsubscribes symbols cleanly.
 * - Auto-reconnects with exponential backoff and randomized jitter.
 * - Safely resubscribes all active symbol subscriptions on reconnection.
 * - Never fabricates prices, balances, or profiles.
 */

import {
  DerivRequest,
  DerivResponse,
  DerivActiveSymbol,
  DerivContractCategory,
  NormalizedTick,
  NormalizedCandle,
} from './derivTypes.ts';
import { subscriptionQueue, TickCallback } from './subscriptionQueue.ts';
import {
  normalizeDerivActiveSymbols,
  extractAvailableSymbols,
  BLACKLISTED_SYMBOLS,
  isSymbolBlacklisted,
} from './marketNormalization.ts';

export type DerivConnectionState = 'CONNECTED' | 'CONNECTING' | 'RECONNECTING' | 'OFFLINE' | 'ERROR' | 'DISCONNECTED';

export type { TickCallback };
export type StatusCallback = (state: DerivConnectionState) => void;

export class DerivWebSocketManager {
  private ws: WebSocket | null = null;
  private reqIdCounter = 1;
  private pendingRequests = new Map<
    number,
    { resolve: (res: any) => void; reject: (err: Error) => void; timer: NodeJS.Timeout }
  >();
  private tickHistory = new Map<string, NormalizedTick>();
  private availableSymbols = new Set<string>();

  private connectionState: DerivConnectionState = 'DISCONNECTED';
  private statusListeners = new Set<StatusCallback>();
  private balanceCallbacks = new Set<(balanceObj: any) => void>();
  private portfolioCallbacks = new Set<(portfolioData: any) => void>();
  private positionCallbacks = new Set<(positionData: any) => void>();
  private transactionCallbacks = new Set<(transactionData: any) => void>();

  private pingInterval: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private connectPromise: Promise<void> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 25;
  private baseReconnectDelayMs = 1000;
  private maxReconnectDelayMs = 30000;
  private isExplicitDisconnect = false;

  constructor() {
    this.setupWindowListeners();
  }

  private setupWindowListeners(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        if (this.connectionState !== 'CONNECTED' && !this.isExplicitDisconnect) {
          console.log('[DerivWS-Client] Network online detected. Triggering immediate reconnection to backend gateway...');
          if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
          }
          this.reconnectAttempts = 0;
          this.connect().catch(() => {});
        }
      });

      window.addEventListener('offline', () => {
        console.warn('[DerivWS-Client] Browser is offline.');
        this.setConnectionState('OFFLINE');
      });
    }
  }

  public getIsSimulated(): boolean {
    return false;
  }

  public onBalance(cb: (balanceObj: any) => void): () => void {
    this.balanceCallbacks.add(cb);
    return () => this.balanceCallbacks.delete(cb);
  }

  public onBalanceChange(cb: (balanceObj: any) => void): () => void {
    return this.onBalance(cb);
  }

  public onPortfolio(cb: (portfolioData: any) => void): () => void {
    this.portfolioCallbacks.add(cb);
    return () => this.portfolioCallbacks.delete(cb);
  }

  public onPositions(cb: (positionData: any) => void): () => void {
    this.positionCallbacks.add(cb);
    return () => this.positionCallbacks.delete(cb);
  }

  public onTransactions(cb: (transactionData: any) => void): () => void {
    this.transactionCallbacks.add(cb);
    return () => this.transactionCallbacks.delete(cb);
  }

  public resetUserSubscriptions(): void {
    this.balanceCallbacks.clear();
    this.portfolioCallbacks.clear();
    this.positionCallbacks.clear();
    this.transactionCallbacks.clear();
  }

  public setAvailableSymbols(symbols: Set<string> | string[]): void {
    this.availableSymbols.clear();
    if (symbols instanceof Set) {
      symbols.forEach((s) => {
        if (s && !BLACKLISTED_SYMBOLS.has(s.trim())) {
          this.availableSymbols.add(s.trim());
        }
      });
    } else if (Array.isArray(symbols)) {
      symbols.forEach((s) => {
        if (s && !BLACKLISTED_SYMBOLS.has(s.trim())) {
          this.availableSymbols.add(s.trim());
        }
      });
    }
    subscriptionQueue.setAvailableSymbols(this.availableSymbols);
  }

  public getAvailableSymbols(): Set<string> {
    return new Set(this.availableSymbols);
  }

  public hasAvailableSymbol(symbol: string): boolean {
    if (!symbol || isSymbolBlacklisted(symbol)) return false;
    if (this.availableSymbols.size === 0) return !isSymbolBlacklisted(symbol);
    return this.availableSymbols.has(symbol.trim());
  }

  public onStatusChange(callback: StatusCallback): () => void {
    this.statusListeners.add(callback);
    callback(this.connectionState);
    return () => this.statusListeners.delete(callback);
  }

  private setConnectionState(state: DerivConnectionState) {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.statusListeners.forEach((cb) => cb(state));
    }
  }

  public getConnectionState(): DerivConnectionState {
    return this.connectionState;
  }

  private getGatewayStreamUrl(): string {
    if (typeof window === 'undefined') {
      return 'ws://localhost:3000/api/deriv/stream';
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host || 'localhost:3000';
    return `${protocol}//${host}/api/deriv/stream`;
  }

  public connect(): Promise<void> {
    this.isExplicitDisconnect = false;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    const nextState: DerivConnectionState = this.reconnectAttempts > 0 ? 'RECONNECTING' : 'CONNECTING';
    this.setConnectionState(nextState);

    this.connectPromise = new Promise((resolve, reject) => {
      try {
        const streamUrl = this.getGatewayStreamUrl();
        console.log(`[DerivWS-Client] Connecting to backend gateway stream: ${streamUrl}`);

        this.ws = new WebSocket(streamUrl);

        const openTimeout = setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            console.warn('[DerivWS-Client] Backend gateway connection timeout.');
            this.ws?.close();
            this.connectPromise = null;
            this.setConnectionState('ERROR');
            reject(new Error('Gateway connection timeout'));
          }
        }, 10000);

        this.ws.onopen = () => {
          clearTimeout(openTimeout);
          this.reconnectAttempts = 0;
          this.connectPromise = null;
          this.setConnectionState('CONNECTED');
          console.log('[DerivWS-Client] Connected to backend gateway stream');
          this.startPing();
          this.resubscribeAll();
          resolve();
        };

        this.ws.onmessage = (event) => this.handleMessage(event);

        this.ws.onerror = () => {
          console.warn('[DerivWS-Client] Gateway WebSocket error. Scheduling reconnect...');
          clearTimeout(openTimeout);
          this.ws?.close();
          this.connectPromise = null;
          this.setConnectionState('ERROR');
          reject(new Error('Gateway connection error'));
        };

        this.ws.onclose = () => {
          clearTimeout(openTimeout);
          this.connectPromise = null;
          this.stopPing();
          if (!this.isExplicitDisconnect) {
            if (typeof navigator !== 'undefined' && !navigator.onLine) {
              this.setConnectionState('OFFLINE');
            } else {
              this.setConnectionState('DISCONNECTED');
            }
            this.scheduleReconnect();
          }
        };
      } catch (err) {
        console.error('[DerivWS-Client] Connect exception:', err);
        this.connectPromise = null;
        this.setConnectionState('ERROR');
        reject(err);
      }
    });

    return this.connectPromise;
  }

  public disconnect(): void {
    this.isExplicitDisconnect = true;
    this.stopPing();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.pendingRequests.forEach((req) => {
      clearTimeout(req.timer);
      req.reject(new Error('WebSocket explicitly disconnected'));
    });
    this.pendingRequests.clear();

    if (this.ws) {
      try {
        this.ws.close(1000, 'Normal Closure');
      } catch {}
      this.ws = null;
    }

    this.setConnectionState('DISCONNECTED');
  }

  private startPing(): void {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendRequest({ ping: 1 }, 10000).catch(() => {
          console.warn('[DerivWS-Client] Heartbeat ping failed or timed out (10s). Closing connection...');
          if (this.ws) {
            try {
              this.ws.close();
            } catch {}
          }
        });
      }
    }, 30000);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.isExplicitDisconnect || this.reconnectTimer) return;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[DerivWS-Client] Max reconnect attempts reached');
      this.setConnectionState('DISCONNECTED');
      return;
    }

    this.reconnectAttempts++;
    const jitter = Math.floor(Math.random() * 500);
    const exponentialDelay = Math.min(
      this.baseReconnectDelayMs * Math.pow(2, Math.max(0, this.reconnectAttempts - 1)),
      this.maxReconnectDelayMs
    );
    const delay = exponentialDelay + jitter;

    console.log(`[DerivWS-Client] Reconnecting to gateway in ${delay}ms (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    this.setConnectionState('RECONNECTING');

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(() => {});
    }, delay);
  }

  public sendRequest(request: DerivRequest, timeoutMs = 15000): Promise<DerivResponse> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        return reject(new Error('Gateway WebSocket is not connected'));
      }

      const reqId = this.reqIdCounter++;
      const payload: any = { ...request, req_id: reqId };

      const timer = setTimeout(() => {
        this.pendingRequests.delete(reqId);
        reject(new Error(`Gateway Request Timeout: ${JSON.stringify(request)}`));
      }, timeoutMs);

      this.pendingRequests.set(reqId, { resolve, reject, timer });

      try {
        this.ws.send(JSON.stringify(payload));
      } catch (err) {
        clearTimeout(timer);
        this.pendingRequests.delete(reqId);
        reject(err);
      }
    });
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data) as any;

      // 1. Handle Gateway Status Updates
      if (data.type === 'status' && data.data) {
        const state = data.data.state as DerivConnectionState;
        if (state && this.connectionState !== state && this.connectionState === 'CONNECTED') {
          // If gateway upstream changed state, reflect it
          if (state === 'RECONNECTING' || state === 'CONNECTING') {
            this.setConnectionState(state);
          }
        }
      }

      // 2. Handle Genuine Balance Stream
      if (data.type === 'balance' && data.data) {
        const balancePayload = data.data;
        this.balanceCallbacks.forEach((cb) => {
          try {
            cb(balancePayload);
          } catch (e) {
            console.error('[DerivWS-Client] Error in balance callback:', e);
          }
        });
      }

      // 3. Handle Genuine Profile Stream
      if (data.type === 'profile' && data.data) {
        const profilePayload = data.data;
        if (profilePayload.balance !== undefined) {
          this.balanceCallbacks.forEach((cb) => {
            try {
              cb(profilePayload);
            } catch (e) {
              console.error('[DerivWS-Client] Error in profile balance callback:', e);
            }
          });
        }
      }

      // 4. Handle Multiplexed Tick Stream
      if (data.type === 'tick' && data.data) {
        this.processIncomingNormalizedTick(data.data);
      }

      // 5. Handle Correlated Responses
      if (data.req_id && this.pendingRequests.has(data.req_id)) {
        const req = this.pendingRequests.get(data.req_id)!;
        clearTimeout(req.timer);
        this.pendingRequests.delete(data.req_id);

        if (data.error) {
          req.reject(new Error(data.error.message || data.error));
        } else {
          req.resolve(data.data !== undefined ? data.data : data);
        }
      }
    } catch (err) {
      console.error('[DerivWS-Client] Failed to parse gateway message:', err);
    }
  }

  private processIncomingNormalizedTick(normalizedTick: NormalizedTick): void {
    if (!normalizedTick || !normalizedTick.symbol || typeof normalizedTick.quote !== 'number') return;

    const symbol = normalizedTick.symbol.trim();
    // Ensure Date object for lastUpdated
    const tickWithDate: NormalizedTick = {
      ...normalizedTick,
      lastUpdated: normalizedTick.lastUpdated ? new Date(normalizedTick.lastUpdated) : new Date(),
    };

    this.tickHistory.set(symbol, tickWithDate);

    const callbacks = subscriptionQueue.getCallbacks(symbol);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(tickWithDate);
        } catch (e) {
          console.error('[DerivWS-Client] Error in tick callback:', e);
        }
      });
    }
  }

  public async fetchActiveSymbols(style: 'full' | 'brief' = 'full'): Promise<DerivActiveSymbol[]> {
    try {
      // 1. Try backend gateway REST endpoint first
      const res = await fetch('/api/market/active-symbols');
      if (res.ok) {
        const json = await res.json();
        const rawSymbols = json.data || json.active_symbols || json;
        if (Array.isArray(rawSymbols) && rawSymbols.length > 0) {
          const normalized = normalizeDerivActiveSymbols(rawSymbols);
          const available = extractAvailableSymbols(normalized);
          this.setAvailableSymbols(available);
          return rawSymbols;
        }
      }
    } catch (err) {
      console.warn('[DerivWS-Client] REST active symbols lookup warning:', err);
    }

    // 2. Fallback to Gateway WebSocket request if connected
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        const response: any = await this.sendRequest({ active_symbols: style, action: 'active_symbols' } as any);
        const symbols = response.active_symbols || (Array.isArray(response) ? response : []);
        if (Array.isArray(symbols) && symbols.length > 0) {
          const normalized = normalizeDerivActiveSymbols(symbols);
          const available = extractAvailableSymbols(normalized);
          this.setAvailableSymbols(available);
          return symbols;
        }
      } catch (e) {
        console.warn('[DerivWS-Client] WebSocket active symbols query error:', e);
      }
    }

    return [];
  }

  public async fetchCandles(symbol: string, granularitySeconds: number, count = 300): Promise<NormalizedCandle[]> {
    const cleanSymbol = symbol ? symbol.trim() : '';
    if (isSymbolBlacklisted(cleanSymbol)) return [];

    try {
      // 1. Try backend gateway REST endpoint
      const params = new URLSearchParams({
        symbol: cleanSymbol,
        granularity: String(granularitySeconds),
        count: String(count),
      });
      const res = await fetch(`/api/market/candles?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        const candles = json.data || json.candles || [];
        if (Array.isArray(candles) && candles.length > 0) {
          return candles;
        }
      }
    } catch (err) {
      console.warn(`[DerivWS-Client] REST fetchCandles warning for ${cleanSymbol}:`, err);
    }

    // 2. Fallback to Gateway WebSocket
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        const response: any = await this.sendRequest({
          action: 'fetch_candles',
          ticks_history: cleanSymbol,
          symbol: cleanSymbol,
          granularity: granularitySeconds,
          count,
        } as any);

        if (Array.isArray(response)) return response;
        if (response.data && Array.isArray(response.data)) return response.data;
      } catch (e) {
        console.warn(`[DerivWS-Client] Gateway WebSocket candles lookup error for ${cleanSymbol}:`, e);
      }
    }

    return [];
  }

  public async fetchContractsFor(symbol: string): Promise<DerivContractCategory[]> {
    const cleanSymbol = symbol ? symbol.trim() : '';
    if (isSymbolBlacklisted(cleanSymbol)) return [];

    try {
      const res = await fetch(`/api/market/contracts-for?symbol=${encodeURIComponent(cleanSymbol)}`);
      if (res.ok) {
        const json = await res.json();
        const categories = json.data || json.contracts_for?.available || [];
        if (Array.isArray(categories) && categories.length > 0) {
          return categories;
        }
      }
    } catch (err) {
      console.warn(`[DerivWS-Client] REST fetchContractsFor warning for ${cleanSymbol}:`, err);
    }

    return [];
  }

  public subscribeTick(symbol: string, callback: TickCallback): void {
    if (!symbol) return;
    const cleanSymbol = symbol.trim();

    if (isSymbolBlacklisted(cleanSymbol)) {
      console.warn(`[DerivWS-Client] Rejected blacklisted symbol subscription: ${cleanSymbol}`);
      return;
    }

    const isFirst = subscriptionQueue.enqueue(cleanSymbol, callback);

    if (this.connectionState === 'CONNECTED' && this.ws?.readyState === WebSocket.OPEN) {
      if (isFirst) {
        try {
          this.ws.send(JSON.stringify({ action: 'subscribe_tick', symbol: cleanSymbol }));
        } catch (err) {
          console.warn(`[DerivWS-Client] Failed to send subscribe_tick for ${cleanSymbol}:`, err);
        }
      }
    } else if (this.connectionState === 'DISCONNECTED' || this.connectionState === 'ERROR') {
      this.connect().catch(() => {});
    }

    const cached = this.tickHistory.get(cleanSymbol);
    if (cached) {
      callback(cached);
    }
  }

  public unsubscribeTick(symbol: string, callback: TickCallback): void {
    if (!symbol) return;
    const cleanSymbol = symbol.trim();
    const isLast = subscriptionQueue.dequeue(cleanSymbol, callback);
    if (isLast && this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ action: 'unsubscribe_tick', symbol: cleanSymbol }));
      } catch (err) {
        console.warn(`[DerivWS-Client] Failed to send unsubscribe_tick for ${cleanSymbol}:`, err);
      }
    }
  }

  private resubscribeAll(): void {
    console.log('[DerivWS-Client] Gateway connection recovered. Restoring active market subscriptions...');
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Re-send subscription messages for all symbols currently having active callbacks
      subscriptionQueue.flush((req) => {
        if (req.ticks) {
          this.ws?.send(JSON.stringify({ action: 'subscribe_tick', symbol: req.ticks }));
        }
        return Promise.resolve({ req_id: 0, msg_type: 'tick' });
      });
    }
  }

  public getLastTick(symbol: string): NormalizedTick | undefined {
    return this.tickHistory.get(symbol);
  }
}

// Global Singleton Instance
export const derivWs = new DerivWebSocketManager();
export default derivWs;
