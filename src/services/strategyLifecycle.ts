/**
 * AppexQuant Markets Global - Strategy Lifecycle Service
 * Enforces strict state machine rules for strategy status transitions.
 */

import { StrategyStatus } from '../types/ai';

export interface TransitionResult {
  allowed: boolean;
  reason?: string;
}

export function validateStrategyTransition(
  currentStatus: StrategyStatus,
  targetStatus: StrategyStatus,
  hasPassedBacktest = false
): TransitionResult {
  if (currentStatus === targetStatus) {
    return { allowed: true };
  }

  // 1. Strict Requirement: Strategy CANNOT go directly from DRAFT to LIVE_APPROVED / ACTIVE
  if (currentStatus === 'DRAFT' && (targetStatus === 'LIVE_APPROVED' || targetStatus === 'ACTIVE')) {
    return {
      allowed: false,
      reason: 'Strategy in DRAFT status cannot be deployed directly to LIVE. Mandatory BACKTEST and PAPER_APPROVED verification required.',
    };
  }

  // 2. Cannot deploy to LIVE without passing backtest
  if ((targetStatus === 'LIVE_APPROVED' || targetStatus === 'ACTIVE') && !hasPassedBacktest && currentStatus !== 'PAPER_APPROVED') {
    return {
      allowed: false,
      reason: 'Strategy must complete a successful backtest or paper trading period before live deployment.',
    };
  }

  // Allowed transitions
  const allowedMap: Record<StrategyStatus, StrategyStatus[]> = {
    DRAFT: ['BACKTEST_REQUIRED', 'BACKTESTED', 'PAPER_APPROVED', 'ARCHIVED'],
    BACKTEST_REQUIRED: ['BACKTESTED', 'DRAFT', 'ARCHIVED'],
    BACKTESTED: ['PAPER_APPROVED', 'LIVE_APPROVED', 'DRAFT', 'ARCHIVED'],
    PAPER_APPROVED: ['LIVE_APPROVED', 'ACTIVE', 'PAUSED', 'DRAFT', 'ARCHIVED'],
    LIVE_APPROVED: ['ACTIVE', 'PAUSED', 'DISABLED', 'ARCHIVED'],
    ACTIVE: ['PAUSED', 'DISABLED', 'ARCHIVED'],
    PAUSED: ['ACTIVE', 'PAPER_APPROVED', 'DISABLED', 'ARCHIVED'],
    DISABLED: ['DRAFT', 'ARCHIVED'],
    ARCHIVED: ['DRAFT'],
  };

  const validTargets = allowedMap[currentStatus] || [];
  if (!validTargets.includes(targetStatus)) {
    return {
      allowed: false,
      reason: `Invalid status transition from ${currentStatus} to ${targetStatus}.`,
    };
  }

  return { allowed: true };
}
