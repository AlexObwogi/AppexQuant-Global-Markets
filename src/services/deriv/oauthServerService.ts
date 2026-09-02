/**
 * AppexQuant Markets Global - Server-Side Deriv OAuth 2.0 PKCE Engine
 * Handles cryptographically secure PKCE flow, state validation, server-side token exchange,
 * WebSocket authorization, database persistence, and multi-user connection management.
 * Strictly server-authoritative token exchange: access tokens are never returned to client URLs.
 */

export const runtime = 'nodejs'; // REQUIRED: Node runtime for WebSocket package compatibility

import crypto from 'crypto';
import NodeWebSocket from 'ws';
import { derivGateway } from './DerivGateway.ts';
import { syncDerivConnectionToSupabase } from '../../lib/supabase.ts';
import { dbQueries } from '../../lib/db/prisma.ts';
import { logger } from '../../observability/logger.ts';
import { buildAuthUrl, DERIV_OAUTH_SCOPE, exchangeCodeForToken, getDerivAppId } from '../oauthService.ts';
import { isValidDerivAccountId, DerivSyncState, transitionSyncState } from './syncStateMachine.ts';
import {
  generatePKCE,
  generateCodeVerifier,
  generateCodeChallenge,
  deriveCodeChallenge,
  generateState,
  base64UrlEncode,
  base64UrlDecode,
  encodeOAuthStateCookie,
  decodeOAuthStateCookie,
  PKCEPair,
  OAuthStatePayload,
} from './pkce.ts';

export {
  generatePKCE,
  generateCodeVerifier,
  generateCodeChallenge,
  deriveCodeChallenge,
  generateState,
  base64UrlEncode,
  base64UrlDecode,
  encodeOAuthStateCookie,
  decodeOAuthStateCookie,
};
export type { PKCEPair, OAuthStatePayload };

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
  connectionStatus: 'CONNECTED' | 'CONNECTING' | 'SYNCING' | 'SYNC_FAILED' | 'DISCONNECTED' | 'RECONNECT_REQUIRED' | 'ERROR';
  scopes: string[];
  accessToken: string; // SERVER-SIDE ONLY - Never returned to frontend
  refreshToken?: string;
  tokenExpiry?: string | null;
  createdAt: string;
  updatedAt: string;
  lastSyncedAt: string;
}

