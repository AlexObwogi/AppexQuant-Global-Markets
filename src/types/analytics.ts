/**
 * AppexQuant Markets Global - Trade Analytics & Journaling Domain Types
 */

export interface TradeJournalRecord {
  id: string;
  symbol: string;
  strategyId: string;
  accountId: string;
  side: 'BUY' | 'SHORT';
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  entryTime: string;
  exitTime: string;
  pnlUsd: number;
  initialRiskUsd: number;
  rMultiple: number;
  session: 'London' | 'New York' | 'Tokyo' | 'Sydney';
  marketRegime: 'Trending' | 'Range-bound' | 'High Volatility' | 'Low Volatility';
  signal: string;
  riskDecision: string;
  reason: string;
  executionQuality: 'EXCELLENT' | 'GOOD' | 'SLIPPED' | 'POOR';
  marketConditions: string;
  result: 'WIN' | 'LOSS' | 'BREAKEVEN';
  notes: string;
  executionLatencyMs?: number;
  slippagePips?: number;
  commission?: number;

  aiSummary?: {
    whatHappened: string;
    whyDidItHappen: string;
    whatWasTheRisk: string;
    whatWasTheExecutionQuality: string;
  };
}

export interface AnalyticsSummary {
  profitFactor: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  recoveryFactor: number;
  expectancy: number;
  winRate: number;
  lossRate: number;
  averageR: number;
  averageWinner: number;
  averageLoser: number;
  tradeFrequency: number;
  averageHoldingTimeMin: number;
  totalExposureUsd: number;
  strategyContribution: { strategyId: string; pnl: number; count: number; wins: number }[];
  symbolContribution: { symbol: string; pnl: number; count: number; wins: number }[];
  sessionContribution: { session: string; pnl: number; count: number; wins: number }[];
  timeOfDayContribution: { hour: number; pnl: number; count: number; wins: number }[];
}
