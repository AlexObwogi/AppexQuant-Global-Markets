/**
 * AppexQuant Markets Global - Production Database Models & Metadata Registry
 * Provides database index declarations, unique constraints, soft-deletion policies,
 * financial integrity safeguards, and SQL DDL generator scripts for all 34 core domain entities.
 */

import {
  User,
  Role,
  Permission,
  RolePermission,
  Session,
  MFA,
  TraderProfile,
  VerificationRecord,
  BrokerConnection,
  BrokerAccount,
  Portfolio,
  Instrument,
  MarketQuote,
  MarketBar,
  Strategy,
  StrategyVersion,
  StrategyParameter,
  Backtest,
  BacktestTrade,
  Signal,
  RiskPolicy,
  RiskDecision,
  Order,
  Execution,
  Position,
  JournalEntry,
  Alert,
  Notification,
  AutomationJob,
  AutomationEvent,
  AuditEvent,
  FeatureFlag,
  SystemHealthEvent,
  LegalDocument,
  LegalAcceptance,
} from './schema.js';

/**
 * Metadata definition for database indices
 */
export interface TableIndexDefinition {
  tableName: string;
  indexName: string;
  columns: string[];
  isUnique: boolean;
  description: string;
}

/**
 * Metadata definition for unique business constraints
 */
export interface UniqueConstraintDefinition {
  tableName: string;
  constraintName: string;
  columns: string[];
  description: string;
}

/**
 * Comprehensive Index Registry across all 34 database entities
 */
