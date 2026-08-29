/**
 * AppexQuant Markets Global - Server-Side Deriv OAuth 2.0 PKCE Engine
 * Handles cryptographically secure PKCE flow, state validation, partner attribution,
 * server-side token exchange, credential encryption/storage, and multi-user isolation.
 * Strictly server-authoritative token exchange: access tokens are never returned to client URLs.
 */

export const runtime = 'nodejs'; // REQUIRED: the 'ws' package does not work on the Edge runtime

import crypto from 'crypto';
import NodeWebSocket from 'ws';
import { syncUserToSupabase, syncDerivConnectionToSupabase } from '../../lib/supabase.ts';
import { dbQueries } from '../../lib/db/prisma.ts';
import { logger } from '../../observability/logger.ts';
import { buildAuthUrl, DERIV_OAUTH_SCOPE, exchangeCodeForToken } from '../oauthService.ts';
import { isValidDerivAccountId } from './syncStateMachine.ts';
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

// Temporary in-memory state store for active PKCE OAuth transactions (TTL: 10 minutes)
const oauthTransactionsStore = new Map<string, OAuthTransaction>();

// Server-side persistent connection store per user (Isolated by userId)
const derivConnectionsStore = new Map<string, DerivConnectionRecord>();

/**
 * Discovers authenticated Deriv account(s) using official REST endpoints
 * GET /trading/v1/options/accounts (or fallback REST endpoints)
 * with Authorization: Bearer <ACCESS_TOKEN> and Deriv-App-ID: <APP_ID>
 */
export async function discoverDerivAccountsREST(
  token: string,
  appId: string = '1089'
): Promise<{ accounts: DerivAccountProfileData[]; primaryAccount: DerivAccountProfileData | null }> {
  const cleanToken = token ? token.trim() : '';
  if (!cleanToken || cleanToken.startsWith('usr-')) {
    return { accounts: [], primaryAccount: null };
  }

  const cleanAppId = appId.trim() || '1089';
  const url = 'https://api.derivws.com/trading/v1/options/accounts';

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        'Deriv-App-ID': cleanAppId,
        Accept: 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      const rawList = Array.isArray(data) ? data : (data.accounts || (data.account_id ? [data] : []));
      const accounts: DerivAccountProfileData[] = rawList
        .map((item: any) => {
          const loginid = item.account_id || item.loginid || item.id;
          if (!loginid) return null;
          const isVirtual = item.account_type === 'demo' || loginid.startsWith('VR') ? 1 : 0;
          const balance = typeof item.balance === 'number' ? item.balance : parseFloat(item.balance || '0');
          const currency = item.currency || 'USD';
          return {
            loginid,
            balance: isNaN(balance) ? 0 : balance,
            currency,
            is_virtual: isVirtual,
            email: item.email,
            fullname: item.fullname || item.full_name,
            country: item.country,
            scopes: item.scopes,
          } as DerivAccountProfileData;
        })
        .filter((a: any): a is DerivAccountProfileData => a !== null);

      if (accounts.length > 0) {
        const primaryAccount = accounts[0];
        return { accounts, primaryAccount };
      }
    } else {
      const errorText = await response.text().catch(() => '');
      console.warn(`[DerivREST] Account discovery returned ${response.status} from ${url}:`, errorText);
    }
  } catch (err: any) {
    console.warn(`[DerivREST] Account discovery request failed for ${url}:`, err?.message || String(err));
  }

  return { accounts: [], primaryAccount: null };
}

/**
 * Requests an OTP (One-Time Password) for an authenticated Deriv Options account.
 * Sequence: POST /trading/v1/options/accounts/{accountId}/otp
 * Headers: Authorization: Bearer <ACCESS_TOKEN>, Deriv-App-ID: <APP_ID>
 * Response: { otp: string, url: string }
 */
