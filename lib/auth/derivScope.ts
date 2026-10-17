/**
 * AppexQuant Markets Global - Unified Deriv Scope Normalization Utility
 * File: lib/auth/derivScope.ts
 *
 * Single source of truth for Deriv OAuth scopes.
 * Deriv OAuth 2.0 valid scopes: 'read', 'trade', 'admin', 'payments'
 */

export const DERIV_OAUTH_SCOPES = ['trade', 'admin', 'payments'] as const;
export const DERIV_OAUTH_SCOPE_STRING = DERIV_OAUTH_SCOPES.join(' '); // space-separated, NEVER '+' joined

export type ValidDerivScope = (typeof DERIV_OAUTH_SCOPES)[number];
export const VALID_DERIV_OAUTH2_SCOPES = DERIV_OAUTH_SCOPES;
export const CANONICAL_DERIV_SCOPES: readonly ValidDerivScope[] = DERIV_OAUTH_SCOPES;
export const DEFAULT_FALLBACK_SCOPE_STRING = DERIV_OAUTH_SCOPE_STRING;

export type ScopeFormat = 'plus' | 'comma' | 'space' | 'array';

/**
 * Parses any raw scope input (plus, comma, space, semicolon separated or array)
 * into a deduplicated, trimmed array of valid Deriv OAuth2 scope identifiers.
 */
export function parseRawScopes(rawInput?: string | string[] | readonly string[] | null): string[] {
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
  }

  const validSet = new Set<string>();

  for (const item of rawList) {
    if ((DERIV_OAUTH_SCOPES as readonly string[]).includes(item)) {
      validSet.add(item);
    }
  }

  if (validSet.size === 0) {
    return [...DERIV_OAUTH_SCOPES];
  }

  return Array.from(validSet);
}

/**
 * Reads process.env.DERIV_OAUTH_SCOPE or process.env.DERIV_OAUTH_SCOPES
 * with fallback to DERIV_OAUTH_SCOPE_STRING ("read trade admin payments").
 */
export function getRawConfiguredScope(): string {
  if (typeof process === 'undefined' || !process.env) {
    return DERIV_OAUTH_SCOPE_STRING;
  }

  const envValue =
    process.env.DERIV_OAUTH_SCOPE ||
    process.env.DERIV_OAUTH_SCOPES ||
    process.env.VITE_DERIV_OAUTH_SCOPE ||
    process.env.NEXT_PUBLIC_DERIV_OAUTH_SCOPE;

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
 * Formats scopes into space-separated format ('read trade admin payments')
 * strictly required for Deriv OAuth login redirect URLs. Standard URL encoding
 * (e.g. URLSearchParams) encodes spaces appropriately; NEVER pre-join with literal '+'.
 */
export function getLoginScopeString(customScopes?: string | string[] | readonly string[]): string {
  const list = customScopes ? parseRawScopes(customScopes) : getDerivScopeList();
  return list.join(' ');
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
  getDerivOAuthScope,
  getLoginScopeString,
  getBackendScopeString,
  getSpaceScopeString,
  getDerivScopeList,
  normalizeDerivScope,
  validateDerivScopes,
  parseRawScopes,
};
