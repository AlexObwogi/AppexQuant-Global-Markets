/**
 * AppexQuant Markets Global - Centralized Automation Orchestrator Engine
 * Handles full 15-stage pipeline flow, automation states, safe execution retries,
 * idempotency checks, and the critical multi-system database reconciliation process.
 */

export type AutomationState =
  | 'STOPPED'
  | 'STARTING'
  | 'RUNNING'
  | 'PAUSED'
  | 'RISK_HALT'
  | 'DATA_HALT'
  | 'BROKER_HALT'
  | 'ERROR'
  | 'EMERGENCY_STOP';

export type PipelineStage =
  | 'MARKET_DATA'
  | 'MARKET_REGIME_ENGINE'
  | 'STRATEGY_ENGINE'
  | 'SIGNAL_GENERATOR'
  | 'SIGNAL_VALIDATOR'
  | 'RISK_ENGINE'
  | 'ORDER_BUILDER'
  | 'EXECUTION_ENGINE'
  | 'BROKER_ADAPTER'
  | 'ORDER_STATUS'
  | 'POSITION_MONITOR'
  | 'RISK_MONITOR'
  | 'JOURNAL'
  | 'ANALYTICS'
  | 'ALERT_ENGINE';

export interface PipelineStageInfo {
  stage: PipelineStage;
  name: string;
  status: 'IDLE' | 'ACTIVE' | 'PASSED' | 'FAILED' | 'BYPASSED';
  lastExecuted: string;
  durationMs: number;
  message: string;
}

export interface ExecutionRequest {
  id: string;
  timestamp: string;
  strategyId: string;
  symbol: string;
  direction: 'BUY' | 'SHORT';
  volume: number;
  price: number;
  state: 'INITIATED' | 'PIPELINE_RUNNING' | 'APPROVED' | 'BROKER_SUBMITTED' | 'RECONCILED_SUCCESS' | 'REJECTED' | 'FAILED_RETRY';
  outcomeMessage: string;
  retries: number;
  maxRetries: number;
  idempotencyKey: string;
}

export interface ReconciledRecord {
  symbol: string;
  brokerVolume: number;
  internalVolume: number;
  brokerAvgPrice: number;
  internalAvgPrice: number;
  status: 'MATCHED' | 'DISCREPANCY_VOLUME' | 'DISCREPANCY_PRICE' | 'BROKER_ONLY' | 'INTERNAL_ONLY';
  resolutionAction: string;
}

export interface ReconciledOrderRecord {
  orderId: string;
  symbol: string;
  brokerStatus: string;
  internalStatus: string;
  status: 'MATCHED' | 'DISCREPANCY_STATUS' | 'BROKER_ONLY' | 'INTERNAL_ONLY';
  resolutionAction: string;
}

export interface ReconciliationSummary {
  reconciled: boolean;
  timestamp: string;
  totalPositionsReconciled: number;
  discrepanciesFound: number;
  discrepanciesResolved: number;
  positionLogs: ReconciledRecord[];
  orderLogs: ReconciledOrderRecord[];
  auditLogs: string[];
}

export interface OrchestratorSettings {
  idempotencyWindowMs: number;
  staleMarketDataThresholdMs: number;
  maxBrokerRetryAttempts: number;
  backoffFactorMs: number;
  autoReconciliationOnStart: boolean;
  simulationModeActive: boolean;
  simulatedBrokerFailure: boolean;
  simulatedStaleData: boolean;
  simulatedRiskBreach: boolean;
}

// 1. Initial State Definition
export let orchestratorState: AutomationState = 'STOPPED';
export let lastPipelineRunTimestamp = '';
export let totalRunsCounter = 0;
export let isReconciled = false;

// 2. Settings Config
export let settings: OrchestratorSettings = {
  idempotencyWindowMs: 5000,
  staleMarketDataThresholdMs: 10000,
  maxBrokerRetryAttempts: 3,
  backoffFactorMs: 1000,
  autoReconciliationOnStart: true,
  simulationModeActive: true,
  simulatedBrokerFailure: false,
  simulatedStaleData: false,
  simulatedRiskBreach: false,
};

