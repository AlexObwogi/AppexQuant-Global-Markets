import { ExecutionOrder, OrderExecutionState, OrderTimelineEvent } from '../../types/execution.ts';

// In-memory list of execution orders
let executionOrders: ExecutionOrder[] = [];

// Helper to calculate slippage and commission based on instrument and quantity
function calculateExecutionMetrics(symbol: string, quantity: number, side: 'BUY' | 'SHORT') {
  let latency = 25 + Math.floor(Math.random() * 45); // Default fast latency
  let slippage = Number((Math.random() * 0.8).toFixed(2)); // Default low slippage
  let commission = Number((quantity * 6.5).toFixed(2)); // Standard ECN commission

  if (symbol.includes('XAU')) {
    latency = 90 + Math.floor(Math.random() * 80);
    slippage = Number((Math.random() * 1.5 + 0.3).toFixed(2));
  } else if (symbol.includes('BTC')) {
    latency = 150 + Math.floor(Math.random() * 150);
    slippage = Number((Math.random() * 4.5 + 0.5).toFixed(2));
  }

  return { latency, slippage, commission };
}

// Generate timeline event
function createTimelineEvent(state: OrderExecutionState, message: string): OrderTimelineEvent {
  return {
    state,
    timestamp: new Date().toISOString(),
    message,
  };
}

