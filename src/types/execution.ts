/**
 * AppexQuant Markets Global - Unified Execution Domain Types
 */

export type OrderExecutionState =
  | 'CREATED'
  | 'VALIDATING'
  | 'RISK_CHECK'
  | 'APPROVED'
  | 'SUBMITTED'
  | 'PARTIALLY_FILLED'
  | 'FILLED'
  | 'CANCEL_REQUESTED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'FAILED'
  | 'UNKNOWN';

export interface OrderTimelineEvent {
  state: OrderExecutionState;
  timestamp: string;
  message: string;
}

export interface ExecutionOrder {
  requestId: string;
  accountId: string;
  strategyId: string;
  symbol: string;
  side: 'BUY' | 'SHORT';
  orderType: 'MARKET' | 'LIMIT' | 'STOP';
  quantity: number;
  price?: number; // requested price where applicable
  timeInForce: 'DAY' | 'GTC' | 'IOC' | 'FOK';
  riskDecisionId: string;
  createdAt: string;
  updatedAt: string;

  // Lifecycle & Performance Fields
  state: OrderExecutionState;
  requestedPrice: number;
  fillPrice?: number;
  executionLatencyMs?: number;
  slippagePips?: number;
  commission?: number;
  brokerResponse?: string;
  timeline: OrderTimelineEvent[];
}

export interface ExecutionDashboardStats {
  pendingCount: number;
  workingCount: number;
  filledCount: number;
  cancelledCount: number;
  rejectedCount: number;
  failedCount: number;
  averageLatencyMs: number;
  totalSlippagePips: number;
  totalCommission: number;
}
