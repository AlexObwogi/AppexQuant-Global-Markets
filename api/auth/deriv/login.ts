/**
 * AppExQuant Markets Global - Serverless OAuth Initiation Route
 * Handles Deriv OAuth 2.0 PKCE Flow Initiation with valid query parameters
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initiateDerivOAuth } from '../../../src/services/deriv/oauthServerService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const isHttps =
    req.headers['x-forwarded-proto'] === 'https' ||
    Boolean((req as any).socket?.encrypted) ||
    process.env.APP_ENV === 'production';
  const secureFlag = isHttps ? '; Secure' : '';

  try {
    const isRegisterRoute = (req.url || '').includes('register') || (req.url || '').includes('signup');
    const action = isRegisterRoute ? 'signup' : (((req.query.action || req.body?.action) as 'connect' | 'signup') || 'connect');
    const destination = ((req.query.destination || req.body?.destination) as string) || '/dashboard';
    const requestHost = req.headers.host || 'appex-quant-global-markets.vercel.app';
    const requestProtocol = isHttps ? 'https' : 'http';

    const { authUrl, state, cookieValue } = initiateDerivOAuth({
      action,
      destination,
      requestHost,
      requestProtocol,
    });

    res.setHeader('Set-Cookie', [
      `deriv_oauth_state=${cookieValue}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${secureFlag}`,
    ]);

    if (req.method === 'POST' || req.headers.accept?.includes('application/json') || req.query.json === 'true') {
      return res.status(200).json({
        success: true,
        data: { authUrl, state },
      });
    }

    // Direct browser full-page redirect to Deriv OAuth 2.0 endpoint
    return res.redirect(authUrl);
  } catch (err: any) {
    const errorMsg = err?.message || 'Failed to initiate Deriv OAuth';
    console.error('[DERIV_OAUTH_SERVERLESS_LOGIN_ERROR]', {
      message: errorMsg,
      timestamp: new Date().toISOString(),
    });

    if (req.headers.accept?.includes('application/json')) {
      return res.status(500).json({
        success: false,
        error: {
          message: errorMsg,
          code: 'OAUTH_INIT_FAILED',
        },
      });
    }

    return res.redirect(`/?auth_error=1&message=${encodeURIComponent(`Deriv OAuth Init Error: ${errorMsg}`)}`);
  }
}
