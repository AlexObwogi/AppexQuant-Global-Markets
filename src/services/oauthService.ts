/**
 * AppexQuant Markets Global - Centralized Deriv OAuth Service
 * Provides centralized URL generation, PKCE parameter construction,
 * and scope management for Deriv OAuth 2.0.
 */

export const DERIV_OAUTH_SCOPE = 'trade account_manage';
export const DERIV_AUTH_BASE_URL = 'https://oauth.deriv.com/oauth2/auth';
export const DERIV_TOKEN_ENDPOINT = 'https://oauth.deriv.com/oauth2/token';

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
 */
export function getDerivAppId(): string {
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.VITE_DERIV_APP_ID) return process.env.VITE_DERIV_APP_ID;
    if (process.env.DERIV_APP_ID) return process.env.DERIV_APP_ID;
    if (process.env.CLIENT_ID) return process.env.CLIENT_ID;
  }
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    if ((import.meta as any).env?.VITE_DERIV_APP_ID) return (import.meta as any).env.VITE_DERIV_APP_ID;
  }
  return '1089';
}

/**
 * Builds the authentic Deriv OAuth 2.0 authorization URL.
 * Strictly uses scope='trade account_manage' with space-separated encoding.
 */
export function buildAuthUrl(options: BuildAuthUrlOptions = {}): string {
  const appId = options.appId || options.clientId || getDerivAppId();
  const baseUrl = (typeof process !== 'undefined' && process.env?.DERIV_AUTH_URL) || DERIV_AUTH_BASE_URL;

  // Build query parameters ensuring strictly space-separated scope='trade account_manage'
  const params: Record<string, string> = {
    app_id: appId,
    l: options.lang || 'EN',
    brand: options.brand || 'deriv',
    response_type: 'code',
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
export function buildLoginGatewayUrl(action: 'connect' | 'signup' = 'connect', destination: string = '/dashboard'): string {
  const dest = encodeURIComponent(destination || '/dashboard');
  return `/api/auth/deriv/login?action=${action}&destination=${dest}`;
}

export const oauthService = {
  buildAuthUrl,
  buildLoginGatewayUrl,
  getDerivAppId,
  DERIV_OAUTH_SCOPE,
  DERIV_AUTH_BASE_URL,
  DERIV_TOKEN_ENDPOINT,
};

export default oauthService;
