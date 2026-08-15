/**
 * AppexQuant Markets Global - Phase 3 Quantitative Backtesting Engine
 * Professional multi-asset deterministic bar generator and rules simulation engine.
 * Computes institutional metrics: Sharpe, Sortino, Drawdown curves, Train/Test Out-of-Sample splits,
 * and detects overfitting risks using mathematical diagnostics.
 */

import { BacktestParams, BacktestResult, BacktestTrade, MetricBreakdown, OverfittingDiagnosis } from '../../types/backtest.ts';
import { UserStrategy } from '../../types/ai.ts';

// Simple deterministic pseudo-random generator based on a seed string
class SeededRandom {
  private m = 0x80000000; // 2**31
  private a = 1103515245;
  private c = 12345;
  private state: number;

  constructor(seed: string) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    this.state = Math.abs(hash);
  }

  // Returns number between 0 and 1
  next(): number {
    this.state = (this.a * this.state + this.c) % this.m;
    return this.state / (this.m - 1);
  }

  // Returns number within range
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

interface MarketBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Generates highly realistic, completely deterministic historical bars for backtesting.
 */
function generateHistoricalBars(
  symbol: string,
  timeframe: string,
  startDate: string,
  endDate: string
): MarketBar[] {
  const normSymbol = symbol.toUpperCase();
  const rand = new SeededRandom(`${normSymbol}-${timeframe}-backtest-v2`);

  const startMs = new Date(startDate).getTime();
  const endMs = new Date(endDate).getTime();

  // Timeframe interval in ms
  let tfMs = 3600 * 1000; // default H1
  if (timeframe === 'M15') tfMs = 15 * 60 * 1000;
  else if (timeframe === 'H4') tfMs = 4 * 3600 * 1000;
  else if (timeframe === 'D1') tfMs = 24 * 3600 * 1000;

  const isSynthetic = normSymbol.includes('VOLATILITY') || normSymbol.includes('SYNTHETIC');

  // Baseline prices
  let basePrice = 1.1000; // EURUSD
  if (normSymbol.includes('GBP')) basePrice = 1.3000;
  else if (normSymbol.includes('XAU') || normSymbol.includes('GOLD')) basePrice = 2350.00;
  else if (isSynthetic) basePrice = 150000;

  const dailyVolatility = normSymbol.includes('XAU') ? 18.0 : isSynthetic ? 1500 : 0.0060;
  const stepVolatility = dailyVolatility / Math.sqrt(24 * (3600 * 1000 / tfMs));

  const bars: MarketBar[] = [];
  let currentMs = startMs;

  let drift = normSymbol.includes('XAU') ? 0.05 : isSynthetic ? 5.0 : 0.00001; // subtle bullish bias

  // Volatility state cycles
  let volCycle = 1.0;

  while (currentMs <= endMs) {
    const date = new Date(currentMs);
    const dayOfWeek = date.getUTCDay();
    const hour = date.getUTCHours();

    // Check if weekend (Forex/Commodities are closed)
    if (!isSynthetic && (dayOfWeek === 6 || dayOfWeek === 0)) {
      currentMs += tfMs;
      continue;
    }

    // Session volatility multiplayers
    // London: 08:00 - 16:00 UTC, NY: 13:00 - 21:00 UTC
    let sessionMultiplier = 0.5; // Quiet Asia
    if (hour >= 7 && hour <= 16) {
      sessionMultiplier = 1.3; // London
    }
    if (hour >= 12 && hour <= 21) {
      sessionMultiplier += 0.8; // NY / overlap
    }

    // Random volatility spikes (economic news, etc.)
    if (rand.next() < 0.01) {
      volCycle = rand.range(1.8, 3.5);
    } else {
      volCycle = volCycle * 0.9 + 1.0 * 0.1; // decay back to normal
    }

    const open = basePrice;
    const change = (rand.next() - 0.495) * stepVolatility * sessionMultiplier * volCycle + drift;
    const close = open + change;

    const high = Math.max(open, close) + rand.next() * stepVolatility * 0.5 * sessionMultiplier * volCycle;
    const low = Math.min(open, close) - rand.next() * stepVolatility * 0.5 * sessionMultiplier * volCycle;

    bars.push({
      time: currentMs,
      open: Number(open.toFixed(normSymbol.includes('XAU') ? 2 : isSynthetic ? 1 : 5)),
      high: Number(high.toFixed(normSymbol.includes('XAU') ? 2 : isSynthetic ? 1 : 5)),
      low: Number(low.toFixed(normSymbol.includes('XAU') ? 2 : isSynthetic ? 1 : 5)),
      close: Number(close.toFixed(normSymbol.includes('XAU') ? 2 : isSynthetic ? 1 : 5)),
      volume: Math.floor(rand.range(50, 500) * sessionMultiplier * volCycle),
    });

    basePrice = close;
    currentMs += tfMs;
  }

  return bars;
}

