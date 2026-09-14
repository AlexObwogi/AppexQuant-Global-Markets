import { describe, it, expect } from 'vitest';
import { transactionInterceptorMiddleware, recordInterceptedTransaction, getRevenueTelemetrySummary } from '../src/services/revenue/transactionInterceptor.ts';
import { DerivWebSocketManager } from '../src/services/deriv/DerivWebSocketManager.ts';
import { handleDerivOAuthCallback } from '../src/services/deriv/oauthServerService.ts';

describe('Phase 21 - Remediation & Isolation Tests', () => {
  describe('Revenue Engine Isolation Tests', () => {
    it('GET request on /api/auth/session triggers ZERO RevenueEngine invocations', () => {
      const initialSummary = getRevenueTelemetrySummary();
      const initialCount = initialSummary.totalEventsCaptured;

      const req = { method: 'GET', path: '/api/auth/session' } as any;
      let jsonCalled = false;
      const res = {
        json: (data: any) => {
          jsonCalled = true;
          return data;
        },
      } as any;
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      transactionInterceptorMiddleware(req, res, next);

      expect(nextCalled).toBe(true);
      expect(jsonCalled).toBe(false);

      const postSummary = getRevenueTelemetrySummary();
      expect(postSummary.totalEventsCaptured).toBe(initialCount);
    });

    it('GET request on /api/market/active-symbols triggers ZERO RevenueEngine invocations', () => {
      const initialSummary = getRevenueTelemetrySummary();
      const initialCount = initialSummary.totalEventsCaptured;

      const req = { method: 'GET', path: '/api/market/active-symbols' } as any;
      let nextCalled = false;
      const res = {} as any;
      const next = () => { nextCalled = true; };

      transactionInterceptorMiddleware(req, res, next);

      expect(nextCalled).toBe(true);
      const postSummary = getRevenueTelemetrySummary();
      expect(postSummary.totalEventsCaptured).toBe(initialCount);
    });

    it('Duplicate financial events are processed exactly once (Idempotency)', () => {
      const traceId = `test-trace-${Date.now()}`;
      const params = {
        userId: 'usr-idempotency-test',
        derivAccountId: 'CR999999',
        eventType: 'TRADE_EXECUTION' as const,
        instrumentSymbol: 'EURUSD',
        tradedVolumeUsd: 1000,
        grossRevenueUsd: 50,
        traceId,
      };

      const event1 = recordInterceptedTransaction(params);
      const event2 = recordInterceptedTransaction(params);

      expect(event1.id).toBe(event2.id);
    });
  });

  describe('Deriv OAuth Failure Mode Tests', () => {
    it('Rejects callback missing authorization code with explicit error destination & errorMessage', async () => {
      const state = `state_${Date.now()}`;
      // Register temporary state in oauthTransactionsStore or via request
      const req = {
        code: undefined,
        state,
        cookieState: undefined,
      };

      const result = await handleDerivOAuthCallback(req);
      expect(result.success).toBe(false);
      expect(result.errorMessage).toBeDefined();
    });

    it('Rejects callback with provider denial (error parameter)', async () => {
      const req = {
        error: 'access_denied',
        errorDescription: 'User denied access',
      };

      const result = await handleDerivOAuthCallback(req);
      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Deriv OAuth authorization error');
    });

    it('Rejects callback with invalid / expired state token', async () => {
      const req = {
        code: 'sample_code_123',
        state: 'invalid_nonexistent_state',
      };

      const result = await handleDerivOAuthCallback(req);
      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('OAuth state');
    });
  });

  describe('Deriv Stream Bounded Reconnect Tests', () => {
    it('Transitions state to OFFLINE after max reconnect attempts exhausted', async () => {
      const wsManager = new DerivWebSocketManager();
      
      // Manually set reconnectAttempts to 10 (maxReconnectAttempts)
      (wsManager as any).reconnectAttempts = 10;
      (wsManager as any).scheduleReconnect();

      expect(wsManager.getConnectionState()).toBe('OFFLINE');
    });
  });
});
