/**
 * AppeX Quant Global Markets
 * Centralized Deriv OAuth 2.0 Service
 *
 * IMPORTANT:
 * - DERIV_OAUTH_CLIENT_ID = registered Deriv OAuth 2.0 client ID
 * - DERIV_APP_ID          = optional legacy Deriv V1 app ID
 *
 * These values are intentionally kept separate.
 */

export const DERIV_OAUTH_SCOPE = 'trade account_manage';

export const DERIV_AUTH_BASE_URL =
  'https://auth.deriv.com/oauth2/auth';

export const DERIV_TOKEN_ENDPOINT =
  'https://auth.deriv.com/oauth2/token';

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

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Returns the registered OAuth 2.0 client ID.
 *
 * DO NOT fall back to DERIV_APP_ID here.
 *
 * OAuth2 client_id and legacy app_id are different concepts.
 */
export function getDerivOAuthClientId(): string {
  if (typeof process !== 'undefined' && process.env) {
    const candidates = [
      process.env.DERIV_OAUTH_CLIENT_ID,
      process.env.DERIV_CLIENT_ID,
      process.env.OAUTH_CLIENT_ID,
    ];

    for (const candidate of candidates) {
      const value = clean(candidate);

      if (value && value !== 'undefined' && value !== 'null') {
        return value;
      }
    }
  }

  return '';
}

/**
 * Returns the optional legacy Deriv V1 App ID.
 *
 * 1089 is NOT used as the OAuth2 client_id.
 */
export function getDerivAppId(): string {
  if (typeof process !== 'undefined' && process.env) {
    const candidates = [
      process.env.DERIV_APP_ID,
      process.env.VITE_DERIV_APP_ID,
      process.env.NEXT_PUBLIC_DERIV_APP_ID,
    ];

    for (const candidate of candidates) {
      const value = clean(candidate);

      if (value && /^\d+$/.test(value)) {
        return value;
      }
    }
  }

  return '';
}

/**
 * Returns the exact OAuth redirect URI.
 *
 * This value MUST exactly match the URI registered
 * against the OAuth2 client in Deriv.
 */
export function getDerivRedirectUri(): string {
  if (typeof process !== 'undefined' && process.env) {
    const candidates = [
      process.env.DERIV_OAUTH_REDIRECT_URI,
      process.env.OAUTH_REDIRECT_URI,
      process.env.DERIV_REDIRECT_URI,
      process.env.REDIRECT_URI,
      process.env.VITE_DERIV_REDIRECT_URI,
      process.env.VITE_REDIRECT_URI,
    ];

    for (const candidate of candidates) {
      const value = clean(candidate);

      if (value) {
        return value;
      }
    }

    const appUrl = clean(process.env.APP_URL);

    if (appUrl) {
      return `${appUrl.replace(/\/$/, '')}/api/auth/deriv/callback`;
    }

    const siteUrl = clean(process.env.NEXT_PUBLIC_SITE_URL);

    if (siteUrl) {
      return `${siteUrl.replace(/\/$/, '')}/api/auth/deriv/callback`;
    }
  }

  if (typeof window !== 'undefined') {
    const origin = clean(window.location?.origin);

    if (origin) {
      return `${origin}/api/auth/deriv/callback`;
    }
  }

  return '';
}

/**
 * Builds the Deriv OAuth2 authorization URL.
 *
 * Required OAuth2 parameters:
 * - response_type=code
 * - client_id
 * - redirect_uri
 * - scope
 * - state
 * - code_challenge
 * - code_challenge_method=S256
 *
 * app_id is only added when an explicit legacy app ID exists.
 */