/**
 * Calculates quantitative technical indicators on the historical series.
 */
function calculateIndicators(bars: MarketBar[]) {
  const closes = bars.map((b) => b.close);
  const len = bars.length;

  const ma20 = new Array<number | null>(len).fill(null);
  const ema50 = new Array<number | null>(len).fill(null);
  const rsi = new Array<number | null>(len).fill(null);
  const atr = new Array<number | null>(len).fill(null);
  const upperDonchian = new Array<number | null>(len).fill(null);
  const lowerDonchian = new Array<number | null>(len).fill(null);

  // 1. Simple Moving Average 20
  for (let i = 19; i < len; i++) {
    const sum = closes.slice(i - 19, i + 1).reduce((a, b) => a + b, 0);
    ma20[i] = sum / 20;
  }

  // 2. Exponential Moving Average 50
  let prevEma = closes[0];
  const mult = 2 / (50 + 1);
  ema50[0] = prevEma;
  for (let i = 1; i < len; i++) {
    const currentEma = (closes[i] - prevEma) * mult + prevEma;
    ema50[i] = currentEma;
    prevEma = currentEma;
  }

  // 3. RSI 14
  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i < len; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;

    if (i <= 14) {
      gainSum += gain;
      lossSum += loss;
      if (i === 14) {
        const avgGain = gainSum / 14;
        const avgLoss = lossSum / 14;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        rsi[i] = 100 - 100 / (1 + rs);
      }
    } else {
      gainSum = (gainSum * 13 + gain) / 14;
      lossSum = (lossSum * 13 + loss) / 14;
      const rs = lossSum === 0 ? 100 : gainSum / lossSum;
      rsi[i] = 100 - 100 / (1 + rs);
    }
  }

  // 4. ATR 14
  const tr = new Array<number>(len).fill(0);
  for (let i = 1; i < len; i++) {
    const h = bars[i].high;
    const l = bars[i].low;
    const pc = bars[i - 1].close;
    tr[i] = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
  }
  let atrSum = tr.slice(1, 15).reduce((a, b) => a + b, 0);
  atr[14] = atrSum / 14;
  for (let i = 15; i < len; i++) {
    atr[i] = (atr[i - 1]! * 13 + tr[i]) / 14;
  }

  // 5. Donchian 20 Upper / Lower
  for (let i = 19; i < len; i++) {
    const highs = bars.slice(i - 19, i).map((b) => b.high);
    const lows = bars.slice(i - 19, i).map((b) => b.low);
    upperDonchian[i] = Math.max(...highs);
    lowerDonchian[i] = Math.min(...lows);
  }

  return { ma20, ema50, rsi, atr, upperDonchian, lowerDonchian };
}

/**
 * Computes performance analytics from trade lists.
 */
