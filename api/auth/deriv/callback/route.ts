import { handleDerivOAuthCallback } from '../../../../src/services/deriv/oauthServerService.ts';
import { logger } from '../../../../src/observability/logger.ts';

function parseCookieHeader(cookieHeader: string | null): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach((c) => {
    const parts = c.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const rawVal = parts.slice(1).join('=').trim();
      try {
        cookies[key] = decodeURIComponent(rawVal);
      } catch {
        cookies[key] = rawVal;
      }
    }
  });
  return cookies;
}

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const code = searchParams.get('code') || undefined;
    const state = searchParams.get('state') || undefined;
    const verifier = searchParams.get('verifier') || undefined;
    const token1 = searchParams.get('token1') || undefined;
    const acct1 = searchParams.get('acct1') || undefined;
    const cur1 = searchParams.get('cur1') || undefined;
    const error = searchParams.get('error') || undefined;
    const errorDescription = searchParams.get('error_description') || undefined;

    const cookieHeader = request.headers.get('cookie');
    const cookies = parseCookieHeader(cookieHeader);
    const cookieState = cookies['deriv_oauth_state'];

    const requestHost = url.host;
    const requestProtocol = url.protocol.replace(':', '');

    const result = await handleDerivOAuthCallback({
      code,
      state,
      verifier,
      token1,
      acct1,
      cur1,
      cookieState,
      error,
      errorDescription,
      requestHost,
      requestProtocol,
    });

    const isHttps = requestProtocol === 'https' || process.env.NODE_ENV === 'production';
    const cookieSameSite = isHttps ? 'None' : 'Lax';
    const secureFlag = isHttps ? '; Secure' : '';

    if (!result.success) {
      const errorDest = result.destination && result.destination.startsWith('/')
        ? result.destination
        : `/?auth_error=1&message=${encodeURIComponent(result.errorMessage || 'Authentication failed')}`;
      
      const headers = new Headers();
      headers.set('Location', errorDest);
      headers.append('Set-Cookie', `deriv_oauth_state=; Path=/; HttpOnly; SameSite=${cookieSameSite}${secureFlag}; Max-Age=0`);
      return new Response(null, { status: 302, headers });
    }

    const rawAccount = result.rawAccountDetails;
    const accessToken = rawAccount?.token || token1;
    const accountId = rawAccount?.derivAccountId || result.userId;

    const headers = new Headers();
    headers.append('Set-Cookie', `deriv_oauth_state=; Path=/; HttpOnly; SameSite=${cookieSameSite}${secureFlag}; Max-Age=0`);

    if (accessToken) {
      headers.append(
        'Set-Cookie',
        `deriv_access_token=${encodeURIComponent(accessToken)}; Path=/; HttpOnly; SameSite=${cookieSameSite}${secureFlag}; Max-Age=86400`
      );
    }

    if (accountId) {
      headers.append(
        'Set-Cookie',
        `deriv_session_user_id=${encodeURIComponent(accountId)}; Path=/; HttpOnly; SameSite=${cookieSameSite}${secureFlag}; Max-Age=86400`
      );
    }

    const destination = result.destination && result.destination.startsWith('/') ? result.destination : '/';

    if (request.headers.get('accept')?.includes('application/json')) {
      headers.set('Content-Type', 'application/json');
      return new Response(
        JSON.stringify({
          success: true,
          accountId,
          destination,
          accountType: rawAccount?.accountType,
          currency: rawAccount?.currency,
        }),
        { status: 200, headers }
      );
    }

    headers.set('Location', destination);
    return new Response(null, { status: 302, headers });
  } catch (err: any) {
    logger.error('[DerivCallbackRoute] Callback error:', { error: err?.message || String(err) });
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  return GET(request);
}
