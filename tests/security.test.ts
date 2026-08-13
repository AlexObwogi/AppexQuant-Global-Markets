/**
 * AppexQuant Markets Global - Comprehensive Security Test Suite
 * Validates Security Controls, Role RBAC, MFA, Encryption, Session Tokens, and Privilege Boundaries
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSessionToken,
  verifySessionToken,
  revokeSessionToken,
  encryptSensitiveData,
  decryptSensitiveData,
  validateOrder,
  validateRiskPolicyUpdate,
  validateBrokerConfig,
  validateStrategyActivation,
  redactSensitiveValues,
  isDuplicateOrderRequest,
  SessionPayload,
} from '../src/services/security';
import { hasPermission, isHighRiskPermission } from '../src/utils/auth';
import { UserRole, UserPermission } from '../src/types/user';

describe('Security Hardening & Privilege Boundaries Test Suite', () => {
  const defaultPolicy = {
    maxDailyDrawdownPct: 5.0,
    maxPositionSizeLots: 5.0,
    maxOpenPositions: 10,
    requireStopLoss: true,
    maxLeverage: 100,
  };

  describe('1. Secret Management & AES-256 Data Encryption', () => {
    it('encrypts and decrypts sensitive broker credentials accurately', () => {
      const plaintextSecret = 'deriv-api-token-secret-998877665544332211';
      const encrypted = encryptSensitiveData(plaintextSecret);
      
      expect(encrypted).not.toEqual(plaintextSecret);
      expect(encrypted).toContain(':'); // IV and ciphertext format

      const decrypted = decryptSensitiveData(encrypted);
      expect(decrypted).toEqual(plaintextSecret);
    });

    it('redacts sensitive secret fields from API response objects', () => {
      const payload = {
        accountNumber: 'CR100200',
        brokerType: 'DERIV',
        apiKey: 'super-secret-key-12345',
        apiSecret: 'top-secret-pass-67890',
        encryptedKey: '4f2a:8b1c',
        server: 'Live-1',
      };

      const redacted = redactSensitiveValues(payload);

      expect(redacted.accountNumber).toBe('CR100200');
      expect(redacted.brokerType).toBe('DERIV');
      expect(redacted.apiKey).toBe('***REDACTED***');
      expect(redacted.apiSecret).toBe('***REDACTED***');
      expect(redacted.encryptedKey).toBe('***REDACTED***');
    });
  });

  describe('2. Session Security, Expiration & Revocation', () => {
    it('generates valid cryptographic session tokens and verifies claims', () => {
      const payload: SessionPayload = {
        userId: 'usr-001',
        email: 'test@appexquant.global',
        role: 'USER',
        isElevated: false,
        elevatedUntil: null,
        csrfToken: 'csrf-1234567890',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      };

      const token = createSessionToken(payload);
      const verified = verifySessionToken(token);

      expect(verified).not.toBeNull();
      expect(verified?.userId).toBe('usr-001');
      expect(verified?.role).toBe('USER');
      expect(verified?.csrfToken).toBe('csrf-1234567890');
    });

    it('prevents session abuse by rejecting expired session tokens', () => {
      const expiredPayload: SessionPayload = {
        userId: 'usr-002',
        email: 'expired@appexquant.global',
        role: 'USER',
        isElevated: false,
        elevatedUntil: null,
        csrfToken: 'csrf-expired',
        expiresAt: new Date(Date.now() - 1000).toISOString(), // Expired 1 second ago
      };

      const expiredToken = createSessionToken(expiredPayload);
      const verified = verifySessionToken(expiredToken);

      expect(verified).toBeNull();
    });

    it('prevents session abuse by revoking tokens (Token Rotation)', () => {
      const payload: SessionPayload = {
        userId: 'usr-003',
        email: 'revoked@appexquant.global',
        role: 'ADMIN',
        isElevated: true,
        elevatedUntil: new Date(Date.now() + 900000).toISOString(),
        csrfToken: 'csrf-revoked',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      };

      const token = createSessionToken(payload);
      expect(verifySessionToken(token)).not.toBeNull();

      revokeSessionToken(token);
      expect(verifySessionToken(token)).toBeNull();
    });
  });

  describe('3. Vertical Privilege Escalation Protection', () => {
    it('prevents standard USER role from accessing ADMIN or RISK_MANAGER permissions', () => {
      expect(hasPermission('USER', UserPermission.EXECUTE_MANUAL_ORDER)).toBe(true);
      expect(hasPermission('USER', UserPermission.MANAGE_RISK)).toBe(false);
      expect(hasPermission('USER', UserPermission.MANAGE_USERS)).toBe(false);
      expect(hasPermission('USER', UserPermission.MANAGE_SYSTEM)).toBe(false);
      expect(hasPermission('USER', UserPermission.VIEW_AUDIT_LOG)).toBe(false);
    });

    it('enforces MFA elevation for high-risk permissions', () => {
      expect(isHighRiskPermission(UserPermission.MANAGE_RISK)).toBe(true);
      expect(isHighRiskPermission(UserPermission.MANAGE_USERS)).toBe(true);
      expect(isHighRiskPermission(UserPermission.MANAGE_SYSTEM)).toBe(true);
      expect(isHighRiskPermission(UserPermission.EXECUTE_MANUAL_ORDER)).toBe(false);
    });
  });

  describe('4. Horizontal Privilege Escalation Protection', () => {
    it('verifies that non-admin user IDs cannot impersonate or access other user IDs', () => {
      const userA = { userId: 'usr-001', role: 'USER' as UserRole };
      const targetUserId = 'usr-002'; // Attempting to read User B's resources

      const canAccess = userA.userId === targetUserId || hasPermission(userA.role, UserPermission.MANAGE_USERS);
      expect(canAccess).toBe(false);
    });

    it('allows ADMIN or SUPER_ADMIN roles to manage other user resources', () => {
      const admin = { userId: 'admin-005', role: 'ADMIN' as UserRole };
      const targetUserId = 'usr-002';

      const canAccess = admin.userId === targetUserId || hasPermission(admin.role, UserPermission.MANAGE_USERS);
      expect(canAccess).toBe(true);
    });
  });

  describe('5. Unauthorized Order Submission & Parameter Validation', () => {
    it('validates order parameters and rejects negative quantities or missing stop loss', () => {
      const invalidOrder = {
        symbol: 'EUR/USD',
        side: 'BUY',
        quantity: -1.0, // Invalid negative quantity
        stopLoss: 1.0500,
      };

      expect(() => validateOrder(invalidOrder, defaultPolicy)).toThrowError(/positive number/);

      const missingStopLossOrder = {
        symbol: 'EUR/USD',
        side: 'BUY',
        quantity: 1.0,
        stopLoss: 0, // Missing SL when policy requires SL
      };

      expect(() => validateOrder(missingStopLossOrder, defaultPolicy)).toThrowError(/requires a valid positive "stopLoss"/);
    });

    it('rejects order quantities exceeding risk policy lot limits', () => {
      const oversizedOrder = {
        symbol: 'EUR/USD',
        side: 'BUY',
        quantity: 50.0, // Policy max is 5.0
        stopLoss: 1.0500,
      };

      expect(() => validateOrder(oversizedOrder, defaultPolicy)).toThrowError(/exceeds maximum allowed risk size/);
    });
  });

  describe('6. Duplicate Order Requests (Idempotency Defense)', () => {
    it('detects and rejects duplicate order submission tokens', () => {
      const token = 'order-idempotency-token-9988';
      
      const isDup1 = isDuplicateOrderRequest(token);
      expect(isDup1).toBe(false); // First attempt succeeds

      const isDup2 = isDuplicateOrderRequest(token);
      expect(isDup2).toBe(true); // Immediate second attempt blocked as duplicate

      const dupOrder = {
        symbol: 'EUR/USD',
        side: 'BUY',
        quantity: 1.0,
        stopLoss: 1.0500,
        orderToken: token,
      };

      expect(() => validateOrder(dupOrder, defaultPolicy)).toThrowError(/DUPLICATE_ORDER_REJECTED/);
    });
  });

  describe('7. Unauthorized Risk Modification & Schema Validation', () => {
    it('validates risk policy updates and rejects invalid drawdown percentages or negative values', () => {
      const invalidPolicy = {
        maxDailyDrawdownPct: 150.0, // Invalid percentage > 100
      };

      expect(() => validateRiskPolicyUpdate(invalidPolicy)).toThrowError(/percentage between 0 and 100/);
    });
  });

  describe('8. Unauthorized Strategy Activation & Broker Access Validation', () => {
    it('validates strategy activation requests and enforces allowed actions', () => {
      const invalidAction = {
        strategyId: 'strat-001',
        action: 'DELETE_ALL_ACCOUNTS', // Illegal action
      };

      expect(() => validateStrategyActivation(invalidAction)).toThrowError(/Invalid action for strategy activation/);
    });

    it('validates broker configuration and encrypts API secrets', () => {
      const brokerConfig = {
        brokerType: 'DERIV',
        accountNumber: 'CR999888',
        apiKey: 'deriv-key-secret-xyz',
        apiSecret: 'deriv-secret-abc',
      };

      const result = validateBrokerConfig(brokerConfig);

      expect(result.brokerType).toBe('DERIV');
      expect(result.accountNumber).toBe('CR999888');
      expect(result.hasApiKey).toBe(true);
      expect(result.encryptedKey).not.toBe('deriv-key-secret-xyz');
    });
  });
});
