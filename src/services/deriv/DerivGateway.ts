/**
 * AppeX Quant Global Markets
 * DerivGateway
 *
 * Authoritative backend gateway for Deriv real-time market and
 * account streaming.
 *
 * Responsibilities:
 * - Maintain one persistent Deriv upstream WebSocket per gateway instance.
 * - Authorize the upstream connection when an access token is available.
 * - Fetch authoritative market metadata.
 * - Maintain upstream tick subscriptions.
 * - Multiplex genuine Deriv data to connected frontend clients.
 * - Stream genuine balance/profile updates.
 * - Reconnect automatically after upstream failures.
 * - Restore subscriptions after reconnect.
 * - Never fabricate prices, balances, profiles, or market data.
 */

import NodeWebSocket, { WebSocketServer } from 'ws';
import type { IncomingMessage } from 'http';

import type {
  DerivRequest,
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

interface PendingRequest {
  resolve: (response: DerivResponse) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
}

interface UpstreamSymbolSubscription {
  symbol: string;
  subscriptionId: string | null;
  clientSubscribers: Set<TickStreamCallback>;
}

interface FrontendClient {
  ws: any;
  cleanup: Array<() => void>;
}

export class DerivGateway {
  private static instance: DerivGateway | null = null;

  /**
   * Deriv application ID.
   */
  private readonly appId: string;

  /**
   * Upstream Deriv WebSocket endpoints.
   *
   * The primary endpoint is attempted first. A secondary endpoint is
   * retained as a fallback if the primary becomes unavailable.
   */
  private readonly endpoints: string[];

  private currentEndpointIndex = 0;

  /**
   * Upstream WebSocket connection.
   */
  private ws: NodeWebSocket | null = null;

  /**
   * Gateway lifecycle.
   */
  private connectionState: GatewayConnectionState = 'DISCONNECTED';
  private connectPromise: Promise<void> | null = null;
  private explicitShutdown = false;

  /**
   * Authentication token.
   *
   * This is intentionally kept in gateway state instead of mutating
   * process.env during a request.
   */
  private authToken: string | null = null;

  /**
   * Whether the current upstream connection has successfully completed
   * Deriv authorization.
   */
  private authorized = false;

  /**
   * Request correlation.
   */
  private requestIdCounter = 1;

  private readonly pendingRequests = new Map<number, PendingRequest>();

  /**
   * Authoritative market state.
   */
  private availableSymbols = new Set<string>();
  private activeSymbolsCache: DerivActiveSymbol[] = [];
  private lastSymbolsFetchTime = 0;

  /**
   * Upstream tick subscriptions.
   */
  private readonly symbolSubscriptions =
    new Map<string, UpstreamSymbolSubscription>();

  /**
   * Last genuine tick received per symbol.
   */
  private readonly tickHistory = new Map<string, NormalizedTick>();

  /**
   * Gateway callbacks.
   */
  private readonly tickCallbacks = new Set<TickStreamCallback>();
  private readonly balanceCallbacks = new Set<BalanceStreamCallback>();
  private readonly profileCallbacks = new Set<ProfileStreamCallback>();
  private readonly statusCallbacks = new Set<StatusStreamCallback>();

  /**
   * Connected frontend clients.
   */
  private readonly connectedClients = new Set<FrontendClient>();

  /**
   * Reconnection.
   */
  private reconnectBackoffMs = 1000;
  private readonly maxReconnectBackoffMs = 30000;
  private reconnectAttempts = 0;
  private reconnectTimeoutHandle: NodeJS.Timeout | null = null;

  /**
   * Heartbeat.
   */
  private pingIntervalHandle: NodeJS.Timeout | null = null;
  private lastPongTime = Date.now();
  private readonly pingIntervalMs = 30000;
  private readonly pingTimeoutMs = 10000;

  /**
   * Account state.
   */
  private currentProfile: GatewayProfileData | null = null;
  private currentBalance: GatewayBalanceData | null = null;

  /**
   * Process start time.
   */
  private readonly startTime = Date.now();

  constructor(appId = '1089') {
    this.appId = appId.trim() || '1089';

    this.endpoints = [
      `wss://ws.derivws.com/websockets/v3?app_id=${encodeURIComponent(this.appId)}`,
      `wss://ws.binaryws.com/websockets/v3?app_id=${encodeURIComponent(this.appId)}`,
    ];
  }

  /**
   * Singleton accessor.
   */
  public static getInstance(appId = '1089'): DerivGateway {
    if (!DerivGateway.instance) {
      DerivGateway.instance = new DerivGateway(appId);
    }

    return DerivGateway.instance;
  }

  /**
   * Set or replace the Deriv authorization token.
   *
   * If the upstream connection is already open, the new token is
   * immediately authorized against that connection.
   */
  public async setAuthToken(
    token: string
  ): Promise<GatewayProfileData | null> {
    const cleanToken = typeof token === 'string' ? token.trim() : '';

    if (!cleanToken) {
      this.authToken = null;
      this.authorized = false;
      this.currentProfile = null;
      this.currentBalance = null;

      this.emitStatus();

      return null;
    }

    const tokenChanged = this.authToken !== cleanToken;

    this.authToken = cleanToken;

    if (!tokenChanged) {
      return this.currentProfile;
    }

    this.authorized = false;
    this.currentProfile = null;
    this.currentBalance = null;

    if (!this.isUpstreamOpen()) {
      await this.connect();
    }

    return this.authorizeOnce();
  }

  /**
   * Return whether the gateway currently has an open upstream connection.
   */
  private isUpstreamOpen(): boolean {
    return this.ws !== null && this.ws.readyState === NodeWebSocket.OPEN;
  }

  /**
   * Establish the upstream Deriv WebSocket.
   *
   * Connection and authorization are intentionally separate:
   *
   * 1. Open WebSocket.
   * 2. Authorize if a token exists.
   * 3. Fetch active symbols.
   * 4. Restore subscriptions.
   */
  public async connect(): Promise<void> {
    if (this.explicitShutdown) {
      return;
    }

    if (this.isUpstreamOpen() && this.connectionState === 'CONNECTED') {
      return;
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.connectPromise = this.establishConnection();

    try {
      await this.connectPromise;
    } finally {
      this.connectPromise = null;
    }
  }

  /**
   * Internal connection procedure.
   */
  private async establishConnection(): Promise<void> {
    this.setConnectionState(
      this.reconnectAttempts > 0 ? 'RECONNECTING' : 'CONNECTING'
    );

    const endpoint =
      this.endpoints[
        this.currentEndpointIndex % this.endpoints.length
      ];

    logger.info('[DerivGateway] Connecting to Deriv upstream', {
      endpoint: endpoint.replace(
        `app_id=${encodeURIComponent(this.appId)}`,
        'app_id=[configured]'
      ),
      attempt: this.reconnectAttempts + 1,
    });

    const ws = new NodeWebSocket(endpoint, {
      handshakeTimeout: 10000,
      perMessageDeflate: false,
    });

    ws.on('message', this.handleUpstreamMessage);
    ws.on('close', this.handleUpstreamClose);
    ws.on('error', (error: any) => {
      logger.warn('[DerivGateway] Upstream WebSocket error', {
        error: error?.message || String(error),
      });
    });

    this.ws = ws;

    try {
      await this.waitForOpen(ws);

      if (this.ws !== ws) {
        throw new Error('Deriv upstream connection was replaced');
      }

      this.reconnectAttempts = 0;
      this.reconnectBackoffMs = 1000;

      this.setConnectionState('CONNECTED');

      this.startHeartbeat();

      logger.info('[DerivGateway] Deriv upstream WebSocket connected');

      if (this.authToken) {
        const profile = await this.authorizeOnce();

        if (!profile) {
          logger.warn(
            '[DerivGateway] Upstream connected but authorization failed'
          );
        }
      } else {
        logger.info(
          '[DerivGateway] Upstream connected without account authorization'
        );
      }

      await this.refreshActiveSymbols();

      await this.restoreSubscriptions();
    } catch (error: any) {
      logger.error('[DerivGateway] Upstream connection failed', {
        error: error?.message || String(error),
      });

      if (this.ws === ws) {
        this.ws = null;
      }

      this.authorized = false;
      this.stopHeartbeat();

      try {
        if (
          ws.readyState === NodeWebSocket.OPEN ||
          ws.readyState === NodeWebSocket.CONNECTING
        ) {
          ws.close();
        }
      } catch {}

      this.setConnectionState('ERROR');

      this.scheduleReconnect();

      throw error instanceof Error
        ? error
        : new Error(String(error));
    }
  }

  /**
   * Wait for a WebSocket connection to open.
   */
  private waitForOpen(ws: NodeWebSocket): Promise<void> {
    return new Promise((resolve, reject) => {
      let settled = false;

      const cleanup = () => {
        ws.removeListener('open', handleOpen);
        ws.removeListener('error', handleError);
        ws.removeListener('close', handleClose);
      };

      const handleOpen = () => {
        if (settled) return;

        settled = true;
        cleanup();
        resolve();
      };

      const handleError = (error: Error) => {
        if (settled) return;

        settled = true;
        cleanup();
        reject(error);
      };

      const handleClose = (
        code: number,
        reason: Buffer
      ) => {
        if (settled) return;

        settled = true;
        cleanup();

        const reasonText = reason?.toString() || '';

        reject(
          new Error(
            `Deriv upstream closed during connection: ${code}${
              reasonText ? ` - ${reasonText}` : ''
            }`
          )
        );
      };

      ws.once('open', handleOpen);
      ws.once('error', handleError);
      ws.once('close', handleClose);
    });
  }

  /**
   * Schedule a reconnect using exponential backoff with jitter.
   */
  private scheduleReconnect(): void {
    if (this.explicitShutdown) {
      return;
    }

    if (this.reconnectTimeoutHandle) {
      return;
    }

    const exponentialDelay = Math.min(
      this.reconnectBackoffMs *
        Math.pow(2, Math.min(this.reconnectAttempts, 5)),
      this.maxReconnectBackoffMs
    );

    const jitter = Math.floor(Math.random() * 1000);

    const delay = Math.min(
      exponentialDelay + jitter,
      this.maxReconnectBackoffMs
    );

    this.reconnectAttempts += 1;

    logger.warn('[DerivGateway] Scheduling upstream reconnect', {
      delayMs: delay,
      attempt: this.reconnectAttempts,
    });

    this.reconnectTimeoutHandle = setTimeout(() => {
      this.reconnectTimeoutHandle = null;

      if (this.explicitShutdown) {
        return;
      }

      this.connect().catch((error: any) => {
        logger.warn('[DerivGateway] Reconnect attempt failed', {
          error: error?.message || String(error),
        });
      });
    }, delay);
  }

  /**
   * Start heartbeat monitoring.
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.lastPongTime = Date.now();

    this.pingIntervalHandle = setInterval(() => {
      if (!this.isUpstreamOpen()) {
        return;
      }

      const startedAt = Date.now();

      this.sendRequest({ ping: 1 }, this.pingTimeoutMs)
        .then(() => {
          this.lastPongTime = Date.now();

          logger.debug('[DerivGateway] Upstream heartbeat OK', {
            latencyMs: Date.now() - startedAt,
          });

          this.emitStatus();
        })
        .catch((error: any) => {
          logger.warn('[DerivGateway] Upstream heartbeat failed', {
            error: error?.message || String(error),
          });

          this.forceReconnect();
        });
    }, this.pingIntervalMs);
  }

  /**
   * Stop heartbeat monitoring.
   */
  private stopHeartbeat(): void {
    if (this.pingIntervalHandle) {
      clearInterval(this.pingIntervalHandle);
      this.pingIntervalHandle = null;
    }
  }

  /**
   * Force the current upstream connection closed and schedule recovery.
   */
  private forceReconnect(): void {
    this.authorized = false;

    const ws = this.ws;

    this.ws = null;

    this.stopHeartbeat();

    if (ws) {
      try {
        if (
          ws.readyState === NodeWebSocket.OPEN ||
          ws.readyState === NodeWebSocket.CONNECTING
        ) {
          ws.close();
        }
      } catch {}
    }

    this.rejectPendingRequests(
      new Error('Deriv upstream connection lost')
    );

    this.setConnectionState('DISCONNECTED');

    this.scheduleReconnect();
  }

  /**
   * Update lifecycle state.
   */
  private setConnectionState(
    state: GatewayConnectionState
  ): void {
    if (this.connectionState === state) {
      this.emitStatus();
      return;
    }

    this.connectionState = state;

    logger.debug('[DerivGateway] Connection state changed', {
      state,
      authorized: this.authorized,
    });

    this.emitStatus();
  }

  /**
   * Emit gateway status safely.
   */
  private emitStatus(): void {
    const status = this.getStatus();

    this.statusCallbacks.forEach((callback) => {
      try {
        callback(status);
      } catch (error: any) {
        logger.warn('[DerivGateway] Status callback failed', {
          error: error?.message || String(error),
        });
      }
    });
  }

  /**
   * Handle every upstream Deriv message.
   */
  private handleUpstreamMessage = (data: Buffer): void => {
    try {
      const text = data.toString();

      const response = JSON.parse(text) as DerivResponse;

      /**
       * Deriv API errors.
       */
      if (response.error) {
        logger.warn('[DerivGateway] Deriv API error', {
          code: response.error.code,
          message: response.error.message,
          reqId: response.req_id,
        });
      }

      /**
       * Authorization response.
       */
      if (
        response.authorize &&
        typeof response.authorize === 'object'
      ) {
        this.handleAuthorizationResponse(response);
      }

      /**
       * Correlate request/response.
       */
      if (
        typeof response.req_id === 'number' &&
        this.pendingRequests.has(response.req_id)
      ) {
        const pending = this.pendingRequests.get(response.req_id)!;

        clearTimeout(pending.timer);
        this.pendingRequests.delete(response.req_id);

        if (response.error) {
          pending.reject(
            new Error(
              `Deriv API Error: ${response.error.code} - ${response.error.message}`
            )
          );
        } else {
          pending.resolve(response);
        }
      }

      /**
       * Tick stream.
       */
      if (response.tick) {
        this.handleTick(response);
      }

      /**
       * Balance stream.
       */
      if (response.balance) {
        this.handleIncomingBalance(response.balance);
      }

      /**
       * Generic ping response.
       */
      if ((response as any).ping) {
        this.lastPongTime = Date.now();
        this.emitStatus();
      }
    } catch (error: any) {
      logger.error('[DerivGateway] Failed to process upstream message', {
        error: error?.message || String(error),
      });
    }
  };

  /**
   * Process authorization response.
   */
  private handleAuthorizationResponse(
    response: DerivResponse
  ): void {
    const auth = response.authorize as any;

    if (!auth || typeof auth !== 'object') {
      return;
    }

    if (response.error) {
      this.authorized = false;
      this.currentProfile = null;
      return;
    }

    const loginid = String(auth.loginid || '').trim();

    if (!loginid) {
      logger.warn(
        '[DerivGateway] Authorization response contained no login ID'
      );

      this.authorized = false;
      return;
    }

    this.authorized = true;

    this.currentProfile = {
      loginid,
      email: String(auth.email || ''),
      fullname: String(auth.fullname || ''),
      currency: String(auth.currency || 'USD'),
      balance:
        typeof auth.balance === 'number'
          ? auth.balance
          : 0,
      totalbalance:
        typeof auth.total_balance === 'number'
          ? auth.total_balance
          : typeof auth.balance === 'number'
            ? auth.balance
            : 0,
      country:
        typeof auth.country === 'string'
          ? auth.country
          : undefined,
      is_virtual:
        typeof auth.is_virtual === 'number'
          ? auth.is_virtual
          : undefined,
    };

    logger.info('[DerivGateway] Deriv account authorized', {
      loginid: this.currentProfile.loginid,
    });

    this.profileCallbacks.forEach((callback) => {
      try {
        callback(this.currentProfile!);
      } catch (error: any) {
        logger.warn('[DerivGateway] Profile callback failed', {
          error: error?.message || String(error),
        });
      }
    });

    this.emitStatus();
  }

  /**
   * Process a genuine Deriv tick.
   */
  private handleTick(response: DerivResponse): void {
    const tick = response.tick as any;

    if (!tick) {
      return;
    }

    const symbol = String(tick.symbol || '').trim();

    const quote =
      typeof tick.quote === 'number'
        ? tick.quote
        : Number(tick.quote);

    const epoch =
      typeof tick.epoch === 'number'
        ? tick.epoch
        : Number(tick.epoch);

    if (
      !symbol ||
      !Number.isFinite(quote) ||
      !Number.isFinite(epoch)
    ) {
      return;
    }

    const previous = this.tickHistory.get(symbol);

    const prevQuote =
      previous && Number.isFinite(previous.quote)
        ? previous.quote
        : quote;

    const change = quote - prevQuote;

    const changePct =
      prevQuote !== 0
        ? (change / prevQuote) * 100
        : 0;

    const normalized: NormalizedTick = {
      symbol,
      quote,
      bid:
        typeof tick.bid === 'number'
          ? tick.bid
          : undefined,
      ask:
        typeof tick.ask === 'number'
          ? tick.ask
          : undefined,
      epoch,
      change,
      changePct,
      prevQuote,
      lastUpdated: new Date(),
    };

    this.tickHistory.set(symbol, normalized);

    /**
     * Global callbacks.
     */
    this.tickCallbacks.forEach((callback) => {
      try {
        callback(normalized);
      } catch (error: any) {
        logger.warn('[DerivGateway] Tick callback failed', {
          error: error?.message || String(error),
        });
      }
    });

    /**
     * Symbol-specific callbacks.
     */
    const subscription =
      this.symbolSubscriptions.get(symbol);

    if (!subscription) {
      return;
    }

    subscription.clientSubscribers.forEach((callback) => {
      try {
        callback(normalized);
      } catch (error: any) {
        logger.warn(
          '[DerivGateway] Symbol tick callback failed',
          {
            symbol,
            error: error?.message || String(error),
          }
        );
      }
    });
  }

  /**
   * Handle genuine Deriv balance data.
   */
  private handleIncomingBalance(rawBalance: any): void {
    if (!rawBalance || typeof rawBalance !== 'object') {
      return;
    }

    const balanceValue =
      typeof rawBalance.balance === 'number'
        ? rawBalance.balance
        : Number(rawBalance.balance);

    if (!Number.isFinite(balanceValue)) {
      return;
    }

    const totalBalanceValue =
      typeof rawBalance.total_balance === 'number'
        ? rawBalance.total_balance
        : balanceValue;

    const payoutValue =
      typeof rawBalance.payout === 'number'
        ? rawBalance.payout
        : Number(rawBalance.payout || 0);

    const balance: GatewayBalanceData = {
      loginid: String(rawBalance.loginid || ''),
      balance: balanceValue,
      currency: String(rawBalance.currency || 'USD'),
      payout: Number.isFinite(payoutValue)
        ? payoutValue
        : 0,
      totalbalance: Number.isFinite(totalBalanceValue)
        ? totalBalanceValue
        : balanceValue,
      timestamp: Math.floor(Date.now() / 1000),
    };

    this.currentBalance = balance;

    this.balanceCallbacks.forEach((callback) => {
      try {
        callback(balance);
      } catch (error: any) {
        logger.warn('[DerivGateway] Balance callback failed', {
          error: error?.message || String(error),
        });
      }
    });
  }

  /**
   * Authorize the current upstream connection exactly once.
   */
  private async authorizeOnce(): Promise<GatewayProfileData | null> {
    if (!this.authToken) {
      this.authorized = false;
      return null;
    }

    if (!this.isUpstreamOpen()) {
      return null;
    }

    try {
      const response = await this.sendRequest(
        {
          authorize: this.authToken,
        },
        10000
      );

      if (
        response.error ||
        !response.authorize ||
        typeof response.authorize !== 'object'
      ) {
        this.authorized = false;

        logger.warn(
          '[DerivGateway] Deriv authorization was rejected',
          {
            code: response.error?.code,
            message: response.error?.message,
          }
        );

        return null;
      }

      this.handleAuthorizationResponse(response);

      return this.currentProfile;
    } catch (error: any) {
      this.authorized = false;

      logger.warn('[DerivGateway] Authorization request failed', {
        error: error?.message || String(error),
      });

      return null;
    }
  }

  /**
   * Fetch authoritative active symbols.
   */
  public async fetchActiveSymbols(
    style: 'full' | 'brief' = 'full'
  ): Promise<DerivActiveSymbol[]> {
    const now = Date.now();

    if (
      this.activeSymbolsCache.length > 0 &&
      now - this.lastSymbolsFetchTime < 30000
    ) {
      return this.activeSymbolsCache;
    }

    if (!this.isUpstreamOpen()) {
      try {
        await this.connect();
      } catch (error: any) {
        logger.warn(
          '[DerivGateway] Unable to connect before active-symbol request',
          {
            error: error?.message || String(error),
          }
        );

        return this.activeSymbolsCache;
      }
    }

    try {
      const response = await this.sendRequest(
        {
          active_symbols: style,
          product_type: 'basic',
        },
        10000
      );

      if (
        response.active_symbols &&
        Array.isArray(response.active_symbols)
      ) {
        this.activeSymbolsCache = response.active_symbols;
        this.lastSymbolsFetchTime = Date.now();

        const normalized =
          normalizeDerivActiveSymbols(
            response.active_symbols
          );

        this.availableSymbols =
          extractAvailableSymbols(normalized);

        logger.info('[DerivGateway] Active symbols updated', {
          count: response.active_symbols.length,
          normalizedCount: normalized.length,
        });

        return this.activeSymbolsCache;
      }
    } catch (error: any) {
      logger.warn(
        '[DerivGateway] Active symbols fetch failed',
        {
          error: error?.message || String(error),
        }
      );
    }

    return this.activeSymbolsCache;
  }

  /**
   * Refresh active symbols after connecting.
   */
  private async refreshActiveSymbols(): Promise<void> {
    try {
      await this.fetchActiveSymbols('full');
    } catch (error: any) {
      logger.warn(
        '[DerivGateway] Active symbol refresh failed',
        {
          error: error?.message || String(error),
        }
      );
    }
  }

  /**
   * Fetch authoritative candles.
   */
  public async fetchCandles(
    symbol: string,
    granularitySeconds: number,
    count = 300
  ): Promise<NormalizedCandle[]> {
    const cleanSymbol = String(symbol || '').trim();

    if (!cleanSymbol || isSymbolBlacklisted(cleanSymbol)) {
      return [];
    }

    if (!this.isUpstreamOpen()) {
      try {
        await this.connect();
      } catch {
        return [];
      }
    }

    const safeGranularity =
      Number.isFinite(granularitySeconds) &&
      granularitySeconds > 0
        ? Math.floor(granularitySeconds)
        : 3600;

    const safeCount =
      Number.isFinite(count) && count > 0
        ? Math.min(Math.floor(count), 5000)
        : 300;

    try {
      const response = await this.sendRequest(
        {
          ticks_history: cleanSymbol,
          style: 'candles',
          granularity: safeGranularity,
          count: safeCount,
          end: 'latest',
        },
        15000
      );

      if (
        response.candles &&
        Array.isArray(response.candles)
      ) {
        return response.candles
          .filter(
            (c: DerivCandle) =>
              Number.isFinite(c.open) &&
              Number.isFinite(c.high) &&
              Number.isFinite(c.low) &&
              Number.isFinite(c.close) &&
              Number.isFinite(c.epoch)
          )
          .map((c: DerivCandle) => ({
            timestamp: c.epoch * 1000,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          }));
      }

      /**
       * Fallback for history responses.
       */
      if (
        response.history &&
        Array.isArray(response.history.prices) &&
        Array.isArray(response.history.times)
      ) {
        const prices = response.history.prices;
        const times = response.history.times;

        const candles: NormalizedCandle[] = [];

        const length = Math.min(
          prices.length,
          times.length
        );

        for (let i = 0; i < length; i++) {
          const price = Number(prices[i]);
          const epoch = Number(times[i]);

          if (
            !Number.isFinite(price) ||
            !Number.isFinite(epoch)
          ) {
            continue;
          }

          candles.push({
            timestamp: epoch * 1000,
            open: price,
            high: price,
            low: price,
            close: price,
          });
        }

        return candles;
      }
    } catch (error: any) {
      logger.warn(
        `[DerivGateway] Candle request failed for ${cleanSymbol}`,
        {
          error: error?.message || String(error),
        }
      );
    }

    return [];
  }

  /**
   * Fetch authoritative contract categories.
   */
  public async fetchContractsFor(
    symbol: string
  ): Promise<DerivContractCategory[]> {
    const cleanSymbol = String(symbol || '').trim();

    if (!cleanSymbol || isSymbolBlacklisted(cleanSymbol)) {
      return [];
    }

    if (!this.isUpstreamOpen()) {
      try {
        await this.connect();
      } catch {
        return [];
      }
    }

    try {
      const response = await this.sendRequest(
        {
          contracts_for: cleanSymbol,
        },
        12000
      );

      if (
        response.contracts_for?.available &&
        Array.isArray(
          response.contracts_for.available
        )
      ) {
        return response.contracts_for.available;
      }
    } catch (error: any) {
      logger.warn(
        `[DerivGateway] Contract request failed for ${cleanSymbol}`,
        {
          error: error?.message || String(error),
        }
      );
    }

    return [];
  }

  /**
   * Return last genuine tick received for a symbol.
   */
  public getLastTick(
    symbol: string
  ): NormalizedTick | undefined {
    return this.tickHistory.get(
      String(symbol || '').trim()
    );
  }

  /**
   * Return currently available authoritative symbols.
   */
  public getAvailableSymbols(): Set<string> {
    return new Set(this.availableSymbols);
  }

  /**
   * Send a correlated request to Deriv.
   */
  public sendRequest(
    request: DerivRequest,
    timeoutMs = 15000
  ): Promise<DerivResponse> {
    return new Promise((resolve, reject) => {
      if (!this.isUpstreamOpen()) {
        reject(
          new Error('Deriv upstream not connected')
        );
        return;
      }

      const reqId = this.requestIdCounter++;

      const timer = setTimeout(() => {
        this.pendingRequests.delete(reqId);

        reject(
          new Error(
            `Deriv request timeout after ${timeoutMs}ms`
          )
        );
      }, timeoutMs);

      this.pendingRequests.set(reqId, {
        resolve,
        reject,
        timer,
      });

      try {
        const payload = {
          ...request,
          req_id: reqId,
        };

        this.ws!.send(JSON.stringify(payload));
      } catch (error: any) {
        clearTimeout(timer);
        this.pendingRequests.delete(reqId);

        reject(
          error instanceof Error
            ? error
            : new Error(String(error))
        );
      }
    });
  }

  /**
   * Subscribe to a genuine Deriv tick stream.
   */
  public subscribeTick(
    symbol: string,
    callback: TickStreamCallback
  ): () => void {
    const cleanSymbol = String(symbol || '').trim();

    if (
      !cleanSymbol ||
      isSymbolBlacklisted(cleanSymbol)
    ) {
      return () => {};
    }

    let subscription =
      this.symbolSubscriptions.get(cleanSymbol);

    if (!subscription) {
      subscription = {
        symbol: cleanSymbol,
        subscriptionId: null,
        clientSubscribers: new Set(),
      };

      this.symbolSubscriptions.set(
        cleanSymbol,
        subscription
      );

      this.ensureUpstreamTickSubscription(
        subscription
      ).catch((error: any) => {
        logger.warn(
          `[DerivGateway] Failed to subscribe to ${cleanSymbol}`,
          {
            error: error?.message || String(error),
          }
        );
      });
    }

    subscription.clientSubscribers.add(callback);

    return () => {
      const current =
        this.symbolSubscriptions.get(cleanSymbol);

      if (!current) {
        return;
      }

      current.clientSubscribers.delete(callback);

      if (current.clientSubscribers.size === 0) {
        this.removeTickSubscription(cleanSymbol).catch(
          (error: any) => {
            logger.warn(
              `[DerivGateway] Failed to remove ${cleanSymbol} subscription`,
              {
                error: error?.message || String(error),
              }
            );
          }
        );
      }
    };
  }

  /**
   * Create one upstream tick subscription for a symbol.
   */
  private async ensureUpstreamTickSubscription(
    subscription: UpstreamSymbolSubscription
  ): Promise<void> {
    if (!this.isUpstreamOpen()) {
      await this.connect();
    }

    if (!this.isUpstreamOpen()) {
      throw new Error('Deriv upstream not connected');
    }

    /**
     * A subscription already exists upstream.
     */
    if (subscription.subscriptionId) {
      return;
    }

    const response = await this.sendRequest(
      {
        ticks: subscription.symbol,
        subscribe: 1,
      } as DerivRequest,
      10000
    );

    const responseAny = response as any;

    if (responseAny.subscription?.id) {
      subscription.subscriptionId = String(
        responseAny.subscription.id
      );
    }
  }

  /**
   * Remove an upstream tick subscription.
   */
  private async removeTickSubscription(
    symbol: string
  ): Promise<void> {
    const subscription =
      this.symbolSubscriptions.get(symbol);

    if (!subscription) {
      return;
    }

    this.symbolSubscriptions.delete(symbol);

    if (
      subscription.subscriptionId &&
      this.isUpstreamOpen()
    ) {
      try {
        await this.sendRequest(
          {
            forget: subscription.subscriptionId,
          },
          5000
        );
      } catch (error: any) {
        logger.debug(
          '[DerivGateway] Upstream forget failed',
          {
            symbol,
            error: error?.message || String(error),
          }
        );
      }
    }
  }

  /**
   * Restore all active subscriptions after reconnect.
   */
  private async restoreSubscriptions(): Promise<void> {
    if (!this.isUpstreamOpen()) {
      return;
    }

    const subscriptions = Array.from(
      this.symbolSubscriptions.values()
    );

    for (const subscription of subscriptions) {
      subscription.subscriptionId = null;

      if (subscription.clientSubscribers.size === 0) {
        continue;
      }

      try {
        await this.ensureUpstreamTickSubscription(
          subscription
        );
      } catch (error: any) {
        logger.warn(
          `[DerivGateway] Failed to restore ${subscription.symbol}`,
          {
            error: error?.message || String(error),
          }
        );
      }
    }
  }

  /**
   * Global tick callback.
   */
  public onTick(
    callback: TickStreamCallback
  ): () => void {
    this.tickCallbacks.add(callback);

    return () => {
      this.tickCallbacks.delete(callback);
    };
  }

  /**
   * Global balance callback.
   */
  public onBalanceChange(
    callback: BalanceStreamCallback
  ): () => void {
    this.balanceCallbacks.add(callback);

    return () => {
      this.balanceCallbacks.delete(callback);
    };
  }

  /**
   * Global profile callback.
   */
  public onProfileChange(
    callback: ProfileStreamCallback
  ): () => void {
    this.profileCallbacks.add(callback);

    return () => {
      this.profileCallbacks.delete(callback);
    };
  }

  /**
   * Global status callback.
   */
  public onStatusChange(
    callback: StatusStreamCallback
  ): () => void {
    this.statusCallbacks.add(callback);

    return () => {
      this.statusCallbacks.delete(callback);
    };
  }

  /**
   * Attach frontend WebSocket upgrade handling.
   */
  public attachWebSocketServer(
    server: any,
    path = '/api/deriv/stream'
  ): void {
    server.on(
      'upgrade',
      (
        request: IncomingMessage,
        socket: any,
        head: Buffer
      ) => {
        try {
          const host =
            request.headers.host || 'localhost';

          const pathname = new URL(
            request.url || '/',
            `http://${host}`
          ).pathname;

          if (
            pathname === path ||
            pathname === '/deriv/stream' ||
            pathname === '/api/deriv/stream'
          ) {
            this.handleUpgrade(
              request,
              socket,
              head
            );
          }
        } catch (error: any) {
          logger.warn(
            '[DerivGateway] Invalid WebSocket upgrade request',
            {
              error: error?.message || String(error),
            }
          );

          try {
            socket.destroy();
          } catch {}
        }
      }
    );
  }

  /**
   * Handle a frontend WebSocket connection.
   */
  public handleUpgrade(
    req: IncomingMessage,
    socket: any,
    head: Buffer
  ): void {
    const wsServer = new WebSocketServer({
      noServer: true,
    });

    wsServer.handleUpgrade(
      req,
      socket,
      head,
      (ws) => {
        this.handleFrontendClient(ws);
      }
    );
  }

  /**
   * Register a frontend client.
   */
  private handleFrontendClient(ws: any): void {
    const client: FrontendClient = {
      ws,
      cleanup: [],
    };

    this.connectedClients.add(client);

    logger.debug(
      '[DerivGateway] Frontend client connected',
      {
        clientCount: this.connectedClients.size,
      }
    );

    /**
     * Global tick stream.
     */
    client.cleanup.push(
      this.onTick((tick) => {
        this.sendToClient(ws, {
          type: 'tick',
          data: tick,
        });
      })
    );

    /**
     * Global balance stream.
     */
    client.cleanup.push(
      this.onBalanceChange((balance) => {
        this.sendToClient(ws, {
          type: 'balance',
          data: balance,
        });
      })
    );

    /**
     * Global profile stream.
     */
    client.cleanup.push(
      this.onProfileChange((profile) => {
        this.sendToClient(ws, {
          type: 'profile',
          data: profile,
        });
      })
    );

    /**
     * Gateway status stream.
     */
    client.cleanup.push(
      this.onStatusChange((status) => {
        this.sendToClient(ws, {
          type: 'status',
          data: status,
        });
      })
    );

    /**
     * Immediately expose current gateway state.
     */
    this.sendToClient(ws, {
      type: 'status',
      data: this.getStatus(),
    });

    /**
     * Existing profile.
     */
    if (this.currentProfile) {
      this.sendToClient(ws, {
        type: 'profile',
        data: this.currentProfile,
      });
    }

    /**
     * Existing balance.
     */
    if (this.currentBalance) {
      this.sendToClient(ws, {
        type: 'balance',
        data: this.currentBalance,
      });
    }

    /**
     * Ensure the upstream connection exists.
     */
    this.connect().catch((error: any) => {
      logger.warn(
        '[DerivGateway] Frontend connection could not initialize upstream',
        {
          error: error?.message || String(error),
        }
      );
    });

    ws.on('message', (rawMessage: any) => {
      this.handleFrontendMessage(
        client,
        rawMessage
      ).catch((error: any) => {
        logger.warn(
          '[DerivGateway] Frontend message failed',
          {
            error: error?.message || String(error),
          }
        );
      });
    });

    ws.on('close', () => {
      this.removeFrontendClient(client);
    });

    ws.on('error', (error: any) => {
      logger.warn(
        '[DerivGateway] Frontend WebSocket error',
        {
          error: error?.message || String(error),
        }
      );
    });
  }

  /**
   * Process frontend WebSocket messages.
   */
  private async handleFrontendMessage(
    client: FrontendClient,
    rawMessage: any
  ): Promise<void> {
    const ws = client.ws;

    if (!ws || ws.readyState !== NodeWebSocket.OPEN) {
      return;
    }

    let payload: any;

    try {
      payload = JSON.parse(
        rawMessage.toString()
      );
    } catch {
      this.sendToClient(ws, {
        type: 'error',
        error: {
          message: 'Invalid JSON message',
        },
      });

      return;
    }

    const reqId =
      payload &&
      Object.prototype.hasOwnProperty.call(
        payload,
        'req_id'
      )
        ? payload.req_id
        : undefined;

    /**
     * Frontend ping.
     */
    if (
      payload?.ping ||
      payload?.action === 'ping'
    ) {
      this.sendToClient(ws, {
        type: 'pong',
        ping: 'pong',
        req_id: reqId,
      });

      return;
    }

    /**
     * Tick subscription.
     */
    if (
      payload?.action === 'subscribe_tick' &&
      payload?.symbol
    ) {
      const symbol = String(
        payload.symbol
      ).trim();

      if (!symbol) {
        this.sendToClient(ws, {
          req_id: reqId,
          error: {
            message: 'Symbol is required',
          },
        });

        return;
      }

      const unsubscribe = this.subscribeTick(
        symbol,
        (tick) => {
          this.sendToClient(ws, {
            type: 'tick',
            data: tick,
          });
        }
      );

      client.cleanup.push(unsubscribe);

      this.sendToClient(ws, {
        req_id: reqId,
        status: 'subscribed',
        symbol,
      });

      return;
    }

    /**
     * Tick unsubscription.
     *
     * The individual callback cleanup is handled when the
     * frontend connection is closed. A fresh subscription
     * is created for each subscribe request.
     */
    if (
      payload?.action === 'unsubscribe_tick' &&
      payload?.symbol
    ) {
      this.sendToClient(ws, {
        req_id: reqId,
        status: 'unsubscribed',
        symbol: String(payload.symbol).trim(),
      });

      return;
    }

    /**
     * Candle request.
     */
    if (
      payload?.action === 'fetch_candles' ||
      payload?.ticks_history
    ) {
      const symbol = String(
        payload.symbol ||
          payload.ticks_history ||
          ''
      ).trim();

      const granularity =
        Number(payload.granularity) || 3600;

      const count =
        Number(payload.count) || 300;

      const candles =
        await this.fetchCandles(
          symbol,
          granularity,
          count
        );

      this.sendToClient(ws, {
        req_id: reqId,
        data: candles,
      });

      return;
    }

    /**
     * Active symbols request.
     */
    if (
      payload?.active_symbols ||
      payload?.action === 'active_symbols'
    ) {
      const symbols =
        await this.fetchActiveSymbols();

      this.sendToClient(ws, {
        req_id: reqId,
        active_symbols: symbols,
        data: symbols,
      });

      return;
    }

    /**
     * Contract request.
     */
    if (
      payload?.action === 'fetch_contracts' ||
      payload?.contracts_for
    ) {
      const symbol = String(
        payload.symbol ||
          payload.contracts_for ||
          ''
      ).trim();

      const contracts =
        await this.fetchContractsFor(symbol);

      this.sendToClient(ws, {
        req_id: reqId,
        data: contracts,
      });

      return;
    }

    /**
     * Generic Deriv request.
     *
     * Only allow this when the frontend supplied req_id.
     */
    if (reqId !== undefined) {
      try {
        const response =
          await this.sendRequest(
            payload as DerivRequest,
            10000
          );

        this.sendToClient(ws, {
          req_id: reqId,
          data: response,
        });
      } catch (error: any) {
        this.sendToClient(ws, {
          req_id: reqId,
          error: {
            message:
              error?.message ||
              String(error),
          },
        });
      }
    }
  }

  /**
   * Safely send data to a frontend client.
   */
  private sendToClient(
    ws: any,
    payload: unknown
  ): void {
    try {
      if (
        ws &&
        ws.readyState === NodeWebSocket.OPEN
      ) {
        ws.send(JSON.stringify(payload));
      }
    } catch (error: any) {
      logger.debug(
        '[DerivGateway] Failed to send frontend message',
        {
          error: error?.message || String(error),
        }
      );
    }
  }

  /**
   * Remove frontend client and its callbacks.
   */
  private removeFrontendClient(
    client: FrontendClient
  ): void {
    if (!this.connectedClients.has(client)) {
      return;
    }

    client.cleanup.forEach((cleanup) => {
      try {
        cleanup();
      } catch {}
    });

    client.cleanup = [];

    this.connectedClients.delete(client);

    logger.debug(
      '[DerivGateway] Frontend client disconnected',
      {
        clientCount: this.connectedClients.size,
      }
    );
  }

  /**
   * Handle upstream close.
   */
  private handleUpstreamClose = (
    code: number,
    reason: Buffer
  ): void => {
    const reasonText =
      reason?.toString() || '';

    logger.warn(
      '[DerivGateway] Deriv upstream WebSocket closed',
      {
        code,
        reason: reasonText,
      }
    );

    this.authorized = false;

    if (this.ws) {
      this.ws.removeAllListeners();
    }

    this.ws = null;

    this.stopHeartbeat();

    this.rejectPendingRequests(
      new Error(
        `Deriv upstream closed: ${code}${
          reasonText
            ? ` - ${reasonText}`
            : ''
        }`
      )
    );

    this.setConnectionState(
      this.explicitShutdown
        ? 'DISCONNECTED'
        : 'OFFLINE'
    );

    if (!this.explicitShutdown) {
      /**
       * Move to the next endpoint after a failed
       * upstream connection.
       */
      this.currentEndpointIndex =
        (this.currentEndpointIndex + 1) %
        this.endpoints.length;

      this.scheduleReconnect();
    }
  };

  /**
   * Reject all outstanding upstream requests.
   */
  private rejectPendingRequests(
    error: Error
  ): void {
    for (const [
      reqId,
      pending,
    ] of this.pendingRequests) {
      clearTimeout(pending.timer);
      pending.reject(error);
      this.pendingRequests.delete(reqId);
    }
  }

  /**
   * Current connection state.
   */
  public getConnectionState():
    GatewayConnectionState {
    return this.connectionState;
  }

  /**
   * Current gateway diagnostics.
   */
  public getStatus(): GatewayStatus {
    const latencyMs =
      this.lastPongTime > 0
        ? Math.max(
            0,
            Date.now() -
              this.lastPongTime
          )
        : 0;

    return {
      state: this.connectionState,
      isAuthorized: this.authorized,
      activeSymbolsCount:
        this.activeSymbolsCache.length,
      subscribedSymbolsCount:
        this.symbolSubscriptions.size,
      connectedClientsCount:
        this.connectedClients.size,
      latencyMs,
      uptimeSeconds: Math.round(
        (Date.now() -
          this.startTime) /
          1000
      ),
    };
  }

  /**
   * Gracefully shut down the gateway.
   */
  public shutdown(): void {
    logger.info(
      '[DerivGateway] Shutting down'
    );

    this.explicitShutdown = true;

    if (this.reconnectTimeoutHandle) {
      clearTimeout(
        this.reconnectTimeoutHandle
      );
      this.reconnectTimeoutHandle = null;
    }

    this.stopHeartbeat();

    this.rejectPendingRequests(
      new Error(
        'DerivGateway shutting down'
      )
    );

    this.tickCallbacks.clear();
    this.balanceCallbacks.clear();
    this.profileCallbacks.clear();
    this.statusCallbacks.clear();

    this.symbolSubscriptions.clear();
    this.availableSymbols.clear();
    this.activeSymbolsCache = [];
    this.tickHistory.clear();

    for (const client of this.connectedClients) {
      try {
        client.cleanup.forEach(
          (cleanup) => {
            try {
              cleanup();
            } catch {}
          }
        );

        client.cleanup = [];

        if (
          client.ws &&
          client.ws.readyState ===
            NodeWebSocket.OPEN
        ) {
          client.ws.close();
        }
      } catch {}
    }

    this.connectedClients.clear();

    const ws = this.ws;
    this.ws = null;

    if (ws) {
      try {
        if (
          ws.readyState ===
            NodeWebSocket.OPEN ||
          ws.readyState ===
            NodeWebSocket.CONNECTING
        ) {
          ws.close();
        }
      } catch {}
    }

    this.authToken = null;
    this.authorized = false;
    this.currentProfile = null;
    this.currentBalance = null;

    this.setConnectionState(
      'DISCONNECTED'
    );
  }
}

/**
 * Global gateway singleton.
 */
export const derivGateway =
  DerivGateway.getInstance();

export default derivGateway;