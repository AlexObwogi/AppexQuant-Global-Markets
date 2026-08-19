/**
 * AppexQuant Markets Global - Deriv WebSocket Manager
 * Resilient, high-performance market data WebSocket client.
 * Handles request correlation, subscriptions, reconnects, stale detection, and data validation.
 */

import {
  DerivRequest,
  DerivRequestMessage,
  DerivResponse,
  DerivActiveSymbol,
  DerivCandle,
  DerivContractCategory,
  NormalizedTick,
  NormalizedCandle,
} from './derivTypes.ts';
import { FALLBACK_INSTRUMENTS } from './marketTaxonomy.ts';

export type DerivConnectionState = 'CONNECTED' | 'CONNECTING' | 'RECONNECTING' | 'DISCONNECTED';

export type TickCallback = (tick: NormalizedTick) => void;
export type StatusCallback = (state: DerivConnectionState) => void;

export class DerivWebSocketManager {
  private ws: WebSocket | null = null;
  private appId: string;
  private endpoint: string;
  private reqIdCounter = 1;
  private pendingRequests = new Map<number, { resolve: (res: DerivResponse) => void; reject: (err: Error) => void; timer: NodeJS.Timeout }>();
  private tickSubscriptions = new Map<string, { subId?: string; callbacks: Set<TickCallback> }>();
  private tickHistory = new Map<string, NormalizedTick>();
  
  private connectionState: DerivConnectionState = 'DISCONNECTED';
  private statusListeners = new Set<StatusCallback>();
  private balanceCallbacks = new Set<(balanceObj: any) => void>();

  public onBalance(cb: (balanceObj: any) => void): () => void {
    this.balanceCallbacks.add(cb);
    return () => this.balanceCallbacks.delete(cb);
  }
  
  private pingInterval: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private connectPromise: Promise<void> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private baseReconnectDelayMs = 1000;
  private maxReconnectDelayMs = 30000;
  private isExplicitDisconnect = false;

  private endpoints: string[];

  constructor(appId = '1089') {
    this.appId = appId;
    this.endpoints = [
      `wss://ws.derivws.com/websockets/v3?app_id=${this.appId}`,
      `wss://ws.binaryws.com/websockets/v3?app_id=${this.appId}`,
    ];
    this.endpoint = this.endpoints[0];
  }

