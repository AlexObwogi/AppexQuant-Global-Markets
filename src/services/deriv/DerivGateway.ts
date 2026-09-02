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
} from './derivTypes.ts';
import {
  normalizeDerivActiveSymbols,
  extractAvailableSymbols,
  BLACKLISTED_SYMBOLS,
  isSymbolBlacklisted,
} from './marketNormalization.ts';
import { logger } from '../../observability/logger.ts';

export type GatewayConnectionState =
  | 'CONNECTED'
  | 'CONNECTING'
  | 'RECONNECTING'
  | 'OFFLINE'
  | 'ERROR'
  | 'DISCONNECTED';

export interface GatewayProfileData {
  loginid: string;
  currency: string;
  balance: number;
  email?: string;
  fullname?: string;
  is_virtual: number;
  landing_company_name?: string;
  scopes?: string[];
  userId?: string | number;
  account_list?: any[];
  accountType?: 'demo' | 'real';
  lastSyncedAt?: string;
}

export interface GatewayBalanceData {
  balance: number;
  currency: string;
  loginid: string;
  total?: number;
  updatedAt: string;
}

export interface GatewayStatus {
  state: GatewayConnectionState;
  isAuthorized: boolean;
  activeSymbolsCount: number;
  subscribedSymbolsCount: number;
  connectedClientsCount: number;
  lastPingTime?: number;
  lastPongTime?: number;
  latencyMs?: number;
  uptimeSeconds?: number;
  activeLoginId?: string | null;
}

export type TickStreamCallback = (tick: NormalizedTick) => void;
export type BalanceStreamCallback = (balance: GatewayBalanceData) => void;
export type ProfileStreamCallback = (profile: GatewayProfileData) => void;
export type StatusStreamCallback = (status: GatewayStatus) => void;

interface UpstreamSymbolSubscription {
  symbol: string;
  subId?: string;
  subscribersCount: number;
  isPending: boolean;
  lastTick?: NormalizedTick;
  callbacks: Set<TickStreamCallback>;
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

  // Authoritative Account State (Never Fabricated)
  private authToken: string | null = null;
  private isAuthorized = false;
  private isAuthorizing = false;
  private isBalanceSubscribed = false;
  private balanceSubscriptionId: string | null = null;
  private currentProfile: GatewayProfileData | null = null;
  private currentBalance: GatewayBalanceData | null = null;

  private wss: WebSocketServer | null = null;
  private clientHeartbeatInterval: NodeJS.Timeout | null = null;

  // Global Listeners (Multiplexed)
  private balanceListeners = new Set<BalanceStreamCallback>();
  private profileListeners = new Set<ProfileStreamCallback>();
  private statusListeners = new Set<StatusStreamCallback>();

  // Exponential Backoff & Recovery
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 30;
  private readonly baseReconnectDelayMs = 1000;
  private readonly maxReconnectDelayMs = 30000;
  private reconnectTimer: NodeJS.Timeout | null = null;

  // Heartbeat Ping
  private pingInterval: NodeJS.Timeout | null = null;
  private lastPingSent = 0;
  private lastPongReceived = 0;
  private pingLatencyMs = 0;
  private startTime = Date.now();

  // Connected Client Sockets (Multiplex downstream)
  private clientSockets = new Set<any>();
  private clientSymbolSubscriptions = new Map<any, Set<string>>();

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
   * Configure or update the authoritative Deriv OAuth / API token.
   * If already connected, triggers a single authorize message upstream.
   */
  public async setAuthToken(token: string | null): Promise<GatewayProfileData | null> {
    const cleanToken = token ? token.trim() : null;
    if (this.authToken === cleanToken && this.isAuthorized && this.currentProfile) {
      return this.currentProfile;
    }

    this.authToken = cleanToken;
    this.isAuthorized = false;
    this.currentProfile = null;

    if (!cleanToken) {
      this.isBalanceSubscribed = false;
      this.balanceSubscriptionId = null;
      this.currentBalance = null;
      this.notifyStatusChange();
      return null;
    }

    if (this.connectionState === 'CONNECTED') {
      return await this.authorizeOnce();
    } else {
      this.connect().catch((err) => {
        logger.warn('[DerivGateway] Connect on setAuthToken warning:', { error: err?.message || String(err) });
      });
      return null;
    }
  }

  public getAuthToken(): string | null {
    return this.authToken;
  }

  public isUserAuthorized(): boolean {
    return this.isAuthorized && Boolean(this.currentProfile?.loginid);
  }

  public getProfile(): GatewayProfileData | null {
    return this.currentProfile;
  }

