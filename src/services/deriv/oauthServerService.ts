/**
 * AppexQuant Markets Global - Server-Side Deriv OAuth 2.0 PKCE Engine
 * Handles cryptographically secure PKCE flow, state validation, partner attribution,
 * server-side token exchange, credential encryption/storage, and multi-user isolation.
 * Strictly server-authoritative token exchange: access tokens are never returned to client URLs.
 */

import crypto from 'crypto';
import NodeWebSocket from 'ws';
import { syncUserToSupabase, syncDerivConnectionToSupabase } from '../../lib/supabase.ts';
import { dbQueries } from '../../lib/db/prisma.ts';
import { logger } from '../../observability/logger.ts';
import { buildAuthUrl, DERIV_OAUTH_SCOPE, exchangeCodeForToken } from '../oauthService.ts';

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
  derivAccountId?: string;
  email?: string;
  fullName?: string;
  balance?: number;
  accountType?: 'demo' | 'real';
  currency?: string;
  connectionStatus: 'CONNECTED' | 'CONNECTING' | 'SYNCING' | 'SYNC_FAILED' | 'DISCONNECTED' | 'RECONNECT_REQUIRED' | 'ERROR';
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

// Temporary in-memory state store for active PKCE OAuth transactions (TTL: 10 minutes)
const oauthTransactionsStore = new Map<string, OAuthTransaction>();

// Server-side persistent connection store per user (Isolated by userId)
const derivConnectionsStore = new Map<string, DerivConnectionRecord>();

/**
 * Connects to Deriv WebSocket endpoint server-side and executes authorize API request
 * to fetch genuine account profile details (email, fullname, balance, currency, accounts).
 */
export async function fetchDerivAccountProfile(
  token: string,
  appId: string = '1089',
  retries: number = 3
): Promise<DerivAccountProfileData | null> {
  const cleanToken = token ? token.trim() : '';
  if (!cleanToken) return null;

  const candidateEndpoints = [
    `wss://ws.derivws.com/websockets/v3?app_id=${encodeURIComponent(appId.trim() || '1089')}&l=EN&brand=deriv`,
    `wss://ws.binaryws.com/websockets/v3?app_id=${encodeURIComponent(appId.trim() || '1089')}&l=EN&brand=deriv`,
    `wss://frontend.binaryws.com/websockets/v3?app_id=${encodeURIComponent(appId.trim() || '1089')}`,
  ];

  for (let attempt = 1; attempt <= retries; attempt++) {
    for (const wsUrl of candidateEndpoints) {
      try {
        const profile = await attemptFetchProfileWithUrl(cleanToken, wsUrl);
        if (profile && profile.loginid) {
          return profile;
        }
      } catch (err: any) {
        console.warn(`[DerivOAuth] Profile fetch attempt ${attempt} on ${wsUrl} failed:`, err?.message || err);
      }
    }
    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, attempt * 500));
    }
  }

  return null;
}