// 3. Central Execution Requests Log (Idempotency Tracking Database)
export const executionRequests: ExecutionRequest[] = [];

// 4. Default 15-Stage Pipeline Information
export let pipelineStages: PipelineStageInfo[] = [
  { stage: 'MARKET_DATA', name: 'Market Data Feed', status: 'IDLE', lastExecuted: '', durationMs: 0, message: 'Ready' },
  { stage: 'MARKET_REGIME_ENGINE', name: 'Regime Engine', status: 'IDLE', lastExecuted: '', durationMs: 0, message: 'Ready' },
  { stage: 'STRATEGY_ENGINE', name: 'Strategy Allocator', status: 'IDLE', lastExecuted: '', durationMs: 0, message: 'Ready' },
  { stage: 'SIGNAL_GENERATOR', name: 'Signal Generator', status: 'IDLE', lastExecuted: '', durationMs: 0, message: 'Ready' },
  { stage: 'SIGNAL_VALIDATOR', name: 'Confidence Filter', status: 'IDLE', lastExecuted: '', durationMs: 0, message: 'Ready' },
  { stage: 'RISK_ENGINE', name: 'Pre-Trade Risk Gateway', status: 'IDLE', lastExecuted: '', durationMs: 0, message: 'Ready' },
  { stage: 'ORDER_BUILDER', name: 'Slippage-Adjusted Builder', status: 'IDLE', lastExecuted: '', durationMs: 0, message: 'Ready' },
  { stage: 'EXECUTION_ENGINE', name: 'Smart Routing Router', status: 'IDLE', lastExecuted: '', durationMs: 0, message: 'Ready' },
  { stage: 'BROKER_ADAPTER', name: 'Broker Adapter Gateway', status: 'IDLE', lastExecuted: '', durationMs: 0, message: 'Ready' },
  { stage: 'ORDER_STATUS', name: 'Execution Status Monitor', status: 'IDLE', lastExecuted: '', durationMs: 0, message: 'Ready' },
  { stage: 'POSITION_MONITOR', name: 'Net Positions Tracker', status: 'IDLE', lastExecuted: '', durationMs: 0, message: 'Ready' },
  { stage: 'RISK_MONITOR', name: 'Post-Trade Exposure Desk', status: 'IDLE', lastExecuted: '', durationMs: 0, message: 'Ready' },
  { stage: 'JOURNAL', name: 'Persistent Audits Journal', status: 'IDLE', lastExecuted: '', durationMs: 0, message: 'Ready' },
  { stage: 'ANALYTICS', name: 'Dynamic Performance Desk', status: 'IDLE', lastExecuted: '', durationMs: 0, message: 'Ready' },
  { stage: 'ALERT_ENGINE', name: 'Push & Telegram Alerts', status: 'IDLE', lastExecuted: '', durationMs: 0, message: 'Ready' },
];

// 5. Multi-System Out-Of-Sync Data (Ground-truth Broker vs Stale Internal Database)
export let brokerPositions: Record<string, { volume: number; price: number }> = {
  'EURUSD': { volume: 2.5, price: 1.08450 },
  'GBPUSD': { volume: 1.0, price: 1.27210 },
  'XAUUSD': { volume: 0.5, price: 2420.50 },
};

export let internalPositions: Record<string, { volume: number; price: number }> = {
  'EURUSD': { volume: 1.5, price: 1.08420 }, // Size discrepancy
  'GBPUSD': { volume: 1.0, price: 1.27210 }, // Matches
  // XAUUSD missing internally (internal database lag)
};

export let brokerOrders: Record<string, { symbol: string; status: string }> = {
  'ord-reconcile-01': { symbol: 'EURUSD', status: 'FILLED' },
  'ord-reconcile-02': { symbol: 'GBPUSD', status: 'FILLED' },
  'ord-reconcile-03': { symbol: 'XAUUSD', status: 'CANCELLED' },
};