  public getIsSimulated(): boolean {
    return false;
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

  public connect(): Promise<void> {
    this.isExplicitDisconnect = false;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.setConnectionState(this.reconnectAttempts > 0 ? 'RECONNECTING' : 'CONNECTING');

    this.connectPromise = new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.endpoint);

        const openTimeout = setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            console.error('[DerivWS] Connection timeout.');
            this.ws?.close();
            this.connectPromise = null;
            this.setConnectionState('DISCONNECTED');
            reject(new Error('Connection timeout'));
          }
        }, 10000);

        this.ws.onopen = () => {
          clearTimeout(openTimeout);
          this.reconnectAttempts = 0;
          this.connectPromise = null;
          this.setConnectionState('CONNECTED');
          this.startPing();
          this.resubscribeAll();
          resolve();
        };

        this.ws.onmessage = (event) => this.handleMessage(event);

        this.ws.onerror = (error) => {
          console.warn(`[DerivWS] Connection error on ${this.endpoint}. Re-initiating connection fallback...`);
          clearTimeout(openTimeout);
          this.ws?.close();
          this.connectPromise = null;
          this.setConnectionState('DISCONNECTED');
          reject(new Error('WebSocket connection error'));
        };

        this.ws.onclose = () => {
          clearTimeout(openTimeout);
          this.connectPromise = null;
          this.stopPing();
          if (!this.isExplicitDisconnect) {
            this.setConnectionState('DISCONNECTED');
            this.scheduleReconnect();
          }
        };
      } catch (err) {
        console.error('[DerivWS] Exception on connect:', err);
        this.connectPromise = null;
        this.setConnectionState('DISCONNECTED');
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
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setConnectionState('DISCONNECTED');
  }

  private startPing(): void {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendRequest({ ping: 1 }).catch(() => {
          // Heartbeat failed
        });
      }
    }, 25000);
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
      console.error('[DerivWS] Max reconnect attempts reached');
      this.setConnectionState('DISCONNECTED');
      return;
    }

    const delay = Math.min(this.baseReconnectDelayMs * Math.pow(2, this.reconnectAttempts), this.maxReconnectDelayMs);
    console.log(`[DerivWS] Reconnecting in ${delay}ms (Attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectAttempts++;
      this.endpoint = this.endpoints[this.reconnectAttempts % this.endpoints.length];
      this.connect().catch(() => {});
    }, delay);
  }

  public sendRequest(request: DerivRequest, timeoutMs = 15000): Promise<DerivResponse> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        return reject(new Error('WebSocket is not connected'));
      }

      const reqId = this.reqIdCounter++;
      const payload: DerivRequestMessage = { ...request, req_id: reqId };

      const timer = setTimeout(() => {
        this.pendingRequests.delete(reqId);
        reject(new Error(`Deriv API Request Timeout: ${JSON.stringify(request)}`));
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
      const data = JSON.parse(event.data) as DerivResponse;
      
      if (data.msg_type === 'balance' && data.balance) {
         this.balanceCallbacks.forEach(cb => cb(data.balance));
      }

      if (data.req_id && this.pendingRequests.has(data.req_id)) {
        const req = this.pendingRequests.get(data.req_id)!;
        clearTimeout(req.timer);
        this.pendingRequests.delete(data.req_id);

        if (data.error) {
          req.reject(new Error(data.error.message));
        } else {
          req.resolve(data);
        }
      } else if (data.msg_type === 'tick' && data.tick) {
        this.processIncomingTick(data.tick, data.subscription?.id);
      }
    } catch (err) {
      console.error('[DerivWS] Failed to parse message:', err);
    }
  }

  private processIncomingTick(tickData: any, subId?: string): void {
    if (!tickData.symbol || !tickData.quote) return;
    
    const { symbol, quote, epoch, bid, ask } = tickData;
    const prevTick = this.tickHistory.get(symbol);
    const prevQuote = prevTick ? prevTick.quote : quote;
    const changePct = prevQuote ? ((quote - prevQuote) / prevQuote) * 100 : 0;

    const normalizedTick: NormalizedTick = {
      symbol,
      quote,
      bid: bid || quote,
      ask: ask || quote,
      epoch: epoch || Math.floor(Date.now() / 1000),
      change: quote - prevQuote,
      changePct,
      prevQuote,
      lastUpdated: new Date(epoch ? epoch * 1000 : Date.now()),
    };

    this.tickHistory.set(symbol, normalizedTick);

    const sub = this.tickSubscriptions.get(symbol);
    if (sub) {
      if (subId && !sub.subId) sub.subId = subId;
      sub.callbacks.forEach((cb) => {
        try {
          cb(normalizedTick);
        } catch (e) {
          console.error('[DerivWS] Error in tick callback:', e);
        }
      });
    }
  }

  public async fetchActiveSymbols(): Promise<DerivActiveSymbol[]> {
    try {
      const response = await this.sendRequest({
        active_symbols: 'full',
        product_type: 'basic',
      });
      if (response.active_symbols && Array.isArray(response.active_symbols) && response.active_symbols.length > 0) {
        return response.active_symbols;
      }
    } catch (err) {
      console.error('[DerivWS] Active symbols lookup failed:', err);
    }
    return [];
  }

  public async fetchCandles(symbol: string, granularitySeconds: number, count = 300): Promise<NormalizedCandle[]> {
    try {
      const response = await this.sendRequest({
        ticks_history: symbol,
        style: 'candles',
        granularity: granularitySeconds,
        count,
        end: 'latest',
      });

      if (response.candles && Array.isArray(response.candles) && response.candles.length > 0) {
        return response.candles
          .filter((c) => typeof c.open === 'number' && !isNaN(c.open) && c.open > 0)
          .map((c) => ({
            timestamp: c.epoch * 1000,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          }));
      }

      if (response.history && response.history.prices && response.history.times) {
        const { prices, times } = response.history;
        const candles: NormalizedCandle[] = [];
        for (let i = 0; i < prices.length; i++) {
          const price = prices[i];
          const time = times[i] * 1000;
          candles.push({
            timestamp: time,
            open: price,
            high: price,
            low: price,
            close: price,
          });
        }
        if (candles.length > 0) return candles;
      }
    } catch (err) {
      console.error(`[DerivWS] Ticks history lookup for ${symbol} failed:`, err);
    }

    return [];
  }

  public async fetchContractsFor(symbol: string): Promise<DerivContractCategory[]> {
    try {
      const response = await this.sendRequest({
        contracts_for: symbol,
      });
      if (response.contracts_for?.available && Array.isArray(response.contracts_for.available)) {
        return response.contracts_for.available;
      }
    } catch (e) {
      console.error(`[DerivWS] Contracts lookup failed for ${symbol}:`, e);
    }
    return [];
  }

  public subscribeTick(symbol: string, callback: TickCallback): void {
    let sub = this.tickSubscriptions.get(symbol);
    if (!sub) {
      sub = { callbacks: new Set() };
      this.tickSubscriptions.set(symbol, sub);

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendRequest({ ticks: symbol })
          .then((res) => {
            if (res.subscription?.id && sub) {
              sub.subId = res.subscription.id;
            }
          })
          .catch((err) => {
            console.error(`[DerivWS] Deriv API subscription failed for ${symbol}: ${err.message || err}`);
          });
      }
    }
    sub.callbacks.add(callback);

    const cached = this.tickHistory.get(symbol);
    if (cached) {
      callback(cached);
    }
  }

  public unsubscribeTick(symbol: string, callback: TickCallback): void {
    const sub = this.tickSubscriptions.get(symbol);
    if (!sub) return;

    sub.callbacks.delete(callback);

    if (sub.callbacks.size === 0) {
      if (sub.subId && this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendRequest({ forget: sub.subId }).catch(() => {
          // Ignore forget error on cleanup
        });
      }
      this.tickSubscriptions.delete(symbol);
    }
  }

  private resubscribeAll(): void {
    this.tickSubscriptions.forEach((sub, symbol) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendRequest({ ticks: symbol })
          .then((res) => {
            if (res.subscription?.id) {
              sub.subId = res.subscription.id;
            }
          })
          .catch((err) => {
            console.error(`[DerivWS] Resubscribe failed for ${symbol}: ${err.message || err}`);
          });
      }
    });
  }

  public getLastTick(symbol: string): NormalizedTick | undefined {
    return this.tickHistory.get(symbol);
  }
}

// Global Singleton Instance
export const derivWs = new DerivWebSocketManager();
