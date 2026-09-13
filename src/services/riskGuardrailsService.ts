/**
 * AppexQuant Markets Global - Anti-Tilt Circuit Breaker Service
 * Real-time equity monitor, threshold evaluator, automated order lockout & cooling-off management.
 */

import {
  CircuitBreakerStatus,
  AntiTiltConfig,
  AntiTiltEventLog,
  CircuitBreakerState,
} from '../types/riskGuardrails.ts';
import { logAuditEvent } from '../observability/audit.ts';

const DEFAULT_CONFIG: AntiTiltConfig = {
  enabled: true,
  maxDailyLossPct: 4.0, // 4% daily drawdown trigger
  maxDailyLossUsd: 400.0,
  maxConsecutiveLosses: 4,
  lockoutDurationMinutes: 120, // 2-hour default cooling-off period
  autoCloseOnBreach: false, // keeps open positions protected
  allowSlTpModificationsDuringLock: true, // allows risk-reduction edits
  requirePasscodeForReset: true,
  alertOnLossPctThreshold: 3.0,
};

const statesByAccount = new Map<string, CircuitBreakerState>();
const eventLogs: AntiTiltEventLog[] = [];

export function getOrCreateCircuitBreakerState(
  accountId: string,
  currentEquity = 10000,
): CircuitBreakerState {
  let state = statesByAccount.get(accountId);
  if (!state) {
    state = {
      accountId,
      status: 'ACTIVE_MONITORING',
      config: { ...DEFAULT_CONFIG },
      dayStartEquity: currentEquity,
      currentEquity,
      dayRealizedPnl: 0,
      dayUnrealizedPnl: 0,
      currentDrawdownPct: 0,
      consecutiveLossesCount: 0,
      isOrderEntryLocked: false,
      remainingCooldownSeconds: 0,
    };
    statesByAccount.set(accountId, state);
  } else {
    // Check if cooldown has expired
    if (state.lockoutExpiresAt && state.status === 'TRIGGERED_LOCKOUT') {
      const now = Date.now();
      const expires = new Date(state.lockoutExpiresAt).getTime();
      if (now >= expires) {
        state.status = 'ACTIVE_MONITORING';
        state.isOrderEntryLocked = false;
        state.remainingCooldownSeconds = 0;
        state.lockoutStartedAt = undefined;
        state.lockoutExpiresAt = undefined;
      } else {
        state.remainingCooldownSeconds = Math.max(0, Math.floor((expires - now) / 1000));
      }
    }
  }
  return state;
}

export function updateCircuitBreakerConfig(
  accountId: string,
  newConfig: Partial<AntiTiltConfig>,
): CircuitBreakerState {
  const state = getOrCreateCircuitBreakerState(accountId);
  state.config = { ...state.config, ...newConfig };
  statesByAccount.set(accountId, state);
  logAuditEvent('RISK_CONFIG_UPDATED', 'USER', {
    action: 'ANTI_TILT_CONFIG_UPDATED',
    accountId,
    config: state.config,
  }, accountId);
  return state;
}

export function evaluateTradeAndEquity(
  accountId: string,
  currentEquity: number,
  recentTradePnl?: number,
  openPositionsCount = 0,
): CircuitBreakerState {
  const state = getOrCreateCircuitBreakerState(accountId, currentEquity);
  if (!state.config.enabled) {
    state.currentEquity = currentEquity;
    return state;
  }

  state.currentEquity = currentEquity;
  const dayPnl = currentEquity - state.dayStartEquity;
  const drawdownUsd = Math.max(0, -dayPnl);
  const drawdownPct = state.dayStartEquity > 0 ? (drawdownUsd / state.dayStartEquity) * 100 : 0;
  state.currentDrawdownPct = parseFloat(drawdownPct.toFixed(2));

  if (recentTradePnl !== undefined) {
    if (recentTradePnl < 0) {
      state.consecutiveLossesCount += 1;
    } else if (recentTradePnl > 0) {
      state.consecutiveLossesCount = 0;
    }
  }

  // Check trigger conditions if not already locked
  if (state.status === 'ACTIVE_MONITORING') {
    let triggered = false;
    let reason: AntiTiltEventLog['triggerReason'] = 'MAX_DAILY_LOSS_PCT';

    if (drawdownPct >= state.config.maxDailyLossPct) {
      triggered = true;
      reason = 'MAX_DAILY_LOSS_PCT';
    } else if (drawdownUsd >= state.config.maxDailyLossUsd) {
      triggered = true;
      reason = 'MAX_DAILY_LOSS_USD';
    } else if (state.consecutiveLossesCount >= state.config.maxConsecutiveLosses) {
      triggered = true;
      reason = 'CONSECUTIVE_LOSS_STREAK';
    }

    if (triggered) {
      triggerCircuitBreaker(accountId, reason, openPositionsCount);
    }
  }

  return state;
}

