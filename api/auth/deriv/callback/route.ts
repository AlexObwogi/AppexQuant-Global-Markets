/**
 * AppexQuant Markets Global - Deriv OAuth login route
 *
 * This route must not permit arbitrary caller-controlled redirect URIs,
 * must use the canonical server-side configured callback, and must emit
 * no-store headers for sensitive auth responses.
 */

import { initiateDerivOAuth } from '@/src/services/deriv/oauthServerService.ts';
import { getLoginScopeString } from '@/lib/auth/derivScope.ts';
import { MASTER_AFFILIATE_TOKEN } from '@/src/services/revenue/transactionInterceptor.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const action = (url.searchParams.get('action') as 'connect' | 'signup') || (url.pathname.includes('register') || url.pathname.includes('signup') ? 'signup' : 'connect');
  const destination = url.searchParams.get('destination') || '/';
  const customAffiliate = url.searchParams.get('affiliate_token') || url.searchParams.get('t') || MASTER_AFFILIATE_TOKEN;

  const requestHost = request.headers.get('host') || 'localhost:3000';
  const proto = request.headers.get('x-forwarded-proto') || (url.protocol.replace(':', '') || 'http');
  const isHttps = proto === 'https' || process.env.APP_ENV === 'production' || Boolean(process.env.VERCEL);
  const cookieSameSite = isHttps ? 'SameSite=None; Secure' : 'SameSite=Lax';
  const suppliedRedirectUri = url.searchParams.get('redirect_uri');

  try {
    const { authUrl, state, cookieValue, redirectUri } = initiateDerivOAuth({
      action,
      destination,
      requestHost,
      requestProtocol: proto,
      redirectUri: suppliedRedirectUri || undefined,
    });

    const parsedAuthUrl = new URL(authUrl);
    if (!parsedAuthUrl.searchParams.has('affiliate_token')) {
      parsedAuthUrl.searchParams.set('affiliate_token', customAffiliate);
    }
    if (!parsedAuthUrl.searchParams.has('t')) {
      parsedAuthUrl.searchParams.set('t', customAffiliate);
    }
    parsedAuthUrl.searchParams.set('scope', getLoginScopeString());

    const finalAuthUrl = parsedAuthUrl.toString();
    const headers = new Headers();
    headers.set('Cache-Control', 'no-store, private');
    headers.append('Set-Cookie', `deriv_oauth_state=${cookieValue}; Path=/; HttpOnly; ${cookieSameSite}; Max-Age=600`);
    headers.append('Set-Cookie', `affiliate_token=${encodeURIComponent(customAffiliate)}; Path=/; ${cookieSameSite}; Max-Age=2592000`);
    headers.set('X-Affiliate-Tracking-Enforced', customAffiliate);
    headers.set('X-Auth-Scope-Login', getLoginScopeString());

    const acceptsHtml = request.headers.get('accept')?.includes('text/html');
    const isJsonRequested = url.searchParams.get('json') === 'true' || request.headers.get('accept')?.includes('application/json');

    if (isJsonRequested && !acceptsHtml) {
      headers.set('Content-Type', 'application/json');
      return new Response(JSON.stringify({
        success: true,
        authUrl: finalAuthUrl,
        state,
        redirectUri,
        affiliateToken: customAffiliate,
        scopes: getLoginScopeString(),
      }), { status: 200, headers });
    }

    headers.set('Location', finalAuthUrl);
    return new Response(null, { status: 302, headers });
  } catch (error: any) {
    const errorMsg = error?.message || 'Failed to initiate Deriv OAuth flow.';
    return new Response(JSON.stringify({
      success: false,
      error: 'OAUTH_INIT_FAILED',
      message: errorMsg,
      troubleshooting: [
        'Verify DERIV_CLIENT_ID and DERIV_REDIRECT_URI environment settings.',
        'Ensure SESSION_SECRET is configured for secure OAuth state validation.',
      ],
    }), { status: 500, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store, private' } });
  }
}

export async function POST(request: Request): Promise<Response> {
  return GET(request);
}

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