  public getBalance(): GatewayBalanceData | null {
    return this.currentBalance;
  }

  public getConnectionState(): GatewayConnectionState {
    return this.connectionState;
  }

  public getStatus(): GatewayStatus {
    return {
      state: this.connectionState,
      isAuthorized: this.isAuthorized,
      activeSymbolsCount: this.availableSymbols.size,
      subscribedSymbolsCount: this.symbolSubscriptions.size,
      connectedClientsCount: this.clientSockets.size,
      lastPingTime: this.lastPingSent,
      lastPongTime: this.lastPongReceived,
      latencyMs: this.pingLatencyMs,
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      activeLoginId: this.currentProfile?.loginid || null,
    };
  }

  public onStatusChange(callback: StatusStreamCallback): () => void {
    this.statusListeners.add(callback);
    callback(this.getStatus());
    return () => this.statusListeners.delete(callback);
  }

  public onBalanceChange(callback: BalanceStreamCallback): () => void {
    this.balanceListeners.add(callback);
    if (this.currentBalance) {
      callback(this.currentBalance);
    }
    return () => this.balanceListeners.delete(callback);
  }

  public onProfileChange(callback: ProfileStreamCallback): () => void {
    this.profileListeners.add(callback);
    if (this.currentProfile) {
      callback(this.currentProfile);
    }
    return () => this.profileListeners.delete(callback);
  }

  private notifyStatusChange(): void {
    const status = this.getStatus();
    this.statusListeners.forEach((cb) => {
      try {
        cb(status);
      } catch (err) {
        logger.warn('[DerivGateway] Status callback error:', { error: (err as any)?.message });
      }
    });
    this.broadcastToClients({ type: 'status', data: status });
  }

  /**
   * Connect to upstream Deriv WebSocket with resilience and fallback.
   */
  public connect(): Promise<void> {
    this.isExplicitShutdown = false;

    if (this.ws && this.connectionState === 'CONNECTED') {
      return Promise.resolve();
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    const nextState: GatewayConnectionState = this.reconnectAttempts > 0 ? 'RECONNECTING' : 'CONNECTING';
    this.setConnectionState(nextState);

    this.connectPromise = new Promise((resolve, reject) => {
      try {
        const endpoint = this.endpoints[this.currentEndpointIndex % this.endpoints.length];
        logger.info('[DerivGateway] Connecting upstream Deriv WebSocket', {
          endpoint,
          attempt: this.reconnectAttempts + 1,
        });

        const WSClass: any = (NodeWebSocket as any).default || NodeWebSocket;
        this.ws = new WSClass(endpoint);

        const openTimeout = setTimeout(() => {
          if (this.ws && this.ws.readyState !== 1 /* OPEN */) {
            logger.warn('[DerivGateway] Connection timeout to endpoint', { endpoint });
            try {
              this.ws.close();
            } catch {}
            this.connectPromise = null;
            this.setConnectionState('ERROR');
            reject(new Error('Upstream connection timeout'));
          }
        }, 12000);

        this.ws.on('open', async () => {
          clearTimeout(openTimeout);
          this.reconnectAttempts = 0;
          this.connectPromise = null;
          this.setConnectionState('CONNECTED');
          logger.info('[DerivGateway] Connected successfully to Deriv upstream');

          this.startHeartbeat();
          await this.handlePostConnectRecovery();
          resolve();
        });

        this.ws.on('message', (raw: any) => {
          this.handleUpstreamMessage(raw);
        });

        this.ws.on('error', (err: any) => {
          logger.warn('[DerivGateway] Upstream WebSocket error:', { error: err?.message || String(err) });
          clearTimeout(openTimeout);
          this.connectPromise = null;
          this.setConnectionState('ERROR');
          reject(new Error(`Deriv WebSocket connection error: ${err?.message || String(err)}`));
        });

        this.ws.on('close', (code: number, reason: string) => {
          clearTimeout(openTimeout);
          this.connectPromise = null;
          this.stopHeartbeat();
          logger.warn('[DerivGateway] Upstream WebSocket closed', { code, reason: String(reason || '') });

          this.isAuthorized = false;
          this.isAuthorizing = false;
          this.isBalanceSubscribed = false;
          this.balanceSubscriptionId = null;

          // Invalidate subIds so resubscribe safely acquires fresh subscription IDs
          this.symbolSubscriptions.forEach((sub) => {
            sub.subId = undefined;
            sub.isPending = false;
          });

          if (!this.isExplicitShutdown) {
            this.setConnectionState('DISCONNECTED');
            this.scheduleReconnect();
          }
        });
      } catch (err: any) {
        logger.error('[DerivGateway] Construction exception:', { error: err?.message || String(err) });
        this.connectPromise = null;
        this.setConnectionState('ERROR');
        reject(err);
      }
    });

    return this.connectPromise;
  }

  private setConnectionState(state: GatewayConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.notifyStatusChange();
    }
  }

