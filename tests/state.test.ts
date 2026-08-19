/**
 * AppexQuant Markets Global - Authoritative Global State Tests
 */

import { describe, it, expect } from 'vitest';
import { initialGlobalState } from '../src/state/GlobalStateContext';

describe('Global State Architecture', () => {
  it('initializes with single source of truth for user and account state', () => {
    expect(initialGlobalState.user).toBeNull();
    expect(initialGlobalState.session.isAuthenticated).toBe(false);
    expect(initialGlobalState.accounts.length).toBe(0);
    expect(initialGlobalState.selectedAccountId).toBeNull();
  });

  it('starts in disconnected/offline status during Phase 1 by default', () => {
    expect(initialGlobalState.connectionStatus).toBe('OFFLINE');
  });
});
