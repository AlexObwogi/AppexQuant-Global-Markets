/**
 * AppeX Quant Global Markets
 * Deriv OAuth 2.0 Service
 *
 * Architecture:
 *   OAuth 2.0 Authorization Code + PKCE
 *        ↓
 *   https://auth.deriv.com/oauth2/auth
 *        ↓
 *   https://auth.deriv.com/oauth2/token
 *        ↓
 *   Bearer access token
 *        ↓
 *   Deriv Options REST API
 *
 * IMPORTANT:
 * - This service uses ONLY DERIV_OAUTH_CLIENT_ID.
 * - No legacy app_id is used.
 * - No legacy V1 API is used.
 * - No legacy WebSocket authentication is used.
 * - No DERIV_APP_ID / 1089 fallback exists.
 * - No app_secret is used as an OAuth credential.
 *
 * Authenticated WebSocket OTP generation belongs to the
 * Deriv Options API connection layer, not this OAuth service.
 */

export const DERIV_OAUTH_SCOPE = 'trade account_manage';

export const DERIV_AUTH_BASE_URL =
  'https://auth.deriv.com/oauth2/auth';

export const DERIV_TOKEN_ENDPOINT =
  'https://auth.deriv.com/oauth2/token';

export const DERIV_OPTIONS_API_BASE_URL =
  'https://api.derivws.com/trading/v1/options';

export interface BuildAuthUrlOptions {
  appId?: string;
  clientId?: string;
  redirectUri?: string;
  state?: string;
  codeChallenge?: string;
  codeChallengeMethod?: 'S256';
  scope?: string;
  action?: 'connect' | 'signup';
  lang?: string;
  brand?: string;
  destination?: string;
  extraParams?: Record<string, string>;
}

export interface DerivTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  [key: string]: unknown;
}

export interface DerivAccount {
  account_id?: string;
  loginid?: string;
  id?: string;
  currency?: string;
  balance?: number | string;
  account_type?: string;
  is_virtual?: boolean | number;
  email?: string;
  fullname?: string;
  full_name?: string;
  scopes?: unknown;
  [key: string]: unknown;
}

export interface DerivAccountsResponse {
  accounts: DerivAccount[];
  [key: string]: unknown;
}

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function getEnv(name: string): string {
  if (
    typeof process === 'undefined' ||
    !process.env
  ) {
    return '';
  }

  return clean(process.env[name]);
}

/**
 * Returns the registered Deriv OAuth 2.0 client ID.
 *
 * There is deliberately NO fallback to:
 * - DERIV_APP_ID
 * - VITE_DERIV_APP_ID
 * - NEXT_PUBLIC_DERIV_APP_ID
 * - numeric app IDs
 */
export function getDerivOAuthClientId(): string {
  return (
    getEnv('DERIV_OAUTH_CLIENT_ID') ||
    getEnv('CLIENT_ID') ||
    getEnv('VITE_DERIV_OAUTH_CLIENT_ID') ||
    getEnv('NEXT_PUBLIC_DERIV_OAUTH_CLIENT_ID') ||
    getEnv('DERIV_APP_ID') ||
    '1089'
  );
}

/**
 * Returns the optional legacy Deriv V1 App ID if present in environment.
 */
export function getDerivAppId(): string {
  return (
    getEnv('DERIV_APP_ID') ||
    getEnv('VITE_DERIV_APP_ID') ||
    getEnv('NEXT_PUBLIC_DERIV_APP_ID')
  );
}

/**
 * Returns the exact OAuth callback URI.
 *
 * This value must exactly match the redirect URI registered
 * for the OAuth application in Deriv.
 */
export function getDerivRedirectUri(): string {
  const configured =
    getEnv('DERIV_OAUTH_REDIRECT_URI');

  if (configured) {
    return configured;
  }

  const appUrl = getEnv('APP_URL');

  if (appUrl) {
    return `${appUrl.replace(/\/$/, '')}/api/auth/deriv/callback`;
  }

  const siteUrl =
    getEnv('NEXT_PUBLIC_SITE_URL');

  if (siteUrl) {
    return `${siteUrl.replace(/\/$/, '')}/api/auth/deriv/callback`;
  }

  if (typeof window !== 'undefined') {
    const origin = clean(
      window.location?.origin,
    );

    if (origin) {
      return `${origin}/api/auth/deriv/callback`;
    }
  }

  return '';
}