export async function requestDerivAccountOtp(
  accountId: string,
  token: string,
  appId: string = '1089'
): Promise<{ success: boolean; otp?: string; url?: string; accountId?: string; error?: string }> {
  const cleanToken = token ? token.trim() : '';
  const cleanAccountId = accountId ? accountId.trim() : '';
  const cleanAppId = appId ? appId.trim() : '1089';

  if (!cleanToken || !cleanAccountId) {
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

      // If Deriv returned an OTP and the URL lacks the query parameter, append it safely
      if (otp && readyWsUrl && !readyWsUrl.includes('otp=')) {
        const sep = readyWsUrl.includes('?') ? '&' : '?';
        readyWsUrl = `${readyWsUrl}${sep}otp=${encodeURIComponent(otp)}`;
      }

      if (readyWsUrl) {
        return {
          success: true,
          otp,
          url: readyWsUrl,
          accountId: cleanAccountId,
        };
      }
    } else {
      const errorBody = await response.text().catch(() => '');
      console.warn(`[DerivOTP] OTP request returned ${response.status} from ${url}:`, errorBody);
    }
  } catch (err: any) {
    console.warn(`[DerivOTP] OTP request failed on ${url}:`, err?.message || String(err));
  }

  return { success: false, error: `Failed to obtain WebSocket OTP for account ${cleanAccountId}` };
}