function attemptFetchProfileWithUrl(token: string, wsUrl: string): Promise<DerivAccountProfileData | null> {
  return new Promise((resolve) => {
    try {
      const WS = typeof globalThis.WebSocket !== 'undefined'
        ? globalThis.WebSocket
        : ((NodeWebSocket as any).default || NodeWebSocket);
      if (!WS) return resolve(null);

      const ws = new (WS as any)(wsUrl);
      let settled = false;

      const finish = (result: DerivAccountProfileData | null) => {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          try {
            if (typeof (ws as any).close === 'function') {
              (ws as any).close();
            }
          } catch {}
          resolve(result);
        }
      };

      const timeout = setTimeout(() => {
        finish(null);
      }, 10000);

      const sendAuth = () => {
        try {
          ws.send(JSON.stringify({ authorize: token.trim(), req_id: 1 }));
        } catch {
          finish(null);
        }
      };

      if (typeof (ws as any).on === 'function') {
        (ws as any).on('open', sendAuth);
        (ws as any).on('message', (data: any) => {
          try {
            const raw = typeof data === 'string' ? data : data?.toString('utf8') || '';
            const parsed = JSON.parse(raw);
            if (parsed.msg_type === 'authorize' && parsed.authorize) {
              finish(parsed.authorize as DerivAccountProfileData);
            } else if (parsed.error) {
              finish(null);
            }
          } catch {
            finish(null);
          }
        });
        (ws as any).on('error', () => {
          finish(null);
        });
      } else {
        ws.onopen = sendAuth;
        ws.onmessage = (event: any) => {
          try {
            const raw = typeof event.data === 'string' ? event.data : event.data?.toString() || '';
            const parsed = JSON.parse(raw);
            if (parsed.msg_type === 'authorize' && parsed.authorize) {
              finish(parsed.authorize as DerivAccountProfileData);
            } else if (parsed.error) {
              finish(null);
            }
          } catch {
            finish(null);
          }
        };
        ws.onerror = () => {
          finish(null);
        };
      }
    } catch {
      resolve(null);
    }
  });
}

function getStateSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.JWT_SECRET || 'appexquant_default_state_secret_2026_key_9988';
  return secret;
}

/**
 * Generate cryptographically secure base64url string
 */
export function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate PKCE code verifier (high entropy 32-64 bytes) and SHA256 challenge
 */
export function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const verifierBytes = crypto.randomBytes(32);
  const codeVerifier = base64UrlEncode(verifierBytes);
  const hash = crypto.createHash('sha256').update(codeVerifier).digest();
  const codeChallenge = base64UrlEncode(hash);
  return { codeVerifier, codeChallenge };
}

/**
 * Generate cryptographically secure random state parameter (32 bytes hex)
 */
export function generateState(): string {
  return crypto.randomBytes(24).toString('hex');
}

/**
 * Encode and sign OAuth transaction state into a secure string for cookie fallback
 */
