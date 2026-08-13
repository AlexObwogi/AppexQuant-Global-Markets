/**
 * AppexQuant Markets Global - Central Alert Engine Type Definitions
 */

export enum AlertType {
  BROKER_DISCONNECTED = 'Broker disconnected',
  MARKET_DATA_STALE = 'Market data stale',
  RISK_THRESHOLD_REACHED = 'Risk threshold reached',
  DAILY_LOSS_THRESHOLD = 'Daily loss threshold',
  DRAWDOWN_THRESHOLD = 'Drawdown threshold',
  STRATEGY_FAILURE = 'Strategy failure',
  EXECUTION_FAILURE = 'Execution failure',
  ORDER_REJECTED = 'Order rejected',
  POSITION_MISMATCH = 'Position mismatch',
  AUTOMATION_PAUSED = 'Automation paused',
  AUTOMATION_RESUMED = 'Automation resumed',
  EMERGENCY_HALT = 'Emergency halt',
  AUTHENTICATION_EVENT = 'Authentication event',
  SECURITY_EVENT = 'Security event',
}

export enum AlertSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum AlertChannel {
  IN_APP = 'In-app',
  PUSH = 'Push where supported',
  EMAIL = 'Email where configured',
}

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  source: string;
  message: string;
  timestamp: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED';
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

export interface UserAlertPreference {
  type: AlertType;
  channels: {
    [AlertChannel.IN_APP]: boolean;
    [AlertChannel.PUSH]: boolean;
    [AlertChannel.EMAIL]: boolean;
  };
}

export interface UserAlertPreferences {
  userId: string;
  preferences: UserAlertPreference[];
  emailConfigured: boolean;
  emailAddress?: string;
  pushSupported: boolean;
  pushToken?: string;
}