export interface SafeDerivConnectionMetadata {
  connected: boolean;
  userId?: string;
  loginid?: string;
  accountId?: string;
  derivAccountId?: string;
  email?: string;
  fullName?: string;
  balance?: number;
  accountType?: 'demo' | 'real';
  currency?: string;
  connectionStatus: 'CONNECTED' | 'CONNECTING' | 'SYNCING' | 'SYNC_FAILED' | 'DISCONNECTED' | 'RECONNECT_REQUIRED' | 'ERROR';
  scopes?: string[];
  lastSync?: string;
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
  appId?: string;
  refreshToken?: string;
  tokenExpiry?: string | null;
  scopes?: string[];
  accountInfo?: {
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

// In-memory store for active PKCE OAuth transactions (TTL: 10 minutes)
const oauthTransactionsStore = new Map<string, OAuthTransaction>();

// Server-side isolated connection store per user
const derivConnectionsStore = new Map<string, DerivConnectionRecord>();

/**
 * Cleanup expired OAuth transactions older than 10 minutes
 */
function cleanupExpiredTransactions(): void {
  const now = Date.now();
  const maxAge = 10 * 60 * 1000;
  for (const [state, tx] of oauthTransactionsStore.entries()) {
    if (now - tx.createdAt > maxAge) {
      oauthTransactionsStore.delete(state);
    }
  }
}

/**
 * Get configured Deriv OAuth credentials & endpoints
 */
export function getDerivOAuthConfig(requestHost?: string, requestProtocol?: string) {
  const clientId = getDerivAppId();
  const clientSecret = (process.env.DERIV_CLIENT_SECRET || process.env.CLIENT_SECRET || '').trim();

  const proto = requestProtocol || (requestHost?.includes('localhost') ? 'http' : 'https');
  let parsedHost = 'localhost:3000';
  if (requestHost) {
    parsedHost = requestHost;
  } else if (process.env.APP_URL) {
    try {
      const rawAppUrl = process.env.APP_URL.trim();
      const formattedAppUrl = rawAppUrl.includes('://') ? rawAppUrl : `https://${rawAppUrl}`;
      parsedHost = new URL(formattedAppUrl).host;
    } catch {
      parsedHost = 'localhost:3000';
    }
  }

  let redirectUri = `${proto}://${parsedHost}/api/auth/deriv/callback`;

  const configuredUri = process.env.OAUTH_REDIRECT_URI || process.env.REDIRECT_URI || process.env.VITE_REDIRECT_URI;
  if (configuredUri && typeof configuredUri === 'string' && configuredUri.trim()) {
    redirectUri = configuredUri.trim();
  } else if (process.env.NEXT_PUBLIC_SITE_URL && typeof process.env.NEXT_PUBLIC_SITE_URL === 'string' && process.env.NEXT_PUBLIC_SITE_URL.trim()) {
    redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL.trim().replace(/\/$/, '')}/api/auth/deriv/callback`;
  }

  const scopes = process.env.DERIV_SCOPES || 'trade account_manage';

  return {
    clientId,
    clientSecret,
    redirectUri,
    scopes,
    authBaseUrl: process.env.DERIV_AUTH_URL || 'https://auth.deriv.com/oauth2/auth',
    tokenEndpoint: process.env.DERIV_TOKEN_ENDPOINT || 'https://auth.deriv.com/oauth2/token',
  };
}

/**
 * Initiate a new Deriv OAuth 2.0 PKCE Flow
 */
export function initiateDerivOAuth(params: {
  userId?: string;
  action?: 'connect' | 'signup';
  destination?: string;
  requestHost?: string;
  requestProtocol?: string;
}): { authUrl: string; state: string; cookieValue: string; redirectUri: string } {
  cleanupExpiredTransactions();

  const userId = params.userId || `usr-${crypto.randomBytes(6).toString('hex')}`;
  const action = params.action || 'connect';
  const destination = params.destination || '/';
  const oauthConfig = getDerivOAuthConfig(params.requestHost, params.requestProtocol);

  const { codeVerifier, codeChallenge } = generatePKCE();
  const state = generateState();

  const transaction: OAuthTransaction = {
    state,
    codeVerifier,
    userId,
    action,
    destination,
    redirectUri: oauthConfig.redirectUri,
    createdAt: Date.now(),
  };

  oauthTransactionsStore.set(state, transaction);
  const cookieValue = encodeOAuthStateCookie(transaction);

  const authUrl = buildAuthUrl({
    appId: oauthConfig.clientId,
    redirectUri: oauthConfig.redirectUri,
    scope: DERIV_OAUTH_SCOPE,
    state,
    codeChallenge,
    codeChallengeMethod: 'S256',
    action,
  });

  logger.info('[DerivOAuth] Initiated PKCE flow', { userId, state, redirectUri: oauthConfig.redirectUri });

  return { authUrl, state, cookieValue, redirectUri: oauthConfig.redirectUri };
}

/**
 * Authorize access token via Deriv WebSocket
 * Strictly connects to wss://ws.derivws.com/websockets/v3?app_id=<APP_ID>
 * Sends {"authorize": "TOKEN", "req_id": ...} and waits specifically for msg_type === 'authorize'.
 * Rejects immediately on error responses or invalid loginids.
 */
export async function authorizeDerivWebSocket(
  token: string,
  appId: string = getDerivAppId(),
  timeoutMs: number = 10000
): Promise<{ success: boolean; profile?: DerivAccountProfileData; error?: string; errorCode?: string }> {
  const cleanToken = token ? token.trim() : '';
  if (!cleanToken || cleanToken.startsWith('usr-') || cleanToken.startsWith('user-')) {
    logger.warn('[DerivOAuth] Invalid token supplied for WebSocket authorization');
    return { success: false, error: 'Invalid access token for WebSocket authorization', errorCode: 'INVALID_TOKEN' };
  }

  const cleanAppId = (appId || getDerivAppId()).toString().trim().replace(/['"]/g, '') || getDerivAppId();
  const wsUrl = `wss://ws.derivws.com/websockets/v3?app_id=${cleanAppId}`;
  const reqId = crypto.randomInt(100000, 999999);

  return new Promise((resolve) => {
    let ws: any = null;
    let settled = false;

    const finish = (result: { success: boolean; profile?: DerivAccountProfileData; error?: string; errorCode?: string }) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (ws) {
        try {
          ws.close();
        } catch {}
      }
      resolve(result);
    };

    const timer = setTimeout(() => {
      logger.warn('[DerivOAuth] WebSocket authorize timeout', { reqId, timeoutMs });
      finish({ success: false, error: `WebSocket authorize timeout after ${timeoutMs}ms`, errorCode: 'TIMEOUT' });
    }, timeoutMs);

    try {
      const WSImpl: any = (NodeWebSocket as any).default || NodeWebSocket;
      ws = new WSImpl(wsUrl);
    } catch (err: any) {
      finish({ success: false, error: `WebSocket initialization error: ${err?.message || String(err)}`, errorCode: 'WS_CONSTRUCT_ERROR' });
      return;
    }

    ws.on('open', () => {
      try {
        logger.info('[DerivOAuth] WebSocket connected, sending authorize request', { reqId, appId: cleanAppId });
        ws.send(
          JSON.stringify({
            authorize: cleanToken,
            req_id: reqId,
          })
        );
      } catch (err: any) {
        finish({ success: false, error: `Failed to send authorize request: ${err?.message || String(err)}`, errorCode: 'SEND_FAILED' });
      }
    });

    ws.on('message', (data: any) => {
      try {
        const raw = typeof data === 'string' ? data : data?.toString('utf8') || '';
        const parsed = JSON.parse(raw);

        // Immediate rejection on error
        if (parsed.error) {
          const errCode = parsed.error.code || 'AUTHORIZE_REJECTED';
          const errMsg = parsed.error.message || 'Authorization rejected by Deriv';
          logger.warn('[DerivOAuth] WebSocket authorize rejected by Deriv', { reqId, errCode, errMsg });
          finish({ success: false, error: errMsg, errorCode: errCode });
          return;
        }

        // Specifically process authorize response
        if (parsed.msg_type === 'authorize' || parsed.authorize) {
          const authObj = parsed.authorize || parsed;
          if (authObj.error) {
            const errCode = authObj.error.code || 'AUTHORIZE_REJECTED';
            const errMsg = authObj.error.message || 'Authorization failed';
            logger.warn('[DerivOAuth] Inner authorize object contains error', { reqId, errCode, errMsg });
            finish({ success: false, error: errMsg, errorCode: errCode });
            return;
          }

          const loginid = authObj.loginid || authObj.id;
          if (!loginid || !isValidDerivAccountId(loginid)) {
            logger.warn('[DerivOAuth] Missing or invalid loginid in authorize response', { reqId, loginid });
            finish({ success: false, error: `Invalid or unverified loginid received from Deriv: ${loginid}`, errorCode: 'INVALID_LOGINID' });
            return;
          }

          const currency = authObj.currency || 'USD';
          const balance = typeof authObj.balance === 'number' ? authObj.balance : parseFloat(authObj.balance || '0');
          const isVirtual = authObj.is_virtual === 1 || authObj.is_virtual === true || loginid.startsWith('VR') ? 1 : 0;
          const landingCompanyName = authObj.landing_company_name;
          const scopes = Array.isArray(authObj.scopes) ? authObj.scopes : authObj.scope ? authObj.scope.split(/[\s,]+/) : ['trade', 'account_manage'];
          const accountList = authObj.account_list || [];

          logger.info('[DerivOAuth] WebSocket authorize verified successfully', { reqId, loginid, currency, isVirtual });

          const profile: DerivAccountProfileData = {
            loginid,
            currency,
            balance: isNaN(balance) ? 0 : balance,
            is_virtual: isVirtual,
            landing_company_name: landingCompanyName,
            scopes,
            email: authObj.email,
            fullname: authObj.fullname || authObj.full_name,
            account_list: accountList,
          };

          finish({ success: true, profile });
        }
      } catch (err: any) {
        finish({ success: false, error: `Message parsing failed: ${err?.message || String(err)}`, errorCode: 'PARSE_ERROR' });
      }
    });

    ws.on('error', (err: any) => {
      logger.warn('[DerivOAuth] WebSocket error during authorize', { reqId, error: err?.message || String(err) });
      finish({ success: false, error: `WebSocket error: ${err?.message || String(err)}`, errorCode: 'WS_ERROR' });
    });

    ws.on('close', (code: number) => {
      if (!settled && code !== 1000) {
        logger.warn('[DerivOAuth] WebSocket closed unexpectedly', { reqId, code });
        finish({ success: false, error: `WebSocket closed unexpectedly (code: ${code})`, errorCode: 'WS_CLOSED' });
      }
    });
  });
}

/**
 * Canonical Deriv Account Hydration & Reconciliation Authority
 * Responsibilities:
 * 1. WebSocket authorization & verification
 * 2. Account type, currency, and balance derivation
 * 3. Prisma database persistence
 * 4. Supabase sync
 * 5. In-memory connection store update
 * 6. Gateway token update
 * 7. State machine transitions
 */
export async function hydrateDerivAccount(params: HydrateDerivAccountParams): Promise<HydrateDerivAccountResult> {
  const { userId, accessToken, appId, refreshToken, tokenExpiry, accountInfo } = params;
  const cleanToken = accessToken ? accessToken.trim() : '';

  if (!cleanToken) {
    logger.warn('[DerivOAuth] Hydration aborted: Missing access token', { userId });
    return {
      success: false,
      metadata: {
        connected: false,
        connectionStatus: 'SYNC_FAILED',
      },
      error: 'Missing access token for Deriv account hydration',
    };
  }

  const oauthConfig = getDerivOAuthConfig();
  const effectiveAppId = appId || oauthConfig.clientId || getDerivAppId();

  logger.info('[DerivOAuth] Starting account hydration', { userId });

  try {
    transitionSyncState(DerivSyncState.DISCONNECTED, DerivSyncState.ACCOUNT_DISCOVERY_STARTED, {
      derivAccountId: '',
      persisted: false,
      discoverySucceeded: false,
    });
  } catch {}

  // 1. WebSocket Authorization & Verification
  const wsAuthRes = await authorizeDerivWebSocket(cleanToken, effectiveAppId).catch((err) => {
    logger.error('[DerivOAuth] Exception during WebSocket authorize', { userId, error: err?.message || String(err) });
    return { success: false, error: err?.message || String(err), errorCode: 'WS_ERROR', profile: undefined };
  });

  if (!wsAuthRes.success || !wsAuthRes.profile || !wsAuthRes.profile.loginid || !isValidDerivAccountId(wsAuthRes.profile.loginid)) {
    const errorMsg = wsAuthRes.error || `Invalid or unverified loginid: ${wsAuthRes.profile?.loginid}`;
    logger.error('[DerivOAuth] Account verification failed during WebSocket authorize', { userId, error: errorMsg });

    try {
      transitionSyncState(DerivSyncState.ACCOUNT_DISCOVERY_STARTED, DerivSyncState.ACCOUNT_DISCOVERY_FAILED, {
        derivAccountId: wsAuthRes.profile?.loginid || '',
        persisted: false,
        discoverySucceeded: false,
      });
    } catch {}

    const nowIso = new Date().toISOString();
    const failedRecord: DerivConnectionRecord = {
      userId,
      derivAccountId: '',
      accountType: 'real',
      currency: 'USD',
      connectionStatus: 'SYNC_FAILED',
      scopes: [],
      accessToken: cleanToken,
      createdAt: nowIso,
      updatedAt: nowIso,
      lastSyncedAt: nowIso,
    };
    derivConnectionsStore.set(userId, failedRecord);

    return {
      success: false,
      metadata: {
        connected: false,
        connectionStatus: 'SYNC_FAILED',
      },
      error: errorMsg,
    };
  }

  const profile = wsAuthRes.profile;
  const derivAccountId = profile.loginid;

  try {
    transitionSyncState(DerivSyncState.ACCOUNT_DISCOVERY_STARTED, DerivSyncState.ACCOUNT_DISCOVERED, {
      derivAccountId,
      persisted: false,
      discoverySucceeded: true,
    });
    transitionSyncState(DerivSyncState.ACCOUNT_DISCOVERED, DerivSyncState.ACCOUNT_VERIFIED, {
      derivAccountId,
      persisted: false,
      discoverySucceeded: true,
    });
  } catch {}

  const isVirtual = Boolean(profile.is_virtual) ? 1 : 0;
  const accountType: 'demo' | 'real' = isVirtual ? 'demo' : derivAccountId.startsWith('VR') ? 'demo' : 'real';
  const currency = profile.currency || accountInfo?.currency || 'USD';
  const balance = typeof profile.balance === 'number' ? profile.balance : accountInfo?.balance || 0;
  const email = profile.email || accountInfo?.email || '';
  const fullName = profile.fullname || accountInfo?.fullName || '';
  const scopes = profile.scopes || params.scopes || accountInfo?.scopes || ['trade', 'account_manage'];
  const accountList = profile.account_list || accountInfo?.accountList;
  const nowIso = new Date().toISOString();

  // 2. Database Persistence (Prisma)
  try {
    await dbQueries.upsertDerivAccount({
      id: derivAccountId,
      userId,
      accountType,
      currency,
      balance,
      equity: balance,
      isVirtual: Boolean(isVirtual),
      status: 'ACTIVE',
      lastSyncedAt: nowIso,
    });

    await dbQueries.recordAccountSnapshot({
      derivAccountId,
      userId,
      balance,
      equity: balance,
      currency,
      timestamp: new Date(),
    });

    await dbQueries.mapDerivAccountToUserSession(derivAccountId, userId);

    try {
      transitionSyncState(DerivSyncState.ACCOUNT_VERIFIED, DerivSyncState.ACCOUNT_PERSISTED, {
        derivAccountId,
        persisted: true,
        discoverySucceeded: true,
      });
    } catch {}

    logger.info('[DerivOAuth] Account persisted to database successfully', { userId, loginid: derivAccountId });
  } catch (dbErr: any) {
    logger.error('[DerivOAuth] Database persistence failed during account hydration', { userId, loginid: derivAccountId, error: dbErr?.message });
    try {
      transitionSyncState(DerivSyncState.ACCOUNT_VERIFIED, DerivSyncState.ACCOUNT_PERSIST_FAILED, {
        derivAccountId,
        persisted: false,
        discoverySucceeded: true,
      });
    } catch {}
    derivConnectionsStore.delete(userId);
    throw new Error(`Database persistence failure: ${dbErr?.message || String(dbErr)}`);
  }

  // 3. Supabase Sync (Fire-and-forget)
  syncDerivConnectionToSupabase({
    userId,
    derivAccountId,
    accountType,
    currency,
    connectionStatus: 'CONNECTED',
    scopes,
    accessToken: cleanToken,
    refreshToken,
    tokenExpiry,
  }).catch((err) => {
    logger.warn('[DerivOAuth] Supabase sync background notice', { userId, error: err?.message || String(err) });
  });

  // 4. Memory Store & Gateway Token Update
  try {
    transitionSyncState(DerivSyncState.ACCOUNT_PERSISTED, DerivSyncState.CONNECTED, {
      derivAccountId,
      persisted: true,
      discoverySucceeded: true,
    });
  } catch {}

  const connectionRecord: DerivConnectionRecord = {
    userId,
    derivAccountId,
    email,
    fullName,
    balance,
    accountType,
    currency,
    connectionStatus: 'CONNECTED',
    scopes,
    accessToken: cleanToken,
    refreshToken,
    tokenExpiry,
    createdAt: nowIso,
    updatedAt: nowIso,
    lastSyncedAt: nowIso,
  };

  derivConnectionsStore.set(userId, connectionRecord);
  derivGateway.setAuthToken(cleanToken).catch(() => {});

  const metadata: SafeDerivConnectionMetadata = {
    connected: true,
    userId,
    loginid: derivAccountId,
    accountId: derivAccountId,
    derivAccountId,
    email,
    fullName,
    balance,
    accountType,
    currency,
    connectionStatus: 'CONNECTED',
    scopes,
    lastSync: nowIso,
    lastSyncedAt: nowIso,
    accountList,
  };

  return {
    success: true,
    metadata,
    profile,
    rawAccountDetails: {
      derivAccountId,
      email,
      fullName,
      balance,
      accountType,
      currency,
      token: cleanToken,
      accountList,
    },
  };
}

/**
 * Process OAuth Callback & Perform Server-Side Token Exchange
 */
export async function handleDerivOAuthCallback(params: {
  code?: string;
  state?: string;
  verifier?: string;
  redirectUri?: string;
  cookieState?: string;
  error?: string;
  errorDescription?: string;
  requestHost?: string;
  requestProtocol?: string;
}): Promise<{
  success: boolean;
  destination: string;
  errorMessage?: string;
  userId?: string;
  loginid?: string;
  accountId?: string;
  derivAccountId?: string;
  accountType?: 'demo' | 'real';
  currency?: string;
  scopes?: string[];
  connectionRecord?: SafeDerivConnectionMetadata;
  rawAccountDetails?: {
    derivAccountId: string;
    loginid: string;
    accountId: string;
    email?: string;
    fullName?: string;
    balance?: number;
    accountType: 'demo' | 'real';
    currency: string;
    scopes: string[];
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

  const { code, state, cookieState, error, errorDescription } = params;

  if (error) {
    const detailMsg = errorDescription || error || 'Deriv returned an authorization error.';
    logger.warn('[DerivOAuth] Callback received authorization error from Deriv', { error, errorDescription, state });
    return {
      success: false,
      destination: `/dashboard/error?error=${encodeURIComponent(error)}&message=${encodeURIComponent(detailMsg)}`,
      errorMessage: `Deriv OAuth Authorization Error: ${detailMsg} (${error})`,
    };
  }

  const oauthConfig = getDerivOAuthConfig(params.requestHost, params.requestProtocol);

  // 1. Validate Code
  if (!code) {
    logger.warn('[DerivOAuth] Missing authorization code in callback');
    return {
      success: false,
      destination: '/dashboard/error?error=missing_code&message=Authorization%20code%20was%20missing',
      errorMessage: 'Deriv OAuth Error: Authorization code was missing in callback.',
    };
  }

  // 2. Validate State
  if (!state) {
    logger.warn('[DerivOAuth] Missing state parameter in callback');
    return {
      success: false,
      destination: '/dashboard/error?error=missing_state&message=OAuth%20state%20parameter%20was%20missing',
      errorMessage: 'Deriv OAuth State Error: Missing state parameter in callback.',
    };
  }

  let transaction: OAuthTransaction | undefined;
  if (state) {
    transaction = oauthTransactionsStore.get(state);
  }

  if (!transaction && cookieState) {
    const decodedTx = decodeOAuthStateCookie<OAuthTransaction>(cookieState);
    if (decodedTx && decodedTx.userId && (!state || decodedTx.state === state)) {
      transaction = {
        ...decodedTx,
        userId: decodedTx.userId,
        action: decodedTx.action || 'connect',
        destination: decodedTx.destination || '/',
        redirectUri: decodedTx.redirectUri || oauthConfig.redirectUri,
      };
    }
  }

  if (!transaction) {
    logger.warn('[DerivOAuth] Invalid state or expired OAuth transaction', { state, hasCookieState: Boolean(cookieState) });
    return {
      success: false,
      destination: '/dashboard/error?error=invalid_state&message=OAuth%20session%20expired%20or%20state%20mismatch',
      errorMessage: 'Deriv OAuth State Error: OAuth transaction state expired or could not be verified. Please initiate login again.',
    };
  }

  if (state) {
    oauthTransactionsStore.delete(state);
  }

  // 3. Validate PKCE Verifier
  const codeVerifier = transaction.codeVerifier?.trim();
  if (!codeVerifier || codeVerifier.length < 43) {
    logger.error('[DerivOAuth] Invalid or missing PKCE code verifier', { state });
    return {
      success: false,
      destination: '/dashboard/error?error=invalid_verifier&message=PKCE%20verifier%20missing%20or%20invalid',
      errorMessage: 'Deriv OAuth PKCE Error: PKCE code verifier was missing or invalid.',
    };
  }

  // 4. Token Exchange via exchangeCodeForToken
  let tokenData: any;
  try {
    tokenData = await exchangeCodeForToken(
      code,
      transaction.codeVerifier,
      transaction.redirectUri,
      oauthConfig.clientId,
      oauthConfig.clientSecret
    );
  } catch (exErr: any) {
    const specificReason = `Deriv Token Exchange Error: ${exErr?.message || 'Token exchange failed'}`;
    logger.error('[DerivOAuth] Token exchange failed', { error: exErr?.message, state });
    return {
      success: false,
      destination: `/?auth_error=token_failed&message=${encodeURIComponent(specificReason)}`,
      errorMessage: specificReason,
    };
  }

  const resolvedAccessToken = tokenData?.access_token || tokenData?.token1 || tokenData?.token;
  if (!resolvedAccessToken) {
    logger.error('[DerivOAuth] Token exchange response missing access token', { state });
    return {
      success: false,
      destination: '/?auth_error=token_failed&message=Missing%20access%20token%20in%20response',
      errorMessage: 'Deriv OAuth Error: Access token was missing in token exchange response.',
    };
  }

  const tokenExpiryDate = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
    : null;

  const tokenScopes = Array.isArray(tokenData.scopes)
    ? tokenData.scopes
    : tokenData.scope
    ? tokenData.scope.split(/[\s,]+/)
    : ['trade', 'account_manage', 'payments'];

  // 5. Account Verification & Hydration via hydrateDerivAccount
  const hydrationResult = await hydrateDerivAccount({
    userId: transaction.userId,
    accessToken: resolvedAccessToken,
    appId: oauthConfig.clientId,
    refreshToken: tokenData.refresh_token,
    tokenExpiry: tokenExpiryDate,
    scopes: tokenScopes,
  });

  if (!hydrationResult.success || !hydrationResult.metadata?.connected || !hydrationResult.metadata?.derivAccountId || !isValidDerivAccountId(hydrationResult.metadata.derivAccountId)) {
    const discError = hydrationResult.error || 'Failed to verify account identifier via WebSocket authorize.';
    logger.error('[DerivOAuth] Account verification failed after token exchange', { error: discError, userId: transaction.userId });
    return {
      success: false,
      destination: `/?auth_error=discovery_failed&message=${encodeURIComponent(discError)}`,
      errorMessage: `Deriv Account Discovery Failure: ${discError}`,
    };
  }

  const verifiedLoginId = hydrationResult.metadata.derivAccountId;
  const accountType: 'demo' | 'real' = hydrationResult.metadata.accountType || (verifiedLoginId.startsWith('VR') ? 'demo' : 'real');
  const currency = hydrationResult.metadata.currency || 'USD';
  const scopes = hydrationResult.metadata.scopes || tokenScopes;

  logger.info('[DerivOAuth] OAuth callback processed successfully', {
    userId: transaction.userId,
    loginid: verifiedLoginId,
    accountType,
    currency,
  });

  return {
    success: true,
    userId: transaction.userId,
    loginid: verifiedLoginId,
    accountId: verifiedLoginId,
    derivAccountId: verifiedLoginId,
    accountType,
    currency,
    scopes,
    destination: transaction.destination || '/',
    connectionRecord: hydrationResult.metadata,
    rawAccountDetails: {
      derivAccountId: verifiedLoginId,
      loginid: verifiedLoginId,
      accountId: verifiedLoginId,
      currency,
      accountType,
      scopes,
      token: resolvedAccessToken,
      balance: hydrationResult.metadata?.balance,
      email: hydrationResult.metadata?.email,
      fullName: hydrationResult.metadata?.fullName,
      accountList: hydrationResult.metadata?.accountList,
    },
  };
}

/**
 * Access internal connection record by user ID
 */
export function getDerivConnectionRecord(userId: string): DerivConnectionRecord | undefined {
  return derivConnectionsStore.get(userId);
}

/**
 * Get User's Safe Connection Metadata (Sanitized: NO TOKENS)
 */
export async function getUserDerivConnectionAsync(userId: string): Promise<SafeDerivConnectionMetadata> {
  let record = derivConnectionsStore.get(userId);
  if (!record || record.connectionStatus === 'DISCONNECTED') {
    try {
      const dbAccount = await dbQueries.getDerivAccountByUserId(userId);
      if (dbAccount && isValidDerivAccountId(dbAccount.id)) {
        const balance = Number(dbAccount.balance);
        const nowIso = new Date().toISOString();
        const lastSyncIso = dbAccount.lastSyncedAt ? new Date(dbAccount.lastSyncedAt).toISOString() : nowIso;
        record = {
          userId: dbAccount.userId || userId,
          derivAccountId: dbAccount.id,
          accountType: dbAccount.accountType as any,
          currency: dbAccount.currency,
          balance,
          connectionStatus: 'CONNECTED',
          scopes: ['trade', 'account_manage'],
          accessToken: '',
          createdAt: lastSyncIso,
          updatedAt: nowIso,
          lastSyncedAt: lastSyncIso,
        };
        derivConnectionsStore.set(userId, record);
        derivConnectionsStore.set(dbAccount.id, record);
      }
    } catch {}
  }

  if (!record || record.connectionStatus === 'DISCONNECTED') {
    return {
      connected: false,
      connectionStatus: 'DISCONNECTED',
    };
  }

  return {
    connected: record.connectionStatus === 'CONNECTED',
    userId: record.userId,
    loginid: record.derivAccountId,
    accountId: record.derivAccountId,
    derivAccountId: record.derivAccountId,
    email: record.email,
    fullName: record.fullName,
    balance: record.balance,
    accountType: record.accountType,
    currency: record.currency,
    connectionStatus: record.connectionStatus,
    scopes: record.scopes,
    lastSync: record.lastSyncedAt,
    lastSyncedAt: record.lastSyncedAt,
  };
}

/**
 * Synchronous getter for connection metadata
 */
export function getUserDerivConnection(userId: string): SafeDerivConnectionMetadata {
  const record = derivConnectionsStore.get(userId);
  if (!record || record.connectionStatus === 'DISCONNECTED') {
    return {
      connected: false,
      connectionStatus: 'DISCONNECTED',
    };
  }

  return {
    connected: record.connectionStatus === 'CONNECTED',
    userId: record.userId,
    loginid: record.derivAccountId,
    accountId: record.derivAccountId,
    derivAccountId: record.derivAccountId,
    email: record.email,
    fullName: record.fullName,
    balance: record.balance,
    accountType: record.accountType,
    currency: record.currency,
    connectionStatus: record.connectionStatus,
    scopes: record.scopes,
    lastSync: record.lastSyncedAt,
    lastSyncedAt: record.lastSyncedAt,
  };
}

/**
 * Connect Deriv Account using secure API Token
 */
export async function connectUserWithApiTokenAsync(userId: string, apiToken: string): Promise<SafeDerivConnectionMetadata> {
  const trimmed = apiToken.trim();
  const result = await hydrateDerivAccount({
    userId,
    accessToken: trimmed,
  });
  return result.metadata;
}

export function connectUserWithApiToken(userId: string, apiToken: string): SafeDerivConnectionMetadata {
  const trimmed = apiToken.trim();
  const nowIso = new Date().toISOString();

  const record: DerivConnectionRecord = {
    userId,
    derivAccountId: '',
    accountType: 'real',
    currency: 'USD',
    connectionStatus: 'CONNECTING',
    scopes: ['trade', 'account_manage'],
    accessToken: trimmed,
    createdAt: nowIso,
    updatedAt: nowIso,
    lastSyncedAt: nowIso,
  };

  derivConnectionsStore.set(userId, record);

  hydrateDerivAccount({
    userId,
    accessToken: trimmed,
  }).catch((err) => {
    logger.warn('[DerivOAuth] Background API token hydration notice', { userId, error: err?.message || String(err) });
  });

  return getUserDerivConnection(userId);
}

/**
 * Disconnect Deriv Account for User and clear sensitive credentials
 */
export function disconnectUserDeriv(userId: string): boolean {
  const record = derivConnectionsStore.get(userId);
  if (record) {
    record.connectionStatus = 'DISCONNECTED';
    record.accessToken = '';
    record.refreshToken = undefined;
    record.tokenExpiry = undefined;
    record.updatedAt = new Date().toISOString();
    derivConnectionsStore.set(userId, record);
    logger.info('[DerivOAuth] User disconnected and access tokens cleared', { userId });
    return true;
  }
  return false;
}

/**
 * Sync Deriv Account Metadata Async Pipeline
 */
export async function syncUserDerivAsync(userId: string, providedToken?: string): Promise<SafeDerivConnectionMetadata> {
  const record = derivConnectionsStore.get(userId);
  const tokenToUse = providedToken || record?.accessToken;

  if (!tokenToUse) {
    return {
      connected: false,
      connectionStatus: 'DISCONNECTED',
    };
  }

  if (record) {
    record.connectionStatus = 'SYNCING';
    record.updatedAt = new Date().toISOString();
    derivConnectionsStore.set(userId, record);
  }

  try {
    const hydrationResult = await hydrateDerivAccount({
      userId,
      accessToken: tokenToUse,
      refreshToken: record?.refreshToken,
      tokenExpiry: record?.tokenExpiry,
      scopes: record?.scopes,
    });

    return hydrationResult.metadata;
  } catch (err: any) {
    logger.warn('[DerivOAuth] Account sync failed', { userId, error: err?.message || String(err) });
    if (record) {
      record.connectionStatus = 'SYNC_FAILED';
      record.updatedAt = new Date().toISOString();
      derivConnectionsStore.set(userId, record);
    }
    return {
      connected: false,
      connectionStatus: 'SYNC_FAILED',
    };
  }
}

/**
 * Sync Deriv Account Metadata (Synchronous wrapper kicking off background sync)
 */
export function syncUserDeriv(userId: string): SafeDerivConnectionMetadata {
  const record = derivConnectionsStore.get(userId);
  if (record && record.connectionStatus !== 'DISCONNECTED') {
    record.connectionStatus = 'SYNCING';
    record.lastSyncedAt = new Date().toISOString();
    record.updatedAt = new Date().toISOString();
    derivConnectionsStore.set(userId, record);

    syncUserDerivAsync(userId).catch((err) => {
      logger.warn('[DerivOAuth] Background sync trigger notice', { userId, error: err?.message || String(err) });
    });
  }
  return getUserDerivConnection(userId);
}

/**
 * Reconnect User Connection to Deriv Server-Side
 */
export async function reconnectUserDerivAsync(userId: string): Promise<SafeDerivConnectionMetadata> {
  const record = derivConnectionsStore.get(userId);
  if (!record || !record.accessToken || record.connectionStatus === 'DISCONNECTED') {
    return {
      connected: false,
      connectionStatus: 'DISCONNECTED',
    };
  }

  record.connectionStatus = 'CONNECTING';
  record.updatedAt = new Date().toISOString();
  derivConnectionsStore.set(userId, record);

  try {
    const hydrationResult = await hydrateDerivAccount({
      userId,
      accessToken: record.accessToken,
      refreshToken: record.refreshToken,
      tokenExpiry: record.tokenExpiry,
      scopes: record.scopes,
    });

    return hydrationResult.metadata;
  } catch (err: any) {
    logger.warn('[DerivOAuth] Reconnection attempt failed', { userId, error: err?.message || String(err) });
    record.connectionStatus = 'RECONNECT_REQUIRED';
    record.updatedAt = new Date().toISOString();
    derivConnectionsStore.set(userId, record);

    return {
      connected: false,
      connectionStatus: 'RECONNECT_REQUIRED',
    };
  }
}

/**
 * Switch active Deriv account ID for user
 */
export async function switchUserDerivAccountAsync(userId: string, loginid: string): Promise<SafeDerivConnectionMetadata> {
  const record = derivConnectionsStore.get(userId);
  if (!record) {
    throw new Error('No active Deriv connection found for user');
  }
  if (!isValidDerivAccountId(loginid)) {
    throw new Error(`Invalid Deriv account identifier: ${loginid}`);
  }

  record.derivAccountId = loginid;
  record.accountType = loginid.startsWith('VR') ? 'demo' : 'real';
  record.updatedAt = new Date().toISOString();
  derivConnectionsStore.set(userId, record);
  derivConnectionsStore.set(loginid, record);

  return getUserDerivConnectionAsync(userId);
}

/**
 * Fetch and refresh authoritative user balance from Deriv gateway
 */
export async function fetchUserDerivBalanceAsync(
  userId: string
): Promise<{ success: boolean; balance?: number; currency?: string; loginid?: string; error?: string }> {
  const record = derivConnectionsStore.get(userId);
  if (!record || !record.accessToken || record.connectionStatus === 'DISCONNECTED') {
    return { success: false, error: 'No active Deriv connection found for user' };
  }

  try {
    const wsAuthRes = await authorizeDerivWebSocket(record.accessToken);
    if (wsAuthRes.success && wsAuthRes.profile) {
      const newBalance = wsAuthRes.profile.balance;
      const currency = wsAuthRes.profile.currency || record.currency || 'USD';
      const nowIso = new Date().toISOString();

      record.balance = newBalance;
      record.currency = currency;
      record.lastSyncedAt = nowIso;
      record.updatedAt = nowIso;
      record.connectionStatus = 'CONNECTED';
      derivConnectionsStore.set(userId, record);

      try {
        await dbQueries.recordAccountSnapshot({
          derivAccountId: record.derivAccountId || wsAuthRes.profile.loginid,
          userId,
          balance: newBalance,
          equity: newBalance,
          currency,
          timestamp: new Date(),
        });
      } catch (dbErr: any) {
        logger.warn('[DerivBalance] DB snapshot update notice', { userId, error: dbErr?.message });
      }

      return {
        success: true,
        balance: newBalance,
        currency,
        loginid: record.derivAccountId || wsAuthRes.profile.loginid,
      };
    }
    return { success: false, error: wsAuthRes.error || 'Failed to retrieve balance from Deriv gateway' };
  } catch (err: any) {
    logger.warn('[DerivBalance] Balance request failed', { userId, error: err?.message || String(err) });
    return { success: false, error: err?.message || 'Gateway communication error' };
  }
}

/**
 * Requests an OTP for an authenticated Deriv Options account
 */
export async function requestDerivAccountOtp(
  accountId: string,
  token: string,
  appId: string = getDerivAppId()
): Promise<{ success: boolean; otp?: string; url?: string; accountId?: string; error?: string }> {
  const cleanToken = token ? token.trim() : '';
  const cleanAccountId = accountId ? accountId.trim() : '';
  const cleanAppId = (appId || getDerivAppId()).toString().trim();

  if (!cleanToken || !cleanAccountId) {
    logger.warn('[DerivOTP] Missing access token or account ID for OTP request');
    return { success: false, error: 'Missing access token or account ID for OTP request' };
  }

  const url = `https://api.derivws.com/trading/v1/options/accounts/${encodeURIComponent(cleanAccountId)}/otp`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        'Deriv-App-ID': cleanAppId,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      const otp = data.otp || data.token;
      let readyWsUrl = data.url || data.websocket_url || data.ws_url;

      if (otp && readyWsUrl && !readyWsUrl.includes('otp=')) {
        const sep = readyWsUrl.includes('?') ? '&' : '?';
        readyWsUrl = `${readyWsUrl}${sep}otp=${encodeURIComponent(otp)}`;
      }

      if (readyWsUrl) {
        logger.info('[DerivOTP] OTP requested successfully', { accountId: cleanAccountId });
        return {
          success: true,
          otp,
          url: readyWsUrl,
          accountId: cleanAccountId,
        };
      }
    } else {
      const errorBody = await response.text().catch(() => '');
      logger.warn('[DerivOTP] OTP HTTP request failed', { status: response.status, accountId: cleanAccountId, error: errorBody });
    }
  } catch (err: any) {
    logger.warn('[DerivOTP] OTP request exception', { accountId: cleanAccountId, error: err?.message || String(err) });
  }

