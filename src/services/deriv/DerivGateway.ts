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
  isMarketClosed?: boolean;
  reopenTime?: number;
  rateLimitBackoffUntil?: number;
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

  private userAccessTokens = new Map<string, string>();
  private userAccountIds = new Map<string, string>();
  private userAccountSockets = new Map<string, WebSocket>();
  private userBalances = new Map<string, any>();
  private userProfiles = new Map<string, any>();

  private connectionState: DerivConnectionState = 'DISCONNECTED';

  private publicWs: WebSocket | null = null;
  private publicConnectPromise: Promise<void> | null = null;
  private userAccountConnectPromises = new Map<string, Promise<void>>();

  private publicReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private userAccountReconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();

  private publicReconnectAttempts = 0;
  private userAccountReconnectAttempts = new Map<string, number>();

  private explicitShutdown = false;

  private requestId = 1;

  private pendingPublicRequests = new Map<number, PendingRequest>();
  private userPendingAccountRequests = new Map<string, Map<number, PendingRequest>>();

  private tickSubscriptions = new Map<string, TickSubscription>();
  private tickHistory = new Map<string, NormalizedTick>();

  private availableSymbols = new Set<string>();
  private activeSymbolsCache: DerivActiveSymbol[] = [];
  private lastActiveSymbolsFetchTime = 0;
  private fetchActiveSymbolsPromise: Promise<DerivActiveSymbol[]> | null = null;
  private tickSubQueue: string[] = [];
  private isProcessingTickSubQueue = false;

  private statusListeners = new Set<StatusCallback>();
  private userBalanceListeners = new Map<string, Set<BalanceCallback>>();
  private userProfileListeners = new Map<string, Set<ProfileCallback>>();

  private clients = new Set<WebSocket>();
  private clientSubscriptions = new Map<WebSocket, Set<() => void>>();
  private clientSessions = new Map<WebSocket, { userId?: string; loginid?: string }>();

  private webSocketServer: WebSocketServer | null = null;
  private attachedServers = new WeakSet<HttpServer>();

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
   * Configure the authenticated OAuth session for a specific user.
   *
   * Ownership of the OAuth token remains server-side.
   */
  public setUserAuthToken(userId: string, token: string, accountId?: string): void {
    const normalizedUserId = userId?.trim();
    const normalizedToken = token?.trim();

    if (!normalizedUserId || !normalizedToken) {
      throw new Error('A valid User ID and OAuth access token are required.');
    }

    this.userAccessTokens.set(normalizedUserId, normalizedToken);

    if (accountId) {
      this.setUserAccountId(normalizedUserId, accountId);
    }
  }

  /**
   * Set the Options account associated with the current OAuth session for a user.
   */
  public setUserAccountId(userId: string, accountId: string): void {
    const normalizedUserId = userId?.trim();
    const normalizedAccountId = accountId?.trim();

    if (!normalizedUserId || !normalizedAccountId || !isValidAccountId(normalizedAccountId)) {
      throw new Error('Invalid User ID or Options account ID.');
    }

    if (this.userAccountIds.get(normalizedUserId) !== normalizedAccountId) {
      this.closeUserAccountSocket(normalizedUserId);

      this.userAccountIds.set(normalizedUserId, normalizedAccountId);
      this.userBalances.delete(normalizedUserId);
      this.userProfiles.delete(normalizedUserId);
    }
  }

  /**
   * Backward compatibility for setAuthToken.
   * DEPRECATED: Use setUserAuthToken instead.
   */
  public setAuthToken(token: string, accountId?: string): void {
    this.setUserAuthToken('SYSTEM', token, accountId);
  }

  /**
   * Backward compatibility for setAccountId.
   * DEPRECATED: Use setUserAccountId instead.
   */
  public setAccountId(accountId: string): void {
    this.setUserAccountId('SYSTEM', accountId);
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

    // Reconnect existing user sessions if any
    for (const userId of this.userAccessTokens.keys()) {
      const accountId = this.userAccountIds.get(userId);
      if (accountId) {
        await this.connectUserAccount(userId).catch((error) => {
          logger.warn(`[DerivGateway] Authenticated Options connection unavailable for user ${userId}.`, {
            error: cleanErrorMessage(error),
          });
        });
      }
    }
  }

  /**
   * Connect a specific user's authenticated account channel.
   */
  public async connectUser(userId: string): Promise<void> {
    this.explicitShutdown = false;
    await this.connectPublic();
    await this.connectUserAccount(userId);
  }

  /**
   * Connect to the public Options WebSocket stream (no auth required).
   */
  private async connectPublic(): Promise<void> {
    if (this.publicWs && this.publicWs.readyState === WS_OPEN) {
      return;
    }

    if (this.publicConnectPromise) {
      return this.publicConnectPromise;
    }

    this.publicConnectPromise = this.openPublicSocket().finally(() => {
      this.publicConnectPromise = null;
    });

    return this.publicConnectPromise;
  }

  /**
   * Open the public Options WebSocket connection.
   */
  private async openPublicSocket(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let settled = false;
      this.closePublicSocket();

      const ws = new WebSocket(OPTIONS_PUBLIC_WS);
      this.publicWs = ws;

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
        this.publicReconnectAttempts = 0;
        this.connectedAt = Date.now();
        this.setConnectionState('CONNECTED');
        this.startHeartbeat();

        this.fetchActiveSymbols().catch((err) => {
          logger.warn('[DerivGateway] Failed to fetch active symbols on connect:', { error: cleanErrorMessage(err) });
        });
        this.restoreTickSubscriptions();

        finishResolve();
      });

      ws.on('message', (raw: WebSocket.RawData) => {
        this.handlePublicMessage(raw);
      });

      ws.on('error', (error) => {
        logger.warn('[DerivGateway] Public Options WebSocket error:', { error: cleanErrorMessage(error) });
        finishReject(error instanceof Error ? error : new Error(String(error)));
      });

      ws.once('close', () => {
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

        if (this.userAccountSockets.size === 0) {
          this.setConnectionState('DISCONNECTED');
        }
      });
    });
  }

  /**
   * Connect the authenticated Options account channel for a user.
   */
  private async connectUserAccount(userId: string): Promise<void> {
    const accessToken = this.userAccessTokens.get(userId);
    const accountId = this.userAccountIds.get(userId);

    if (!accessToken || !accountId) {
      throw new Error(
        `Authenticated Options connection for user ${userId} requires both access token and account ID.`,
      );
    }

    const socket = this.userAccountSockets.get(userId);
    if (socket?.readyState === WS_OPEN) {
      return;
    }

    if (this.userAccountConnectPromises.has(userId)) {
      return this.userAccountConnectPromises.get(userId);
    }

    const promise = this.openAuthenticatedAccountSocket(userId)
      .finally(() => {
        this.userAccountConnectPromises.delete(userId);
      });

    this.userAccountConnectPromises.set(userId, promise);
    return promise;
  }

  /**
   * DEPRECATED: Use connectUserAccount instead.
   */
  private async connectAccount(): Promise<void> {
    return this.connectUserAccount('SYSTEM');
  }

  /**
   * Obtain a fresh one-time WebSocket URL for a user.
   */
  private async requestOtpUrl(userId: string): Promise<string> {
    const accessToken = this.userAccessTokens.get(userId);
    const accountId = this.userAccountIds.get(userId);

    if (!accessToken) {
      throw new Error(`OAuth access token is not configured for user ${userId}.`);
    }

    if (!accountId) {
      throw new Error(`Options account ID is not configured for user ${userId}.`);
    }

    const endpoint =
      `${OPTIONS_REST_BASE}/trading/v1/options/accounts/` +
      `${encodeURIComponent(accountId)}/otp`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
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
          `Options OTP request for user ${userId} failed with HTTP ${response.status}.`,
        ),
      );
    }

    const url = body && 'data' in body ? body.data?.url : undefined;

    if (!url || !url.startsWith('wss://api.derivws.com/')) {
      throw new Error(
        `Deriv returned an invalid authenticated Options WebSocket URL for user ${userId}.`,
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
      process.env.DERIV_CLIENT_ID?.trim();

    if (!clientId) {
      throw new Error(
        'DERIV_CLIENT_ID is not configured.',
      );
    }

    return clientId;
  }

  /**
   * Open the authenticated Options WebSocket using a fresh OTP URL for a user.
   */
  private async openAuthenticatedAccountSocket(userId: string): Promise<void> {
    const accountId = this.userAccountIds.get(userId);
    const wsUrl = await this.requestOtpUrl(userId);

    console.log('[ACCOUNT_WS_CONNECTING]', { userId, accountId });

    await new Promise<void>((resolve, reject) => {
      let settled = false;

      this.closeUserAccountSocket(userId);

      const ws = new WebSocket(wsUrl);
      this.userAccountSockets.set(userId, ws);

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
        this.userAccountReconnectAttempts.set(userId, 0);

        console.log('[ACCOUNT_WS_OPEN]', { userId, accountId });
        this.setConnectionState('CONNECTED');

        this.requestInitialAccountState(userId).catch((error) => {
          logger.warn(
            `[DerivGateway] Initial account-state request failed for user ${userId}.`,
            {
              error: cleanErrorMessage(error),
            },
          );
        });

        finishResolve();
      });

      ws.on('message', (raw: WebSocket.RawData) => {
        this.handleUserAccountMessage(userId, raw);
      });

      ws.on('error', (error) => {
        console.error('[ACCOUNT_WS_ERROR]', {
          userId,
          accountId,
          error: cleanErrorMessage(error),
        });
        logger.warn(
          `[DerivGateway] Authenticated Options WebSocket error for user ${userId}.`,
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
        console.log('[ACCOUNT_WS_CLOSED]', { userId, accountId });
        if (this.userAccountSockets.get(userId) === ws) {
          this.userAccountSockets.delete(userId);
        }

        const pending = this.userPendingAccountRequests.get(userId);
        if (pending) {
          this.rejectPendingRequests(
            pending,
            new Error(`Authenticated Options WebSocket for user ${userId} disconnected.`),
          );
        }

        if (!this.explicitShutdown && this.userAccessTokens.has(userId) && this.userAccountIds.has(userId)) {
          this.scheduleUserAccountReconnect(userId);
        }

        if (this.publicWs?.readyState !== WS_OPEN && this.userAccountSockets.size === 0) {
          this.setConnectionState('DISCONNECTED');
        }
      });
    });
  }

  /**
   * Request initial account data after authenticated connection for a user.
   */
  private async requestInitialAccountState(userId: string): Promise<void> {
    const ws = this.userAccountSockets.get(userId);
    if (!ws || ws.readyState !== WS_OPEN) {
      return;
    }

    try {
      const response = await this.sendUserAccountRequest(userId, {
        balance: 1,
        subscribe: 1,
      });

      this.processUserBalance(userId, response);
    } catch (error) {
      logger.warn(`[DerivGateway] Balance initialization failed for user ${userId}.`, {
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
   * Send a request through the authenticated Options WebSocket for a user.
   */
  private sendUserAccountRequest(
    userId: string,
    payload: Record<string, unknown>,
    timeoutMs = DEFAULT_REQUEST_TIMEOUT,
  ): Promise<any> {
    const ws = this.userAccountSockets.get(userId);
    let pending = this.userPendingAccountRequests.get(userId);
    if (!pending) {
      pending = new Map<number, PendingRequest>();
      this.userPendingAccountRequests.set(userId, pending);
    }

    return this.sendRequestOnSocket(
      ws,
      pending,
      payload,
      timeoutMs,
    );
  }

  /**
   * DEPRECATED: Use sendUserAccountRequest instead.
   */
  private sendAccountRequest(
    payload: Record<string, unknown>,
    timeoutMs = DEFAULT_REQUEST_TIMEOUT,
  ): Promise<any> {
    return this.sendUserAccountRequest('SYSTEM', payload, timeoutMs);
  }

  /**
   * Generic gateway request.
   */
  public async sendRequest(
    payload: Record<string, unknown>,
    timeoutMs = DEFAULT_REQUEST_TIMEOUT,
    userId = 'SYSTEM'
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
      const accessToken = this.userAccessTokens.get(userId);
      const accountId = this.userAccountIds.get(userId);

      if (!accessToken || !accountId) {
        throw new Error(
          `Authenticated Options session is required for this request (user ${userId}).`,
        );
      }

      const ws = this.userAccountSockets.get(userId);
      if (ws?.readyState !== WS_OPEN) {
        await this.connectUserAccount(userId);
      }

      return this.sendUserAccountRequest(userId, payload, timeoutMs);
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
   * Authenticated account message handler for a specific user.
   */
  private handleUserAccountMessage(userId: string, raw: WebSocket.RawData): void {
    const data = this.parseMessage(raw);

    if (!data) return;

    const pending = this.userPendingAccountRequests.get(userId);
    if (pending) {
      this.resolvePendingRequest(pending, data);
    }

    if (data.error) {
      return;
    }

    if (data.msg_type === 'tick' && data.tick) {
      this.processTick(data.tick, data.subscription?.id);
    }

    if (data.msg_type === 'balance' && data.balance) {
      this.processUserBalance(userId, data);
    }

    if (
      data.msg_type === 'authorize' &&
      data.authorize
    ) {
      this.processUserProfile(userId, data.authorize);
    }
  }

  /**
   * DEPRECATED: Use handleUserAccountMessage instead.
   */
  private handleAccountMessage(raw: WebSocket.RawData): void {
    this.handleUserAccountMessage('SYSTEM', raw);
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

    if (this.tickHistory.has(cleanSymbol)) {
      const cached = this.tickHistory.get(cleanSymbol);
      if (cached) {
        try {
          callback(cached);
        } catch {}
      }
    }

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
      subscription.isSubscribing ||
      subscription.isMarketClosed ||
      (subscription.rateLimitBackoffUntil && Date.now() < subscription.rateLimitBackoffUntil)
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

        if (!subscription || subscription.subscriptionId || subscription.isMarketClosed) {
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

          const isMarketClosed =
            errMsg.toLowerCase().includes('market is presently closed') ||
            errMsg.toLowerCase().includes('market closed') ||
            (error as any)?.code === 'MarketIsClosed' ||
            (error as any)?.subcode === 'MarketIsClosed';

          if (isMarketClosed) {
            subscription.subscriptionId = `market-closed-${symbol}`;
            subscription.isMarketClosed = true;

            logger.info(
              `[DerivGateway] Market is currently closed for ${symbol}: ${errMsg}`,
            );

            // Fetch the last known price using ticks_history so clients have the valid closing quote
            try {
              const historyRes = await this.sendPublicRequest({
                ticks_history: symbol,
                style: 'ticks',
                count: 1,
                end: 'latest',
              });

              const prices = historyRes?.history?.prices;
              const times = historyRes?.history?.times;

              if (Array.isArray(prices) && prices.length > 0) {
                const quote = Number(prices[prices.length - 1]);
                const epoch = Number(times?.[times.length - 1]) || Math.floor(Date.now() / 1000);
                const closingTick: NormalizedTick = {
                  symbol,
                  quote,
                  bid: quote,
                  ask: quote,
                  epoch,
                  change: 0,
                  changePct: 0,
                  prevQuote: quote,
                  lastUpdated: new Date(epoch * 1000),
                };

                this.tickHistory.set(symbol, closingTick);

                for (const cb of subscription.callbacks) {
                  try {
                    cb(closingTick);
                  } catch {}
                }
              }
            } catch {
              // Best effort closing tick retrieval
            }

            // Parse scheduled market reopening time if provided
            const reopenMatch = errMsg.match(/open at ([0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2})/i);
            if (reopenMatch) {
              try {
                const openTime = new Date(reopenMatch[1].replace(' ', 'T') + 'Z').getTime();
                const delayMs = openTime - Date.now();
                if (delayMs > 0 && delayMs < 7 * 86400 * 1000) {
                  subscription.reopenTime = openTime;
                  setTimeout(() => {
                    const currentSub = this.tickSubscriptions.get(symbol);
                    if (currentSub && currentSub.callbacks.size > 0) {
                      currentSub.subscriptionId = undefined;
                      currentSub.isMarketClosed = false;
                      this.ensureTickSubscription(symbol);
                    }
                  }, delayMs + 2000);
                }
              } catch {}
            }
          } else if (errMsg.toLowerCase().includes('rate limit') || (error as any)?.status === 429) {
            logger.warn(
              `[DerivGateway] Tick subscription rate-limited for ${symbol}. Setting 60s backoff...`,
            );
            subscription.rateLimitBackoffUntil = Date.now() + 60000;
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
      subscriptionId.startsWith('market-closed-') ||
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
    for (const [symbol, subscription] of this.tickSubscriptions.entries()) {
      if (subscription) {
        if (subscription.isMarketClosed) {
          continue;
        }
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
   * Return current account profile for a user.
   */
  public getProfile(userId = 'SYSTEM'): DerivAccountProfile | null {
    const profile = this.userProfiles.get(userId);
    return profile ? { ...profile } : null;
  }

  /**
   * Return current account balance for a user.
   */
  public getBalance(userId = 'SYSTEM'): {
    balance: number;
    currency: string;
    loginid: string;
  } | null {
    const balance = this.userBalances.get(userId);
    return balance ? { ...balance } : null;
  }

  /**
   * Return current account ID for a user.
   */
  public getAccountId(userId = 'SYSTEM'): string | null {
    return this.userAccountIds.get(userId) || null;
  }

  /**
   * Register balance listener for a specific user.
   */
  public onBalanceChange(
    callback: BalanceCallback,
    userId = 'SYSTEM'
  ): () => void {
    let listeners = this.userBalanceListeners.get(userId);
    if (!listeners) {
      listeners = new Set<BalanceCallback>();
      this.userBalanceListeners.set(userId, listeners);
    }
    listeners.add(callback);

    const balance = this.userBalances.get(userId);
    if (balance) {
      callback({ ...balance });
    }

    return () => {
      listeners?.delete(callback);
    };
  }

  /**
   * Register profile listener for a specific user.
   */
  public onProfileChange(
    callback: ProfileCallback,
    userId = 'SYSTEM'
  ): () => void {
    let listeners = this.userProfileListeners.get(userId);
    if (!listeners) {
      listeners = new Set<ProfileCallback>();
      this.userProfileListeners.set(userId, listeners);
    }
    listeners.add(callback);

    const profile = this.userProfiles.get(userId);
    if (profile) {
      callback({ ...profile });
    }

    return () => {
      listeners?.delete(callback);
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
   * Update account balance from an Options WS response for a user.
   */
  private processUserBalance(userId: string, data: any): void {
    const raw = data?.balance ?? data;

    const balanceValue =
      toNumber(raw?.balance);

    if (balanceValue === null) {
      return;
    }

    const currency =
      typeof raw?.currency === 'string'
        ? raw.currency
        : this.userBalances.get(userId)?.currency || 'USD';

    const loginid =
      typeof raw?.loginid === 'string'
        ? raw.loginid
        : this.userAccountIds.get(userId) || '';

    const balance = {
      balance: balanceValue,
      currency,
      loginid,
    };

    this.userBalances.set(userId, balance);

    const profile = this.userProfiles.get(userId);
    if (profile) {
      profile.balance = balanceValue;
      profile.currency = currency;
      profile.loginid = loginid || profile.loginid;
    }

    const listeners = this.userBalanceListeners.get(userId);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener({ ...balance });
        } catch (error) {
          logger.warn(
            `[DerivGateway] Balance listener failed for user ${userId}.`,
            {
              error: cleanErrorMessage(error),
            },
          );
        }
      }
    }
  }

  /**
   * DEPRECATED: Use processUserBalance instead.
   */
  private processBalance(data: any): void {
    this.processUserBalance('SYSTEM', data);
  }

  /**
   * Process account profile data if supplied by the API for a user.
   */
  private processUserProfile(userId: string, raw: any): void {
    if (!raw || typeof raw !== 'object') {
      return;
    }

    const loginid =
      typeof raw.loginid === 'string'
        ? raw.loginid
        : this.userAccountIds.get(userId);

    if (!loginid) {
      return;
    }

    const profile = {
      ...raw,
      loginid,
      balance:
        toNumber(raw.balance) ??
        this.userBalances.get(userId)?.balance,
      currency:
        typeof raw.currency === 'string'
          ? raw.currency
          : this.userBalances.get(userId)?.currency,
    };

    this.userProfiles.set(userId, profile);

    const listeners = this.userProfileListeners.get(userId);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener({ ...profile });
        } catch (error) {
          logger.warn(
            `[DerivGateway] Profile listener failed for user ${userId}.`,
            {
              error: cleanErrorMessage(error),
            },
          );
        }
      }
    }
  }

  /**
   * DEPRECATED: Use processUserProfile instead.
   */
  private processProfile(raw: any): void {
    this.processUserProfile('SYSTEM', raw);
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
  public async fetchAccounts(userId = 'SYSTEM'): Promise<OptionsAccount[]> {
    const token = this.userAccessTokens.get(userId);
    if (!token) {
      throw new Error(`OAuth access token is not configured for user ${userId}.`);
    }

    const response = await fetch(
      `${OPTIONS_REST_BASE}/trading/v1/options/accounts`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
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
    userId = 'SYSTEM',
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
      await this.fetchAccounts(userId);

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

    const jitter = Math.floor(Math.random() * 500);
    const delay =
      Math.min(
        DEFAULT_RECONNECT_DELAY *
          2 ** Math.min(
            this.publicReconnectAttempts - 1,
            5,
          ),
        MAX_RECONNECT_DELAY,
      ) + jitter;

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
  /**
   * Schedule authenticated account reconnect for a user.
   */
  private scheduleUserAccountReconnect(userId: string): void {
    const accessToken = this.userAccessTokens.get(userId);
    const accountId = this.userAccountIds.get(userId);

    if (
      this.explicitShutdown ||
      this.userAccountReconnectTimers.has(userId) ||
      !accessToken ||
      !accountId
    ) {
      return;
    }

    const attempts = (this.userAccountReconnectAttempts.get(userId) || 0) + 1;
    this.userAccountReconnectAttempts.set(userId, attempts);

    const delay =
      Math.min(
        DEFAULT_RECONNECT_DELAY *
          2 ** Math.min(
            attempts - 1,
            5,
          ),
        MAX_RECONNECT_DELAY,
      );

    this.setConnectionState('RECONNECTING');

    const timer = setTimeout(() => {
      this.userAccountReconnectTimers.delete(userId);

      this.connectUserAccount(userId).catch((error) => {
        logger.warn(
          `[DerivGateway] Authenticated Options reconnect failed for user ${userId}.`,
          {
            error: cleanErrorMessage(error),
          },
        );

        this.scheduleUserAccountReconnect(userId);
      });
    }, delay);

    this.userAccountReconnectTimers.set(userId, timer);
  }

  /**
   * DEPRECATED: Use scheduleUserAccountReconnect instead.
   */
  private scheduleAccountReconnect(): void {
    this.scheduleUserAccountReconnect('SYSTEM');
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
        const sockets = [this.publicWs, ...Array.from(this.userAccountSockets.values())];

        for (const socket of sockets) {
          if (socket?.readyState === WS_OPEN) {
            try {
              (socket as any)['__appexPingAt'] =
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
      isAuthorized: this.userAccountSockets.size > 0,
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

      client.on('ping', () => {
        try {
          client.pong();
        } catch {}
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

    if (this.attachedServers.has(server)) {
      return wss;
    }
    this.attachedServers.add(server);

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
      action === 'ping' ||
      Boolean((message as any).ping)
    ) {
      const response: Record<string, unknown> = {
        type: 'pong',
        ping: 'pong',
        pong: 1,
        time: Date.now(),
      };
      if (typeof (message as any).req_id !== 'undefined') {
        response.req_id = (message as any).req_id;
      }
      try {
        client.send(JSON.stringify(response));
      } catch {}
      return;
    }

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

    for (const timer of this.userAccountReconnectTimers.values()) {
      clearTimeout(timer);
    }
    this.userAccountReconnectTimers.clear();

    this.stopHeartbeat();

    this.rejectPendingRequests(
      this.pendingPublicRequests,
      new Error('Gateway shutting down.'),
    );

    for (const pending of this.userPendingAccountRequests.values()) {
      this.rejectPendingRequests(pending, new Error('Gateway shutting down.'));
    }
    this.userPendingAccountRequests.clear();

    this.closePublicSocket();
    
    for (const userId of Array.from(this.userAccountSockets.keys())) {
      this.closeUserAccountSocket(userId);
    }

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

    this.userAccessTokens.clear();
    this.userAccountIds.clear();
    this.userBalances.clear();
    this.userProfiles.clear();

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

  private closeUserAccountSocket(userId: string): void {
    const socket = this.userAccountSockets.get(userId);

    this.userAccountSockets.delete(userId);

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

  /**
   * DEPRECATED: Use closeUserAccountSocket instead.
   */
  private closeAccountSocket(): void {
    this.closeUserAccountSocket('SYSTEM');
  }
}

export const derivGateway =
  DerivGateway.getInstance();