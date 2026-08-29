/**
 * AppexQuant Markets Global - Centralized Deriv OAuth Service
 * Provides centralized URL generation, PKCE parameter construction,
 * and scope management for Deriv OAuth 2.0.
 */

export const DERIV_OAUTH_SCOPE = 'trade account_manage';
export const DERIV_AUTH_BASE_URL = 'https://auth.deriv.com/oauth2/auth';
export const DERIV_TOKEN_ENDPOINT = 'https://auth.deriv.com/oauth2/token';

export interface BuildAuthUrlOptions {
  appId?: string;
  clientId?: string;
  redirectUri?: string;
  state?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  scope?: string;
  action?: 'connect' | 'signup';
  lang?: string;
  brand?: string;
  destination?: string;
  extraParams?: Record<string, string>;
}

/**
 * Returns the effective Deriv App ID from environment variables or default fallback.
 * Strictly avoids empty/undefined/null strings to prevent Deriv 'invalid_client' errors.
 */
export function getDerivAppId(): string {
  // STRICTLY SERVER-SIDE USAGE
  if (typeof process !== 'undefined' && process.env) {
    const raw =
      process.env.DERIV_APP_ID ||
      process.env.VITE_DERIV_APP_ID ||
      process.env.CLIENT_ID ||
      process.env.DERIV_CLIENT_ID ||
      process.env.DERIV_OAUTH_CLIENT_ID ||
      process.env.NEXT_PUBLIC_DERIV_APP_ID;

    if (raw && typeof raw === 'string') {
      const clean = raw.trim();
      if (clean && clean !== 'undefined' && clean !== 'null' && clean !== '""' && clean !== "''") {
        return clean;
      }
    }
    return '1089';
  }
  
  // STRICTLY BROWSER-SIDE USAGE
  if (typeof window !== 'undefined') {
    try {
      const getMetaEnv = new Function('return import.meta.env');
      const env = getMetaEnv();
      if (env) {
        const raw = env.VITE_DERIV_APP_ID || env.VITE_CLIENT_ID || env.NEXT_PUBLIC_DERIV_APP_ID;
        if (raw && typeof raw === 'string') {
          const clean = raw.trim();
          if (clean && clean !== 'undefined' && clean !== 'null' && clean !== '""' && clean !== "''") {
            return clean;
          }
        }
      }
    } catch {
      // Fallback if compilation/runtime dynamic evaluation fails
    }
  }
  
  return '1089';
}

/**
 * Returns the dynamic redirect URI for Deriv OAuth callback.
 */
export function getDerivRedirectUri(): string {
  // STRICTLY SERVER-SIDE USAGE
  if (typeof process !== 'undefined' && process.env) {
    const configured =
      process.env.OAUTH_REDIRECT_URI ||
      process.env.DERIV_OAUTH_REDIRECT_URI ||
      process.env.DERIV_REDIRECT_URI ||
      process.env.REDIRECT_URI ||
      process.env.VITE_REDIRECT_URI;

    if (configured && typeof configured === 'string' && configured.trim()) {
      return configured.trim();
    }

    if (process.env.APP_URL && typeof process.env.APP_URL === 'string' && process.env.APP_URL.trim()) {
      return `${process.env.APP_URL.trim().replace(/\/$/, '')}/api/auth/deriv/callback`;
    }

    if (process.env.NEXT_PUBLIC_SITE_URL && typeof process.env.NEXT_PUBLIC_SITE_URL === 'string' && process.env.NEXT_PUBLIC_SITE_URL.trim()) {
      return `${process.env.NEXT_PUBLIC_SITE_URL.trim().replace(/\/$/, '')}/api/auth/deriv/callback`;
    }

    return 'http://localhost:3000/api/auth/deriv/callback';
  }
  
  // STRICTLY BROWSER-SIDE USAGE
  if (typeof window !== 'undefined') {
    try {
      const getMetaEnv = new Function('return import.meta.env');
      const env = getMetaEnv();
      if (env) {
        const viteRedirect = env.VITE_REDIRECT_URI || env.VITE_DERIV_REDIRECT_URI;
        if (viteRedirect && typeof viteRedirect === 'string' && viteRedirect.trim()) {
          return viteRedirect.trim();
        }
      }
    } catch {
      // Fallback
    }
    
    if (window.location && window.location.origin) {
      return `${window.location.origin}/api/auth/deriv/callback`;
    }
  }
  
  return 'http://localhost:3000/api/auth/deriv/callback';
}

/**
 * Builds the authentic Deriv OAuth 2.0 authorization URL.
 * Strictly passes app_id, client_id, and space-separated scopes.
 */
