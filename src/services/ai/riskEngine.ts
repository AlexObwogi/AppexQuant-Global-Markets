/**
 * AppexQuant Markets Global - Centralized Pre-Trade Risk Engine
 * Implements 19 critical server-side risk checks required by compliance standards.
 */

export interface OrderRequest {
  id: string;
  strategyId: string;
  strategyName: string;
  symbol: string;
  type: 'MARKET' | 'LIMIT';
  direction: 'BUY' | 'SHORT';
  volume: number; // in lots
  price: number;
  sl: number;
  tp: number;
  brokerId: string;
  timestamp: string;
}

export interface RiskPolicy {
  maxPositionSizeLots: number;
  maxLeverage?: number;
  maxAccountExposure: number; // in USD
  mandatoryStopLoss?: boolean;
  weekendHoldingAllowed?: boolean;
  newsTradingAllowed?: boolean;
  isCircuitBreakerTripped?: boolean;
  maxStrategyExposure: number; // in USD
  maxDailyLoss: number; // in USD
  maxDailyDrawdownPct: number; // e.g. 5.0 for 5%
  maxOpenPositions: number;
  maxCorrelatedExposure: number; // in USD
  minMarginAvailable: number; // % e.g. 20
  maxSpreadPips: number;
  maxSlippagePips: number;
  maxMarketDataAgeMs: number;
  allowedTradingSessions: string[]; // e.g. ["LONDON", "NEW_YORK", "TOKYO"]
  restrictedSymbols: string[];
  allowedStrategies: string[];
  accountStatus: string; // "ACTIVE"
  requiredBrokerStatus: string; // "CONNECTED"
  minOrderIntervalMs: number;
  maxOrdersPerMinute: number;
  circuitBreakerActive: boolean;
}

export interface CheckResult {
  name: string;
  passed: boolean;
  value: string;
  threshold: string;
  description: string;
}

export interface RiskDecision {
  status: 'APPROVED' | 'REJECTED';
  isApproved: boolean;
  reasons: string[];
  reason: string;
  rule: string;
  timestamp: string;
  strategy: string;
  symbol: string;
  orderId: string;
  checks: CheckResult[];
}

// In-Memory Global Admin Policy State
export let activePolicy: RiskPolicy = {
  maxPositionSizeLots: 5.0,
  maxAccountExposure: 100000,
  maxStrategyExposure: 50000,
  maxDailyLoss: 2500,
  maxDailyDrawdownPct: 5.0,
  maxOpenPositions: 8,
  maxCorrelatedExposure: 60000,
  minMarginAvailable: 15.0,
  maxSpreadPips: 3.5,
  maxSlippagePips: 2.0,
  maxMarketDataAgeMs: 5000,
  allowedTradingSessions: ['LONDON', 'NEW_YORK', 'TOKYO'],
  restrictedSymbols: ['XRPUSD', 'MEMEUSDT'],
  allowedStrategies: ['strat-01', 'strat-02', 'strat-03', 'strat-ai-01'],
  accountStatus: 'ACTIVE',
  requiredBrokerStatus: 'CONNECTED',
  minOrderIntervalMs: 3000,
  maxOrdersPerMinute: 15,
  circuitBreakerActive: false,
};

// Update Policy (Admin Operation)
export function updateRiskPolicy(newPolicy: Partial<RiskPolicy>): RiskPolicy {
  activePolicy = {
    ...activePolicy,
    ...newPolicy,
  };
  return activePolicy;
}

// Simulated active state of the account/portfolio for server-side evaluation
export interface MarketEnvironmentState {
  currentDailyLoss: number; // in USD
  currentDailyDrawdownPct: number;
  openPositionsCount: number;
  currentAccountExposure: number; // in USD
  strategyExposure: Record<string, number>; // strategyId -> USD exposure
  correlatedExposure: Record<string, number>; // assetClass/symbolGroup -> USD exposure
  marginRatio: number; // available margin percentage
  spreadPips: number;
  expectedSlippagePips: number;
  marketDataTimestamp: string;
  currentTradingSession: string;
  accountStatus: string;
  brokerStatus: string;
  lastOrderTimestamps: Record<string, string>; // orderSignature -> ISO String
  ordersInLastMinuteCount: number;
}