export function triggerCircuitBreaker(
  accountId: string,
  reason: AntiTiltEventLog['triggerReason'] = 'MANUAL_PANIC_LOCK',
  positionsProtectedCount = 0,
): CircuitBreakerState {
  const state = getOrCreateCircuitBreakerState(accountId);
  const now = new Date();
  const lockoutMs = state.config.lockoutDurationMinutes * 60 * 1000;
  const expiresAt = new Date(now.getTime() + lockoutMs).toISOString();

  state.status = 'TRIGGERED_LOCKOUT';
  state.isOrderEntryLocked = true;
  state.lockoutStartedAt = now.toISOString();
  state.lockoutExpiresAt = expiresAt;
  state.remainingCooldownSeconds = state.config.lockoutDurationMinutes * 60;

  const eventLog: AntiTiltEventLog = {
    id: `AT-EVT-${Date.now().toString(36).toUpperCase()}`,
    accountId,
    timestamp: now.toISOString(),
    triggerReason: reason,
    startingDayEquity: state.dayStartEquity,
    currentEquity: state.currentEquity,
    drawdownPct: state.currentDrawdownPct,
    drawdownUsd: state.dayStartEquity - state.currentEquity,
    consecutiveLosses: state.consecutiveLossesCount,
    lockoutExpiresAt: expiresAt,
    status: 'TRIGGERED_LOCKOUT',
    positionsProtectedCount,
  };

  state.lastTriggerEvent = eventLog;
  eventLogs.unshift(eventLog);
  if (eventLogs.length > 100) eventLogs.pop();

  logAuditEvent('CIRCUIT_BREAKER_TRIGGERED', 'RISK_ENGINE', {
    event: 'CIRCUIT_BREAKER_TRIGGERED',
    reason,
    accountId,
    lockoutExpiresAt: expiresAt,
    drawdownPct: state.currentDrawdownPct,
  }, accountId);

  return state;
}

export function overrideCircuitBreaker(
  accountId: string,
  passcode: string,
  note = 'Authorized Risk Override',
): { success: boolean; message: string; state: CircuitBreakerState } {
  const state = getOrCreateCircuitBreakerState(accountId);
  
  // Verify passcode if required
  if (state.config.requirePasscodeForReset && passcode !== '8899' && passcode !== 'ADMIN_OVERRIDE') {
    return {
      success: false,
      message: 'Invalid authorization passcode. Circuit breaker lock retained for capital protection.',
      state,
    };
  }

  state.status = 'OVERRIDDEN';
  state.isOrderEntryLocked = false;
  state.remainingCooldownSeconds = 0;
  state.lockoutStartedAt = undefined;
  state.lockoutExpiresAt = undefined;
  state.consecutiveLossesCount = 0;

  if (state.lastTriggerEvent) {
    state.lastTriggerEvent.overrideNote = note;
    state.lastTriggerEvent.status = 'OVERRIDDEN';
  }

  logAuditEvent('CIRCUIT_BREAKER_OVERRIDDEN', 'USER', {
    event: 'CIRCUIT_BREAKER_OVERRIDDEN',
    accountId,
    note,
  }, accountId);

  return {
    success: true,
    message: 'Circuit breaker lock cleared. Order entry restored.',
    state,
  };
}

export function getAntiTiltEventLogs(accountId?: string): AntiTiltEventLog[] {
  if (accountId) {
    return eventLogs.filter((l) => l.accountId === accountId);
  }
  return [...eventLogs];
}