function calculateMetricsBreakdown(
  trades: BacktestTrade[],
  startingCapital: number,
  endingCapital: number,
  dailyEquity: number[]
): MetricBreakdown {
  const totalReturnPct = ((endingCapital - startingCapital) / startingCapital) * 100;
  const netPl = endingCapital - startingCapital;
  const tradeCount = trades.length;

  if (tradeCount === 0) {
    return {
      totalReturnPct: 0,
      netPl: 0,
      winRate: 0,
      lossRate: 0,
      profitFactor: 0,
      expectancy: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      maxDrawdownPct: 0,
      maxDrawdownCash: 0,
      averageTradePl: 0,
      averageWinner: 0,
      averageLoser: 0,
      largestWin: 0,
      largestLoss: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      tradeCount: 0,
      averageHoldingTimeMin: 0,
    };
  }

  const wins = trades.filter((t) => t.netPl > 0);
  const losses = trades.filter((t) => t.netPl <= 0);

  const winRate = (wins.length / tradeCount) * 100;
  const lossRate = (losses.length / tradeCount) * 100;

  const grossProfits = wins.reduce((sum, t) => sum + t.netPl, 0);
  const grossLosses = Math.abs(losses.reduce((sum, t) => sum + t.netPl, 0));
  const profitFactor = grossLosses === 0 ? grossProfits : grossProfits / grossLosses;

  // Expectancy = (WinRate * AvgWin) - (LossRate * AvgLoss)
  const averageWinner = wins.length === 0 ? 0 : grossProfits / wins.length;
  const averageLoser = losses.length === 0 ? 0 : grossLosses / losses.length;
  const expectancy = (winRate / 100) * averageWinner - (lossRate / 100) * averageLoser;

  const averageTradePl = netPl / tradeCount;

  // Largest win/loss
  const largestWin = wins.length === 0 ? 0 : Math.max(...wins.map((t) => t.netPl));
  const largestLoss = losses.length === 0 ? 0 : Math.min(...losses.map((t) => t.netPl));

  // Consecutive wins / losses
  let maxConsecWins = 0;
  let maxConsecLosses = 0;
  let currentConsecWins = 0;
  let currentConsecLosses = 0;

  for (const t of trades) {
    if (t.netPl > 0) {
      currentConsecWins++;
      currentConsecLosses = 0;
      if (currentConsecWins > maxConsecWins) maxConsecWins = currentConsecWins;
    } else {
      currentConsecLosses++;
      currentConsecWins = 0;
      if (currentConsecLosses > maxConsecLosses) maxConsecLosses = currentConsecLosses;
    }
  }

  // Average holding time
  const averageHoldingTimeMin =
    trades.reduce((sum, t) => sum + t.holdingTimeMs, 0) / tradeCount / (1000 * 60);

  // Sharpe and Sortino based on daily returns
  const dailyReturns: number[] = [];
  for (let i = 1; i < dailyEquity.length; i++) {
    const prev = dailyEquity[i - 1];
    if (prev > 0) {
      dailyReturns.push((dailyEquity[i] - prev) / prev);
    }
  }

  let sharpeRatio = 0;
  let sortinoRatio = 0;

  if (dailyReturns.length > 1) {
    const meanReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    
    // Daily SD
    const variance =
      dailyReturns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) /
      (dailyReturns.length - 1);
    const stdDev = Math.sqrt(variance);

    // Downside daily SD (Sortino)
    const negativeReturns = dailyReturns.filter((r) => r < 0);
    const downsideVariance = negativeReturns.length === 0
      ? 0.00001
      : negativeReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / (dailyReturns.length - 1);
    const downsideStdDev = Math.sqrt(downsideVariance);

    // Assume risk-free rate of 0% for simple metrics
    const annualizationFactor = Math.sqrt(252); // Approx trading days per year
    sharpeRatio = stdDev === 0 ? 0 : (meanReturn / stdDev) * annualizationFactor;
    sortinoRatio = downsideStdDev === 0 ? 0 : (meanReturn / downsideStdDev) * annualizationFactor;
  }

  // Max Drawdown calculation from the daily equity series
  let maxDrawdownPct = 0;
  let maxDrawdownCash = 0;
  let peak = startingCapital;

  for (const eq of dailyEquity) {
    if (eq > peak) peak = eq;
    const ddCash = peak - eq;
    const ddPct = (ddCash / peak) * 100;

    if (ddPct > maxDrawdownPct) maxDrawdownPct = ddPct;
    if (ddCash > maxDrawdownCash) maxDrawdownCash = ddCash;
  }

  return {
    totalReturnPct,
    netPl,
    winRate,
    lossRate,
    profitFactor,
    expectancy,
    sharpeRatio: Number(sharpeRatio.toFixed(2)),
    sortinoRatio: Number(sortinoRatio.toFixed(2)),
    maxDrawdownPct: Number(maxDrawdownPct.toFixed(2)),
    maxDrawdownCash: Number(maxDrawdownCash.toFixed(2)),
    averageTradePl,
    averageWinner,
    averageLoser,
    largestWin,
    largestLoss,
    consecutiveWins: maxConsecWins,
    consecutiveLosses: maxConsecLosses,
    tradeCount,
    averageHoldingTimeMin: Math.round(averageHoldingTimeMin),
  };
}

