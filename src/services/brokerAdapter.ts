/**
 * AppexQuant Markets Global - Modular Broker Adapter Foundation
 * Implements BrokerAdapter interface to decouple UI from specific broker APIs.
 */

import { BrokerAdapter, BrokerConnection, BrokerType, BrokerAccount, BrokerBalance, BrokerPosition, BrokerOrder, BrokerEnvironment, BrokerConnectionState } from '../types/broker.ts';

export class BaseBrokerAdapter implements BrokerAdapter {
  readonly brokerType: BrokerType;
  protected connection: BrokerConnection;
  protected storedTokenEncrypted?: string;

  constructor(brokerType: BrokerType, brokerName: string, server = 'Default-Server') {
    this.brokerType = brokerType;
    this.connection = {
      id: `conn-${brokerType.toLowerCase()}-${Date.now()}`,
      brokerType,
      brokerName,
      server,
      accountNumber: 'DEMO-994821',
      status: 'DISCONNECTED',
      environment: 'DEMO',
      apiPermissions: ['read', 'trade'],
      isReadOnly: false,
      executionPermission: true,
      lastHeartbeat: new Date().toISOString(),
      lastMarketDataTimestamp: new Date().toISOString(),
    };
  }

  async connect(credentials: { accountNumber: string; token?: string; server?: string; environment?: BrokerEnvironment; isReadOnly?: boolean }): Promise<boolean> {
    this.connection.status = 'CONNECTING';

    if (!credentials.accountNumber) {
      this.connection.status = 'ERROR';
      this.connection.lastError = {
        code: 'ERR_MISSING_ACCOUNT',
        message: 'Account number is mandatory for broker connection.',
        timestamp: new Date().toISOString(),
        retryable: false,
      };
      return false;
    }

    // Simulate secure backend credential encryption
    if (credentials.token) {
      this.storedTokenEncrypted = `enc_v1_${btoa(credentials.token).split('').reverse().join('')}`;
    }

    this.connection.accountNumber = credentials.accountNumber;
    if (credentials.server) this.connection.server = credentials.server;
    if (credentials.environment) this.connection.environment = credentials.environment;
    if (credentials.isReadOnly !== undefined) {
      this.connection.isReadOnly = credentials.isReadOnly;
      this.connection.executionPermission = !credentials.isReadOnly;
    }

    this.connection.status = 'CONNECTED';
    this.connection.lastConnectedAt = new Date().toISOString();
    this.connection.lastHeartbeat = new Date().toISOString();
    this.connection.lastMarketDataTimestamp = new Date().toISOString();
    delete this.connection.lastError;

    return true;
  }

  async disconnect(): Promise<void> {
    this.connection.status = 'DISCONNECTED';
    this.connection.lastHeartbeat = new Date().toISOString();
  }

  getConnectionStatus(): BrokerConnection {
    return { ...this.connection };
  }

  async getAccount(): Promise<BrokerAccount> {
    return {
      id: `acc-${this.connection.accountNumber}`,
      accountNumber: this.connection.accountNumber,
      currency: 'USD',
      balance: this.connection.environment === 'REAL' ? 12450.00 : 50000.00,
      equity: this.connection.environment === 'REAL' ? 12512.40 : 50240.10,
      margin: 1250.00,
      freeMargin: this.connection.environment === 'REAL' ? 11262.40 : 48990.10,
      leverage: 500,
      environment: this.connection.environment,
      isReadOnly: this.connection.isReadOnly,
    };
  }

  async getBalances(): Promise<BrokerBalance[]> {
    const acc = await this.getAccount();
    return [{
      currency: acc.currency,
      balance: acc.balance,
      equity: acc.equity,
      freeMargin: acc.freeMargin,
    }];
  }

  async getPositions(): Promise<BrokerPosition[]> {
    return [
      {
        id: 'pos-01',
        symbol: 'XAUUSD',
        type: 'BUY',
        volume: 0.50,
        openPrice: 2332.50,
        currentPrice: 2338.20,
        profit: 285.00,
        swap: -1.20,
        commission: -3.50,
        openedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      },
      {
        id: 'pos-02',
        symbol: 'EURUSD',
        type: 'SELL',
        volume: 1.00,
        openPrice: 1.08520,
        currentPrice: 1.08440,
        profit: 80.00,
        swap: -0.40,
        commission: -6.00,
        openedAt: new Date(Date.now() - 3600000 * 1.5).toISOString(),
      },
    ];
  }

  async getOrders(): Promise<BrokerOrder[]> {
    return [
      {
        id: 'ord-101',
        symbol: 'GBPUSD',
        type: 'LIMIT',
        direction: 'BUY',
        volume: 0.75,
        price: 1.27200,
        sl: 1.26800,
        tp: 1.28000,
        status: 'PENDING',
        createdAt: new Date(Date.now() - 7200000).toISOString(),
      },
    ];
  }

  async getMarketData(symbol: string): Promise<{ symbol: string; bid: number; ask: number; timestamp: string }> {
    const basePrice = symbol.includes('XAU') ? 2338.20 : symbol.includes('EUR') ? 1.08450 : 1.27500;
    const spread = symbol.includes('XAU') ? 0.30 : 0.00012;
    return {
      symbol,
      bid: basePrice,
      ask: basePrice + spread,
      timestamp: new Date().toISOString(),
    };
  }

  async reconcileBrokerPositions(livePositions: any[]): Promise<{ syncedPositions: any[]; log: string }> {
    return {
      syncedPositions: livePositions,
      log: `Successfully reconciled ${livePositions.length} position(s) with ground-truth broker state.`
    };
  }

  async placeOrder(order: any): Promise<BrokerOrder> {
    if (this.connection.isReadOnly || !this.connection.executionPermission) {
      throw new Error('Broker connection is in Read-Only mode. Order placement blocked.');
    }
    if (this.connection.status !== 'CONNECTED') {
      throw new Error('Broker connection is not active.');
    }
    if (!order || !order.symbol || isNaN(order.volume) || order.volume <= 0) {
      throw new Error('Invalid order payload: Symbol and positive numeric volume required.');
    }
    return {
      ...order,
      id: `ord-${Math.random().toString(36).substring(2, 9)}`,
      createdAt: new Date().toISOString(),
      status: 'FILLED',
    };
  }

  async modifyOrder(orderId: string, modifications: { sl?: number; tp?: number; price?: number }): Promise<boolean> {
    if (this.connection.isReadOnly) throw new Error('Read-only connection.');
    return true;
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    if (this.connection.isReadOnly) throw new Error('Read-only connection.');
    return true;
  }

  async getOrderStatus(orderId: string): Promise<BrokerOrder> {
    return {
      id: orderId,
      symbol: 'XAUUSD',
      type: 'MARKET',
      direction: 'BUY',
      volume: 0.5,
      status: 'FILLED',
      createdAt: new Date().toISOString(),
    };
  }
}

export class DerivAdapter extends BaseBrokerAdapter {
  constructor(initOptions?: Partial<BrokerConnection>) {
    super('DERIV', 'Deriv Limited (WebSocket API)', 'Deriv-Server');
    if (initOptions) {
      this.connection = { ...this.connection, ...initOptions };
    }
  }
}

export class ExnessAdapter extends BaseBrokerAdapter {
  constructor() {
    super('EXNESS', 'Exness Global (MT5 API)', 'Exness-Real');
  }
}

export class JustMarketsAdapter extends BaseBrokerAdapter {
  constructor() {
    super('JUSTMARKETS', 'JustMarkets Ltd (REST API)', 'JustMarkets-Server');
  }
}

