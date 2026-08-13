/**
 * AppexQuant Markets Global - Automation Control Center Types
 * Comprehensive data models for system status, active strategies, event streams,
 * 14-step market event decision chains, and 8-stage strategy activation workflows.
 */

export type SystemAutomationStatus = 'RUNNING' | 'PAUSED' | 'STOPPED' | 'EMERGENCY_HALTED';

export type StrategyExecutionMode = 'FULL_AUTO' | 'SEMI_AUTO' | 'SIGNAL_ONLY' | 'PAPER_TRADING';

export type StrategyStatus = 'ACTIVE' | 'PAUSED' | 'SIGNALING' | 'HALTED' | 'COOLING_DOWN';

export type RiskCheckStatus = 'PASSED' | 'WARNING' | 'EXPOSURE_CAP' | 'DRAWDOWN_GUARD';

export interface ActiveStrategy {
  id: string;
  strategy: string;
  symbol: string;
  timeframe: string;
  mode: StrategyExecutionMode;
  lastSignal: {
    type: 'BUY' | 'SELL' | 'NEUTRAL';
    price: number;
    timestamp: string;
    timeAgo: string;
  };
  riskStatus: RiskCheckStatus;
  riskStatusDetail: string;
  ordersToday: number;
  pnlUsd: number;
  status: StrategyStatus;
  winRatePct: number;
  description: string;
  activationWorkflowCompleted?: boolean;
  activationTimestamp?: string;
}

/**
 * The 14 sequential market event execution steps. No step may be bypassed.
 */
export type MarketEventStepType =
  | 'CHECK_MARKET_DATA_QUALITY'   // Step 1
  | 'CHECK_MARKET_SESSION'        // Step 2
  | 'EVALUATE_STRATEGY'           // Step 3
  | 'GENERATE_CANDIDATE_SIGNAL'   // Step 4
  | 'VALIDATE_SIGNAL'             // Step 5
  | 'CALCULATE_POSITION_SIZE'     // Step 6
  | 'RUN_RISK_ENGINE'             // Step 7
  | 'CREATE_ORDER_REQUEST'        // Step 8
  | 'EXECUTE_BROKER_ADAPTER'      // Step 9
  | 'TRACK_EXECUTION'             // Step 10
  | 'UPDATE_POSITION'             // Step 11
  | 'JOURNAL_TRADE'               // Step 12
  | 'UPDATE_ANALYTICS'            // Step 13
  | 'GENERATE_ALERT'              // Step 14
  // Legacy alias types
  | 'MARKET_DATA_RECEIVED'
  | 'STRATEGY_EVALUATED'
  | 'CONDITION_MATCHED'
  | 'SIGNAL_GENERATED'
  | 'RISK_CHECK_APPROVED'
  | 'ORDER_SUBMITTED'
  | 'ORDER_FILLED'
  | 'POSITION_UPDATED';

export interface Step1DataQualityDetails {
  tickPrice: number;
  bid: number;
  ask: number;
  spreadPips: number;
  tickVolume: number;
  feedGateway: string;
  socketLatencyMs: number;
  qualityScorePct: number;
  isStale: boolean;
  gapDetected: boolean;
}

export interface Step2MarketSessionDetails {
  marketName: string;
  sessionState: 'OPEN' | 'PRE_MARKET' | 'POST_MARKET' | 'CLOSED';
  exchangeTimeZone: string;
  isHoliday: boolean;
  spreadExpansionWindow: boolean;
  highImpactNewsInMinutes: number | null;
}

export interface IndicatorEvaluationDetail {
  indicator: string;
  calculatedValue: string;
  threshold: string;
  status: 'MET' | 'NOT_MET' | 'NEUTRAL';
}

export interface Step3EvaluateStrategyDetails {
  strategyName: string;
  indicators: IndicatorEvaluationDetail[];
  evaluationTimeMs: number;
  timeframe: string;
}

export interface Step4CandidateSignalDetails {
  rawDirection: 'BUY' | 'SELL' | 'NEUTRAL';
  entryPrice: number;
  suggestedSl: number;
  suggestedTp: number;
  confidenceScorePct: number;
  signalSourceRule: string;
}

export interface Step5ValidateSignalDetails {
  isValid: boolean;
  ttlSeconds: number;
  noiseFilterPassed: boolean;
  multiTimeframeAlignment: boolean;
  contradictoryCorrelationCheck: boolean;
  validationNotes: string;
}

export interface Step6PositionSizeDetails {
  calculatedLots: number;
  sizingMethod: 'ATR_VOLATILITY' | 'KELLY_CRITERION' | 'FIXED_PERCENT_RISK' | 'MAX_MARGIN';
  riskAmountUsd: number;
  accountEquityUsd: number;
  stopLossDistancePips: number;
}

export interface Step7RiskEngineDetails {
  dailyDrawdownCheck: { currentPct: number; maxPct: number; passed: boolean };
  accountMarginCheck: { availableMarginUsd: number; requiredMarginUsd: number; passed: boolean };
  maxExposureCheck: { currentExposureUsd: number; maxExposureUsd: number; passed: boolean };
  openPositionsCheck: { currentCount: number; maxAllowed: number; passed: boolean };
  overallRiskPassed: boolean;
  approvalToken: string;
}