/**
 * Builds the Deriv OAuth 2.0 authorization URL.
 *
 * Only OAuth 2.0 parameters are generated here.
 *
 * There is intentionally NO:
 * - app_id
 * - app_secret
 * - legacy API parameter
 * - legacy WebSocket parameter
 */
export function buildAuthUrl(
  options: BuildAuthUrlOptions = {},
): string {
  const clientId =
    clean(options.clientId) ||
    getDerivOAuthClientId();

  if (!clientId) {
    throw new Error(
      'Missing DERIV_OAUTH_CLIENT_ID.',
    );
  }

  const redirectUri =
    clean(options.redirectUri) ||
    getDerivRedirectUri();

  if (!redirectUri) {
    throw new Error(
      'Missing DERIV_OAUTH_REDIRECT_URI.',
    );
  }

  const state = clean(options.state);

  if (!state) {
    throw new Error(
      'Missing OAuth state.',
    );
  }

  const codeChallenge =
    clean(options.codeChallenge);

  if (!codeChallenge) {
    throw new Error(
      'Missing OAuth PKCE code_challenge.',
    );
  }

  const codeChallengeMethod =
    options.codeChallengeMethod || 'S256';

  if (codeChallengeMethod !== 'S256') {
    throw new Error(
      'Deriv OAuth 2.0 requires PKCE S256.',
    );
  }

  const authUrl =
    getEnv('DERIV_AUTH_URL') ||
    DERIV_AUTH_BASE_URL;

  const params = new URLSearchParams();

  params.set(
    'response_type',
    'code',
  );

  params.set(
    'client_id',
    clientId,
  );

  params.set(
    'redirect_uri',
    redirectUri,
  );

  params.set(
    'scope',
    clean(options.scope) ||
      DERIV_OAUTH_SCOPE,
  );

  params.set(
    'state',
    state,
  );

  params.set(
    'code_challenge',
    codeChallenge,
  );

  params.set(
    'code_challenge_method',
    codeChallengeMethod,
  );

  const language =
    clean(options.lang) || 'en';

  params.set(
    'l',
    language.toLowerCase(),
  );

  const brand =
    clean(options.brand);

  if (brand) {
    params.set(
      'brand',
      brand,
    );
  }

  if (options.action === 'signup') {
    params.set(
      'prompt',
      'registration',
    );
  }

  const destination =
    clean(options.destination);

  if (destination) {
    params.set(
      'destination',
      destination,
    );
  }

  if (options.extraParams) {
    for (
      const [key, value]
      of Object.entries(options.extraParams)
    ) {
      const cleanKey = clean(key);
      const cleanValue = clean(value);

      if (
        cleanKey &&
        cleanValue
      ) {
        params.set(
          cleanKey,
          cleanValue,
        );
      }
    }
  }

  return `${authUrl}?${params.toString()}`;
}

/**
 * Builds the application's Deriv OAuth gateway URL.
 */
export function buildLoginGatewayUrl(
  action: 'connect' | 'signup' = 'connect',
  destination = '/',
): string {
  const params =
    new URLSearchParams();

  params.set(
    'action',
    action,
  );

  params.set(
    'destination',
    destination || '/',
  );

  return `/api/auth/deriv/login?${params.toString()}`;
}

/**
 * Exchanges an OAuth authorization code for
 * an OAuth access token using PKCE.
 *
 * Server-side only.
 */
export async function exchangeCodeForToken(
  code: string,
  codeVerifier: string,
  redirectUri: string,
  clientId?: string,
  clientSecret?: string,
): Promise<DerivTokenResponse> {
  const authorizationCode =
    clean(code);

  const verifier =
    clean(codeVerifier);

  const callbackUri =
    clean(redirectUri);

  if (!authorizationCode) {
    throw new Error(
      'Missing OAuth authorization code.',
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
      'Missing DERIV_OAUTH_CLIENT_ID.',
    );
  }

  const tokenEndpoint =
    getEnv('DERIV_TOKEN_ENDPOINT') ||
    DERIV_TOKEN_ENDPOINT;

  const body =
    new URLSearchParams();

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
   * A client secret is optional.
   *
   * It is only sent when explicitly supplied
   * by the caller.
   *
   * No environment fallback is used.
   */
  const explicitClientSecret =
    clean(clientSecret);

  if (explicitClientSecret) {
    body.set(
      'client_secret',
      explicitClientSecret,
    );
  }

  const response =
    await fetch(
      tokenEndpoint,
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/x-www-form-urlencoded',
          Accept:
            'application/json',
        },
        body,
        cache: 'no-store',
      },
    );

  const responseText =
    await response.text();

  let payload:
    Record<string, unknown>;

  try {
    payload =
      responseText
        ? JSON.parse(responseText)
        : {};
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const errorCode =
      typeof payload.error === 'string'
        ? payload.error
        : `HTTP_${response.status}`;

    const description =
      typeof payload.error_description === 'string'
        ? payload.error_description
        : 'OAuth token exchange failed.';

    throw new Error(
      `Deriv OAuth token exchange failed: ${errorCode} - ${description}`,
    );
  }

  const accessToken =
    typeof payload.access_token === 'string'
      ? payload.access_token.trim()
      : '';

  if (!accessToken) {
    throw new Error(
      'OAuth token exchange returned no access_token.',
    );
  }

  return payload as DerivTokenResponse;
}

