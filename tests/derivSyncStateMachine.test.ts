import { describe, it, expect } from 'vitest';
import {
  DerivSyncState,
  DerivSyncContext,
  isValidDerivAccountId,
  transitionSyncState,
} from '../src/services/deriv/syncStateMachine.ts';

describe('Phase 1 — Explicit Deriv Sync State Machine', () => {
  it('1. Correctly validates valid and invalid Deriv account IDs', () => {
    expect(isValidDerivAccountId('CR123456')).toBe(true);
    expect(isValidDerivAccountId('VRTC9876543')).toBe(true);
    expect(isValidDerivAccountId('MF554433')).toBe(true);
    expect(isValidDerivAccountId('MLT998877')).toBe(true);

    expect(isValidDerivAccountId(undefined)).toBe(false);
    expect(isValidDerivAccountId(null)).toBe(false);
    expect(isValidDerivAccountId('')).toBe(false);
    expect(isValidDerivAccountId('   ')).toBe(false);
  });

  it('2. Hard-disallows transitioning to CONNECTED when accountId is undefined or null', () => {
    const invalidContext: DerivSyncContext = {
      userId: 'usr-123',
      derivAccountId: undefined,
      discoverySucceeded: true,
      persisted: true,
      requestId: 'req-1',
      timestamp: new Date().toISOString(),
    };

    expect(() =>
      transitionSyncState(DerivSyncState.ACCOUNT_PERSISTED, DerivSyncState.CONNECTED, invalidContext)
    ).toThrow(/INVARIANT_VIOLATION/);
  });

  it('3. Hard-disallows transitioning to CONNECTED from ACCOUNT_DISCOVERY_FAILED', () => {
    const failedContext: DerivSyncContext = {
      userId: 'usr-123',
      derivAccountId: 'CR123456',
      discoverySucceeded: false,
      persisted: false,
      requestId: 'req-2',
      timestamp: new Date().toISOString(),
    };

    expect(() =>
      transitionSyncState(DerivSyncState.ACCOUNT_DISCOVERY_FAILED, DerivSyncState.CONNECTED, failedContext)
    ).toThrow(/INVARIANT_VIOLATION/);
  });

  it('4. Hard-disallows transitioning to CONNECTED when persistence has not completed', () => {
    const unpersistedContext: DerivSyncContext = {
      userId: 'usr-123',
      derivAccountId: 'CR123456',
      discoverySucceeded: true,
      persisted: false,
      requestId: 'req-3',
      timestamp: new Date().toISOString(),
    };

    expect(() =>
      transitionSyncState(DerivSyncState.ACCOUNT_VERIFIED, DerivSyncState.CONNECTED, unpersistedContext)
    ).toThrow(/INVARIANT_VIOLATION/);
  });

  it('5. Successfully transitions through the complete valid flow to CONNECTED', () => {
    const validContext: DerivSyncContext = {
      userId: 'usr-123',
      derivAccountId: 'CR998877',
      accountType: 'real',
      currency: 'USD',
      balance: 15420.5,
      tokenValidated: true,
      discoverySucceeded: true,
      persisted: true,
      requestId: 'req-4',
      timestamp: new Date().toISOString(),
    };

    let state = DerivSyncState.UNAUTHENTICATED;
    state = transitionSyncState(state, DerivSyncState.OAUTH_STARTED, validContext);
    state = transitionSyncState(state, DerivSyncState.OAUTH_CALLBACK_RECEIVED, validContext);
    state = transitionSyncState(state, DerivSyncState.OAUTH_CODE_EXCHANGED, validContext);
    state = transitionSyncState(state, DerivSyncState.TOKEN_VALIDATED, validContext);
    state = transitionSyncState(state, DerivSyncState.ACCOUNT_DISCOVERY_STARTED, validContext);
    state = transitionSyncState(state, DerivSyncState.ACCOUNT_DISCOVERED, validContext);
    state = transitionSyncState(state, DerivSyncState.ACCOUNT_VERIFIED, validContext);
    state = transitionSyncState(state, DerivSyncState.ACCOUNT_PERSISTED, validContext);
    state = transitionSyncState(state, DerivSyncState.CONNECTED, validContext);

    expect(state).toBe(DerivSyncState.CONNECTED);
  });
});