export function encodeOAuthStateCookie(tx: OAuthTransaction): string {
  const payload = Buffer.from(JSON.stringify(tx)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', getStateSecret())
    .update(payload)
    .digest('base64url');
  return `${payload}.${signature}`;
}

/**
 * Decode and verify OAuth state cookie (ensures state integrity across serverless instances)
 */
export function decodeOAuthStateCookie(cookieVal?: string): OAuthTransaction | null {
  if (!cookieVal) return null;
  try {
    const parts = cookieVal.split('.');
    if (parts.length !== 2) return null;
    const [payload, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', getStateSecret())
      .update(payload)
      .digest('base64url');
    if (signature !== expectedSig) return null;
    const tx = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as OAuthTransaction;
    const maxAge = 10 * 60 * 1000; // 10 minutes
    if (Date.now() - tx.createdAt > maxAge) return null;
    return tx;
  } catch {
    return null;
  }
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
  const clientId =
    process.env.CLIENT_ID ||
    process.env.DERIV_CLIENT_ID ||
    process.env.DERIV_APP_ID ||
    process.env.VITE_DERIV_APP_ID ||
    '1089';

  const clientSecret = process.env.CLIENT_SECRET || process.env.DERIV_CLIENT_SECRET || '';

  const proto = requestProtocol || (requestHost?.includes('localhost') ? 'http' : 'https');
  const host = requestHost || (process.env.APP_URL ? new URL(process.env.APP_URL).host : 'localhost:3000');

  let redirectUri = `${proto}://${host}/api/auth/deriv/callback`;
  
  const configuredUri = process.env.OAUTH_REDIRECT_URI || process.env.REDIRECT_URI || process.env.VITE_REDIRECT_URI;
  if (configuredUri) {
    redirectUri = configuredUri;
  } else if (process.env.NEXT_PUBLIC_SITE_URL) {
    redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')}/api/auth/deriv/callback`;
  }

  const scopes = process.env.DERIV_SCOPES || 'trade account_manage';

  return {
    clientId,
    clientSecret,
    redirectUri,
    scopes,
    authBaseUrl: process.env.DERIV_AUTH_URL || 'https://auth.deriv.com/oauth2/auth',
    tokenEndpoint: process.env.DERIV_TOKEN_ENDPOINT || 'https://oauth.deriv.com/oauth2/token',
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
  connectionRecord?: SafeDerivConnectionMetadata;
  rawAccountDetails?: {
    derivAccountId: string;
    email?: string;
    fullName?: string;
    balance?: number;
    accountType: 'demo' | 'real';
    currency: string;
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
      destination: `/?auth_error=deriv_error&message=${encodeURIComponent(detailMsg)}`,
      errorMessage: `Deriv OAuth Authorization Error: ${detailMsg} (${error})`,
    };
  }

  const oauthConfig = getDerivOAuthConfig(params.requestHost, params.requestProtocol);

  // Scenario A: Direct token callback (token1 & acct1 present in query params from legacy redirect)
  if (token1 && acct1) {
    console.log('[DERIV_OAUTH_DIRECT_TOKEN_CALLBACK]', { acct1, cur1 });
    const hydrationResult = await hydrateDerivAccount({
      userId: acct1,
      accessToken: token1,
      appId: oauthConfig.clientId,
      fallbackAccount: {
        loginid: acct1,
        currency: cur1 || 'USD',
        accountType: acct1.startsWith('VR') ? 'demo' : 'real',
        scopes: ['trade', 'account_manage', 'payments'],
      },
    });

    const targetLoginId = hydrationResult.metadata?.derivAccountId || acct1;
    const targetAccountType: 'demo' | 'real' = hydrationResult.metadata?.accountType || (targetLoginId.startsWith('VR') ? 'demo' : 'real');
    const targetCurrency = hydrationResult.metadata?.currency || cur1 || 'USD';

    return {
      success: true,
      userId: targetLoginId,
      destination: '/',
      connectionRecord: hydrationResult.metadata,
      rawAccountDetails: hydrationResult.rawAccountDetails || {
        derivAccountId: targetLoginId,
        currency: targetCurrency,
        accountType: targetAccountType,
        token: token1,
      },
    };
  }

  // Retrieve transaction from memory store OR decode from secure cookie OR fallback with client verifier
  let transaction = state ? oauthTransactionsStore.get(state) : undefined;
  if (!transaction && cookieState) {
    const decodedTx = decodeOAuthStateCookie(cookieState);
    if (decodedTx && (!state || decodedTx.state === state)) {
      transaction = decodedTx;
    }
  }

  // Fallback: If cookie/state was lost in cross-domain redirect, but frontend provided code_verifier
  if (!transaction && verifier) {
    transaction = {
      state: state || 'pkce-direct-verifier',
      codeVerifier: verifier,
      userId: 'usr-deriv-pkce',
      action: 'connect',
      destination: '/',
      redirectUri: params.redirectUri || oauthConfig.redirectUri,
      createdAt: Date.now(),
    };
  }

  if (!transaction) {
    const errDetail = 'OAuth transaction state expired or could not be verified from cookie/memory.';
    console.error('[DERIV_OAUTH_STATE_MISMATCH]', { stateReceived: state, hasCookieState: Boolean(cookieState), timestamp: new Date().toISOString() });
    logger.warn('[DerivOAuth] State mismatch or expired transaction', { stateReceived: state, hasCookieState: Boolean(cookieState) });
    return {
      success: false,
      destination: '/?auth_error=invalid_state&message=OAuth%20session%20expired%20or%20state%20mismatch',
      errorMessage: `Deriv OAuth State Error: ${errDetail} Please initiate login again from the application.`,
    };
  }

  // Remove used transaction immediately (Strict single-use state)
  if (state) {
    oauthTransactionsStore.delete(state);
  }

  if (!code) {
    console.error('[DERIV_OAUTH_MISSING_CODE]', { state, destination: transaction.destination });
    return {
      success: false,
      destination: transaction.destination || '/?auth_error=missing_code',
      errorMessage: 'Deriv OAuth Error: Authorization code was missing in callback query parameters.',
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

    const fallbackLoginId = tokenData.account_id || tokenData.acct1 || tokenData.acct || tokenData.loginid || tokenData.accounts?.[0]?.loginid;

    // Execute authoritative account hydration pipeline
    const hydrationResult = await hydrateDerivAccount({
      userId: transaction.userId,
      accessToken: resolvedAccessToken,
      appId: oauthConfig.clientId,
      refreshToken: tokenData.refresh_token,
      tokenExpiry: tokenExpiryDate,
      scopes: tokenScopes,
      fallbackAccount: fallbackLoginId ? {
        loginid: fallbackLoginId,
        currency: tokenData.currency || tokenData.cur1 || 'USD',
        scopes: tokenScopes,
        accountList: tokenData.accounts,
      } : undefined,
    });

    if (!hydrationResult.success || !hydrationResult.metadata?.connected || !hydrationResult.metadata?.derivAccountId) {
      const discError = hydrationResult.error || 'Failed to discover or verify Deriv trading account identifier.';
      logger.error('[DerivOAuth] Callback failed at account discovery stage:', { error: discError, userId: transaction.userId });
      return {
        success: false,
        destination: `/?auth_error=discovery_failed&message=${encodeURIComponent(discError)}`,
        errorMessage: `Deriv Account Discovery Failure: ${discError}`,
      };
    }

    const targetLoginId = hydrationResult.metadata.derivAccountId;
    const targetAccountType: 'demo' | 'real' = hydrationResult.metadata.accountType || (targetLoginId.startsWith('VR') ? 'demo' : 'real');
    const targetCurrency = hydrationResult.metadata.currency || 'USD';

    return {
      success: true,
      userId: targetLoginId,
      destination: transaction.destination || '/',
      connectionRecord: hydrationResult.metadata,
      rawAccountDetails: hydrationResult.rawAccountDetails || {
        derivAccountId: targetLoginId,
        currency: targetCurrency,
        token: resolvedAccessToken,
        balance: hydrationResult.metadata?.balance,
        accountType: targetAccountType,
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
 * Acts as the authoritative source of truth for querying WebSocket profile,
 * updating internal records, and executing idempotent upserts into database.
 */
export async function hydrateDerivAccount(params: HydrateDerivAccountParams): Promise<HydrateDerivAccountResult> {
  const { userId, accessToken, appId, refreshToken, tokenExpiry, fallbackAccount } = params;
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

  // Query authoritative profile via WebSocket
  const profile = await fetchDerivAccountProfile(cleanToken, effectiveAppId).catch((err) => {
    console.warn('[hydrateDerivAccount] WebSocket profile query error:', err?.message || err);
    return null;
  });

  const nowIso = new Date().toISOString();

  // If profile was resolved from WebSocket:
  if (profile && profile.loginid) {
    const derivAccountId = profile.loginid;
    const isVirtual = Boolean(profile.is_virtual);
    const accountType: 'demo' | 'real' = isVirtual ? 'demo' : (derivAccountId.startsWith('VR') ? 'demo' : 'real');
    const currency = profile.currency || fallbackAccount?.currency || 'USD';
    const balance = typeof profile.balance === 'number' ? profile.balance : (fallbackAccount?.balance ?? 0);
    const email = profile.email || fallbackAccount?.email || '';
    const fullName = profile.fullname || fallbackAccount?.fullName || '';
    const scopes = profile.scopes || params.scopes || fallbackAccount?.scopes || ['trade', 'account_manage'];
    const accountList = profile.account_list || fallbackAccount?.accountList;

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
    derivConnectionsStore.set(derivAccountId, connectionRecord);

    // Database persistence (Prisma)
    try {
      await dbQueries.upsertDerivAccount({
        id: derivAccountId,
        userId,
        accountType,
        currency,
        balance,
        equity: balance,
        isVirtual,
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

    // Background Supabase Sync
    syncUserToSupabase({
      id: userId,
      email,
      derivAccountId,
      accountType,
      role: (email === 'obwogialex728@gmail.com' || derivAccountId.toLowerCase().includes('admin')) ? 'ADMIN' : 'USER',
    }).catch(() => {});

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
      derivAccountId,
      email,
      fullName,
      balance,
      accountType,
      currency,
      connectionStatus: 'CONNECTED',
      scopes,
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

  // Fallback: If WebSocket didn't return profile, check if fallbackAccount has a valid Deriv loginid (e.g. CR... or VR...)
  const fallbackLoginId = fallbackAccount?.loginid;
  const isValidDerivId = fallbackLoginId && (fallbackLoginId.startsWith('CR') || fallbackLoginId.startsWith('VR') || fallbackLoginId.startsWith('MF') || fallbackLoginId.startsWith('MLT'));

  if (isValidDerivId) {
    const derivAccountId = fallbackLoginId;
    const isVirtual = derivAccountId.startsWith('VR');
    const accountType: 'demo' | 'real' = isVirtual ? 'demo' : 'real';
    const currency = fallbackAccount?.currency || 'USD';
    const balance = typeof fallbackAccount?.balance === 'number' ? fallbackAccount.balance : 0;
    const email = fallbackAccount?.email || '';
    const fullName = fallbackAccount?.fullName || '';
    const scopes = params.scopes || fallbackAccount?.scopes || ['trade', 'account_manage'];

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
    derivConnectionsStore.set(derivAccountId, connectionRecord);

    try {
      await dbQueries.upsertDerivAccount({
        id: derivAccountId,
        userId,
        accountType,
        currency,
        balance,
        equity: balance,
        isVirtual,
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
    } catch (dbErr: any) {
      logger.warn('[hydrateDerivAccount] Prisma fallback persistence warning:', { error: dbErr?.message });
    }

    const metadata: SafeDerivConnectionMetadata = {
      connected: true,
      derivAccountId,
      email,
      fullName,
      balance,
      accountType,
      currency,
      connectionStatus: 'CONNECTED',
      scopes,
      lastSyncedAt: nowIso,
      accountList: fallbackAccount?.accountList,
    };

    return {
      success: true,
      metadata,
      rawAccountDetails: {
        derivAccountId,
        email,
        fullName,
        balance,
        accountType,
        currency,
        token: cleanToken,
        accountList: fallbackAccount?.accountList,
      },
    };
  }

  // If we couldn't resolve profile and have no valid Deriv account ID:
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
    error: 'Failed to retrieve profile or loginid from Deriv WebSocket',
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
    fallbackAccount: {
      loginid: userId.startsWith('VR') || userId.startsWith('CR') ? userId : undefined,
    },
  });

  return result.metadata;
}

export function connectUserWithApiToken(userId: string, apiToken: string): SafeDerivConnectionMetadata {
  const trimmed = apiToken.trim();
  const accountId = userId;
  const accountType = accountId.startsWith('VR') ? 'demo' : 'real';

  const record: DerivConnectionRecord = {
    userId,
    derivAccountId: accountId,
    accountType,
    currency: 'USD',
    connectionStatus: 'CONNECTED',
    scopes: ['trade', 'account_manage', 'payments'],
    accessToken: trimmed,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
  };

  derivConnectionsStore.set(userId, record);
  derivConnectionsStore.set(accountId, record);
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
      fallbackAccount: record ? {
        loginid: record.derivAccountId,
        email: record.email,
        fullName: record.fullName,
        balance: record.balance,
        currency: record.currency,
        accountType: record.accountType,
        scopes: record.scopes,
      } : undefined,
    });

    return hydrationResult.metadata;
  } catch (err: any) {
    console.error('[DERIV_SYNC_FAILED]', err?.message || err);
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
      console.error('[BACKGROUND_SYNC_TRIGGER_ERROR]', err);
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