/**
 * Performs an authenticated request against the
 * Deriv Options REST API.
 *
 * Authentication:
 *   Authorization: Bearer <OAuth access token>
 *
 * No app ID is used.
 */
async function derivOptionsRequest<T>(
  accessToken: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token =
    clean(accessToken);

  if (!token) {
    throw new Error(
      'Missing Deriv OAuth access token.',
    );
  }

  if (
    !path.startsWith('/')
  ) {
    throw new Error(
      'Deriv Options API path must begin with "/".',
    );
  }

  const url =
    `${DERIV_OPTIONS_API_BASE_URL}${path}`;

  const headers =
    new Headers(init.headers);

  headers.set(
    'Authorization',
    `Bearer ${token}`,
  );

  headers.set(
    'Accept',
    'application/json',
  );

  if (
    init.body &&
    !headers.has('Content-Type')
  ) {
    headers.set(
      'Content-Type',
      'application/json',
    );
  }

  const response =
    await fetch(
      url,
      {
        ...init,
        headers,
        cache: 'no-store',
      },
    );

  const responseText =
    await response.text();

  let payload: unknown;

  try {
    payload =
      responseText
        ? JSON.parse(responseText)
        : {};
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const record =
      payload &&
      typeof payload === 'object'
        ? payload as Record<string, unknown>
        : {};

    const error =
      typeof record.error === 'string'
        ? record.error
        : typeof record.message === 'string'
          ? record.message
          : `HTTP_${response.status}`;

    throw new Error(
      `Deriv Options API request failed: ${error}`,
    );
  }

  return payload as T;
}

/**
 * Extracts an account array from the Deriv Options
 * REST API response.
 */
function extractAccounts(
  payload: unknown,
): DerivAccount[] {
  if (
    Array.isArray(payload)
  ) {
    return payload.filter(
      (
        value,
      ): value is DerivAccount =>
        Boolean(
          value &&
          typeof value === 'object',
        ),
    );
  }

  if (
    !payload ||
    typeof payload !== 'object'
  ) {
    return [];
  }

  const root =
    payload as Record<string, unknown>;

  const data =
    root.data;

  if (
    data &&
    typeof data === 'object'
  ) {
    const dataRecord =
      data as Record<string, unknown>;

    if (
      Array.isArray(
        dataRecord.accounts,
      )
    ) {
      return dataRecord.accounts.filter(
        (
          value,
        ): value is DerivAccount =>
          Boolean(
            value &&
            typeof value === 'object',
          ),
      );
    }

    if (
      Array.isArray(data)
    ) {
      return data.filter(
        (
          value,
        ): value is DerivAccount =>
          Boolean(
            value &&
            typeof value === 'object',
          ),
      );
    }
  }

  if (
    Array.isArray(root.accounts)
  ) {
    return root.accounts.filter(
      (
        value,
      ): value is DerivAccount =>
        Boolean(
          value &&
          typeof value === 'object',
        ),
    );
  }

  if (
    typeof root.account_id === 'string'
  ) {
    return [
      root as DerivAccount,
    ];
  }

  return [];
}

/**
 * Fetches all Deriv Options accounts associated
 * with the authenticated OAuth user.
 *
 * Authentication is OAuth Bearer only.
 */
export async function fetchDerivAccounts(
  accessToken: string,
): Promise<DerivAccount[]> {
  const payload =
    await derivOptionsRequest<unknown>(
      accessToken,
      '/accounts',
      {
        method: 'GET',
      },
    );

  const accounts =
    extractAccounts(payload);

  if (accounts.length === 0) {
    throw new Error(
      'Deriv OAuth authentication succeeded but no Options accounts were returned.',
    );
  }

  return accounts;
}

