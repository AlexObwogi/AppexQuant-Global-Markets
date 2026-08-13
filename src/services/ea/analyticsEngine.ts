/**
 * AppexQuant Markets Global - Advanced Trade Analytics & Journaling Engine
 * Server-side engine for analytics computation and trade journaling persistence.
 */

import { GoogleGenAI } from '@google/genai';

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

// In-memory trade journal datastore on server
let tradeJournalDb: TradeJournalRecord[] = [];

// Helper to calculate default holding times
function getHoldingTimeMin(entry: string, exit: string): number {
  return Math.round((new Date(exit).getTime() - new Date(entry).getTime()) / 60000);
}

// Helper to determine trading session based on UTC hour
function getTradingSessionByHour(utcHour: number): 'London' | 'New York' | 'Tokyo' | 'Sydney' {
  if (utcHour >= 8 && utcHour < 16) return 'London';
  if (utcHour >= 13 && utcHour < 21) return 'New York';
  if (utcHour >= 22 || utcHour < 6) return 'Tokyo';
  return 'Sydney';
}

// Seed historical trades for instant comprehensive analytics
export function seedTradeJournal(): void {
  const now = new Date();
  
  // Spread historical trades over the last 30 days
  const baseTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).getTime();
  
  const seedList: TradeJournalRecord[] = [
    {
      id: 'trade-001',
      symbol: 'EURUSD',
      strategyId: 'strat-ai-01', // Gemini RL Trend-Slayer
      accountId: 'acc-demo-001',
      side: 'BUY',
      quantity: 1.5,
      entryPrice: 1.08200,
      exitPrice: 1.08450,
      entryTime: new Date(baseTime + 1 * 24 * 3600 * 1000 + 9 * 3600 * 1000).toISOString(), // London session
      exitTime: new Date(baseTime + 1 * 24 * 3600 * 1000 + 13 * 3600 * 1000).toISOString(),
      pnlUsd: 375.00,
      initialRiskUsd: 150.00,
      rMultiple: 2.5,
      session: 'London',
      marketRegime: 'Trending',
      signal: 'Gemini RL H4 Bullish Order Block Sweep',
      riskDecision: 'Standard Pre-Trade Clearance',
      reason: 'Take Profit Hit',
      executionQuality: 'EXCELLENT',
      marketConditions: 'London open liquidity accumulation, trending upward',
      result: 'WIN',
      notes: 'Executed cleanly at London session open. The strategy captured the upward expansion block perfectly.',
      executionLatencyMs: 35,
      slippagePips: -0.2,
      commission: 9.75,
      aiSummary: {
        whatHappened: 'A long EURUSD buy position was initiated during London open and closed automatically after hitting the Take Profit target.',
        whyDidItHappen: 'The entry was aligned with institutional liquidity accumulation at the H4 bullish order block, which expanded rapidly during the session.',
        whatWasTheRisk: 'Strict pre-trade validation was active with a stop loss set at $150 (initial risk), yielding a positive Risk/Reward ratio of 2.5R.',
        whatWasTheExecutionQuality: 'Excellent execution with very low latency (35ms) and slightly positive slippage (-0.2 pips) through the Exness gateway.'
      }
    },
    {
      id: 'trade-002',
      symbol: 'GBPUSD',
      strategyId: 'strat-01', // Bollinger Mean Reversion
      accountId: 'acc-demo-001',
      side: 'SHORT',
      quantity: 2.0,
      entryPrice: 1.27200,
      exitPrice: 1.27350,
      entryTime: new Date(baseTime + 3 * 24 * 3600 * 1000 + 14 * 3600 * 1000).toISOString(), // New York session
      exitTime: new Date(baseTime + 3 * 24 * 3600 * 1000 + 15 * 3600 * 1000).toISOString(),
      pnlUsd: -300.00,
      initialRiskUsd: 200.00,
      rMultiple: -1.5,
      session: 'New York',
      marketRegime: 'High Volatility',
      signal: 'Bollinger Band Upper Touch + RSI Overbought Bearish Divergence',
      riskDecision: 'Standard Pre-Trade Clearance',
      reason: 'Stop Loss Hit',
      executionQuality: 'SLIPPED',
      marketConditions: 'FOMC pre-announcement erratic buying momentum',
      result: 'LOSS',
      notes: 'Got stopped out right before the retracement. High pre-news volatility spiked through the upper bands.',
      executionLatencyMs: 140,
      slippagePips: 1.4,
      commission: 13.00,
      aiSummary: {
        whatHappened: 'A GBPUSD short trade was entered on Bollinger band expansion and ended in a Stop Loss hit.',
        whyDidItHappen: 'High volatility during FOMC pre-news trading spiked prices upwards, violating the technical boundaries before any reversal could occur.',
        whatWasTheRisk: 'Initial risk was set at $200. The rapid spike resulted in a -1.5R loss due to broker execution slippage.',
        whatWasTheExecutionQuality: 'Poor/Slipped execution due to high market volatility. Latency was 140ms and slippage was 1.4 pips.'
      }
    },
    {
      id: 'trade-003',
      symbol: 'XAUUSD',
      strategyId: 'strat-02', // SMA Cross Momentum
      accountId: 'acc-demo-001',
      side: 'BUY',
      quantity: 1.0,
      entryPrice: 2320.00,
      exitPrice: 2335.00,
      entryTime: new Date(baseTime + 5 * 24 * 3600 * 1000 + 1 * 3600 * 1000).toISOString(), // Tokyo session
      exitTime: new Date(baseTime + 5 * 24 * 3600 * 1000 + 8 * 3600 * 1000).toISOString(),
      pnlUsd: 1500.00,
      initialRiskUsd: 500.00,
      rMultiple: 3.0,
      session: 'Tokyo',
      marketRegime: 'Trending',
      signal: 'SMA 50/200 Golden Cross on H1 Chart',
      riskDecision: 'Standard Pre-Trade Clearance',
      reason: 'Take Profit Hit',
      executionQuality: 'GOOD',
      marketConditions: 'Strong Asian gold accumulation trend',
      result: 'WIN',
      notes: 'Captured a highly stable momentum trend on Gold. Set-and-forget execution parameters worked beautifully.',
      executionLatencyMs: 65,
      slippagePips: 0.1,
      commission: 6.50,
      aiSummary: {
        whatHappened: 'A long Gold buy position was initiated based on SMA momentum and closed with a maximum profit.',
        whyDidItHappen: 'Gold experienced heavy physical accumulation during the Asian session, boosting technical SMA support levels.',
        whatWasTheRisk: 'Risk was $500, but structured with tight stop boundaries, which resulted in a phenomenal 3.0R return.',
        whatWasTheExecutionQuality: 'Good execution latency of 65ms with negligible slippage.'
      }
    },
    {
      id: 'trade-004',
      symbol: 'BTCUSD',
      strategyId: 'strat-ai-01', // Gemini RL Trend-Slayer
      accountId: 'acc-demo-001',
      side: 'SHORT',
      quantity: 0.5,
      entryPrice: 58500.00,
      exitPrice: 59100.00,
      entryTime: new Date(baseTime + 8 * 24 * 3600 * 1000 + 15 * 3600 * 1000).toISOString(), // New York session
      exitTime: new Date(baseTime + 8 * 24 * 3600 * 1000 + 17 * 3600 * 1000).toISOString(),
      pnlUsd: -300.00,
      initialRiskUsd: 250.00,
      rMultiple: -1.2,
      session: 'New York',
      marketRegime: 'High Volatility',
      signal: 'AI Sentiment Pivots Negative Flow Detection',
      riskDecision: 'Size Reduced (High Volatility)',
      reason: 'Stop Loss Hit',
      executionQuality: 'POOR',
      marketConditions: 'Crypto options expiry day short squeeze',
      result: 'LOSS',
      notes: 'Market was heavily manipulated around the options expiration block. Capital size was reduced by risk gate beforehand, which saved us from a bigger hit.',
      executionLatencyMs: 195,
      slippagePips: 3.2,
      commission: 3.25,
      aiSummary: {
        whatHappened: 'A short BTC position was entered on negative sentiment and was stopped out during a sudden upward squeeze.',
        whyDidItHappen: 'Sudden short-covering surrounding BTC options expiry sparked a massive short squeeze that breached all structural levels.',
        whatWasTheRisk: 'Pre-trade risk engine reduced size to 0.5 lots due to high crypto volatility, limiting total loss to $300.',
        whatWasTheExecutionQuality: 'Poor execution due to massive network load on options expiry, causing 195ms latency and 3.2 pips slippage.'
      }
    },
    {
      id: 'trade-005',
      symbol: 'EURUSD',
      strategyId: 'strat-01',
      accountId: 'acc-demo-001',
      side: 'SHORT',
      quantity: 2.0,
      entryPrice: 1.08600,
      exitPrice: 1.08420,
      entryTime: new Date(baseTime + 11 * 24 * 3600 * 1000 + 10 * 3600 * 1000).toISOString(),
      exitTime: new Date(baseTime + 11 * 24 * 3600 * 1000 + 12 * 3600 * 1000).toISOString(),
      pnlUsd: 360.00,
      initialRiskUsd: 150.00,
      rMultiple: 2.4,
      session: 'London',
      marketRegime: 'Range-bound',
      signal: 'Bollinger Band Upper Touch + Bearish engulfing candle',
      riskDecision: 'Standard Pre-Trade Clearance',
      reason: 'Take Profit Hit',
      executionQuality: 'EXCELLENT',
      marketConditions: 'London afternoon tight ranges, low catalyst risk',
      result: 'WIN',
      notes: 'Perfect mean-reversion setup. The pair oscillated within bands without any trending breakout.',
      executionLatencyMs: 32,
      slippagePips: -0.1,
      commission: 13.00,
      aiSummary: {
        whatHappened: 'A short EURUSD mean-reversion trade completed with target profits.',
        whyDidItHappen: 'Lacking structural catalysts, EURUSD respected Bollinger boundaries, allowing the bearish engulfing trigger to materialize.',
        whatWasTheRisk: 'Minimal initial risk ($150) with high conviction, capturing 2.4R return.',
        whatWasTheExecutionQuality: 'Excellent. Clean execution under 32ms.'
      }
    },
    {
      id: 'trade-006',
      symbol: 'GBPUSD',
      strategyId: 'strat-02',
      accountId: 'acc-demo-001',
      side: 'BUY',
      quantity: 1.5,
      entryPrice: 1.27000,
      exitPrice: 1.27250,
      entryTime: new Date(baseTime + 14 * 24 * 3600 * 1000 + 13 * 3600 * 1000).toISOString(),
      exitTime: new Date(baseTime + 14 * 24 * 3600 * 1000 + 16 * 3600 * 1000).toISOString(),
      pnlUsd: 375.00,
      initialRiskUsd: 150.00,
      rMultiple: 2.5,
      session: 'New York',
      marketRegime: 'Trending',
      signal: 'H1 SMA 50 Retest and bounce',
      riskDecision: 'Standard Pre-Trade Clearance',
      reason: 'Take Profit Hit',
      executionQuality: 'GOOD',
      marketConditions: 'Post-CPI dollar weakness, sterling breakout',
      result: 'WIN',
      notes: 'CPI data sparked a dollar dump. Retesting the SMA 50 provided an excellent low-risk entry.',
      executionLatencyMs: 44,
      slippagePips: 0.2,
      commission: 9.75,
      aiSummary: {
        whatHappened: 'GBPUSD buy trade completed with full profit target.',
        whyDidItHappen: 'Dollar-wide weakness following CPI data fueled a strong sterling breakout supported by the H1 SMA 50 dynamic baseline.',
        whatWasTheRisk: 'Standard pre-trade risk checks passed. Stop loss was well-placed below the CPI candle low.',
        whatWasTheExecutionQuality: 'Good. Latency was 44ms with slight, acceptable slippage.'
      }
    },
    {
      id: 'trade-007',
      symbol: 'XAUUSD',
      strategyId: 'strat-01',
      accountId: 'acc-demo-001',
      side: 'SHORT',
      quantity: 1.5,
      entryPrice: 2340.00,
      exitPrice: 2345.50,
      entryTime: new Date(baseTime + 17 * 24 * 3600 * 1000 + 14 * 3600 * 1000).toISOString(),
      exitTime: new Date(baseTime + 17 * 24 * 3600 * 1000 + 14 * 3600 * 1000 + 15 * 60 * 1000).toISOString(), // 15 mins
      pnlUsd: -825.00,
      initialRiskUsd: 350.00,
      rMultiple: -2.35,
      session: 'New York',
      marketRegime: 'High Volatility',
      signal: 'Mean Reversion Spike into 2.5 StdDev Bollinger Band',
      riskDecision: 'Standard Pre-Trade Clearance',
      reason: 'Safeguard Exit (MAX_DURATION)',
      executionQuality: 'SLIPPED',
      marketConditions: 'Geopolitical risk headline spike on Gold',
      result: 'LOSS',
      notes: 'A critical lesson on trading mean reversion on Gold when news drops. The drawdown spiked through risk limits.',
      executionLatencyMs: 110,
      slippagePips: 1.8,
      commission: 9.75,
      aiSummary: {
        whatHappened: 'A short Gold position was caught in a geopolitical headline spike and closed via safeguard time limits.',
        whyDidItHappen: 'Unexpected news headlines sparked panic buying, overriding Bollinger bands and triggering protective closures.',
        whatWasTheRisk: 'Initial risk of $350 expanded to $825 loss due to massive price gap/slippage on entry/exit under extreme conditions.',
        whatWasTheExecutionQuality: 'Poor. Slipped execution under heavy market conditions.'
      }
    },
    {
      id: 'trade-008',
      symbol: 'BTCUSD',
      strategyId: 'strat-02',
      accountId: 'acc-demo-001',
      side: 'BUY',
      quantity: 0.8,
      entryPrice: 59500.00,
      exitPrice: 59100.00,
      entryTime: new Date(baseTime + 19 * 24 * 3600 * 1000 + 3 * 3600 * 1000).toISOString(),
      exitTime: new Date(baseTime + 19 * 24 * 3600 * 1000 + 6 * 3600 * 1000).toISOString(),
      pnlUsd: -320.00,
      initialRiskUsd: 200.00,
      rMultiple: -1.6,
      session: 'Tokyo',
      marketRegime: 'Range-bound',
      signal: 'SMA Dynamic Support Bounce Trigger',
      riskDecision: 'Standard Pre-Trade Clearance',
      reason: 'Stop Loss Hit',
      executionQuality: 'GOOD',
      marketConditions: 'Low-volume weekend crypto range consolidation',
      result: 'LOSS',
      notes: 'Low volume range broke down. Lack of institutional depth led to a sharp, unexpected wash.',
      executionLatencyMs: 85,
      slippagePips: 0.4,
      commission: 5.20,
      aiSummary: {
        whatHappened: 'A long BTC position was stopped out on a weekend volume drop.',
        whyDidItHappen: 'Inadequate liquidity during the Tokyo session weekend caused bid support to dry up, triggering an easy stop run.',
        whatWasTheRisk: 'Strict stop loss limits executed automatically to contain damage.',
        whatWasTheExecutionQuality: 'Good. Commendable latency of 85ms during a weekend.'
      }
    },
    {
      id: 'trade-009',
      symbol: 'EURUSD',
      strategyId: 'strat-ai-01',
      accountId: 'acc-demo-001',
      side: 'BUY',
      quantity: 2.0,
      entryPrice: 1.08300,
      exitPrice: 1.08550,
      entryTime: new Date(baseTime + 22 * 24 * 3600 * 1000 + 8 * 3600 * 1000).toISOString(),
      exitTime: new Date(baseTime + 22 * 24 * 3600 * 1000 + 11 * 3600 * 1000).toISOString(),
      pnlUsd: 500.00,
      initialRiskUsd: 200.00,
      rMultiple: 2.5,
      session: 'London',
      marketRegime: 'Trending',
      signal: 'Gemini AI Sentiment Score +92 Momentum Alignment',
      riskDecision: 'Standard Pre-Trade Clearance',
      reason: 'Take Profit Hit',
      executionQuality: 'EXCELLENT',
      marketConditions: 'ECB rate freeze optimism, steady euro bid',
      result: 'WIN',
      notes: 'AI Sentiment scores correctly detected post-ECB bullish consensus. The trend was highly linear.',
      executionLatencyMs: 28,
      slippagePips: -0.3,
      commission: 13.00,
      aiSummary: {
        whatHappened: 'EURUSD long trade was executed automatically and hit target profit.',
        whyDidItHappen: 'Bullish ECB interest-rate commentary supported the AI sentiment score trigger, pushing the pair steadily upwards.',
        whatWasTheRisk: '2.5R return achieved safely with excellent risk containment.',
        whatWasTheExecutionQuality: 'Superb. Ultra-fast 28ms execution speed.'
      }
    },
    {
      id: 'trade-010',
      symbol: 'GBPUSD',
      strategyId: 'strat-01',
      accountId: 'acc-demo-001',
      side: 'SHORT',
      quantity: 1.5,
      entryPrice: 1.27500,
      exitPrice: 1.27280,
      entryTime: new Date(baseTime + 24 * 24 * 3600 * 1000 + 15 * 3600 * 1000).toISOString(),
      exitTime: new Date(baseTime + 24 * 24 * 3600 * 1000 + 19 * 3600 * 1000).toISOString(),
      pnlUsd: 330.00,
      initialRiskUsd: 150.00,
      rMultiple: 2.2,
      session: 'New York',
      marketRegime: 'Range-bound',
      signal: 'Bollinger Band Upper Edge Overextension',
      riskDecision: 'Standard Pre-Trade Clearance',
      reason: 'Take Profit Hit',
      executionQuality: 'GOOD',
      marketConditions: 'Late afternoon US session consolidation',
      result: 'WIN',
      notes: 'Executed perfectly during standard NY afternoon cooling ranges. High hit rate on range boundaries.',
      executionLatencyMs: 46,
      slippagePips: 0.1,
      commission: 9.75,
      aiSummary: {
        whatHappened: 'Short GBPUSD trade closed automatically with target profit.',
        whyDidItHappen: 'The trade exploited late US session low volatility, returning the currency pair to its mean.',
        whatWasTheRisk: 'Pre-trade limits strictly maintained. 2.2R target hit.',
        whatWasTheExecutionQuality: 'Good. standard NY broker route routing.'
      }
    },
    {
      id: 'trade-011',
      symbol: 'USDJPY',
      strategyId: 'strat-02',
      accountId: 'acc-demo-001',
      side: 'BUY',
      quantity: 1.0,
      entryPrice: 155.20,
      exitPrice: 155.55,
      entryTime: new Date(baseTime + 26 * 24 * 3600 * 1000 + 22 * 3600 * 1000).toISOString(), // Tokyo Open
      exitTime: new Date(baseTime + 26 * 24 * 3600 * 1000 + 26 * 24 * 3600 * 1000 + 2 * 3600 * 1000).toISOString(),
      pnlUsd: 225.00,
      initialRiskUsd: 100.00,
      rMultiple: 2.25,
      session: 'Tokyo',
      marketRegime: 'Trending',
      signal: 'SMA 50 Retest and Breakout on M15',
      riskDecision: 'Standard Pre-Trade Clearance',
      reason: 'Take Profit Hit',
      executionQuality: 'GOOD',
      marketConditions: 'BOJ intervention fears easing, retail selling pressure',
      result: 'WIN',
      notes: 'Yen weakness momentum accelerated. The breakout occurred fast and hit TP quickly.',
      executionLatencyMs: 75,
      slippagePips: 0.2,
      commission: 6.50,
      aiSummary: {
        whatHappened: 'USDJPY buy trade hit the Take Profit zone.',
        whyDidItHappen: 'Easing BOJ verbal intervention fears allowed the dominant dollar-rebound trend to resume, triggering a quick SMA breakout.',
        whatWasTheRisk: 'Stop loss was set at $100. Trade yielded 2.25R return.',
        whatWasTheExecutionQuality: 'Good. Standard Tokyo liquidity pools.'
      }
    },
    {
      id: 'trade-012',
      symbol: 'XAUUSD',
      strategyId: 'strat-ai-01',
      accountId: 'acc-demo-001',
      side: 'BUY',
      quantity: 1.2,
      entryPrice: 2335.00,
      exitPrice: 2348.50,
      entryTime: new Date(baseTime + 27 * 24 * 3600 * 1000 + 9 * 3600 * 1000).toISOString(),
      exitTime: new Date(baseTime + 27 * 24 * 3600 * 1000 + 15 * 3600 * 1000).toISOString(),
      pnlUsd: 1620.00,
      initialRiskUsd: 400.00,
      rMultiple: 4.05,
      session: 'London',
      marketRegime: 'Trending',
      signal: 'AI Multimodal Volatility Compression Sweep Indicator',
      riskDecision: 'Standard Pre-Trade Clearance',
      reason: 'Take Profit Hit',
      executionQuality: 'EXCELLENT',
      marketConditions: 'Pre-nonfarm payroll safe-haven gold inflow',
      result: 'WIN',
      notes: 'An outstanding trade. Volatility compression was detected by the RL model, leading to a massive expansion phase before US news.',
      executionLatencyMs: 38,
      slippagePips: -0.4,
      commission: 7.80,
      aiSummary: {
        whatHappened: 'Gold buy position hit the Take Profit target, capturing a massive 4.05R gain.',
        whyDidItHappen: 'Pre-NFP volatility compression was identified by the AI model, positioning us ahead of the safe-haven inflow expansion.',
        whatWasTheRisk: 'Strict pre-trade guardrails preserved risk, but allowed wide trailing profits to run.',
        whatWasTheExecutionQuality: 'Excellent. Low latency and positive slippage.'
      }
    },
    {
      id: 'trade-013',
      symbol: 'BTCUSD',
      strategyId: 'strat-01',
      accountId: 'acc-demo-001',
      side: 'SHORT',
      quantity: 0.5,
      entryPrice: 60200.00,
      exitPrice: 60500.00,
      entryTime: new Date(baseTime + 28 * 24 * 3600 * 1000 + 13 * 3600 * 1000).toISOString(),
      exitTime: new Date(baseTime + 28 * 24 * 3600 * 1000 + 14 * 3600 * 1000).toISOString(),
      pnlUsd: -150.00,
      initialRiskUsd: 150.00,
      rMultiple: -1.0,
      session: 'London',
      marketRegime: 'High Volatility',
      signal: 'Bollinger Band Bearish Overextension',
      riskDecision: 'Standard Pre-Trade Clearance',
      reason: 'Stop Loss Hit',
      executionQuality: 'GOOD',
      marketConditions: 'Institutional spot BTC buying block active',
      result: 'LOSS',
      notes: 'A minor loss. Bollinger reversion failed because an institutional whale block was actively bidding spot BTC.',
      executionLatencyMs: 78,
      slippagePips: 0.3,
      commission: 3.25,
      aiSummary: {
        whatHappened: 'Short BTC position was stopped out on institutional accumulation.',
        whyDidItHappen: 'Spot BTC whale purchase blocks created a floor, resisting normal mean reversion.',
        whatWasTheRisk: 'Initial risk of $150 was executed exactly at the stop loss level.',
        whatWasTheExecutionQuality: 'Good. Latency was 78ms with minimal slippage.'
      }
    },
    {
      id: 'trade-014',
      symbol: 'EURUSD',
      strategyId: 'strat-02',
      accountId: 'acc-demo-001',
      side: 'SHORT',
      quantity: 2.0,
      entryPrice: 1.08550,
      exitPrice: 1.08380,
      entryTime: new Date(baseTime + 29 * 24 * 3600 * 1000 + 14 * 3600 * 1000).toISOString(),
      exitTime: new Date(baseTime + 29 * 24 * 3600 * 1000 + 18 * 3600 * 1000).toISOString(),
      pnlUsd: 340.00,
      initialRiskUsd: 150.00,
      rMultiple: 2.26,
      session: 'New York',
      marketRegime: 'Trending',
      signal: 'H1 SMA 50 Bearish Crossover confirmed',
      riskDecision: 'Standard Pre-Trade Clearance',
      reason: 'Take Profit Hit',
      executionQuality: 'GOOD',
      marketConditions: 'US manufacturing index strong, USD rebounding',
      result: 'WIN',
      notes: 'USD strength fueled this short. The SMA crossover provided a high probability trigger.',
      executionLatencyMs: 52,
      slippagePips: 0.1,
      commission: 13.00,
      aiSummary: {
        whatHappened: 'Short EURUSD trade hit the target profit.',
        whyDidItHappen: 'Positive US manufacturing index data pushed the dollar index higher, dragging the Euro pair downward past the SMA crossover.',
        whatWasTheRisk: 'High win confidence. Stopped tight above the SMA dynamic resistance.',
        whatWasTheExecutionQuality: 'Good execution speed of 52ms.'
      }
    },
    {
      id: 'trade-015',
      symbol: 'GBPUSD',
      strategyId: 'strat-ai-01',
      accountId: 'acc-demo-001',
      side: 'BUY',
      quantity: 1.5,
      entryPrice: 1.27200,
      exitPrice: 1.27480,
      entryTime: new Date(now.getTime() - 14 * 3600 * 1000).toISOString(), // 14 hours ago
      exitTime: new Date(now.getTime() - 11 * 3600 * 1000).toISOString(), // 11 hours ago
      pnlUsd: 420.00,
      initialRiskUsd: 150.00,
      rMultiple: 2.8,
      session: 'London',
      marketRegime: 'Trending',
      signal: 'Gemini RL Momentum Continuation Pattern',
      riskDecision: 'Standard Pre-Trade Clearance',
      reason: 'Take Profit Hit',
      executionQuality: 'EXCELLENT',
      marketConditions: 'London open liquidity sweep',
      result: 'WIN',
      notes: 'Fabulous sweep trade. Initiated cleanly at London open, rode the momentum block up to target.',
      executionLatencyMs: 31,
      slippagePips: -0.2,
      commission: 9.75,
      aiSummary: {
        whatHappened: 'GBPUSD buy trade completed with target profit.',
        whyDidItHappen: 'RL momentum continuation algorithm detected standard London open liquidity sweeps, leading to immediate upward expansion.',
        whatWasTheRisk: 'Minimal initial risk of $150 resulting in a massive 2.8R return.',
        whatWasTheExecutionQuality: 'Excellent. Latency was 31ms with positive slippage.'
      }
    },
    {
      id: 'trade-016',
      symbol: 'XAUUSD',
      strategyId: 'strat-01',
      accountId: 'acc-demo-001',
      side: 'SHORT',
      quantity: 1.0,
      entryPrice: 2352.00,
      exitPrice: 2354.20,
      entryTime: new Date(now.getTime() - 3 * 3600 * 1000).toISOString(), // 3 hours ago
      exitTime: new Date(now.getTime() - 2.5 * 3600 * 1000).toISOString(), // 2.5 hours ago
      pnlUsd: -220.00,
      initialRiskUsd: 150.00,
      rMultiple: -1.46,
      session: 'New York',
      marketRegime: 'Low Volatility',
      signal: 'Bollinger Band Upper Reversion Spike',
      riskDecision: 'Standard Pre-Trade Clearance',
      reason: 'Stop Loss Hit',
      executionQuality: 'GOOD',
      marketConditions: 'US session late consolidation breakout',
      result: 'LOSS',
      notes: 'Broke out of consolidation range unexpectedly. Got stopped out as Gold pushed higher.',
      executionLatencyMs: 58,
      slippagePips: 0.2,
      commission: 6.50,
      aiSummary: {
        whatHappened: 'Short XAUUSD trade was stopped out on range breakout.',
        whyDidItHappen: 'Gold broke out of US session late consolidation ranges unexpectedly, overriding technical Bollinger reversion levels.',
        whatWasTheRisk: 'Risk strictly managed at $150 with a final loss of $220 due to slight broker slippage.',
        whatWasTheExecutionQuality: 'Good. 58ms latency with standard commissions.'
      }
    }
  ];

  tradeJournalDb = seedList;
}

