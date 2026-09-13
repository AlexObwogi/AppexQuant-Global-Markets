/**
 * AppexQuant Markets Global - Automated Smart-Risk Guardrails & Anti-Tilt System Types
 */

export type CircuitBreakerStatus = 'ACTIVE_MONITORING' | 'TRIGGERED_LOCKOUT' | 'COOLING_OFF' | 'OVERRIDDEN';

export interface AntiTiltConfig {
  enabled: boolean;
  maxDailyLossPct: number;
  maxDailyLossUsd: number;
  maxConsecutiveLosses: number;
  lockoutDurationMinutes: number;
  autoCloseOnBreach: boolean;
  allowSlTpModificationsDuringLock: boolean;
  requirePasscodeForReset: boolean;
  alertOnLossPctThreshold: number; // e.g., 75% of max daily loss
}

export interface AntiTiltEventLog {
  id: string;
  accountId: string;
  timestamp: string;
  triggerReason: 'MAX_DAILY_LOSS_PCT' | 'MAX_DAILY_LOSS_USD' | 'CONSECUTIVE_LOSS_STREAK' | 'RAPID_EQUITY_DRAWDOWN' | 'MANUAL_PANIC_LOCK';
  startingDayEquity: number;
  currentEquity: number;
  drawdownPct: number;
  drawdownUsd: number;
  consecutiveLosses: number;
  lockoutExpiresAt: string;
  status: CircuitBreakerStatus;
  positionsProtectedCount: number;
  overrideNote?: string;
}

export interface CircuitBreakerState {
  accountId: string;
  status: CircuitBreakerStatus;
  config: AntiTiltConfig;
  dayStartEquity: number;
  currentEquity: number;
  dayRealizedPnl: number;
  dayUnrealizedPnl: number;
  currentDrawdownPct: number;
  consecutiveLossesCount: number;
  isOrderEntryLocked: boolean;
  lockoutStartedAt?: string;
  lockoutExpiresAt?: string;
  remainingCooldownSeconds: number;
  lastTriggerEvent?: AntiTiltEventLog;
}
