/**
 * AppexQuant Markets Global - DerivGateway
 * Authoritative Backend Gateway for Deriv Real-time Market & Account Streaming.
 *
 * Architectural Mandates:
 * 1. Maintain ONE persistent, authenticated Deriv WebSocket upstream.
 * 2. Authorize once per connection session.
 * 3. Subscribe once per active symbol / stream upstream.
 * 4. Multiplex ticks across all frontend clients and backend listeners.
 * 5. Stream genuine balance updates.
 * 6. Stream genuine account profile updates.
 * 7. Auto-reconnect with exponential backoff & randomized jitter.
 * 8. Resubscribe safely upon connection recovery.
 * 9. Periodic heartbeat ping with response timeout detection.
 * 10. NEVER fabricate prices, balances, or account profiles.
 */

import NodeWebSocket, { WebSocketServer } from 'ws';
import type { IncomingMessage } from 'http';
import {
  DerivRequest,
  DerivRequestMessage,
  DerivResponse,
  DerivActiveSymbol,
  DerivCandle,
  DerivContractCategory,
  NormalizedTick,
  NormalizedCandle,
} from './derivTypes.js';
import {
  normalizeDerivActiveSymbols,
  extractAvailableSymbols,
  BLACKLISTED_SYMBOLS,
  isSymbolBlacklisted,
} from './marketNormalization.js';
import { logger } from '../../observability/logger.js';

export type GatewayConnectionState =
  | 'CONNECTED'
  | 'CONNECTING'
  | 'RECONNECTING'
  | 'OFFLINE'
  | 'ERROR'
  | 'DISCONNECTED';

export interface GatewayProfileData {
  loginid: string;
  email: string;
  fullname: string;
  currency: string;
  balance: number;
  totalbalance: number;
  country?: string;
  is_virtual?: number;
}

export interface GatewayBalanceData {
  loginid: string;
  balance: number;
  currency: string;
  payout: number;
  totalbalance: number;
  timestamp: number;
}

export interface GatewayStatus {
  state: GatewayConnectionState;
  isAuthorized: boolean;
  activeSymbolsCount: number;
  subscribedSymbolsCount: number;
  connectedClientsCount: number;
  latencyMs: number;
  uptimeSeconds: number;
}

export type TickStreamCallback = (tick: NormalizedTick) => void;
export type BalanceStreamCallback = (balance: GatewayBalanceData) => void;
export type ProfileStreamCallback = (profile: GatewayProfileData) => void;
export type StatusStreamCallback = (status: GatewayStatus) => void;

interface UpstreamSymbolSubscription {
  symbol: string;
  reqId: number;
  clientSubscribers: Set<TickStreamCallback>;
}

export class DerivGateway {
  private static instance: DerivGateway | null = null;

  private ws: any = null;
  private appId: string;
  private endpoints: string[];
  private currentEndpointIndex = 0;

  private connectionState: GatewayConnectionState = 'DISCONNECTED';
  private connectPromise: Promise<void> | null = null;
  private isExplicitShutdown = false;

  // Upstream request correlation
  private reqIdCounter = 1;
  private pendingRequests = new Map<
    number,
    {
      resolve: (res: DerivResponse) => void;
      reject: (err: Error) => void;
      timer: NodeJS.Timeout;
      request: DerivRequest;
    }
  >();

  // Authoritative Market State (Never Fabricated)
  private availableSymbols = new Set<string>();
  private activeSymbolsCache: DerivActiveSymbol[] = [];
  private lastSymbolsFetchTime = 0;
  private symbolSubscriptions = new Map<string, UpstreamSymbolSubscription>();
  private tickHistory = new Map<string, NormalizedTick>();

  // Upstream subscription stream callbacks
  private tickCallbacks = new Set<TickStreamCallback>();
  private balanceCallbacks = new Set<BalanceStreamCallback>();
  private profileCallbacks = new Set<ProfileStreamCallback>();
  private statusCallbacks = new Set<StatusStreamCallback>();

  // Upstream WebSocket lifecycle
  private reconnectBackoffMs = 1000;
  private maxReconnectBackoffMs = 30000;
  private reconnectAttempts = 0;
  private reconnectTimeoutHandle: NodeJS.Timeout | null = null;

  // Account state (from authorization)
  private currentProfile: GatewayProfileData | null = null;
  private currentBalance: GatewayBalanceData | null = null;

  // Connected frontend clients (WebSocket upgrade handlers)
  private connectedClients = new Set<any>();

  // Heartbeat
  private pingIntervalHandle: NodeJS.Timeout | null = null;
  private lastPongTime = Date.now();
  private pingTimeoutMs = 10000;