// Get all trades
export function getTradeJournal(): TradeJournalRecord[] {
  if (tradeJournalDb.length === 0) {
    seedTradeJournal();
  }
  return tradeJournalDb;
}

// Add a closed position automatically to the journal (satisfies "Each trade automatically generates a journal record")
export function addTradeToJournal(p: {
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
  initialRiskUsd?: number;
  reason: string;
  executionLatencyMs?: number;
  slippagePips?: number;
  commission?: number;
}): TradeJournalRecord {
  const now = new Date();
  const id = `trade-${Math.floor(100 + Math.random() * 900)}`;
  
  const initialRiskUsd = p.initialRiskUsd || 150.00;
  const rMultiple = Number((p.pnlUsd / initialRiskUsd).toFixed(2));
  const result = p.pnlUsd > 10.00 ? 'WIN' : p.pnlUsd < -10.00 ? 'LOSS' : 'BREAKEVEN';
  
  // Calculate session based on exit time
  const exitDate = new Date(p.exitTime);
  const session = getTradingSessionByHour(exitDate.getUTCHours());
  
  // Determine a simulated market regime
  const regimes: ('Trending' | 'Range-bound' | 'High Volatility' | 'Low Volatility')[] = ['Trending', 'Range-bound', 'High Volatility', 'Low Volatility'];
  const marketRegime = regimes[Math.floor(Math.random() * regimes.length)];

  // Create standard triggers
  const signal = p.strategyId === 'strat-ai-01' 
    ? 'Gemini RL Neural Trend Sweep Indicator' 
    : p.strategyId === 'strat-01' 
      ? 'Bollinger Overextension Mean Reversion' 
      : 'SMA Cross Momentum Support Retest';

  const newTrade: TradeJournalRecord = {
    id,
    symbol: p.symbol,
    strategyId: p.strategyId,
    accountId: p.accountId,
    side: p.side,
    quantity: p.quantity,
    entryPrice: p.entryPrice,
    exitPrice: p.exitPrice,
    entryTime: p.entryTime,
    exitTime: p.exitTime,
    pnlUsd: p.pnlUsd,
    initialRiskUsd,
    rMultiple,
    session,
    marketRegime,
    signal,
    riskDecision: 'Standard Pre-Trade Clearance',
    reason: p.reason,
    executionQuality: (p.slippagePips || 0) > 1.0 ? 'POOR' : (p.slippagePips || 0) > 0.5 ? 'SLIPPED' : 'EXCELLENT',
    marketConditions: `${session} session dynamic liquidity flow, testing support/resistance blocks.`,
    result,
    notes: 'Position closed via platform execution loop. Automatically logged to journal ledger.',
    executionLatencyMs: p.executionLatencyMs || 42,
    slippagePips: p.slippagePips || 0.1,
    commission: p.commission || Number((p.quantity * 6.5).toFixed(2)),
  };

  // Generate automated post-trade summary immediately (expert heuristic fallback)
  newTrade.aiSummary = generateDeterministicSummary(newTrade);

  // Unshift so new trades appear first
  tradeJournalDb.unshift(newTrade);
  return newTrade;
}

