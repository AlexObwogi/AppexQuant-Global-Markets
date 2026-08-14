import { UserRole, UserPermission } from '../types/user';

/**
 * AppexQuant Markets Global - Role-Based Permission Matrix (Least Privilege)
 */
export const ROLE_PERMISSIONS: Record<UserRole, UserPermission[]> = {
  USER: [
    UserPermission.VIEW_MARKETS,
    UserPermission.VIEW_ACCOUNT,
    UserPermission.CREATE_STRATEGY,
    UserPermission.MANAGE_STRATEGIES,
    UserPermission.RUN_BACKTEST,
    UserPermission.ENABLE_PAPER_TRADING,
    UserPermission.VIEW_POSITIONS,
    UserPermission.EXECUTE_MANUAL_ORDER,
  ],
  SUPPORT_AGENT: [
    UserPermission.VIEW_MARKETS,
    UserPermission.VIEW_ACCOUNT,
    UserPermission.VIEW_POSITIONS,
    UserPermission.VIEW_AUDIT_LOG,
  ],
  CONTENT_MANAGER: [
    UserPermission.VIEW_MARKETS,
    UserPermission.VIEW_ACCOUNT,
    UserPermission.CREATE_STRATEGY,
    UserPermission.MANAGE_STRATEGIES,
  ],
  TRADING_OPERATOR: [
    UserPermission.VIEW_MARKETS,
    UserPermission.VIEW_ACCOUNT,
    UserPermission.VIEW_POSITIONS,
    UserPermission.EXECUTE_MANUAL_ORDER,
    UserPermission.ENABLE_PAPER_TRADING,
    UserPermission.MANAGE_STRATEGIES,
  ],
  RISK_MANAGER: [
    UserPermission.VIEW_MARKETS,
    UserPermission.VIEW_ACCOUNT,
    UserPermission.VIEW_POSITIONS,
    UserPermission.MANAGE_RISK,
    UserPermission.MANAGE_STRATEGIES,
  ],
  AI_OPERATOR: [
    UserPermission.VIEW_MARKETS,
    UserPermission.RUN_BACKTEST,
    UserPermission.CREATE_STRATEGY,
    UserPermission.MANAGE_STRATEGIES,
  ],
  ADMIN: [
    UserPermission.VIEW_MARKETS,
    UserPermission.VIEW_ACCOUNT,
    UserPermission.VIEW_POSITIONS,
    UserPermission.CREATE_STRATEGY,
    UserPermission.MANAGE_STRATEGIES,
    UserPermission.MANAGE_USERS,
    UserPermission.MANAGE_FEATURE_FLAGS,
    UserPermission.VIEW_AUDIT_LOG,
  ],
  SUPER_ADMIN: [
    UserPermission.VIEW_MARKETS,
    UserPermission.VIEW_ACCOUNT,
    UserPermission.VIEW_POSITIONS,
    UserPermission.CREATE_STRATEGY,
    UserPermission.MANAGE_STRATEGIES,
    UserPermission.MANAGE_USERS,
    UserPermission.MANAGE_FEATURE_FLAGS,
    UserPermission.VIEW_AUDIT_LOG,
    UserPermission.MANAGE_SYSTEM,
    UserPermission.MANAGE_BROKERS,
    UserPermission.MANAGE_RISK,
  ],
};

/**
 * List of high-risk permissions that require MFA session elevation.
 */
export const HIGH_RISK_PERMISSIONS: UserPermission[] = [
  UserPermission.MANAGE_SYSTEM,
  UserPermission.MANAGE_BROKERS,
  UserPermission.MANAGE_RISK,
  UserPermission.MANAGE_USERS,
  UserPermission.MANAGE_FEATURE_FLAGS,
  UserPermission.ENABLE_LIVE_TRADING,
];

/**
 * Verifies if a user role has a specific permission.
 */
export function hasPermission(role: UserRole, permission: UserPermission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return permissions.includes(permission);
}

/**
 * Checks if a permission is classified as high-risk.
 */
export function isHighRiskPermission(permission: UserPermission): boolean {
  return HIGH_RISK_PERMISSIONS.includes(permission);
}

/**
 * Check if the active session is elevated.
 * Checks elevation status and checks for expiry.
 */
export function isSessionElevated(isElevated: boolean, elevatedUntil: string | null): boolean {
  if (!isElevated || !elevatedUntil) return false;
  const expiry = new Date(elevatedUntil).getTime();
  const now = Date.now();
  return expiry > now;
}

export * from './auth/pkce';
export * from './auth/useDerivAuth';
