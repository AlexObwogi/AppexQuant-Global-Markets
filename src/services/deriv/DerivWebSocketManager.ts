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
  private portfolioCallbacks = new Set<(portfolioData: any) => void>();
  private positionCallbacks = new Set<(positionData: any) => void>();
  private transactionCallbacks = new Set<(transactionData: any) => void>();

  // User socket scoping & subscription recovery flags
  private authToken: string | null = null;
  private isBalanceSubscribed = false;
  private isPortfolioSubscribed = false;
  private isPositionsSubscribed = false;
  private isTransactionsSubscribed = false;

  public setAuthToken(token: string | null): void {
    this.authToken = token ? token.trim() : null;
  }

  public getAuthToken(): string | null {
    return this.authToken;
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

  public async subscribeBalance(subscribe: boolean = true): Promise<void> {
    this.isBalanceSubscribed = subscribe;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      await this.sendRequest({ balance: 1, subscribe: subscribe ? 1 : 0 }).catch((err) => {
        console.warn('[DerivWS] Balance subscribe warning:', err);
      });
    }
  }

  public async subscribePortfolio(): Promise<void> {
    this.isPortfolioSubscribed = true;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      await this.sendRequest({ portfolio: 1, subscribe: 1 }).catch((err) => {
        console.warn('[DerivWS] Portfolio subscribe warning:', err);
      });
    }
  }

  public async subscribePositions(): Promise<void> {
    this.isPositionsSubscribed = true;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      await this.sendRequest({ proposal_open_contract: 1, subscribe: 1 }).catch((err) => {
        console.warn('[DerivWS] Positions subscribe warning:', err);
      });
    }
  }

  public async subscribeTransactions(): Promise<void> {
    this.isTransactionsSubscribed = true;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      await this.sendRequest({ transaction: 1, subscribe: 1 }).catch((err) => {
        console.warn('[DerivWS] Transactions subscribe warning:', err);
      });
    }
  }

  public resetUserSubscriptions(): void {
    this.authToken = null;
    this.isBalanceSubscribed = false;
    this.isPortfolioSubscribed = false;
    this.isPositionsSubscribed = false;
    this.isTransactionsSubscribed = false;

    this.balanceCallbacks.clear();
    this.portfolioCallbacks.clear();
    this.positionCallbacks.clear();
    this.transactionCallbacks.clear();

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendRequest({ forget_all: 'balance' }).catch(() => {});
      this.sendRequest({ forget_all: 'portfolio' }).catch(() => {});
      this.sendRequest({ forget_all: 'proposal_open_contract' }).catch(() => {});
      this.sendRequest({ forget_all: 'transaction' }).catch(() => {});
      this.sendRequest({ forget_all: 'authentication' }).catch(() => {});
    }
  }
  
  private pingInterval: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private connectPromise: Promise<void> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 20;
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
    this.setupWindowListeners();
  }

  private setupWindowListeners(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        if (this.connectionState !== 'CONNECTED' && !this.isExplicitDisconnect) {
          console.log('[DerivWS] Network online detected. Triggering immediate reconnection...');
          if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
          }
          this.reconnectAttempts = 0;
          this.connect().catch(() => {});
        }
      });
    }
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

    this.pendingRequests.forEach((req) => {
      clearTimeout(req.timer);
      req.reject(new Error('WebSocket explicitly disconnected'));
    });
    this.pendingRequests.clear();

    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ forget_all: 'balance' }));
          this.ws.send(JSON.stringify({ forget_all: 'portfolio' }));
          this.ws.send(JSON.stringify({ forget_all: 'proposal_open_contract' }));
          this.ws.send(JSON.stringify({ forget_all: 'transaction' }));
          this.ws.send(JSON.stringify({ forget_all: 'ticks' }));
        } catch {
          // Ignore send errors during disconnect
        }
        this.ws.close(1000, 'Normal Closure');
      } else {
        this.ws.close();
      }
      this.ws = null;
    }

    this.authToken = null;
    this.setConnectionState('DISCONNECTED');
  }

  private startPing(): void {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendRequest({ ping: 1 }, 7000)
          .then((res) => {
            if (res.ping !== 'pong' && res.msg_type !== 'ping') {
              console.warn('[DerivWS] Unexpected ping response format:', res);
            }
          })
          .catch((err) => {
            console.warn('[DerivWS] Heartbeat ping failed or timed out. Closing dead connection...', err?.message || err);
            if (this.ws) {
              try {
                this.ws.close();
              } catch {
                // Ignore error on dead socket
              }
            }
          });
      }
    }, 20000);
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

    this.reconnectAttempts++;
    const jitter = Math.floor(Math.random() * 500);
    const exponentialDelay = Math.min(
      this.baseReconnectDelayMs * Math.pow(2, Math.max(0, this.reconnectAttempts - 1)),
      this.maxReconnectDelayMs
    );
    const delay = exponentialDelay + jitter;

    console.log(`[DerivWS] Reconnecting in ${delay}ms (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    this.setConnectionState('RECONNECTING');

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.endpoint = this.endpoints[(this.reconnectAttempts - 1) % this.endpoints.length];
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
      const data = JSON.parse(event.data) as any;
      
      if (data.msg_type === 'balance' && data.balance) {
        this.balanceCallbacks.forEach((cb) => {
          try {
            cb(data.balance);
          } catch (e) {
            console.error('[DerivWS] Error in balance callback:', e);
          }
        });
      }

      if (data.msg_type === 'portfolio' || data.portfolio) {
        this.portfolioCallbacks.forEach((cb) => {
          try {
            cb(data.portfolio || data);
          } catch (e) {
            console.error('[DerivWS] Error in portfolio callback:', e);
          }
        });
      }

      if (data.msg_type === 'proposal_open_contract' || data.proposal_open_contract || data.open_positions) {
        const payload = data.proposal_open_contract || data.open_positions || data;
        this.positionCallbacks.forEach((cb) => {
          try {
            cb(payload);
          } catch (e) {
            console.error('[DerivWS] Error in position callback:', e);
          }
        });
      }

      if (data.msg_type === 'transaction' && data.transaction) {
        this.transactionCallbacks.forEach((cb) => {
          try {
            cb(data.transaction);
          } catch (e) {
            console.error('[DerivWS] Error in transaction callback:', e);
          }
        });
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

      const doSubscribe = () => {
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
      };

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        doSubscribe();
      } else {
        this.connect().then(doSubscribe).catch((err) => {
          console.warn(`[DerivWS] Failed to connect for public tick subscription ${symbol}:`, err);
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

  private async resubscribeAll(): Promise<void> {
    console.log('[DerivWS] Connection recovered. Restoring active subscriptions...');

    // 1. Re-authorize user scope if an authentication token is active
    if (this.authToken && this.ws?.readyState === WebSocket.OPEN) {
      try {
        console.log('[DerivWS] Re-authorizing user socket session...');
        await this.sendRequest({ authorize: this.authToken }, 10000);
        console.log('[DerivWS] Socket user authorization successfully restored.');
      } catch (authErr) {
        console.warn('[DerivWS] Re-authorization failed during recovery:', authErr);
      }
    }

    // 2. Restore user-level streams: balance, portfolio, positions, transactions
    if (this.isBalanceSubscribed && this.ws?.readyState === WebSocket.OPEN) {
      this.sendRequest({ balance: 1, subscribe: 1 }).catch((err) => {
        console.warn('[DerivWS] Balance resubscription failed:', err);
      });
    }

    if (this.isPortfolioSubscribed && this.ws?.readyState === WebSocket.OPEN) {
      this.sendRequest({ portfolio: 1, subscribe: 1 }).catch((err) => {
        console.warn('[DerivWS] Portfolio resubscription failed:', err);
      });
    }

    if (this.isPositionsSubscribed && this.ws?.readyState === WebSocket.OPEN) {
      this.sendRequest({ proposal_open_contract: 1, subscribe: 1 }).catch((err) => {
        console.warn('[DerivWS] Positions resubscription failed:', err);
      });
    }

    if (this.isTransactionsSubscribed && this.ws?.readyState === WebSocket.OPEN) {
      this.sendRequest({ transaction: 1, subscribe: 1 }).catch((err) => {
        console.warn('[DerivWS] Transactions resubscription failed:', err);
      });
    }

    // 3. Restore market tick streams
    this.tickSubscriptions.forEach((sub, symbol) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendRequest({ ticks: symbol })
          .then((res) => {
            if (res.subscription?.id) {
              sub.subId = res.subscription.id;
            }
          })
          .catch((err) => {
            console.error(`[DerivWS] Tick resubscription failed for ${symbol}: ${err.message || err}`);
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
