import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  console.log('[DERIV_CALLBACK] Incoming callback parameters received:', {
    hasCode: !!code,
    state,
    error,
    errorDescription,
  });

  if (error) {
    console.warn('[DERIV_CALLBACK] User cancelled or Deriv error:', errorDescription);
    return NextResponse.redirect(new URL('/?auth_error=cancelled', request.url));
  }

  if (!code || !state) {
    console.error('[DERIV_CALLBACK] Missing authentication code or state parameter.');
    return NextResponse.redirect(new URL('/?auth_error=bad_request', request.url));
  }

  const cookieStore = request.cookies;
  const storedState = cookieStore.get('deriv_oauth_state')?.value;
  const storedVerifier = cookieStore.get('deriv_code_verifier')?.value;

  console.log('[DERIV_CALLBACK] Stored verifiers validation:', {
    storedStateExists: !!storedState,
    statesMatch: storedState === state,
    storedVerifierExists: !!storedVerifier,
  });

  if (!storedState || storedState !== state) {
    console.error('[DERIV_CALLBACK] State mismatch detected. Request rejected.');
    return NextResponse.redirect(new URL('/?auth_error=state_mismatch', request.url));
  }

  if (!storedVerifier) {
    console.error('[DERIV_CALLBACK] Missing stored PKCE code_verifier.');
    return NextResponse.redirect(new URL('/?auth_error=missing_verifier', request.url));
  }

  try {
    console.log('[DERIV_CALLBACK] Launching server-side authorization code exchange...');

    const tokenResponse = await fetch('https://auth.deriv.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.DERIV_OAUTH_CLIENT_ID || '',
        client_secret: process.env.DERIV_OAUTH_CLIENT_SECRET || '',
        code,
        code_verifier: storedVerifier,
        redirect_uri: process.env.DERIV_OAUTH_REDIRECT_URI || '',
      }),
    });

    if (!tokenResponse.ok) {
      const errorResponseText = await tokenResponse.text();
      throw new Error(`Token endpoint HTTP error ${tokenResponse.status}: ${errorResponseText}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    console.log('[DERIV_CALLBACK] Code exchange successful. Setting user session.');

    const response = NextResponse.redirect(new URL('/', request.url));
    
    // Set session cookie
    response.cookies.set('appex_session_token', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 86400, // 24 hours
    });

    // Remove transient verifier and state cookies
    response.cookies.delete('deriv_oauth_state');
    response.cookies.delete('deriv_code_verifier');

    console.log('[DERIV_CALLBACK] Success. Redirecting to AppexQuant home.');
    return response;

  } catch (err: any) {
    console.error('[DERIV_CALLBACK] Uncaught token exchange exception:', err.message);
    return NextResponse.redirect(new URL('/?auth_error=exchange_failed', request.url));
  }
}