  return { success: false, error: `Failed to obtain WebSocket OTP for account ${cleanAccountId}` };
}

export const requestDerivOTP = async (
  accountId: string,
  token: string,
  appId: string = getDerivAppId()
): Promise<{ success: boolean; wsUrl?: string; otp?: string; accountId?: string; error?: string; expiresInSeconds?: number }> => {
  const res = await requestDerivAccountOtp(accountId, token, appId);
  return {
    success: res.success,
    wsUrl: res.url,
    otp: res.otp,
    accountId: res.accountId,
    error: res.error,
    expiresInSeconds: 300,
  };
};

/**
 * Validates connection to the authenticated WebSocket URL returned by the OTP endpoint
 */
export function verifyDerivWebSocketWithOtp(
  wsUrl: string,
  timeoutMs: number = 8000
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    let ws: any = null;
    let settled = false;

    const finish = (success: boolean, error?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (ws) {
        try {
          ws.close();
        } catch {}
      }
      resolve({ success, error });
    };

    const timer = setTimeout(() => {
      finish(false, `Timed out connecting to authenticated WebSocket: ${wsUrl}`);
    }, timeoutMs);

    try {
      const WSImpl: any = (NodeWebSocket as any).default || NodeWebSocket;
      ws = new WSImpl(wsUrl);
    } catch (err: any) {
      finish(false, `WebSocket construction error: ${err?.message || String(err)}`);
      return;
    }

    ws.on('open', () => {
      try {
        ws.send(JSON.stringify({ ping: 1 }));
      } catch {}
      finish(true);
    });

    ws.on('message', (data: any) => {
      try {
        const raw = typeof data === 'string' ? data : data?.toString('utf8') || '';
        const parsed = JSON.parse(raw);
        if (parsed.error && parsed.error.code === 'AuthorizationRequired') {
          finish(false, `WebSocket rejected authorization: ${parsed.error.message}`);
        } else {
          finish(true);
        }
      } catch {
        finish(true);
      }
    });

    ws.on('error', (err: any) => {
      const detail = err?.message || err?.code || String(err);
      finish(false, `WebSocket error: ${detail}`);
    });

    ws.on('close', (code: number) => {
      if (!settled && code !== 1000) {
        finish(false, `WebSocket closed unexpectedly (code: ${code})`);
      }
    });
  });
}

