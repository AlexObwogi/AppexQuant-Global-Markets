/**
 * AppexQuant Markets Global - Deriv Account Sync & OAuth State Machine
 * 
 * Formal state machine enforcing strict lifecycle transitions:
 * UNAUTHENTICATED -> OAUTH_STARTED -> OAUTH_CALLBACK_RECEIVED -> OAUTH_CODE_EXCHANGED 
 * -> TOKEN_VALIDATED -> ACCOUNT_DISCOVERY_STARTED -> ACCOUNT_DISCOVERED 
 * -> ACCOUNT_VERIFIED -> ACCOUNT_PERSISTED -> CONNECTED
 * 
 * Hard invariants:
 * 1. accountId must be valid string (e.g. CR..., VRTC..., etc.) to transition to ACCOUNT_DISCOVERED, ACCOUNT_VERIFIED, ACCOUNT_PERSISTED, or CONNECTED.
 * 2. Any failure state CANNOT transition to CONNECTED.
 * 3. ACCOUNT_CONNECTED can only be reached from ACCOUNT_PERSISTED with full verification.
 */

export enum DerivSyncState {
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  OAUTH_STARTED = 'OAUTH_STARTED',
  OAUTH_CALLBACK_RECEIVED = 'OAUTH_CALLBACK_RECEIVED',
  OAUTH_CODE_EXCHANGED = 'OAUTH_CODE_EXCHANGED',
  TOKEN_VALIDATED = 'TOKEN_VALIDATED',
  ACCOUNT_DISCOVERY_STARTED = 'ACCOUNT_DISCOVERY_STARTED',
  ACCOUNT_DISCOVERED = 'ACCOUNT_DISCOVERED',
  ACCOUNT_VERIFIED = 'ACCOUNT_VERIFIED',
  ACCOUNT_PERSISTED = 'ACCOUNT_PERSISTED',
  CONNECTED = 'CONNECTED',
  
  // Terminal / failure states
  OAUTH_FAILED = 'OAUTH_FAILED',
  TOKEN_EXCHANGE_FAILED = 'TOKEN_EXCHANGE_FAILED',
  ACCOUNT_DISCOVERY_FAILED = 'ACCOUNT_DISCOVERY_FAILED',
  ACCOUNT_VERIFICATION_FAILED = 'ACCOUNT_VERIFICATION_FAILED',
  ACCOUNT_PERSIST_FAILED = 'ACCOUNT_PERSIST_FAILED',
  SYNC_FAILED = 'SYNC_FAILED',
  DISCONNECTED = 'DISCONNECTED',
  REAUTH_REQUIRED = 'REAUTH_REQUIRED',
}

export interface DerivSyncContext {
  userId: string;
  derivAccountId?: string;
  accountType?: 'demo' | 'real';
  currency?: string;
  balance?: number;
  scopes?: string[];
  tokenValidated?: boolean;
  discoverySucceeded?: boolean;
  persisted?: boolean;
  errorReason?: string;
  errorCode?: string;
  requestId: string;
  timestamp: string;
}

const VALID_DERIV_ID_REGEX = /^(CR|VRTC|VR|MF|MLT|MX|GBP|USD|EUR|AUD|BTC|ETH|LTC|UST|eUSDT)\d+$/i;

/**
 * Validates whether a candidate Deriv Account ID is syntactically genuine
 */
export function isValidDerivAccountId(accountId?: unknown): accountId is string {
  if (typeof accountId !== 'string') return false;
  const trimmed = accountId.trim();
  if (trimmed.length < 3 || trimmed.length > 32) return false;
  if (trimmed.toLowerCase() === 'undefined' || trimmed.toLowerCase() === 'null') return false;
  if (trimmed.startsWith('usr-') || trimmed.startsWith('user-')) return false;
  return VALID_DERIV_ID_REGEX.test(trimmed) || /^(CR|VRTC|VR|MF|MLT)[A-Z0-9_-]+$/i.test(trimmed);
}

/**
 * State Transition Guard
 * Throws an explicit error if an invalid transition is attempted.
 */
export function transitionSyncState(
  currentState: DerivSyncState,
  targetState: DerivSyncState,
  context: DerivSyncContext
): DerivSyncState {
  // Disallow transitions to CONNECTED if accountId is missing or invalid
  if (targetState === DerivSyncState.CONNECTED) {
    if (!context.derivAccountId || !isValidDerivAccountId(context.derivAccountId)) {
      throw new Error(
        `[SyncStateMachine] INVARIANT_VIOLATION: Cannot transition to CONNECTED with invalid or missing accountId (received: '${context.derivAccountId}')`
      );
    }
    if (!context.persisted) {
      throw new Error(
        `[SyncStateMachine] INVARIANT_VIOLATION: Cannot transition to CONNECTED without successful DB persistence.`
      );
    }
    if (!context.discoverySucceeded) {
      throw new Error(
        `[SyncStateMachine] INVARIANT_VIOLATION: Cannot transition to CONNECTED without successful account discovery.`
      );
    }
    if (
      currentState === DerivSyncState.ACCOUNT_DISCOVERY_FAILED ||
      currentState === DerivSyncState.ACCOUNT_VERIFICATION_FAILED ||
      currentState === DerivSyncState.ACCOUNT_PERSIST_FAILED ||
      currentState === DerivSyncState.OAUTH_FAILED ||
      currentState === DerivSyncState.TOKEN_EXCHANGE_FAILED ||
      currentState === DerivSyncState.SYNC_FAILED
    ) {
      throw new Error(
        `[SyncStateMachine] INVARIANT_VIOLATION: Cannot transition from failure state '${currentState}' to CONNECTED.`
      );
    }
  }

  // Disallow transitions to ACCOUNT_DISCOVERED / ACCOUNT_VERIFIED if accountId is invalid
  if (
    targetState === DerivSyncState.ACCOUNT_DISCOVERED ||
    targetState === DerivSyncState.ACCOUNT_VERIFIED ||
    targetState === DerivSyncState.ACCOUNT_PERSISTED
  ) {
    if (!context.derivAccountId || !isValidDerivAccountId(context.derivAccountId)) {
      throw new Error(
        `[SyncStateMachine] INVARIANT_VIOLATION: Cannot transition to '${targetState}' with invalid or missing accountId (received: '${context.derivAccountId}')`
      );
    }
  }

  return targetState;
}
