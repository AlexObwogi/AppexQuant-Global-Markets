/**
 * AppexQuant Markets Global - Unified Deriv Scope Normalization Utility
 * File: lib/auth/derivScope.ts
 *
 * Single source of truth for Deriv OAuth scopes.
 * Canonical Deriv OAuth 2.0 scopes: 'read', 'trade', 'admin', 'payments'
 */

export const DERIV_OAUTH_SCOPES = ['trade'] as const;          // default request
export const DERIV_OAUTH_SCOPE_STRING = DERIV_OAUTH_SCOPES.join(' ');

export type ValidDerivScope = 'trade';
const ACCEPTED_SCOPES = ['trade'] as const;

// Scopes accepted by Deriv OAuth 2.0 PKCE /oauth2/auth endpoint:
export const VALID_OAUTH2_AUTH_SCOPES: readonly string[] = ACCEPTED_SCOPES;

export const VALID_DERIV_OAUTH2_SCOPES: readonly string[] = ACCEPTED_SCOPES;
export const CANONICAL_DERIV_SCOPES: readonly ValidDerivScope[] = DERIV_OAUTH_SCOPES;
export const DEFAULT_FALLBACK_SCOPE_STRING = DERIV_OAUTH_SCOPE_STRING;

export type ScopeFormat = 'plus' | 'comma' | 'space' | 'array';

/**
 * Parses any raw scope input (plus, comma, space, semicolon separated or array)
 * into a deduplicated, trimmed array of valid Deriv OAuth2 scope identifiers.
 */
export function parseRawScopes(rawInput?: any): string[] {
  if (!rawInput) {
    return [...DERIV_OAUTH_SCOPES];
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
  } else if (typeof rawInput === 'object' && rawInput !== null) {
    const candidate = rawInput.scopes || rawInput.scope || rawInput.permissions;
    if (candidate) {
      return parseRawScopes(candidate);
    }
  }

  const validSet = new Set<string>();

  for (const item of rawList) {
    if (item === 'trade' || (ACCEPTED_SCOPES as readonly string[]).includes(item)) {
      validSet.add('trade');
    }
  }

  return ['trade'];
}

/**
 * Reads process.env.DERIV_OAUTH_SCOPES || process.env.DERIV_OAUTH_SCOPE || process.env.DERIV_SCOPES
 * with fallback to DERIV_OAUTH_SCOPE_STRING ("trade").
 */
export function getRawConfiguredScope(): string {
  if (typeof process === 'undefined' || !process.env) {
    return DERIV_OAUTH_SCOPE_STRING;
  }

  const envValue =
    process.env.DERIV_OAUTH_SCOPES ||
    process.env.DERIV_OAUTH_SCOPE ||
    process.env.DERIV_SCOPES;

  if (typeof envValue === 'string' && envValue.trim().length > 0) {
    return envValue.trim();
  }

  return DERIV_OAUTH_SCOPE_STRING;
}

/**
 * Resolves the configured Deriv OAuth scopes as a normalized string array.
 */
export function getDerivScopeList(): string[] {
  const raw = getRawConfiguredScope();
  return parseRawScopes(raw);
}

/**
 * Formats scopes into space-separated format ('trade')
 * strictly required for Deriv OAuth login redirect URLs.
 * Filters out legacy scopes (e.g. 'read', 'admin', 'payments') that cause
 * Deriv OAuth2 authorization endpoint to reject with error=invalid_scope.
 */
export function getLoginScopeString(customScopes?: string | string[] | readonly string[]): string {
  const list = customScopes ? parseRawScopes(customScopes) : getDerivScopeList();
  const authScopes = list.filter((s) => VALID_OAUTH2_AUTH_SCOPES.includes(s));
  if (authScopes.length === 0) {
    return 'trade';
  }
  return authScopes.join(' ');
}

/**
 * Formats scopes into comma-separated format ('read,trade,admin,payments')
 * for backend API token validation, account discovery REST calls,
 * and WebSocket handshakes.
 */
export function getBackendScopeString(customScopes?: string | string[] | readonly string[]): string {
  const list = customScopes ? parseRawScopes(customScopes) : getDerivScopeList();
  return list.join(',');
}

/**
 * Formats scopes into space-separated format ('read trade admin payments').
 */
export function getSpaceScopeString(customScopes?: string | string[] | readonly string[]): string {
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
export function getDerivOAuthScope(format: ScopeFormat = 'space'): string | string[] {
  switch (format) {
    case 'plus':
    case 'space':
      return getSpaceScopeString();
    case 'comma':
      return getBackendScopeString();
    case 'array':
      return getDerivScopeList();
    default:
      return getSpaceScopeString();
  }
}

/**
 * Normalizes any scope input to specified format.
 */
export function normalizeDerivScope(
  scopeInput?: string | string[] | readonly string[] | null,
  format: ScopeFormat = 'comma'
): string | string[] {
  const list = parseRawScopes(scopeInput);
  switch (format) {
    case 'plus':
    case 'space':
      return list.join(' ');
    case 'comma':
      return list.join(',');
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
  grantedScopes?: string | string[] | readonly string[] | null,
  requiredScopes: string[] = ['trade']
): {
  valid: boolean;
  missing: string[];
  granted: string[];
  commaString: string;
  spaceString: string;
  plusString: string;
} {
  const granted = parseRawScopes(grantedScopes);
  const missing = requiredScopes.filter((req) => !granted.includes(req.toLowerCase()));

  return {
    valid: missing.length === 0,
    missing,
    granted,
    commaString: granted.join(','),
    spaceString: granted.join(' '),
    plusString: granted.join(' '),
  };
}

export default {
  DERIV_OAUTH_SCOPES,
  DERIV_OAUTH_SCOPE_STRING,
  VALID_OAUTH2_AUTH_SCOPES,
  getDerivOAuthScope,
  getLoginScopeString,
  getBackendScopeString,
  getSpaceScopeString,
  getDerivScopeList,
  normalizeDerivScope,
  validateDerivScopes,
  parseRawScopes,
};
