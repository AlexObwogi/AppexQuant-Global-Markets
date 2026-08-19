import { NextRequest, NextResponse } from 'next/server';
import { generateRandomString, generateCodeChallenge } from '@/lib/pkce';

export async function GET(request: NextRequest) {
  console.log('[DERIV_SIGNUP_INIT] Initializing registration flow.');

  const state = generateRandomString(32);
  const codeVerifier = generateRandomString(64);
  const codeChallenge = generateCodeChallenge(codeVerifier);

  const clientId = process.env.DERIV_OAUTH_CLIENT_ID;
  const redirectUri = process.env.DERIV_OAUTH_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    console.error('[DERIV_SIGNUP_ERROR] Missing environment credentials.');
    return NextResponse.json({ error: 'OAuth signup misconfigured on server.' }, { status: 500 });
  }

  const authUrl = new URL('https://auth.deriv.com/oauth2/auth');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', 'trade account_manage');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('prompt', 'registration'); // Mandatory signup hook

  const response = NextResponse.redirect(authUrl.toString(), 307);

  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'none' as const,
    path: '/',
    maxAge: 600,
  };

  response.cookies.set('deriv_oauth_state', state, cookieOptions);
  response.cookies.set('deriv_code_verifier', codeVerifier, cookieOptions);

  return response;
}