/**
 * Executes a high-fidelity quantitative backtest.
 */
export function runBacktest(
  strategy: UserStrategy,
  params: BacktestParams
): BacktestResult {
  const bars = generateHistoricalBars(params.symbol, params.timeframe, params.startDate, params.endDate);
  
  if (bars.length < 50) {
    throw new Error('Not enough historical bars generated within selected date range. Ensure dates are valid.');
  }

  const indicators = calculateIndicators(bars);
  const trades: BacktestTrade[] = [];

  const splitDateMs =
    new Date(params.startDate).getTime() +
    (new Date(params.endDate).getTime() - new Date(params.startDate).getTime()) *
      (params.trainTestSplit / 100);

  let currentCapital = params.startingCapital;
  const equityCurve: {
    timestamp: string;
    totalEquity: number;
    trainEquity: number;
    testEquity: number;
    drawdownPct: number;
    isOutOfSample: boolean;
  }[] = [];

  let runningPeak = params.startingCapital;
  const dailyEquityTracker: number[] = [];

  // Track active position
  interface Position {
    direction: 'LONG' | 'SHORT';
    entryPrice: number;
    entryBarIndex: number;
    volume: number;
    stopLoss: number;
    takeProfit: number;
    isOutOfSample: boolean;
  }

  let activePosition: Position | null = null;
  let lastTradeClosedBarIdx = -15; // Cooldown tracker

  const isVolatilityExpStrat =
    strategy.name.toLowerCase().includes('volatility') ||
    strategy.description.toLowerCase().includes('volatility') ||
    strategy.description.toLowerCase().includes('breakout');

  // Pips multiplier
  const isSynthetic = params.symbol.toUpperCase().includes('VOLATILITY') || params.symbol.toUpperCase().includes('SYNTHETIC');
  const pipMultiplier = params.symbol.toUpperCase().includes('XAU') ? 10 : isSynthetic ? 0.01 : 10000;

  for (let i = 40; i < bars.length; i++) {
    const bar = bars[i];
    const prevBar = bars[i - 1];
    const isOutOfSample = bar.time > splitDateMs;

    // Check if open position is stopped out or hit take profit
    if (activePosition) {
      const pos = activePosition;
      let closed = false;
      let exitPrice = 0;
      let exitReason: 'TP' | 'SL' | 'TRAILING_STOP' | 'END_OF_BACKTEST' = 'TP';

      const highPrice = bar.high;
      const lowPrice = bar.low;

      if (pos.direction === 'LONG') {
        // Test Trailing stop shifting
        if (params.riskModel === 'TRAILING_STOP') {
          const distance = (bar.close - pos.entryPrice) * pipMultiplier;
          if (distance > 15) {
            // Trailing lock-in
            const newSL = bar.close - (15 / pipMultiplier);
            if (newSL > pos.stopLoss) {
              pos.stopLoss = newSL;
            }
          }
        } else if (params.riskModel === 'BREAK_EVEN') {
          // If 1:1 reached, lock entry
          const distance = (bar.close - pos.entryPrice) * pipMultiplier;
          if (distance > 20 && pos.stopLoss < pos.entryPrice) {
            pos.stopLoss = pos.entryPrice;
          }
        }

        if (lowPrice <= pos.stopLoss) {
          exitPrice = pos.stopLoss;
          exitReason = 'SL';
          closed = true;
        } else if (highPrice >= pos.takeProfit) {
          exitPrice = pos.takeProfit;
          exitReason = 'TP';
          closed = true;
        }
      } else {
        // SHORT position
        if (params.riskModel === 'TRAILING_STOP') {
          const distance = (pos.entryPrice - bar.close) * pipMultiplier;
          if (distance > 15) {
            const newSL = bar.close + (15 / pipMultiplier);
            if (newSL < pos.stopLoss) {
              pos.stopLoss = newSL;
            }
          }
        } else if (params.riskModel === 'BREAK_EVEN') {
          const distance = (pos.entryPrice - bar.close) * pipMultiplier;
          if (distance > 20 && pos.stopLoss > pos.entryPrice) {
            pos.stopLoss = pos.entryPrice;
          }
        }

        if (highPrice >= pos.stopLoss) {
          exitPrice = pos.stopLoss;
          exitReason = 'SL';
          closed = true;
        } else if (lowPrice <= pos.takeProfit) {
          exitPrice = pos.takeProfit;
          exitReason = 'TP';
          closed = true;
        }
      }

      // Handle close
      if (closed || i === bars.length - 1) {
        if (i === bars.length - 1 && !closed) {
          exitPrice = bar.close;
          exitReason = 'END_OF_BACKTEST';
        }

        const pipsPl = (pos.direction === 'LONG' ? exitPrice - pos.entryPrice : pos.entryPrice - exitPrice) * pipMultiplier;
        
        // Sizing & Gross Pl calculations
        let grossPl = 0;
        if (isSynthetic) {
          grossPl = pipsPl * pos.volume;
        } else {
          // Standard forex calculation: 1 lot = $10 per pip approx
          grossPl = pipsPl * 10 * pos.volume;
        }

        const commission = pos.volume * params.commissionPerLot;
        const netPl = grossPl - commission;

        currentCapital += netPl;
        lastTradeClosedBarIdx = i;

        trades.push({
          id: `trade-${trades.length + 1}`,
          symbol: params.symbol,
          direction: pos.direction,
          entryTime: new Date(bars[pos.entryBarIndex].time).toISOString(),
          exitTime: new Date(bar.time).toISOString(),
          entryPrice: pos.entryPrice,
          exitPrice: exitPrice,
          volume: Number(pos.volume.toFixed(2)),
          pipsPl: Number(pipsPl.toFixed(1)),
          grossPl: Number(grossPl.toFixed(2)),
          commission: Number(commission.toFixed(2)),
          netPl: Number(netPl.toFixed(2)),
          holdingTimeMs: bar.time - bars[pos.entryBarIndex].time,
          exitReason,
          wasWin: netPl > 0,
          isOutOfSample: pos.isOutOfSample,
        });

        activePosition = null;
      }
    }

    // Evaluate Entry Rules
    if (!activePosition && i - lastTradeClosedBarIdx >= (strategy.cooldown || 15) / (params.timeframe === 'M15' ? 15 : 60)) {
      const currentRsi = indicators.rsi[i];
      const prevRsi = indicators.rsi[i - 1];
      const currentAtr = indicators.atr[i];
      const donUpper = indicators.upperDonchian[i];
      const donLower = indicators.lowerDonchian[i];

      let entrySignal: 'LONG' | 'SHORT' | null = null;

      if (isVolatilityExpStrat && currentRsi && donUpper && donLower) {
        // BREAKOUT strategy
        if (bar.close > donUpper && currentRsi > 55) {
          entrySignal = 'LONG';
        } else if (bar.close < donLower && currentRsi < 45) {
          entrySignal = 'SHORT';
        }
      } else if (currentRsi && prevRsi) {
        // SWEEP Reversal or RSI strategy
        if (currentRsi < 30 && prevBar.close < (indicators.ma20[i] || bar.close)) {
          entrySignal = 'LONG';
        } else if (currentRsi > 70 && prevBar.close > (indicators.ma20[i] || bar.close)) {
          entrySignal = 'SHORT';
        }
      }

      if (entrySignal) {
        // Account for spread and slippage on entry
        const pipCost = 1 / pipMultiplier;
        const entryFeePips = params.spreadPips + params.slippagePips;
        const entryPrice =
          entrySignal === 'LONG'
            ? bar.close + entryFeePips * pipCost
            : bar.close - entryFeePips * pipCost;

        // SL & TP distance
        const slDistancePips = strategy.riskProfile?.stopLossPipsOrPct || 25;
        const tpDistancePips = slDistancePips * (strategy.riskProfile?.minRiskRewardRatio || 2.5);

        const stopLoss =
          entrySignal === 'LONG'
            ? entryPrice - slDistancePips * pipCost
            : entryPrice + slDistancePips * pipCost;

        const takeProfit =
          entrySignal === 'LONG'
            ? entryPrice + tpDistancePips * pipCost
            : entryPrice - tpDistancePips * pipCost;

        // Position Sizing calculator
        let volume = 1.0; // standard fallback
        if (params.positionSizing === 'EQUITY_PERCENT') {
          // e.g. 2% of current balance risk allocated
          const balanceRisk = currentCapital * (params.positionSizeValue / 100);
          volume = Math.max(0.01, balanceRisk / 1000); // 1 lot = ~$1000 margin proxy
        } else if (params.positionSizing === 'RISK_PERCENT') {
          // Precise mathematical sizing: Risk = LotSize * SLPips * PipValue
          const riskCap = currentCapital * (params.positionSizeValue / 100);
          const valuePerPip = isSynthetic ? 1.0 : 10;
          volume = Math.max(0.01, riskCap / (slDistancePips * valuePerPip));
        } else {
          // FIXED_LOT
          volume = params.positionSizeValue;
        }

        activePosition = {
          direction: entrySignal,
          entryPrice,
          entryBarIndex: i,
          volume,
          stopLoss,
          takeProfit,
          isOutOfSample,
        };
      }
    }

    // Keep Daily track of equity for drawdown calculations
    dailyEquityTracker.push(currentCapital);

    if (currentCapital > runningPeak) runningPeak = currentCapital;
    const currentDrawdown = ((runningPeak - currentCapital) / runningPeak) * 100;

    // Track equity curve data point
    equityCurve.push({
      timestamp: new Date(bar.time).toLocaleDateString(),
      totalEquity: Number(currentCapital.toFixed(2)),
      trainEquity: !isOutOfSample ? Number(currentCapital.toFixed(2)) : equityCurve[equityCurve.length - 1]?.trainEquity || params.startingCapital,
      testEquity: isOutOfSample ? Number(currentCapital.toFixed(2)) : params.startingCapital,
      drawdownPct: Number(currentDrawdown.toFixed(2)),
      isOutOfSample,
    });
  }

  // Segment trades
  const trainTrades = trades.filter((t) => !t.isOutOfSample);
  const testTrades = trades.filter((t) => t.isOutOfSample);

  // Group equity tracker by sample
  const trainEquity = dailyEquityTracker.slice(0, Math.floor(dailyEquityTracker.length * (params.trainTestSplit / 100)));
  const testEquity = dailyEquityTracker.slice(Math.floor(dailyEquityTracker.length * (params.trainTestSplit / 100)));

  const overallMetrics = calculateMetricsBreakdown(trades, params.startingCapital, currentCapital, dailyEquityTracker);
  const trainMetrics = calculateMetricsBreakdown(trainTrades, params.startingCapital, trainEquity[trainEquity.length - 1] || params.startingCapital, trainEquity);
  const testMetrics = calculateMetricsBreakdown(testTrades, trainEquity[trainEquity.length - 1] || params.startingCapital, currentCapital, testEquity);

  // Parse monthly returns
  const monthlyMap = new Map<string, number>();
  const monthlyPlMap = new Map<string, number>();

  for (const t of trades) {
    const yearMonth = t.exitTime.substring(0, 7); // "YYYY-MM"
    monthlyPlMap.set(yearMonth, (monthlyPlMap.get(yearMonth) || 0) + t.netPl);
  }

  const monthlyReturns = Array.from(monthlyPlMap.entries()).map(([yearMonth, netPl]) => {
    return {
      yearMonth,
      netPl: Number(netPl.toFixed(2)),
      returnPct: Number(((netPl / params.startingCapital) * 100).toFixed(2)),
    };
  }).sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));

  // Determine Overfitting Diagnosis
  const overfitting = diagnoseOverfitting(trainMetrics, testMetrics, strategy);

  return {
    params,
    strategyName: strategy.name,
    overall: overallMetrics,
    trainMetrics,
    testMetrics,
    trades,
    equityCurve,
    monthlyReturns,
    overfitting,
  };
}

