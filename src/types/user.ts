/**
 * AppexQuant Markets Global - User & Identity Types
 */

export type UserRole =
  | 'USER'
  | 'SUPPORT_AGENT'
  | 'CONTENT_MANAGER'
  | 'TRADING_OPERATOR'
  | 'RISK_MANAGER'
  | 'AI_OPERATOR'
  | 'ADMIN'
  | 'SUPER_ADMIN';

export const UserRole = {
  USER: 'USER',
  SUPPORT_AGENT: 'SUPPORT_AGENT',
  CONTENT_MANAGER: 'CONTENT_MANAGER',
  TRADING_OPERATOR: 'TRADING_OPERATOR',
  RISK_MANAGER: 'RISK_MANAGER',
  AI_OPERATOR: 'AI_OPERATOR',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
} as const;

export type UserPermission =
  | 'VIEW_MARKETS'
  | 'VIEW_ACCOUNT'
  | 'CREATE_STRATEGY'
  | 'MANAGE_STRATEGIES'
  | 'RUN_BACKTEST'
  | 'ENABLE_PAPER_TRADING'
  | 'ENABLE_LIVE_TRADING'
  | 'VIEW_POSITIONS'
  | 'EXECUTE_MANUAL_ORDER'
  | 'MANAGE_RISK'
  | 'MANAGE_BROKERS'
  | 'MANAGE_USERS'
  | 'MANAGE_FEATURE_FLAGS'
  | 'VIEW_AUDIT_LOG'
  | 'MANAGE_SYSTEM';

export const UserPermission = {
  VIEW_MARKETS: 'VIEW_MARKETS',
  VIEW_ACCOUNT: 'VIEW_ACCOUNT',
  CREATE_STRATEGY: 'CREATE_STRATEGY',
  MANAGE_STRATEGIES: 'MANAGE_STRATEGIES',
  RUN_BACKTEST: 'RUN_BACKTEST',
  ENABLE_PAPER_TRADING: 'ENABLE_PAPER_TRADING',
  ENABLE_LIVE_TRADING: 'ENABLE_LIVE_TRADING',
  VIEW_POSITIONS: 'VIEW_POSITIONS',
  EXECUTE_MANUAL_ORDER: 'EXECUTE_MANUAL_ORDER',
  MANAGE_RISK: 'MANAGE_RISK',
  MANAGE_BROKERS: 'MANAGE_BROKERS',
  MANAGE_USERS: 'MANAGE_USERS',
  MANAGE_FEATURE_FLAGS: 'MANAGE_FEATURE_FLAGS',
  VIEW_AUDIT_LOG: 'VIEW_AUDIT_LOG',
  MANAGE_SYSTEM: 'MANAGE_SYSTEM',
} as const;

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
  loginid?: string;
  currency?: string;
  balance?: number;
  accountType?: string;
  fullName?: string;
  preferences: {
    theme: 'dark' | 'light' | 'system';
    currency: string;
    timezone: string;
    notificationsEnabled: boolean;
  };
}

export interface AuthSession {
  sessionId: string;
  userId: string;
  token: string | null;
  expiresAt: string | null;
  isAuthenticated: boolean;
  lastActive: string;
  isElevated: boolean; // For high-risk operations requiring MFA re-verification
  elevatedUntil: string | null;
}

