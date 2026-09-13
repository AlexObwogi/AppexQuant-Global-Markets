/**
 * AppeX Quant Global Markets
 * Server-Side Deriv OAuth 2.0 PKCE Service
 *
 * AUTHORITATIVE FLOW
 *
 * Browser
 *   -> Deriv OAuth 2.0 PKCE
 *   -> callback with authorization code
 *   -> server-side token exchange
 *   -> authenticated REST account discovery
 *   -> authenticated Options WebSocket OTP
 *   -> WebSocket handshake validation
 *   -> persistence / session synchronization
 *
 * IMPORTANT
 * - OAuth client_id is NEVER confused with Deriv App ID.
 * - No legacy v3 `{ authorize: ACCESS_TOKEN }` flow exists here.
 * - Access tokens are never returned in redirect URLs.
 * - OTP/WebSocket URLs are never logged.
 * - State is single-use and PKCE protected.
 * - In-memory stores are caches only; durable persistence is delegated
 *   to the existing Prisma/Supabase services.
 */

export const runtime = 'nodejs';

import crypto from 'crypto';
import NodeWebSocket from 'ws';

import {
  syncUserToSupabase,
  syncDerivConnectionToSupabase,
} from '../../lib/supabase.ts';

import { dbQueries } from '../../lib/db/prisma.ts';

import { logger } from '../../observability/logger.ts';

import {
  buildAuthUrl,
  DERIV_OAUTH_SCOPE,
  exchangeCodeForToken,
  getDerivOAuthClientId,
  getDerivAppId,
} from '../oauthService.ts';

import { isValidDerivAccountId } from './syncStateMachine.ts';

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const DERIV_AUTH_ENDPOINT =
  'https://auth.deriv.com/oauth2/auth';

const DERIV_TOKEN_ENDPOINT =
  'https://auth.deriv.com/oauth2/token';

const DERIV_OPTIONS_API_BASE =
  'https://api.derivws.com/trading/v1/options';

const OAUTH_STATE_TTL_MS =
  10 * 60 * 1000;

const DERIV_WS_OTP_TTL_SECONDS =
  120;

const PROFILE_TIMEOUT_MS =
  10_000;

const OTP_WS_TIMEOUT_MS =
  8_000;

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface DerivAccountProfileData {
  email?: string;
  fullname?: string;
  loginid: string;
  currency: string;
  balance: number;
  country?: string;
  is_virtual: number;
  landing_company_name?: string;
  scopes?: string[];
  userId?: number | string;

  account_list?: Array<{
    loginid: string;
    account_type: string;
    currency: string;
    is_virtual: number;
    landing_company_name: string;
  }>;
}

export interface DerivConnectionRecord {
  userId: string;
  derivAccountId: string;

  email?: string;
  fullName?: string;
  balance?: number;

  accountType: 'demo' | 'real';
  currency: string;

  connectionStatus:
    | 'CONNECTED'
    | 'CONNECTING'
    | 'SYNCING'
    | 'SYNC_FAILED'
    | 'DISCONNECTED'
    | 'RECONNECT_REQUIRED'
    | 'ERROR';

  scopes: string[];

  /**
   * SERVER ONLY.
   */
  accessToken: string;

  /**
   * SERVER ONLY.
   */
  refreshToken?: string;

  tokenExpiry?: string | null;

  createdAt: string;
  updatedAt: string;
  lastSyncedAt: string;
}

export interface SafeDerivConnectionMetadata {
  connected: boolean;

  derivAccountId?: string;
  email?: string;
  fullName?: string;
  balance?: number;

  accountType?: 'demo' | 'real';
  currency?: string;

  connectionStatus:
    | 'CONNECTED'
    | 'CONNECTING'
    | 'SYNCING'
    | 'SYNC_FAILED'
    | 'DISCONNECTED'
    | 'RECONNECT_REQUIRED'
    | 'ERROR';

  scopes?: string[];

  lastSyncedAt?: string;

  accountList?: Array<{
    loginid: string;
    account_type: string;
    currency: string;
    is_virtual: number;
    landing_company_name: string;
  }>;
}

export interface OAuthTransaction {
  state: string;
  codeVerifier: string;
  userId: string;
  action: 'connect' | 'signup';
  destination: string;
  redirectUri: string;
  createdAt: number;
}

export interface HydrateDerivAccountParams {
  userId: string;
  accessToken: string;

  /**
   * Deriv App ID only.
   *
   * This is NOT the OAuth client_id.
   */
  appId?: string;

  refreshToken?: string;
  tokenExpiry?: string | null;
  scopes?: string[];

  fallbackAccount?: {
    loginid?: string;
    email?: string;
    fullName?: string;
    balance?: number;
    currency?: string;
    accountType?: 'demo' | 'real';
    scopes?: string[];
    accountList?: any[];
  };
}

export interface HydrateDerivAccountResult {
  success: boolean;
  metadata: SafeDerivConnectionMetadata;

  profile?: DerivAccountProfileData;

  error?: string;

  /**
   * Server-side compatibility information.
   *
   * token is intentionally omitted/blank from returned objects.
   * The actual token remains only in the server-side connection record
   * and persistence layer.
   */
  rawAccountDetails?: {
    derivAccountId: string;
    email?: string;
    fullName?: string;
    balance?: number;
    accountType: 'demo' | 'real';
    currency: string;
    token: string;
    accountList?: any[];
  };
}

/* -------------------------------------------------------------------------- */
/* Temporary server-side caches                                               */
/* -------------------------------------------------------------------------- */

const oauthTransactionsStore =
  new Map<string, OAuthTransaction>();

const derivConnectionsStore =
  new Map<string, DerivConnectionRecord>();

/* -------------------------------------------------------------------------- */
/* Generic helpers                                                            */
/* -------------------------------------------------------------------------- */

function cleanString(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .trim()
    .replace(/^['"]|['"]$/g, '');
}

function cleanErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message.replace(/\s+/g, ' ').trim();
  }
  return String(error).replace(/\s+/g, ' ').trim();
}

function isUsableToken(token: unknown): token is string {
  const clean = cleanString(token);

  if (!clean) {
    return false;
  }

  if (
    clean.startsWith('usr-') ||
    clean.startsWith('user-')
  ) {
    return false;
  }

  return true;
}

function parseNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function normalizeScopes(
  value: unknown,
  fallback: string[] = ['trade', 'account_manage'],
): string[] {
  if (Array.isArray(value)) {
    return value
      .map((scope) => cleanString(scope))
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/[\s,]+/)
      .map((scope) => scope.trim())
      .filter(Boolean);
  }

  return [...fallback];
}

async function readJsonSafely(
  response: Response,
): Promise<any> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      rawText: text,
    };
  }
}

function extractErrorMessage(
  data: any,
  fallback: string,
): string {
  const error =
    data?.error ||
    data?.errors?.[0] ||
    data;

  if (typeof error === 'string') {
    return error;
  }

  return (
    error?.message ||
    error?.error_description ||
    error?.description ||
    fallback
  );
}

/* -------------------------------------------------------------------------- */
/* OAuth configuration                                                        */
/* -------------------------------------------------------------------------- */