export interface Step8OrderRequestDetails {
  orderTicket: string;
  orderType: 'MARKET_BUY' | 'MARKET_SELL' | 'LIMIT_BUY' | 'LIMIT_SELL';
  volumeLots: number;
  brokerGateway: string;
  idempotencyKey: string;
  dispatchLatencyMs: number;
}

export interface Step9BrokerAdapterDetails {
  protocol: 'FIX_4_4' | 'MT5_REST' | 'WEBSOCKET_L2';
  brokerEndpoint: string;
  rawPayload: string;
  transmissionLatencyMs: number;
}

export interface Step10TrackExecutionDetails {
  executionPrice: number;
  requestedPrice: number;
  slippagePips: number;
  mt5TicketNumber: string;
  fillLatencyMs: number;
  commissionUsd: number;
  fillStatus: 'FILLED_FULL' | 'PARTIAL_FILL' | 'REJECTED';
}

export interface Step11UpdatePositionDetails {
  positionId: string;
  accountEquityUsd: number;
  marginOccupiedUsd: number;
  stopLossRegistered: boolean;
  takeProfitRegistered: boolean;
  trailingStopAttached: string;
}

export interface Step12JournalTradeDetails {
  journalId: string;
  timestampIso: string;
  setupTags: string[];
  rationaleSummary: string;
  snapshotChartUri: string;
}

export interface Step13UpdateAnalyticsDetails {
  updatedWinRatePct: number;
  dailyPnlDeltaUsd: number;
  rollingSharpeRatio: number;
  currentDrawdownPct: number;
  updatedEquityUsd: number;
}

export interface Step14GenerateAlertDetails {
  alertId: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  channelsNotified: string[]; // e.g. ["WebSocket UI", "Audio Chime", "App Push"]
  alertMessage: string;
  dispatchTimestamp: string;
}

export interface DecisionChainStep {
  stepNumber: number; // 1 to 14
  stepType: MarketEventStepType;
  label: string; // e.g. "Step 1/14: Check Market Data Quality"
  timeString: string; // e.g. "17:32:01.102"
  timestampIso: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
  summaryMessage: string;
  details: Record<string, any>;
}

export interface TradeDecisionChain {
  tradeId: string;
  strategyId: string;
  strategyName: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  timestamp: string;
  displayTime: string;
  totalExecutionMs: number;
  overallStatus: 'EXECUTED' | 'REJECTED_RISK' | 'SLIPPAGE_CANCEL' | 'EVALUATING';
  volumeLots: number;
  entryPrice: number;
  realizedPnlUsd?: number;
  steps: DecisionChainStep[];
}

export interface AutomationStreamEvent {
  id: string;
  tradeId: string;
  strategyId: string;
  strategyName: string;
  symbol: string;
  timeString: string;
  timestampIso: string;
  stepNumber: number;
  stepType: MarketEventStepType;
  text: string;
  tradeChain: TradeDecisionChain;
}

/**
 * Complete Strategy Activation Workflow Types (8 Stages)
 * USER CREATES STRATEGY -> VALIDATE -> BACKTEST -> REVIEW METRICS ->
 * PAPER TEST -> RISK CONFIGURATION -> USER APPROVAL -> ENABLE AUTOMATION
 */

export type ActivationStage =
  | 'CREATE'
  | 'VALIDATE'
  | 'BACKTEST'
  | 'REVIEW_METRICS'
  | 'PAPER_TEST'
  | 'RISK_CONFIG'
  | 'USER_APPROVAL'
  | 'ACTIVATED';

export interface StrategyCreationData {
  name: string;
  symbol: string;
  timeframe: string;
  mode: StrategyExecutionMode;
  description: string;
  indicatorRules: string[];
}

export interface StrategyValidationResult {
  isValid: boolean;
  syntaxCheckPassed: boolean;
  slTpCheckPassed: boolean;
  logicConsistencyPassed: boolean;
  overfittingWarning: boolean;
  validationNotes: string[];
}

export interface BacktestMetricsResult {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRatePct: number;
  netProfitUsd: number;
  profitFactor: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  expectancyUsd: number;
  equityCurvePoints: { trade: number; equity: number }[];
}

export interface PaperTestLogResult {
  simulatedTicksCount: number;
  avgOrderLatencyMs: number;
  slippageDistributionPips: number;
  feedConnectionStabilityPct: number;
  paperTestPassed: boolean;
}

export interface StrategyRiskConfig {
  maxPositionLots: number;
  maxDailyDrawdownPct: number;
  maxDailyLossUsd: number;
  stopLossPips: number;
  takeProfitPips: number;
  trailingStopPips: number;
  maxConcurrentPositions: number;
}

export interface StrategyUserApproval {
  acceptedRiskDisclaimer: boolean;
  userSignature: string;
  approvalTimestamp: string;
  approvalIpAddress: string;
}

export interface StrategyActivationPipeline {
  id: string;
  stage: ActivationStage;
  creation: StrategyCreationData;
  validation?: StrategyValidationResult;
  backtest?: BacktestMetricsResult;
  paperTest?: PaperTestLogResult;
  riskConfig?: StrategyRiskConfig;
  approval?: StrategyUserApproval;
  activatedAt?: string;
}

