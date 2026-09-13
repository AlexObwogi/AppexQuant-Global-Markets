/**
 * AppexQuant Markets Global - Affiliate Link & Traffic Lock-In Enforcer
 * File: app/api/auth/deriv/login/route.ts
 *
 * Capabilities:
 * - Enforces all authentication and account linking funnels to route strictly through proprietary gateway.
 * - Permanently embeds master affiliate tracking tag (`DERIV_AFFILIATE_TOKEN`) and UTM parameters.
 * - Utilizes unified scope normalization (`lib/auth/derivScope.ts`) formatting scopes with plus signs (+) for OAuth login redirects.
 * - Generates cryptographically secure PKCE code verifier/challenge and HMAC-signed state cookie.
 * - Returns structured JSON for SPA client applications or performs 302 redirect for direct browser flows.
 */

import { initiateDerivOAuth, getDerivOAuthConfig } from '@/src/services/deriv/oauthServerService.ts';
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

  try {
    const { authUrl, state, cookieValue, redirectUri } = initiateDerivOAuth({
      action,
      destination,
      requestHost,
      requestProtocol: proto,
    });

    const parsedAuthUrl = new URL(authUrl);
    
    // STRICT TRAFFIC LOCK-IN: Ensure master affiliate tracking tag is permanently attached
    if (!parsedAuthUrl.searchParams.has('affiliate_token')) {
      parsedAuthUrl.searchParams.set('affiliate_token', customAffiliate);
    }
    if (!parsedAuthUrl.searchParams.has('t')) {
      parsedAuthUrl.searchParams.set('t', customAffiliate);
    }
    
    // Ensure login scope formatting
    parsedAuthUrl.searchParams.set('scope', getLoginScopeString());

    const finalAuthUrl = parsedAuthUrl.toString();

    const headers = new Headers();
    headers.append('Set-Cookie', `deriv_oauth_state=${cookieValue}; Path=/; HttpOnly; ${cookieSameSite}; Max-Age=600`);
    headers.append('Set-Cookie', `affiliate_token=${encodeURIComponent(customAffiliate)}; Path=/; ${cookieSameSite}; Max-Age=2592000`);
    headers.set('X-Affiliate-Tracking-Enforced', customAffiliate);
    headers.set('X-Auth-Scope-Login', getLoginScopeString());

    console.log('[TrafficLockIn:DerivOAuth:Initiated]', {
      action,
      destination,
      affiliateTag: customAffiliate,
      scopes: getLoginScopeString(),
      redirectUri,
      isVercel: Boolean(process.env.VERCEL),
    });

    // Check if client expects JSON
    const acceptsHtml = request.headers.get('accept')?.includes('text/html');
    const isJsonRequested = url.searchParams.get('json') === 'true' || request.headers.get('accept')?.includes('application/json');

    if (isJsonRequested && !acceptsHtml) {
      headers.set('Content-Type', 'application/json');
      return new Response(
        JSON.stringify({
          success: true,
          authUrl: finalAuthUrl,
          state,
          redirectUri,
          affiliateToken: customAffiliate,
          scopes: getLoginScopeString(),
        }),
        { status: 200, headers }
      );
    }

    // Direct Browser Navigation: 302 Redirect to Deriv OAuth 2.0 Login Server
    headers.set('Location', finalAuthUrl);
    return new Response(null, { status: 302, headers });
  } catch (error: any) {
    const errorMsg = error?.message || 'Failed to initiate Deriv OAuth flow.';
    console.error('[TrafficLockIn:DerivOAuth:Error]', { error: errorMsg, stack: error?.stack });

    return new Response(
      JSON.stringify({
        success: false,
        error: 'OAUTH_INIT_FAILED',
        message: errorMsg,
        troubleshooting: [
          'Verify DERIV_CLIENT_ID and DERIV_REDIRECT_URI environment settings.',
          'Ensure SESSION_SECRET is configured for HMAC state signing.',
        ],
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  return GET(request);
}

// Handler for Express/Node/Vercel serverless integration
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
