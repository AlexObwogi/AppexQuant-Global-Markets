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

import {
  DERIV_OAUTH_SCOPES,
  DERIV_OAUTH_SCOPE_STRING,
  getLoginScopeString,
  getBackendScopeString,
  parseRawScopes,
} from '../../lib/auth/derivScope.ts';

import { isValidDerivAccountId } from './syncStateMachine.ts';

const DERIV_AUTH_ENDPOINT = 'https://auth.deriv.com/oauth2/auth';
const DERIV_TOKEN_ENDPOINT = 'https://auth.deriv.com/oauth2/token';
const DERIV_OPTIONS_API_BASE = 'https://api.derivws.com/trading/v1/options';
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const DERIV_WS_OTP_TTL_SECONDS = 120;
const PROFILE_TIMEOUT_MS = 10_000;
const OTP_WS_TIMEOUT_MS = 8_000;

export function getDerivOAuthConfig(requestHost?: string, requestProtocol?: string) {
  const clientId = cleanString(process.env.DERIV_CLIENT_ID || getDerivOAuthClientId());
  const appId = clientId;
  const clientSecret = cleanString(process.env.DERIV_OAUTH_SECRET);

  const configuredRedirect = cleanString(process.env.DERIV_REDIRECT_URI || process.env.VITE_REDIRECT_URI);
  const appOrigin = cleanString(process.env.APP_URL || process.env.NEXT_PUBLIC_SITE_URL);

  let redirectUri = configuredRedirect || (appOrigin ? `${appOrigin.replace(/\/$/, '')}/api/auth/deriv/callback` : '');

  if (redirectUri) {
    try {
      const parsed = new URL(redirectUri);
      if ((process.env.NODE_ENV === 'production' || process.env.VERCEL) && parsed.protocol !== 'https:') {
        throw new Error('Production OAuth redirect must use HTTPS.');
      }
    } catch {
      throw new Error('DERIV_REDIRECT_URI must be a valid absolute URL.');
    }
  } else if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    throw new Error('DERIV_REDIRECT_URI is required in production.');
  }

  const scopes = getLoginScopeString(cleanString(process.env.DERIV_OAUTH_SCOPES) || cleanString(process.env.DERIV_OAUTH_SCOPE) || cleanString(process.env.DERIV_SCOPES) || DERIV_OAUTH_SCOPE_STRING);

  return {
    clientId,
    appId,
    clientSecret,
    redirectUri,
    scopes,
    affiliateToken: cleanString(process.env.DERIV_AFFILIATE_TOKEN),
    utmMedium: cleanString(process.env.DERIV_UTM_MEDIUM),
    authBaseUrl: cleanString(process.env.DERIV_AUTH_URL) || DERIV_AUTH_ENDPOINT,
    tokenEndpoint: cleanString(process.env.DERIV_TOKEN_ENDPOINT) || DERIV_TOKEN_ENDPOINT,
  };
}

function cleanString(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/^['"]|['"]$/g, '');
}

function getStateSecret(): string {
  const secret = cleanString(process.env.SESSION_SECRET || process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET);
  if (secret) {
    return secret;
  }
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    throw new Error('SESSION_SECRET is required in production for secure OAuth state validation.');
  }
  return 'local-development-oauth-state-secret';
}

export function initiateDerivOAuth(params: {
  userId?: string;
  action?: 'connect' | 'signup';
  destination?: string;
  requestHost?: string;
  requestProtocol?: string;
  prompt?: string;
  redirectUri?: string;
}): {
  authUrl: string;
  state: string;
  cookieValue: string;
  redirectUri: string;
} {
  const action = params.action || 'connect';
  cleanupExpiredTransactions();

  const oauthConfig = getDerivOAuthConfig(params.requestHost, params.requestProtocol);
  const canonicalRedirectUri = oauthConfig.redirectUri;
  const requestedRedirectUri = cleanString(params.redirectUri);

  if (requestedRedirectUri && canonicalRedirectUri && requestedRedirectUri !== canonicalRedirectUri) {
    throw new Error('Caller-supplied redirect_uri does not match the canonical server-side redirect URI.');
  }

  const redirectUriToUse = canonicalRedirectUri;
  if (!oauthConfig.clientId) {
    throw new Error('DERIV_CLIENT_ID is not configured.');
  }

  const userId = cleanString(params.userId) || `usr-${crypto.randomBytes(12).toString('hex')}`;
  const destination = cleanString(params.destination) || '/';
  const { codeVerifier, codeChallenge } = generatePKCE();
  const state = generateState();
  const transaction: OAuthTransaction = {
    state,
    codeVerifier,
    userId,
    action,
    destination,
    redirectUri: redirectUriToUse,
    createdAt: Date.now(),
  };

  oauthTransactionsStore.set(state, transaction);
  const cookieValue = encodeOAuthStateCookie(transaction);

  const extraParams: Record<string, string> = {};
  if (params.prompt) {
    extraParams.prompt = params.prompt;
  }
  if (oauthConfig.affiliateToken) {
    extraParams.affiliate_token = oauthConfig.affiliateToken;
    extraParams.t = oauthConfig.affiliateToken;
  }
  if (oauthConfig.utmMedium) {
    extraParams.utm_medium = oauthConfig.utmMedium;
  }

  const authUrl = buildAuthUrl({
    clientId: oauthConfig.clientId,
    appId: oauthConfig.appId || undefined,
    redirectUri: redirectUriToUse,
    scope: oauthConfig.scopes || DERIV_OAUTH_SCOPE,
    state,
    codeChallenge,
    codeChallengeMethod: 'S256',
    action,
    extraParams: Object.keys(extraParams).length > 0 ? extraParams : undefined,
  });

  return { authUrl, state, cookieValue, redirectUri: redirectUriToUse };
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

const oauthTransactionsStore = new Map<string, OAuthTransaction>();

function cleanupExpiredTransactions(): void {
  const now = Date.now();
  for (const [state, transaction] of oauthTransactionsStore.entries()) {
    if (now - transaction.createdAt > OAUTH_STATE_TTL_MS) {
      oauthTransactionsStore.delete(state);
    }
  }
}

export function base64UrlEncode(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const verifierBytes = crypto.randomBytes(32);
  const codeVerifier = base64UrlEncode(verifierBytes);
  const digest = crypto.createHash('sha256').update(codeVerifier).digest();
  const codeChallenge = base64UrlEncode(digest);
  return { codeVerifier, codeChallenge };
}

export function generateState(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function encodeOAuthStateCookie(transaction: OAuthTransaction): string {
  const payload = Buffer.from(JSON.stringify(transaction)).toString('base64url');
  const signature = crypto.createHmac('sha256', getStateSecret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function decodeOAuthStateCookie(cookieValue?: string): OAuthTransaction | null {
  const value = cleanString(cookieValue);
  if (!value) {
    return null;
  }
  try {
    const parts = value.split('.');
    if (parts.length !== 2) return null;
    const [payload, signature] = parts;
    const expectedSignature = crypto.createHmac('sha256', getStateSecret()).update(payload).digest('base64url');
    const supplied = Buffer.from(signature);
    const expected = Buffer.from(expectedSignature);
    if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) {
      return null;
    }
    const transaction = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as OAuthTransaction;
    if (!transaction || !transaction.state || !transaction.codeVerifier || !transaction.redirectUri || !transaction.userId || !transaction.createdAt) {
      return null;
    }
    if (Date.now() - transaction.createdAt > OAUTH_STATE_TTL_MS) {
      return null;
    }
    return transaction;
  } catch {
    return null;
  }
}