/**
 * Mathematical diagnostics to identify Overfitting / Data Snooping.
 */
function diagnoseOverfitting(
  train: MetricBreakdown,
  test: MetricBreakdown,
  strategy: UserStrategy
): OverfittingDiagnosis {
  const factors: { name: string; description: string; status: 'PASS' | 'WARNING' | 'FAIL'; value: string }[] = [];
  let scorePoints = 0; // out of 100 max penalty

  // Factor 1: Out-of-sample Performance Decay
  const trainSharpe = train.sharpeRatio;
  const testSharpe = test.sharpeRatio;
  let decayStatus: 'PASS' | 'WARNING' | 'FAIL' = 'PASS';
  let decayValue = `Train: ${trainSharpe.toFixed(2)}, Test: ${testSharpe.toFixed(2)}`;

  if (trainSharpe > 1.2 && testSharpe < 0.2) {
    decayStatus = 'FAIL';
    scorePoints += 45;
    decayValue += ' (Severe Decay >80%)';
  } else if (trainSharpe > 1.0 && testSharpe < trainSharpe * 0.5) {
    decayStatus = 'WARNING';
    scorePoints += 25;
    decayValue += ' (Moderate Decay)';
  }
  factors.push({
    name: 'OOS Performance Decay',
    description: 'Compares Sharpe ratio between Training (In-Sample) and Testing (Out-of-Sample) splits.',
    status: decayStatus,
    value: decayValue,
  });

  // Factor 2: Trade Count Sufficiency
  const totalTrades = train.tradeCount + test.tradeCount;
  let countStatus: 'PASS' | 'WARNING' | 'FAIL' = 'PASS';
  if (totalTrades < 15) {
    countStatus = 'FAIL';
    scorePoints += 35;
  } else if (totalTrades < 30) {
    countStatus = 'WARNING';
    scorePoints += 15;
  }
  factors.push({
    name: 'Sample Size Adequacy',
    description: 'Requires a minimum of 30 trades to be statistically reliable and valid.',
    status: countStatus,
    value: `${totalTrades} total trades`,
  });

  // Factor 3: Parameter/Rules Complexity
  const ruleCount = strategy.entryConditions.length + strategy.exitConditions.length + (strategy.filters?.length || 0);
  let complexityStatus: 'PASS' | 'WARNING' | 'FAIL' = 'PASS';
  if (ruleCount > 6) {
    complexityStatus = 'FAIL';
    scorePoints += 20;
  } else if (ruleCount > 4) {
    complexityStatus = 'WARNING';
    scorePoints += 10;
  }
  factors.push({
    name: 'Rule Set Complexity',
    description: 'Measures strategy logic complexity. Too many filters increase curve-fitting risk.',
    status: complexityStatus,
    value: `${ruleCount} active rules`,
  });

  // Calculate overall verdict
  let riskScore: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  let verdict = 'The strategy demonstrates strong out-of-sample stability with healthy trading density.';

  if (scorePoints >= 55) {
    riskScore = 'HIGH';
    verdict = 'CRITICAL: Severe overfitting detected. High risk of curve-fitting during the backtest phase; live deployment will likely fail.';
  } else if (scorePoints >= 25) {
    riskScore = 'MEDIUM';
    verdict = 'WARNING: Mild overfitting signs detected. Consider simplifying entry rules or testing across broader date spans.';
  }

  return {
    riskScore,
    scorePct: Math.min(100, scorePoints),
    factors,
    verdict,
  };
}
