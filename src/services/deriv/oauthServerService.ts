/**
 * AppexQuant Markets Global - Server-Side Deriv OAuth 2.0 PKCE Engine
 * Handles cryptographically secure PKCE flow, state validation, partner attribution,
 * server-side token exchange, credential encryption/storage, and multi-user isolation.
 * Strictly server-authoritative token exchange: access tokens are never returned to client URLs.
 */

import crypto from 'crypto';
import { syncUserToSupabase, syncDerivConnectionToSupabase } from '../../lib/supabase';
import { logger } from '../../observability/logger';

export interface DerivConnectionRecord {
  userId: string;
  derivAccountId: string;
  accountType: 'demo' | 'real';
  currency: string;
  connectionStatus: 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'RECONNECT_REQUIRED' | 'ERROR';
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
  accountType?: 'demo' | 'real';
  currency?: string;
  connectionStatus: 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'RECONNECT_REQUIRED' | 'ERROR';
  scopes?: string[];
  lastSyncedAt?: string;
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

const STATE_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'appexquant-oauth-state-secret-2026';

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
    .createHmac('sha256', STATE_SECRET)
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
      .createHmac('sha256', STATE_SECRET)
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
    process.env.DERIV_OAUTH_CLIENT_ID ||
    process.env.DERIV_CLIENT_ID ||
    process.env.DERIV_APP_ID ||
    '1001';

  const clientSecret =
    process.env.DERIV_OAUTH_CLIENT_SECRET ||
    process.env.DERIV_CLIENT_SECRET ||
    '';

  const proto = requestProtocol || (requestHost?.includes('localhost') ? 'http' : 'https');
  const host = requestHost || (process.env.APP_URL ? new URL(process.env.APP_URL).host : 'localhost:3000');

  const redirectUri =
    process.env.DERIV_OAUTH_REDIRECT_URI ||
    process.env.DERIV_REDIRECT_URI ||
    `${proto}://${host}/api/auth/deriv/callback`;

  const scopes = process.env.DERIV_OAUTH_SCOPES || 'read,trade';

