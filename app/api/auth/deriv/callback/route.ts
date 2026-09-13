/**
 * AppexQuant Markets Global - Hardened Deriv OAuth Callback Route Handler
 * File: app/api/auth/deriv/callback/route.ts
 *
 * Production Vercel Serverless / Next.js App Router Route:
 * - Uses unified scope normalization from lib/auth/derivScope.ts (plus for OAuth redirects, comma for API).
 * - Extracts authorization code from incoming request.
 * - Exchanges authorization code for access/refresh tokens using comma-normalized scope string.
 * - Validates token response and explicitly parses accounts_list / account_list array returned by Deriv.
 * - When account discovery fails: returns a detailed structured JSON error response (including raw error
 *   payload and actionable recovery instructions) instead of entering a 307 redirect loop.
 * - Vercel Production Environment Guard: logs detailed diagnostic context for invalid scopes,
 *   expired auth codes, or unauthorized account mapping.
 */

import { handleDerivOAuthCallback } from '@/src/services/deriv/oauthServerService.ts';
import { isValidDerivAccountId } from '@/src/services/deriv/syncStateMachine.ts';
import { createSessionToken, SessionPayload, encryptSensitiveData } from '@/src/services/security.ts';
import { getBackendScopeString, getLoginScopeString } from '@/lib/auth/derivScope.ts';
import { UserRole } from '@/src/types/user.ts';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ACTIONABLE_RECOVERY_INSTRUCTIONS = [
  'Verify your Deriv account has granted all required scopes: read, trade, admin, and payments.',
  'Ensure you have at least one active Deriv real or demo trading account (e.g. CR*, VRTC*, MTR*).',
  'Clear any stale browser authentication cookies and re-authenticate via the "Connect Deriv" portal.',
  'If you recently registered, complete your Deriv profile verification to ensure account IDs are provisioned.',
];