// Default standard environment state for evaluation
export const defaultMarketEnvironment: MarketEnvironmentState = {
  currentDailyLoss: 350.00,
  currentDailyDrawdownPct: 1.2,
  openPositionsCount: 3,
  currentAccountExposure: 35000,
  strategyExposure: {
    'strat-01': 15000,
    'strat-02': 10000,
    'strat-03': 10000,
  },
  correlatedExposure: {
    'FOREX': 25000,
    'METALS': 10000,
    'CRYPTO': 0,
  },
  marginRatio: 45.0, // 45% available free margin
  spreadPips: 1.2,
  expectedSlippagePips: 0.5,
  marketDataTimestamp: new Date().toISOString(),
  currentTradingSession: 'NEW_YORK',
  accountStatus: 'ACTIVE',
  brokerStatus: 'CONNECTED',
  lastOrderTimestamps: {},
  ordersInLastMinuteCount: 4,
};

// Help helper to get asset class
function getAssetClass(symbol: string): string {
  const sym = symbol.toUpperCase();
  if (sym.includes('USD') && (sym.includes('EUR') || sym.includes('GBP') || sym.includes('JPY') || sym.includes('AUD') || sym.includes('CHF') || sym.includes('CAD'))) {
    return 'FOREX';
  }
  if (sym.includes('XAU') || sym.includes('GOLD') || sym.includes('XAG') || sym.includes('SILVER')) {
    return 'METALS';
  }
  if (sym.includes('BTC') || sym.includes('ETH') || sym.includes('XRP') || sym.includes('MEME')) {
    return 'CRYPTO';
  }
  return 'INDEXES';
}

/**
 * AppexQuant Core Risk Engine Evaluation Function
 * Runs all 19 checks strictly.
 */