  /**
   * Handle safe recovery after connection establishment:
   * 1. Authorize once (if token exists)
   * 2. Resubscribe active tick symbols safely
   * 3. Fetch authoritative active symbols
   */
  private async handlePostConnectRecovery(): Promise<void> {
    try {
      // 1. Authorize once if token configured
      if (this.authToken) {
        await this.authorizeOnce();
      }

      // 2. Fetch authoritative active symbols to ensure whitelist validation
      await this.fetchActiveSymbols('full').catch((err) => {
        logger.warn('[DerivGateway] Active symbols refresh warning:', { error: err?.message });
      });

      // 3. Resubscribe safely to all symbols with active subscribers
      this.resubscribeActiveSymbols();
    } catch (err: any) {
      logger.warn('[DerivGateway] Post-connect recovery notice:', { error: err?.message || String(err) });
    }
  }

  /**
   * Authorize once upstream with the authoritative token.
   */
  private async authorizeOnce(): Promise<GatewayProfileData | null> {
    if (!this.authToken || this.isAuthorizing) {
      return this.currentProfile;
    }

    if (this.connectionState !== 'CONNECTED') {
      await this.connect();
    }

    this.isAuthorizing = true;
    logger.info('[DerivGateway] Sending authoritative single-session authorize upstream...');

    try {
      const response = await this.sendRequest(
        { authorize: this.authToken },
        12000
      );

      this.isAuthorizing = false;

      if (response.authorize && !response.error) {
        const auth = response.authorize as any;
        const loginid = auth.loginid || '';
        const currency = auth.currency || 'USD';
        const balance = typeof auth.balance === 'number' ? auth.balance : parseFloat(auth.balance) || 0;
        const isVirtual = auth.is_virtual === 1 || loginid.startsWith('VR') ? 1 : 0;

        const profile: GatewayProfileData = {
          loginid,
          currency,
          balance,
          email: auth.email,
          fullname: auth.fullname,
          is_virtual: isVirtual,
          landing_company_name: auth.landing_company_name,
          scopes: auth.scopes || ['trade', 'account_manage'],
          userId: auth.user_id,
          account_list: auth.account_list,
          accountType: isVirtual ? 'demo' : 'real',
          lastSyncedAt: new Date().toISOString(),
        };

        this.isAuthorized = true;
        this.currentProfile = profile;
        logger.info('[DerivGateway] Authorize successful for loginid:', { loginid, currency, isVirtual });

        this.profileListeners.forEach((cb) => cb(profile));
        this.broadcastToClients({ type: 'profile', data: profile });

        // Subscribe to balance stream once authorized
        await this.subscribeBalanceOnce();

        this.notifyStatusChange();
        return profile;
      } else {
        const errMessage = response.error?.message || 'Authorization rejected by Deriv';
        logger.warn('[DerivGateway] Authorize failed:', { error: errMessage });
        this.isAuthorized = false;
        this.currentProfile = null;
        this.notifyStatusChange();
        return null;
      }
    } catch (err: any) {
      this.isAuthorizing = false;
      this.isAuthorized = false;
      logger.warn('[DerivGateway] Authorize request failed:', { error: err?.message || String(err) });
      this.notifyStatusChange();
      return null;
    }
  }

  /**
   * Subscribe to balance stream once.
   */
  private async subscribeBalanceOnce(): Promise<void> {
    if (!this.isAuthorized || this.isBalanceSubscribed) {
      return;
    }

    try {
      logger.info('[DerivGateway] Subscribing upstream balance stream...');
      const response = await this.sendRequest({ balance: 1, subscribe: 1 }, 10000);
      if (response.subscription?.id) {
        this.balanceSubscriptionId = response.subscription.id;
        this.isBalanceSubscribed = true;
        logger.info('[DerivGateway] Balance stream subscribed successfully', { subId: this.balanceSubscriptionId });
      }

      if (response.balance) {
        this.handleIncomingBalance(response.balance);
      }
    } catch (err: any) {
      logger.warn('[DerivGateway] Balance subscription error:', { error: err?.message || String(err) });
    }
  }

