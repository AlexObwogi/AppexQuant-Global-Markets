import { exchangeCodeForToken, fetchUserProfile, getDerivAppId } from '../../../../../services/oauthService';

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const searchParams = url.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  const protocol = url.protocol;
  const host = url.host;
  const redirectUri = `${protocol}//${host}/api/auth/deriv/callback`;

  if (error) {
    const errorMsg = errorDescription || error;
    return Response.redirect(`${url.origin}/?auth_error=1&message=${encodeURIComponent(errorMsg)}`, 302);
  }

  if (!code) {
    return Response.redirect(`${url.origin}/?auth_error=1&message=${encodeURIComponent('Authorization code missing')}`, 302);
  }

  try {
    // Retrieve code verifier from cookies if stored, or fallback
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies: Record<string, string> = {};
    cookieHeader.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      if (parts.length === 2) {
        cookies[parts[0].trim()] = decodeURIComponent(parts[1].trim());
      }
    });

    const verifier = cookies['deriv_oauth_verifier'] || searchParams.get('verifier') || 'appexquant_default_verifier';
    const appId = getDerivAppId();

    // 1. Exchange authorization code for token
    const tokenResponse = await exchangeCodeForToken(code, verifier, redirectUri, appId);
    const accessToken = tokenResponse.access_token || tokenResponse.token1;

    if (!accessToken) {
      throw new Error('Access token not found in token response');
    }

    // 2. Call Deriv 'authorize' API to fetch user profile attributes
    const profile = await fetchUserProfile(accessToken, appId);
    const email = profile?.email || `${(profile?.loginid || 'CR-TRADER').toLowerCase()}@deriv.trader`;
    const loginid = profile?.loginid || profile?.derivAccountId || 'CR-TRADER';
    const currency = profile?.currency || 'USD';
    const balance = typeof profile?.balance === 'number' ? profile.balance : 10000;

    // 3. Set secure HttpOnly cookies for session & attributes
    const isHttps = protocol === 'https:';
    const secureFlag = isHttps ? '; Secure' : '';
    const sessionCookieValue = JSON.stringify({
      loginid,
      email,
      currency,
      balance,
      accessToken,
      authenticatedAt: new Date().toISOString(),
    });

    const headers = new Headers();
    headers.append('Set-Cookie', `deriv_session=${encodeURIComponent(sessionCookieValue)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${secureFlag}`);
    headers.append('Set-Cookie', `deriv_loginid=${encodeURIComponent(loginid)}; Path=/; SameSite=Lax; Max-Age=604800${secureFlag}`);
    headers.append('Set-Cookie', `deriv_email=${encodeURIComponent(email)}; Path=/; SameSite=Lax; Max-Age=604800${secureFlag}`);
    headers.append('Set-Cookie', `deriv_currency=${encodeURIComponent(currency)}; Path=/; SameSite=Lax; Max-Age=604800${secureFlag}`);

    // 4. Execute server-side redirect to /dashboard
    headers.set('Location', `${url.origin}/dashboard`);
    return new Response(null, {
      status: 302,
      headers,
    });
  } catch (err: any) {
    console.error('[DerivOAuthCallbackRoute] Error:', err);
    return Response.redirect(`${url.origin}/?auth_error=1&message=${encodeURIComponent(err.message || 'OAuth authentication failed')}`, 302);
  }
}
