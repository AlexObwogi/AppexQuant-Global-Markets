/**
 * AppexQuant Markets Global - Phase 3 Centralized Risk/Reward Guardrail Engine
 * Enforces strict 1:2 minimum and 1:3 maximum Risk/Reward guardrails.
 */

export interface RiskValidationResult {
  isValid: boolean;
  riskAmount: number;
  rewardAmount: number;
  riskRewardRatio: number;
  rejectionReason?: string;
}

export interface RiskGuardrailResult {
  passed: boolean;
  riskRewardRatio: number;
  stopLoss: number;
  takeProfit: number;
  entryZone: { min: number; max: number };
  rejectionReason?: string;
  riskWarnings: string[];
}

/**
 * Validates a trading setup's entry, stop loss, and take profit against the 1:2 to 1:3 R:R requirement.
 */
export function validateRiskReward(
  direction: 'LONG' | 'SHORT',
  entryPrice: number,
  stopLoss: number,
  takeProfit: number
): RiskValidationResult {
  if (entryPrice <= 0 || stopLoss <= 0 || takeProfit <= 0) {
    return {
      isValid: false,
      riskAmount: 0,
      rewardAmount: 0,
      riskRewardRatio: 0,
      rejectionReason: 'Invalid price parameters provided (prices must be positive numbers).',
    };
  }

  let risk = 0;
  let reward = 0;

  if (direction === 'LONG') {
    if (stopLoss >= entryPrice) {
      return {
        isValid: false,
        riskAmount: 0,
        rewardAmount: 0,
        riskRewardRatio: 0,
        rejectionReason: 'LONG setup invalid: Stop Loss must be strictly below Entry Price.',
      };
    }
    if (takeProfit <= entryPrice) {
      return {
        isValid: false,
        riskAmount: 0,
        rewardAmount: 0,
        riskRewardRatio: 0,
        rejectionReason: 'LONG setup invalid: Take Profit must be strictly above Entry Price.',
      };
    }
    risk = entryPrice - stopLoss;
    reward = takeProfit - entryPrice;
  } else if (direction === 'SHORT') {
    if (stopLoss <= entryPrice) {
      return {
        isValid: false,
        riskAmount: 0,
        rewardAmount: 0,
        riskRewardRatio: 0,
        rejectionReason: 'SHORT setup invalid: Stop Loss must be strictly above Entry Price.',
      };
    }
    if (takeProfit >= entryPrice) {
      return {
        isValid: false,
        riskAmount: 0,
        rewardAmount: 0,
        riskRewardRatio: 0,
        rejectionReason: 'SHORT setup invalid: Take Profit must be strictly below Entry Price.',
      };
    }
    risk = stopLoss - entryPrice;
    reward = entryPrice - takeProfit;
  } else {
    return {
      isValid: false,
      riskAmount: 0,
      rewardAmount: 0,
      riskRewardRatio: 0,
      rejectionReason: 'Neutral bias cannot form a directional Risk-to-Reward calculation.',
    };
  }

  const rawRatio = reward / risk;
  const rrRatio = Number(rawRatio.toFixed(2));

  // Strict Phase 3 Guardrail: 2.0 <= RR <= 3.0
  if (rrRatio < 2.0) {
    return {
      isValid: false,
      riskAmount: Number(risk.toFixed(5)),
      rewardAmount: Number(reward.toFixed(5)),
      riskRewardRatio: rrRatio,
      rejectionReason: `Risk-to-Reward ratio 1:${rrRatio} is below the required 1:2.0 minimum threshold. Setup REJECTED.`,
    };
  }

  if (rrRatio > 3.0) {
    return {
      isValid: false,
      riskAmount: Number(risk.toFixed(5)),
      rewardAmount: Number(reward.toFixed(5)),
      riskRewardRatio: rrRatio,
      rejectionReason: `Risk-to-Reward ratio 1:${rrRatio} exceeds the 1:3.0 maximum safety threshold. Setup REJECTED.`,
    };
  }

  return {
    isValid: true,
    riskAmount: Number(risk.toFixed(5)),
    rewardAmount: Number(reward.toFixed(5)),
    riskRewardRatio: rrRatio,
  };
}

export function calculateRiskReward(
  currentPrice: number,
  direction: 'LONG' | 'SHORT',
  swingLow: number,
  swingHigh: number,
  atr: number,
  pipSize: number
): RiskGuardrailResult {
  const warnings: string[] = [];
  const safeAtr = atr > 0 ? atr : currentPrice * 0.002;

  // Calculate Entry Zone around current price
  const entrySpread = safeAtr * 0.15;
  const entryZone = {
    min: Number((currentPrice - entrySpread).toFixed(5)),
    max: Number((currentPrice + entrySpread).toFixed(5)),
  };

  let stopLoss = 0;
  let takeProfit = 0;

  if (direction === 'LONG') {
    // SL sits below recent swing low or 1.5 * ATR
    const calculatedSl = Math.min(swingLow - safeAtr * 0.2, currentPrice - safeAtr * 1.5);
    stopLoss = Number(Math.max(pipSize, calculatedSl).toFixed(5));

    // TP sits at swing high or 3.2 * ATR
    const calculatedTp = Math.max(swingHigh + safeAtr * 0.2, currentPrice + safeAtr * 3.2);
    takeProfit = Number(calculatedTp.toFixed(5));
  } else {
    // SHORT direction
    const calculatedSl = Math.max(swingHigh + safeAtr * 0.2, currentPrice + safeAtr * 1.5);
    stopLoss = Number(calculatedSl.toFixed(5));

    const calculatedTp = Math.min(swingLow - safeAtr * 0.2, currentPrice - safeAtr * 3.2);
    takeProfit = Number(Math.max(pipSize, calculatedTp).toFixed(5));
  }

  // Calculate actual Risk and Reward amounts
  const riskAmount = Math.abs(currentPrice - stopLoss);
  const rewardAmount = Math.abs(takeProfit - currentPrice);

  let riskRewardRatio = riskAmount > 0 ? Number((rewardAmount / riskAmount).toFixed(2)) : 0;

  // REQUIREMENT 13: Risk/Reward must strictly satisfy 2.0 <= R:R <= 3.0
  const MIN_RR = 2.0;
  const MAX_RR = 3.0;

  let passed = true;
  let rejectionReason: string | undefined = undefined;

  if (riskRewardRatio < MIN_RR) {
    passed = false;
    rejectionReason = `Calculated Risk/Reward ratio 1:${riskRewardRatio} is below the required 1:${MIN_RR} minimum threshold. Setup rejected for insufficient expected value.`;
    warnings.push(`R:R ratio 1:${riskRewardRatio} violates minimum 1:2.0 safety rule.`);
  } else if (riskRewardRatio > MAX_RR) {
    passed = false;
    rejectionReason = `Calculated Risk/Reward ratio 1:${riskRewardRatio} exceeds the maximum allowed 1:${MAX_RR} target zone. Setup rejected for unrealistically far target distance.`;
    warnings.push(`R:R ratio 1:${riskRewardRatio} exceeds maximum 1:3.0 safety boundary.`);
  }

  if (riskAmount <= pipSize * 2) {
    warnings.push('Stop loss distance is extremely tight relative to spread; slippage risk elevated.');
  }

  return {
    passed,
    riskRewardRatio,
    stopLoss,
    takeProfit,
    entryZone,
    rejectionReason,
    riskWarnings: warnings,
  };
}
