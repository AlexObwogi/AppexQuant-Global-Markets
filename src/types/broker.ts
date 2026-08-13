/**
 * AppexQuant Markets Global - Broker Adapter Interface Architecture
 */

export type BrokerType = 'DERIV' | 'EXNESS' | 'JUSTMARKETS' | 'MOCK_BROKER';
export type BrokerConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'REAUTH_REQUIRED' | 'RATE_LIMITED' | 'ERROR';
export type BrokerEnvironment = 'DEMO' | 'REAL';

export interface BrokerAccount {
  id: string;
  accountNumber: string;
  currency: string;
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  leverage: number;
  environment: BrokerEnvironment;
  isReadOnly: boolean;
}

export interface BrokerBalance {
  currency: string;
  balance: number;
  equity: number;
  freeMargin: number;
}

export interface BrokerPosition {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  volume: number;
  openPrice: number;
  currentPrice: number;
  profit: number;
  swap: number;
  commission: number;
  openedAt: string;
}

export interface BrokerOrder {
  id: string;
  symbol: string;
  type: 'MARKET' | 'LIMIT' | 'STOP';
  direction: 'BUY' | 'SELL';
  volume: number;
  price?: number;
  sl?: number;
  tp?: number;
  status: 'PENDING' | 'FILLED' | 'CANCELLED' | 'REJECTED';
  createdAt: string;
}

export interface BrokerError {
  code: string;
  message: string;
  timestamp: string;
  retryable: boolean;
}

export interface BrokerConnection {
  id: string;
  brokerType: BrokerType;
  brokerName: string;
  server: string;
  accountNumber: string;
  status: BrokerConnectionState;
  environment: BrokerEnvironment;
  lastConnectedAt?: string;
  lastPingMs?: number;
  lastHeartbeat?: string;
  lastMarketDataTimestamp?: string;
  apiPermissions: string[];
  isReadOnly: boolean;
  executionPermission: boolean;
  lastError?: BrokerError;
}

/**
 * Enterprise interface for multi-broker integration adapters
 */
export interface BrokerAdapter {
  readonly brokerType: BrokerType;
  connect(credentials: { accountNumber: string; token?: string; server?: string; environment?: BrokerEnvironment; isReadOnly?: boolean }): Promise<boolean>;
  disconnect(): Promise<void>;
  getConnectionStatus(): BrokerConnection;
  getAccount(): Promise<BrokerAccount>;
  getBalances(): Promise<BrokerBalance[]>;
  getPositions(): Promise<BrokerPosition[]>;
  getOrders(): Promise<BrokerOrder[]>;
  getMarketData(symbol: string): Promise<{ symbol: string; bid: number; ask: number; timestamp: string }>;
  placeOrder(order: Omit<BrokerOrder, 'id' | 'createdAt' | 'status'>): Promise<BrokerOrder>;
  modifyOrder(orderId: string, modifications: { sl?: number; tp?: number; price?: number }): Promise<boolean>;
  cancelOrder(orderId: string): Promise<boolean>;
  getOrderStatus(orderId: string): Promise<BrokerOrder>;
}

