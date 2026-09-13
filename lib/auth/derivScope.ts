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

export const DEFAULT_FALLBACK_SCOPE_STRING = 'read+trade+admin+payments';
export const CANONICAL_DERIV_SCOPES = ['read', 'trade', 'admin', 'payments'] as const;

/**
 * Parses any raw scope input (plus, comma, space, semicolon separated or array)
 * into a deduplicated, trimmed array of lowercase scope identifiers.
 */
export function parseRawScopes(rawInput?: string | string[] | null): string[] {
  if (!rawInput) {
    return [...CANONICAL_DERIV_SCOPES];
  }

  if (Array.isArray(rawInput)) {
    const list = rawInput
      .map((item) => String(item).trim().toLowerCase())
      .filter((item) => item.length > 0);
    return Array.from(new Set(list));
  }

  if (typeof rawInput !== 'string') {
    return [...CANONICAL_DERIV_SCOPES];
  }

  // Handle URL decoded or encoded pluses, commas, spaces, semicolons
  const cleaned = rawInput
    .replace(/%2B/gi, '+')
    .replace(/%20/gi, ' ')
    .replace(/%2C/gi, ',');

  const parts = cleaned
    .split(/[\s,;+]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);

  if (parts.length === 0) {
    return [...CANONICAL_DERIV_SCOPES];
  }

  return Array.from(new Set(parts));
}

/**
 * Reads process.env.deriv_oauth_scope or process.env.DERIV_OAUTH_SCOPE
 * with fallback to "read+trade+admin+payments".
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
  requiredScopes: string[] = ['read', 'trade']
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
