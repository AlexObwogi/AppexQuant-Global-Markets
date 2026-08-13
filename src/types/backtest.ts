import { UserStrategy, StrategyStatus } from './ai';

export interface BacktestParams {
  strategyId: string;
  symbol: string;
  timeframe: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  startingCapital: number;
  commissionPerLot: number; // e.g. $5 per round turn lot
  spreadPips: number; // e.g. 1.5 pips
  slippagePips: number; // e.g. 0.5 pips
  positionSizing: 'FIXED_LOT' | 'EQUITY_PERCENT' | 'RISK_PERCENT';
  positionSizeValue: number; // e.g. 1.0 (lots), 2 (2% of equity), or 1 (1% risk)
  riskModel: 'FIXED_SL_TP' | 'TRAILING_STOP' | 'BREAK_EVEN';
  trainTestSplit: number; // percentage in train (e.g. 70 for 70/30)
}

export interface BacktestTrade {
  id: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entryTime: string;
  exitTime: string;
  entryPrice: number;
  exitPrice: number;
  volume: number; // lots
  pipsPl: number;
  grossPl: number;
  commission: number;
  netPl: number;
  holdingTimeMs: number;
  exitReason: 'TP' | 'SL' | 'TRAILING_STOP' | 'REVERSAL' | 'END_OF_BACKTEST';
  wasWin: boolean;
  isOutOfSample: boolean; // True if occurred in the Test period
}

export interface MetricBreakdown {
  totalReturnPct: number;
  netPl: number;
  winRate: number;
  lossRate: number;
  profitFactor: number;
  expectancy: number; // expectancy per trade in $
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdownPct: number;
  maxDrawdownCash: number;
  averageTradePl: number;
  averageWinner: number;
  averageLoser: number;
  largestWin: number;
  largestLoss: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  tradeCount: number;
  averageHoldingTimeMin: number;
}

export interface OverfittingDiagnosis {
  riskScore: 'LOW' | 'MEDIUM' | 'HIGH';
  scorePct: number; // 0 to 100
  factors: {
    name: string;
    description: string;
    status: 'PASS' | 'WARNING' | 'FAIL';
    value: string;
  }[];
  verdict: string;
}

export interface BacktestResult {
  params: BacktestParams;
  strategyName: string;
  overall: MetricBreakdown;
  trainMetrics: MetricBreakdown;
  testMetrics: MetricBreakdown;
  trades: BacktestTrade[];
  equityCurve: {
    timestamp: string;
    totalEquity: number;
    trainEquity: number;
    testEquity: number;
    drawdownPct: number;
    isOutOfSample: boolean;
  }[];
  monthlyReturns: {
    yearMonth: string; // "2026-01"
    returnPct: number;
    netPl: number;
  }[];
  overfitting: OverfittingDiagnosis;
}