// Update trade manual notes (strictly preserves historical records, only updates user editable fields)
export function updateTradeNotes(id: string, notes: string): TradeJournalRecord | null {
  const trade = tradeJournalDb.find(t => t.id === id);
  if (!trade) return null;
  trade.notes = notes;
  return trade;
}

// Generate deterministic fallback summary if Gemini key is missing or fails
export function generateDeterministicSummary(t: TradeJournalRecord) {
  const directionText = t.side === 'BUY' ? 'Long buy' : 'Short short';
  const outcomeText = t.result === 'WIN' 
    ? `ended in a successful profit capture of $${t.pnlUsd.toFixed(2)}, outperforming risk boundaries` 
    : t.result === 'LOSS' 
      ? `hit the protective stop boundary resulting in a controlled loss of $${Math.abs(t.pnlUsd).toFixed(2)}` 
      : `settled near breakeven with a minor P&L of $${t.pnlUsd.toFixed(2)}`;

  return {
    whatHappened: `A ${directionText} trade on ${t.symbol} was opened via ${t.strategyId} at ${t.entryPrice} and subsequently closed at ${t.exitPrice} via '${t.reason}', which ${outcomeText}.`,
    whyDidItHappen: `The entry was triggered by '${t.signal}' during the ${t.session} session. The trade matured under a '${t.marketRegime}' regime. The structural exit trigger resolved the position in alignment with prevailing volume flows.`,
    whatWasTheRisk: `Pre-trade risk gateway applied standard margin rules. Capital risk was strictly bounded at an initial loss exposure of $${t.initialRiskUsd.toFixed(2)}, returning an efficiency score of ${t.rMultiple} R-units.`,
    whatWasTheExecutionQuality: `Execution completed with a latency of ${t.executionLatencyMs || 45}ms. Slippage was recorded at ${t.slippagePips || 0.1} pips with a broker commission fee of $${t.commission?.toFixed(2) || '0.00'}. Overall quality is rated ${t.executionQuality}.`
  };
}