export let internalOrders: Record<string, { symbol: string; status: string }> = {
  'ord-reconcile-01': { symbol: 'EURUSD', status: 'PENDING' }, // Discrepancy
  'ord-reconcile-02': { symbol: 'GBPUSD', status: 'FILLED' }, // Matches
  // order 3 missing internally
};

export let activeReconciliation: ReconciliationSummary = {
  reconciled: false,
  timestamp: '',
  totalPositionsReconciled: 0,
  discrepanciesFound: 3,
  discrepanciesResolved: 0,
  positionLogs: [],
  orderLogs: [],
  auditLogs: ['System initialization. Database integrity unverified. Reconciliation REQUIRED.'],
};

// --- Actions & Orchestration Core Logic ---

// Get complete orchestrator dashboard state
export function getOrchestratorDashboard() {
  return {
    state: orchestratorState,
    stages: pipelineStages,
    requests: executionRequests,
    reconciliation: activeReconciliation,
    settings,
    totalRuns: totalRunsCounter,
    lastRun: lastPipelineRunTimestamp,
    isReconciled
  };
}

// Reset or trigger data drifts to demonstrate the reconciliation engine
export function triggerDrifts() {
  brokerPositions = {
    'EURUSD': { volume: 2.50, price: 1.08450 },
    'GBPUSD': { volume: 1.00, price: 1.27210 },
    'XAUUSD': { volume: 0.50, price: 2420.50 },
    'BTCUSD': { volume: 0.10, price: 58400.00 },
  };

  internalPositions = {
    'EURUSD': { volume: 1.50, price: 1.08420 }, // discrepancy
    'GBPUSD': { volume: 1.00, price: 1.27210 }, // match
    'BTCUSD': { volume: 0.00, price: 0.00 },     // internal thinks closed
    // XAUUSD is missing internally
  };

  brokerOrders = {
    'ord-reconcile-01': { symbol: 'EURUSD', status: 'FILLED' },
    'ord-reconcile-02': { symbol: 'GBPUSD', status: 'FILLED' },
    'ord-reconcile-03': { symbol: 'XAUUSD', status: 'FILLED' },
    'ord-reconcile-04': { symbol: 'BTCUSD', status: 'CANCELLED' },
  };

  internalOrders = {
    'ord-reconcile-01': { symbol: 'EURUSD', status: 'PENDING' }, // discrepancy
    'ord-reconcile-02': { symbol: 'GBPUSD', status: 'FILLED' },  // match
    'ord-reconcile-04': { symbol: 'BTCUSD', status: 'PENDING' }, // discrepancy
    // order 03 missing
  };

  isReconciled = false;
  activeReconciliation = {
    reconciled: false,
    timestamp: new Date().toISOString(),
    totalPositionsReconciled: 0,
    discrepanciesFound: 4,
    discrepanciesResolved: 0,
    positionLogs: [],
    orderLogs: [],
    auditLogs: [
      '⚠️ Alert: Manual DB Drift injected.',
      'Ground-truth broker mismatch detected in EURUSD, XAUUSD, and BTCUSD.',
      'Pre-trade automation locked until reconciliation process is triggered.'
    ]
  };

  if (orchestratorState === 'RUNNING') {
    orchestratorState = 'PAUSED';
    activeReconciliation.auditLogs.push('🛑 Automation PAUSED due to unresolved database drift.');
  }

  return getOrchestratorDashboard();
}