export function buildAuthUrl(options: BuildAuthUrlOptions = {}): string {
  const rawAppId = options.appId || options.clientId || getDerivAppId();
  const appId = (rawAppId && typeof rawAppId === 'string' && rawAppId.trim() && rawAppId.trim() !== 'undefined')
    ? rawAppId.trim()
    : '1089';

  const baseUrl = (typeof process !== 'undefined' && process.env?.DERIV_AUTH_URL) || DERIV_AUTH_BASE_URL;
  const redirectUri = (options.redirectUri || getDerivRedirectUri()).trim();

  // Build query parameters ensuring strictly valid app_id / client_id and space-separated scope
  const params: Record<string, string> = {
    app_id: appId,
    client_id: appId,
    response_type: 'code',
    l: (options.lang || 'en').toLowerCase(),
    brand: options.brand || 'deriv',
    redirect_uri: redirectUri,
    scope: options.scope || DERIV_OAUTH_SCOPE,
  };

  if (options.redirectUri) {
    params.redirect_uri = options.redirectUri;
  }

  if (options.state) {
    params.state = options.state;
  }

  if (options.codeChallenge) {
    params.code_challenge = options.codeChallenge;
    params.code_challenge_method = options.codeChallengeMethod || 'S256';
  }

  if (options.action) {
    params.action = options.action;
    if (options.action === 'signup') {
      params.ac = 'signup';
      params.prompt = 'registration';
    }
  }

  if (options.extraParams) {
    Object.assign(params, options.extraParams);
  }

  // Format query parameters into query string with space-separated encoding for scope
  const searchParams = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== '') {
      searchParams.set(key, val);
    }
  }

  return `${baseUrl}?${searchParams.toString()}`;
}

/**
 * Helper to build the backend login gateway URL or direct gateway URL.
 */
export function buildLoginGatewayUrl(action: 'connect' | 'signup' = 'connect', destination: string = '/'): string {
  const dest = encodeURIComponent(destination || '/');
  return `/api/auth/deriv/login?action=${action}&destination=${dest}`;
}

/**
 * Exchanges an authorization code for an access token against Deriv OAuth endpoint.
 */
export async function exchangeCodeForToken(
  code: string,
  codeVerifier: string,
  redirectUri: string,
  clientId?: string,
  clientSecret?: string
): Promise<any> {
  const appId = clientId || (typeof process !== 'undefined' ? (process.env?.DERIV_APP_ID || process.env?.CLIENT_ID || process.env?.DERIV_OAUTH_CLIENT_ID) : undefined) || getDerivAppId();
  const secret = clientSecret || (typeof process !== 'undefined' ? (process.env?.DERIV_CLIENT_SECRET || process.env?.CLIENT_SECRET) : undefined);
  const tokenEndpoint = (typeof process !== 'undefined' && process.env?.DERIV_TOKEN_ENDPOINT) || DERIV_TOKEN_ENDPOINT;
  const postBody: Record<string, string> = {
    grant_type: 'authorization_code',
    client_id: appId,
    app_id: appId,
    code,
    redirect_uri: redirectUri,
  };

  if (codeVerifier) {
    postBody.code_verifier = codeVerifier;
  }
  if (secret) {
    postBody.client_secret = secret;
    postBody.app_secret = secret;
  }

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams(postBody),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${errText}`);
  }

  return response.json();
}

/**
 * Fetches user account profile from Deriv using an access token via HTTP REST API.
 * Authentication does not depend on WebSocket.
 */
export async function fetchUserProfile(accessToken: string, appId?: string): Promise<any> {
  const safeAppId = appId || getDerivAppId();
  const cleanToken = accessToken ? accessToken.trim() : '';
  if (!cleanToken) return null;

  try {
    const url = 'https://api.derivws.com/trading/v1/options/accounts';
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        'Deriv-App-ID': safeAppId,
        Accept: 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      const rawList = Array.isArray(data) ? data : (data.accounts || (data.account_id ? [data] : []));
      if (rawList.length > 0) {
        const item = rawList[0];
        const loginid = item.account_id || item.loginid || item.id;
        return {
          loginid,
          currency: item.currency || 'USD',
          balance: typeof item.balance === 'number' ? item.balance : parseFloat(item.balance || '0'),
          is_virtual: item.account_type === 'demo' || (loginid && String(loginid).startsWith('VR')) ? 1 : 0,
          email: item.email,
          fullname: item.fullname || item.full_name,
          scopes: item.scopes,
          account_list: rawList,
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

export const oauthService = {
  buildAuthUrl,
  buildLoginGatewayUrl,
  exchangeCodeForToken,
  fetchUserProfile,
  getDerivAppId,
  DERIV_OAUTH_SCOPE,
  DERIV_AUTH_BASE_URL,
  DERIV_TOKEN_ENDPOINT,
};

export default oauthService;
