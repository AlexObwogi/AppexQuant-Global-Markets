/**
 * AppexQuant Markets Global - Audit Trail Domain Types
 */

export type AuditEventType =
  | 'USER_REGISTERED'
  | 'LOGIN'
  | 'LOGOUT'
  | 'ACCOUNT_CONNECTED'
  | 'ACCOUNT_DISCONNECTED'
  | 'STRATEGY_CREATED'
  | 'SIGNAL_CREATED'
  | 'RISK_REJECTED'
  | 'TRADE_REQUESTED'
  | 'TRADE_EXECUTED'
  | 'TRADE_REJECTED'
  | 'EA_ENABLED'
  | 'EA_DISABLED'
  | 'LIVE_TRADING_ENABLED'
  | 'LIVE_TRADING_DISABLED'
  | 'EXECUTION_ENVIRONMENT_CHANGED'
  | 'COMMUNITY_ACTION'
  | 'ADMIN_ACTION';

export interface AuditEvent {
  id: string;
  eventType: AuditEventType;
  userId: string;
  accountId?: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}