export const requestDerivOTP = async (
  accountId: string,
  token: string,
  appId: string = '1089'
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
 * Validates connection to the authenticated WebSocket URL returned by the OTP endpoint.
 * Connects to the returned URL without manually crafting authentication tokens.
 */
export function verifyDerivWebSocketWithOtp(
  wsUrl: string,
  timeoutMs: number = 8000
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    let ws: any;
    try {
      const WSImpl: any = (NodeWebSocket as any).default || NodeWebSocket;
      ws = new WSImpl(wsUrl);
    } catch (err: any) {
      resolve({ success: false, error: `WebSocket construction error: ${err?.message || String(err)}` });
      return;
    }

    let settled = false;

    const finish = (success: boolean, error?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        ws.close();
      } catch {}
      resolve({ success, error });
    };

    const timer = setTimeout(() => {
      finish(false, `Timed out connecting to authenticated WebSocket: ${wsUrl}`);
    }, timeoutMs);

    ws.on('open', () => {
      // Send a ping or balance check to verify handshake
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
 * Authoritative Deriv Account Profile Discovery (HTTP REST Only)
 * Queries Deriv REST endpoints using OAuth access token.
 * Authentication does not depend on WebSocket.
 */
export async function fetchDerivAccountProfile(
  token: string,
  appId: string = '1089'
): Promise<DerivAccountProfileData | null> {
  const cleanToken = token ? token.trim() : '';
  if (!cleanToken || cleanToken.startsWith('usr-') || cleanToken.startsWith('user-')) {
    logger.warn('[DerivOAuth] Invalid token supplied for profile fetch (cannot be internal user ID)', { tokenPrefix: cleanToken.substring(0, 4) });
    return null;
  }

  const cleanAppId = (appId || '1089').toString().trim().replace(/['"]/g, '') || '1089';

  try {
    const restResult = await discoverDerivAccountsREST(cleanToken, cleanAppId);
    if (restResult.primaryAccount && restResult.primaryAccount.loginid && isValidDerivAccountId(restResult.primaryAccount.loginid)) {
      logger.info('[DerivOAuth] Authoritative account discovery successful via HTTP REST', {
        loginid: restResult.primaryAccount.loginid,
        isVirtual: restResult.primaryAccount.is_virtual,
        currency: restResult.primaryAccount.currency,
      });
      return restResult.primaryAccount;
    }
  } catch (err: any) {
    logger.warn('[DerivOAuth] REST account discovery failed:', { error: err?.message || String(err) });
  }

  return null;
}

/**
 * Cleanup expired OAuth transactions older than 10 minutes
 */
function cleanupExpiredTransactions() {
  const now = Date.now();
  const maxAge = 10 * 60 * 1000; // 10 minutes
  for (const [state, tx] of oauthTransactionsStore.entries()) {
    if (now - tx.createdAt > maxAge) {
      oauthTransactionsStore.delete(state);
    }
  }
}

/**
 * Helper to get configured Deriv OAuth credentials
 */
export function getDerivOAuthConfig(requestHost?: string, requestProtocol?: string) {
  const rawClientId =
    process.env.DERIV_APP_ID ||
    process.env.VITE_DERIV_APP_ID ||
    process.env.CLIENT_ID ||
    process.env.DERIV_CLIENT_ID ||
    process.env.DERIV_OAUTH_CLIENT_ID ||
    process.env.NEXT_PUBLIC_DERIV_APP_ID ||
    '1089';

  const cleanClientId = typeof rawClientId === 'string' ? rawClientId.trim() : '1089';
  const clientId = (cleanClientId && cleanClientId !== 'undefined' && cleanClientId !== 'null' && cleanClientId !== '""' && cleanClientId !== "''")
    ? cleanClientId
    : '1089';

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
  const host = parsedHost;

  let redirectUri = `${proto}://${host}/api/auth/deriv/callback`;

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

  // Store transaction state server-side
  oauthTransactionsStore.set(state, transaction);
  const cookieValue = encodeOAuthStateCookie(transaction);

  // Construct query parameters for Deriv OAuth 2.0 PKCE using centralized builder
  const authUrl = buildAuthUrl({
    appId: oauthConfig.clientId,
    redirectUri: oauthConfig.redirectUri,
    scope: DERIV_OAUTH_SCOPE,
    state,
    codeChallenge,
    codeChallengeMethod: 'S256',
    action,
  });
  return { authUrl, state, cookieValue, redirectUri: oauthConfig.redirectUri };
}

/**
 * Process OAuth Callback & Perform Server-Side Token Exchange
 */
export async function handleDerivOAuthCallback(params: {
  code?: string;
  state?: string;
  verifier?: string;
  token1?: string;
  acct1?: string;
  cur1?: string;
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

  const { code, state, verifier, token1, acct1, cur1, cookieState, error, errorDescription } = params;

  if (error) {
    const detailMsg = errorDescription || error || 'Deriv returned an authorization error.';
    console.error('[DERIV_OAUTH_CALLBACK_ERROR]', { error, errorDescription, state, timestamp: new Date().toISOString() });
    logger.warn('[DerivOAuth] Callback received error from Deriv', { error, errorDescription, state });
    return {
      success: false,
      destination: `/dashboard/error?error=${encodeURIComponent(error)}&message=${encodeURIComponent(detailMsg)}`,
      errorMessage: `Deriv OAuth Authorization Error: ${detailMsg} (${error})`,
    };
  }

  const oauthConfig = getDerivOAuthConfig(params.requestHost, params.requestProtocol);

  // Scenario A: Direct token callback (token1 & acct1 present in query params from legacy redirect)
  if (token1 && acct1) {
    if (!isValidDerivAccountId(acct1)) {
      logger.error('[DerivOAuth] Direct token callback rejected due to invalid loginid format:', { acct1 });
      return {
        success: false,
        destination: `/?auth_error=invalid_account_id&message=${encodeURIComponent('Invalid Deriv account identifier format received.')}`,
        errorMessage: `Deriv Account Discovery Failure: Invalid Deriv loginid format '${acct1}'.`,
      };
    }

    logger.info('[DerivOAuth] Processing direct token callback for account discovery', { loginid: acct1, currency: cur1 });
    const hydrationResult = await hydrateDerivAccount({
      userId: acct1,
      accessToken: token1,
      appId: oauthConfig.clientId,
      scopes: ['trade', 'account_manage', 'payments'],
    });

    if (!hydrationResult.success || !hydrationResult.metadata?.connected || !hydrationResult.metadata?.derivAccountId || !isValidDerivAccountId(hydrationResult.metadata.derivAccountId)) {
      const discError = hydrationResult.error || 'Failed to discover or verify Deriv trading account identifier from direct callback.';
      logger.error('[DerivOAuth] Direct token callback failed at account discovery stage:', { error: discError, loginid: acct1 });
      return {
        success: false,
        destination: `/?auth_error=discovery_failed&message=${encodeURIComponent(discError)}`,
        errorMessage: `Deriv Account Discovery Failure: ${discError}`,
      };
    }

    const verifiedLoginId = hydrationResult.metadata.derivAccountId;
    const accountType: 'demo' | 'real' = hydrationResult.metadata.accountType || (verifiedLoginId.startsWith('VR') ? 'demo' : 'real');
    const currency = hydrationResult.metadata.currency || cur1 || 'USD';
    const scopes = hydrationResult.metadata.scopes || ['trade', 'account_manage', 'payments'];

    logger.info('[DerivOAuth] Authoritative account discovery verified for direct callback', { loginid: verifiedLoginId, accountType, currency, scopes });

    return {
      success: true,
      userId: verifiedLoginId,
      loginid: verifiedLoginId,
      accountId: verifiedLoginId,
      derivAccountId: verifiedLoginId,
      accountType,
      currency,
      scopes,
      destination: '/',
      connectionRecord: hydrationResult.metadata,
      rawAccountDetails: {
        derivAccountId: verifiedLoginId,
        loginid: verifiedLoginId,
        accountId: verifiedLoginId,
        currency,
        accountType,
        scopes,
        token: token1,
        balance: hydrationResult.metadata?.balance,
        email: hydrationResult.metadata?.email,
        fullName: hydrationResult.metadata?.fullName,
        accountList: hydrationResult.metadata?.accountList,
      },
    };
  }

  // 1. Validate Code (Authorization Code Flow)
  if (!code && !token1) {
    logger.warn('[DerivOAuth] Missing authorization code in callback');
    return {
      success: false,
      destination: '/dashboard/error?error=missing_code&message=Authorization%20code%20was%20missing%20in%20callback',
      errorMessage: 'Deriv OAuth Error: Authorization code was missing in callback query parameters.',
    };
  }

  // 2. Validate State (CSRF & State Integrity)
  if (!state && !token1) {
    logger.warn('[DerivOAuth] Missing state parameter in callback');
    return {
      success: false,
      destination: '/dashboard/error?error=missing_state&message=OAuth%20state%20parameter%20was%20missing',
      errorMessage: 'Deriv OAuth State Error: Missing state parameter in callback.',
    };
  }

  // Retrieve transaction from memory store OR decode from verified signed cookie
  let transaction: OAuthTransaction | undefined = undefined;

  if (state) {
    transaction = oauthTransactionsStore.get(state);
  }

  if (!transaction && cookieState) {
    const decodedTx = decodeOAuthStateCookie<OAuthTransaction>(cookieState);
    if (decodedTx && (!state || decodedTx.state === state)) {
      transaction = {
        ...decodedTx,
        userId: decodedTx.userId || 'usr-deriv-pkce',
        action: decodedTx.action || 'connect',
        destination: decodedTx.destination || '/',
        redirectUri: decodedTx.redirectUri || oauthConfig.redirectUri,
      };
    }
  }

  if (!transaction && verifier) {
    // If state cookie was dropped in browser redirect, verify client provided valid verifier format
    if (verifier.length >= 43 && verifier.length <= 128) {
      transaction = {
        state: state || 'pkce-client-verifier',
        codeVerifier: verifier,
        userId: 'usr-deriv-pkce',
        action: 'connect',
        destination: '/',
        redirectUri: params.redirectUri || oauthConfig.redirectUri,
        createdAt: Date.now(),
      };
    }
  }

  if (!transaction) {
    const errDetail = 'OAuth transaction state expired or could not be verified from cookie/memory.';
    logger.warn('[DerivOAuth] State mismatch or expired transaction', { stateReceived: state, hasCookieState: Boolean(cookieState) });
    return {
      success: false,
      destination: '/dashboard/error?error=invalid_state&message=OAuth%20session%20expired%20or%20state%20mismatch',
      errorMessage: `Deriv OAuth State Error: ${errDetail} Please initiate login again from the application.`,
    };
  }

  // Remove used transaction immediately (Strict single-use state)
  if (state) {
    oauthTransactionsStore.delete(state);
  }

  // 3. Validate PKCE Verifier
  const codeVerifier = transaction.codeVerifier?.trim();
  if (!codeVerifier || codeVerifier.length < 43) {
    logger.error('[DerivOAuth] Invalid or missing PKCE code verifier in transaction', { state });
    return {
      success: false,
      destination: '/dashboard/error?error=invalid_verifier&message=PKCE%20code%20verifier%20missing%20or%20invalid',
      errorMessage: 'Deriv OAuth PKCE Error: PKCE code verifier was missing or did not meet RFC 7636 entropy requirements.',
    };
  }

  // 4. Token Exchange
  if (!code) {
    return {
      success: false,
      destination: '/dashboard/error?error=missing_code&message=Authorization%20code%20was%20missing',
      errorMessage: 'Deriv OAuth Error: Authorization code is required for token exchange.',
    };
  }

  const tokenEndpoint = oauthConfig.tokenEndpoint;

  try {
    let tokenData: any = null;
    try {
      tokenData = await exchangeCodeForToken(
        code,
        transaction.codeVerifier,
        transaction.redirectUri,
        oauthConfig.clientId,
        oauthConfig.clientSecret
      );
    } catch (exErr: any) {
      console.warn('[DERIV_OAUTH_EXCHANGE_ERROR]', exErr?.message);
      // Fallback candidate endpoints trial if centralized exchange threw
      const candidateEndpoints = Array.from(new Set([
        'https://oauth.deriv.com/oauth2/token',
        oauthConfig.tokenEndpoint,
        'https://auth.deriv.com/oauth2/token',
      ]));
      let lastStatus = 0;
      let lastStatusText = '';
      let rawErrorBody: any = null;

      const postBody: Record<string, string> = {
        grant_type: 'authorization_code',
        client_id: oauthConfig.clientId,
        code,
        code_verifier: transaction.codeVerifier,
        redirect_uri: transaction.redirectUri,
      };
      if (oauthConfig.clientSecret) {
        postBody.client_secret = oauthConfig.clientSecret;
      }

      for (const endpoint of candidateEndpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Accept: 'application/json',
            },
            body: new URLSearchParams(postBody),
            redirect: 'follow',
          });
          lastStatus = response.status;
          lastStatusText = response.statusText;
          if (response.ok) {
            tokenData = await response.json();
            break;
          } else {
            rawErrorBody = await response.json().catch(() => ({ rawText: response.statusText }));
          }
        } catch (e) {}
      }

      if (!tokenData) {
        const errObj = rawErrorBody?.error || rawErrorBody || {};
        const errCode = errObj.code || errObj.error || 'TOKEN_EXCHANGE_FAILED';
        const errMsg = errObj.message || rawErrorBody?.error_description || `HTTP ${lastStatus} ${lastStatusText}`;
        const specificReason = `Deriv Token Exchange Error [${errCode}]: ${errMsg}`;
        return {
          success: false,
          destination: `/?auth_error=token_failed&message=${encodeURIComponent(specificReason)}`,
          errorMessage: specificReason,
        };
      }
    }

    const resolvedAccessToken = tokenData?.access_token || tokenData?.token1 || tokenData?.token;
    if (!resolvedAccessToken) {
      return {
        success: false,
        destination: '/?auth_error=token_failed&message=Missing%20access%20token%20in%20Deriv%20response',
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

    // 5. Account Discovery: Discover and verify genuine loginid via Token Data or HTTP REST (No WebSockets)
    const discoveredLoginId =
      tokenData.account_id ||
      tokenData.loginid ||
      tokenData.acct1 ||
      tokenData.acct ||
      (Array.isArray(tokenData.accounts) && tokenData.accounts[0]?.loginid) ||
      (Array.isArray(tokenData.account_list) && tokenData.account_list[0]?.loginid);

    const hydrationResult = await hydrateDerivAccount({
      userId: transaction.userId,
      accessToken: resolvedAccessToken,
      appId: oauthConfig.clientId,
      refreshToken: tokenData.refresh_token,
      tokenExpiry: tokenExpiryDate,
      scopes: tokenScopes,
      accountInfo: (discoveredLoginId && isValidDerivAccountId(discoveredLoginId)) ? {
        loginid: discoveredLoginId,
        currency: tokenData.currency || tokenData.cur1 || 'USD',
        accountType: (discoveredLoginId.startsWith('VR') || tokenData.account_type === 'demo') ? 'demo' : 'real',
        email: tokenData.email,
        fullName: tokenData.fullname || tokenData.full_name,
        balance: typeof tokenData.balance === 'number' ? tokenData.balance : undefined,
        accountList: tokenData.accounts || tokenData.account_list,
        scopes: tokenScopes,
      } : undefined,
    });

    if (!hydrationResult.success || !hydrationResult.metadata?.connected || !hydrationResult.metadata?.derivAccountId || !isValidDerivAccountId(hydrationResult.metadata.derivAccountId)) {
      const discError = hydrationResult.error || 'Failed to discover or verify Deriv trading account identifier.';
      logger.error('[DerivOAuth] Callback failed at account discovery stage:', { error: discError });
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

    logger.info('[DerivOAuth] Authoritative account discovery verified for OAuth PKCE exchange', {
      loginid: verifiedLoginId,
      accountType,
      currency,
      scopes,
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
  } catch (err: any) {
    const errorMsg = err?.message || 'Network communication error';
    console.error('[DERIV_OAUTH_TOKEN_NETWORK_FAILURE]', {
      message: errorMsg,
      name: err?.name,
      stack: err?.stack,
      code: err?.code,
      cause: err?.cause,
      tokenEndpoint,
      timestamp: new Date().toISOString(),
    });
    logger.error('[DerivOAuth] Token exchange network failure reaching Deriv:', {
      error: errorMsg,
      stack: err?.stack,
      tokenEndpoint,
    });
    const specificReason = `Deriv Token Exchange Network Failure: Unable to reach Deriv endpoint (${tokenEndpoint}). Network error: ${errorMsg}`;
    return {
      success: false,
      destination: `/?auth_error=network_failure&message=${encodeURIComponent(specificReason)}`,
      errorMessage: specificReason,
    };
  }
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

/**
 * Canonical Deriv Account Hydration & Reconciliation Service
 * Acts as the authoritative source of truth for discovering accounts,
 * updating internal records, and executing idempotent upserts into database.
 * Strictly operates over HTTP / Token Exchange data — never uses WebSockets for authentication.
 */
export async function hydrateDerivAccount(params: HydrateDerivAccountParams): Promise<HydrateDerivAccountResult> {
  const { userId, accessToken, appId, refreshToken, tokenExpiry, accountInfo } = params;
  const cleanToken = accessToken ? accessToken.trim() : '';

  if (!cleanToken) {
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
  const effectiveAppId = appId || oauthConfig.clientId || '1089';

  let derivAccountId: string | undefined = undefined;
  let isVirtual = 0;
  let accountType: 'demo' | 'real' = 'real';
  let currency = 'USD';
  let balance = 0;
  let email = '';
  let fullName = '';
  let scopes = params.scopes || ['trade', 'account_manage'];
  let accountList: any[] | undefined = undefined;
  let resolvedProfile: DerivAccountProfileData | undefined = undefined;

  const candidateAccount = accountInfo;
  if (candidateAccount?.loginid && isValidDerivAccountId(candidateAccount.loginid)) {
    derivAccountId = candidateAccount.loginid;
    accountType = candidateAccount.accountType || (derivAccountId.startsWith('VR') ? 'demo' : 'real');
    isVirtual = accountType === 'demo' ? 1 : 0;
    currency = candidateAccount.currency || 'USD';
    balance = typeof candidateAccount.balance === 'number' ? candidateAccount.balance : 0;
    email = candidateAccount.email || '';
    fullName = candidateAccount.fullName || '';
    scopes = candidateAccount.scopes || scopes;
    accountList = candidateAccount.accountList;
  } else {
    // Query authoritative account profile via HTTP REST (No WebSockets)
    const profile = await fetchDerivAccountProfile(cleanToken, effectiveAppId).catch((err) => {
      console.warn('[hydrateDerivAccount] HTTP REST account discovery error:', err?.message || err);
      return null;
    });

    if (profile && profile.loginid && isValidDerivAccountId(profile.loginid)) {
      resolvedProfile = profile;
      derivAccountId = profile.loginid;
      isVirtual = Boolean(profile.is_virtual) ? 1 : 0;
      accountType = isVirtual ? 'demo' : (derivAccountId.startsWith('VR') ? 'demo' : 'real');
      currency = profile.currency || 'USD';
      balance = typeof profile.balance === 'number' ? profile.balance : 0;
      email = profile.email || '';
      fullName = profile.fullname || '';
      scopes = profile.scopes || scopes;
      accountList = profile.account_list;
    }
  }

  const nowIso = new Date().toISOString();

  // Strictly verify that loginid is a genuine Deriv account identifier
  if (derivAccountId && isValidDerivAccountId(derivAccountId)) {
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

    // Database persistence (Prisma) - Idempotent upsert of account & snapshot
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
    } catch (dbErr: any) {
      logger.warn('[hydrateDerivAccount] Prisma persistence warning:', { error: dbErr?.message });
    }

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
    }).catch(() => {});

    const metadata: SafeDerivConnectionMetadata = {
      connected: true,
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
      profile: resolvedProfile,
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

  // If account discovery did not resolve a valid loginid:
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
    error: 'Failed to discover or verify genuine Deriv trading account loginid from Deriv account discovery',
  };
}

/**
 * Access internal connection record by user ID
 */
export function getDerivConnectionRecord(userId: string): DerivConnectionRecord | undefined {
  return derivConnectionsStore.get(userId);
}

/**
 * Get User's Safe Connection Metadata (NO SECRETS EXPOSED TO USERS)
 */
export async function getUserDerivConnectionAsync(userId: string): Promise<SafeDerivConnectionMetadata> {
  const record = derivConnectionsStore.get(userId);
  if (!record || record.connectionStatus === 'DISCONNECTED') {
    return {
      connected: false,
      connectionStatus: 'DISCONNECTED',
    };
  }

  const isConnected = record.connectionStatus === 'CONNECTED';

  return {
    connected: isConnected,
    derivAccountId: record.derivAccountId,
    email: record.email,
    fullName: record.fullName,
    balance: record.balance,
    accountType: record.accountType,
    currency: record.currency,
    connectionStatus: record.connectionStatus,
    scopes: record.scopes,
    lastSyncedAt: record.lastSyncedAt,
  };
}

/**
 * Synchronous getter for backwards compatibility
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
    derivAccountId: record.derivAccountId,
    email: record.email,
    fullName: record.fullName,
    balance: record.balance,
    accountType: record.accountType,
    currency: record.currency,
    connectionStatus: record.connectionStatus,
    scopes: record.scopes,
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
  const isValidAcct = isValidDerivAccountId(userId);
  const accountId = isValidAcct ? userId : undefined;
  const accountType = accountId?.startsWith('VR') ? 'demo' : 'real';

  const record: DerivConnectionRecord = {
    userId,
    derivAccountId: accountId || '',
    accountType,
    currency: 'USD',
    connectionStatus: isValidAcct ? 'CONNECTED' : 'DISCONNECTED',
    scopes: ['trade', 'account_manage'],
    accessToken: trimmed,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
  };

  derivConnectionsStore.set(userId, record);

  // Kick off background authoritative discovery
  hydrateDerivAccount({
    userId,
    accessToken: trimmed,
  }).catch((err) => {
    logger.warn('[connectUserWithApiToken] Background hydration failed:', { error: err?.message || String(err) });
  });

  return getUserDerivConnection(userId);
}

/**
 * Disconnect Deriv Account for User
 */
export function disconnectUserDeriv(userId: string): boolean {
  const record = derivConnectionsStore.get(userId);
  if (record) {
    record.connectionStatus = 'DISCONNECTED';
    record.accessToken = '';
    record.refreshToken = undefined;
    record.updatedAt = new Date().toISOString();
    derivConnectionsStore.set(userId, record);
    return true;
  }
  return false;
}

/**
 * Sync Deriv Account Metadata (Asynchronous Pipeline)
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

  // Set state to SYNCING
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
    logger.warn('[DerivSync] User sync failed:', { error: String(err?.message || err) });
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
 * Sync Deriv Account Metadata (Synchronous wrapper kicking off background async sync)
 */
export function syncUserDeriv(userId: string): SafeDerivConnectionMetadata {
  const record = derivConnectionsStore.get(userId);
  if (record && record.connectionStatus !== 'DISCONNECTED') {
    record.connectionStatus = 'SYNCING';
    record.lastSyncedAt = new Date().toISOString();
    record.updatedAt = new Date().toISOString();
    derivConnectionsStore.set(userId, record);

    // Fire-and-forget async sync in background
    syncUserDerivAsync(userId).catch((err) => {
      logger.warn('[DerivSync] Background trigger notice:', { error: String(err?.message || err) });
    });
  }
  return getUserDerivConnection(userId);
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
    hasAccessToken: Boolean(rec.accessToken),
    hasRefreshToken: Boolean(rec.refreshToken),
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
    hasAccessToken: Boolean(record?.accessToken),
    lastSyncedAt: record?.lastSyncedAt || null,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Switch active Deriv account ID for user
 */
export async function switchUserDerivAccountAsync(userId: string, loginid: string): Promise<SafeDerivConnectionMetadata> {
  const record = derivConnectionsStore.get(userId);
  if (!record) {
    throw new Error('No active Deriv connection found');
  }
  record.derivAccountId = loginid;
  record.accountType = loginid.startsWith('VR') ? 'demo' : 'real';
  record.updatedAt = new Date().toISOString();
  derivConnectionsStore.set(userId, record);
  derivConnectionsStore.set(loginid, record);
  return getUserDerivConnectionAsync(userId);
      }
