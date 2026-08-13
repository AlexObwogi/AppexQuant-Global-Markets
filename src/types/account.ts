/**
 * AppexQuant Markets Global - Account & Balance Types
 */

export type AccountType = 'DEMO' | 'REAL';

export interface AccountBalance {
  currency: string;
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number; // percentage
  unrealizedPl: number;
}

export interface TradingAccount {
  id: string;
  userId: string;
  brokerId: string;
  accountNumber: string;
  accountName: string;
  type: AccountType;
  currency: string;
  server: string;
  isPrimary: boolean;
  isConnected: boolean;
  balance: AccountBalance;
  createdAt: string;
  updatedAt: string;
}
