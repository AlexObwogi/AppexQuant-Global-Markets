import { NextRequest, NextResponse } from 'next/server';
import { generateRandomString, generateCodeChallenge } from '@/lib/pkce';

export async function GET(request: NextRequest) {
  const { pathname, searchParams } = new URL(request.url);
  const isSignup = pathname.includes('signup') || pathname.includes('register') || searchParams.get('action') === 'signup';
  const action = isSignup ? 'signup' : 'connect';

  console.log(`[DERIV_OAUTH_INIT] Starting ${action.toUpperCase()} authentication flow.`);

  const state = generateRandomString(32);
  const codeVerifier = generateRandomString(43);
  const codeChallenge = generateCodeChallenge(codeVerifier);

  const clientId = process.env.DERIV_OAUTH_CLIENT_ID;
  const redirectUri = process.env.DERIV_OAUTH_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    console.error('[DERIV_OAUTH_INIT] Missing DERIV_OAUTH_CLIENT_ID or DERIV_OAUTH_REDIRECT_URI env variables.');
    return NextResponse.json({ error: 'OAuth server is misconfigured' }, { status: 500 });
  }

  // Construct official authorization URL
  const authUrl = new URL('https://auth.deriv.com/oauth2/auth');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', 'trade account_manage');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  if (isSignup) {
    authUrl.searchParams.set('prompt', 'registration');
  }

  console.log('[DERIV_OAUTH_INIT] Generated Auth URL:', authUrl.toString());

  const response = NextResponse.redirect(authUrl.toString(), 307);

  // Set transient PKCE cookies with secure options.
  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'none' as const,
    path: '/',
    maxAge: 600, // 10 minutes
  };

  response.cookies.set('deriv_oauth_state', state, cookieOptions);
  response.cookies.set('deriv_code_verifier', codeVerifier, cookieOptions);

  return response;
}
