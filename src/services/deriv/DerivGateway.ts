/**
 * AppeX Quant Global Markets
 *
 * Deriv Options API Gateway
 *
 * Architecture:
 *   OAuth 2.0 access token
 *          │
 *          ▼
 *   Options REST API
 *          │
 *          ├── account discovery
 *          │
 *          └── OTP
 *                │
 *                ▼
 *       authenticated Options WS
 *
 * Public market data uses the public Options WebSocket.
 *
 * Important:
 * - No legacy API authentication.
 * - No legacy WebSocket endpoints.
 * - No token authentication message over WebSocket.
 * - Authenticated WebSocket URLs are obtained through the OTP REST endpoint.
 * - Access tokens and OTP values are never logged.
 */

import WebSocket, {
  WebSocketServer,
  type Server as WebSocketServerType,
} from 'ws';

import type { IncomingMessage, Server as HttpServer } from 'http';

import {
  DerivActiveSymbol,
  DerivContractCategory,
  NormalizedCandle,
  NormalizedTick,
} from './derivTypes.js';

import {
  isSymbolBlacklisted,
  normalizeDerivActiveSymbols,
} from './marketNormalization.js';

import { logger } from '../../observability/logger.js';
import { verifySessionToken } from '../security.js';

function parseCookies(cookieHeader?: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach((part) => {
    const [key, ...vals] = part.trim().split('=');
    if (key && vals.length > 0) {
      cookies[key.trim()] = decodeURIComponent(vals.join('=').trim());
    }
  });
  return cookies;
}

export type DerivConnectionState =
  | 'CONNECTED'
  | 'CONNECTING'
  | 'RECONNECTING'
  | 'OFFLINE'
  | 'ERROR'
  | 'DISCONNECTED';

export type TickCallback = (tick: NormalizedTick) => void;
export type BalanceCallback = (balance: {
  balance: number;
  currency: string;
  loginid: string;
}) => void;
export type ProfileCallback = (profile: DerivAccountProfile) => void;
export type StatusCallback = (state: DerivConnectionState) => void;

export interface DerivAccountProfile {
  loginid: string;
  balance?: number;
  currency?: string;
  email?: string;
  fullname?: string;
  [key: string]: unknown;
}

export interface DerivGatewayStatus {
  state: DerivConnectionState;
  isAuthorized: boolean;
  activeSymbolsCount: number;
  subscribedSymbolsCount: number;
  connectedClientsCount: number;
  latencyMs: number | null;
  uptimeSeconds: number;
}

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason?: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
}

interface TickSubscription {
  callbacks: Set<TickCallback>;
  subscriptionId?: string;
  isSubscribing?: boolean;
}

interface RestErrorPayload {
  errors?: Array<{
    status?: number;
    code?: string;
    message?: string;
  }>;
  message?: string;
}

interface OptionsAccount {
  account_id?: string;
  account_type?: string;
  balance?: number;
  currency?: string;
  status?: string;
  [key: string]: unknown;
}

interface OptionsAccountsResponse {
  data?: OptionsAccount[] | OptionsAccount;
  errors?: Array<{
    status?: number;
    code?: string;
    message?: string;
  }>;
}

interface OptionsOtpResponse {
  data?: {
    url?: string;
  };
  errors?: Array<{
    status?: number;
    code?: string;
    message?: string;
  }>;
}

interface GatewayClientMessage {
  action?: string;
  type?: string;
  symbol?: string;
  symbols?: string[];
  req_id?: number;
  [key: string]: unknown;
}

const OPTIONS_REST_BASE = 'https://api.derivws.com';
const OPTIONS_PUBLIC_WS =
  'wss://api.derivws.com/trading/v1/options/ws/public';

const DEFAULT_REQUEST_TIMEOUT = 15_000;
const DEFAULT_RECONNECT_DELAY = 1_000;
const MAX_RECONNECT_DELAY = 30_000;

const WS_OPEN = WebSocket.OPEN;

function cleanErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message.replace(/\s+/g, ' ').trim();
  }

  return String(error).replace(/\s+/g, ' ').trim();
}

