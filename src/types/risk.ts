/**
 * AppexQuant Markets Global - Risk Engine Domain Contracts
 */

export interface RiskRules {
  maxDailyDrawdownPct: number;
  maxPositionSizeLots: number;
  maxOpenPositions: number;
  requireStopLoss: boolean;
  blockTradingOnHighNews: boolean;
  maxLeverage: number;
}

export interface RiskState {
  currentDailyDrawdownPct: number;
  isDailyDrawdownBreached: boolean;
  isTradingAllowed: boolean;
  rules: RiskRules;
}

export interface TradeValidationResult {
  isValid: boolean;
  rejectionReason?: string;
  violations: string[];
}
