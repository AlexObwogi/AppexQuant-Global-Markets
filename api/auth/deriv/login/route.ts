import { initiateDerivOAuth } from '../../../../src/services/deriv/oauthServerService.ts';
import { logSecurityEvent } from '../../../../src/observability/audit.ts';
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
    const isRegister = url.pathname.includes('register') || url.pathname.includes('signup');
    const actionParam = searchParams.get('action');
    const action = isRegister ? 'signup' : (actionParam === 'signup' ? 'signup' : 'connect');
    const destination = searchParams.get('destination') || '/';

    const requestHost = url.host;
    const requestProtocol = url.protocol.replace(':', '');

    const { authUrl, state, cookieValue } = initiateDerivOAuth({
      action,
      destination,
      requestHost,
      requestProtocol,
    });

    const isHttps = requestProtocol === 'https';
    const cookieSameSite = isHttps ? 'None' : 'Lax';
    const secureFlag = isHttps || process.env.NODE_ENV === 'production' ? '; Secure' : '';

    const cookiesToSet = [
      `deriv_oauth_state=${cookieValue}; Path=/; HttpOnly; SameSite=${cookieSameSite}${secureFlag}; Max-Age=600`,
    ];

    const headers = new Headers();
    cookiesToSet.forEach((c) => headers.append('Set-Cookie', c));

    if (searchParams.get('json') === 'true' || request.headers.get('accept')?.includes('application/json')) {
      headers.set('Content-Type', 'application/json');
      return new Response(JSON.stringify({ success: true, authUrl, state }), {
        status: 200,
        headers,
      });
    }

    headers.set('Location', authUrl);
    return new Response(null, {
      status: 302,
      headers,
    });
  } catch (err: any) {
    logger.error('[DerivLoginRoute] Failed to initiate OAuth login:', { error: err?.message || String(err) });
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Failed to initiate Deriv OAuth login' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  return GET(request);
}