// Seed historical orders so the dashboard is rich and active on mount
export function seedExecutionOrders(): void {
  const now = new Date();
  
  const seedList: ExecutionOrder[] = [
    // Working Order
    {
      requestId: 'req-9823-1a',
      accountId: 'acc-demo-001',
      strategyId: 'strat-ai-01',
      symbol: 'EURUSD',
      side: 'BUY',
      orderType: 'LIMIT',
      quantity: 1.5,
      price: 1.08450,
      timeInForce: 'GTC',
      riskDecisionId: 'risk-dec-091a',
      createdAt: new Date(now.getTime() - 600000).toISOString(),
      updatedAt: new Date(now.getTime() - 300000).toISOString(),
      state: 'SUBMITTED',
      requestedPrice: 1.08450,
      brokerResponse: 'Broker: Order submitted to pool. Awaiting market matching.',
      timeline: [
        { state: 'CREATED', timestamp: new Date(now.getTime() - 600000).toISOString(), message: 'Order request created from Gemini RL approved signal.' },
        { state: 'VALIDATING', timestamp: new Date(now.getTime() - 590000).toISOString(), message: 'Syntax validation complete: valid price, quantity, and symbol.' },
        { state: 'RISK_CHECK', timestamp: new Date(now.getTime() - 580000).toISOString(), message: 'Risk pre-trade checks passed: size and drawdowns are under thresholds.' },
        { state: 'APPROVED', timestamp: new Date(now.getTime() - 570000).toISOString(), message: 'Central risk decision id risk-dec-091a approved.' },
        { state: 'SUBMITTED', timestamp: new Date(now.getTime() - 300000).toISOString(), message: 'Order submitted to Exness MT5 Server via secure WebSocket.' },
      ],
    },
    // Partially Filled
    {
      requestId: 'req-8842-bc',
      accountId: 'acc-demo-001',
      strategyId: 'strat-01',
      symbol: 'XAUUSD',
      side: 'SHORT',
      orderType: 'MARKET',
      quantity: 2.0,
      timeInForce: 'DAY',
      riskDecisionId: 'risk-dec-092b',
      createdAt: new Date(now.getTime() - 900000).toISOString(),
      updatedAt: new Date(now.getTime() - 850000).toISOString(),
      state: 'PARTIALLY_FILLED',
      requestedPrice: 2338.50,
      fillPrice: 2338.45,
      executionLatencyMs: 145,
      slippagePips: 0.5,
      commission: 13.00,
      brokerResponse: 'Broker: Filled 1.20 Lots of 2.00. Remaining 0.80 lots working.',
      timeline: [
        { state: 'CREATED', timestamp: new Date(now.getTime() - 900000).toISOString(), message: 'Order request created from manual trading console.' },
        { state: 'VALIDATING', timestamp: new Date(now.getTime() - 895000).toISOString(), message: 'Syntax validation successful.' },
        { state: 'RISK_CHECK', timestamp: new Date(now.getTime() - 890000).toISOString(), message: 'Risk gate passed.' },
        { state: 'APPROVED', timestamp: new Date(now.getTime() - 885000).toISOString(), message: 'Order approved by pre-trade engine.' },
        { state: 'SUBMITTED', timestamp: new Date(now.getTime() - 870000).toISOString(), message: 'Submitted to JustMarkets REST Gateway.' },
        { state: 'PARTIALLY_FILLED', timestamp: new Date(now.getTime() - 850000).toISOString(), message: 'Partial fill: 1.20 lots filled at $2338.45.' },
      ],
    },
    // Filled Order 1
    {
      requestId: 'req-2194-ff',
      accountId: 'acc-demo-001',
      strategyId: 'strat-02',
      symbol: 'GBPUSD',
      side: 'BUY',
      orderType: 'MARKET',
      quantity: 1.0,
      timeInForce: 'IOC',
      riskDecisionId: 'risk-dec-054x',
      createdAt: new Date(now.getTime() - 1800000).toISOString(),
      updatedAt: new Date(now.getTime() - 1795000).toISOString(),
      state: 'FILLED',
      requestedPrice: 1.27520,
      fillPrice: 1.27515,
      executionLatencyMs: 42,
      slippagePips: -0.5,
      commission: 6.50,
      brokerResponse: 'Broker: Order filled fully at 1.27515 USD. Trade Ticket #814295.',
      timeline: [
        { state: 'CREATED', timestamp: new Date(now.getTime() - 1800000).toISOString(), message: 'Automated signal from SMA-Crossover Strategy.' },
        { state: 'VALIDATING', timestamp: new Date(now.getTime() - 1799000).toISOString(), message: 'Validation successful.' },
        { state: 'RISK_CHECK', timestamp: new Date(now.getTime() - 1798000).toISOString(), message: 'Risk gate check: daily loss okay.' },
        { state: 'APPROVED', timestamp: new Date(now.getTime() - 1797000).toISOString(), message: 'Approved for final execution.' },
        { state: 'SUBMITTED', timestamp: new Date(now.getTime() - 1796000).toISOString(), message: 'Sent to Deriv WebSocket adapter.' },
        { state: 'FILLED', timestamp: new Date(now.getTime() - 1795000).toISOString(), message: 'Filled fully. Connection response received.' },
      ],
    },
    // Filled Order 2 (XAUUSD)
    {
      requestId: 'req-3129-aa',
      accountId: 'acc-demo-001',
      strategyId: 'strat-ai-01',
      symbol: 'XAUUSD',
      side: 'BUY',
      orderType: 'MARKET',
      quantity: 0.8,
      timeInForce: 'FOK',
      riskDecisionId: 'risk-dec-072z',
      createdAt: new Date(now.getTime() - 3600000).toISOString(),
      updatedAt: new Date(now.getTime() - 3598000).toISOString(),
      state: 'FILLED',
      requestedPrice: 2332.10,
      fillPrice: 2332.22,
      executionLatencyMs: 165,
      slippagePips: 1.2,
      commission: 5.20,
      brokerResponse: 'Broker: Fill-or-Kill request matched. Fully filled. Ticket #812903.',
      timeline: [
        { state: 'CREATED', timestamp: new Date(now.getTime() - 3600000).toISOString(), message: 'Created by Gemini Reinforcement model.' },
        { state: 'VALIDATING', timestamp: new Date(now.getTime() - 3599500).toISOString(), message: 'Validation passed.' },
        { state: 'RISK_CHECK', timestamp: new Date(now.getTime() - 3599000).toISOString(), message: 'Risk constraints checked.' },
        { state: 'APPROVED', timestamp: new Date(now.getTime() - 3598800).toISOString(), message: 'Pre-trade clear.' },
        { state: 'SUBMITTED', timestamp: new Date(now.getTime() - 3598500).toISOString(), message: 'Submitted as Fill-Or-Kill.' },
        { state: 'FILLED', timestamp: new Date(now.getTime() - 3598000).toISOString(), message: 'Executed fully at 2332.22 USD.' },
      ],
    },
    // Cancelled Order
    {
      requestId: 'req-4482-cc',
      accountId: 'acc-demo-001',
      strategyId: 'strat-01',
      symbol: 'GBPUSD',
      side: 'SHORT',
      orderType: 'LIMIT',
      quantity: 1.0,
      price: 1.27800,
      timeInForce: 'GTC',
      riskDecisionId: 'risk-dec-011c',
      createdAt: new Date(now.getTime() - 7200000).toISOString(),
      updatedAt: new Date(now.getTime() - 7100000).toISOString(),
      state: 'CANCELLED',
      requestedPrice: 1.27800,
      brokerResponse: 'Broker: Order cancelled successfully by user request.',
      timeline: [
        { state: 'CREATED', timestamp: new Date(now.getTime() - 7200000).toISOString(), message: 'Limit Short order request placed.' },
        { state: 'APPROVED', timestamp: new Date(now.getTime() - 7198000).toISOString(), message: 'Pre-trade approved.' },
        { state: 'SUBMITTED', timestamp: new Date(now.getTime() - 7190000).toISOString(), message: 'Order placed on book.' },
        { state: 'CANCEL_REQUESTED', timestamp: new Date(now.getTime() - 7110000).toISOString(), message: 'Cancellation signal initiated by user.' },
        { state: 'CANCELLED', timestamp: new Date(now.getTime() - 7100000).toISOString(), message: 'Broker confirmation: Order withdrawn.' },
      ],
    },
    // Rejected Order (Risk Check failure)
    {
      requestId: 'req-1102-rj',
      accountId: 'acc-demo-001',
      strategyId: 'strat-unregistered',
      symbol: 'EURUSD',
      side: 'BUY',
      orderType: 'MARKET',
      quantity: 5.0,
      timeInForce: 'DAY',
      riskDecisionId: 'risk-dec-rejected',
      createdAt: new Date(now.getTime() - 14400000).toISOString(),
      updatedAt: new Date(now.getTime() - 14399000).toISOString(),
      state: 'REJECTED',
      requestedPrice: 1.08500,
      brokerResponse: 'Execution Engine: Rejected locally. Suspended strategy route detected.',
      timeline: [
        { state: 'CREATED', timestamp: new Date(now.getTime() - 14400000).toISOString(), message: 'Order request received from Suspended Strategy.' },
        { state: 'VALIDATING', timestamp: new Date(now.getTime() - 14399800).toISOString(), message: 'Syntax validation OK.' },
        { state: 'RISK_CHECK', timestamp: new Date(now.getTime() - 14399500).toISOString(), message: 'Risk Check failed: STRATEGY_SUSPENDED.' },
        { state: 'REJECTED', timestamp: new Date(now.getTime() - 14399000).toISOString(), message: 'Rejected: Execution halted due to risk decision risk-dec-rejected.' },
      ],
    },
    // Failed Order (Broker gateway failure)
    {
      requestId: 'req-0518-fl',
      accountId: 'acc-demo-001',
      strategyId: 'strat-01',
      symbol: 'BTCUSD',
      side: 'BUY',
      orderType: 'MARKET',
      quantity: 0.5,
      timeInForce: 'DAY',
      riskDecisionId: 'risk-dec-failed',
      createdAt: new Date(now.getTime() - 28800000).toISOString(),
      updatedAt: new Date(now.getTime() - 28795000).toISOString(),
      state: 'FAILED',
      requestedPrice: 58450.00,
      brokerResponse: 'Broker Error: API Connection timeout or invalid route configuration (Error 504).',
      timeline: [
        { state: 'CREATED', timestamp: new Date(now.getTime() - 28800000).toISOString(), message: 'Manual trade intent.' },
        { state: 'VALIDATING', timestamp: new Date(now.getTime() - 2879900).toISOString(), message: 'Syntax validated.' },
        { state: 'RISK_CHECK', timestamp: new Date(now.getTime() - 2879800).toISOString(), message: 'Risk clearance obtained.' },
        { state: 'APPROVED', timestamp: new Date(now.getTime() - 2879700).toISOString(), message: 'Approved.' },
        { state: 'SUBMITTED', timestamp: new Date(now.getTime() - 2879600).toISOString(), message: 'Submitted to gateway.' },
        { state: 'FAILED', timestamp: new Date(now.getTime() - 2879500).toISOString(), message: 'Broker API socket connection lost mid-transit. Re-attempt failed.' },
      ],
    }
  ];

  executionOrders = seedList;
}