export function buildAuthUrl(
  options: BuildAuthUrlOptions = {},
): string {
  const clientId =
    clean(options.clientId) ||
    getDerivOAuthClientId();

  if (!clientId) {
    throw new Error(
      'Missing DERIV_OAUTH_CLIENT_ID. Register an OAuth 2.0 client with Deriv and configure its client ID.',
    );
  }

  const redirectUri =
    clean(options.redirectUri) ||
    getDerivRedirectUri();

  if (!redirectUri) {
    throw new Error(
      'Missing Deriv OAuth redirect URI. Configure DERIV_OAUTH_REDIRECT_URI.',
    );
  }

  const state = clean(options.state);

  if (!state) {
    throw new Error(
      'Missing OAuth state. A fresh state value is required for every authorization request.',
    );
  }

  const codeChallenge = clean(options.codeChallenge);

  if (!codeChallenge) {
    throw new Error(
      'Missing OAuth PKCE code_challenge.',
    );
  }

  const codeChallengeMethod =
    clean(options.codeChallengeMethod) || 'S256';

  if (codeChallengeMethod !== 'S256') {
    throw new Error(
      'Deriv OAuth2 PKCE requires code_challenge_method=S256.',
    );
  }

  const authUrl =
    clean(
      typeof process !== 'undefined'
        ? process.env?.DERIV_AUTH_URL
        : '',
    ) || DERIV_AUTH_BASE_URL;

  const params = new URLSearchParams();

  params.set('response_type', 'code');
  params.set('client_id', clientId);
  params.set('redirect_uri', redirectUri);
  params.set(
    'scope',
    clean(options.scope) || DERIV_OAUTH_SCOPE,
  );
  params.set('state', state);
  params.set('code_challenge', codeChallenge);
  params.set('code_challenge_method', codeChallengeMethod);

  const lang = clean(options.lang) || 'en';
  params.set('l', lang.toLowerCase());

  const brand = clean(options.brand);

  if (brand) {
    params.set('brand', brand);
  }

  /**
   * Optional legacy V1 app support.
   *
   * IMPORTANT:
   * This is deliberately NOT used as client_id.
   */
  const legacyAppId =
    clean(options.appId) || getDerivAppId();

  if (legacyAppId) {
    params.set('app_id', legacyAppId);
  }

  if (options.action === 'signup') {
    params.set('prompt', 'registration');
  }

  if (options.destination) {
    params.set(
      'destination',
      clean(options.destination),
    );
  }

  if (options.extraParams) {
    for (const [key, value] of Object.entries(
      options.extraParams,
    )) {
      const cleanValue = clean(value);

      if (cleanValue) {
        params.set(key, cleanValue);
      }
    }
  }

  return `${authUrl}?${params.toString()}`;
}

/**
 * Builds the application's login gateway URL.
 */
export function buildLoginGatewayUrl(
  action: 'connect' | 'signup' = 'connect',
  destination: string = '/',
): string {
  const params = new URLSearchParams();

  params.set('action', action);
  params.set('destination', destination || '/');

  return `/api/auth/deriv/login?${params.toString()}`;
}

/**
 * Exchanges a Deriv OAuth2 authorization code for tokens.
 *
 * This MUST execute server-side.
 *
 * PKCE:
 *   code_challenge -> generated during login
 *   code_verifier  -> original verifier supplied here
 */