function isValidAccountId(accountId: string): boolean {
  return /^[A-Za-z0-9_-]{3,64}$/.test(accountId);
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

export class DerivGateway {
  private static _instance: DerivGateway | null = null;

  private publicWs: WebSocket | null = null;
  private accountWs: WebSocket | null = null;

  private accountId: string | null = null;
  private accessToken: string | null = null;

  private connectionState: DerivConnectionState = 'DISCONNECTED';

  private publicConnectPromise: Promise<void> | null = null;
  private accountConnectPromise: Promise<void> | null = null;

  private publicReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private accountReconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private publicReconnectAttempts = 0;
  private accountReconnectAttempts = 0;

  private explicitShutdown = false;

  private requestId = 1;

  private pendingPublicRequests = new Map<number, PendingRequest>();
  private pendingAccountRequests = new Map<number, PendingRequest>();

  private tickSubscriptions = new Map<string, TickSubscription>();
  private tickHistory = new Map<string, NormalizedTick>();

  private availableSymbols = new Set<string>();
  private activeSymbolsCache: DerivActiveSymbol[] = [];
  private lastActiveSymbolsFetchTime = 0;
  private fetchActiveSymbolsPromise: Promise<DerivActiveSymbol[]> | null = null;
  private tickSubQueue: string[] = [];
  private isProcessingTickSubQueue = false;

  private balance: {
    balance: number;
    currency: string;
    loginid: string;
  } | null = null;

  private profile: DerivAccountProfile | null = null;

  private statusListeners = new Set<StatusCallback>();
  private balanceListeners = new Set<BalanceCallback>();
  private profileListeners = new Set<ProfileCallback>();

  private clients = new Set<WebSocket>();
  private clientSubscriptions = new Map<WebSocket, Set<() => void>>();
  private clientSessions = new Map<WebSocket, { userId?: string; loginid?: string }>();

  private webSocketServer: WebSocketServer | null = null;

  private connectedAt: number | null = null;

  private lastLatencyMs: number | null = null;

  private pingTimer: ReturnType<typeof setInterval> | null = null;

  private constructor() {}

  public static getInstance(): DerivGateway {
    if (!DerivGateway._instance) {
      DerivGateway._instance = new DerivGateway();
    }

    return DerivGateway._instance;
  }

  /**
   * Returns the gateway singleton.
   */
  public static instance(): DerivGateway {
    return DerivGateway.getInstance();
  }

  /**
   * Current gateway state.
   */
  public getConnectionState(): DerivConnectionState {
    return this.connectionState;
  }

  /**
   * Configure the authenticated OAuth session.
   *
   * Ownership of the OAuth token remains server-side.
   */
  public setAuthToken(token: string, accountId?: string): void {
    const normalizedToken = token?.trim();

    if (!normalizedToken) {
      throw new Error('A valid OAuth access token is required.');
    }

    this.accessToken = normalizedToken;

    if (accountId) {
      this.setAccountId(accountId);
    }
  }

  /**
   * Set the Options account associated with the current OAuth session.
   */
  public setAccountId(accountId: string): void {
    const normalized = accountId?.trim();

    if (!normalized || !isValidAccountId(normalized)) {
      throw new Error('Invalid Options account ID.');
    }

    if (this.accountId !== normalized) {
      this.closeAccountSocket();

      this.accountId = normalized;
      this.balance = null;
      this.profile = null;
    }
  }

  /**
   * Explicitly configure the current authenticated session.
   */
  public configureSession(
    accessToken: string,
    accountId: string,
  ): void {
    this.setAuthToken(accessToken);
    this.setAccountId(accountId);
  }

  /**
   * Establish public market-data connectivity.
   *
   * Public Options WebSocket requires no authentication.
   */
  public async connect(): Promise<void> {
    this.explicitShutdown = false;

    await this.connectPublic();

    if (this.accessToken && this.accountId) {
      await this.connectAccount().catch((error) => {
        logger.warn('[DerivGateway] Authenticated Options connection unavailable.', {
          error: cleanErrorMessage(error),
        });
      });
    }
  }

  /**
   * Connect to the public Options market-data WebSocket.
   */
  private async connectPublic(): Promise<void> {
    if (this.publicWs?.readyState === WS_OPEN) {
      return;
    }

    if (this.publicConnectPromise) {
      return this.publicConnectPromise;
    }

    this.setConnectionState(
      this.publicReconnectAttempts > 0 ? 'RECONNECTING' : 'CONNECTING',
    );

    console.log('[STREAM_CONNECTING]', { type: 'public', attempt: this.publicReconnectAttempts });

    this.publicConnectPromise = new Promise<void>((resolve, reject) => {
      let settled = false;

      if (this.publicWs) {
        try {
          this.publicWs.removeAllListeners();
          this.publicWs.close();
        } catch {}
        this.publicWs = null;
      }

      const ws = new WebSocket(OPTIONS_PUBLIC_WS);

      this.publicWs = ws;

      const finishResolve = () => {
        if (settled) return;

        settled = true;
        this.publicConnectPromise = null;
        resolve();
      };

      const finishReject = (error: Error) => {
        if (settled) return;

        settled = true;
        this.publicConnectPromise = null;
        reject(error);
      };

      ws.once('open', () => {
        this.publicReconnectAttempts = 0;
        this.connectedAt ??= Date.now();

        console.log('[STREAM_OPEN]', { type: 'public' });

        this.setConnectionState(
          this.accountWs?.readyState === WS_OPEN
            ? 'CONNECTED'
            : 'CONNECTED',
        );

        this.startHeartbeat();

        this.restoreTickSubscriptions();

        finishResolve();
      });

      ws.on('message', (raw: WebSocket.RawData) => {
        this.handlePublicMessage(raw);
      });

      ws.on('pong', () => {
        this.lastLatencyMs = Date.now() - Number(ws['__appexPingAt'] ?? Date.now());
      });

      ws.on('error', (error) => {
        console.error('[STREAM_ERROR]', {
          type: 'public',
          error: cleanErrorMessage(error),
        });
        logger.warn('[DerivGateway] Public Options WebSocket error.', {
          error: cleanErrorMessage(error),
        });

        finishReject(error instanceof Error ? error : new Error(String(error)));
      });

      ws.once('close', () => {
        console.log('[STREAM_CLOSED]', { type: 'public' });
        if (this.publicWs === ws) {
          this.publicWs = null;
        }

        this.rejectPendingRequests(
          this.pendingPublicRequests,
          new Error('Public Options WebSocket disconnected.'),
        );

        if (!this.explicitShutdown) {
          this.schedulePublicReconnect();
        }

        if (this.accountWs?.readyState !== WS_OPEN) {
          this.setConnectionState('DISCONNECTED');
        }
      });
    });

    return this.publicConnectPromise;
  }

  /**
   * Connect the authenticated Options account channel.
   *
   * Authentication is performed by:
   *
   * OAuth Bearer token
   *      ↓
   * OTP REST endpoint
   *      ↓
   * ready-to-use authenticated WebSocket URL
   */
  private async connectAccount(): Promise<void> {
    if (!this.accessToken || !this.accountId) {
      throw new Error(
        'Authenticated Options connection requires both access token and account ID.',
      );
    }

    if (this.accountWs?.readyState === WS_OPEN) {
      return;
    }

    if (this.accountConnectPromise) {
      return this.accountConnectPromise;
    }

    this.accountConnectPromise = this.openAuthenticatedAccountSocket()
      .finally(() => {
        this.accountConnectPromise = null;
      });

    return this.accountConnectPromise;
  }

  /**
   * Obtain a fresh one-time WebSocket URL.
   */
  private async requestOtpUrl(): Promise<string> {
    if (!this.accessToken) {
      throw new Error('OAuth access token is not configured.');
    }

    if (!this.accountId) {
      throw new Error('Options account ID is not configured.');
    }

    const endpoint =
      `${OPTIONS_REST_BASE}/trading/v1/options/accounts/` +
      `${encodeURIComponent(this.accountId)}/otp`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Deriv-App-ID': this.getApplicationId(),
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const body = (await response.json().catch(() => null)) as
      | OptionsOtpResponse
      | RestErrorPayload
      | null;

    if (!response.ok) {
      throw new Error(
        this.extractRestError(
          body,
          `Options OTP request failed with HTTP ${response.status}.`,
        ),
      );
    }

    const url = body && 'data' in body ? body.data?.url : undefined;

    if (!url || !url.startsWith('wss://api.derivws.com/')) {
      throw new Error(
        'Deriv returned an invalid authenticated Options WebSocket URL.',
      );
    }

    return url;
  }

  /**
   * The current OAuth client identifier is the application identifier
   * required by the new Deriv API.
   */
  private getApplicationId(): string {
    const clientId =
      process.env.DERIV_OAUTH_CLIENT_ID?.trim();

    if (!clientId) {
      throw new Error(
        'DERIV_OAUTH_CLIENT_ID is not configured.',
      );
    }

    return clientId;
  }

  /**
   * Open the authenticated Options WebSocket using a fresh OTP URL.
   */
  private async openAuthenticatedAccountSocket(): Promise<void> {
    const wsUrl = await this.requestOtpUrl();

    console.log('[ACCOUNT_WS_CONNECTING]', { accountId: this.accountId });

    await new Promise<void>((resolve, reject) => {
      let settled = false;

      if (this.accountWs) {
        try {
          this.accountWs.removeAllListeners();
          this.accountWs.close();
        } catch {}
        this.accountWs = null;
      }

      const ws = new WebSocket(wsUrl);

      this.accountWs = ws;

      const finishResolve = () => {
        if (settled) return;

        settled = true;
        resolve();
      };

      const finishReject = (error: Error) => {
        if (settled) return;

        settled = true;
        reject(error);
      };

      ws.once('open', () => {
        this.accountReconnectAttempts = 0;

        console.log('[ACCOUNT_WS_OPEN]', { accountId: this.accountId });
        this.setConnectionState('CONNECTED');

        this.requestInitialAccountState().catch((error) => {
          logger.warn(
            '[DerivGateway] Initial account-state request failed.',
            {
              error: cleanErrorMessage(error),
            },
          );
        });

        finishResolve();
      });

      ws.on('message', (raw: WebSocket.RawData) => {
        this.handleAccountMessage(raw);
      });

      ws.on('error', (error) => {
        console.error('[ACCOUNT_WS_ERROR]', {
          accountId: this.accountId,
          error: cleanErrorMessage(error),
        });
        logger.warn(
          '[DerivGateway] Authenticated Options WebSocket error.',
          {
            error: cleanErrorMessage(error),
          },
        );

        finishReject(
          error instanceof Error
            ? error
            : new Error(String(error)),
        );
      });

      ws.once('close', () => {
        console.log('[ACCOUNT_WS_CLOSED]', { accountId: this.accountId });
        if (this.accountWs === ws) {
          this.accountWs = null;
        }

        this.rejectPendingRequests(
          this.pendingAccountRequests,
          new Error('Authenticated Options WebSocket disconnected.'),
        );

        if (!this.explicitShutdown && this.accessToken && this.accountId) {
          this.scheduleAccountReconnect();
        }

        if (this.publicWs?.readyState !== WS_OPEN) {
          this.setConnectionState('DISCONNECTED');
        }
      });
    });
  }

  /**
   * Request initial account data after authenticated connection.
   */
  private async requestInitialAccountState(): Promise<void> {
    if (!this.accountWs || this.accountWs.readyState !== WS_OPEN) {
      return;
    }

    try {
      const response = await this.sendAccountRequest({
        balance: 1,
        subscribe: 1,
      });

      this.processBalance(response);
    } catch (error) {
      logger.warn('[DerivGateway] Balance initialization failed.', {
        error: cleanErrorMessage(error),
      });
    }
  }

  /**
   * Send a request through the public Options WebSocket.
   */
  private sendPublicRequest(
    payload: Record<string, unknown>,
    timeoutMs = DEFAULT_REQUEST_TIMEOUT,
  ): Promise<any> {
    return this.sendRequestOnSocket(
      this.publicWs,
      this.pendingPublicRequests,
      payload,
      timeoutMs,
    );
  }

  /**
   * Send a request through the authenticated Options WebSocket.
   */
  private sendAccountRequest(
    payload: Record<string, unknown>,
    timeoutMs = DEFAULT_REQUEST_TIMEOUT,
  ): Promise<any> {
    return this.sendRequestOnSocket(
      this.accountWs,
      this.pendingAccountRequests,
      payload,
      timeoutMs,
    );
  }

  /**
   * Generic gateway request.
   *
   * Routing is deliberately restricted to the new Options WebSocket
   * channels rather than exposing legacy protocol behavior.
   */
  public async sendRequest(
    payload: Record<string, unknown>,
    timeoutMs = DEFAULT_REQUEST_TIMEOUT,
  ): Promise<any> {
    const requiresAccountChannel =
      Boolean(
        payload.balance ||
        payload.buy ||
        payload.sell ||
        payload.proposal_open_contract ||
        payload.portfolio ||
        payload.transaction,
      );

    if (requiresAccountChannel) {
      if (!this.accessToken || !this.accountId) {
        throw new Error(
          'Authenticated Options session is required for this request.',
        );
      }

      if (this.accountWs?.readyState !== WS_OPEN) {
        await this.connectAccount();
      }

      return this.sendAccountRequest(payload, timeoutMs);
    }

    if (this.publicWs?.readyState !== WS_OPEN) {
      await this.connectPublic();
    }

    return this.sendPublicRequest(payload, timeoutMs);
  }

  private sendRequestOnSocket(
    socket: WebSocket | null,
    pending: Map<number, PendingRequest>,
    payload: Record<string, unknown>,
    timeoutMs: number,
  ): Promise<any> {
    if (!socket || socket.readyState !== WS_OPEN) {
      return Promise.reject(
        new Error('Deriv Options WebSocket is not connected.'),
      );
    }

    const reqId = this.requestId++;

    const message = {
      ...payload,
      req_id: reqId,
    };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(reqId);

        reject(
          new Error(
            `Deriv Options request timed out after ${timeoutMs}ms.`,
          ),
        );
      }, timeoutMs);

      pending.set(reqId, {
        resolve,
        reject,
        timer,
      });

      try {
        socket.send(JSON.stringify(message));
      } catch (error) {
        clearTimeout(timer);
        pending.delete(reqId);

        reject(
          error instanceof Error
            ? error
            : new Error(String(error)),
        );
      }
    });
  }

  /**
   * Public market-data message handler.
   */
  private handlePublicMessage(raw: WebSocket.RawData): void {
    const data = this.parseMessage(raw);

    if (!data) return;

    this.resolvePendingRequest(
      this.pendingPublicRequests,
      data,
    );

    if (data.error) {
      return;
    }

    if (data.msg_type === 'tick' && data.tick) {
      this.processTick(data.tick, data.subscription?.id);
    }

    if (
      data.msg_type === 'active_symbols' &&
      Array.isArray(data.active_symbols)
    ) {
      this.updateAvailableSymbols(data.active_symbols);
    }
  }

  /**
   * Authenticated account message handler.
   */
  private handleAccountMessage(raw: WebSocket.RawData): void {
    const data = this.parseMessage(raw);

    if (!data) return;

    this.resolvePendingRequest(
      this.pendingAccountRequests,
      data,
    );

    if (data.error) {
      return;
    }

    if (data.msg_type === 'tick' && data.tick) {
      this.processTick(data.tick, data.subscription?.id);
    }

    if (data.msg_type === 'balance' && data.balance) {
      this.processBalance(data);
    }

    if (
      data.msg_type === 'authorize' &&
      data.authorize
    ) {
      this.processProfile(data.authorize);
    }
  }

  private parseMessage(
    raw: WebSocket.RawData,
  ): any | null {
    try {
      const text = raw.toString();

      return JSON.parse(text);
    } catch (error) {
      logger.warn('[DerivGateway] Invalid JSON received from Options WS.', {
        error: cleanErrorMessage(error),
      });

      return null;
    }
  }

  private resolvePendingRequest(
    pending: Map<number, PendingRequest>,
    data: any,
  ): void {
    const reqId = toNumber(data?.req_id);

    if (reqId === null) {
      return;
    }

    const request = pending.get(reqId);

    if (!request) {
      return;
    }

    clearTimeout(request.timer);
    pending.delete(reqId);

    if (data.error) {
      request.reject(
        new Error(
          data.error.message ||
          data.error.code ||
          'Deriv Options request failed.',
        ),
      );

      return;
    }

    request.resolve(data);
  }

  /**
   * Subscribe to a live Options tick stream.
   */
  public subscribeTick(
    symbol: string,
    callback: TickCallback,
  ): () => void {
    const cleanSymbol = symbol?.trim();

    if (!cleanSymbol) {
      throw new Error('Symbol is required.');
    }

    if (isSymbolBlacklisted(cleanSymbol)) {
      throw new Error(`Symbol is not permitted: ${cleanSymbol}`);
    }

    let subscription = this.tickSubscriptions.get(cleanSymbol);

    if (!subscription) {
      subscription = {
        callbacks: new Set(),
      };

      this.tickSubscriptions.set(
        cleanSymbol,
        subscription,
      );
    }

    subscription.callbacks.add(callback);

    this.ensureTickSubscription(cleanSymbol);

    return () => {
      const current =
        this.tickSubscriptions.get(cleanSymbol);

      if (!current) return;

      current.callbacks.delete(callback);

      if (current.callbacks.size === 0) {
        this.tickSubscriptions.delete(cleanSymbol);

        this.unsubscribeTick(cleanSymbol).catch(() => {
          // Safe cleanup.
        });
      }
    };
  }

  private ensureTickSubscription(symbol: string): void {
    const subscription = this.tickSubscriptions.get(symbol);

    if (
      !subscription ||
      subscription.subscriptionId ||
      subscription.isSubscribing
    ) {
      return;
    }

    if (!this.tickSubQueue.includes(symbol)) {
      this.tickSubQueue.push(symbol);
    }

    void this.processTickSubQueue();
  }

  private async processTickSubQueue(): Promise<void> {
    if (this.isProcessingTickSubQueue) {
      return;
    }

    this.isProcessingTickSubQueue = true;

    try {
      while (this.tickSubQueue.length > 0) {
        const symbol = this.tickSubQueue.shift();

        if (!symbol) continue;

        const subscription = this.tickSubscriptions.get(symbol);

        if (!subscription || subscription.subscriptionId) {
          continue;
        }

        subscription.isSubscribing = true;

        try {
          if (this.publicWs?.readyState !== WS_OPEN) {
            await this.connectPublic();
          }

          const response = await this.sendPublicRequest({
            ticks: symbol,
            subscribe: 1,
          });

          const subscriptionId =
            response?.subscription?.id;

          if (subscriptionId) {
            subscription.subscriptionId =
              String(subscriptionId);
          }
        } catch (error: any) {
          const errMsg = cleanErrorMessage(error);

          if (errMsg.toLowerCase().includes('rate limit')) {
            logger.warn(
              `[DerivGateway] Tick subscription rate-limited for ${symbol}. Retrying in 3s...`,
            );

            this.tickSubQueue.unshift(symbol);
            await new Promise((r) => setTimeout(r, 3000));
          } else if (errMsg.toLowerCase().includes('already subscribed')) {
            // Already subscribed is a benign state, treat as success
            subscription.subscriptionId = `subscribed-${symbol}`;
          } else {
            logger.warn(
              `[DerivGateway] Tick subscription failed for ${symbol}.`,
              {
                error: errMsg,
              },
            );
          }
        } finally {
          subscription.isSubscribing = false;
        }

        // Throttle by 300ms between requests to prevent hitting tick rate limits
        await new Promise((r) => setTimeout(r, 300));
      }
    } finally {
      this.isProcessingTickSubQueue = false;
    }
  }

  private async unsubscribeTick(
    symbol: string,
  ): Promise<void> {
    const subscription =
      this.tickSubscriptions.get(symbol);

    const subscriptionId =
      subscription?.subscriptionId;

    if (
      !subscriptionId ||
      !this.publicWs ||
      this.publicWs.readyState !== WS_OPEN
    ) {
      return;
    }

    try {
      await this.sendPublicRequest({
        forget: subscriptionId,
      });
    } catch {
      // Safe cleanup.
    }
  }

  private restoreTickSubscriptions(): void {
    for (const symbol of this.tickSubscriptions.keys()) {
      const subscription =
        this.tickSubscriptions.get(symbol);

      if (subscription) {
        subscription.subscriptionId = undefined;
      }

      void this.ensureTickSubscription(symbol);
    }
  }

  /**
   * Fetch active Options symbols with caching and in-flight deduplication.
   */
  public async fetchActiveSymbols(
    style: 'full' | 'brief' = 'full',
  ): Promise<DerivActiveSymbol[]> {
    const now = Date.now();

    // 1. Return cache if available and fresh (within 5 minutes)
    if (
      this.activeSymbolsCache.length > 0 &&
      now - this.lastActiveSymbolsFetchTime < 300_000
    ) {
      return this.activeSymbolsCache;
    }

    // 2. Return in-flight request promise if currently executing
    if (this.fetchActiveSymbolsPromise) {
      return this.fetchActiveSymbolsPromise;
    }

    // 3. Initiate new upstream request
    this.fetchActiveSymbolsPromise = (async () => {
      try {
        if (this.publicWs?.readyState !== WS_OPEN) {
          await this.connectPublic();
        }

        const response = await this.sendPublicRequest({
          active_symbols: style,
        });

        const symbols = Array.isArray(response?.active_symbols)
          ? response.active_symbols
          : [];

        if (symbols.length > 0) {
          this.activeSymbolsCache = symbols as DerivActiveSymbol[];
          this.lastActiveSymbolsFetchTime = Date.now();
          this.updateAvailableSymbols(symbols);
        }

        return this.activeSymbolsCache.length > 0
          ? this.activeSymbolsCache
          : (symbols as DerivActiveSymbol[]);
      } catch (error) {
        const errMsg = cleanErrorMessage(error);
        if (errMsg.toLowerCase().includes('rate limit')) {
          logger.warn(
            '[DerivGateway] Active symbols rate-limited. Using cached symbols.',
          );
        } else {
          logger.warn(
            '[DerivGateway] Active symbols request failed.',
            {
              error: errMsg,
            },
          );
        }

        return this.activeSymbolsCache;
      } finally {
        this.fetchActiveSymbolsPromise = null;
      }
    })();

    return this.fetchActiveSymbolsPromise;
  }

  /**
   * Fetch historical candles.
   *
   * This method intentionally uses the Options WebSocket request
   * supported by the current API rather than a legacy connection.
   */
  public async fetchCandles(
    symbol: string,
    granularitySeconds: number,
    count = 300,
  ): Promise<NormalizedCandle[]> {
    const cleanSymbol = symbol?.trim();

    if (
      !cleanSymbol ||
      isSymbolBlacklisted(cleanSymbol)
    ) {
      return [];
    }

    if (!Number.isFinite(granularitySeconds) ||
        granularitySeconds <= 0) {
      throw new Error('Invalid candle granularity.');
    }

    if (!Number.isFinite(count) || count <= 0) {
      throw new Error('Invalid candle count.');
    }

    if (this.publicWs?.readyState !== WS_OPEN) {
      await this.connectPublic();
    }

    try {
      const response =
        await this.sendPublicRequest({
          ticks_history: cleanSymbol,
          style: 'candles',
          granularity: Math.floor(granularitySeconds),
          count: Math.min(Math.floor(count), 5000),
          end: 'latest',
        });

      const candles =
        Array.isArray(response?.candles)
          ? response.candles
          : [];

      return candles
        .filter((c: any) =>
          Number.isFinite(Number(c?.open)) &&
          Number.isFinite(Number(c?.high)) &&
          Number.isFinite(Number(c?.low)) &&
          Number.isFinite(Number(c?.close)) &&
          Number.isFinite(Number(c?.epoch)),
        )
        .map((c: any): NormalizedCandle => ({
          timestamp: Number(c.epoch) * 1000,
          open: Number(c.open),
          high: Number(c.high),
          low: Number(c.low),
          close: Number(c.close),
        }));
    } catch (error) {
      logger.warn(
        `[DerivGateway] Candle request failed for ${cleanSymbol}.`,
        {
          error: cleanErrorMessage(error),
        },
      );

      return [];
    }
  }

  /**
   * Fetch available contract metadata for a symbol.
   */
  public async fetchContractsFor(
    symbol: string,
  ): Promise<DerivContractCategory[]> {
    const cleanSymbol = symbol?.trim();

    if (
      !cleanSymbol ||
      isSymbolBlacklisted(cleanSymbol)
    ) {
      return [];
    }

    if (this.publicWs?.readyState !== WS_OPEN) {
      await this.connectPublic();
    }

    try {
      const response =
        await this.sendPublicRequest({
          contracts_for: cleanSymbol,
        });

      const contracts =
        response?.contracts_for?.available;

      return Array.isArray(contracts)
        ? contracts as DerivContractCategory[]
        : [];
    } catch (error) {
      logger.warn(
        `[DerivGateway] Contract metadata request failed for ${cleanSymbol}.`,
        {
          error: cleanErrorMessage(error),
        },
      );

      return [];
    }
  }

  /**
   * Return last received tick.
   */
  public getLastTick(
    symbol: string,
  ): NormalizedTick | null {
    return this.tickHistory.get(symbol?.trim()) ?? null;
  }

  /**
   * Return available symbols.
   */
  public getAvailableSymbols(): Set<string> {
    return new Set(this.availableSymbols);
  }

  /**
   * Return current account profile.
   */
  public getProfile(): DerivAccountProfile | null {
    return this.profile
      ? { ...this.profile }
      : null;
  }

  /**
   * Return current account balance.
   */
  public getBalance(): {
    balance: number;
    currency: string;
    loginid: string;
  } | null {
    return this.balance
      ? { ...this.balance }
      : null;
  }

  /**
   * Return current account ID.
   */
  public getAccountId(): string | null {
    return this.accountId;
  }

  /**
   * Register balance listener.
   */
  public onBalanceChange(
    callback: BalanceCallback,
  ): () => void {
    this.balanceListeners.add(callback);

    if (this.balance) {
      callback({ ...this.balance });
    }

    return () => {
      this.balanceListeners.delete(callback);
    };
  }

  /**
   * Register profile listener.
   */
  public onProfileChange(
    callback: ProfileCallback,
  ): () => void {
    this.profileListeners.add(callback);

    if (this.profile) {
      callback({ ...this.profile });
    }

    return () => {
      this.profileListeners.delete(callback);
    };
  }

  /**
   * Register status listener.
   */
  public onStatusChange(
    callback: StatusCallback,
  ): () => void {
    this.statusListeners.add(callback);

    callback(this.connectionState);

    return () => {
      this.statusListeners.delete(callback);
    };
  }

  /**
   * Update account balance from an Options WS response.
   */
  private processBalance(data: any): void {
    const raw = data?.balance ?? data;

    const balanceValue =
      toNumber(raw?.balance);

    if (balanceValue === null) {
      return;
    }

    const currency =
      typeof raw?.currency === 'string'
        ? raw.currency
        : this.balance?.currency || 'USD';

    const loginid =
      typeof raw?.loginid === 'string'
        ? raw.loginid
        : this.accountId || '';

    this.balance = {
      balance: balanceValue,
      currency,
      loginid,
    };

    if (this.profile) {
      this.profile.balance = balanceValue;
      this.profile.currency = currency;
      this.profile.loginid =
        loginid || this.profile.loginid;
    }

    for (const listener of this.balanceListeners) {
      try {
        listener({ ...this.balance });
      } catch (error) {
        logger.warn(
          '[DerivGateway] Balance listener failed.',
          {
            error: cleanErrorMessage(error),
          },
        );
      }
    }
  }

  /**
   * Process account profile data if supplied by the API.
   */
  private processProfile(raw: any): void {
    if (!raw || typeof raw !== 'object') {
      return;
    }

    const loginid =
      typeof raw.loginid === 'string'
        ? raw.loginid
        : this.accountId;

    if (!loginid) {
      return;
    }

    this.profile = {
      ...raw,
      loginid,
      balance:
        toNumber(raw.balance) ??
        this.balance?.balance,
      currency:
        typeof raw.currency === 'string'
          ? raw.currency
          : this.balance?.currency,
    };

    for (const listener of this.profileListeners) {
      try {
        listener({ ...this.profile });
      } catch (error) {
        logger.warn(
          '[DerivGateway] Profile listener failed.',
          {
            error: cleanErrorMessage(error),
          },
        );
      }
    }
  }

  /**
   * Normalize incoming ticks.
   */
  private processTick(
    tickData: any,
    subscriptionId?: string,
  ): void {
    const symbol =
      typeof tickData?.symbol === 'string'
        ? tickData.symbol.trim()
        : '';

    const quote =
      toNumber(tickData?.quote);

    if (!symbol || quote === null) {
      return;
    }

    const previous =
      this.tickHistory.get(symbol);

    const previousQuote =
      previous?.quote ?? quote;

    const change =
      quote - previousQuote;

    const changePct =
      previousQuote !== 0
        ? (change / previousQuote) * 100
        : 0;

    const epoch =
      toNumber(tickData?.epoch) ??
      Math.floor(Date.now() / 1000);

    const normalized: NormalizedTick = {
      symbol,
      quote,
      bid:
        toNumber(tickData?.bid) ??
        quote,
      ask:
        toNumber(tickData?.ask) ??
        quote,
      epoch,
      change,
      changePct,
      prevQuote: previousQuote,
      lastUpdated: new Date(epoch * 1000),
    };

    this.tickHistory.set(
      symbol,
      normalized,
    );

    const subscription =
      this.tickSubscriptions.get(symbol);

    if (subscriptionId && subscription) {
      subscription.subscriptionId =
        subscriptionId;
    }

    if (!subscription) {
      return;
    }

    for (const callback of subscription.callbacks) {
      try {
        callback(normalized);
      } catch (error) {
        logger.warn(
          `[DerivGateway] Tick callback failed for ${symbol}.`,
          {
            error: cleanErrorMessage(error),
          },
        );
      }
    }
  }

  /**
   * Update authoritative symbol set.
   */
  private updateAvailableSymbols(
    symbols: unknown[],
  ): void {
    const normalized =
      normalizeDerivActiveSymbols(
        symbols as DerivActiveSymbol[],
      );

    this.availableSymbols.clear();

    for (const item of normalized) {
      const symbol =
        typeof item?.symbol === 'string'
          ? item.symbol.trim()
          : '';

      if (
        symbol &&
        !isSymbolBlacklisted(symbol)
      ) {
        this.availableSymbols.add(symbol);
      }
    }
  }

  /**
   * Get account data through REST.
   *
   * This method is intentionally useful for server-side session
   * synchronization without exposing credentials to clients.
   */
  public async fetchAccounts(): Promise<OptionsAccount[]> {
    if (!this.accessToken) {
      throw new Error('OAuth access token is not configured.');
    }

    const response = await fetch(
      `${OPTIONS_REST_BASE}/trading/v1/options/accounts`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Deriv-App-ID': this.getApplicationId(),
          Accept: 'application/json',
        },
        cache: 'no-store',
      },
    );

    const body =
      (await response.json().catch(() => null)) as
        | OptionsAccountsResponse
        | RestErrorPayload
        | null;

    if (!response.ok) {
      throw new Error(
        this.extractRestError(
          body,
          `Options account lookup failed with HTTP ${response.status}.`,
        ),
      );
    }

    const data =
      body && 'data' in body
        ? body.data
        : undefined;

    if (Array.isArray(data)) {
      return data;
    }

    if (data && typeof data === 'object') {
      return [data];
    }

    return [];
  }

  /**
   * Find a specific Options account.
   */
  public async findAccount(
    accountId: string,
  ): Promise<OptionsAccount | null> {
    const cleanAccountId =
      accountId?.trim();

    if (
      !cleanAccountId ||
      !isValidAccountId(cleanAccountId)
    ) {
      return null;
    }

    const accounts =
      await this.fetchAccounts();

    return (
      accounts.find(
        (account) =>
          account.account_id === cleanAccountId,
      ) ?? null
    );
  }

  /**
   * Extract useful REST error information without
   * exposing credentials or raw sensitive payloads.
   */
  private extractRestError(
    body: unknown,
    fallback: string,
  ): string {
    if (!body || typeof body !== 'object') {
      return fallback;
    }

    const candidate =
      body as RestErrorPayload;

    const firstError =
      Array.isArray(candidate.errors)
        ? candidate.errors[0]
        : undefined;

    return (
      firstError?.message ||
      firstError?.code ||
      candidate.message ||
      fallback
    );
  }

  /**
   * Schedule public market-data reconnect.
   */
  private schedulePublicReconnect(): void {
    if (
      this.explicitShutdown ||
      this.publicReconnectTimer
    ) {
      return;
    }

    this.publicReconnectAttempts += 1;

    const delay =
      Math.min(
        DEFAULT_RECONNECT_DELAY *
          2 ** Math.min(
            this.publicReconnectAttempts - 1,
            5,
          ),
        MAX_RECONNECT_DELAY,
      );

    this.setConnectionState('RECONNECTING');

    this.publicReconnectTimer =
      setTimeout(() => {
        this.publicReconnectTimer = null;

        this.connectPublic().catch(() => {
          // close handler schedules the next attempt.
        });
      }, delay);
  }

  /**
   * Schedule authenticated account reconnect.
   *
   * A fresh OTP is requested on every reconnect.
   */
  private scheduleAccountReconnect(): void {
    if (
      this.explicitShutdown ||
      this.accountReconnectTimer ||
      !this.accessToken ||
      !this.accountId
    ) {
      return;
    }

    this.accountReconnectAttempts += 1;

    const delay =
      Math.min(
        DEFAULT_RECONNECT_DELAY *
          2 ** Math.min(
            this.accountReconnectAttempts - 1,
            5,
          ),
        MAX_RECONNECT_DELAY,
      );

    this.setConnectionState('RECONNECTING');

    this.accountReconnectTimer =
      setTimeout(() => {
        this.accountReconnectTimer = null;

        this.connectAccount().catch((error) => {
          logger.warn(
            '[DerivGateway] Authenticated Options reconnect failed.',
            {
              error: cleanErrorMessage(error),
            },
          );

          this.scheduleAccountReconnect();
        });
      }, delay);
  }

  /**
   * Reject all outstanding requests for a disconnected socket.
   */
  private rejectPendingRequests(
    pending: Map<number, PendingRequest>,
    error: Error,
  ): void {
    for (const [reqId, request] of pending) {
      clearTimeout(request.timer);
      request.reject(error);
      pending.delete(reqId);
    }
  }

  /**
   * Start server-side WebSocket heartbeat.
   */
  private startHeartbeat(): void {
    if (this.pingTimer) {
      return;
    }

    this.pingTimer =
      setInterval(() => {
        const sockets = [
          this.publicWs,
          this.accountWs,
        ];

        for (const socket of sockets) {
          if (socket?.readyState === WS_OPEN) {
            try {
              socket['__appexPingAt'] =
                Date.now();

              socket.ping();
            } catch {
              // Socket cleanup is handled by close/error.
            }
          }
        }
      }, 15_000);
  }

  /**
   * Stop heartbeat timer.
   */
  private stopHeartbeat(): void {
    if (!this.pingTimer) {
      return;
    }

    clearInterval(this.pingTimer);
    this.pingTimer = null;
  }

  private setConnectionState(
    state: DerivConnectionState,
  ): void {
    if (this.connectionState === state) {
      return;
    }

    this.connectionState = state;

    for (const listener of this.statusListeners) {
      try {
        listener(state);
      } catch (error) {
        logger.warn(
          '[DerivGateway] Status listener failed.',
          {
            error: cleanErrorMessage(error),
          },
        );
      }
    }
  }

  /**
   * Gateway status for HTTP/SSE diagnostics.
   */
  public getStatus(): DerivGatewayStatus {
    const uptimeSeconds =
      this.connectedAt
        ? Math.max(
            0,
            Math.floor(
              (Date.now() - this.connectedAt) / 1000,
            ),
          )
        : 0;

    return {
      state: this.connectionState,
      isAuthorized:
        Boolean(
          this.accessToken &&
          this.accountId &&
          this.accountWs?.readyState === WS_OPEN,
        ),
      activeSymbolsCount:
        this.availableSymbols.size,
      subscribedSymbolsCount:
        this.tickSubscriptions.size,
      connectedClientsCount:
        this.clients.size,
      latencyMs:
        this.lastLatencyMs,
      uptimeSeconds,
    };
  }

  /**
   * Attach the gateway WebSocket server to an existing HTTP server.
   *
   * The browser connects to AppeX; AppeX remains responsible for
   * brokering public market data and server-owned account state.
   */
  /**
   * Internal helper to retrieve or create the single WebSocketServer instance
   * with guaranteed single connection listener and idempotent client cleanup.
   */
  private getOrCreateWebSocketServer(): WebSocketServerType {
    if (this.webSocketServer) {
      return this.webSocketServer;
    }

    const wss = new WebSocketServer({
      noServer: true,
    });
    this.webSocketServer = wss;

    wss.on('connection', (client: WebSocket, request?: IncomingMessage) => {
      this.clients.add(client);
      this.clientSubscriptions.set(client, new Set());

      // Safe multi-user session context resolution from session_token cookie
      if (request?.headers?.cookie) {
        try {
          const cookies = parseCookies(request.headers.cookie);
          const sessionToken = cookies['session_token'];
          if (sessionToken) {
            const session = verifySessionToken(sessionToken);
            if (session?.userId) {
              this.clientSessions.set(client, {
                userId: session.userId,
                loginid: session.derivAccountId,
              });
            }
          }
        } catch {
          // Ignore session parsing error
        }
      }

      console.log('[STREAM_OPEN]', {
        clientCount: this.clients.size,
        authenticated: this.clientSessions.has(client),
      });

      if (client.readyState === WS_OPEN) {
        try {
          client.send(
            JSON.stringify({
              type: 'status',
              data: this.getStatus(),
            }),
          );
        } catch {}
      }

      const cleanupClient = () => {
        if (!this.clients.has(client)) {
          return;
        }

        console.log('[STREAM_CLOSED]', { remaining: this.clients.size - 1 });
        this.clients.delete(client);
        this.clientSessions.delete(client);

        const subscriptions = this.clientSubscriptions.get(client);
        if (subscriptions) {
          for (const unsub of subscriptions) {
            try {
              unsub();
            } catch {}
          }
          subscriptions.clear();
        }
        this.clientSubscriptions.delete(client);

        try {
          client.removeAllListeners();
        } catch {}

        console.log('[STREAM_CLEANUP]', { totalActiveClients: this.clients.size });
      };

      client.on('message', (raw) => {
        this.handleClientMessage(client, raw);
      });

      client.once('close', cleanupClient);
      client.once('error', (err) => {
        console.error('[STREAM_ERROR]', { error: cleanErrorMessage(err) });
        cleanupClient();
      });
    });

    return wss;
  }

  /**
   * Attach the gateway WebSocket server to an existing HTTP server.
   */
  public attachWebSocketServer(
    server: HttpServer,
    path = '/api/deriv/stream',
  ): WebSocketServerType {
    const wss = this.getOrCreateWebSocketServer();

    server.on(
      'upgrade',
      (request: IncomingMessage, socket, head) => {
        const requestUrl =
          request.url
            ? new URL(
                request.url,
                'http://localhost',
              )
            : null;

        if (
          !requestUrl ||
          requestUrl.pathname !== path
        ) {
          return;
        }

        console.log('[STREAM_CONNECTING]', { path: requestUrl.pathname });

        wss.handleUpgrade(
          request,
          socket,
          head,
          (client) => {
            wss.emit(
              'connection',
              client,
              request,
            );
          },
        );
      },
    );

    return wss;
  }

  /**
   * Directly handle HTTP 101 WebSocket Upgrade request from Vercel/Node stream handler.
   */
  public handleUpgrade(
    request: IncomingMessage,
    socket: any,
    head: Buffer,
  ): void {
    const wss = this.getOrCreateWebSocketServer();

    console.log('[STREAM_CONNECTING]', { url: '/api/deriv/stream' });

    wss.handleUpgrade(
      request,
      socket,
      head,
      (client) => {
        wss.emit('connection', client, request);
      },
    );
  }

  /**
   * Handle browser gateway commands.
   *
   * Browser clients never receive OAuth tokens.
   */
  private handleClientMessage(
    client: WebSocket,
    raw: WebSocket.RawData,
  ): void {
    let message: GatewayClientMessage;

    try {
      message =
        JSON.parse(
          raw.toString(),
        ) as GatewayClientMessage;
    } catch {
      client.send(
        JSON.stringify({
          type: 'error',
          code: 'INVALID_JSON',
          message: 'Invalid JSON message.',
        }),
      );

      return;
    }

    const action =
      typeof message.action === 'string'
        ? message.action
        : typeof message.type === 'string'
          ? message.type
          : '';

    if (
      action === 'subscribe' ||
      action === 'subscribe_tick'
    ) {
      const symbol =
        typeof message.symbol === 'string'
          ? message.symbol.trim()
          : '';

      if (!symbol) {
        client.send(
          JSON.stringify({
            type: 'error',
            code: 'SYMBOL_REQUIRED',
            message: 'Symbol is required.',
          }),
        );

        return;
      }

      const unsubscribe =
        this.subscribeTick(
          symbol,
          (tick) => {
            if (
              client.readyState === WS_OPEN
            ) {
              try {
                client.send(
                  JSON.stringify({
                    type: 'tick',
                    data: tick,
                  }),
                );
              } catch {}
            }
          },
        );

      // Register unsubscribe callback into client's subscription set (NO client.once('close') call!)
      this.clientSubscriptions.get(client)?.add(unsubscribe);

      return;
    }

    if (action === 'status') {
      client.send(
        JSON.stringify({
          type: 'status',
          data: this.getStatus(),
        }),
      );

      return;
    }

    if (action === 'active_symbols') {
      void this.fetchActiveSymbols()
        .then((symbols) => {
          if (
            client.readyState === WS_OPEN
          ) {
            client.send(
              JSON.stringify({
                type: 'active_symbols',
                data: symbols,
              }),
            );
          }
        })
        .catch((error) => {
          if (
            client.readyState === WS_OPEN
          ) {
            client.send(
              JSON.stringify({
                type: 'error',
                code: 'ACTIVE_SYMBOLS_FAILED',
                message: cleanErrorMessage(error),
              }),
            );
          }
        });

      return;
    }

    client.send(
      JSON.stringify({
        type: 'error',
        code: 'UNSUPPORTED_ACTION',
        message: 'Unsupported gateway action.',
      }),
    );
  }

  /**
   * Gracefully shut down all connections.
   */
  public shutdown(): void {
    this.explicitShutdown = true;

    if (this.publicReconnectTimer) {
      clearTimeout(
        this.publicReconnectTimer,
      );

      this.publicReconnectTimer = null;
    }

    if (this.accountReconnectTimer) {
      clearTimeout(
        this.accountReconnectTimer,
      );

      this.accountReconnectTimer = null;
    }

    this.stopHeartbeat();

    this.rejectPendingRequests(
      this.pendingPublicRequests,
      new Error('Gateway shutting down.'),
    );

    this.rejectPendingRequests(
      this.pendingAccountRequests,
      new Error('Gateway shutting down.'),
    );

    this.closePublicSocket();
    this.closeAccountSocket();

    for (const client of this.clients) {
      try {
        client.close();
      } catch {
        // Safe cleanup.
      }
    }

    this.clients.clear();

    if (this.webSocketServer) {
      try {
        this.webSocketServer.close();
      } catch {
        // Safe cleanup.
      }

      this.webSocketServer = null;
    }

    this.accessToken = null;
    this.accountId = null;
    this.balance = null;
    this.profile = null;

    this.setConnectionState('DISCONNECTED');
  }

  private closePublicSocket(): void {
    const socket = this.publicWs;

    this.publicWs = null;

    if (!socket) {
      return;
    }

    try {
      socket.removeAllListeners();
      socket.close();
    } catch {
      // Safe cleanup.
    }
  }

  private closeAccountSocket(): void {
    const socket = this.accountWs;

    this.accountWs = null;

    if (!socket) {
      return;
    }

    try {
      socket.removeAllListeners();
      socket.close();
    } catch {
      // Safe cleanup.
    }
  }
}

export const derivGateway =
  DerivGateway.getInstance();