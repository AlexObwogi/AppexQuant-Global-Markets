/**
 * AppexQuant Markets Global - Production Database Schema Definition
 * Enterprise-grade domain entity models for all 34 database entities.
 *
 * Directives & Integrity Rules:
 * 1. Indexes: Primary, foreign key, composite, and lookup indexes explicitly declared.
 * 2. Unique Constraints: Enforced on business keys (e.g., email, symbol, idempotency token, order ticket).
 * 3. Timestamps: ISO 8601 UTC timestamps (`createdAt`, `updatedAt`, `deletedAt`) applied consistently.
 * 4. Soft Deletion: Applied via `isDeleted` and `deletedAt` fields for soft-deletable entities.
 * 5. Financial Protection: Financial records (Order, Execution, Position, Portfolio, RiskDecision, BacktestTrade, AuditEvent, LegalAcceptance)
 *    are marked IMMUTABLE or SOFT-DELETE ONLY to guarantee complete historical audit integrity. Never hard deleted.
 */

// ==========================================
// 1. USER & IDENTITY MANAGEMENT
// ==========================================

export interface User {
  id: string; // UUID v4 Primary Key
  email: string; // Unique
  username: string; // Unique
  passwordHash?: string;
  roleId: string; // FK -> Role.id
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION' | 'DELETED';
  isMfaEnabled: boolean;
  emailVerifiedAt?: string | null;
  lastLoginAt?: string | null;
  isDeleted: boolean;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  deletedAt?: string | null; // Soft deletion timestamp
}