  /**
   * Resubscribe all active symbols safely after reconnection.
   */
  private resubscribeActiveSymbols(): void {
    logger.info('[DerivGateway] Resubscribing active symbols upstream...', {
      count: this.symbolSubscriptions.size,
    });

    this.symbolSubscriptions.forEach((sub, symbol) => {
      if (sub.subscribersCount > 0) {
        this.sendUpstreamTickSubscription(symbol);
      }
    });

    if (this.isAuthorized) {
      this.subscribeBalanceOnce().catch(() => {});
    }
  }

  /**
   * Multiplex Tick Subscription:
   * Only 1 upstream Deriv tick request is made per symbol regardless of how many subscribers exist.
   */
  public subscribeTick(symbol: string, callback: TickStreamCallback): () => void {
    if (!symbol) return () => {};
    const cleanSymbol = symbol.trim();

    if (isSymbolBlacklisted(cleanSymbol)) {
      logger.warn(`[DerivGateway] Subscription rejected for blacklisted symbol: ${cleanSymbol}`);
      return () => {};
    }

    let sub = this.symbolSubscriptions.get(cleanSymbol);
    if (!sub) {
      sub = {
        symbol: cleanSymbol,
        subscribersCount: 1,
        isPending: false,
        callbacks: new Set([callback]),
      };
      this.symbolSubscriptions.set(cleanSymbol, sub);
      this.sendUpstreamTickSubscription(cleanSymbol);
    } else {
      sub.subscribersCount++;
      sub.callbacks.add(callback);
      if (!sub.subId && !sub.isPending && this.connectionState === 'CONNECTED') {
        this.sendUpstreamTickSubscription(cleanSymbol);
      }
    }

    // Immediately deliver cached tick if available
    const cached = this.tickHistory.get(cleanSymbol);
    if (cached) {
      try {
        callback(cached);
      } catch (err) {
        logger.warn('[DerivGateway] Tick callback error on cached tick:', { error: (err as any)?.message });
      }
    }

    this.notifyStatusChange();

    // Return unsubscription teardown function
    return () => this.unsubscribeTick(cleanSymbol, callback);
  }

  /**
   * Multiplex Tick Unsubscription:
   * Upstream forget is sent ONLY when all subscribers have unsubscribed.
   */
  public unsubscribeTick(symbol: string, callback: TickStreamCallback): void {
    if (!symbol) return;
    const cleanSymbol = symbol.trim();
    const sub = this.symbolSubscriptions.get(cleanSymbol);
    if (!sub) return;

    sub.callbacks.delete(callback);
    sub.subscribersCount = Math.max(0, sub.subscribersCount - 1);

    if (sub.subscribersCount === 0 || sub.callbacks.size === 0) {
      if (sub.subId && this.connectionState === 'CONNECTED') {
        this.sendRequest({ forget: sub.subId }, 5000).catch(() => {});
      }
      this.symbolSubscriptions.delete(cleanSymbol);
      logger.info(`[DerivGateway] Unsubscribed upstream symbol ${cleanSymbol} (0 active listeners)`);
    }

    this.notifyStatusChange();
  }

  /**
   * Send single tick subscription upstream to Deriv.
   */
  private sendUpstreamTickSubscription(symbol: string): void {
    const sub = this.symbolSubscriptions.get(symbol);
    if (!sub || sub.isPending) return;

    if (this.connectionState !== 'CONNECTED') {
      this.connect().catch(() => {});
      return;
    }

    // Validate symbol against authoritative active symbols if list is populated
    if (this.availableSymbols.size > 0 && !this.availableSymbols.has(symbol)) {
      logger.warn(`[DerivGateway] Symbol '${symbol}' is not present in active_symbols list.`);
      return;
    }

    sub.isPending = true;
    logger.info(`[DerivGateway] Subscribing upstream tick for '${symbol}'`);

    this.sendRequest({ ticks: symbol }, 10000)
      .then((res) => {
        sub.isPending = false;
        if (res.subscription?.id) {
          sub.subId = res.subscription.id;
          logger.info(`[DerivGateway] Upstream subscription confirmed for ${symbol}`, { subId: sub.subId });
        } else if (res.error) {
          logger.warn(`[DerivGateway] Deriv rejected tick subscription for ${symbol}:`, { error: res.error.message });
          if (
            res.error.message?.toLowerCase().includes('unrecognised') ||
            res.error.message?.toLowerCase().includes('invalid')
          ) {
            this.symbolSubscriptions.delete(symbol);
          }
        }
      })
      .catch((err) => {
        sub.isPending = false;
        logger.warn(`[DerivGateway] Tick subscription error for ${symbol}:`, { error: err?.message || String(err) });
      });
  }