function parseCookieHeader(cookieHeader: string | null): Record<string, string> {
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

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code') || undefined;
  const state = url.searchParams.get('state') || undefined;
  const verifier = url.searchParams.get('verifier') || undefined;
  const error = url.searchParams.get('error') || undefined;
  const errorDescription = url.searchParams.get('error_description') || undefined;

  const cookieHeader = request.headers.get('cookie');
  const cookies = parseCookieHeader(cookieHeader);
  const cookieState = cookies['deriv_oauth_state'];

  const requestHost = request.headers.get('host') || 'localhost:3000';
  const proto = request.headers.get('x-forwarded-proto') || (url.protocol.replace(':', '') || 'http');
  const isHttps = proto === 'https' || process.env.APP_ENV === 'production' || Boolean(process.env.VERCEL);
  const cookieSameSite = isHttps ? 'SameSite=None; Secure' : 'SameSite=Lax';

  const headers = new Headers();
  // Clear temporary OAuth state cookie immediately to prevent replay
  headers.append('Set-Cookie', `deriv_oauth_state=; Path=/; HttpOnly; ${cookieSameSite}; Max-Age=0`);
  headers.set('X-Auth-Scope-Backend', getBackendScopeString());
  headers.set('X-Vercel-Auth-Guard', 'ENABLED');
  headers.set('Content-Type', 'application/json');

  // Vercel diagnostic log
  console.log('[Vercel:DerivOAuth:Callback] Processing callback request:', {
    hasCode: Boolean(code),
    hasState: Boolean(state),
    hasCookieState: Boolean(cookieState),
    isVercel: Boolean(process.env.VERCEL),
    vercelRegion: process.env.VERCEL_REGION || 'local',
    host: requestHost,
    proto,
    configuredBackendScopes: getBackendScopeString(),
    configuredLoginScopes: getLoginScopeString(),
  });

  // Handle immediate authorization errors from Deriv OAuth server
  if (error) {
    const cleanErrorMsg = errorDescription || error;
    console.error('[Vercel:DerivOAuth:ErrorResponse] Deriv returned authorization error:', {
      error,
      errorDescription: cleanErrorMsg,
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: 'OAUTH_AUTHORIZATION_DENIED',
        message: cleanErrorMsg,
        rawError: {
          error,
          error_description: errorDescription,
        },
        scopesRequested: getLoginScopeString(),
        recoveryInstructions: ACTIONABLE_RECOVERY_INSTRUCTIONS,
      }),
      { status: 400, headers }
    );
  }

  // Execute token exchange and authenticated account discovery
  const result = await handleDerivOAuthCallback({
    code,
    state,
    verifier,
    cookieState,
    error,
    errorDescription,
    requestHost,
    requestProtocol: proto,
  });

  // Handle token exchange or state failure with detailed structured JSON error response
  if (!result.success) {
    console.error('[Vercel:DerivOAuth:ExchangeFailed] Deriv OAuth exchange failed:', {
      errorMessage: result.errorMessage,
      destination: result.destination,
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: 'OAUTH_TOKEN_EXCHANGE_FAILED',
        message: result.errorMessage || 'Deriv OAuth token exchange failed.',
        rawPayload: {
          errorCode: 'EXCHANGE_FAILED',
          errorMessage: result.errorMessage,
          destination: result.destination,
        },
        scopesExpected: getBackendScopeString(),
        recoveryInstructions: ACTIONABLE_RECOVERY_INSTRUCTIONS,
      }),
      { status: 400, headers }
    );
  }

  // Strict Account Discovery Validation (Explicitly parse accounts_list / account_list)
  const verifiedLoginId = result.rawAccountDetails?.derivAccountId || result.connectionRecord?.derivAccountId;
  const discoveredAccounts = result.rawAccountDetails?.accountList || [];

  if (!verifiedLoginId || !isValidDerivAccountId(verifiedLoginId) || (discoveredAccounts.length === 0 && !verifiedLoginId)) {
    console.error('[DerivREST] Account discovery returned no valid Deriv account IDs.', {
      verifiedLoginId,
      discoveredAccountsCount: discoveredAccounts.length,
      rawAccountDetails: result.rawAccountDetails,
      connectionStatus: result.connectionRecord?.connectionStatus,
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: 'ACCOUNT_DISCOVERY_FAILED',
        message: 'Account discovery returned no valid Deriv account IDs under this profile.',
        details: {
          discoveredAccountsCount: discoveredAccounts.length,
          verifiedLoginId: verifiedLoginId || null,
          requiredScopes: getBackendScopeString(),
        },
        rawPayload: {
          accountDetails: result.rawAccountDetails || null,
          connectionRecord: result.connectionRecord || null,
        },
        recoveryInstructions: ACTIONABLE_RECOVERY_INSTRUCTIONS,
      }),
      { status: 400, headers }
    );
  }

  // Ensure state machine is connected
  if (!result.connectionRecord || result.connectionRecord.connectionStatus !== 'CONNECTED' || !result.connectionRecord.connected) {
    const errorMsg = 'Deriv account verification failed: State machine did not reach CONNECTED state.';
    console.error('[Vercel:DerivOAuth:NotConnected]', { errorMsg, record: result.connectionRecord });

    return new Response(
      JSON.stringify({
        success: false,
        error: 'CONNECTION_STATE_UNVERIFIED',
        message: errorMsg,
        rawPayload: {
          connectionStatus: result.connectionRecord?.connectionStatus || 'UNKNOWN',
          record: result.connectionRecord,
        },
        recoveryInstructions: ACTIONABLE_RECOVERY_INSTRUCTIONS,
      }),
      { status: 400, headers }
    );
  }

  // Provision session payload and authenticated cookies
  const accountId = verifiedLoginId;
  const loginid = verifiedLoginId;
  const accountType = result.rawAccountDetails?.accountType || (verifiedLoginId.startsWith('VR') ? 'demo' : 'real');
  const currency = result.rawAccountDetails?.currency || 'USD';
  const realEmail = result.rawAccountDetails?.email || '';
  const fullName = result.rawAccountDetails?.fullName;
  const balance = result.rawAccountDetails?.balance ?? 0;
  const csrfToken = crypto.randomBytes(32).toString('hex');
  const rawToken = result.rawAccountDetails?.token;
  const encryptedDerivToken = rawToken ? encryptSensitiveData(rawToken) : undefined;
  const appUserId =
    typeof result.userId === 'string' && result.userId.startsWith('usr-')
      ? result.userId
      : `usr-${crypto.randomBytes(6).toString('hex')}`;

  const sessionPayload: SessionPayload = {
    userId: appUserId,
    email: realEmail,
    fullName,
    balance,
    derivAccountId: accountId,
    accountType,
    currency,
    role: realEmail === 'obwogialex728@gmail.com' || accountId.toLowerCase().includes('admin') ? UserRole.ADMIN : UserRole.USER,
    isElevated: false,
    elevatedUntil: null,
    csrfToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    encryptedDerivToken,
  };

  const sessionToken = createSessionToken(sessionPayload);

  headers.append('Set-Cookie', `session_token=${sessionToken}; Path=/; HttpOnly; ${cookieSameSite}; Max-Age=604800`);
  if (rawToken) {
    headers.append('Set-Cookie', `deriv_access_token=${encodeURIComponent(rawToken)}; Path=/; HttpOnly; ${cookieSameSite}; Max-Age=86400`);
  }
  headers.append('Set-Cookie', `deriv_session_user_id=${encodeURIComponent(accountId)}; Path=/; HttpOnly; ${cookieSameSite}; Max-Age=86400`);

  console.log('[Vercel:DerivOAuth:SessionEstablished]', {
    loginid,
    accountId,
    accountType,
    currency,
    userId: appUserId,
  });

  const rawDest = result.destination;
  const safeDestination =
    rawDest && rawDest.startsWith('/') && rawDest !== '/' && rawDest !== '/login' && rawDest !== '/auth'
      ? rawDest
      : '/';

  // If client prefers JSON or is an AJAX/API call, respond with success JSON; otherwise perform 302 redirect to app
  const acceptsHtml = request.headers.get('accept')?.includes('text/html');
  if (acceptsHtml) {
    headers.delete('Content-Type');
    headers.set('Location', new URL(safeDestination, request.url).toString());
    return new Response(null, { status: 302, headers });
  }

  return new Response(
    JSON.stringify({
      success: true,
      sessionToken,
      user: {
        userId: appUserId,
        loginid,
        accountId,
        derivAccountId: accountId,
        accountType,
        currency,
        email: sessionPayload.email,
        fullName: sessionPayload.fullName,
        balance: sessionPayload.balance,
        role: sessionPayload.role,
      },
      accountList: result.rawAccountDetails?.accountList,
      destination: safeDestination,
    }),
    { status: 200, headers }
  );
}

export async function POST(request: Request): Promise<Response> {
  return GET(request);
}

// Handler for Express/Node/Vercel serverless functions
export default async function handler(req: any, res: any) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const protocol = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
  const host = req.headers.host || 'localhost:3000';
  const url = `${protocol}://${host}${req.url}`;
  
  const webReq = new Request(url, {
    method: req.method,
    headers: req.headers,
  });

  const response = await GET(webReq);
  
  response.headers.forEach((val, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      const existing = res.getHeader('Set-Cookie');
      if (Array.isArray(existing)) {
        res.setHeader('Set-Cookie', [...existing, val]);
      } else if (existing) {
        res.setHeader('Set-Cookie', [existing, val]);
      } else {
        res.setHeader('Set-Cookie', [val]);
      }
    } else {
      res.setHeader(key, val);
    }
  });

  const location = response.headers.get('Location');
  if (location) {
    return res.redirect(response.status, location);
  }

  const body = await response.text();
  return res.status(response.status).send(body);
}