// Get all orders
export function getExecutionOrders(): ExecutionOrder[] {
  if (executionOrders.length === 0) {
    seedExecutionOrders();
  }
  return executionOrders;
}

// Submit a new order into the Execution Engine
export function submitExecutionOrder(orderInput: {
  accountId: string;
  strategyId: string;
  symbol: string;
  side: 'BUY' | 'SHORT';
  orderType: 'MARKET' | 'LIMIT' | 'STOP';
  quantity: number;
  price?: number;
  timeInForce: 'DAY' | 'GTC' | 'IOC' | 'FOK';
  riskDecisionId?: string;
  source: 'MANUAL' | 'STRATEGY' | 'AUTOMATION';
}): ExecutionOrder {
  const now = new Date().toISOString();
  const reqId = `req-${Math.floor(1000 + Math.random() * 9000)}-${Math.random().toString(36).substring(2, 4)}`;
  const riskId = orderInput.riskDecisionId || `risk-dec-${Math.random().toString(36).substring(2, 6)}`;
  
  const requestedPrice = orderInput.price || (orderInput.symbol.includes('XAU') ? 2335.50 : orderInput.symbol.includes('BTC') ? 59100.00 : 1.08500);

  const newOrder: ExecutionOrder = {
    requestId: reqId,
    accountId: orderInput.accountId,
    strategyId: orderInput.strategyId,
    symbol: orderInput.symbol,
    side: orderInput.side,
    orderType: orderInput.orderType,
    quantity: orderInput.quantity,
    price: orderInput.price,
    timeInForce: orderInput.timeInForce,
    riskDecisionId: riskId,
    createdAt: now,
    updatedAt: now,
    state: 'CREATED',
    requestedPrice,
    timeline: [
      { state: 'CREATED', timestamp: now, message: `Order initialized via ${orderInput.source} routing channel.` }
    ]
  };

  executionOrders.unshift(newOrder);

  // Return immediately in CREATED state. Never jump to FILLED instantly,
  // respecting the directive: "Never treat 'submitted' as 'filled'."
  return newOrder;
}