export function getDerivOAuthConfig(
  requestHost?: string,
  requestProtocol?: string,
) {
  /*
   * CRITICAL:
   *
   * OAuth client_id comes ONLY from DERIV_CLIENT_ID.
   */
  const clientId =
    cleanString(
      process.env.DERIV_CLIENT_ID ||
      getDerivOAuthClientId(),
    );

  const appId = clientId;

  const clientSecret =
    cleanString(
      process.env.DERIV_OAUTH_SECRET,
    );

  const proto =
    cleanString(requestProtocol) ||
    (
      cleanString(requestHost).includes('localhost')
        ? 'http'
        : 'https'
    );

  const host =
    cleanString(requestHost) ||
    (() => {
      const configured =
        cleanString(process.env.APP_URL);

      if (!configured) {
        return 'localhost:3000';
      }

      try {
        return new URL(configured).host;
      } catch {
        return 'localhost:3000';
      }
    })();

  let redirectUri =
    `${proto}://${host}/api/auth/deriv/callback`;

  const configuredRedirect =
    cleanString(
      process.env.DERIV_REDIRECT_URI ||
      process.env.VITE_REDIRECT_URI,
    );

  if (configuredRedirect) {
    redirectUri = configuredRedirect;
  } else {
    const siteUrl =
      cleanString(process.env.NEXT_PUBLIC_SITE_URL);

    if (siteUrl) {
      redirectUri =
        `${siteUrl.replace(/\/$/, '')}/api/auth/deriv/callback`;
    }
  }

  const scopes =
    cleanString(process.env.DERIV_OAUTH_SCOPE) ||
    DERIV_OAUTH_SCOPE ||
    'trade account_manage';

  return {
    clientId,
    appId,
    clientSecret,
    redirectUri,
    scopes,
    affiliateToken: cleanString(process.env.DERIV_AFFILIATE_TOKEN),
    utmMedium: cleanString(process.env.DERIV_UTM_MEDIUM),

    authBaseUrl:
      cleanString(process.env.DERIV_AUTH_URL) ||
      DERIV_AUTH_ENDPOINT,

    tokenEndpoint:
      cleanString(process.env.DERIV_TOKEN_ENDPOINT) ||
      DERIV_TOKEN_ENDPOINT,
  };
}

/* -------------------------------------------------------------------------- */
/* PKCE                                                                       */
/* -------------------------------------------------------------------------- */

export function base64UrlEncode(
  buffer: Buffer,
): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export function generatePKCE(): {
  codeVerifier: string;
  codeChallenge: string;
} {
  const verifierBytes =
    crypto.randomBytes(32);

  const codeVerifier =
    base64UrlEncode(verifierBytes);

  const digest =
    crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest();

  const codeChallenge =
    base64UrlEncode(digest);

  return {
    codeVerifier,
    codeChallenge,
  };
}

export function generateState(): string {
  return crypto
    .randomBytes(32)
    .toString('hex');
}

function getStateSecret(): string {
  const secret =
    cleanString(
      process.env.SESSION_SECRET ||
      process.env.JWT_SECRET ||
      process.env.JWT_ACCESS_SECRET
    );

  if (secret) {
    return secret;
  }

  return 'appexquant-default-session-secret-fallback-secure';
}

export function encodeOAuthStateCookie(
  transaction: OAuthTransaction,
): string {
  const payload =
    Buffer
      .from(JSON.stringify(transaction))
      .toString('base64url');

  const signature =
    crypto
      .createHmac(
        'sha256',
        getStateSecret(),
      )
      .update(payload)
      .digest('base64url');

  return `${payload}.${signature}`;
}

export function decodeOAuthStateCookie(
  cookieValue?: string,
): OAuthTransaction | null {
  const value =
    cleanString(cookieValue);

  if (!value) {
    return null;
  }

  try {
    const parts =
      value.split('.');

    if (parts.length !== 2) {
      return null;
    }

    const [payload, signature] =
      parts;

    const expectedSignature =
      crypto
        .createHmac(
          'sha256',
          getStateSecret(),
        )
        .update(payload)
        .digest('base64url');

    const supplied =
      Buffer
        .from(signature);

    const expected =
      Buffer
        .from(expectedSignature);

    if (
      supplied.length !== expected.length ||
      !crypto.timingSafeEqual(
        supplied,
        expected,
      )
    ) {
      return null;
    }

    const transaction =
      JSON.parse(
        Buffer
          .from(payload, 'base64url')
          .toString('utf8'),
      ) as OAuthTransaction;

    if (
      !transaction ||
      !transaction.state ||
      !transaction.codeVerifier ||
      !transaction.redirectUri ||
      !transaction.userId ||
      !transaction.createdAt
    ) {
      return null;
    }

    if (
      Date.now() -
      transaction.createdAt >
      OAUTH_STATE_TTL_MS
    ) {
      return null;
    }

    return transaction;
  } catch {
    return null;
  }
}

function cleanupExpiredTransactions(): void {
  const now =
    Date.now();

  for (
    const [state, transaction]
    of oauthTransactionsStore.entries()
  ) {
    if (
      now -
      transaction.createdAt >
      OAUTH_STATE_TTL_MS
    ) {
      oauthTransactionsStore.delete(state);
    }
  }
}

/* -------------------------------------------------------------------------- */
/* OAuth initiation                                                           */
/* -------------------------------------------------------------------------- */

export function initiateDerivOAuth(params: {
  userId?: string;
  action?: 'connect' | 'signup';
  destination?: string;
  requestHost?: string;
  requestProtocol?: string;
}): {
  authUrl: string;
  state: string;
  cookieValue: string;
  redirectUri: string;
} {
  const action = params.action || 'connect';
  console.log('[OAUTH_INIT_START]', { action });

  try {
    cleanupExpiredTransactions();

    const oauthConfig =
      getDerivOAuthConfig(
        params.requestHost,
        params.requestProtocol,
      );

    console.log('[OAUTH_CLIENT_ID_PRESENT]', { present: Boolean(oauthConfig.clientId) });

    if (!oauthConfig.clientId) {
      throw new Error(
        'DERIV_CLIENT_ID is not configured.',
      );
    }

    const userId =
      cleanString(params.userId) ||
      `usr-${crypto.randomBytes(12).toString('hex')}`;

    const destination =
      cleanString(params.destination) || '/';

    const {
      codeVerifier,
      codeChallenge,
    } = generatePKCE();

    const state =
      generateState();

    const transaction: OAuthTransaction = {
      state,
      codeVerifier,
      userId,
      action,
      destination,
      redirectUri:
        oauthConfig.redirectUri,
      createdAt:
        Date.now(),
    };

    oauthTransactionsStore.set(
      state,
      transaction,
    );

    const cookieValue =
      encodeOAuthStateCookie(transaction);

    const extraParams: Record<string, string> = {};
    if (oauthConfig.affiliateToken) {
      extraParams['affiliate_token'] = oauthConfig.affiliateToken;
      extraParams['t'] = oauthConfig.affiliateToken;
    }
    if (oauthConfig.utmMedium) {
      extraParams['utm_medium'] = oauthConfig.utmMedium;
    }

    const authUrl =
      buildAuthUrl({
        clientId: oauthConfig.clientId,
        appId: oauthConfig.appId || undefined,
        redirectUri: oauthConfig.redirectUri,
        scope: oauthConfig.scopes || DERIV_OAUTH_SCOPE,
        state,
        codeChallenge,
        codeChallengeMethod: 'S256',
        action,
        extraParams: Object.keys(extraParams).length > 0 ? extraParams : undefined,
      });

    console.log('[OAUTH_INIT_SUCCESS]', { action });

    return {
      authUrl,
      state,
      cookieValue,
      redirectUri:
        oauthConfig.redirectUri,
    };
  } catch (error: any) {
    console.error('[OAUTH_INIT_FAILED]', { error: cleanErrorMessage(error) });
    throw error;
  }
}