/**
 * ADMIN ONLY: Get full OAuth Gateway Configuration and User Connection Diagnostics
 */
export function getAdminDerivDiagnostics() {
  const config = getDerivOAuthConfig();

  const partnerAttribution = {
    affiliateToken: 'NOT_CONFIGURED',
    utmSource: 'appexquant_global',
    utmMedium: 'cpa_partner',
    utmCampaign: 'trading_portal',
  };

  const connections = Array.from(derivConnectionsStore.values()).map((rec) => ({
    userId: rec.userId,
    derivAccountId: rec.derivAccountId,
    email: rec.email,
    fullName: rec.fullName,
    balance: rec.balance,
    accountType: rec.accountType,
    currency: rec.currency,
    connectionStatus: rec.connectionStatus,
    scopes: rec.scopes,
    hasAccessToken: Boolean(rec.accessToken && rec.accessToken.length > 0),
    hasRefreshToken: Boolean(rec.refreshToken && rec.refreshToken.length > 0),
    tokenExpiry: rec.tokenExpiry,
    createdAt: rec.createdAt,
    lastSyncedAt: rec.lastSyncedAt,
  }));

  return {
    oauthConfig: {
      clientId: config.clientId,
      redirectUri: config.redirectUri,
      authEndpoint: config.authBaseUrl,
      tokenEndpoint: config.tokenEndpoint,
      scopesAllowed: config.scopes.split(/[\s,]+/),
      partnerAttribution,
    },
    activeConnectionsCount: connections.filter((c) => c.connectionStatus === 'CONNECTED').length,
    totalRegisteredConnections: connections.length,
    connections,
  };
}

/**
 * Sanitized user diagnostic endpoint data
 */
export function getUserDerivDiagnostics(userId: string) {
  const record = derivConnectionsStore.get(userId);
  return {
    userId,
    derivAccountId: record?.derivAccountId || null,
    connectionStatus: record?.connectionStatus || 'DISCONNECTED',
    currency: record?.currency || 'USD',
    balance: typeof record?.balance === 'number' ? record.balance : null,
    accountType: record?.accountType || 'real',
    hasAccessToken: Boolean(record?.accessToken && record.accessToken.length > 0),
    hasRefreshToken: Boolean(record?.refreshToken && record.refreshToken.length > 0),
    lastSyncedAt: record?.lastSyncedAt || null,
    timestamp: new Date().toISOString(),
  };
}