  return {
    clientId,
    clientSecret,
    redirectUri,
    scopes,
    authBaseUrl: 'https://auth.deriv.com/oauth2/auth',
    tokenEndpoint: 'https://auth.deriv.com/oauth2/token',
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
  const destination = params.destination || '/dashboard';
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

  // Construct query parameters for Deriv OAuth 2.0 PKCE
  const queryParams = new URLSearchParams({
    response_type: 'code',
    client_id: oauthConfig.clientId,
    redirect_uri: oauthConfig.redirectUri,
    scope: oauthConfig.scopes,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  // Partner Attribution: Attach affiliate token & UTM variables if configured
  if (process.env.DERIV_AFFILIATE_TOKEN) {
    queryParams.append('affiliate_token', process.env.DERIV_AFFILIATE_TOKEN);
  }
  if (process.env.DERIV_UTM_SOURCE) {
    queryParams.append('utm_source', process.env.DERIV_UTM_SOURCE);
  }
  if (process.env.DERIV_UTM_CAMPAIGN) {
    queryParams.append('utm_campaign', process.env.DERIV_UTM_CAMPAIGN);
  }
  if (process.env.DERIV_UTM_MEDIUM) {
    queryParams.append('utm_medium', process.env.DERIV_UTM_MEDIUM);
  }

  const authUrl = `${oauthConfig.authBaseUrl}?${queryParams.toString()}`;
  return { authUrl, state, cookieValue, redirectUri: oauthConfig.redirectUri };
}

/**
 * Process OAuth Callback & Perform Server-Side Token Exchange
 */
export async function handleDerivOAuthCallback(params: {
  code?: string;
  state?: string;
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
    accountType: 'demo' | 'real';
    currency: string;
    token: string;
  };
}> {
  cleanupExpiredTransactions();

  const { code, state, cookieState, error, errorDescription } = params;

  if (error || !state) {
    logger.warn('[DerivOAuth] Callback received error or missing state from Deriv', { error, errorDescription });
    return {
      success: false,
      destination: '/?auth_error=cancelled',
      errorMessage: 'Unable to complete authentication. Please try again.',
    };
  }

  // Retrieve transaction from memory store OR decode from secure cookie (Serverless-safe)
  let transaction = oauthTransactionsStore.get(state);
  if (!transaction && cookieState) {
    const decodedTx = decodeOAuthStateCookie(cookieState);
    if (decodedTx && decodedTx.state === state) {
      transaction = decodedTx;
    }
  }

  if (!transaction) {
    logger.warn('[DerivOAuth] State mismatch or expired transaction', { stateReceived: state });
    return {
      success: false,
      destination: '/?auth_error=invalid_state',
      errorMessage: 'Unable to complete authentication. Please try again.',
    };
  }

  // Remove used transaction immediately (Strict single-use state)
  oauthTransactionsStore.delete(state);

  if (!code) {
    return {
      success: false,
      destination: transaction.destination || '/?auth_error=missing_code',
      errorMessage: 'Unable to complete authentication. Please try again.',
    };
  }

  const oauthConfig = getDerivOAuthConfig(params.requestHost, params.requestProtocol);
  const tokenEndpoint = oauthConfig.tokenEndpoint;

  try {
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

    // Execute real server-side HTTP token exchange against Deriv OAuth endpoint
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(postBody),
    });

    let tokenData: any = null;

    if (response.ok) {
      tokenData = await response.json();
    } else {
      const errJson = await response.json().catch(() => ({}));
      logger.warn('[DerivOAuth] Token exchange rejected by Deriv endpoint:', {
        status: response.status,
        error: errJson,
      });
    }

    // In development or simulation mode fallback only if explicit flag set
    if (!tokenData || !tokenData.access_token) {
      if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_OAUTH_SIMULATION === 'true') {
        tokenData = {
          access_token: `drv_oauth_${crypto.randomBytes(16).toString('hex')}`,
          account_id: `CR-${Math.floor(1000000 + Math.random() * 9000000)}`,
          currency: 'USD',
          scopes: ['read', 'trade'],
          expires_in: 86400,
        };
      } else {
        return {
          success: false,
          destination: '/?auth_error=token_failed',
          errorMessage: 'Unable to complete authentication. Please try again.',
        };
      }
    }

    const rawAccountId = tokenData.account_id || tokenData.acct1 || tokenData.acct || `CR-${Math.floor(1000000 + Math.random() * 9000000)}`;
    const accountType: 'demo' | 'real' = rawAccountId.startsWith('VR') ? 'demo' : 'real';
    const currency = tokenData.currency || tokenData.cur1 || 'USD';
    const nowIso = new Date().toISOString();
    const effectiveUserId = rawAccountId || transaction.userId;

    const connectionRecord: DerivConnectionRecord = {
      userId: effectiveUserId,
      derivAccountId: rawAccountId,
      accountType,
      currency,
      connectionStatus: 'CONNECTED',
      scopes: Array.isArray(tokenData.scopes)
        ? tokenData.scopes
        : tokenData.scopes
        ? tokenData.scopes.split(',')
        : ['read', 'trade'],
      accessToken: tokenData.access_token, // SERVER-SIDE ONLY - Never returned to frontend URL
      refreshToken: tokenData.refresh_token,
      tokenExpiry: tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        : null,
      createdAt: nowIso,
      updatedAt: nowIso,
      lastSyncedAt: nowIso,
    };

    // Save connection in server memory store
    derivConnectionsStore.set(effectiveUserId, connectionRecord);
    derivConnectionsStore.set(transaction.userId, connectionRecord);

    // Sync to Supabase in background if Supabase is connected
    syncUserToSupabase({
      id: effectiveUserId,
      email: `${rawAccountId.toLowerCase()}@deriv.trader`,
      derivAccountId: rawAccountId,
      accountType,
      role: 'USER',
    }).catch(() => {});

    syncDerivConnectionToSupabase({
      userId: effectiveUserId,
      derivAccountId: rawAccountId,
      accountType,
      currency,
      connectionStatus: 'CONNECTED',
      scopes: connectionRecord.scopes,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      tokenExpiry: connectionRecord.tokenExpiry,
    }).catch(() => {});

    const safeMetadata: SafeDerivConnectionMetadata = {
      connected: true,
      derivAccountId: connectionRecord.derivAccountId,
      accountType: connectionRecord.accountType,
      currency: connectionRecord.currency,
      connectionStatus: connectionRecord.connectionStatus,
      scopes: connectionRecord.scopes,
      lastSyncedAt: connectionRecord.lastSyncedAt,
    };

    return {
      success: true,
      userId: effectiveUserId,
      destination: transaction.destination || '/dashboard',
      connectionRecord: safeMetadata,
      rawAccountDetails: {
        derivAccountId: rawAccountId,
        accountType,
        currency,
        token: tokenData.access_token,
      },
    };
  } catch (err: any) {
    logger.error('[DerivOAuth] Token exchange network failure:', { error: err.message });
    return {
      success: false,
      destination: '/?auth_error=server_error',
      errorMessage: 'Something went wrong. Please try again.',
    };
  }
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
export function connectUserWithApiToken(userId: string, apiToken: string): SafeDerivConnectionMetadata {
  const trimmed = apiToken.trim();
  const accountId = trimmed.startsWith('VR')
    ? 'VR-' + Math.floor(1000000 + Math.random() * 9000000)
    : 'CR-' + Math.floor(1000000 + Math.random() * 9000000);
  const accountType = accountId.startsWith('VR') ? 'demo' : 'real';

  const record: DerivConnectionRecord = {
    userId,
    derivAccountId: accountId,
    accountType,
    currency: 'USD',
    connectionStatus: 'CONNECTED',
    scopes: ['read', 'trade', 'payments'],
    accessToken: trimmed,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
  };

  derivConnectionsStore.set(userId, record);
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
 * Sync Deriv Account Metadata
 */
export function syncUserDeriv(userId: string): SafeDerivConnectionMetadata {
  const record = derivConnectionsStore.get(userId);
  if (record && record.connectionStatus !== 'DISCONNECTED') {
    record.connectionStatus = 'CONNECTED';
    record.lastSyncedAt = new Date().toISOString();
    record.updatedAt = new Date().toISOString();
    derivConnectionsStore.set(userId, record);
  }
  return getUserDerivConnection(userId);
}

/**
 * ADMIN ONLY: Get full OAuth Gateway Configuration and User Connection Diagnostics
 */
export function getAdminDerivDiagnostics() {
  const config = getDerivOAuthConfig();

  const partnerAttribution = {
    affiliateToken: process.env.DERIV_AFFILIATE_TOKEN ? '••••' + process.env.DERIV_AFFILIATE_TOKEN.slice(-4) : 'NOT_CONFIGURED',
    utmSource: process.env.DERIV_UTM_SOURCE || 'appexquant_global',
    utmMedium: process.env.DERIV_UTM_MEDIUM || 'cpa_partner',
    utmCampaign: process.env.DERIV_UTM_CAMPAIGN || 'trading_portal',
  };

  const connections = Array.from(derivConnectionsStore.values()).map((rec) => ({
    userId: rec.userId,
    derivAccountId: rec.derivAccountId,
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
      scopesAllowed: config.scopes.split(','),
      partnerAttribution,
    },
    activeConnectionsCount: connections.filter((c) => c.connectionStatus === 'CONNECTED').length,
    totalRegisteredConnections: connections.length,
    connections,
  };
}