/* -------------------------------------------------------------------------- */
/* REST account discovery                                                     */
/* -------------------------------------------------------------------------- */

function normalizeAccount(
  item: any,
): DerivAccountProfileData | null {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const loginid =
    cleanString(
      item.account_id ||
      item.loginid ||
      item.login_id ||
      item.id,
    );

  if (!loginid) {
    return null;
  }

  const isVirtual =
    item.is_virtual === true ||
    item.is_virtual === 1 ||
    item.account_type === 'demo' ||
    loginid.startsWith('VR');

  const balance =
    parseNumber(item.balance);

  const currency =
    cleanString(item.currency) ||
    'USD';

  const accountType =
    isVirtual
      ? 'demo'
      : 'real';

  return {
    loginid,
    currency,
    balance,
    is_virtual: isVirtual ? 1 : 0,

    email:
      cleanString(item.email) ||
      undefined,

    fullname:
      cleanString(
        item.fullname ||
        item.full_name ||
        item.name,
      ) || undefined,

    country:
      cleanString(item.country) ||
      undefined,

    landing_company_name:
      cleanString(
        item.landing_company_name ||
        item.landing_company ||
        item.landing_company_name,
      ) || undefined,

    scopes:
      normalizeScopes(
        item.scopes,
        ['trade', 'account_manage'],
      ),

    account_list:
      Array.isArray(item.account_list)
        ? item.account_list
            .map((account: any) => ({
              loginid:
                cleanString(
                  account.loginid ||
                  account.account_id ||
                  account.id,
                ),

              account_type:
                cleanString(
                  account.account_type,
                ) ||
                (
                  account.is_virtual
                    ? 'demo'
                    : 'real'
                ),

              currency:
                cleanString(account.currency) ||
                'USD',

              is_virtual:
                account.is_virtual
                  ? 1
                  : 0,

              landing_company_name:
                cleanString(
                  account.landing_company_name,
                ) || '',
            }))
            .filter(
              (account: any) =>
                Boolean(account.loginid),
            )
        : undefined,

    userId:
      item.user_id ??
      item.userId,

    /*
     * accountType is inferred through is_virtual.
     * Keep this object compatible with existing callers.
     */
    ...(accountType
      ? {}
      : {}),
  };
}

function extractAccountsFromResponse(
  data: any,
): any[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  if (Array.isArray(data?.accounts)) {
    return data.accounts;
  }

  if (Array.isArray(data?.data?.accounts)) {
    return data.data.accounts;
  }

  if (
    data &&
    typeof data === 'object' &&
    (
      data.account_id ||
      data.loginid ||
      data.id
    )
  ) {
    return [data];
  }

  return [];
}