// Reconcile multi-system database (Ground truth broker syncing)
export function runReconciliationProcess(): ReconciliationSummary {
  const auditLogs: string[] = [];
  const positionLogs: ReconciledRecord[] = [];
  const orderLogs: ReconciledOrderRecord[] = [];

  auditLogs.push(`🔄 Initiating multi-system reconciliation at ${new Date().toISOString()}`);
  auditLogs.push('Fetching live broker positions (Ground-Truth API)...');
  auditLogs.push('Fetching internal SQLite/Firestore databases...');

  let discrepanciesResolved = 0;

  // Reconcile Positions
  const allSymbols = Array.from(new Set([...Object.keys(brokerPositions), ...Object.keys(internalPositions)]));
  for (const sym of allSymbols) {
    const broker = brokerPositions[sym];
    const internal = internalPositions[sym];

    if (broker && !internal) {
      positionLogs.push({
        symbol: sym,
        brokerVolume: broker.volume,
        internalVolume: 0,
        brokerAvgPrice: broker.price,
        internalAvgPrice: 0,
        status: 'BROKER_ONLY',
        resolutionAction: `Sync: Injected position ${sym} into internal database. Vol = ${broker.volume} Lots.`
      });
      auditLogs.push(`Mismatch: Position ${sym} exists only on broker. Syncing ground truth.`);
      // Sync internal
      internalPositions[sym] = { ...broker };
      discrepanciesResolved++;
    } else if (!broker && internal && internal.volume > 0) {
      positionLogs.push({
        symbol: sym,
        brokerVolume: 0,
        internalVolume: internal.volume,
        brokerAvgPrice: 0,
        internalAvgPrice: internal.price,
        status: 'INTERNAL_ONLY',
        resolutionAction: `Sync: Removed rogue position ${sym} from internal database to match broker.`
      });
      auditLogs.push(`Mismatch: Internal records think ${sym} is active, but broker has 0. Discarding rogue record.`);
      delete internalPositions[sym];
      discrepanciesResolved++;
    } else if (broker && internal) {
      if (Math.abs(broker.volume - internal.volume) > 0.0001) {
        positionLogs.push({
          symbol: sym,
          brokerVolume: broker.volume,
          internalVolume: internal.volume,
          brokerAvgPrice: broker.price,
          internalAvgPrice: internal.price,
          status: 'DISCREPANCY_VOLUME',
          resolutionAction: `Sync: Adjusted internal position volume for ${sym} from ${internal.volume} to ${broker.volume}.`
        });
        auditLogs.push(`Mismatch: Size drift on ${sym}. Broker=${broker.volume}, Internal=${internal.volume}. Overwriting with broker truth.`);
        internalPositions[sym].volume = broker.volume;
        internalPositions[sym].price = broker.price;
        discrepanciesResolved++;
      } else {
        positionLogs.push({
          symbol: sym,
          brokerVolume: broker.volume,
          internalVolume: internal.volume,
          brokerAvgPrice: broker.price,
          internalAvgPrice: internal.price,
          status: 'MATCHED',
          resolutionAction: 'No action. Database integrity verified.'
        });
      }
    }
  }

  // Reconcile Orders
  const allOrderIds = Array.from(new Set([...Object.keys(brokerOrders), ...Object.keys(internalOrders)]));
  for (const id of allOrderIds) {
    const broker = brokerOrders[id];
    const internal = internalOrders[id];

    if (broker && !internal) {
      orderLogs.push({
        orderId: id,
        symbol: broker.symbol,
        brokerStatus: broker.status,
        internalStatus: 'MISSING',
        status: 'BROKER_ONLY',
        resolutionAction: `Sync: Created order ${id} internally with status ${broker.status}.`
      });
      auditLogs.push(`Mismatch: Order ${id} is missing internally. Syncing.`);
      internalOrders[id] = { ...broker };
      discrepanciesResolved++;
    } else if (!broker && internal) {
      orderLogs.push({
        orderId: id,
        symbol: internal.symbol,
        brokerStatus: 'NONE',
        internalStatus: internal.status,
        status: 'INTERNAL_ONLY',
        resolutionAction: `Sync: Pruned stale internal order ${id} that does not exist at broker.`
      });
      auditLogs.push(`Mismatch: Internal order ${id} not found on broker. Pruning.`);
      delete internalOrders[id];
      discrepanciesResolved++;
    } else if (broker && internal) {
      if (broker.status !== internal.status) {
        orderLogs.push({
          orderId: id,
          symbol: broker.symbol,
          brokerStatus: broker.status,
          internalStatus: internal.status,
          status: 'DISCREPANCY_STATUS',
          resolutionAction: `Sync: Upgraded internal order status for ${id} from ${internal.status} to ${broker.status}.`
        });
        auditLogs.push(`Mismatch: Order status drift on ${id}. Broker is ${broker.status}, internal was ${internal.status}. Syncing.`);
        internalOrders[id].status = broker.status;
        discrepanciesResolved++;
      } else {
        orderLogs.push({
          orderId: id,
          symbol: broker.symbol,
          brokerStatus: broker.status,
          internalStatus: internal.status,
          status: 'MATCHED',
          resolutionAction: 'No action. States are fully aligned.'
        });
      }
    }
  }

  auditLogs.push(`✅ Multi-system alignment completed successfully!`);
  auditLogs.push(`Total resolved anomalies: ${discrepanciesResolved}.`);
  auditLogs.push(`Orchestrator pre-trade authorization lock: RELEASED.`);

  isReconciled = true;
  activeReconciliation = {
    reconciled: true,
    timestamp: new Date().toISOString(),
    totalPositionsReconciled: Object.keys(brokerPositions).length,
    discrepanciesFound: discrepanciesResolved,
    discrepanciesResolved,
    positionLogs,
    orderLogs,
    auditLogs
  };

  return activeReconciliation;
}