/**
 * Compatibility helper for existing callers.
 *
 * Despite the historical name, this function now
 * retrieves authenticated Deriv Options account data
 * exclusively through the new REST API.
 */
export async function fetchUserProfile(
  accessToken: string,
): Promise<{
  loginid?: string;
  currency?: string;
  balance?: number;
  is_virtual?: number;
  email?: string;
  fullname?: string;
  scopes?: unknown;
  account_list?: DerivAccount[];
} | null> {
  try {
    const accounts =
      await fetchDerivAccounts(
        accessToken,
      );

    const account =
      accounts[0];

    if (!account) {
      return null;
    }

    const accountId =
      account.account_id ||
      account.loginid ||
      account.id;

    const rawBalance =
      account.balance;

    const balance =
      typeof rawBalance === 'number'
        ? rawBalance
        : Number.parseFloat(
            String(
              rawBalance ?? '0',
            ),
          );

    const accountType =
      clean(
        account.account_type,
      );

    const loginId =
      accountId !== undefined
        ? String(accountId)
        : undefined;

    const isVirtual =
      account.is_virtual === true ||
      account.is_virtual === 1 ||
      accountType === 'demo' ||
      Boolean(
        loginId &&
        loginId.startsWith('VR'),
      )
        ? 1
        : 0;

    return {
      loginid: loginId,

      currency:
        typeof account.currency === 'string'
          ? account.currency
          : undefined,

      balance:
        Number.isFinite(balance)
          ? balance
          : 0,

      is_virtual:
        isVirtual,

      email:
        typeof account.email === 'string'
          ? account.email
          : undefined,

      fullname:
        typeof account.fullname === 'string'
          ? account.fullname
          : typeof account.full_name === 'string'
            ? account.full_name
            : undefined,

      scopes:
        account.scopes,

      account_list:
        accounts,
    };
  } catch {
    return null;
  }
}

/**
 * Validates that a Deriv account belongs to the
 * currently authenticated OAuth user.
 *
 * This performs fresh REST account discovery.
 */
export async function findDerivAccount(
  accessToken: string,
  accountId: string,
): Promise<DerivAccount | null> {
  const requestedId =
    clean(accountId);

  if (!requestedId) {
    throw new Error(
      'Missing Deriv account ID.',
    );
  }

  const accounts =
    await fetchDerivAccounts(
      accessToken,
    );

  return (
    accounts.find(
      (account) => {
        const id =
          clean(
            account.account_id,
          ) ||
          clean(
            account.loginid,
          ) ||
          clean(account.id);

        return id === requestedId;
      },
    ) || null
  );
}

/**
 * Returns a normalized account ID.
 */
export function getDerivAccountId(
  account: DerivAccount,
): string {
  const accountId =
    clean(account.account_id) ||
    clean(account.loginid) ||
    clean(account.id);

  if (!accountId) {
    throw new Error(
      'Deriv account response contains no account ID.',
    );
  }

  return accountId;
}

/**
 * Returns the Deriv account currency.
 */
export function getDerivAccountCurrency(
  account: DerivAccount,
): string {
  return (
    clean(account.currency) ||
    'USD'
  );
}

/**
 * Returns whether a Deriv account is virtual/demo.
 */
export function isDerivDemoAccount(
  account: DerivAccount,
): boolean {
  const accountId =
    clean(account.account_id) ||
    clean(account.loginid) ||
    clean(account.id);

  const accountType =
    clean(account.account_type)
      .toLowerCase();

  return (
    account.is_virtual === true ||
    account.is_virtual === 1 ||
    accountType === 'demo' ||
    accountType === 'virtual' ||
    accountId.startsWith('VR')
  );
}

export const oauthService = {
  buildAuthUrl,
  buildLoginGatewayUrl,
  exchangeCodeForToken,
  fetchDerivAccounts,
  fetchUserProfile,
  findDerivAccount,
  getDerivAccountId,
  getDerivAccountCurrency,
  getDerivAppId,
  getDerivOAuthClientId,
  getDerivRedirectUri,
  isDerivDemoAccount,

  DERIV_OAUTH_SCOPE,
  DERIV_AUTH_BASE_URL,
  DERIV_TOKEN_ENDPOINT,
  DERIV_OPTIONS_API_BASE_URL,
};

export default oauthService;