export async function discoverDerivAccountsREST(
  token: string,
  appId?: string,
): Promise<{
  accounts: DerivAccountProfileData[];
  primaryAccount:
    DerivAccountProfileData | null;
}> {
  const cleanToken =
    cleanString(token);

  if (!isUsableToken(cleanToken)) {
    return {
      accounts: [],
      primaryAccount: null,
    };
  }

  const cleanAppId =
    cleanString(appId) ||
    getDerivOAuthConfig().appId ||
    getDerivOAuthConfig().clientId;

  const url =
    `${DERIV_OPTIONS_API_BASE}/accounts`;

  try {
    const response =
      await fetch(
        url,
        {
          method: 'GET',

          headers: {
            Authorization:
              `Bearer ${cleanToken}`,

            'Deriv-App-ID':
              cleanAppId,

            Accept:
              'application/json',
          },

          cache: 'no-store',
        },
      );

    const data =
      await readJsonSafely(response);

    if (!response.ok) {
      const message =
        extractErrorMessage(
          data,
          `Deriv account discovery failed with HTTP ${response.status}.`,
        );

      logger.warn(
        '[DerivREST] Account discovery rejected.',
        {
          status: response.status,
          message,
        },
      );

      return {
        accounts: [],
        primaryAccount: null,
      };
    }

    const rawAccounts =
      extractAccountsFromResponse(data);

    const accounts =
      rawAccounts
        .map(normalizeAccount)
        .filter(
          (
            account,
          ): account is DerivAccountProfileData =>
            Boolean(account),
        )
        .filter(
          (account) =>
            isValidDerivAccountId(
              account.loginid,
            ),
        );

    if (!accounts.length) {
      logger.warn(
        '[DerivREST] Account discovery returned no valid Deriv account IDs.',
      );

      return {
        accounts: [],
        primaryAccount: null,
      };
    }

    return {
      accounts,
      primaryAccount:
        accounts[0],
    };
  } catch (error: any) {
    logger.warn(
      '[DerivREST] Account discovery request failed.',
      {
        error:
          error?.message ||
          String(error),
      },
    );

    return {
      accounts: [],
      primaryAccount: null,
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Options WebSocket OTP                                                      */
/* -------------------------------------------------------------------------- */

export async function requestDerivAccountOtp(
  accountId: string,
  token: string,
  appId?: string,
): Promise<{
  success: boolean;
  otp?: string;
  url?: string;
  accountId?: string;
  error?: string;
}> {
  const cleanToken =
    cleanString(token);

  const cleanAccountId =
    cleanString(accountId);

  const cleanAppId =
    cleanString(appId) ||
    getDerivOAuthConfig().appId ||
    getDerivOAuthConfig().clientId;

  if (!isUsableToken(cleanToken)) {
    return {
      success: false,
      error:
        'Missing or invalid Deriv access token.',
    };
  }

  if (
    !cleanAccountId ||
    !isValidDerivAccountId(cleanAccountId)
  ) {
    return {
      success: false,
      error:
        'Invalid Deriv account ID.',
    };
  }

  const url =
    `${DERIV_OPTIONS_API_BASE}/accounts/${encodeURIComponent(cleanAccountId)}/otp`;

  try {
    const response =
      await fetch(
        url,
        {
          method: 'POST',

          headers: {
            Authorization:
              `Bearer ${cleanToken}`,

            'Deriv-App-ID':
              cleanAppId,

            Accept:
              'application/json',

            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify({}),

          cache: 'no-store',
        },
      );

    const data =
      await readJsonSafely(response);

    if (!response.ok) {
      const message =
        extractErrorMessage(
          data,
          `Deriv OTP request failed with HTTP ${response.status}.`,
        );

      logger.warn(
        '[DerivOTP] OTP request rejected.',
        {
          status:
            response.status,
          accountId:
            cleanAccountId,
          message,
        },
      );

      return {
        success: false,
        error: message,
      };
    }

    /*
     * Current API responses may wrap data inside `data`.
     */
    const payload =
      data?.data &&
      typeof data.data === 'object'
        ? data.data
        : data;

    const otp =
      cleanString(
        payload?.otp ||
        payload?.token,
      );

    /*
     * Deriv returns a ready-to-use URL.
     * Do NOT manufacture another WebSocket endpoint
     * if Deriv did not return one.
     */
    const readyWsUrl =
      cleanString(
        payload?.url ||
        payload?.websocket_url ||
        payload?.ws_url,
      );

    if (!readyWsUrl) {
      return {
        success: false,
        error:
          'Deriv OTP endpoint returned no authenticated WebSocket URL.',
      };
    }

    /*
     * Do not append an OTP to an already-issued URL.
     * The server must use Deriv's ready-to-use URL exactly as returned.
     */
    return {
      success: true,
      otp:
        otp || undefined,
      url:
        readyWsUrl,
      accountId:
        cleanAccountId,
    };
  } catch (error: any) {
    logger.warn(
      '[DerivOTP] OTP request failed.',
      {
        accountId:
          cleanAccountId,
        error:
          error?.message ||
          String(error),
      },
    );

    return {
      success: false,
      error:
        'Unable to reach the Deriv OTP endpoint.',
    };
  }
}

export async function requestDerivOTP(
  accountId: string,
  token: string,
  appId?: string,
): Promise<{
  success: boolean;
  wsUrl?: string;
  otp?: string;
  accountId?: string;
  error?: string;
  expiresInSeconds?: number;
}> {
  const result =
    await requestDerivAccountOtp(
      accountId,
      token,
      appId,
    );

  return {
    success:
      result.success,

    wsUrl:
      result.url,

    otp:
      result.otp,

    accountId:
      result.accountId,

    error:
      result.error,

    expiresInSeconds:
      result.success
        ? DERIV_WS_OTP_TTL_SECONDS
        : undefined,
  };
}

/* -------------------------------------------------------------------------- */
/* Authenticated WebSocket validation                                         */
/* -------------------------------------------------------------------------- */

export function verifyDerivWebSocketWithOtp(
  wsUrl: string,
  timeoutMs: number = OTP_WS_TIMEOUT_MS,
): Promise<{
  success: boolean;
  error?: string;
}> {
  const cleanUrl =
    cleanString(wsUrl);

  if (
    !cleanUrl ||
    !/^wss:\/\//i.test(cleanUrl)
  ) {
    return Promise.resolve({
      success: false,
      error:
        'Invalid authenticated Deriv WebSocket URL.',
    });
  }

  return new Promise((resolve) => {
    let ws: any = null;
    let settled = false;
    let timer: ReturnType<typeof setTimeout>;

    const finish = (
      success: boolean,
      error?: string,
    ) => {
      if (settled) {
        return;
      }

      settled = true;

      clearTimeout(timer);

      try {
        if (ws) {
          ws.removeAllListeners?.();
          ws.close();
        }
      } catch {}

      resolve({
        success,
        error,
      });
    };

    timer =
      setTimeout(
        () => {
          finish(
            false,
            'Timed out connecting to authenticated Deriv WebSocket.',
          );
        },
        timeoutMs,
      );

    try {
      const WSImpl: any =
        (NodeWebSocket as any)?.default ||
        NodeWebSocket;

      ws =
        new WSImpl(
          cleanUrl,
          {
            handshakeTimeout:
              timeoutMs,
          },
        );
    } catch (error: any) {
      finish(
        false,
        `WebSocket construction failed: ${
          error?.message ||
          String(error)
        }`,
      );

      return;
    }

    ws.on(
      'open',
      () => {
        /*
         * The OTP URL itself authenticates the connection.
         *
         * Do not send `{ authorize: token }`.
         * Do not send the OAuth access token over this socket.
         */
        finish(true);
      },
    );

    ws.on(
      'error',
      (error: any) => {
        finish(
          false,
          `Authenticated WebSocket error: ${
            error?.message ||
            error?.code ||
            String(error)
          }`,
        );
      },
    );

    ws.on(
      'close',
      (
        code: number,
        reason: Buffer,
      ) => {
        if (!settled) {
          const reasonText =
            reason?.length
              ? reason.toString()
              : '';

          finish(
            false,
            `Authenticated WebSocket closed before validation completed (code ${code}${
              reasonText
                ? `, reason ${reasonText}`
                : ''
            }).`,
          );
        }
      },
    );
  });
}

/* -------------------------------------------------------------------------- */
/* Authoritative profile/account discovery                                    */
/* -------------------------------------------------------------------------- */

/**
 * Authoritative account discovery.
 *
 * There is intentionally NO legacy v3 WebSocket authorize flow here.
 *
 * REST:
 *   GET /trading/v1/options/accounts
 *
 * then:
 *   POST /trading/v1/options/accounts/{accountId}/otp
 *
 * then:
 *   connect to Deriv's returned authenticated WebSocket URL.
 */
export async function fetchDerivAccountProfile(
  token: string,
  appId?: string,
): Promise<DerivAccountProfileData | null> {
  const cleanToken =
    cleanString(token);

  if (!isUsableToken(cleanToken)) {
    return null;
  }

  const cleanAppId =
    cleanString(appId) ||
    getDerivOAuthConfig().appId ||
    getDerivOAuthConfig().clientId;

  const discovery =
    await discoverDerivAccountsREST(
      cleanToken,
      cleanAppId,
    );

  if (
    !discovery.primaryAccount
  ) {
    return null;
  }

  const account =
    discovery.primaryAccount;

  /*
   * Request the authenticated WS URL.
   *
   * This validates that the OAuth token has the necessary
   * permissions for the Options WebSocket path.
   */
  const otpResult =
    await requestDerivAccountOtp(
      account.loginid,
      cleanToken,
      cleanAppId,
    );

  if (!otpResult.success || !otpResult.url) {
    logger.warn(
      '[DerivOAuth] Authenticated Options WebSocket URL could not be obtained.',
      {
        accountId:
          account.loginid,
        error:
          otpResult.error,
      },
    );

    return null;
  }

  const wsResult =
    await verifyDerivWebSocketWithOtp(
      otpResult.url,
    );

  if (!wsResult.success) {
    logger.warn(
      '[DerivOAuth] Authenticated Options WebSocket validation failed.',
      {
        accountId:
          account.loginid,
        error:
          wsResult.error,
      },
    );

    return null;
  }

  return {
    ...account,

    account_list:
      discovery.accounts.map(
        (item) => ({
          loginid:
            item.loginid,

          account_type:
            item.is_virtual
              ? 'demo'
              : 'real',

          currency:
            item.currency,

          is_virtual:
            item.is_virtual,

          landing_company_name:
            item.landing_company_name ||
            '',
        }),
      ),
  };
}

/* -------------------------------------------------------------------------- */
/* Account hydration                                                          */
/* -------------------------------------------------------------------------- */

export async function hydrateDerivAccount(
  params: HydrateDerivAccountParams,
): Promise<HydrateDerivAccountResult> {
  const {
    userId,
    accessToken,
    appId,
    refreshToken,
    tokenExpiry,
    fallbackAccount,
  } = params;

  const cleanUserId =
    cleanString(userId);

  const cleanToken =
    cleanString(accessToken);

  if (!cleanUserId) {
    return {
      success: false,

      metadata: {
        connected: false,
        connectionStatus:
          'SYNC_FAILED',
      },

      error:
        'Missing user ID for Deriv account hydration.',
    };
  }

  if (!isUsableToken(cleanToken)) {
    return {
      success: false,

      metadata: {
        connected: false,
        connectionStatus:
          'SYNC_FAILED',
      },

      error:
        'Missing or invalid Deriv access token.',
    };
  }

  const oauthConfig =
    getDerivOAuthConfig();

  /*
   * IMPORTANT:
   *
   * appId is the Deriv App ID.
   * oauthConfig.clientId is the OAuth client ID.
   *
   * Never use oauthConfig.clientId here.
   */
  const effectiveAppId =
    cleanString(appId) ||
    oauthConfig.appId ||
    oauthConfig.clientId;

  const profile =
    await fetchDerivAccountProfile(
      cleanToken,
      effectiveAppId,
    );

  if (
    !profile ||
    !profile.loginid ||
    !isValidDerivAccountId(
      profile.loginid,
    )
  ) {
    const failedAt =
      new Date().toISOString();

    derivConnectionsStore.set(
      cleanUserId,
      {
        userId:
          cleanUserId,

        derivAccountId:
          '',

        accountType:
          'real',

        currency:
          fallbackAccount?.currency ||
          'USD',

        connectionStatus:
          'SYNC_FAILED',

        scopes:
          params.scopes ||
          ['trade', 'account_manage'],

        accessToken:
          cleanToken,

        refreshToken,

        tokenExpiry,

        createdAt:
          failedAt,

        updatedAt:
          failedAt,

        lastSyncedAt:
          failedAt,
      },
    );

    return {
      success: false,

      metadata: {
        connected: false,
        connectionStatus:
          'SYNC_FAILED',
      },

      error:
        'Deriv authenticated account discovery failed.',
    };
  }

  const derivAccountId =
    profile.loginid;

  const isVirtual =
    Boolean(profile.is_virtual) ||
    derivAccountId.startsWith('VR');

  const accountType:
    'demo' | 'real' =
      isVirtual
        ? 'demo'
        : 'real';

  const currency =
    profile.currency ||
    fallbackAccount?.currency ||
    'USD';

  const balance =
    typeof profile.balance === 'number'
      ? profile.balance
      : (
          fallbackAccount?.balance ??
          0
        );

  const email =
    profile.email ||
    fallbackAccount?.email ||
    '';

  const fullName =
    profile.fullname ||
    fallbackAccount?.fullName ||
    '';

  const scopes =
    normalizeScopes(
      profile.scopes ||
      params.scopes ||
      fallbackAccount?.scopes,
    );

  const accountList =
    profile.account_list ||
    fallbackAccount?.accountList;

  const now =
    new Date().toISOString();

  const connectionRecord:
    DerivConnectionRecord = {
      userId:
        cleanUserId,

      derivAccountId,

      email,

      fullName,

      balance,

      accountType,

      currency,

      connectionStatus:
        'CONNECTED',

      scopes,

      /*
       * SERVER ONLY.
       */
      accessToken:
        cleanToken,

      refreshToken,

      tokenExpiry,

      createdAt:
        now,

      updatedAt:
        now,

      lastSyncedAt:
        now,
    };

  /*
   * Cache by user ID.
   */
  derivConnectionsStore.set(
    cleanUserId,
    connectionRecord,
  );

  /*
   * Cache by account ID as a convenience.
   */
  derivConnectionsStore.set(
    derivAccountId,
    connectionRecord,
  );

  /* ---------------------------------------------------------------------- */
  /* Prisma persistence                                                     */
  /* ---------------------------------------------------------------------- */

  try {
    await dbQueries.upsertDerivAccount({
      id:
        derivAccountId,

      userId:
        cleanUserId,

      accountType,

      currency,

      balance,

      equity:
        balance,

      isVirtual,

      status:
        'ACTIVE',

      lastSyncedAt:
        now,
    });

    await dbQueries.recordAccountSnapshot({
      derivAccountId,

      userId:
        cleanUserId,

      balance,

      equity:
        balance,

      currency,

      timestamp:
        new Date(),
    });

    await dbQueries.mapDerivAccountToUserSession(
      derivAccountId,
      cleanUserId,
    );
  } catch (error: any) {
    logger.warn(
      '[DerivHydration] Prisma persistence warning.',
      {
        error:
          error?.message ||
          String(error),
      },
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Supabase synchronization                                               */
  /* ---------------------------------------------------------------------- */

  void syncUserToSupabase({
    id:
      cleanUserId,

    email,

    derivAccountId,

    accountType,

    role:
      'USER',
  }).catch(
    (error: any) => {
      logger.warn(
        '[DerivHydration] User Supabase synchronization warning.',
        {
          error:
            error?.message ||
            String(error),
        },
      );
    },
  );

  /*
   * Existing persistence service receives the token server-side.
   *
   * This function intentionally does not expose that token in the
   * metadata returned to the caller.
   */
  void syncDerivConnectionToSupabase({
    userId:
      cleanUserId,

    derivAccountId,

    accountType,

    currency,

    connectionStatus:
      'CONNECTED',

    scopes,

    accessToken:
      cleanToken,

    refreshToken,

    tokenExpiry,
  }).catch(
    (error: any) => {
      logger.warn(
        '[DerivHydration] Deriv connection Supabase synchronization warning.',
        {
          error:
            error?.message ||
            String(error),
        },
      );
    },
  );

  const metadata:
    SafeDerivConnectionMetadata = {
      connected:
        true,

      derivAccountId,

      email,

      fullName,

      balance,

      accountType,

      currency,

      connectionStatus:
        'CONNECTED',

      scopes,

      lastSyncedAt:
        now,

      accountList,
    };

  return {
    success:
      true,

    metadata,

    profile,

    /*
     * Compatibility object.
     *
     * Token is deliberately blank so a route cannot accidentally
     * serialize the OAuth access token to the browser.
     */
    rawAccountDetails: {
      derivAccountId,

      email,

      fullName,

      balance,

      accountType,

      currency,

      token:
        '',

      accountList,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Connection getters                                                         */
/* -------------------------------------------------------------------------- */

export function getDerivConnectionRecord(
  userId: string,
): DerivConnectionRecord | undefined {
  return derivConnectionsStore.get(
    cleanString(userId),
  );
}

function toSafeMetadata(
  record:
    DerivConnectionRecord,
): SafeDerivConnectionMetadata {
  return {
    connected:
      record.connectionStatus ===
      'CONNECTED',

    derivAccountId:
      record.derivAccountId ||
      undefined,

    email:
      record.email,

    fullName:
      record.fullName,

    balance:
      record.balance,

    accountType:
      record.accountType,

    currency:
      record.currency,

    connectionStatus:
      record.connectionStatus,

    scopes:
      record.scopes,

    lastSyncedAt:
      record.lastSyncedAt,
  };
}

export async function getUserDerivConnectionAsync(
  userId: string,
): Promise<SafeDerivConnectionMetadata> {
  const cleanUserId =
    cleanString(userId);

  const record =
    derivConnectionsStore.get(
      cleanUserId,
    );

  if (
    !record ||
    record.connectionStatus ===
      'DISCONNECTED'
  ) {
    return {
      connected: false,
      connectionStatus:
        'DISCONNECTED',
    };
  }

  return toSafeMetadata(record);
}

export function getUserDerivConnection(
  userId: string,
): SafeDerivConnectionMetadata {
  const record =
    derivConnectionsStore.get(
      cleanString(userId),
    );

  if (
    !record ||
    record.connectionStatus ===
      'DISCONNECTED'
  ) {
    return {
      connected: false,
      connectionStatus:
        'DISCONNECTED',
    };
  }

  return toSafeMetadata(record);
}

/* -------------------------------------------------------------------------- */
/* API-token compatibility                                                    */
/* -------------------------------------------------------------------------- */

export async function connectUserWithApiTokenAsync(
  userId: string,
  apiToken: string,
): Promise<SafeDerivConnectionMetadata> {
  const cleanUserId =
    cleanString(userId);

  const cleanToken =
    cleanString(apiToken);

  if (!cleanUserId || !isUsableToken(cleanToken)) {
    return {
      connected: false,
      connectionStatus:
        'SYNC_FAILED',
    };
  }

  const result =
    await hydrateDerivAccount({
      userId:
        cleanUserId,

      accessToken:
        cleanToken,
    });

  return result.metadata;
}

export function connectUserWithApiToken(
  userId: string,
  apiToken: string,
): SafeDerivConnectionMetadata {
  const cleanUserId =
    cleanString(userId);

  const cleanToken =
    cleanString(apiToken);

  if (
    !cleanUserId ||
    !isUsableToken(cleanToken)
  ) {
    return {
      connected: false,
      connectionStatus:
        'DISCONNECTED',
    };
  }

  const now =
    new Date().toISOString();

  const accountId =
    isValidDerivAccountId(
      cleanUserId,
    )
      ? cleanUserId
      : '';

  const accountType:
    'demo' | 'real' =
      accountId.startsWith('VR')
        ? 'demo'
        : 'real';

  const record:
    DerivConnectionRecord = {
      userId:
        cleanUserId,

      derivAccountId:
        accountId,

      accountType,

      currency:
        'USD',

      connectionStatus:
        accountId
          ? 'CONNECTED'
          : 'DISCONNECTED',

      scopes:
        ['trade', 'account_manage'],

      accessToken:
        cleanToken,

      createdAt:
        now,

      updatedAt:
        now,

      lastSyncedAt:
        now,
    };

  derivConnectionsStore.set(
    cleanUserId,
    record,
  );

  if (accountId) {
    derivConnectionsStore.set(
      accountId,
      record,
    );
  }

  /*
   * Perform authoritative discovery asynchronously.
   */
  void hydrateDerivAccount({
    userId:
      cleanUserId,

    accessToken:
      cleanToken,
  }).catch(
    (error: any) => {
      logger.warn(
        '[DerivAPIConnection] Background hydration failed.',
        {
          error:
            error?.message ||
            String(error),
        },
      );
    },
  );

  return getUserDerivConnection(
    cleanUserId,
  );
}

/* -------------------------------------------------------------------------- */
/* Disconnect                                                                 */
/* -------------------------------------------------------------------------- */

export function disconnectUserDeriv(
  userId: string,
): boolean {
  const cleanUserId =
    cleanString(userId);

  const record =
    derivConnectionsStore.get(
      cleanUserId,
    );

  if (!record) {
    return false;
  }

  record.connectionStatus =
    'DISCONNECTED';

  /*
   * Remove credentials from the runtime cache.
   */
  record.accessToken =
    '';

  record.refreshToken =
    undefined;

  record.updatedAt =
    new Date().toISOString();

  derivConnectionsStore.set(
    cleanUserId,
    record,
  );

  if (record.derivAccountId) {
    derivConnectionsStore.delete(
      record.derivAccountId,
    );
  }

  return true;
}

/* -------------------------------------------------------------------------- */
/* Synchronization                                                            */
/* -------------------------------------------------------------------------- */

export async function syncUserDerivAsync(
  userId: string,
  providedToken?: string,
): Promise<SafeDerivConnectionMetadata> {
  const cleanUserId =
    cleanString(userId);

  const record =
    derivConnectionsStore.get(
      cleanUserId,
    );

  const tokenToUse =
    cleanString(providedToken) ||
    record?.accessToken ||
    '';

  if (!isUsableToken(tokenToUse)) {
    return {
      connected: false,
      connectionStatus:
        'DISCONNECTED',
    };
  }

  if (record) {
    record.connectionStatus =
      'SYNCING';

    record.updatedAt =
      new Date().toISOString();

    derivConnectionsStore.set(
      cleanUserId,
      record,
    );
  }

  let fallbackLoginId =
    record?.derivAccountId ||
    (
      isValidDerivAccountId(
        cleanUserId,
      )
        ? cleanUserId
        : undefined
    );

  if (!fallbackLoginId) {
    try {
      const dbUser =
        await dbQueries.findUserById(
          cleanUserId,
        );

      if (
        dbUser?.derivAccountId &&
        isValidDerivAccountId(
          dbUser.derivAccountId,
        )
      ) {
        fallbackLoginId =
          dbUser.derivAccountId;
      }
    } catch {}
  }

  try {
    const result =
      await hydrateDerivAccount({
        userId:
          cleanUserId,

        accessToken:
          tokenToUse,

        refreshToken:
          record?.refreshToken,

        tokenExpiry:
          record?.tokenExpiry,

        scopes:
          record?.scopes,

        fallbackAccount: {
          loginid:
            fallbackLoginId,

          email:
            record?.email,

          fullName:
            record?.fullName,

          balance:
            record?.balance,

          currency:
            record?.currency,

          accountType:
            record?.accountType,

          scopes:
            record?.scopes,
        },
      });

    return result.metadata;
  } catch (error: any) {
    logger.warn(
      '[DerivSync] User synchronization failed.',
      {
        error:
          error?.message ||
          String(error),
      },
    );

    if (record) {
      record.connectionStatus =
        'SYNC_FAILED';

      record.updatedAt =
        new Date().toISOString();

      derivConnectionsStore.set(
        cleanUserId,
        record,
      );
    }

    return {
      connected: false,
      connectionStatus:
        'SYNC_FAILED',
    };
  }
}

export function syncUserDeriv(
  userId: string,
): SafeDerivConnectionMetadata {
  const cleanUserId =
    cleanString(userId);

  const record =
    derivConnectionsStore.get(
      cleanUserId,
    );

  if (
    record &&
    record.connectionStatus !==
      'DISCONNECTED'
  ) {
    record.connectionStatus =
      'SYNCING';

    record.updatedAt =
      new Date().toISOString();

    derivConnectionsStore.set(
      cleanUserId,
      record,
    );

    void syncUserDerivAsync(
      cleanUserId,
    ).catch(
      (error: any) => {
        logger.warn(
          '[DerivSync] Background synchronization warning.',
          {
            error:
              error?.message ||
              String(error),
          },
        );
      },
    );
  }

  return getUserDerivConnection(
    cleanUserId,
  );
}

/* -------------------------------------------------------------------------- */
/* Account switching                                                          */
/* -------------------------------------------------------------------------- */

export async function switchUserDerivAccountAsync(
  userId: string,
  loginid: string,
): Promise<SafeDerivConnectionMetadata> {
  const cleanUserId =
    cleanString(userId);

  const cleanLoginId =
    cleanString(loginid);

  if (
    !isValidDerivAccountId(
      cleanLoginId,
    )
  ) {
    throw new Error(
      'Invalid Deriv account ID.',
    );
  }

  const record =
    derivConnectionsStore.get(
      cleanUserId,
    );

  if (!record) {
    throw new Error(
      'No active Deriv connection found.',
    );
  }

  if (!isUsableToken(record.accessToken)) {
    throw new Error(
      'No server-side Deriv access token is available for this connection.',
    );
  }

  /*
   * Switching accounts must be validated through the same authenticated
   * OTP flow. Never simply change the ID locally.
   */
  const discovery =
    await discoverDerivAccountsREST(
      record.accessToken,
      getDerivOAuthConfig().appId,
    );

  const selected =
    discovery.accounts.find(
      (account) =>
        account.loginid ===
        cleanLoginId,
    );

  if (!selected) {
    throw new Error(
      'Requested Deriv account was not returned by authenticated account discovery.',
    );
  }

  const otp =
    await requestDerivAccountOtp(
      cleanLoginId,
      record.accessToken,
      getDerivOAuthConfig().appId,
    );

  if (!otp.success || !otp.url) {
    throw new Error(
      otp.error ||
      'Unable to obtain authenticated WebSocket OTP for selected account.',
    );
  }

  const ws =
    await verifyDerivWebSocketWithOtp(
      otp.url,
    );

  if (!ws.success) {
    throw new Error(
      ws.error ||
      'Selected Deriv account WebSocket validation failed.',
    );
  }

  const now =
    new Date().toISOString();

  record.derivAccountId =
    cleanLoginId;

  record.accountType =
    selected.is_virtual
      ? 'demo'
      : 'real';

  record.currency =
    selected.currency;

  record.balance =
    selected.balance;

  record.email =
    selected.email ||
    record.email;

  record.fullName =
    selected.fullname ||
    record.fullName;

  record.updatedAt =
    now;

  record.lastSyncedAt =
    now;

  record.connectionStatus =
    'CONNECTED';

  derivConnectionsStore.set(
    cleanUserId,
    record,
  );

  derivConnectionsStore.set(
    cleanLoginId,
    record,
  );

  return toSafeMetadata(
    record,
  );
}

/* -------------------------------------------------------------------------- */
/* OAuth callback                                                             */
/* -------------------------------------------------------------------------- */

export async function handleDerivOAuthCallback(
  params: {
    code?: string;
    state?: string;

    /*
     * Supported only for backwards-compatible callers that already
     * possess the verifier server-side.
     */
    verifier?: string;

    cookieState?: string;

    redirectUri?: string;

    error?: string;
    errorDescription?: string;

    requestHost?: string;
    requestProtocol?: string;
  },
): Promise<{
  success: boolean;
  destination: string;

  errorMessage?: string;

  userId?: string;

  connectionRecord?:
    SafeDerivConnectionMetadata;

  rawAccountDetails?: {
    derivAccountId: string;
    email?: string;
    fullName?: string;
    balance?: number;
    accountType: 'demo' | 'real';
    currency: string;

    /*
     * Always blank in the callback result.
     */
    token: string;

    accountList?: Array<{
      loginid: string;
      account_type: string;
      currency: string;
      is_virtual: number;
      landing_company_name: string;
    }>;
  };
}> {
  cleanupExpiredTransactions();

  const {
    code,
    state,
    verifier,
    cookieState,
    error,
    errorDescription,
  } = params;

  if (error) {
    const message =
      cleanString(
        errorDescription ||
        error,
      ) ||
      'Deriv authorization failed.';

    logger.warn(
      '[DerivOAuth] Provider returned an authorization error.',
      {
        error:
          cleanString(error),
      },
    );

    return {
      success: false,

      destination:
        `/?auth_error=oauth_error&message=${encodeURIComponent(message)}`,

      errorMessage:
        `Deriv OAuth authorization error: ${message}`,
    };
  }

  if (!state) {
    return {
      success: false,

      destination:
        '/dashboard/error?error=invalid_state&message=Missing%20OAuth%20state',

      errorMessage:
        'Deriv OAuth callback is missing state.',
    };
  }

  const oauthConfig =
    getDerivOAuthConfig(
      params.requestHost,
      params.requestProtocol,
    );

  if (!oauthConfig.clientId) {
    return {
      success: false,

      destination:
        '/?auth_error=configuration&message=OAuth%20client%20ID%20is%20not%20configured',

      errorMessage:
        'DERIV_CLIENT_ID is not configured.',
    };
  }

  /* ---------------------------------------------------------------------- */
  /* Resolve transaction                                                     */
  /* ---------------------------------------------------------------------- */

  let transaction =
    oauthTransactionsStore.get(
      state,
    );

  /*
   * Vercel can execute callback on a different instance.
   * Signed cookie is therefore the authoritative fallback.
   */
  if (!transaction && cookieState) {
    const decoded =
      decodeOAuthStateCookie(
        cookieState,
      );

    if (
      decoded &&
      decoded.state === state
    ) {
      transaction =
        decoded;
    }
  }

  /*
   * A caller-supplied verifier is accepted only when state is still
   * explicitly present. It must never create a fake state.
   */
  if (
    !transaction &&
    verifier
  ) {
    const cleanVerifier =
      cleanString(verifier);

    if (cleanVerifier) {
      transaction = {
        state,
        codeVerifier:
          cleanVerifier,
        userId:
          `usr-${crypto.randomBytes(12).toString('hex')}`,
        action:
          'connect',
        destination:
          '/',
        redirectUri:
          oauthConfig.redirectUri,
        createdAt:
          Date.now(),
      };
    }
  }

  if (!transaction) {
    logger.warn(
      '[DerivOAuth] OAuth transaction could not be validated.',
      {
        hasState:
          Boolean(state),

        hasCookieState:
          Boolean(cookieState),
      },
    );

    return {
      success: false,

      destination:
        '/dashboard/error?error=invalid_state&message=OAuth%20session%20expired%20or%20state%20mismatch',

      errorMessage:
        'OAuth state expired or could not be verified.',
    };
  }

  if (
    transaction.state !== state
  ) {
    return {
      success: false,

      destination:
        '/dashboard/error?error=invalid_state&message=OAuth%20state%20mismatch',

      errorMessage:
        'OAuth state mismatch.',
    };
  }

  if (
    Date.now() -
    transaction.createdAt >
    OAUTH_STATE_TTL_MS
  ) {
    oauthTransactionsStore.delete(
      state,
    );

    return {
      success: false,

      destination:
        '/dashboard/error?error=expired_state&message=OAuth%20session%20expired',

      errorMessage:
        'OAuth transaction expired.',
    };
  }

  /*
   * Single-use state.
   */
  oauthTransactionsStore.delete(
    state,
  );

  if (!code) {
    return {
      success: false,

      destination:
        '/dashboard/error?error=missing_code&message=Authorization%20code%20missing',

      errorMessage:
        'Deriv OAuth callback did not contain an authorization code.',
    };
  }

  /* ---------------------------------------------------------------------- */
  /* PKCE token exchange                                                     */
  /* ---------------------------------------------------------------------- */

  const redirectUri =
    transaction.redirectUri ||
    oauthConfig.redirectUri;

  try {
    const tokenData =
      await exchangeCodeForToken(
        code,
        transaction.codeVerifier,
        redirectUri,
        oauthConfig.clientId,
        oauthConfig.clientSecret,
      );

    const accessToken =
      cleanString(
        tokenData?.access_token,
      );

    if (!isUsableToken(accessToken)) {
      logger.error(
        '[DerivOAuth] Token exchange succeeded without an access token.',
      );

      return {
        success: false,

        destination:
          '/?auth_error=token_failed&message=Missing%20access%20token',

        errorMessage:
          'Deriv did not return an access token.',
      };
    }

    const tokenExpiry =
      Number.isFinite(
        Number(tokenData?.expires_in),
      )
        ? new Date(
            Date.now() +
            Number(tokenData.expires_in) *
            1000,
          ).toISOString()
        : null;

    const scopes =
      normalizeScopes(
        tokenData?.scopes ||
        tokenData?.scope,

        ['trade', 'account_manage'],
      );

    /*
     * Account identity is NOT trusted from token query parameters.
     *
     * The authoritative account comes from authenticated REST discovery.
     */
    const hydration =
      await hydrateDerivAccount({
        userId:
          transaction.userId,

        accessToken,

        /*
         * This is App ID, NOT OAuth client_id.
         */
        appId:
          oauthConfig.appId,

        refreshToken:
          cleanString(
            tokenData?.refresh_token,
          ) || undefined,

        tokenExpiry,

        scopes,
      });

    if (
      !hydration.success ||
      !hydration.metadata.connected ||
      !hydration.metadata.derivAccountId
    ) {
      const message =
        hydration.error ||
        'Authenticated Deriv account discovery failed.';

      logger.error(
        '[DerivOAuth] Account hydration failed.',
        {
          userId:
            transaction.userId,

          error:
            message,
        },
      );

      return {
        success: false,

        destination:
          `/?auth_error=discovery_failed&message=${encodeURIComponent(message)}`,

        errorMessage:
          message,
      };
    }

    /*
     * Never return the OAuth access token.
     */
    return {
      success: true,

      userId:
        transaction.userId,

      destination:
        transaction.destination ||
        '/',

      connectionRecord:
        hydration.metadata,

      rawAccountDetails:
        hydration.rawAccountDetails,
    };
  } catch (error: any) {
    const message =
      error?.message ||
      'Deriv OAuth token exchange failed.';

    logger.error(
      '[DerivOAuth] OAuth callback processing failed.',
      {
        error:
          message,
      },
    );

    return {
      success: false,

      destination:
        `/?auth_error=oauth_failed&message=${encodeURIComponent(message)}`,

      errorMessage:
        `Deriv OAuth processing failed: ${message}`,
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Diagnostics                                                                */
/* -------------------------------------------------------------------------- */

export function getAdminDerivDiagnostics() {
  const config =
    getDerivOAuthConfig();

  const connections =
    Array.from(
      derivConnectionsStore.values(),
    )
      /*
       * The same record is cached under user ID and account ID.
       * Deduplicate before reporting.
       */
      .filter(
        (
          record,
          index,
          array,
        ) =>
          array.findIndex(
            (candidate) =>
              candidate.userId ===
                record.userId,
          ) === index,
      )
      .map(
        (record) => ({
          userId:
            record.userId,

          derivAccountId:
            record.derivAccountId,

          email:
            record.email,

          fullName:
            record.fullName,

          balance:
            record.balance,

          accountType:
            record.accountType,

          currency:
            record.currency,

          connectionStatus:
            record.connectionStatus,

          scopes:
            record.scopes,

          hasAccessToken:
            Boolean(
              record.accessToken,
            ),

          hasRefreshToken:
            Boolean(
              record.refreshToken,
            ),

          tokenExpiry:
            record.tokenExpiry,

          createdAt:
            record.createdAt,

          updatedAt:
            record.updatedAt,

          lastSyncedAt:
            record.lastSyncedAt,
        }),
      );

  return {
    oauthConfig: {
      /*
       * Safe to expose.
       */
      clientId:
        config.clientId,

      /*
       * App ID is not a secret.
       */
      appId:
        config.appId,

      redirectUri:
        config.redirectUri,

      authEndpoint:
        config.authBaseUrl,

      tokenEndpoint:
        config.tokenEndpoint,

      scopesAllowed:
        config.scopes
          .split(/[\s,]+/)
          .filter(Boolean),
    },

    activeConnectionsCount:
      connections.filter(
        (connection) =>
          connection.connectionStatus ===
          'CONNECTED',
      ).length,

    totalRegisteredConnections:
      connections.length,

    connections,
  };
}

export function getUserDerivDiagnostics(
  userId: string,
) {
  const record =
    derivConnectionsStore.get(
      cleanString(userId),
    );

  return {
    userId:
      cleanString(userId),

    derivAccountId:
      record?.derivAccountId ||
      null,

    connectionStatus:
      record?.connectionStatus ||
      'DISCONNECTED',

    currency:
      record?.currency ||
      'USD',

    balance:
      typeof record?.balance === 'number'
        ? record.balance
        : null,

    accountType:
      record?.accountType ||
      null,

    hasAccessToken:
      Boolean(
        record?.accessToken,
      ),

    lastSyncedAt:
      record?.lastSyncedAt ||
      null,

    timestamp:
      new Date().toISOString(),
  };
}

/* -------------------------------------------------------------------------- */
/* Balance & Reconnect Gateway Helpers                                        */
/* -------------------------------------------------------------------------- */

/**
 * Asynchronously fetch active Deriv balance for a user.
 */
export async function fetchUserDerivBalanceAsync(
  userId: string,
): Promise<{
  success: boolean;
  balance?: number;
  currency?: string;
  loginid?: string;
  error?: string;
}> {
  const cleanUserId = cleanString(userId);
  if (!cleanUserId) {
    return {
      success: false,
      error: 'Invalid user ID',
    };
  }

  const meta = await syncUserDerivAsync(cleanUserId);
  if (meta.connected && typeof meta.balance === 'number') {
    return {
      success: true,
      balance: meta.balance,
      currency: meta.currency || 'USD',
      loginid: meta.derivAccountId || cleanUserId,
    };
  }

  const record = derivConnectionsStore.get(cleanUserId);
  if (record && typeof record.balance === 'number') {
    return {
      success: true,
      balance: record.balance,
      currency: record.currency || 'USD',
      loginid: record.derivAccountId || cleanUserId,
    };
  }

  return {
    success: false,
    error:
      meta.connectionStatus === 'DISCONNECTED'
        ? 'User is disconnected from Deriv'
        : 'Unable to retrieve active balance from gateway',
  };
}

/**
 * Reconnect and re-sync user's Deriv session.
 */
export async function reconnectUserDerivAsync(
  userId: string,
): Promise<SafeDerivConnectionMetadata> {
  const cleanUserId = cleanString(userId);
  if (!cleanUserId) {
    return {
      connected: false,
      connectionStatus: 'DISCONNECTED',
    };
  }
  return syncUserDerivAsync(cleanUserId);
}