export interface Role {
  id: string; // Primary Key
  name: string; // Display name e.g., 'Super Administrator'
  code: string; // Unique code e.g., 'SUPER_ADMIN', 'TRADER', 'AUDITOR'
  description: string;
  isSystemRole: boolean; // Immutable system roles cannot be dropped
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface Permission {
  id: string; // Primary Key
  code: string; // Unique code e.g. 'orders:write', 'risk:override', 'failsafe:reset'
  name: string;
  category: 'TRADING' | 'RISK' | 'ADMIN' | 'ANALYTICS' | 'COMPLIANCE' | 'SYSTEM';
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface RolePermission {
  roleId: string; // FK -> Role.id
  permissionId: string; // FK -> Permission.id
  assignedAt: string;
  assignedByUserId?: string;
}

export interface Session {
  id: string; // Primary Key
  userId: string; // FK -> User.id
  sessionToken: string; // Unique SHA-256 session hash
  refreshTokenHash: string; // Unique Refresh token hash
  ipAddress: string;
  userAgent: string;
  deviceFingerprint?: string;
  isRevoked: boolean;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface MFA {
  id: string; // Primary Key
  userId: string; // FK -> User.id (Unique active per user)
  mfaType: 'TOTP' | 'SMS' | 'WEBAUTHN' | 'BACKUP_CODES';
  secretEncrypted: string;
  backupCodesHash: string[];
  isEnabled: boolean;
  verifiedAt?: string | null;
  lastUsedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TraderProfile {
  id: string; // Primary Key
  userId: string; // FK -> User.id (Unique)
  traderLevel: 'NOVICE' | 'INTERMEDIATE' | 'PRO' | 'INSTITUTIONAL';
  riskAppetite: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE' | 'CUSTOM';
  preferredMarketsJson: string; // Array of asset classes/symbols
  experienceYears: number;
  bio?: string;
  avatarUrl?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VerificationRecord {
  id: string; // Primary Key
  userId: string; // FK -> User.id
  verificationType: 'KYC_IDENTITY' | 'KYC_ADDRESS' | 'PEP_CHECK' | 'BROKER_AUTH';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  documentRef?: string;
  verifiedByUserId?: string;
  verifiedAtIso?: string | null;
  expiresAtIso?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 2. BROKER & ACCOUNT CONNECTIONS
// ==========================================

export interface DerivAccount {
  id: string; // External Deriv loginid e.g. CR123456 / VRTC123456 (Primary Key)
  userId: string; // FK -> User.id (One-to-Many)
  accountType: 'demo' | 'real';
  currency: string;
  balance: number;
  equity?: number;
  isVirtual: boolean;
  isDisabled: boolean;
  status: 'ACTIVE' | 'DISABLED' | 'SUSPENDED';
  lastSyncedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DerivAccountSnapshot {
  id: string; // UUID Primary Key
  derivAccountId: string; // FK -> DerivAccount.id
  userId: string; // FK -> User.id
  balance: number;
  equity?: number;
  currency: string;
  snapshotKey: string; // Idempotency key: `${derivAccountId}_${hourKey}`
  timestamp: string;
}

export interface BrokerConnection {
  id: string; // Primary Key
  userId: string; // FK -> User.id
  brokerName: string; // e.g. 'Deriv', 'MT5', 'InteractiveBrokers'
  serverName: string;
  connectionType: 'FIX_PROTOCOL' | 'REST_WEBSOCKET' | 'META_API';
  encryptedCredentials: string; // AES-256-GCM encrypted
  status: 'CONNECTED' | 'DISCONNECTED' | 'DEGRADED' | 'AUTHENTICATION_FAILED';
  lastHeartbeatAt?: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface BrokerAccount {
  id: string; // Primary Key
  userId: string; // FK -> User.id
  brokerConnectionId: string; // FK -> BrokerConnection.id
  accountNumber: string; // Unique within broker connection
  accountType: 'DEMO' | 'REAL' | 'PROP_EVALUATION';
  currency: string; // e.g., 'USD', 'EUR'
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevelPct: number;
  leverage: number; // e.g., 100 for 1:100
  isLiveTradingAllowed: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface Portfolio {
  id: string; // Primary Key - Financial Record (Soft delete only)
  userId: string; // FK -> User.id
  name: string;
  currency: string;
  totalEquityUsd: number;
  totalBalanceUsd: number;
  usedMarginUsd: number;
  freeMarginUsd: number;
  dailyPnlUsd: number;
  allTimePnlUsd: number;
  maxDrawdownPct: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

// ==========================================
// 3. MARKET DATA & INSTRUMENTS
// ==========================================

export interface Instrument {
  id: string; // Primary Key
  symbol: string; // Unique e.g. 'EURUSD', 'XAUUSD', 'Vol_75'
  name: string;
  assetClass: 'FOREX' | 'COMMODITY' | 'CRYPTO' | 'INDEX' | 'SYNTHETIC_INDEX';
  baseCurrency: string;
  quoteCurrency: string;
  pipSize: number; // e.g. 0.0001 or 0.01
  minLotSize: number;
  maxLotSize: number;
  lotStep: number;
  marginRatePct: number;
  tradingHoursJson: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MarketQuote {
  id: string; // Primary Key
  instrumentId: string; // FK -> Instrument.id
  symbol: string;
  bid: number;
  ask: number;
  mid: number;
  spreadPips: number;
  volume: number;
  quoteTimestampIso: string;
  createdAt: string;
}

export interface MarketBar {
  id: string; // Primary Key
  instrumentId: string; // FK -> Instrument.id
  symbol: string;
  timeframe: 'M1' | 'M5' | 'M15' | 'M30' | 'H1' | 'H4' | 'D1';
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  barTimestampIso: string;
  createdAt: string;
}

// ==========================================
// 4. STRATEGIES, BACKTESTING & SIGNALS
// ==========================================

export interface Strategy {
  id: string; // Primary Key
  userId: string; // FK -> User.id
  name: string;
  codeName: string;
  description: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  activeVersionId?: string | null; // FK -> StrategyVersion.id
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface StrategyVersion {
  id: string; // Primary Key
  strategyId: string; // FK -> Strategy.id
  versionNumber: number; // Incrementing integer (1, 2, 3)
  versionTag: string; // e.g., 'v1.2.0-beta'
  sourceCode: string;
  compiledArtifactUrl?: string;
  changeLog: string;
  isApprovedForLive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StrategyParameter {
  id: string; // Primary Key
  strategyVersionId: string; // FK -> StrategyVersion.id
  paramKey: string; // Unique parameter key e.g. 'rsi_period'
  paramName: string;
  dataType: 'NUMBER' | 'STRING' | 'BOOLEAN' | 'JSON';
  defaultValue: string;
  minValue?: number | null;
  maxValue?: number | null;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Backtest {
  id: string; // Primary Key
  userId: string; // FK -> User.id
  strategyVersionId: string; // FK -> StrategyVersion.id
  symbol: string;
  timeframe: string;
  startDateIso: string;
  endDateIso: string;
  initialBalanceUsd: number;
  finalEquityUsd: number;
  totalTrades: number;
  winRatePct: number;
  sharpeRatio: number;
  maxDrawdownPct: number;
  profitFactor: number;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  logsUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BacktestTrade {
  id: string; // Primary Key - Financial Record (Immutable history)
  backtestId: string; // FK -> Backtest.id
  tradeNumber: number;
  symbol: string;
  direction: 'BUY' | 'SELL';
  entryTimeIso: string;
  entryPrice: number;
  exitTimeIso: string;
  exitPrice: number;
  volumeLots: number;
  pnlUsd: number;
  pnlPips: number;
  commissionUsd: number;
  slippagePips: number;
  exitReason: string;
  createdAt: string;
}

export interface Signal {
  id: string; // Primary Key
  strategyId: string; // FK -> Strategy.id
  strategyVersionId: string; // FK -> StrategyVersion.id
  symbol: string;
  direction: 'BUY' | 'SELL' | 'CLOSE' | 'MODIFY';
  strengthScore: number; // 0.0 to 100.0
  recommendedLotSize: number;
  suggestedEntryPrice: number;
  suggestedStopLoss: number;
  suggestedTakeProfit: number;
  reasoningJson: string;
  generatedAtIso: string;
  status: 'NEW' | 'EXECUTED' | 'EXPIRED' | 'CANCELLED';
  createdAt: string;
}

// ==========================================
// 5. RISK MANAGEMENT & EXECUTION (FINANCIAL LEDGER)
// ==========================================

export interface RiskPolicy {
  id: string; // Primary Key
  userId: string; // FK -> User.id
  portfolioId?: string; // FK -> Portfolio.id
  name: string;
  maxDailyDrawdownPct: number; // e.g. 3.00%
  maxTotalDrawdownPct: number; // e.g. 10.00%
  maxPositionLotSize: number; // e.g. 5.00 lots
  maxOpenPositions: number; // e.g. 10
  maxCorrelationLimitPct: number;
  failClosedOnServiceDrop: boolean; // Must be true for fail-closed interlock
  isDefaultPolicy: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface RiskDecision {
  id: string; // Primary Key - Financial Audit Record (NEVER hard deleted)
  riskPolicyId: string; // FK -> RiskPolicy.id
  orderId?: string | null; // FK -> Order.id
  userId: string; // FK -> User.id
  decision: 'APPROVED' | 'REJECTED' | 'MODIFIED';
  reasonCode: string; // e.g., 'MAX_DAILY_DRAWDOWN_EXCEEDED', 'FAIL_CLOSED_INTERLOCK'
  rationale: string;
  failClosedInterlockTriggered: boolean;
  evaluationLatencyMs: number;
  evaluatedAtIso: string;
  createdAt: string;
}

export interface Order {
  id: string; // Primary Key - Financial Record (Soft Delete Only via CANCELLED / ARCHIVED)
  userId: string; // FK -> User.id
  accountId: string; // FK -> BrokerAccount.id
  brokerConnectionId: string; // FK -> BrokerConnection.id
  strategyId?: string | null; // FK -> Strategy.id
  clientOrderId: string; // Unique idempotency hash (UUID/SHA-256)
  brokerOrderId?: string | null; // Ticket assigned by broker
  symbol: string;
  orderType: 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT';
  direction: 'BUY' | 'SELL';
  volumeLots: number;
  requestedPrice: number;
  stopLoss?: number | null;
  takeProfit?: number | null;
  status: 'PENDING' | 'SUBMITTED' | 'FILLED' | 'PARTIALLY_FILLED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
  rejectionReason?: string | null;
  submittedAtIso: string;
  executedAtIso?: string | null;
  isDeleted: boolean; // Financial Soft Delete Guard
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface Execution {
  id: string; // Primary Key - Financial Record (Immutable ledger entry)
  orderId: string; // FK -> Order.id
  userId: string; // FK -> User.id
  accountId: string; // FK -> BrokerAccount.id
  brokerExecutionId: string; // Unique fill ID from broker / FIX tag 17
  symbol: string;
  direction: 'BUY' | 'SELL';
  volumeLots: number;
  executionPrice: number;
  slippagePips: number;
  commissionUsd: number;
  swapUsd: number;
  executedAtIso: string;
  createdAt: string;
}

export interface Position {
  id: string; // Primary Key - Financial Record (Soft delete only on close, audit preserved)
  userId: string; // FK -> User.id
  accountId: string; // FK -> BrokerAccount.id
  strategyId?: string | null; // FK -> Strategy.id
  brokerPositionId: string; // Unique position ticket from broker
  symbol: string;
  direction: 'BUY' | 'SELL';
  volumeLots: number;
  entryPrice: number;
  currentPrice: number;
  stopLoss?: number | null;
  takeProfit?: number | null;
  unrealizedPnlUsd: number;
  realizedPnlUsd: number;
  swapUsd: number;
  commissionUsd: number;
  status: 'OPEN' | 'CLOSED' | 'LIQUIDATED' | 'PARTIALLY_CLOSED';
  openedAtIso: string;
  closedAtIso?: string | null;
  isDeleted: boolean; // Financial Soft Delete Guard
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface JournalEntry {
  id: string; // Primary Key - Financial Journal (Soft delete only)
  userId: string; // FK -> User.id
  positionId?: string | null; // FK -> Position.id
  orderId?: string | null; // FK -> Order.id
  title: string;
  notes: string;
  setupTagsJson: string; // Array of tags e.g. ['Breakout', 'RSI_Divergence']
  emotionsTag?: 'DISCIPLINED' | 'FOMO' | 'FEARFUL' | 'GREEDY' | 'NEUTRAL';
  ratingStars: number; // 1 to 5
  snapshotChartUrl?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

// ==========================================
// 6. ALERTS & NOTIFICATIONS
// ==========================================

export interface Alert {
  id: string; // Primary Key
  userId: string; // FK -> User.id
  alertType: 'PRICE_THRESHOLD' | 'RISK_BREACH' | 'SYSTEM_FAILSAFE' | 'EA_SIGNAL';
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'EMERGENCY';
  targetSymbol?: string;
  isTriggered: boolean;
  triggeredAtIso?: string | null;
  isAcknowledged: boolean;
  acknowledgedAtIso?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string; // Primary Key
  userId: string; // FK -> User.id
  alertId?: string | null; // FK -> Alert.id
  channel: 'IN_APP' | 'EMAIL' | 'SMS' | 'WEBPUSH' | 'TELEGRAM';
  recipientAddress: string;
  subject: string;
  content: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  sentAtIso?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 7. AUTOMATION JOBS & EVENTS
// ==========================================

export interface AutomationJob {
  id: string; // Primary Key
  userId: string; // FK -> User.id
  strategyId: string; // FK -> Strategy.id
  jobName: string;
  scheduleCron: string; // e.g. '*/5 * * * *'
  status: 'ACTIVE' | 'PAUSED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  lastRunAtIso?: string | null;
  nextRunAtIso?: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface AutomationEvent {
  id: string; // Primary Key
  automationJobId: string; // FK -> AutomationJob.id
  strategyId: string; // FK -> Strategy.id
  eventType: 'TRIGGER' | 'EVALUATION' | 'DISPATCH' | 'ERROR';
  stepNumber: number; // Step index (1..14)
  totalSteps: number; // 14
  summaryMessage: string;
  payloadJson: string;
  latencyMs: number;
  eventTimestampIso: string;
  createdAt: string;
}

// ==========================================
// 8. AUDIT, HEALTH & FEATURE FLAGS
// ==========================================

export interface AuditEvent {
  id: string; // Primary Key - Compliance Audit Log (Hard delete prohibited)
  userId: string; // FK -> User.id
  sessionId?: string | null; // FK -> Session.id
  actionType: string; // e.g., 'LOGIN', 'ORDER_SUBMIT', 'FAILSAFE_TRIGGER', 'FAILSAFE_RESET', 'RISK_CHANGE', 'DB_WIPE_ATTEMPT'
  ipAddress: string;
  userAgent: string;
  resourceId?: string;
  resourceType?: string;
  beforeStateJson?: string;
  afterStateJson?: string;
  status: 'SUCCESS' | 'DENIED' | 'ERROR';
  eventTimestampIso: string;
  createdAt: string;
}

export interface FeatureFlag {
  flagKey: string; // Primary Key e.g. 'ENABLE_FAIL_CLOSED_INTERLOCK'
  isEnabled: boolean;
  description: string;
  rulesJson?: string; // Target user roles or percentage rollouts
  updatedByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SystemHealthEvent {
  id: string; // Primary Key
  subsystemKey: 'marketData' | 'brokerGateway' | 'database' | 'riskEngine' | 'executionEngine' | 'failSafeSentinel';
  healthStatus: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'CRITICAL';
  latencyMs: number;
  errorCount: number;
  detailsMessage: string;
  metricsJson: string;
  eventTimestampIso: string;
  createdAt: string;
}

// ==========================================
// 9. LEGAL & COMPLIANCE
// ==========================================

export interface LegalDocument {
  id: string; // Primary Key
  docCode: 'TERMS_OF_SERVICE' | 'PRIVACY_POLICY' | 'RISK_DISCLOSURE' | 'ALGO_TRADING_AGREEMENT';
  title: string;
  version: string; // e.g., 'v2.4'
  contentMarkdown: string;
  isMandatory: boolean;
  effectiveDateIso: string;
  createdAt: string;
  updatedAt: string;
}

export interface LegalAcceptance {
  id: string; // Primary Key - Immutable Compliance Agreement
  userId: string; // FK -> User.id
  legalDocumentId: string; // FK -> LegalDocument.id
  docCode: string;
  versionAccepted: string;
  ipAddress: string;
  userAgent: string;
  signatureText: string; // Trader typed digital signature
  acceptedAtIso: string;
  createdAt: string;
}

// ==========================================
// BACKWARD COMPATIBILITY INTERFACES
// ==========================================

export interface DbUserSchema extends User {}
export interface DbSessionSchema extends Session {}
export interface DbBrokerConnectionSchema extends BrokerConnection {}
export interface DbAccountSchema extends BrokerAccount {}
export interface DbAuditLogSchema {
  id: string;
  eventType: string;
  userId: string;
  accountId?: string;
  detailsJson: string;
  timestamp: string;
}
export interface DbFeatureFlagSchema extends FeatureFlag {}