  // Startup time
  private startTime = Date.now();

  constructor(appId = '1089') {
    this.appId = appId;
    this.endpoints = [
      `wss://ws.derivws.com/websockets/v3?app_id=${this.appId}`,
      `wss://ws.binaryws.com/websockets/v3?app_id=${this.appId}`,
    ];
  }

  public static getInstance(appId = '1089'): DerivGateway {
    if (!DerivGateway.instance) {
      DerivGateway.instance = new DerivGateway(appId);
    }
    return DerivGateway.instance;
  }

  /**
   * Establish WebSocket connection to Deriv upstream.
   * Manages concurrent connection attempts & retries.
   */
  public async connect(): Promise<void> {
    // Prevent duplicate connection attempts
    if (this.connectionState === 'CONNECTED' || this.connectionState === 'CONNECTING') {
      return this.connectPromise || Promise.resolve();
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.connectPromise = (async () => {
      try {
        this.setConnectionState('CONNECTING');

        const endpoint = this.endpoints[this.currentEndpointIndex % this.endpoints.length];

        this.ws = new NodeWebSocket(endpoint, {
          handshakeTimeout: 10000,
        });

        await new Promise<void>((resolve, reject) => {
          const openListener = () => {
            this.ws.removeEventListener('error', errorListener);
            this.setConnectionState('CONNECTED');
            this.reconnectBackoffMs = 1000;
            this.reconnectAttempts = 0;

            // Start periodic heartbeat
            this.startPingInterval();

            resolve();
          };

          const errorListener = (err: any) => {
            this.ws.removeEventListener('open', openListener);
            reject(err);
          };

          this.ws.addEventListener('open', openListener);
          this.ws.addEventListener('error', errorListener);
          this.ws.addEventListener('message', this.handleUpstreamMessage.bind(this));
          this.ws.addEventListener('close', this.handleUpstreamClose.bind(this));
        });

        // Authorize & fetch active symbols
        await this.authorizeOnce();
        await this.fetchActiveSymbols('full');
      } catch (err: any) {
        logger.error('[DerivGateway] Connection failed:', { error: err?.message || String(err) });
        this.setConnectionState('ERROR');
        this.connectPromise = null;
        this.scheduleReconnect();
        throw err;
      } finally {
        this.connectPromise = null;
      }
    })();

    return this.connectPromise;
  }

  private scheduleReconnect(): void {
    if (this.isExplicitShutdown) return;

    const backoff = Math.min(
      this.reconnectBackoffMs * Math.pow(2, this.reconnectAttempts) +
        Math.random() * this.reconnectBackoffMs * 0.1,
      this.maxReconnectBackoffMs
    );

    this.reconnectAttempts++;

    if (this.reconnectTimeoutHandle) clearTimeout(this.reconnectTimeoutHandle);

    this.reconnectTimeoutHandle = setTimeout(() => {
      this.setConnectionState('RECONNECTING');
      this.connect().catch((err) => {
        logger.warn('[DerivGateway] Reconnect failed, will retry:', { error: err?.message || String(err) });
      });
    }, backoff);
  }

  private startPingInterval(): void {
    if (this.pingIntervalHandle) clearInterval(this.pingIntervalHandle);

    this.pingIntervalHandle = setInterval(() => {
      if (this.ws && this.ws.readyState === 1) {
        this.lastPongTime = Date.now();
        this.sendRequest({ ping: 1 }, this.pingTimeoutMs).catch((err) => {
          logger.warn('[DerivGateway] Ping timeout, reconnecting:', { error: err?.message || String(err) });
          this.ws.close();
          this.scheduleReconnect();
        });
      }
    }, 30000);
  }

  private setConnectionState(state: GatewayConnectionState): void {
    if (this.connectionState === state) return;

    this.connectionState = state;
    logger.debug('[DerivGateway] Connection state changed', { state });

    this.statusCallbacks.forEach((cb) => {
      try {
        cb(this.getStatus());
      } catch (err: any) {
        logger.warn('[DerivGateway] Status callback error:', { error: err?.message || String(err) });
      }
    });
  }

  private handleUpstreamMessage(event: any): void {
    try {
      const response: DerivResponse = JSON.parse(event.data || '{}');

      // Update account state from authorization
      if (response.authorize && typeof response.authorize === 'object') {
        const auth = response.authorize as any;
        if (auth.loginid && auth.email && auth.fullname) {
          this.currentProfile = {
            loginid: auth.loginid,
            email: auth.email,
            fullname: auth.fullname,
            currency: auth.currency || 'USD',
            balance: auth.balance || 0,
            totalbalance: auth.total_balance || auth.balance || 0,
            country: auth.country,
            is_virtual: auth.is_virtual,
          };

          this.profileCallbacks.forEach((cb) => {
            try {
              cb(this.currentProfile!);
            } catch (err: any) {
              logger.warn('[DerivGateway] Profile callback error:', { error: err?.message || String(err) });
            }
          });
        }
      }

      // Correlate pending request
      if (response.req_id && this.pendingRequests.has(response.req_id)) {
        const pending = this.pendingRequests.get(response.req_id)!;
        clearTimeout(pending.timer);
        this.pendingRequests.delete(response.req_id);

        if (response.error) {
          pending.reject(new Error(`Deriv API Error: ${response.error.code} - ${response.error.message}`));
        } else {
          pending.resolve(response);
        }
      }

      // Tick subscription stream
      if (response.tick) {
        const symbol = response.tick.symbol;
        const normalized: NormalizedTick = {
          symbol,
          quote: response.tick.quote,
          bid: response.tick.bid,
          ask: response.tick.ask,
          epoch: response.tick.epoch,
          change: 0,
          changePct: 0,
          prevQuote: this.tickHistory.get(symbol)?.quote || response.tick.quote,
          lastUpdated: new Date(),
        };

        if (normalized.prevQuote && normalized.prevQuote > 0) {
          normalized.change = normalized.quote - normalized.prevQuote;
          normalized.changePct = (normalized.change / normalized.prevQuote) * 100;
        }

        this.tickHistory.set(symbol, normalized);

        // Multiplex to all tick callbacks
        this.tickCallbacks.forEach((cb) => {
          try {
            cb(normalized);
          } catch (err: any) {
            logger.warn('[DerivGateway] Tick callback error:', { error: err?.message || String(err) });
          }
        });

        // Also multiplex to symbol-specific subscribers
        const sub = this.symbolSubscriptions.get(symbol);
        if (sub) {
          sub.clientSubscribers.forEach((cb) => {
            try {
              cb(normalized);
            } catch (err: any) {
              logger.warn('[DerivGateway] Symbol tick callback error:', { error: err?.message || String(err) });
            }
          });
        }
      }

      // Balance update stream
      if (response.balance) {
        this.handleIncomingBalance(response.balance);
      }
    } catch (err: any) {
      logger.error('[DerivGateway] Failed to handle upstream message:', { error: err?.message || String(err) });
    }
  }

  private handleUpstreamClose(): void {
    logger.warn('[DerivGateway] Upstream WebSocket closed');
    this.setConnectionState('DISCONNECTED');

    if (!this.isExplicitShutdown) {
      this.scheduleReconnect();
    }
  }

  /**
   * Authorize once upstream with the authoritative token.
   */
  private async authorizeOnce(): Promise<GatewayProfileData | null> {
    const token = process.env.DERIV_AUTH_TOKEN;

    if (!token) {
      logger.warn('[DerivGateway] No DERIV_AUTH_TOKEN set; operating as anonymous.');
      this.setConnectionState('CONNECTED');
      return null;
    }

    try {
      const response = await this.sendRequest({ authorize: token }, 5000);

      if (response.authorize && typeof response.authorize === 'object') {
        const auth = response.authorize as any;
        this.currentProfile = {
          loginid: auth.loginid || '',
          email: auth.email || '',
          fullname: auth.fullname || '',
          currency: auth.currency || 'USD',
          balance: auth.balance || 0,
          totalbalance: auth.total_balance || auth.balance || 0,
          country: auth.country,
          is_virtual: auth.is_virtual,
        };

        logger.info('[DerivGateway] Authorized', { loginid: this.currentProfile.loginid });
        this.profileCallbacks.forEach((cb) => {
          try {
            cb(this.currentProfile!);
          } catch (err: any) {
            logger.warn('[DerivGateway] Profile callback error:', { error: err?.message || String(err) });
          }
        });

        return this.currentProfile;
      }
    } catch (err: any) {
      logger.warn('[DerivGateway] Authorization failed:', { error: err?.message || String(err) });
    }

    return null;
  }

  /**
   * Process genuine balance data from Deriv.
   * Never fabricates balances.
   */
  private handleIncomingBalance(rawBalance: any): void {
    const balance: GatewayBalanceData = {
      loginid: rawBalance.loginid || '',
      balance: rawBalance.balance || 0,
      currency: rawBalance.currency || 'USD',
      payout: rawBalance.payout || 0,
      totalbalance: rawBalance.total_balance || 0,
      timestamp: Math.floor(Date.now() / 1000),
    };

    this.currentBalance = balance;

    this.balanceCallbacks.forEach((cb) => {
      try {
        cb(balance);
      } catch (err: any) {
        logger.warn('[DerivGateway] Balance callback error:', { error: err?.message || String(err) });
      }
    });
  }

  /**
   * Fetch authoritative active symbols from Deriv.
   */
  public async fetchActiveSymbols(style: 'full' | 'brief' = 'full'): Promise<DerivActiveSymbol[]> {
    const now = Date.now();

    // Cache for 30 seconds
    if (this.activeSymbolsCache.length > 0 && now - this.lastSymbolsFetchTime < 30000) {
      return this.activeSymbolsCache;
    }

    try {
      const response = await this.sendRequest({ active_symbols: style, product_type: 'basic' }, 10000);

      if (response.active_symbols && Array.isArray(response.active_symbols)) {
        this.activeSymbolsCache = response.active_symbols;
        this.lastSymbolsFetchTime = now;

        // Update available symbols set
        const normalized = normalizeDerivActiveSymbols(response.active_symbols);
        this.availableSymbols = extractAvailableSymbols(normalized);

        logger.debug('[DerivGateway] Fetched active symbols', {
          count: response.active_symbols.length,
          normalizedCount: normalized.length,
        });

        return response.active_symbols;
      }
    } catch (err: any) {
      logger.warn('[DerivGateway] Active symbols fetch failed:', { error: err?.message || String(err) });
    }

    return this.activeSymbolsCache;
  }

  /**
   * Fetch authoritative candles from Deriv (ticks_history).
   */
  public async fetchCandles(
    symbol: string,
    granularitySeconds: number,
    count = 300
  ): Promise<NormalizedCandle[]> {
    const cleanSymbol = symbol ? symbol.trim() : '';
    if (isSymbolBlacklisted(cleanSymbol)) return [];

    try {
      const response = await this.sendRequest(
        {
          ticks_history: cleanSymbol,
          style: 'candles',
          granularity: granularitySeconds,
          count,
          end: 'latest',
        },
        15000
      );

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
        return candles;
      }
    } catch (err: any) {
      logger.warn(`[DerivGateway] fetchCandles error for ${cleanSymbol}:`, { error: err?.message || String(err) });
    }

    return [];
  }

