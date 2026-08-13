import { TradeJournalRecord, AnalyticsSummary } from '../types/analytics';

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
    
    const holdingTimeMin = Math.round((new Date(t.exitTime).getTime() - new Date(t.entryTime).getTime()) / 60000);
    sumHoldingTime += holdingTimeMin;
    
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

  // Profit Factor
  const profitFactor = grossLosses > 0 ? Number((grossProfits / grossLosses).toFixed(2)) : Number(grossProfits.toFixed(2));

  // Sharpe Ratio
  const averagePnL = sumPnl / count;
  const variance = pnls.reduce((acc, p) => acc + Math.pow(p - averagePnL, 2), 0) / count;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? Number((averagePnL / stdDev).toFixed(3)) : 0;

  // Sortino Ratio
  const downsideSqDiffSum = pnls.reduce((acc, p) => p < 0 ? acc + Math.pow(p - 0, 2) : acc, 0);
  const downsideDev = Math.sqrt(downsideSqDiffSum / count);
  const sortinoRatio = downsideDev > 0 ? Number((averagePnL / downsideDev).toFixed(3)) : 0;

  // Max Drawdown & Balance Curve Walk
  // Sort trades chronologically ascending to evaluate the peak and drop
  const sortedTrades = [...trades].sort((a, b) => new Date(a.exitTime).getTime() - new Date(b.exitTime).getTime());
  let runningBalance = 100000;
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

  const maxDrawdown = Number(maxDrawdownAmount.toFixed(2));

  // Recovery Factor
  const recoveryFactor = maxDrawdown > 0 ? Number((sumPnl / maxDrawdown).toFixed(2)) : Number(sumPnl.toFixed(2));

  // Expectancy
  const expectancy = Number(((winRate * averageWinner) - (lossRate * averageLoser)).toFixed(2));

  // Average R
  const averageR = Number((sumR / count).toFixed(2));

  // Trade Frequency (trades per day over range)
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

    // Hour
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
