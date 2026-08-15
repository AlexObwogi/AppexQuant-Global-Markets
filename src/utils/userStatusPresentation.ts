/**
 * AppexQuant Markets Global - Central User Status Presentation Layer
 * Translates internal engine, fail-safe, risk, and connectivity states
 * into clean, user-friendly status representations.
 */

import { ConnectionStatus } from '../types/market.ts';
import { RiskState } from '../types/risk.ts';
import { FailSafeState } from '../types/failSafe.ts';

export interface UserFacingStatus {
  label: string;
  badgeType: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  subtext?: string;
}

export function formatUserConnectionStatus(status: ConnectionStatus): UserFacingStatus {
  switch (status) {
    case 'ONLINE':
      return {
        label: 'Markets Connected',
        badgeType: 'success',
        subtext: 'Real-time market streaming active',
      };
    case 'RECONNECTING':
      return {
        label: 'Reconnecting...',
        badgeType: 'warning',
        subtext: 'Re-establishing stream connection',
      };
    case 'DEGRADED':
      return {
        label: 'Connection Degraded',
        badgeType: 'warning',
        subtext: 'High market latency detected',
      };
    case 'OFFLINE':
    default:
      return {
        label: 'Markets Offline',
        badgeType: 'neutral',
        subtext: 'Market stream unavailable',
      };
  }
}

export function formatUserRiskStatus(riskState: RiskState): UserFacingStatus {
  if (!riskState.isTradingAllowed || riskState.isDailyDrawdownBreached) {
    return {
      label: 'Trading Protected',
      badgeType: 'danger',
      subtext: 'Maximum risk threshold reached',
    };
  }
  return {
    label: 'Risk Protection Active',
    badgeType: 'success',
    subtext: 'Account safeguards enforced',
  };
}

export function formatUserFailSafeStatus(failSafe: FailSafeState): UserFacingStatus {
  if (failSafe.status === 'EMERGENCY_HALTED') {
    return {
      label: 'Trading Halted for Safety',
      badgeType: 'danger',
      subtext: 'Protective stop active. Contact support if required.',
    };
  }
  if (failSafe.status === 'PAUSED') {
    return {
      label: 'Automated Execution Paused',
      badgeType: 'warning',
      subtext: 'Manual trading remains enabled',
    };
  }
  return {
    label: 'System Normal',
    badgeType: 'success',
    subtext: 'All trading systems operational',
  };
}

export function formatCurrencyValue(amount: number, isHidden: boolean = false, currency: string = '$'): string {
  if (isHidden) {
    return '••••••••';
  }
  return `${currency}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