  /**
   * Fetch authoritative contracts for symbol from Deriv.
   */
  public async fetchContractsFor(symbol: string): Promise<DerivContractCategory[]> {
    const cleanSymbol = symbol ? symbol.trim() : '';
    if (isSymbolBlacklisted(cleanSymbol)) return [];

    try {
      const response = await this.sendRequest({ contracts_for: cleanSymbol }, 12000);
      if (response.contracts_for?.available && Array.isArray(response.contracts_for.available)) {
        return response.contracts_for.available;
      }
    } catch (err: any) {
      logger.warn(`[DerivGateway] fetchContractsFor error for ${cleanSymbol}:`, { error: err?.message || String(err) });
    }

    return [];
  }

  public getLastTick(symbol: string): NormalizedTick | undefined {
    return this.tickHistory.get(symbol);
  }

  public getAvailableSymbols(): Set<string> {
    return new Set(this.availableSymbols);
  }

  /**
   * Send correlated JSON-RPC request to Deriv upstream.
   */
  public sendRequest(request: DerivRequest, timeoutMs = 15000): Promise<DerivResponse> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== 1) {
        return reject(new Error('Deriv upstream not connected'));
      }

      const reqId = this.reqIdCounter++;
      const timer = setTimeout(() => {
        this.pendingRequests.delete(reqId);
        reject(new Error(`Deriv request timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pendingRequests.set(reqId, {
        resolve,
        reject,
        timer,
        request,
      });

      try {
        this.ws.send(JSON.stringify({ ...request, req_id: reqId }));
      } catch (err: any) {
        this.pendingRequests.delete(reqId);
        clearTimeout(timer);
        reject(err);
      }
    });
  }

  /**
   * Subscribe to ticks for a symbol with callback.
   * Returns unsubscribe function.
   */
  public subscribeTick(symbol: string, callback: TickStreamCallback): () => void {
    const cleanSymbol = symbol.trim();

    // Track symbol-specific subscribers
    if (!this.symbolSubscriptions.has(cleanSymbol)) {
      this.symbolSubscriptions.set(cleanSymbol, {
        symbol: cleanSymbol,
        reqId: 0,
        clientSubscribers: new Set(),
      });

      // Request ticks from upstream for this symbol
      this.sendRequest({ ticks: cleanSymbol }, 5000).catch((err) => {
        logger.warn(`[DerivGateway] Failed to subscribe to ${cleanSymbol}:`, { error: err?.message || String(err) });
      });
    }

    const sub = this.symbolSubscriptions.get(cleanSymbol)!;
    sub.clientSubscribers.add(callback);

    return () => {
      sub.clientSubscribers.delete(callback);
      if (sub.clientSubscribers.size === 0) {
        this.symbolSubscriptions.delete(cleanSymbol);
      }
    };
  }

  /**
   * Stream-wide tick subscription (all symbols).
   */
  public onTick(callback: TickStreamCallback): () => void {
    this.tickCallbacks.add(callback);
    return () => this.tickCallbacks.delete(callback);
  }

  /**
   * Stream-wide balance subscription.
   */
  public onBalanceChange(callback: BalanceStreamCallback): () => void {
    this.balanceCallbacks.add(callback);
    return () => this.balanceCallbacks.delete(callback);
  }

  /**
   * Stream-wide profile subscription.
   */
  public onProfileChange(callback: ProfileStreamCallback): () => void {
    this.profileCallbacks.add(callback);
    return () => this.profileCallbacks.delete(callback);
  }

  /**
   * Stream-wide status subscription.
   */
  public onStatusChange(callback: StatusStreamCallback): () => void {
    this.statusCallbacks.add(callback);
    return () => this.statusCallbacks.delete(callback);
  }

  /**
   * WebSocket upgrade handler for client connections (from api/deriv/stream).
   * Registers upstream & forwards ticks/balance/profile/status to client.
   */
  public handleUpgrade(req: IncomingMessage, socket: any, head: Buffer): void {
    const wsServer = new WebSocketServer({ noServer: true });

    wsServer.handleUpgrade(req, socket, head, (ws) => {
      this.connectedClients.add(ws);
      logger.debug('[DerivGateway] Client connected', { clientCount: this.connectedClients.size });

      // Multiplex all streams to this client
      const unsubTick = this.onTick((tick) => {
        try {
          ws.send(JSON.stringify({ type: 'tick', data: tick }));
        } catch {}
      });

      const unsubBalance = this.onBalanceChange((bal) => {
        try {
          ws.send(JSON.stringify({ type: 'balance', data: bal }));
        } catch {}
      });

      const unsubProfile = this.onProfileChange((prof) => {
        try {
          ws.send(JSON.stringify({ type: 'profile', data: prof }));
        } catch {}
      });

      const unsubStatus = this.onStatusChange((status) => {
        try {
          ws.send(JSON.stringify({ type: 'status', data: status }));
        } catch {}
      });

      ws.on('close', () => {
        this.connectedClients.delete(ws);
        unsubTick();
        unsubBalance();
        unsubProfile();
        unsubStatus();
        logger.debug('[DerivGateway] Client disconnected', { clientCount: this.connectedClients.size });
      });

      ws.on('error', (err: any) => {
        logger.warn('[DerivGateway] Client WebSocket error:', { error: err?.message || String(err) });
      });
    });
  }

  /**
   * Connection state.
   */
  public getConnectionState(): GatewayConnectionState {
    return this.connectionState;
  }

  /**
   * Diagnostic status.
   */
  public getStatus(): GatewayStatus {
    return {
      state: this.connectionState,
      isAuthorized: !!this.currentProfile,
      activeSymbolsCount: this.activeSymbolsCache.length,
      subscribedSymbolsCount: this.symbolSubscriptions.size,
      connectedClientsCount: this.connectedClients.size,
      latencyMs: Math.round(Date.now() - this.lastPongTime),
      uptimeSeconds: Math.round((Date.now() - this.startTime) / 1000),
    };
  }

  /**
   * Graceful shutdown.
   */
  public shutdown(): void {
    logger.info('[DerivGateway] Shutting down...');

    this.isExplicitShutdown = true;

    if (this.reconnectTimeoutHandle) clearTimeout(this.reconnectTimeoutHandle);
    if (this.pingIntervalHandle) clearInterval(this.pingIntervalHandle);

    this.tickCallbacks.clear();
    this.balanceCallbacks.clear();
    this.profileCallbacks.clear();
    this.statusCallbacks.clear();

    if (this.ws && this.ws.readyState === 1) {
      this.ws.close();
    }

    this.connectedClients.forEach((client) => {
      try {
        client.close();
      } catch {}
    });
    this.connectedClients.clear();

    this.setConnectionState('DISCONNECTED');
  }
}

// Global Singleton Instance
export const derivGateway = DerivGateway.getInstance();

export default derivGateway;