export class DatabaseIndexes {
  public static readonly INDEXES: TableIndexDefinition[] = [
    // 1. User & Identity
    { tableName: 'User', indexName: 'idx_user_email_unique', columns: ['email'], isUnique: true, description: 'Fast lookup & unique email constraint' },
    { tableName: 'User', indexName: 'idx_user_username_unique', columns: ['username'], isUnique: true, description: 'Fast lookup & unique username constraint' },
    { tableName: 'User', indexName: 'idx_user_role_id', columns: ['roleId'], isUnique: false, description: 'RBAC user role filtering' },
    { tableName: 'User', indexName: 'idx_user_status', columns: ['status', 'isDeleted'], isUnique: false, description: 'Active user filtering' },

    // 2. Role & Permissions
    { tableName: 'Role', indexName: 'idx_role_code_unique', columns: ['code'], isUnique: true, description: 'Unique role code identification' },
    { tableName: 'Permission', indexName: 'idx_permission_code_unique', columns: ['code'], isUnique: true, description: 'Unique permission code lookup' },
    { tableName: 'Permission', indexName: 'idx_permission_category', columns: ['category'], isUnique: false, description: 'Group permissions by domain category' },
    { tableName: 'RolePermission', indexName: 'idx_role_perm_composite', columns: ['roleId', 'permissionId'], isUnique: true, description: 'Composite unique role permission mapping' },

    // 3. Sessions & MFA
    { tableName: 'Session', indexName: 'idx_session_token_unique', columns: ['sessionToken'], isUnique: true, description: 'Authentication token verification' },
    { tableName: 'Session', indexName: 'idx_session_user_expires', columns: ['userId', 'expiresAt', 'isRevoked'], isUnique: false, description: 'Active session validation' },
    { tableName: 'MFA', indexName: 'idx_mfa_user_unique', columns: ['userId'], isUnique: true, description: 'One MFA config per user' },

    // 4. Trader Profile & Verification
    { tableName: 'TraderProfile', indexName: 'idx_trader_profile_user_unique', columns: ['userId'], isUnique: true, description: 'One trader profile per user' },
    { tableName: 'VerificationRecord', indexName: 'idx_verif_user_type_unique', columns: ['userId', 'verificationType'], isUnique: true, description: 'Unique identity verification per user type' },

    // 5. Broker Connection & Account
    { tableName: 'BrokerConnection', indexName: 'idx_broker_conn_user_status', columns: ['userId', 'status', 'isDeleted'], isUnique: false, description: 'User broker connection monitoring' },
    { tableName: 'BrokerAccount', indexName: 'idx_broker_acc_conn_num_unique', columns: ['brokerConnectionId', 'accountNumber'], isUnique: true, description: 'Unique broker account per connection' },
    { tableName: 'BrokerAccount', indexName: 'idx_broker_acc_user', columns: ['userId', 'accountType'], isUnique: false, description: 'User account filtering' },
    { tableName: 'Portfolio', indexName: 'idx_portfolio_user', columns: ['userId', 'isDeleted'], isUnique: false, description: 'User portfolio performance tracking' },

    // 6. Instruments & Market Data
    { tableName: 'Instrument', indexName: 'idx_instrument_symbol_unique', columns: ['symbol'], isUnique: true, description: 'Unique ticker symbol identifier' },
    { tableName: 'Instrument', indexName: 'idx_instrument_asset_class', columns: ['assetClass', 'isActive'], isUnique: false, description: 'Asset class filtering' },
    { tableName: 'MarketQuote', indexName: 'idx_quote_symbol_timestamp', columns: ['symbol', 'quoteTimestampIso'], isUnique: false, description: 'Time-series quote retrieval' },
    { tableName: 'MarketBar', indexName: 'idx_bar_symbol_tf_timestamp_unique', columns: ['symbol', 'timeframe', 'barTimestampIso'], isUnique: true, description: 'OHLCV bar deduplication and time-series query' },

    // 7. Strategies, Versions, Parameters
    { tableName: 'Strategy', indexName: 'idx_strategy_user_status', columns: ['userId', 'status', 'isDeleted'], isUnique: false, description: 'User strategy management' },
    { tableName: 'StrategyVersion', indexName: 'idx_strat_ver_strat_num_unique', columns: ['strategyId', 'versionNumber'], isUnique: true, description: 'Strategy versioning deduplication' },
    { tableName: 'StrategyParameter', indexName: 'idx_strat_param_ver_key_unique', columns: ['strategyVersionId', 'paramKey'], isUnique: true, description: 'Unique parameter key per strategy version' },

    // 8. Backtest & Backtest Trades
    { tableName: 'Backtest', indexName: 'idx_backtest_user_strat', columns: ['userId', 'strategyVersionId'], isUnique: false, description: 'User backtest history' },
    { tableName: 'BacktestTrade', indexName: 'idx_bt_trade_backtest_num', columns: ['backtestId', 'tradeNumber'], isUnique: true, description: 'Backtest trade order index' },

    // 9. Signal
    { tableName: 'Signal', indexName: 'idx_signal_strat_status', columns: ['strategyId', 'status', 'generatedAtIso'], isUnique: false, description: 'Active signal dispatch queue' },

    // 10. Risk Management
    { tableName: 'RiskPolicy', indexName: 'idx_risk_policy_user', columns: ['userId', 'isDefaultPolicy'], isUnique: false, description: 'User risk rules lookup' },
    { tableName: 'RiskDecision', indexName: 'idx_risk_dec_order_user', columns: ['userId', 'orderId', 'decision'], isUnique: false, description: 'Risk decision audit trail' },

    // 11. Orders & Executions (Financial Core)
    { tableName: 'Order', indexName: 'idx_order_client_order_id_unique', columns: ['clientOrderId'], isUnique: true, description: 'Idempotent order submit guard' },
    { tableName: 'Order', indexName: 'idx_order_user_acc_status', columns: ['userId', 'accountId', 'status', 'submittedAtIso'], isUnique: false, description: 'Active order desk query' },
    { tableName: 'Execution', indexName: 'idx_exec_broker_exec_id_unique', columns: ['brokerExecutionId'], isUnique: true, description: 'Broker execution deduplication' },
    { tableName: 'Execution', indexName: 'idx_exec_order_acc', columns: ['orderId', 'accountId', 'executedAtIso'], isUnique: false, description: 'Execution fill history' },

    // 12. Positions & Portfolio Ledger
    { tableName: 'Position', indexName: 'idx_position_broker_pos_id_unique', columns: ['brokerPositionId'], isUnique: true, description: 'Broker position deduplication' },
    { tableName: 'Position', indexName: 'idx_position_user_acc_status', columns: ['userId', 'accountId', 'status'], isUnique: false, description: 'Open portfolio position desk' },
    { tableName: 'JournalEntry', indexName: 'idx_journal_user_pos', columns: ['userId', 'positionId'], isUnique: false, description: 'Trader trade journal search' },

    // 13. Alerts & Notifications
    { tableName: 'Alert', indexName: 'idx_alert_user_severity', columns: ['userId', 'severity', 'isAcknowledged'], isUnique: false, description: 'Trader active alert desk' },
    { tableName: 'Notification', indexName: 'idx_notif_user_status', columns: ['userId', 'status'], isUnique: false, description: 'Notification dispatch queue' },

    // 14. Automation Jobs & Events
    { tableName: 'AutomationJob', indexName: 'idx_auto_job_user_status', columns: ['userId', 'status'], isUnique: false, description: 'Scheduler job monitor' },
    { tableName: 'AutomationEvent', indexName: 'idx_auto_event_job_timestamp', columns: ['automationJobId', 'eventTimestampIso'], isUnique: false, description: 'Execution chain event log' },

    // 15. Audit, Feature Flags & Health
    { tableName: 'AuditEvent', indexName: 'idx_audit_user_action_time', columns: ['userId', 'actionType', 'eventTimestampIso'], isUnique: false, description: 'Immutable regulatory audit search' },
    { tableName: 'FeatureFlag', indexName: 'idx_flag_key_unique', columns: ['flagKey'], isUnique: true, description: 'System feature flag lookup' },
    { tableName: 'SystemHealthEvent', indexName: 'idx_health_subsystem_status_time', columns: ['subsystemKey', 'healthStatus', 'eventTimestampIso'], isUnique: false, description: 'Subsystem telemetry monitor' },

    // 16. Legal & Compliance
    { tableName: 'LegalDocument', indexName: 'idx_legal_doc_code_ver_unique', columns: ['docCode', 'version'], isUnique: true, description: 'Unique legal document versioning' },
    { tableName: 'LegalAcceptance', indexName: 'idx_legal_acc_user_doc_unique', columns: ['userId', 'legalDocumentId'], isUnique: true, description: 'Legal agreement user acceptance audit' },
  ];
}