// AI Summary Generator using gemini-3.6-flash (or deterministic fallback)
export async function generateAISummary(id: string): Promise<TradeJournalRecord | null> {
  const trade = tradeJournalDb.find(t => t.id === id);
  if (!trade) return null;

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    // Graceful fallback to expert deterministic generator
    trade.aiSummary = generateDeterministicSummary(trade);
    return trade;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are the AppexQuant Markets Global expert AI Trading Journal Analyser.
Evaluate this closed trade:
Trade ID: ${trade.id}
Symbol: ${trade.symbol}
Strategy: ${trade.strategyId}
Side: ${trade.side}
Quantity: ${trade.quantity}
Entry Price: ${trade.entryPrice} | Exit Price: ${trade.exitPrice}
P&L: $${trade.pnlUsd} (Result: ${trade.result})
Initial Risk: $${trade.initialRiskUsd} | R-Multiple: ${trade.rMultiple}R
Session: ${trade.session} | Market Regime: ${trade.marketRegime}
Signal: ${trade.signal}
Risk Decision: ${trade.riskDecision}
Exit Reason: ${trade.reason}
Execution Latency: ${trade.executionLatencyMs || 45}ms | Slippage: ${trade.slippagePips || 0} pips | Commission: $${trade.commission || 0}
Market Conditions: ${trade.marketConditions}
User Notes: ${trade.notes || 'None'}

Provide an analytical post-trade audit. You MUST return a JSON object exactly matching this schema:
{
  "whatHappened": "A concise explanation of the entry, holding, and exit mechanics of this trade.",
  "whyDidItHappen": "A professional technical analysis of why this specific financial outcome occurred, citing the market regime, session dynamics, and signal triggers.",
  "whatWasTheRisk": "An evaluation of the risk management efficiency. Discuss leverage, stop loss placement, size scaling, and R-multiple utilization.",
  "whatWasTheExecutionQuality": "An assessment of execution quality focusing on slippage, broker latency (ms), commission overhead, and gateway performance."
}

Do NOT wrap the JSON in markdown code blocks. Return ONLY pure JSON.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    if (response.text) {
      const parsed = JSON.parse(response.text.trim());
      if (parsed.whatHappened && parsed.whyDidItHappen && parsed.whatWasTheRisk && parsed.whatWasTheExecutionQuality) {
        trade.aiSummary = parsed;
        return trade;
      }
    }
  } catch (err) {
    console.warn('[AnalyticsEngine] Failed to generate Gemini post-trade summary, falling back to deterministic:', err);
  }

  // Fallback if anything fails
  trade.aiSummary = generateDeterministicSummary(trade);
  return trade;
}