export async function exchangeCodeForToken(
  code: string,
  codeVerifier: string,
  redirectUri: string,
  clientId?: string,
  clientSecret?: string,
): Promise<{
  access_token: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  [key: string]: unknown;
}> {
  const authorizationCode = clean(code);
  const verifier = clean(codeVerifier);
  const callbackUri = clean(redirectUri);

  if (!authorizationCode) {
    throw new Error(
      'Missing Deriv OAuth authorization code.',
    );
  }

  if (!verifier) {
    throw new Error(
      'Missing OAuth PKCE code_verifier.',
    );
  }

  if (!callbackUri) {
    throw new Error(
      'Missing OAuth redirect URI.',
    );
  }

  const resolvedClientId =
    clean(clientId) ||
    getDerivOAuthClientId();

  if (!resolvedClientId) {
    throw new Error(
      'Missing DERIV_OAUTH_CLIENT_ID for token exchange.',
    );
  }

  const resolvedClientSecret =
    clean(clientSecret) ||
    clean(
      typeof process !== 'undefined'
        ? process.env?.DERIV_CLIENT_SECRET
        : '',
    ) ||
    clean(
      typeof process !== 'undefined'
        ? process.env?.OAUTH_CLIENT_SECRET
        : '',
    );

  const tokenEndpoint =
    clean(
      typeof process !== 'undefined'
        ? process.env?.DERIV_TOKEN_ENDPOINT
        : '',
    ) || DERIV_TOKEN_ENDPOINT;

  const body = new URLSearchParams();

  body.set(
    'grant_type',
    'authorization_code',
  );

  body.set(
    'client_id',
    resolvedClientId,
  );

  body.set(
    'code',
    authorizationCode,
  );

  body.set(
    'code_verifier',
    verifier,
  );

  body.set(
    'redirect_uri',
    callbackUri,
  );

  /**
   * Only include client_secret when the registered
   * OAuth application actually requires it.
   *
   * Never send legacy app_secret/app_id as substitutes
   * for OAuth2 client credentials.
   */
  if (resolvedClientSecret) {
    body.set(
      'client_secret',
      resolvedClientSecret,
    );
  }

  const response = await fetch(
    tokenEndpoint,
    {
      method: 'POST',
      headers: {
        'Content-Type':
          'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body,
      cache: 'no-store',
    },
  );

  const responseText = await response.text();

  let payload: Record<string, unknown>;

  try {
    payload = responseText
      ? JSON.parse(responseText)
      : {};
  } catch {
    payload = {
      raw: responseText,
    };
  }

  if (!response.ok) {
    const errorCode =
      typeof payload.error === 'string'
        ? payload.error
        : `HTTP_${response.status}`;

    const errorDescription =
      typeof payload.error_description === 'string'
        ? payload.error_description
        : 'Deriv token exchange failed.';

    throw new Error(
      `Deriv OAuth token exchange failed: ${errorCode} - ${errorDescription}`,
    );
  }

  const accessToken =
    typeof payload.access_token === 'string'
      ? payload.access_token.trim()
      : '';

  if (!accessToken) {
    throw new Error(
      'Deriv OAuth token exchange succeeded but returned no access_token.',
    );
  }

  return payload as {
    access_token: string;
    token_type?: string;
    expires_in?: number;
    refresh_token?: string;
    scope?: string;
    [key: string]: unknown;
  };
}

/**
 * Fetches the user's Deriv account information using
 * the OAuth access token.
 *
 * Authentication is performed through REST.
 */
export async function fetchUserProfile(
  accessToken: string,
  appId?: string,
): Promise<{
  loginid?: string;
  currency?: string;
  balance?: number;
  is_virtual?: number;
  email?: string;
  fullname?: string;
  scopes?: unknown;
  account_list?: unknown[];
} | null> {
  const token = clean(accessToken);

  if (!token) {
    return null;
  }

  const legacyAppId =
    clean(appId) || getDerivAppId();

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    };

    if (legacyAppId) {
      headers['Deriv-App-ID'] = legacyAppId;
    }

    const response = await fetch(
      'https://api.derivws.com/trading/v1/options/accounts',
      {
        method: 'GET',
        headers,
        cache: 'no-store',
      },
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    const rawList: unknown[] =
      Array.isArray(data)
        ? data
        : Array.isArray(data?.accounts)
          ? data.accounts
          : data?.account_id
            ? [data]
            : [];

    if (rawList.length === 0) {
      return null;
    }

    const item =
      rawList[0] as Record<string, unknown>;

    const loginid =
      item.account_id ||
      item.loginid ||
      item.id;

    const currency =
      typeof item.currency === 'string'
        ? item.currency
        : 'USD';

    const rawBalance = item.balance;

    const balance =
      typeof rawBalance === 'number'
        ? rawBalance
        : Number.parseFloat(
            String(rawBalance ?? '0'),
          );

    const accountType =
      typeof item.account_type === 'string'
        ? item.account_type
        : '';

    const isVirtual =
      accountType === 'demo' ||
      Boolean(
        loginid &&
        String(loginid).startsWith('VR'),
      )
        ? 1
        : 0;

    return {
      loginid:
        loginid !== undefined
          ? String(loginid)
          : undefined,
      currency,
      balance:
        Number.isFinite(balance)
          ? balance
          : 0,
      is_virtual: isVirtual,
      email:
        typeof item.email === 'string'
          ? item.email
          : undefined,
      fullname:
        typeof item.fullname === 'string'
          ? item.fullname
          : typeof item.full_name === 'string'
            ? item.full_name
            : undefined,
      scopes: item.scopes,
      account_list:
        rawList as unknown[],
    };
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
  getDerivOAuthClientId,
  getDerivRedirectUri,
  DERIV_OAUTH_SCOPE,
  DERIV_AUTH_BASE_URL,
  DERIV_TOKEN_ENDPOINT,
};

export default oauthService;