// Drive individual orders through their pre-trade lifecycle stages
// CREATED -> VALIDATING -> RISK_CHECK -> APPROVED -> SUBMITTED
export function progressOrderStage(requestId: string): ExecutionOrder | null {
  const order = executionOrders.find(o => o.requestId === requestId);
  if (!order) return null;

  const now = new Date().toISOString();
  order.updatedAt = now;

  switch (order.state) {
    case 'CREATED':
      order.state = 'VALIDATING';
      order.timeline.push(createTimelineEvent('VALIDATING', 'Syntax and parameters validation passed. Checking market session open.'));
      break;
    case 'VALIDATING':
      order.state = 'RISK_CHECK';
      order.timeline.push(createTimelineEvent('RISK_CHECK', 'Centralized Risk Engine evaluating 19 pre-trade limits.'));
      break;
    case 'RISK_CHECK':
      // Let's check some funny conditions to simulate rejection or block
      if (order.symbol === 'XRPUSD' || order.symbol === 'MEMEUSDT') {
        order.state = 'REJECTED';
        order.brokerResponse = 'Execution Engine: Blocked. Instrument is blacklisted in risk policy.';
        order.timeline.push(createTimelineEvent('REJECTED', 'Halted. Non-compliant token blocked by asset guardrails.'));
      } else {
        order.state = 'APPROVED';
        order.timeline.push(createTimelineEvent('APPROVED', `Order approved under Decision ID: ${order.riskDecisionId}.`));
      }
      break;
    case 'APPROVED':
      order.state = 'SUBMITTED';
      order.brokerResponse = 'Broker: Handshake successful. Order received and entered queue.';
      order.timeline.push(createTimelineEvent('SUBMITTED', 'Order transmitted and active on exchange matching pipeline.'));
      break;
    default:
      break;
  }

  return order;
}