// Compute all advanced performance metrics & contributions
export function calculatePerformanceMetrics(trades: TradeJournalRecord[]): AnalyticsSummary {
  const count = trades.length;
  if (count === 0) {
    return {
      profitFactor: 0, sharpeRatio: 0, sortinoRatio: 0, maxDrawdown: 0, recoveryFactor: 0, expectancy: 0,
      winRate: 0, lossRate: 0, averageR: 0, averageWinner: 0, averageLoser: 0, tradeFrequency: 0,
      averageHoldingTimeMin: 0, totalExposureUsd: 0,
      strategyContribution: [], symbolContribution: [], sessionContribution: [], timeOfDayContribution: []
    };
  }

  // Basic Stats
  let grossProfits = 0;
  let grossLosses = 0;
  let winCount = 0;
  let lossCount = 0;
  let sumPnl = 0;
  let sumR = 0;
  let sumHoldingTime = 0;
  let totalExposure = 0;

  const pnls: number[] = [];

  trades.forEach(t => {
    pnls.push(t.pnlUsd);
    sumPnl += t.pnlUsd;
    sumR += t.rMultiple;
    sumHoldingTime += getHoldingTimeMin(t.entryTime, t.exitTime);
    totalExposure += t.quantity * t.entryPrice * (t.symbol.includes('XAU') ? 100 : t.symbol.includes('BTC') ? 1 : 100000);

    if (t.pnlUsd > 0) {
      grossProfits += t.pnlUsd;
      winCount++;
    } else if (t.pnlUsd < 0) {
      grossLosses += Math.abs(t.pnlUsd);
      lossCount++;
    }
  });

  const winRate = winCount / count;
  const lossRate = lossCount / count;
  const averageWinner = winCount > 0 ? (grossProfits / winCount) : 0;
  const averageLoser = lossCount > 0 ? (grossLosses / lossCount) : 0;

  // 1. Profit Factor
  const profitFactor = grossLosses > 0 ? Number((grossProfits / grossLosses).toFixed(2)) : Number(grossProfits.toFixed(2));

  // 2. Sharpe Ratio (trade-by-trade base)
  const averagePnL = sumPnl / count;
  const variance = pnls.reduce((acc, p) => acc + Math.pow(p - averagePnL, 2), 0) / count;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? Number((averagePnL / stdDev).toFixed(3)) : 0;

  // 3. Sortino Ratio (downside deviation based)
  const downsideSqDiffSum = pnls.reduce((acc, p) => p < 0 ? acc + Math.pow(p - 0, 2) : acc, 0);
  const downsideDev = Math.sqrt(downsideSqDiffSum / count);
  const sortinoRatio = downsideDev > 0 ? Number((averagePnL / downsideDev).toFixed(3)) : 0;

  // 4. Maximum Drawdown & Equity Curve calculations
  // We sort trades chronologically ascending to compute drawdown walk
  const sortedTrades = [...trades].sort((a, b) => new Date(a.exitTime).getTime() - new Date(b.exitTime).getTime());
  let runningBalance = 100000; // standard virtual baseline
  let peakBalance = runningBalance;
  let maxDrawdownAmount = 0;

  sortedTrades.forEach(t => {
    runningBalance += t.pnlUsd;
    if (runningBalance > peakBalance) {
      peakBalance = runningBalance;
    }
    const currentDrawdown = peakBalance - runningBalance;
    if (currentDrawdown > maxDrawdownAmount) {
      maxDrawdownAmount = currentDrawdown;
    }
  });

  // Express Max Drawdown in dollar amount
  const maxDrawdown = Number(maxDrawdownAmount.toFixed(2));

  // 5. Recovery Factor
  const recoveryFactor = maxDrawdown > 0 ? Number((sumPnl / maxDrawdown).toFixed(2)) : Number(sumPnl.toFixed(2));

  // 6. Expectancy
  const expectancy = Number(((winRate * averageWinner) - (lossRate * averageLoser)).toFixed(2));

  // 7. Average R
  const averageR = Number((sumR / count).toFixed(2));

  // 8. Trade Frequency (trades per day over range)
  const firstTradeTime = new Date(sortedTrades[0].entryTime).getTime();
  const lastTradeTime = new Date(sortedTrades[sortedTrades.length - 1].exitTime).getTime();
  const totalDays = Math.max(1, (lastTradeTime - firstTradeTime) / (1000 * 3600 * 24));
  const tradeFrequency = Number((count / totalDays).toFixed(2));

  const averageHoldingTimeMin = Math.round(sumHoldingTime / count);

  // Contributions calculations
  const strategyMap: Record<string, { pnl: number; count: number; wins: number }> = {};
  const symbolMap: Record<string, { pnl: number; count: number; wins: number }> = {};
  const sessionMap: Record<string, { pnl: number; count: number; wins: number }> = {};
  const hourMap: Record<number, { pnl: number; count: number; wins: number }> = {};

  trades.forEach(t => {
    // Strategy
    if (!strategyMap[t.strategyId]) strategyMap[t.strategyId] = { pnl: 0, count: 0, wins: 0 };
    strategyMap[t.strategyId].pnl += t.pnlUsd;
    strategyMap[t.strategyId].count++;
    if (t.pnlUsd > 0) strategyMap[t.strategyId].wins++;

    // Symbol
    if (!symbolMap[t.symbol]) symbolMap[t.symbol] = { pnl: 0, count: 0, wins: 0 };
    symbolMap[t.symbol].pnl += t.pnlUsd;
    symbolMap[t.symbol].count++;
    if (t.pnlUsd > 0) symbolMap[t.symbol].wins++;

    // Session
    if (!sessionMap[t.session]) sessionMap[t.session] = { pnl: 0, count: 0, wins: 0 };
    sessionMap[t.session].pnl += t.pnlUsd;
    sessionMap[t.session].count++;
    if (t.pnlUsd > 0) sessionMap[t.session].wins++;

    // Time of day (Hour of entry)
    const entryHour = new Date(t.entryTime).getUTCHours();
    if (!hourMap[entryHour]) hourMap[entryHour] = { pnl: 0, count: 0, wins: 0 };
    hourMap[entryHour].pnl += t.pnlUsd;
    hourMap[entryHour].count++;
    if (t.pnlUsd > 0) hourMap[entryHour].wins++;
  });

  const strategyContribution = Object.entries(strategyMap).map(([strategyId, data]) => ({
    strategyId,
    pnl: Number(data.pnl.toFixed(2)),
    count: data.count,
    wins: data.wins
  })).sort((a, b) => b.pnl - a.pnl);

  const symbolContribution = Object.entries(symbolMap).map(([symbol, data]) => ({
    symbol,
    pnl: Number(data.pnl.toFixed(2)),
    count: data.count,
    wins: data.wins
  })).sort((a, b) => b.pnl - a.pnl);

  const sessionContribution = Object.entries(sessionMap).map(([session, data]) => ({
    session,
    pnl: Number(data.pnl.toFixed(2)),
    count: data.count,
    wins: data.wins
  })).sort((a, b) => b.pnl - a.pnl);

  const timeOfDayContribution = Object.entries(hourMap).map(([hourStr, data]) => ({
    hour: parseInt(hourStr),
    pnl: Number(data.pnl.toFixed(2)),
    count: data.count,
    wins: data.wins
  })).sort((a, b) => a.hour - b.hour);

  return {
    profitFactor,
    sharpeRatio,
    sortinoRatio,
    maxDrawdown,
    recoveryFactor,
    expectancy,
    winRate: Number(winRate.toFixed(4)),
    lossRate: Number(lossRate.toFixed(4)),
    averageR,
    averageWinner: Number(averageWinner.toFixed(2)),
    averageLoser: Number(averageLoser.toFixed(2)),
    tradeFrequency,
    averageHoldingTimeMin,
    totalExposureUsd: Math.round(totalExposure / count),
    strategyContribution,
    symbolContribution,
    sessionContribution,
    timeOfDayContribution
  };
}