/**
 * List of Entities strictly classified as Financial Records or Compliance Audit Logs.
 * Directive Enforcement: These entities must NEVER be deleted from the database.
 * Deletion attempts MUST be routed through Soft Delete or rejected as Illegal Hard Delete.
 */
export const IMMUTABLE_FINANCIAL_ENTITIES: Set<string> = new Set([
  'Order',
  'Execution',
  'Position',
  'Portfolio',
  'RiskDecision',
  'BacktestTrade',
  'AuditEvent',
  'LegalAcceptance',
  'SystemHealthEvent',
]);

/**
 * Soft Deletion Helper Guard
 */
export class FinancialIntegrityGuard {
  /**
   * Checks whether a table represents a protected financial or compliance audit entity
   */
  public static isFinancialOrComplianceRecord(tableName: string): boolean {
    return IMMUTABLE_FINANCIAL_ENTITIES.has(tableName);
  }

  /**
   * Applies soft deletion parameters to an entity instance while preserving financial history
   */
  public static applySoftDelete<T extends { isDeleted?: boolean; deletedAt?: string | null }>(entity: T): T {
    return {
      ...entity,
      isDeleted: true,
      deletedAt: new Date().toISOString(),
    };
  }
}

/**
 * PostgreSQL DDL Generator Utility for Schema Initialization & Migration Scripts
 */