export function evaluateRisk(
  order: any,
  userPolicy: Partial<RiskPolicy> = activePolicy,
  userEnv: Partial<MarketEnvironmentState> = defaultMarketEnvironment
): RiskDecision {
  const policy: RiskPolicy = { ...activePolicy, ...userPolicy };
  const env: MarketEnvironmentState = { ...defaultMarketEnvironment, ...userEnv };
  const checks: CheckResult[] = [];
  const now = new Date();
  const timestampIso = now.toISOString();

  // Estimate new order exposure: Lot size standard is 100,000 for Forex, 100 for Gold, etc.
  let contractSize = 100000;
  if (order.symbol.toUpperCase().includes('XAU') || order.symbol.toUpperCase().includes('GOLD')) {
    contractSize = 100; // Gold standard lot size
  } else if (order.symbol.toUpperCase().includes('BTC') || order.symbol.toUpperCase().includes('ETH')) {
    contractSize = 1; // Crypto lot size
  }
  const volume = typeof order.volume === 'number' ? order.volume : (typeof (order as any).volumeLots === 'number' ? (order as any).volumeLots : 0);
  const orderPrice = typeof order.price === 'number' ? order.price : 1.0;
  const orderExposure = orderPrice * volume * contractSize;

  // Check 1: Maximum Position Size
  const check1Passed = volume <= policy.maxPositionSizeLots;
  checks.push({
    name: 'Maximum Position Size',
    passed: check1Passed,
    value: `${volume.toFixed(2)} Lots`,
    threshold: `≤ ${policy.maxPositionSizeLots.toFixed(2)} Lots`,
    description: 'Enforces lot size limits on a per-order basis to prevent catastrophic fat-finger entries.'
  });

  // Check 2: Maximum Account Exposure
  const projectedAccountExposure = env.currentAccountExposure + orderExposure;
  const check2Passed = projectedAccountExposure <= policy.maxAccountExposure;
  checks.push({
    name: 'Maximum Account Exposure',
    passed: check2Passed,
    value: `$${projectedAccountExposure.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    threshold: `≤ $${(policy.maxAccountExposure || 0).toLocaleString()}`,
    description: 'Calculates the sum of all active contract exposures, including the pending order, to restrict overall leverage risk.'
  });

  // Check 3: Maximum Strategy Exposure
  const currentStratExposure = env.strategyExposure[order.strategyId] || 0;
  const projectedStratExposure = currentStratExposure + orderExposure;
  const maxStratExp = policy.maxStrategyExposure ?? 25000;
  const check3Passed = projectedStratExposure <= maxStratExp;
  checks.push({
    name: 'Maximum Strategy Exposure',
    passed: check3Passed,
    value: `$${projectedStratExposure.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    threshold: `≤ $${maxStratExp.toLocaleString()}`,
    description: 'Guarantees no single automated EA or strategy consumes more than its authorized allocation.'
  });

  // Check 4: Maximum Daily Loss
  const maxDailyLoss = policy.maxDailyLoss ?? 1000;
  const check4Passed = env.currentDailyLoss < maxDailyLoss;
  checks.push({
    name: 'Maximum Daily Loss',
    passed: check4Passed,
    value: `$${env.currentDailyLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    threshold: `< $${maxDailyLoss.toLocaleString()}`,
    description: 'Monitors combined realized and floating losses for the trading day, halting execution if the loss limit is hit.'
  });

  // Check 5: Maximum Drawdown
  const check5Passed = env.currentDailyDrawdownPct < policy.maxDailyDrawdownPct;
  checks.push({
    name: 'Maximum Daily Drawdown',
    passed: check5Passed,
    value: `${env.currentDailyDrawdownPct.toFixed(2)}%`,
    threshold: `< ${policy.maxDailyDrawdownPct.toFixed(2)}%`,
    description: 'Monitors the maximum peak-to-trough account drawdown for the current session to protect core capital.'
  });

  // Check 6: Maximum Number of Open Positions
  const check6Passed = env.openPositionsCount < policy.maxOpenPositions;
  checks.push({
    name: 'Maximum Open Positions',
    passed: check6Passed,
    value: `${env.openPositionsCount} Positions`,
    threshold: `< ${policy.maxOpenPositions} Positions`,
    description: 'Caps total simultaneous open entries to limit broker API message overload and system exposure.'
  });

  // Check 7: Maximum Correlated Exposure
  const assetClass = getAssetClass(order.symbol);
  const currentCorrExposure = env.correlatedExposure[assetClass] || 0;
  const projectedCorrExposure = currentCorrExposure + orderExposure;
  const check7Passed = projectedCorrExposure <= policy.maxCorrelatedExposure;
  checks.push({
    name: 'Maximum Correlated Exposure',
    passed: check7Passed,
    value: `$${projectedCorrExposure.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${assetClass})`,
    threshold: `≤ $${policy.maxCorrelatedExposure.toLocaleString()}`,
    description: 'Group exposure by asset subclass (Forex, Metals, Crypto) to block over-concentration in highly correlated instruments.'
  });

  // Check 8: Margin Availability
  const check8Passed = env.marginRatio >= policy.minMarginAvailable;
  checks.push({
    name: 'Margin Availability',
    passed: check8Passed,
    value: `${env.marginRatio.toFixed(1)}% Free`,
    threshold: `≥ ${policy.minMarginAvailable.toFixed(1)}% Free`,
    description: 'Ensures the account maintains a sufficient free margin buffer, protecting positions from margin-call triggers.'
  });

  // Check 9: Spread Threshold
  const check9Passed = env.spreadPips <= policy.maxSpreadPips;
  checks.push({
    name: 'Spread Threshold',
    passed: check9Passed,
    value: `${env.spreadPips.toFixed(1)} Pips`,
    threshold: `≤ ${policy.maxSpreadPips.toFixed(1)} Pips`,
    description: 'Locks order entry during times of extreme liquidity drain or news releases with excessive spreads.'
  });

  // Check 10: Slippage Threshold
  const check10Passed = env.expectedSlippagePips <= policy.maxSlippagePips;
  checks.push({
    name: 'Slippage Threshold',
    passed: check10Passed,
    value: `${env.expectedSlippagePips.toFixed(1)} Pips`,
    threshold: `≤ ${policy.maxSlippagePips.toFixed(1)} Pips`,
    description: 'Validates expected slippage based on volatility, rejecting entries when cost of execution is unacceptable.'
  });

  // Check 11: Market-Data Freshness
  const marketDataAge = Date.now() - new Date(env.marketDataTimestamp).getTime();
  const check11Passed = marketDataAge <= policy.maxMarketDataAgeMs;
  checks.push({
    name: 'Market-Data Freshness',
    passed: check11Passed,
    value: `${marketDataAge} ms`,
    threshold: `≤ ${policy.maxMarketDataAgeMs} ms`,
    description: 'Blocks routing if the live pricing feed is stale, preventing execution on legacy prices.'
  });

  // Check 12: Trading Session Restrictions
  const check12Passed = policy.allowedTradingSessions.includes(env.currentTradingSession);
  checks.push({
    name: 'Trading Session Restrictions',
    passed: check12Passed,
    value: env.currentTradingSession,
    threshold: `In [${policy.allowedTradingSessions.join(', ')}]`,
    description: 'Ensures trading occurs within approved session hours (e.g., London/New York overlap).'
  });

  // Check 13: Symbol Restrictions
  const check13Passed = !policy.restrictedSymbols.includes(order.symbol.toUpperCase());
  checks.push({
    name: 'Symbol Restrictions',
    passed: check13Passed,
    value: order.symbol,
    threshold: `Not In [${policy.restrictedSymbols.join(', ')}]`,
    description: 'Enforces manual or risk-based symbol blocks on speculative, toxic, or low-liquidity assets.'
  });

  // Check 14: Strategy Status
  const check14Passed = policy.allowedStrategies.includes(order.strategyId);
  checks.push({
    name: 'Strategy Status',
    passed: check14Passed,
    value: `ID: ${order.strategyId}`,
    threshold: 'Approved List',
    description: 'Validates that the source EA has been registered, audited, and holds execution clearance.'
  });

  // Check 15: Account Status
  const check15Passed = env.accountStatus === policy.accountStatus;
  checks.push({
    name: 'Account Status',
    passed: check15Passed,
    value: env.accountStatus,
    threshold: policy.accountStatus,
    description: 'Verifies the administrative status of the trader account is active and in good standing.'
  });

  // Check 16: Broker Status
  const check16Passed = env.brokerStatus === policy.requiredBrokerStatus;
  checks.push({
    name: 'Broker Status',
    passed: check16Passed,
    value: env.brokerStatus,
    threshold: policy.requiredBrokerStatus,
    description: 'Confirms connection health to the broker gateway is live and responding to heartbeats.'
  });

  // Check 17: Duplicate-Order Detection
  const orderSig = `${order.strategyId}-${order.symbol}-${order.direction}-${order.volume}`;
  const lastOrderTime = env.lastOrderTimestamps[orderSig];
  let duplicateInterval = Infinity;
  if (lastOrderTime) {
    duplicateInterval = Date.now() - new Date(lastOrderTime).getTime();
  }
  const check17Passed = duplicateInterval > policy.minOrderIntervalMs;
  checks.push({
    name: 'Duplicate-Order Detection',
    passed: check17Passed,
    value: lastOrderTime ? `${duplicateInterval} ms` : 'No Prev Order',
    threshold: `> ${policy.minOrderIntervalMs} ms`,
    description: 'Fails repetitive orders within milliseconds to prevent looping bugs from exhausting margin.'
  });

  // Check 18: Order Frequency Limits
  const check18Passed = env.ordersInLastMinuteCount < policy.maxOrdersPerMinute;
  checks.push({
    name: 'Order Frequency Limits',
    passed: check18Passed,
    value: `${env.ordersInLastMinuteCount} Orders/Min`,
    threshold: `< ${policy.maxOrdersPerMinute} Orders/Min`,
    description: 'Restricts total orders processed per minute to throttle potential infinite loop algorithmic storms.'
  });

  // Check 19: Circuit Breakers
  const check19Passed = !policy.circuitBreakerActive;
  checks.push({
    name: 'Global Circuit Breakers',
    passed: check19Passed,
    value: policy.circuitBreakerActive ? 'TRIGGERED' : 'ARMED & HEALTHY',
    threshold: 'ARMED & HEALTHY',
    description: 'Allows instantaneous manual or automated global shutdown of all trading pipelines during major stress.'
  });

  // Decide status
  const failedChecks = checks.filter(c => !c.passed);
  const failedCheck = failedChecks[0];
  const reasonsList = failedChecks.map(c => `${c.name} check failed: Current value is ${c.value} (Allowed limit: ${c.threshold}).`);

  if (failedCheck) {
    return {
      status: 'REJECTED',
      isApproved: false,
      reasons: reasonsList,
      reason: reasonsList[0],
      rule: failedCheck.name.toUpperCase().replace(/\s+/g, '_'),
      timestamp: timestampIso,
      strategy: order.strategyName || 'Manual',
      symbol: order.symbol || 'N/A',
      orderId: order.id || 'ord-01',
      checks
    };
  }

  return {
    status: 'APPROVED',
    isApproved: true,
    reasons: [],
    reason: 'Within configured exposure, daily drawdown, frequency, and safety limits.',
    rule: 'ALL_RULES_PASSED',
    timestamp: timestampIso,
    strategy: order.strategyName || 'Manual',
    symbol: order.symbol || 'N/A',
    orderId: order.id || 'ord-01',
    checks
  };
}