// 6. Update Orchestrator Control Settings
export function updateOrchestratorSettings(newSettings: Partial<OrchestratorSettings>) {
  settings = {
    ...settings,
    ...newSettings,
  };
  return settings;
}

// 7. Toggle Orchestrator State
export function setOrchestratorState(newState: AutomationState) {
  // If moving from STOPPED to STARTING/RUNNING and autoReconciliationOnStart is active
  if ((newState === 'STARTING' || newState === 'RUNNING') && !isReconciled && settings.autoReconciliationOnStart) {
    runReconciliationProcess();
  }

  orchestratorState = newState;
  return orchestratorState;
}

// 8. Execute Single Automated Pipeline Loop Cycle
export async function runPipelineIteration(customOrder?: any): Promise<{
  success: boolean;
  message: string;
  stages: PipelineStageInfo[];
  decision: any;
}> {
  if (orchestratorState === 'STOPPED' || orchestratorState === 'PAUSED' || orchestratorState === 'EMERGENCY_STOP') {
    return {
      success: false,
      message: `Orchestrator is currently in ${orchestratorState} state. Cannot run pipeline loop.`,
      stages: pipelineStages,
      decision: null
    };
  }

  // Check 1: Enforce Reconciliation Check
  if (!isReconciled) {
    orchestratorState = 'ERROR';
    pipelineStages = pipelineStages.map(s => ({ ...s, status: 'FAILED', message: 'Reconciliation locked' }));
    return {
      success: false,
      message: 'CRITICAL SECURITY BLOCK: System databases are out of sync with Broker adapter. Reconciliation is mandatory.',
      stages: pipelineStages,
      decision: null
    };
  }

  // Check 2: Check simulated Outages
  if (settings.simulatedStaleData) {
    orchestratorState = 'DATA_HALT';
    pipelineStages = pipelineStages.map((s, idx) => {
      if (idx === 0) return { ...s, status: 'FAILED', message: 'Stale feed age > 15000ms' };
      return { ...s, status: 'IDLE', message: 'Halted due to data delay' };
    });
    return {
      success: false,
      message: 'DATA_HALT: Stale market-data detected. Engine has halted pipeline propagation safely.',
      stages: pipelineStages,
      decision: null
    };
  }

  if (settings.simulatedRiskBreach) {
    orchestratorState = 'RISK_HALT';
    pipelineStages = pipelineStages.map((s, idx) => {
      if (idx <= 5) return { ...s, status: idx === 5 ? 'FAILED' : 'PASSED', message: idx === 5 ? 'Daily loss limit hit!' : 'Check passed' };
      return { ...s, status: 'IDLE', message: 'Pipeline blocked by pre-trade risk' };
    });
    return {
      success: false,
      message: 'RISK_HALT: Daily loss limit exceeded. Circuit breaker tripped.',
      stages: pipelineStages,
      decision: null
    };
  }

  const startTime = Date.now();
  const simulatedOrder = customOrder || {
    id: `ord-auto-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
    strategyId: 'strat-ai-01',
    strategyName: 'Alpha-Pulse Gemini RL',
    symbol: 'EURUSD',
    direction: 'BUY',
    volume: 1.0,
    price: 1.08450,
  };

  // Prevent Duplicate Orders (Idempotency Engine)
  const orderIdempotencyKey = `${simulatedOrder.strategyId}-${simulatedOrder.symbol}-${simulatedOrder.direction}-${simulatedOrder.volume}`;
  const duplicate = executionRequests.find(r => 
    r.idempotencyKey === orderIdempotencyKey &&
    (Date.now() - new Date(r.timestamp).getTime()) < settings.idempotencyWindowMs
  );

  if (duplicate) {
    return {
      success: false,
      message: `IDEMPOTENCY DUPLICATE: Similar request processed ${Date.now() - new Date(duplicate.timestamp).getTime()}ms ago. Blocked duplicate entry.`,
      stages: pipelineStages,
      decision: null
    };
  }

  const executionRequest: ExecutionRequest = {
    id: simulatedOrder.id,
    timestamp: new Date().toISOString(),
    strategyId: simulatedOrder.strategyId,
    symbol: simulatedOrder.symbol,
    direction: simulatedOrder.direction,
    volume: simulatedOrder.volume,
    price: simulatedOrder.price,
    state: 'INITIATED',
    outcomeMessage: 'Processing pipeline stages...',
    retries: 0,
    maxRetries: settings.maxBrokerRetryAttempts,
    idempotencyKey: orderIdempotencyKey
  };

  executionRequests.unshift(executionRequest);
  if (executionRequests.length > 50) executionRequests.pop();

  totalRunsCounter++;
  lastPipelineRunTimestamp = new Date().toISOString();

  // Run through pipeline sequentially (Simulating ticks)
  let decision: any = null;
  const currentStages: PipelineStageInfo[] = JSON.parse(JSON.stringify(pipelineStages));

  try {
    // Stage 1: Market Data
    currentStages[0].status = 'ACTIVE';
    currentStages[0].message = 'Feeding ticks... OK';
    currentStages[0].durationMs = 12;
    currentStages[0].status = 'PASSED';

    // Stage 2: Regime
    currentStages[1].status = 'ACTIVE';
    currentStages[1].message = 'High-Volatility Bullish expansion detected';
    currentStages[1].durationMs = 22;
    currentStages[1].status = 'PASSED';

    // Stage 3: Strategy
    currentStages[2].status = 'ACTIVE';
    currentStages[2].message = 'Evaluating Neural networks parameters';
    currentStages[2].durationMs = 45;
    currentStages[2].status = 'PASSED';

    // Stage 4: Signal
    currentStages[3].status = 'ACTIVE';
    currentStages[3].message = `Signal BUY for ${simulatedOrder.symbol}`;
    currentStages[3].durationMs = 15;
    currentStages[3].status = 'PASSED';

    // Stage 5: Validator
    currentStages[4].status = 'ACTIVE';
    currentStages[4].message = 'Confidence index 88% - Validator Approved';
    currentStages[4].durationMs = 10;
    currentStages[4].status = 'PASSED';

    // Stage 6: Pre-Trade Risk Engine (Calls server-side evaluateRisk logic)
    currentStages[5].status = 'ACTIVE';
    const { evaluateRisk, activePolicy, defaultMarketEnvironment } = await import('../ai/riskEngine');
    decision = evaluateRisk({
      id: simulatedOrder.id,
      strategyId: simulatedOrder.strategyId,
      strategyName: 'Alpha-Pulse Gemini RL',
      symbol: simulatedOrder.symbol,
      type: 'MARKET',
      direction: simulatedOrder.direction,
      volume: simulatedOrder.volume,
      price: simulatedOrder.price,
      sl: simulatedOrder.price - 0.0020,
      tp: simulatedOrder.price + 0.0060,
      brokerId: 'EXNESS',
      timestamp: new Date().toISOString()
    }, activePolicy, {
      ...defaultMarketEnvironment,
      brokerStatus: settings.simulatedBrokerFailure ? 'DISCONNECTED' : 'CONNECTED'
    });

    currentStages[5].message = decision.status === 'APPROVED' ? 'Cleared' : 'REJECTED';
    currentStages[5].durationMs = 8;

    if (decision.status === 'REJECTED') {
      currentStages[5].status = 'FAILED';
      executionRequest.state = 'REJECTED';
      executionRequest.outcomeMessage = `Risk Gateway rejected entry: ${decision.reason}`;
      pipelineStages = currentStages;
      return { success: false, message: `Halted: Risk Check failed: ${decision.reason}`, stages: pipelineStages, decision };
    }
    currentStages[5].status = 'PASSED';
    executionRequest.state = 'APPROVED';

    // Stage 7: Order Builder
    currentStages[6].status = 'ACTIVE';
    currentStages[6].message = 'Built Slippage-adjusted limit order';
    currentStages[6].durationMs = 5;
    currentStages[6].status = 'PASSED';

    // Stage 8: Execution Router
    currentStages[7].status = 'ACTIVE';
    currentStages[7].message = 'Routing path Exness Liquidity Provider';
    currentStages[7].durationMs = 4;
    currentStages[7].status = 'PASSED';

    // Stage 9: Broker Adapter (Safe retry & backoff engine)
    currentStages[8].status = 'ACTIVE';
    let brokerConnectionSucceeded = !settings.simulatedBrokerFailure;
    
    if (!brokerConnectionSucceeded) {
      // Run Safe Retry with exponential backoff simulation
      let attempts = 1;
      let delay = settings.backoffFactorMs;
      auditLogsPush(`⚠️ Broker gateway disconnected. Starting safe retries up to ${settings.maxBrokerRetryAttempts}...`);
      
      while (attempts <= settings.maxBrokerRetryAttempts) {
        auditLogsPush(`Attempt ${attempts}/${settings.maxBrokerRetryAttempts} with backoff of ${delay}ms...`);
        // Simulate exponential backoff
        delay *= 2; 
        attempts++;
      }

      currentStages[8].status = 'FAILED';
      currentStages[8].message = 'Broker API Connection timeout after retries';
      executionRequest.state = 'FAILED_RETRY';
      executionRequest.outcomeMessage = `Broker transaction failed after ${settings.maxBrokerRetryAttempts} retries.`;
      orchestratorState = 'BROKER_HALT';
      pipelineStages = currentStages;
      return {
        success: false,
        message: 'BROKER_HALT: Broker connection drop after multiple safe retries.',
        stages: pipelineStages,
        decision
      };
    } else {
      currentStages[8].status = 'PASSED';
      currentStages[8].message = 'Execution transaction filled successfully on Broker';
      currentStages[8].durationMs = 230; // higher latency for broker roundtrip
      executionRequest.state = 'BROKER_SUBMITTED';
    }

    // Stage 10: Status Monitor
    currentStages[9].status = 'PASSED';
    currentStages[9].message = 'Filled at 1.08450 - Order Confirmed';
    currentStages[9].durationMs = 5;

    // Stage 11: Position Tracker
    currentStages[10].status = 'PASSED';
    currentStages[10].message = `EURUSD exposure raised to ${(2.5 + simulatedOrder.volume).toFixed(1)} lots`;
    // Update ground truth on successful run
    brokerPositions[simulatedOrder.symbol] = {
      volume: (brokerPositions[simulatedOrder.symbol]?.volume || 0) + simulatedOrder.volume,
      price: simulatedOrder.price
    };
    internalPositions[simulatedOrder.symbol] = { ...brokerPositions[simulatedOrder.symbol] };

    // Stage 12: Exposure Monitor
    currentStages[11].status = 'PASSED';
    currentStages[11].message = 'Risk within parameters';

    // Stage 13: Audits
    currentStages[12].status = 'PASSED';
    currentStages[12].message = 'Logged event to server SQLite audit logs';

    // Stage 14: Analytics
    currentStages[13].status = 'PASSED';
    currentStages[13].message = 'Recalculated portfolio sharpe ratio';

    // Stage 15: Alerts
    currentStages[14].status = 'PASSED';
    currentStages[14].message = 'Signals broadcast complete';

    executionRequest.state = 'RECONCILED_SUCCESS';
    executionRequest.outcomeMessage = 'Order safely completed through entire orchestrator flow.';
    
  } catch (error: any) {
    orchestratorState = 'ERROR';
    pipelineStages = currentStages;
    return {
      success: false,
      message: `Fatal orchestrator crash: ${error.message}`,
      stages: pipelineStages,
      decision: null
    };
  }

  pipelineStages = currentStages;
  return {
    success: true,
    message: 'Orchestrator pipeline cycle completed successfully with full pre-trade guardrails.',
    stages: pipelineStages,
    decision
  };
}

function auditLogsPush(msg: string) {
  if (activeReconciliation.auditLogs) {
    activeReconciliation.auditLogs.push(msg);
  }
}

// Unified Automation Orchestrator Engine Export
export const automationOrchestrator = {
  registeredEAs: new Map<string, any>(),
  orderHashes: new Map<string, number>(),
  isEmergencyHalted: false,
  emergencyHaltReason: '',

  registerEA(ea: any) {
    this.registeredEAs.set(ea.id, ea);
  },

  evaluateMarketTick(
    tick: { symbol: string; bid: number; ask: number; timestamp: number },
    broker: { status: string; isReadOnly: boolean; lastPingMs?: number; executionPermission: boolean; brokerName?: string; accountNumber?: string }
  ) {
    const reasons: string[] = [];

    if (this.isEmergencyHalted) {
      return { status: 'PAUSED', rejectionCount: 1, reasons: [`Emergency Halt active: ${this.emergencyHaltReason}`] };
    }

    if (broker.status !== 'CONNECTED' || !broker.executionPermission) {
      reasons.push('Broker disconnected or missing execution permission');
    }

    if (Date.now() - tick.timestamp > 5000) {
      reasons.push('Market data stream is stale (> 5s latency)');
    }

    let rejectionCount = 0;
    this.registeredEAs.forEach((ea) => {
      if (ea.settings && ea.settings.fixedLotSize > 10.0) {
        rejectionCount++;
        reasons.push(`EA ${ea.name} setting lot size exceeds risk threshold`);
      }
    });

    if (reasons.length > 0) {
      return { status: 'PAUSED', rejectionCount: rejectionCount || reasons.length, reasons };
    }

    return { status: 'ACTIVE', rejectionCount: 0, reasons: [] };
  },

  recordOrderHash(order: { id: string; symbol: string; side: string; volumeLots?: number; volume?: number }) {
    const vol = order.volumeLots !== undefined ? order.volumeLots : order.volume || 0;
    const key = `${order.symbol}-${order.side}-${vol}`;
    this.orderHashes.set(key, Date.now());
  },

  isDuplicateOrder(order: { id: string; symbol: string; side: string; volumeLots?: number; volume?: number }, windowMs = 5000) {
    const vol = order.volumeLots !== undefined ? order.volumeLots : order.volume || 0;
    const key = `${order.symbol}-${order.side}-${vol}`;
    const lastTime = this.orderHashes.get(key);
    if (lastTime && Date.now() - lastTime < windowMs) {
      return true;
    }
    return false;
  },

  emergencyHalt(reason: string) {
    this.isEmergencyHalted = true;
    this.emergencyHaltReason = reason;
    orchestratorState = 'EMERGENCY_STOP';
  },

  resumeFromEmergencyHalt() {
    this.isEmergencyHalted = false;
    this.emergencyHaltReason = '';
    orchestratorState = 'STOPPED';
  },
};

