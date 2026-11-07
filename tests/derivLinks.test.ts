/**
 * Unit Tests for Deriv Link Validator & Sanitizer (derivLinks.ts)
 */

import { describe, it, expect } from 'vitest';
import { validateDerivUrl, getCashierUrl } from '../src/config/derivLinks.ts';

describe('Deriv Link Validator & Sanitizer', () => {
  it('strips query parameters like ?token=abc', () => {
    const sanitized = validateDerivUrl('https://deriv.com/cashier?token=abc123secret', 'deposit');
    expect(sanitized).toBe('https://deriv.com/cashier');
  });

  it('rejects paths containing verification or sensitive segments', () => {
    const sanitized = validateDerivUrl('https://deriv.com/cashier/verify/token1234567890abcdef', 'withdraw');
    expect(sanitized).toBeNull();
  });

  it('rejects non-deriv hosts', () => {
    const sanitized = validateDerivUrl('https://malicious.com/cashier', 'deposit');
    expect(sanitized).toBeNull();
  });

  it('rejects non-HTTPS protocols', () => {
    const sanitized = validateDerivUrl('http://deriv.com/cashier', 'deposit');
    expect(sanitized).toBeNull();
  });

  it('keeps clean generic deriv.com subdomains and paths', () => {
    const sanitized = validateDerivUrl('https://app.deriv.com/cashier/wallet', 'transfer');
    expect(sanitized).toBe('https://app.deriv.com/cashier/wallet');
  });

  it('falls back to https://home.deriv.com when unset or rejected', () => {
    expect(getCashierUrl('withdraw')).toBe('https://home.deriv.com');
  });
});
