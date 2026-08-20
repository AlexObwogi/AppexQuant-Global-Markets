import { describe, it, expect, beforeEach, vi } from 'vitest';
import { logAuditEvent, getAuditLogs } from '../src/observability/audit.ts';
import { isValidDerivAccountId } from '../src/services/deriv/syncStateMachine.ts';
import {
  syncUserDerivAsync,
  getUserDerivConnection,
  connectUserWithApiToken,
} from '../src/services/deriv/oauthServerService.ts';

describe('AppexQuant - Deriv Sync Integrity & Bug Prevention Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Phase 5 — Guard Against False ACCOUNT_CONNECTED Emission', () => {
    it('1. Automatically converts ACCOUNT_CONNECTED to ACCOUNT_CONNECTION_FAILED if accountId is undefined', () => {
      const event = logAuditEvent('ACCOUNT_CONNECTED', 'usr-test-1', {
        event: 'DERIV_ACCOUNT_SYNCED',
        status: 'SYNC_FAILED',
      }, undefined);

      expect(event.eventType).toBe('ACCOUNT_CONNECTION_FAILED');
      expect(event.accountId).toBeUndefined();
      expect(event.details.rejectionReason).toBe('INVALID_OR_MISSING_ACCOUNT_ID');
    });

    it('2. Automatically converts ACCOUNT_CONNECTED to ACCOUNT_CONNECTION_FAILED if accountId is empty or whitespace', () => {
      const event = logAuditEvent('ACCOUNT_CONNECTED', 'usr-test-1', {
        event: 'DERIV_ACCOUNT_SYNCED',
      }, '   ');

      expect(event.eventType).toBe('ACCOUNT_CONNECTION_FAILED');
      expect(event.accountId).toBeUndefined();
    });

    it('3. Successfully logs ACCOUNT_CONNECTED when accountId is a valid string', () => {
      const event = logAuditEvent('ACCOUNT_CONNECTED', 'usr-test-1', {
        event: 'DERIV_ACCOUNT_SYNCED',
      }, 'CR123456');

      expect(event.eventType).toBe('ACCOUNT_CONNECTED');
      expect(event.accountId).toBe('CR123456');
    });
  });

  describe('Phase 3 & 6 — Sync Pipeline & Error Code Integrity', () => {
    it('4. syncUserDerivAsync returns connected: false when provided an invalid or empty token', async () => {
      const result = await syncUserDerivAsync('usr-test-99', '');
      expect(result.connected).toBe(false);
      expect(result.connectionStatus).toBe('DISCONNECTED');
      expect(result.derivAccountId).toBeUndefined();
    });

    it('5. Deriv Account ID syntax validation correctly accepts genuine accounts and rejects invalid ones', () => {
      expect(isValidDerivAccountId('CR987654')).toBe(true);
      expect(isValidDerivAccountId('VRTC112233')).toBe(true);
      expect(isValidDerivAccountId('MF445566')).toBe(true);

      expect(isValidDerivAccountId(undefined)).toBe(false);
      expect(isValidDerivAccountId(null)).toBe(false);
      expect(isValidDerivAccountId('')).toBe(false);
      expect(isValidDerivAccountId('undefined')).toBe(false);
      expect(isValidDerivAccountId('usr-123456')).toBe(false);
    });

    it('6. Idempotently stores connection and updates status without duplicate account conflicts', () => {
      const token = 'test_api_token_abc123';
      const userId = 'CR999888';

      const conn1 = connectUserWithApiToken(userId, token);
      expect(conn1.connected).toBe(true);
      expect(conn1.derivAccountId).toBe('CR999888');

      // Repeated connection with same loginid
      const conn2 = connectUserWithApiToken(userId, token);
      expect(conn2.connected).toBe(true);
      expect(conn2.derivAccountId).toBe('CR999888');

      const currentRecord = getUserDerivConnection(userId);
      expect(currentRecord.connected).toBe(true);
      expect(currentRecord.derivAccountId).toBe('CR999888');
    });
  });
});