  /**
   * Send correlated JSON-RPC request to Deriv upstream.
   */
  public sendRequest(request: DerivRequest, timeoutMs = 15000): Promise<DerivResponse> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.connectionState !== 'CONNECTED') {
        return reject(new Error('DerivGateway upstream is not connected'));
      }

      const reqId = this.reqIdCounter++;
      const payload: DerivRequestMessage = { ...request, req_id: reqId };

      const timer = setTimeout(() => {
        this.pendingRequests.delete(reqId);
        reject(new Error(`Deriv API Request Timeout (${timeoutMs}ms) for ${JSON.stringify(request)}`));
      }, timeoutMs);

      this.pendingRequests.set(reqId, { resolve, reject, timer, request });

      try {
        this.ws.send(JSON.stringify(payload));
      } catch (err: any) {
        clearTimeout(timer);
        this.pendingRequests.delete(reqId);
        reject(err);
      }
    });
  }

  /**
   * Handle incoming raw message from upstream Deriv WebSocket.
   */
  private handleUpstreamMessage(raw: any): void {
    try {
      const text = typeof raw === 'string' ? raw : raw?.toString('utf8') || '';
      const data = JSON.parse(text) as DerivResponse;

      // 1. Resolve pending correlated request
      if (data.req_id && this.pendingRequests.has(data.req_id)) {
        const req = this.pendingRequests.get(data.req_id)!;
        clearTimeout(req.timer);
        this.pendingRequests.delete(data.req_id);

        if (data.error) {
          req.reject(new Error(data.error.message || 'Deriv API Error'));
        } else {
          req.resolve(data);
        }
      }

      // 2. Handle Tick Streams (Multiplex)
      if (data.msg_type === 'tick' && data.tick) {
        this.handleIncomingTick(data.tick, data.subscription?.id);
      }

      // 3. Handle Balance Updates (Stream)
      if (data.msg_type === 'balance' && data.balance) {
        this.handleIncomingBalance(data.balance);
      }

      // 4. Handle Heartbeat Pong
      if (data.msg_type === 'ping' || data.ping === 'pong') {
        this.lastPongReceived = Date.now();
        if (this.lastPingSent > 0) {
          this.pingLatencyMs = this.lastPongReceived - this.lastPingSent;
        }
      }
    } catch (err: any) {
      logger.warn('[DerivGateway] Error parsing upstream message:', { error: err?.message || String(err) });
    }
  }

  /**
   * Process and normalize genuine tick from Deriv.
   * Never fabricates prices.
   */
  private handleIncomingTick(tickData: any, subId?: string): void {
    if (!tickData || !tickData.symbol || typeof tickData.quote !== 'number') return;

    const { symbol, quote, epoch, bid, ask } = tickData;
    const cleanSymbol = symbol.trim();
    const prevTick = this.tickHistory.get(cleanSymbol);
    const prevQuote = prevTick ? prevTick.quote : quote;
    const change = quote - prevQuote;
    const changePct = prevQuote > 0 ? (change / prevQuote) * 100 : 0;

    const normalizedTick: NormalizedTick = {
      symbol: cleanSymbol,
      quote,
      bid: typeof bid === 'number' ? bid : quote,
      ask: typeof ask === 'number' ? ask : quote,
      epoch: epoch || Math.floor(Date.now() / 1000),
      change,
      changePct,
      prevQuote,
      lastUpdated: new Date(epoch ? epoch * 1000 : Date.now()),
    };

    this.tickHistory.set(cleanSymbol, normalizedTick);

    const sub = this.symbolSubscriptions.get(cleanSymbol);
    if (sub) {
      if (subId && !sub.subId) {
        sub.subId = subId;
      }
      sub.lastTick = normalizedTick;

      // Broadcast to all backend callback subscribers
      sub.callbacks.forEach((cb) => {
        try {
          cb(normalizedTick);
        } catch (e: any) {
          logger.warn('[DerivGateway] Error in tick subscriber callback:', { error: e?.message });
        }
      });
    }

    // Broadcast to connected frontend clients subscribed to this symbol
    this.broadcastTickToClients(normalizedTick);
  }

  /**
   * Process genuine balance data from Deriv.
   * Never fabricates balances.
   */
  private handleIncomingBalance(rawBalance: any): void {
    if (!rawBalance) return;
    const balanceNum = typeof rawBalance.balance === 'number' ? rawBalance.balance : parseFloat(rawBalance.balance) || 0;
    const currency = rawBalance.currency || this.currentProfile?.currency || 'USD';
    const loginid = rawBalance.loginid || this.currentProfile?.loginid || '';

    const balanceData: GatewayBalanceData = {
      balance: balanceNum,
      currency,
      loginid,
      total: rawBalance.total ? (typeof rawBalance.total === 'number' ? rawBalance.total : parseFloat(rawBalance.total)) : undefined,
      updatedAt: new Date().toISOString(),
    };

    this.currentBalance = balanceData;
    if (this.currentProfile) {
      this.currentProfile.balance = balanceNum;
      this.currentProfile.currency = currency;
    }

    this.balanceListeners.forEach((cb) => {
      try {
        cb(balanceData);
      } catch (err: any) {
        logger.warn('[DerivGateway] Error in balance subscriber callback:', { error: err?.message });
      }
    });

    this.broadcastToClients({ type: 'balance', data: balanceData });
  }

  /**
   * Fetch authoritative active symbols from Deriv.
   */
  public async fetchActiveSymbols(style: 'full' | 'brief' = 'full'): Promise<DerivActiveSymbol[]> {
    const now = Date.now();
    if (this.activeSymbolsCache.length > 0 && now - this.lastSymbolsFetchTime < 120000) {
      return this.activeSymbolsCache;
    }

    try {
      const response = await this.sendRequest(
        { active_symbols: style, product_type: 'basic' },
        15000
      );

      if (response.active_symbols && Array.isArray(response.active_symbols) && response.active_symbols.length > 0) {
        const normalized = normalizeDerivActiveSymbols(response.active_symbols);
        const available = extractAvailableSymbols(normalized);

        this.availableSymbols = available;
        this.activeSymbolsCache = response.active_symbols;
        this.lastSymbolsFetchTime = now;
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
   * Heartbeat Ping:
   * Periodically sends ping to Deriv upstream to verify liveness and detect dead connections.
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.connectionState === 'CONNECTED') {
        this.lastPingSent = Date.now();
        this.sendRequest({ ping: 1 }, 10000)
          .then((res) => {
            if (res.ping === 'pong' || res.msg_type === 'ping') {
              this.lastPongReceived = Date.now();
              this.pingLatencyMs = this.lastPongReceived - this.lastPingSent;
            }
          })
          .catch((err) => {
            logger.warn('[DerivGateway] Heartbeat ping failed or timed out (10s). Forcing connection recovery...', {
              error: err?.message || String(err),
            });
            try {
              if (this.ws) this.ws.close();
            } catch {}
          });
      }
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Schedule exponential backoff reconnect with randomized jitter.
   */
  private scheduleReconnect(): void {
    if (this.isExplicitShutdown || this.reconnectTimer) return;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('[DerivGateway] Max reconnect attempts reached. Setting DISCONNECTED');
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

    logger.info(`[DerivGateway] Reconnecting in ${delay}ms (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    this.setConnectionState('RECONNECTING');

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.currentEndpointIndex = (this.currentEndpointIndex + 1) % this.endpoints.length;
      this.connect().catch((err) => {
        logger.warn('[DerivGateway] Reconnection attempt failed:', { error: err?.message || String(err) });
      });
    }, delay);
  }

  public shutdown(): void {
    this.isExplicitShutdown = true;
    this.stopHeartbeat();
    this.stopClientHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.pendingRequests.forEach((req) => {
      clearTimeout(req.timer);
      req.reject(new Error('DerivGateway explicitly shutdown'));
    });
    this.pendingRequests.clear();

    // Close all downstream client sockets
    this.clientSockets.forEach((clientWs) => {
      try {
        clientWs.close(1001, 'Gateway Server Shutdown');
      } catch {}
    });
    this.clientSockets.clear();
    this.clientSymbolSubscriptions.clear();

    if (this.wss) {
      try {
        this.wss.close();
      } catch {}
      this.wss = null;
    }

    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    this.setConnectionState('DISCONNECTED');
  }

  // ==========================================
  // Client WebSocket Multiplexing & Downstream
  // ==========================================

  /**
   * Returns or initializes the downstream WebSocketServer instance (noServer mode).
   */
  public getWebSocketServer(): WebSocketServer {
    if (this.wss) {
      return this.wss;
    }

    const wss = new WebSocketServer({ noServer: true });
    this.wss = wss;
    logger.info('[DerivGateway] Downstream WebSocket Server initialized');

    wss.on('connection', (clientWs: any, req: IncomingMessage) => {
      this.handleClientConnection(clientWs, req);
    });

    this.startClientHeartbeat();
    return wss;
  }

  /**
   * Directly handles an HTTP upgrade request, performing the WebSocket handshake (HTTP 101).
   */
  public handleUpgrade(request: IncomingMessage, socket: any, head: Buffer = Buffer.alloc(0)): void {
    const wss = this.getWebSocketServer();
    try {
      wss.handleUpgrade(request, socket, head, (clientWs) => {
        wss.emit('connection', clientWs, request);
      });
    } catch (err: any) {
      logger.warn('[DerivGateway] Failed to upgrade WebSocket connection:', { error: err?.message || String(err) });
    }
  }

  /**
   * Attach WebSocket Server to the HTTP Server to serve downstream frontend clients.
   * Uses noServer mode to prevent duplicate listeners on the same HTTP server.
   */
  public attachWebSocketServer(server: any, targetPath = '/api/deriv/stream'): WebSocketServer {
    const wss = this.getWebSocketServer();

    const upgradeHandler = (request: IncomingMessage, socket: any, head: Buffer) => {
      try {
        const reqUrl = request.url || '';
        const url = new URL(reqUrl, `http://${request.headers.host || 'localhost'}`);
        const pathname = url.pathname;

        if (
          pathname === targetPath ||
          pathname === targetPath + '/' ||
          pathname === '/deriv/stream' ||
          pathname === '/deriv/stream/'
        ) {
          this.handleUpgrade(request, socket, head);
        }
      } catch (err: any) {
        logger.warn('[DerivGateway] Upgrade handling exception:', { error: err?.message || String(err) });
      }
    };

    // Attach upgrade handler once per server
    if (server && typeof server.on === 'function') {
      const existingListeners = server.listeners('upgrade');
      const isAlreadyAttached = existingListeners.some((l: any) => l._derivGatewayUpgrade);
      if (!isAlreadyAttached) {
        (upgradeHandler as any)._derivGatewayUpgrade = true;
        server.on('upgrade', upgradeHandler);
      }
    }

    return wss;
  }

  private startClientHeartbeat(): void {
    this.stopClientHeartbeat();
    this.clientHeartbeatInterval = setInterval(() => {
      this.clientSockets.forEach((clientWs) => {
        if (clientWs.isAlive === false) {
          logger.info('[DerivGateway] Terminating dead client WebSocket');
          try {
            clientWs.terminate();
          } catch {}
          this.clientSockets.delete(clientWs);
          this.clientSymbolSubscriptions.delete(clientWs);
          return;
        }
        clientWs.isAlive = false;
        try {
          if (clientWs.readyState === 1) {
            clientWs.ping();
          }
        } catch {}
      });
    }, 30000);
  }

  private stopClientHeartbeat(): void {
    if (this.clientHeartbeatInterval) {
      clearInterval(this.clientHeartbeatInterval);
      this.clientHeartbeatInterval = null;
    }
  }

  /**
   * Handle incoming frontend client WebSocket connection.
   */
  public handleClientConnection(clientWs: any, req?: IncomingMessage): void {
    clientWs.isAlive = true;
    clientWs.on('pong', () => {
      clientWs.isAlive = true;
    });

    this.clientSockets.add(clientWs);
    this.clientSymbolSubscriptions.set(clientWs, new Set<string>());

    logger.info('[DerivGateway] Frontend client connected to gateway stream', {
      totalClients: this.clientSockets.size,
    });

    // Ensure backend upstream is connected
    if (this.connectionState === 'DISCONNECTED') {
      this.connect().catch(() => {});
    }

    // Immediately send current connection status, profile, balance
    this.sendToClient(clientWs, { type: 'status', data: this.getStatus() });
    if (this.currentProfile) {
      this.sendToClient(clientWs, { type: 'profile', data: this.currentProfile });
    }
    if (this.currentBalance) {
      this.sendToClient(clientWs, { type: 'balance', data: this.currentBalance });
    }

    clientWs.on('message', async (message: any) => {
      try {
        const text = typeof message === 'string' ? message : message.toString('utf8');
        const parsed = JSON.parse(text);

        // 1. Authorize from Client
        if (parsed.action === 'authorize' || parsed.authorize) {
          const token = (parsed.token || parsed.authorize || '').trim();
          if (token) {
            const profile = await this.setAuthToken(token);
            if (profile) {
              this.sendToClient(clientWs, { type: 'authorize', data: profile, req_id: parsed.req_id });
              this.sendToClient(clientWs, { type: 'profile', data: profile });
              if (this.currentBalance) {
                this.sendToClient(clientWs, { type: 'balance', data: this.currentBalance });
              }
            } else {
              this.sendToClient(clientWs, {
                type: 'authorize',
                error: { message: 'Authorization failed upstream' },
                req_id: parsed.req_id,
              });
            }
          }
        }

        // 2. Balance from Client
        if (parsed.action === 'balance' || parsed.balance) {
          if (this.currentBalance) {
            this.sendToClient(clientWs, { type: 'balance', data: this.currentBalance, req_id: parsed.req_id });
          } else if (this.isAuthorized) {
            await this.subscribeBalanceOnce();
            if (this.currentBalance) {
              this.sendToClient(clientWs, { type: 'balance', data: this.currentBalance, req_id: parsed.req_id });
            }
          }
        }

        // 3. Subscribe Tick
        if (parsed.action === 'subscribe_tick' || parsed.type === 'subscribe_tick' || parsed.ticks) {
          const symbol = (parsed.symbol || parsed.ticks || '').trim();
          if (symbol && !isSymbolBlacklisted(symbol)) {
            const subs = this.clientSymbolSubscriptions.get(clientWs);
            if (subs && !subs.has(symbol)) {
              subs.add(symbol);
              // Hook into upstream subscription
              this.subscribeTick(symbol, () => {});
            }
            const last = this.getLastTick(symbol);
            if (last) {
              this.sendToClient(clientWs, { type: 'tick', data: last });
            }
          }
        }

        // 4. Unsubscribe Tick
        if (parsed.action === 'unsubscribe_tick' || parsed.type === 'unsubscribe_tick' || parsed.forget) {
          const symbol = (parsed.symbol || parsed.forget || '').trim();
          if (symbol) {
            const subs = this.clientSymbolSubscriptions.get(clientWs);
            if (subs && subs.has(symbol)) {
              subs.delete(symbol);
              this.unsubscribeTick(symbol, () => {});
            }
          }
        }

        // 5. Active Symbols Request
        if (parsed.action === 'active_symbols' || parsed.active_symbols) {
          const symbols = await this.fetchActiveSymbols('full');
          this.sendToClient(clientWs, { type: 'active_symbols', data: symbols, req_id: parsed.req_id });
        }

        // 6. Candles / Ticks History Request
        if (parsed.action === 'fetch_candles' || parsed.ticks_history) {
          const symbol = (parsed.symbol || parsed.ticks_history || '').trim();
          const gran = parsed.granularity || 60;
          const count = parsed.count || 300;
          const candles = await this.fetchCandles(symbol, gran, count);
          this.sendToClient(clientWs, { type: 'candles', symbol, data: candles, req_id: parsed.req_id });
        }

        // 7. Ping from Client
        if (parsed.action === 'ping' || parsed.ping) {
          this.sendToClient(clientWs, { type: 'pong', time: Date.now(), req_id: parsed.req_id });
        }
      } catch (err: any) {
        logger.warn('[DerivGateway] Error handling client message:', { error: err?.message || String(err) });
      }
    });

    clientWs.on('close', () => {
      const subs = this.clientSymbolSubscriptions.get(clientWs);
      if (subs) {
        subs.forEach((symbol) => {
          this.unsubscribeTick(symbol, () => {});
        });
      }
      this.clientSymbolSubscriptions.delete(clientWs);
      this.clientSockets.delete(clientWs);
      logger.info('[DerivGateway] Frontend client disconnected', {
        remainingClients: this.clientSockets.size,
      });
      this.notifyStatusChange();
    });

    clientWs.on('error', () => {
      try {
        clientWs.close();
      } catch {}
    });
  }

  private sendToClient(clientWs: any, payload: any): void {
    if (clientWs && clientWs.readyState === 1 /* OPEN */) {
      try {
        clientWs.send(JSON.stringify(payload));
      } catch (err) {
        // Ignore send errors on dead client
      }
    }
  }

  private broadcastToClients(payload: any): void {
    const json = JSON.stringify(payload);
    this.clientSockets.forEach((clientWs) => {
      if (clientWs.readyState === 1) {
        try {
          clientWs.send(json);
        } catch {}
      }
    });
  }

  private broadcastTickToClients(tick: NormalizedTick): void {
    const payload = JSON.stringify({ type: 'tick', data: tick });
    this.clientSockets.forEach((clientWs) => {
      if (clientWs.readyState === 1) {
        const subs = this.clientSymbolSubscriptions.get(clientWs);
        if (subs && subs.has(tick.symbol)) {
          try {
            clientWs.send(payload);
          } catch {}
        }
      }
    });
  }
}

// Global Singleton Instance
export const derivGateway = DerivGateway.getInstance();
export default derivGateway;
