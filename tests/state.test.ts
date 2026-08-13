/**
 * AppexQuant Markets Global - Authoritative Global State Tests
 */

import { describe, it, expect } from 'vitest';
import { initialGlobalState } from '../src/state/GlobalStateContext';

describe('Global State Architecture', () => {
  it('initializes with single source of truth for user and account state', () => {
    expect(initialGlobalState.user).not.toBeNull();
    expect(initialGlobalState.user?.displayName).toBe('Appex Quant Trader');
    expect(initialGlobalState.accounts.length).toBeGreaterThan(0);
    expect(initialGlobalState.selectedAccountId).toBe(initialGlobalState.accounts[0].id);
  });

  it('starts in disconnected/offline status during Phase 1 by default', () => {
    expect(initialGlobalState.connectionStatus).toBe('OFFLINE');
    expect(initialGlobalState.accounts[0].isConnected).toBe(false);
  });
});
