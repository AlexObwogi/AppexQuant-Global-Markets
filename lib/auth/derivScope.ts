/**
 * AppexQuant Markets Global - Unified Deriv Scope Normalization Utility
 * File: lib/auth/derivScope.ts
 *
 * Provides authoritative multi-format Deriv OAuth scope resolution and validation:
 * - Dual-format output: plus-separated ('+') for Deriv OAuth login redirect URL,
 *   and comma-separated (',') for backend API token validation, REST calls, and WebSocket handshakes.
 * - Robust runtime env resolution with fallback to "read+trade+admin+payments".
 */

export type ScopeFormat = 'plus' | 'comma' | 'space' | 'array';

/**
 * Valid Deriv OAuth 2.0 Scope Identifiers (per developers.deriv.com/docs/intro/oauth/)
 * - trade: access to trading operations
 * - account_manage: write access for account creation/management
 * - payment: deposit/withdrawal operations (singular)
 * - application_read: read-only access to registered applications
 */
export const VALID_DERIV_OAUTH2_SCOPES = [
  'trade',
  'account_manage',
  'payment',
  'application_read',
] as const;

export type ValidDerivScope = (typeof VALID_DERIV_OAUTH2_SCOPES)[number];

export const CANONICAL_DERIV_SCOPES: readonly ValidDerivScope[] = [
  'trade',
  'account_manage',
  'payment',
  'application_read',
];

export const DEFAULT_FALLBACK_SCOPE_STRING = 'trade account_manage payment application_read';

/**
 * Legacy scope mapping dictionary to sanitize old environment variables or cached scope strings.
 */
const LEGACY_SCOPE_MAP: Record<string, ValidDerivScope> = {
  read: 'application_read',
  payments: 'payment',
  admin: 'account_manage',
};

/**
 * Parses any raw scope input (plus, comma, space, semicolon separated or array)
 * into a deduplicated, trimmed array of valid Deriv OAuth2 scope identifiers.
 */
export function parseRawScopes(rawInput?: string | string[] | null): string[] {
  if (!rawInput) {
    return [...CANONICAL_DERIV_SCOPES];
  }

  let rawList: string[] = [];

  if (Array.isArray(rawInput)) {
    rawList = rawInput.map((item) => String(item).trim().toLowerCase());
  } else if (typeof rawInput === 'string') {
    const cleaned = rawInput
      .replace(/%2B/gi, '+')
      .replace(/%20/gi, ' ')
      .replace(/%2C/gi, ',');

    rawList = cleaned
      .split(/[\s,;+]+/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0);
  }

  const validSet = new Set<string>();

  for (const item of rawList) {
    if (LEGACY_SCOPE_MAP[item]) {
      validSet.add(LEGACY_SCOPE_MAP[item]);
    } else if (VALID_DERIV_OAUTH2_SCOPES.includes(item as ValidDerivScope)) {
      validSet.add(item);
    }
  }

  if (validSet.size === 0) {
    return [...CANONICAL_DERIV_SCOPES];
  }

  return Array.from(validSet);
}

/**
 * Reads process.env.deriv_oauth_scope or process.env.DERIV_OAUTH_SCOPE
 * with fallback to "trade account_manage payment application_read".
 */
export function getRawConfiguredScope(): string {
  if (typeof process === 'undefined' || !process.env) {
    return DEFAULT_FALLBACK_SCOPE_STRING;
  }

  const envValue =
    process.env.deriv_oauth_scope ||
    process.env.DERIV_OAUTH_SCOPE ||
    process.env.VITE_DERIV_OAUTH_SCOPE ||
    process.env.NEXT_PUBLIC_DERIV_OAUTH_SCOPE;

  if (typeof envValue === 'string' && envValue.trim().length > 0) {
    return envValue.trim();
  }

  return DEFAULT_FALLBACK_SCOPE_STRING;
}

/**
 * Resolves the configured Deriv OAuth scopes as a normalized string array.
 */
export function getDerivScopeList(): string[] {
  const raw = getRawConfiguredScope();
  return parseRawScopes(raw);
}

/**
 * Formats scopes into plus-separated format ('read+trade+admin+payments')
 * strictly required for Deriv OAuth login redirect URLs.
 */
export function getLoginScopeString(customScopes?: string | string[]): string {
  const list = customScopes ? parseRawScopes(customScopes) : getDerivScopeList();
  return list.join('+');
}

/**
 * Formats scopes into comma-separated format ('read,trade,admin,payments')
 * strictly required for backend API token validation, account discovery REST calls,
 * and WebSocket handshakes.
 */
export function getBackendScopeString(customScopes?: string | string[]): string {
  const list = customScopes ? parseRawScopes(customScopes) : getDerivScopeList();
  return list.join(',');
}

/**
 * Formats scopes into space-separated format ('read trade admin payments').
 */
export function getSpaceScopeString(customScopes?: string | string[]): string {
  const list = customScopes ? parseRawScopes(customScopes) : getDerivScopeList();
  return list.join(' ');
}

/**
 * Unified scope accessor supporting all output formats.
 */
export function getDerivOAuthScope(format: 'plus'): string;
export function getDerivOAuthScope(format: 'comma'): string;
export function getDerivOAuthScope(format: 'space'): string;
export function getDerivOAuthScope(format: 'array'): string[];
export function getDerivOAuthScope(format?: ScopeFormat): string | string[];
export function getDerivOAuthScope(format: ScopeFormat = 'plus'): string | string[] {
  switch (format) {
    case 'plus':
      return getLoginScopeString();
    case 'comma':
      return getBackendScopeString();
    case 'space':
      return getSpaceScopeString();
    case 'array':
      return getDerivScopeList();
    default:
      return getLoginScopeString();
  }
}

/**
 * Normalizes any scope input to specified format.
 */
export function normalizeDerivScope(
  scopeInput?: string | string[] | null,
  format: ScopeFormat = 'comma'
): string | string[] {
  const list = parseRawScopes(scopeInput);
  switch (format) {
    case 'plus':
      return list.join('+');
    case 'comma':
      return list.join(',');
    case 'space':
      return list.join(' ');
    case 'array':
      return list;
    default:
      return list.join(',');
  }
}

/**
 * Validates whether the discovered or granted scopes contain all required permissions.
 */
export function validateDerivScopes(
  grantedScopes?: string | string[] | null,
  requiredScopes: string[] = ['trade']
): {
  valid: boolean;
  missing: string[];
  granted: string[];
  commaString: string;
  plusString: string;
} {
  const granted = parseRawScopes(grantedScopes);
  const missing = requiredScopes.filter((req) => !granted.includes(req.toLowerCase()));

  return {
    valid: missing.length === 0,
    missing,
    granted,
    commaString: granted.join(','),
    plusString: granted.join('+'),
  };
}

export default {
  getDerivOAuthScope,
  getLoginScopeString,
  getBackendScopeString,
  getSpaceScopeString,
  getDerivScopeList,
  normalizeDerivScope,
  validateDerivScopes,
  parseRawScopes,
};
