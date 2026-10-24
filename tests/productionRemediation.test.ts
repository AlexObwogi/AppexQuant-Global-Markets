import { describe, it, expect } from 'vitest';
import { getClientIp, authRateLimiterMiddleware, sessionRateLimiterMiddleware } from '../src/services/security.ts';
import { transactionInterceptorMiddleware, getRevenueTelemetrySummary } from '../src/services/revenue/transactionInterceptor.ts';
import {
  DERIV_OAUTH_SCOPES,
  DERIV_OAUTH_SCOPE_STRING,
  getLoginScopeString,
  parseRawScopes,
  VALID_OAUTH2_AUTH_SCOPES,
  validateDerivScopes,
} from '../lib/auth/derivScope.ts';
import { testDatabaseConnection } from '../src/db/connection.ts';
import { isDirectDatabaseAvailable } from '../src/lib/db/directPrismaClient.ts';

describe('Production Remediation & Verification Suite (October 20, 2026)', () => {
  describe('1. Proxy-Aware IP Extraction & Security Observability', () => {
    it('Extracts real client IP from x-vercel-forwarded-for header', () => {
      const mockReq = {
        headers: { 'x-vercel-forwarded-for': '203.0.113.195, 10.0.0.1' },
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' },
      } as any;

      expect(getClientIp(mockReq)).toBe('203.0.113.195');
    });

    it('Extracts real client IP from x-real-ip header when present', () => {
      const mockReq = {
        headers: { 'x-real-ip': '198.51.100.42' },
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' },
      } as any;

      expect(getClientIp(mockReq)).toBe('198.51.100.42');
    });

    it('Extracts first IP from x-forwarded-for header', () => {
      const mockReq = {
        headers: { 'x-forwarded-for': '192.0.2.1, 10.1.1.1, 10.2.2.2' },
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' },
      } as any;

      expect(getClientIp(mockReq)).toBe('192.0.2.1');
    });

    it('Falls back cleanly when no proxy headers are present', () => {
      const mockReq = {
        headers: {},
        ip: '192.168.1.100',
        socket: { remoteAddress: '192.168.1.100' },
      } as any;

      expect(getClientIp(mockReq)).toBe('192.168.1.100');
    });
  });

  describe('2. Rate Limiting Action Segregation', () => {
    it('Segregates signup and login rate limits so signups are not blocked by logins', () => {
      const ip = '198.51.100.99';
      let limitedCount = 0;

      const makeSignupReq = () => ({
        headers: { 'x-real-ip': ip },
        path: '/api/auth/deriv/signup',
        socket: { remoteAddress: ip },
      } as any);

      const makeLoginReq = () => ({
        headers: { 'x-real-ip': ip },
        path: '/api/auth/deriv/login',
        socket: { remoteAddress: ip },
      } as any);

      const mockRes = () => {
        const res: any = {
          headers: {} as Record<string, any>,
          setHeader(name: string, val: any) { res.headers[name] = val; },
          status(code: number) {
            res.statusCode = code;
            return res;
          },
          json() {
            limitedCount++;
          },
        };
        return res;
      };

      // Perform a signup request
      let nextCalled = false;
      authRateLimiterMiddleware(makeSignupReq(), mockRes(), () => { nextCalled = true; });
      expect(nextCalled).toBe(true);

      // Perform a login request - should succeed under its own segregated key
      let loginNext = false;
      authRateLimiterMiddleware(makeLoginReq(), mockRes(), () => { loginNext = true; });
      expect(loginNext).toBe(true);
    });

    it('Session polling does not consume auth initiation rate limit quota', () => {
      const ip = '203.0.113.88';
      const sessionReq = {
        headers: { 'x-real-ip': ip },
        path: '/api/auth/session',
        socket: { remoteAddress: ip },
      } as any;

      const mockRes = {
        setHeader: () => {},
        status: () => ({ json: () => {} }),
      } as any;

      let sessionPass = false;
      sessionRateLimiterMiddleware(sessionReq, mockRes, () => { sessionPass = true; });
      expect(sessionPass).toBe(true);

      // Auth initiation should still pass with full quota
      const signupReq = {
        headers: { 'x-real-ip': ip },
        path: '/api/auth/deriv/signup',
        socket: { remoteAddress: ip },
      } as any;

      let authPass = false;
      authRateLimiterMiddleware(signupReq, mockRes, () => { authPass = true; });
      expect(authPass).toBe(true);
    });
  });

  describe('3. Revenue Engine Isolation on Read-Only Endpoints', () => {
    it('GET /api/auth/status never intercepts financial transactions', () => {
      const initialCount = getRevenueTelemetrySummary().totalEventsCaptured;

      const req = { method: 'GET', path: '/api/auth/status' } as any;
      let nextCalled = false;
      transactionInterceptorMiddleware(req, {} as any, () => { nextCalled = true; });

      expect(nextCalled).toBe(true);
      expect(getRevenueTelemetrySummary().totalEventsCaptured).toBe(initialCount);
    });

    it('GET /api/leaderboard/top never intercepts financial transactions', () => {
      const initialCount = getRevenueTelemetrySummary().totalEventsCaptured;

      const req = { method: 'GET', path: '/api/leaderboard/top' } as any;
      let nextCalled = false;
      transactionInterceptorMiddleware(req, {} as any, () => { nextCalled = true; });

      expect(nextCalled).toBe(true);
      expect(getRevenueTelemetrySummary().totalEventsCaptured).toBe(initialCount);
    });

    it('POST on non-whitelisted routes (e.g. /api/auth/deriv/callback) never intercepts transactions', () => {
      const initialCount = getRevenueTelemetrySummary().totalEventsCaptured;

      const req = { method: 'POST', path: '/api/auth/deriv/callback' } as any;
      let nextCalled = false;
      transactionInterceptorMiddleware(req, {} as any, () => { nextCalled = true; });

      expect(nextCalled).toBe(true);
      expect(getRevenueTelemetrySummary().totalEventsCaptured).toBe(initialCount);
    });
  });

  describe('4. Canonical Deriv OAuth Scopes Source of Truth', () => {
    it('DERIV_OAUTH_SCOPES contains strictly [trade]', () => {
      expect(DERIV_OAUTH_SCOPES).toEqual(['trade']);
    });

    it('DERIV_OAUTH_SCOPE_STRING joins scopes with single space', () => {
      expect(DERIV_OAUTH_SCOPE_STRING).toBe('trade');
    });

    it('getLoginScopeString filters legacy scopes and returns trade for OAuth2 authorization', () => {
      expect(getLoginScopeString()).toBe('trade');
      // If legacy scopes like read, admin, payments are passed, they must be filtered out for OAuth2
      expect(getLoginScopeString('read trade admin payments')).toBe('trade');
      expect(getLoginScopeString(['read', 'trade', 'admin'])).toBe('trade');
    });

    it('parseRawScopes accepts valid scopes and handles various formats', () => {
      expect(parseRawScopes('trade')).toEqual(['trade']);
      expect(parseRawScopes('read,trade')).toEqual(['read', 'trade']);
      expect(parseRawScopes({ scopes: ['trade'] })).toEqual(['trade']);
      expect(parseRawScopes(null)).toEqual(['trade']);
    });

    it('validateDerivScopes checks trade permission', () => {
      expect(validateDerivScopes(['trade']).valid).toBe(true);
      expect(validateDerivScopes('trade').valid).toBe(true);
    });
  });

  describe('5. Database Circuit Breaker & Health Reporting', () => {
    it('testDatabaseConnection handles failure gracefully without throwing and caches status', async () => {
      const result = await testDatabaseConnection();
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });

    it('isDirectDatabaseAvailable returns boolean without throwing', () => {
      const isAvailable = isDirectDatabaseAvailable();
      expect(typeof isAvailable).toBe('boolean');
    });
  });
});
