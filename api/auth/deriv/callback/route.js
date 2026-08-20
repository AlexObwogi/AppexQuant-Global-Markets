import { NextResponse } from 'next/server';
import { handleDerivOAuthCallback } from '../../../../src/services/deriv/oauthServerService.ts';

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const verifier = url.searchParams.get('verifier');
    const token1 = url.searchParams.get('token1');
    const acct1 = url.searchParams.get('acct1');
    const cur1 = url.searchParams.get('cur1');

    if (!code && !(token1 && acct1)) {
      return NextResponse.json(
        { success: false, error: 'Missing authorization code or token parameters' },
        { status: 400 }
      );
    }

    let accessToken = token1 || '';
    let accountId = acct1 || '';

    if (code) {
      const appId = process.env.DERIV_APP_ID || process.env.CLIENT_ID || '1089';
      const clientSecret = process.env.DERIV_CLIENT_SECRET || process.env.CLIENT_SECRET || '';

      const postBody = new URLSearchParams();
      postBody.append('grant_type', 'authorization_code');
      postBody.append('code', code);
      postBody.append('app_id', appId);
      postBody.append('client_id', appId);
      if (clientSecret) {
        postBody.append('client_secret', clientSecret);
        postBody.append('app_secret', clientSecret);
      }
      const redirectUri = process.env.OAUTH_REDIRECT_URI || `${url.origin}/api/auth/deriv/callback`;
      postBody.append('redirect_uri', redirectUri);

      const tokenRes = await fetch('https://oauth.deriv.com/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: postBody.toString(),
      });

      if (!tokenRes.ok) {
        const errorText = await tokenRes.text();
        console.error('[DERIV_OAUTH_TOKEN_EXCHANGE_ERROR]', errorText);
        return NextResponse.json(
          { success: false, error: 'Token exchange failed', details: errorText },
          { status: 400 }
        );
      }

      const accountDetails = await tokenRes.json();
      accessToken = accountDetails.access_token || accountDetails.token1 || '';
      accountId = accountDetails.user_id || accountDetails.acct1 || accountDetails.loginid || '';
    }

    const callbackResult = await handleDerivOAuthCallback({
      code,
      state,
      verifier,
      token1: accessToken || token1,
      acct1: accountId || acct1,
      cur1,
      requestHost: url.host,
      requestProtocol: url.protocol.replace(':', ''),
    });

    const isHttps = url.protocol === 'https:';
    const redirectTarget = new URL(callbackResult.destination || '/', url.origin);
    const response = NextResponse.redirect(redirectTarget);

    const cookieSameSite = isHttps ? 'none' : 'lax';

    if (accessToken) {
      response.cookies.set('deriv_access_token', accessToken, {
        httpOnly: true,
        secure: isHttps || process.env.NODE_ENV === 'production',
        sameSite: cookieSameSite,
        path: '/',
        maxAge: 86400,
      });
    }

    const resolvedAccountId = callbackResult.rawAccountDetails?.derivAccountId || accountId || acct1;
    if (resolvedAccountId) {
      response.cookies.set('deriv_session_user_id', resolvedAccountId, {
        httpOnly: true,
        secure: isHttps || process.env.NODE_ENV === 'production',
        sameSite: cookieSameSite,
        path: '/',
        maxAge: 86400,
      });
    }

    return response;
  } catch (err) {
    console.error('[DERIV_CALLBACK_ROUTE_ERROR]', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  return GET(request);
}