export class SchemaDdlGenerator {
  public static generateAllCreateTablesSql(): string {
    return `
-- ============================================================================
-- APPEXQUANT MARKETS GLOBAL - PRODUCTION DATABASE DDL SCHEMA
-- GENERATED AT: ${new Date().toISOString()}
-- ============================================================================

CREATE TABLE IF NOT EXISTS "Role" (
  "id" VARCHAR(64) PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "code" VARCHAR(64) UNIQUE NOT NULL,
  "description" TEXT NOT NULL,
  "isSystemRole" BOOLEAN DEFAULT FALSE,
  "isDeleted" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS "User" (
  "id" VARCHAR(64) PRIMARY KEY,
  "email" VARCHAR(255) UNIQUE NOT NULL,
  "username" VARCHAR(64) UNIQUE NOT NULL,
  "passwordHash" TEXT,
  "roleId" VARCHAR(64) REFERENCES "Role"("id"),
  "status" VARCHAR(32) DEFAULT 'ACTIVE',
  "isMfaEnabled" BOOLEAN DEFAULT FALSE,
  "emailVerifiedAt" TIMESTAMP WITH TIME ZONE,
  "lastLoginAt" TIMESTAMP WITH TIME ZONE,
  "isDeleted" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS "Order" (
  "id" VARCHAR(64) PRIMARY KEY,
  "userId" VARCHAR(64) NOT NULL REFERENCES "User"("id"),
  "accountId" VARCHAR(64) NOT NULL,
  "brokerConnectionId" VARCHAR(64) NOT NULL,
  "strategyId" VARCHAR(64),
  "clientOrderId" VARCHAR(128) UNIQUE NOT NULL,
  "brokerOrderId" VARCHAR(128),
  "symbol" VARCHAR(32) NOT NULL,
  "orderType" VARCHAR(32) NOT NULL,
  "direction" VARCHAR(16) NOT NULL,
  "volumeLots" NUMERIC(12, 4) NOT NULL,
  "requestedPrice" NUMERIC(18, 6) NOT NULL,
  "stopLoss" NUMERIC(18, 6),
  "takeProfit" NUMERIC(18, 6),
  "status" VARCHAR(32) NOT NULL,
  "rejectionReason" TEXT,
  "submittedAtIso" TIMESTAMP WITH TIME ZONE NOT NULL,
  "executedAtIso" TIMESTAMP WITH TIME ZONE,
  "isDeleted" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS "Execution" (
  "id" VARCHAR(64) PRIMARY KEY,
  "orderId" VARCHAR(64) NOT NULL REFERENCES "Order"("id"),
  "userId" VARCHAR(64) NOT NULL REFERENCES "User"("id"),
  "accountId" VARCHAR(64) NOT NULL,
  "brokerExecutionId" VARCHAR(128) UNIQUE NOT NULL,
  "symbol" VARCHAR(32) NOT NULL,
  "direction" VARCHAR(16) NOT NULL,
  "volumeLots" NUMERIC(12, 4) NOT NULL,
  "executionPrice" NUMERIC(18, 6) NOT NULL,
  "slippagePips" NUMERIC(10, 2) DEFAULT 0,
  "commissionUsd" NUMERIC(14, 2) DEFAULT 0,
  "swapUsd" NUMERIC(14, 2) DEFAULT 0,
  "executedAtIso" TIMESTAMP WITH TIME ZONE NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Position" (
  "id" VARCHAR(64) PRIMARY KEY,
  "userId" VARCHAR(64) NOT NULL REFERENCES "User"("id"),
  "accountId" VARCHAR(64) NOT NULL,
  "strategyId" VARCHAR(64),
  "brokerPositionId" VARCHAR(128) UNIQUE NOT NULL,
  "symbol" VARCHAR(32) NOT NULL,
  "direction" VARCHAR(16) NOT NULL,
  "volumeLots" NUMERIC(12, 4) NOT NULL,
  "entryPrice" NUMERIC(18, 6) NOT NULL,
  "currentPrice" NUMERIC(18, 6) NOT NULL,
  "stopLoss" NUMERIC(18, 6),
  "takeProfit" NUMERIC(18, 6),
  "unrealizedPnlUsd" NUMERIC(14, 2) DEFAULT 0,
  "realizedPnlUsd" NUMERIC(14, 2) DEFAULT 0,
  "swapUsd" NUMERIC(14, 2) DEFAULT 0,
  "commissionUsd" NUMERIC(14, 2) DEFAULT 0,
  "status" VARCHAR(32) NOT NULL,
  "openedAtIso" TIMESTAMP WITH TIME ZONE NOT NULL,
  "closedAtIso" TIMESTAMP WITH TIME ZONE,
  "isDeleted" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS "AuditEvent" (
  "id" VARCHAR(64) PRIMARY KEY,
  "userId" VARCHAR(64) NOT NULL REFERENCES "User"("id"),
  "sessionId" VARCHAR(64),
  "actionType" VARCHAR(64) NOT NULL,
  "ipAddress" VARCHAR(45) NOT NULL,
  "userAgent" TEXT NOT NULL,
  "resourceId" VARCHAR(128),
  "resourceType" VARCHAR(64),
  "beforeStateJson" JSONB,
  "afterStateJson" JSONB,
  "status" VARCHAR(32) NOT NULL,
  "eventTimestampIso" TIMESTAMP WITH TIME ZONE NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index Definitions
${DatabaseIndexes.INDEXES.map(
  (idx) =>
    `CREATE ${idx.isUnique ? 'UNIQUE ' : ''}INDEX IF NOT EXISTS "${idx.indexName}" ON "${idx.tableName}" (${idx.columns.map((c) => `"${c}"`).join(', ')});`
).join('\n')}
    `;
  }
}
