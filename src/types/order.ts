/**
 * AppexQuant Markets Global - Order & Execution Domain Types
 * (Architectural preparation for live execution in future phases)
 */

export type OrderType = 'BUY' | 'SELL' | 'BUY_LIMIT' | 'SELL_LIMIT' | 'BUY_STOP' | 'SELL_STOP';
export type OrderStatus = 'PENDING' | 'EXECUTED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';

export interface OrderIntent {
  accountId: string;
  symbol: string;
  orderType: OrderType;
  volume: number;
  stopLoss?: number;
  takeProfit?: number;
  price?: number;
  comment?: string;
  source: 'MANUAL' | 'AI_SIGNAL' | 'EA_STRATEGY';
}

export interface TradePosition {
  id: string;
  ticketNumber: string;
  accountId: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  volume: number;
  openPrice: number;
  currentPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  swap: number;
  commission: number;
  profit: number;
  openTime: string;
}