// Synchronize actual broker status: cycles SUBMITTED or PARTIALLY_FILLED to final state (FILLED/FAILED)
export function synchronizeBrokerStatus(): void {
  const now = new Date().toISOString();

  executionOrders.forEach(order => {
    if (order.state === 'SUBMITTED' || order.state === 'PARTIALLY_FILLED' || order.state === 'CANCEL_REQUESTED') {
      order.updatedAt = now;

      if (order.state === 'CANCEL_REQUESTED') {
        order.state = 'CANCELLED';
        order.brokerResponse = 'Broker: Order fully withdrawn from order-book.';
        order.timeline.push(createTimelineEvent('CANCELLED', 'Broker cancellation confirmed. Order is inactive.'));
        return;
      }

      // Roll dice to determine execution outcome
      const rand = Math.random();
      if (rand < 0.05) {
        // 5% chance of failing execution on broker sync
        order.state = 'FAILED';
        order.brokerResponse = 'Broker Error: Price slipped past maximum allowable tolerance threshold.';
        order.timeline.push(createTimelineEvent('FAILED', 'Broker execution failed: SLIPPAGE_LIMIT_EXCEEDED.'));
      } else if (rand < 0.15 && order.orderType !== 'MARKET' && order.state !== 'PARTIALLY_FILLED') {
        // 10% chance of partial fill for Limit orders
        order.state = 'PARTIALLY_FILLED';
        const fillQty = Number((order.quantity * 0.6).toFixed(2));
        const metrics = calculateExecutionMetrics(order.symbol, fillQty, order.side);
        order.fillPrice = Number((order.requestedPrice + (order.side === 'BUY' ? metrics.slippage * 0.0001 : -metrics.slippage * 0.0001)).toFixed(5));
        order.executionLatencyMs = metrics.latency;
        order.slippagePips = metrics.slippage;
        order.commission = metrics.commission;
        order.brokerResponse = `Broker: Executed partial fill for ${fillQty} Lots of ${order.quantity}.`;
        order.timeline.push(createTimelineEvent('PARTIALLY_FILLED', `Partial fill of ${fillQty} lots executed at exchange.`));
      } else {
        // Standard full fill
        order.state = 'FILLED';
        const metrics = calculateExecutionMetrics(order.symbol, order.quantity, order.side);
        // Add random slight slippage
        const multiplier = order.symbol.includes('XAU') ? 0.1 : order.symbol.includes('BTC') ? 1.0 : 0.0001;
        const slipVal = (metrics.slippage * multiplier) * (order.side === 'BUY' ? 1 : -1);
        order.fillPrice = Number((order.requestedPrice + slipVal).toFixed(order.symbol.includes('USD') && !order.symbol.includes('XAU') ? 5 : 2));
        order.executionLatencyMs = metrics.latency;
        order.slippagePips = metrics.slippage;
        order.commission = metrics.commission;
        order.brokerResponse = `Broker Match: Fully filled ${order.quantity} Lots. Transaction ticket #${Math.floor(200000 + Math.random() * 800000)}.`;
        order.timeline.push(createTimelineEvent('FILLED', `Fully filled at exchange execution price: ${order.fillPrice}.`));
      }
    }
  });
}

// Request cancellation of an order
export function requestOrderCancellation(requestId: string): ExecutionOrder | null {
  const order = executionOrders.find(o => o.requestId === requestId);
  if (!order) return null;

  if (order.state === 'SUBMITTED' || order.state === 'PARTIALLY_FILLED') {
    const now = new Date().toISOString();
    order.state = 'CANCEL_REQUESTED';
    order.updatedAt = now;
    order.timeline.push(createTimelineEvent('CANCEL_REQUESTED', 'User cancellation signal dispatched. Waiting for broker acknowledgement.'));
  }

  return order;
}

// Reset all execution logs
export function resetExecutionOrders(): void {
  seedExecutionOrders();
}
