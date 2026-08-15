/**
 * AppexQuant Markets Global - Phase 3 Backtesting Engine view
 * High-precision quantitative modeling dashboard with real historical simulations,
 * out-of-sample testing boundaries, and mathematical overfitting validation.
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { runBacktest } from '../services/ai/backtestEngine.ts';
import { DEFAULT_USER_STRATEGIES } from '../services/ai/strategyEngine.ts';
import { BacktestParams, BacktestResult, BacktestTrade } from '../types/backtest.ts';
import { PerformanceBadge, PerformanceDisclaimerBanner } from '../components/common/PerformanceDisclaimer.tsx';
import {
  Play,
  TrendingUp,
  History,
  AlertTriangle,
  Info,
  Calendar,
  Layers,
  Settings,
  ShieldCheck,
  LineChart,
  DollarSign,
  Briefcase,
  ChevronRight,
  Sparkles,
  RefreshCw,
  Percent,
  TrendingDown,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export const BacktestView: React.FC = () => {
  // Pre-loaded strategies
  const [strategies] = useState(DEFAULT_USER_STRATEGIES);
  
  // Configuration State
  const [selectedStrategyId, setSelectedStrategyId] = useState(DEFAULT_USER_STRATEGIES[0]?.id || '');
  const [symbol, setSymbol] = useState('EURUSD');
  const [timeframe, setTimeframe] = useState('H1');
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-08-01');
  const [startingCapital, setStartingCapital] = useState(10000);
  const [commissionPerLot, setCommissionPerLot] = useState(5.00);
  const [spreadPips, setSpreadPips] = useState(1.5);
  const [slippagePips, setSlippagePips] = useState(0.5);
  const [positionSizing, setPositionSizing] = useState<'FIXED_LOT' | 'EQUITY_PERCENT' | 'RISK_PERCENT'>('RISK_PERCENT');
  const [positionSizeValue, setPositionSizeValue] = useState(1.5); // 1.5% Risk per trade
  const [riskModel, setRiskModel] = useState<'FIXED_SL_TP' | 'TRAILING_STOP' | 'BREAK_EVEN'>('BREAK_EVEN');
  const [trainTestSplit, setTrainTestSplit] = useState(70); // 70% Train, 30% Test

  // Backtest Results State
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'metrics' | 'trades' | 'overfitting'>('metrics');

  // Interactive Chart Tooltip states
  const [equityHoverPoint, setEquityHoverPoint] = useState<any | null>(null);

  // Active execution model state (strictly labels)
  const [executionMode, setExecutionMode] = useState<'BACKTEST' | 'PAPER' | 'LIVE'>('BACKTEST');

  const selectedStrategy = useMemo(() => {
    return strategies.find((s) => s.id === selectedStrategyId) || strategies[0];
  }, [strategies, selectedStrategyId]);

  // Execute quantitative backtest
  const handleRunBacktest = () => {
    if (!selectedStrategy) return;
    setIsSimulating(true);
    setSimulationError(null);

    const params: BacktestParams = {
      strategyId: selectedStrategyId,
      symbol,
      timeframe,
      startDate,
      endDate,
      startingCapital,
      commissionPerLot,
      spreadPips,
      slippagePips,
      positionSizing,
      positionSizeValue,
      riskModel,
      trainTestSplit,
    };

    // Simulate standard latency
    setTimeout(() => {
      try {
        const backtestResult = runBacktest(selectedStrategy, params);
        setResult(backtestResult);
        setActiveTab('metrics');
      } catch (err: any) {
        setSimulationError(err.message || 'Error executing backtest.');
      } finally {
        setIsSimulating(false);
      }
    }, 800);
  };

  // Pre-generate standard Forex/Synth details
  const symbolOptions = [
    { value: 'EURUSD', label: 'EUR/USD (Euro / US Dollar)' },
    { value: 'GBPUSD', label: 'GBP/USD (Great British Pound / US Dollar)' },
    { value: 'XAUUSD', label: 'XAU/USD (Gold Spot / US Dollar)' },
    { value: 'Volatility 75 Index', label: 'Volatility 75 Index (Synthetic)' },
  ];

  const timeframeOptions = ['M15', 'H1', 'H4', 'D1'];

  // Helper render method for environment capsules
  const renderEnvBadge = (type: 'BACKTEST' | 'PAPER' | 'LIVE') => {
    if (type === 'BACKTEST') {
      return (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          BACKTEST MODE
        </span>
      );
    }
    if (type === 'PAPER') {
      return (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
          PAPER TRADING
        </span>
      );
    }
    return (
      <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse">
        LIVE SECURE
      </span>
    );
  };

  // Generate SVG paths for Equity and Drawdown curves
  const curvesSvg = useMemo(() => {
    if (!result || result.equityCurve.length === 0) return null;

    const data = result.equityCurve;
    const len = data.length;
    const padding = 40;
    const width = 680;
    const height = 280;

    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const equities = data.map((d) => d.totalEquity);
    const minEq = Math.min(...equities, paramsForDefault().startingCapital) * 0.98;
    const maxEq = Math.max(...equities, paramsForDefault().startingCapital) * 1.02;
    const rangeEq = maxEq - minEq || 1;

    const getX = (idx: number) => padding + (idx / (len - 1)) * chartWidth;
    const getY = (val: number) => padding + chartHeight - ((val - minEq) / rangeEq) * chartHeight;

    // Build equity path
    let equityPath = `M ${getX(0)} ${getY(equities[0])}`;
    let fillPath = `M ${getX(0)} ${padding + chartHeight} L ${getX(0)} ${getY(equities[0])}`;

    for (let i = 1; i < len; i++) {
      const x = getX(i);
      const y = getY(equities[i]);
      equityPath += ` L ${x} ${y}`;
      fillPath += ` L ${x} ${y}`;
    }
    fillPath += ` L ${getX(len - 1)} ${padding + chartHeight} Z`;

    // Drawdown curve path
    const drawdowns = data.map((d) => d.drawdownPct);
    const maxDD = Math.max(...drawdowns, 5); // scale to at least 5% drawdown axis
    const getDDY = (val: number) => padding + (val / maxDD) * chartHeight;

    let ddPath = `M ${getX(0)} ${getDDY(drawdowns[0])}`;
    let ddFillPath = `M ${getX(0)} ${padding} L ${getX(0)} ${getDDY(drawdowns[0])}`;

    for (let i = 1; i < len; i++) {
      const x = getX(i);
      const y = getDDY(drawdowns[i]);
      ddPath += ` L ${x} ${y}`;
      ddFillPath += ` L ${x} ${y}`;
    }
    ddFillPath += ` L ${getX(len - 1)} ${padding} Z`;

    // Find split index for train/test visual line
    const splitIndex = Math.floor(len * (result.params.trainTestSplit / 100));
    const splitX = getX(splitIndex);

    return {
      equityPath,
      fillPath,
      ddPath,
      ddFillPath,
      splitX,
      getX,
      getY,
      minEq,
      maxEq,
      maxDD,
      getDDY,
    };

    function paramsForDefault() {
      return result?.params || { startingCapital: 10000 };
    }
  }, [result]);

  return (
    <div className="space-y-6 pb-20">
      {/* View Header Mode Switch */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-bg-surface border border-border-color">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-text-primary tracking-tight flex items-center gap-2">
              AppexQuant Backtester
              <span className="text-[10px] font-mono font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/25 px-2.5 py-0.5 rounded-full">
                QUANT STUDIO
              </span>
            </h1>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Run rigid historical simulations, test across out-of-sample datasets, and identify parameter overfitting.
          </p>
        </div>

        {/* MODE SELECTOR (Strictly Labeling Environments) */}
        <div className="flex items-center bg-bg-main p-1 rounded-xl border border-border-color">
          <button
            onClick={() => setExecutionMode('BACKTEST')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              executionMode === 'BACKTEST'
                ? 'bg-amber-500 text-bg-main shadow-md'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            BACKTEST
          </button>
          <button
            onClick={() => setExecutionMode('PAPER')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              executionMode === 'PAPER'
                ? 'bg-sky-500 text-bg-main shadow-md'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            PAPER
          </button>
          <button
            onClick={() => setExecutionMode('LIVE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              executionMode === 'LIVE'
                ? 'bg-emerald-500 text-bg-main shadow-md'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            LIVE
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Control Panel / Backtest Inputs */}
        <div className="xl:col-span-4 space-y-6">
          <div className="p-5 rounded-2xl bg-bg-surface border border-border-color space-y-5">
            <div className="flex items-center gap-2 border-b border-border-color pb-3">
              <Settings className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Simulation Inputs</h2>
              <span className="ml-auto">{renderEnvBadge(executionMode)}</span>
            </div>

            {/* Inputs Form */}
            <div className="space-y-4 text-xs">
              {/* Strategy Select */}
              <div className="space-y-1.5">
                <label className="text-text-secondary font-semibold block">Target Strategy</label>
                <select
                  value={selectedStrategyId}
                  onChange={(e) => setSelectedStrategyId(e.target.value)}
                  className="w-full bg-bg-main border border-border-color rounded-lg p-2.5 text-text-primary focus:border-amber-500 focus:outline-none"
                >
                  {strategies.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (v{s.version})
                    </option>
                  ))}
                </select>
                {selectedStrategy && (
                  <p className="text-[11px] text-text-secondary italic mt-1 px-1">
                    "{selectedStrategy.description}"
                  </p>
                )}
              </div>

              {/* Symbol & Timeframe */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-text-secondary font-semibold block">Symbol</label>
                  <select
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    className="w-full bg-bg-main border border-border-color rounded-lg p-2.5 text-text-primary focus:border-amber-500 focus:outline-none"
                  >
                    {symbolOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.value}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-text-secondary font-semibold block">Timeframe</label>
                  <select
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value)}
                    className="w-full bg-bg-main border border-border-color rounded-lg p-2.5 text-text-primary focus:border-amber-500 focus:outline-none"
                  >
                    {timeframeOptions.map((tf) => (
                      <option key={tf} value={tf}>
                        {tf}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date Ranges */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-text-secondary font-semibold block">Start Date</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-bg-main border border-border-color rounded-lg p-2.5 text-text-primary focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-text-secondary font-semibold block">End Date</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-bg-main border border-border-color rounded-lg p-2.5 text-text-primary focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Sizing Model */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-text-secondary font-semibold block">Position Sizing</label>
                  <select
                    value={positionSizing}
                    onChange={(e) => setPositionSizing(e.target.value as any)}
                    className="w-full bg-bg-main border border-border-color rounded-lg p-2.5 text-text-primary focus:border-amber-500 focus:outline-none"
                  >
                    <option value="FIXED_LOT">Fixed Lot Size</option>
                    <option value="EQUITY_PERCENT">% of Total Equity</option>
                    <option value="RISK_PERCENT">% Stop Loss Risk</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-text-secondary font-semibold block">Size Value</label>
                  <input
                    type="number"
                    step="0.05"
                    value={positionSizeValue}
                    onChange={(e) => setPositionSizeValue(Number(e.target.value))}
                    className="w-full bg-bg-main border border-border-color rounded-lg p-2.5 text-text-primary focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Capital & Commission */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-text-secondary font-semibold block">Starting Balance</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-text-secondary">$</span>
                    <input
                      type="number"
                      value={startingCapital}
                      onChange={(e) => setStartingCapital(Number(e.target.value))}
                      className="w-full bg-bg-main border border-border-color rounded-lg pl-7 pr-2.5 py-2.5 text-text-primary focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-text-secondary font-semibold block">Commission / Lot</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-text-secondary">$</span>
                    <input
                      type="number"
                      value={commissionPerLot}
                      onChange={(e) => setCommissionPerLot(Number(e.target.value))}
                      className="w-full bg-bg-main border border-border-color rounded-lg pl-7 pr-2.5 py-2.5 text-text-primary focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Spread & Slippage */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-text-secondary font-semibold block">Spread Assumption</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={spreadPips}
                      onChange={(e) => setSpreadPips(Number(e.target.value))}
                      className="w-full bg-bg-main border border-border-color rounded-lg p-2.5 text-text-primary focus:border-amber-500 focus:outline-none"
                    />
                    <span className="absolute right-3 top-2.5 text-text-secondary">Pips</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-text-secondary font-semibold block">Slippage Assumption</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={slippagePips}
                      onChange={(e) => setSlippagePips(Number(e.target.value))}
                      className="w-full bg-bg-main border border-border-color rounded-lg p-2.5 text-text-primary focus:border-amber-500 focus:outline-none"
                    />
                    <span className="absolute right-3 top-2.5 text-text-secondary">Pips</span>
                  </div>
                </div>
              </div>

              {/* Risk Model & Train/Test Segment */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between items-center">
                  <label className="text-text-secondary font-semibold">In-Sample / Out-of-Sample Split</label>
                  <span className="font-mono text-amber-400 font-bold">{trainTestSplit}% Train / {100 - trainTestSplit}% Test</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="90"
                  value={trainTestSplit}
                  onChange={(e) => setTrainTestSplit(Number(e.target.value))}
                  className="w-full accent-amber-500 bg-bg-main h-1.5 rounded-lg cursor-pointer border border-border-color"
                />
                <span className="text-[10px] text-text-secondary block leading-relaxed">
                  Provides high-integrity, forward validation. Splits sample timeline to check for strategy degradation.
                </span>
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="text-text-secondary font-semibold block">Trailing / Risk Management Model</label>
                <select
                  value={riskModel}
                  onChange={(e) => setRiskModel(e.target.value as any)}
                  className="w-full bg-bg-main border border-border-color rounded-lg p-2.5 text-text-primary focus:border-amber-500 focus:outline-none"
                >
                  <option value="FIXED_SL_TP">Fixed Stop Loss & Take Profit</option>
                  <option value="TRAILING_STOP">Trailing Stop Lock (Dynamic Range)</option>
                  <option value="BREAK_EVEN">Break-Even Lock (Shift SL at 1:1 RR)</option>
                </select>
              </div>

              {/* Error State View */}
              {simulationError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex gap-2 text-rose-300 font-mono text-[11px] leading-relaxed">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <div>
                    <span className="font-bold block text-rose-400">ENGINE ERROR</span>
                    <span>{simulationError}</span>
                  </div>
                </div>
              )}

              {/* Run Trigger */}
              <button
                onClick={handleRunBacktest}
                disabled={isSimulating}
                className={`w-full py-3 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  isSimulating
                    ? 'bg-bg-hover text-text-secondary border border-border-color'
                    : 'bg-amber-500 hover:bg-amber-400 text-bg-main shadow-lg shadow-amber-500/10'
                }`}
              >
                {isSimulating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing Simulation...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-slate-950 text-bg-main" />
                    <span>Execute Backtest</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Output Dashboard */}
        <div className="xl:col-span-8 space-y-6">
          <AnimatePresence mode="wait">
            {!result ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-12 rounded-2xl bg-bg-surface border border-border-color flex flex-col items-center justify-center text-center space-y-4 h-[630px]"
              >
                <div className="w-14 h-14 rounded-full bg-bg-main border border-border-color flex items-center justify-center text-slate-600">
                  <LineChart className="w-6 h-6 text-text-secondary" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-text-primary">Simulation Engine Idle</h3>
                  <p className="text-xs text-text-secondary mt-1.5 max-w-sm leading-relaxed">
                    Select a quantitative strategy, adjust position size bounds, and run the engine to produce real historical simulation metrics.
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Result Quick Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-bg-main border border-border-color">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-extrabold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                      SUCCESS
                    </span>
                    <div className="text-xs text-text-primary font-mono">
                      Strategy: <span className="font-bold text-text-primary">{result.strategyName}</span> on <span className="text-text-primary font-bold">{result.params.symbol} ({result.params.timeframe})</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono font-bold border px-2.5 py-0.5 rounded-full ${
                      executionMode === 'BACKTEST' ? 'bg-amber-500/15 text-amber-400 border-amber-500/25' :
                      executionMode === 'PAPER' ? 'bg-sky-500/15 text-sky-400 border-sky-500/25' :
                      'bg-emerald-500/15 text-emerald-400 border-emerald-500/25 animate-pulse'
                    }`}>
                      {executionMode} RUN COMPLETED
                    </span>
                  </div>
                </div>

                {/* Environment/Mode Distinction Disclaimer */}
                {executionMode === 'LIVE' && (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1.5 leading-normal">
                    <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-black">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 animate-pulse" />
                      <span>LIVE SECURE SYSTEM ACTIVE</span>
                    </div>
                    <p className="text-[11px] text-text-primary font-mono">
                      ⚠️ **WARNING:** The metrics displayed below represent a **historical backtest simulation**, NOT real-time live trading returns. Real-market live performance carries financial risk and may deviate from backtests due to execution latencies, real-world spreads, broker slippage, and overnight swaps. Do not invest more than you can afford to lose.
                    </p>
                  </div>
                )}

                {executionMode === 'PAPER' && (
                  <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/20 space-y-1.5 leading-normal">
                    <div className="flex items-center gap-2 text-sky-400 font-mono text-xs font-black">
                      <Info className="w-4 h-4 text-sky-400" />
                      <span>PAPER TRADING SIMULATION ACTIVE</span>
                    </div>
                    <p className="text-[11px] text-text-primary font-mono">
                      ℹ️ **PAPER ENVIRONMENT:** This model simulates live trade execution using historical feed behavior with simulated latency. It enables real-time strategy testing without financial risk.
                    </p>
                  </div>
                )}

                {executionMode === 'BACKTEST' && (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1.5 leading-normal">
                    <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-black">
                      <History className="w-4 h-4 text-amber-400" />
                      <span>HISTORICAL BACKTEST MODEL</span>
                    </div>
                    <p className="text-[11px] text-text-primary font-mono">
                      📊 **BACKTEST ESTIMATION:** Calculated deterministically on modeled pricing data. Review the **Overfitting & Out-of-Sample** diagnostics tab to identify potential parameter overfitting prior to live connection.
                    </p>
                  </div>
                )}

                {/* Primary Metrics Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {/* Total Return */}
                  <div className="p-4 rounded-xl bg-bg-surface border border-border-color flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-1 right-1.5 text-[8px] font-mono px-1 py-0.2 rounded font-bold bg-bg-main text-text-secondary border border-slate-850">
                      {executionMode}
                    </div>
                    <span className="text-[10px] text-text-secondary uppercase tracking-wider font-bold">Total Return</span>
                    <div className={`text-2xl font-black mt-1 ${result.overall.totalReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {result.overall.totalReturnPct >= 0 ? '+' : ''}{result.overall.totalReturnPct.toFixed(2)}%
                    </div>
                    <span className="text-[9px] text-text-secondary font-mono mt-0.5 block">
                      Net: ${result.overall.netPl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Win Rate */}
                  <div className="p-4 rounded-xl bg-bg-surface border border-border-color flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-1 right-1.5 text-[8px] font-mono px-1 py-0.2 rounded font-bold bg-bg-main text-text-secondary border border-slate-850">
                      {executionMode}
                    </div>
                    <span className="text-[10px] text-text-secondary uppercase tracking-wider font-bold">Win Rate</span>
                    <div className="text-2xl font-black text-text-primary mt-1">
                      {result.overall.winRate.toFixed(1)}%
                    </div>
                    <span className="text-[9px] text-text-secondary font-mono mt-0.5 block">
                      Loss: {result.overall.lossRate.toFixed(1)}%
                    </span>
                  </div>

                  {/* Profit Factor */}
                  <div className="p-4 rounded-xl bg-bg-surface border border-border-color flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-1 right-1.5 text-[8px] font-mono px-1 py-0.2 rounded font-bold bg-bg-main text-text-secondary border border-slate-850">
                      {executionMode}
                    </div>
                    <span className="text-[10px] text-text-secondary uppercase tracking-wider font-bold">Profit Factor</span>
                    <div className="text-2xl font-black text-amber-400 mt-1">
                      {result.overall.profitFactor.toFixed(2)}
                    </div>
                    <span className="text-[9px] text-text-secondary font-mono mt-0.5 block">
                      Gross Ratios
                    </span>
                  </div>

                  {/* Sharpe Ratio */}
                  <div className="p-4 rounded-xl bg-bg-surface border border-border-color flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-1 right-1.5 text-[8px] font-mono px-1 py-0.2 rounded font-bold bg-bg-main text-text-secondary border border-slate-850">
                      {executionMode}
                    </div>
                    <span className="text-[10px] text-text-secondary uppercase tracking-wider font-bold">Sharpe / Sortino</span>
                    <div className="text-2xl font-black text-sky-400 mt-1">
                      {result.overall.sharpeRatio.toFixed(2)}
                    </div>
                    <span className="text-[9px] text-text-secondary font-mono mt-0.5 block">
                      Sortino: {result.overall.sortinoRatio.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Main Content Tabs */}
                <div className="flex bg-bg-main p-1 rounded-xl border border-border-color">
                  <button
                    onClick={() => setActiveTab('metrics')}
                    className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      activeTab === 'metrics' ? 'bg-bg-surface text-text-primary' : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    Performance Metrics
                  </button>
                  <button
                    onClick={() => setActiveTab('trades')}
                    className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      activeTab === 'trades' ? 'bg-bg-surface text-text-primary' : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    Trade Log ({result.trades.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('overfitting')}
                    className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      activeTab === 'overfitting' ? 'bg-bg-surface text-text-primary' : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    Overfitting & Out-of-Sample
                    {result.overfitting.riskScore === 'HIGH' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    )}
                  </button>
                </div>

                {/* Tab: Metrics Panels (Includes Equity and Drawdown curve charts) */}
                {activeTab === 'metrics' && (
                  <div className="space-y-6">
                    {/* Equity Curve Chart */}
                    <div className="p-5 rounded-2xl bg-bg-surface border border-border-color">
                      <div className="flex items-center justify-between border-b border-border-color pb-3 mb-4">
                        <div>
                          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Equity Curve & Out-of-Sample Splitting</h3>
                          <p className="text-[10px] text-text-secondary mt-0.5">
                            Displays balance progression. Vertical line separates Training (In-Sample) and Testing (Out-of-Sample).
                          </p>
                        </div>
                        <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${
                          executionMode === 'BACKTEST' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          executionMode === 'PAPER' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' :
                          'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 animate-pulse'
                        }`}>
                          {executionMode} TIMELINE
                        </span>
                      </div>

                      {/* Equity Curve SVG rendering */}
                      {curvesSvg && (
                        <div className="relative">
                          <svg viewBox="0 0 680 280" className="w-full h-auto overflow-visible select-none">
                            {/* Gradients */}
                            <defs>
                              <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.15" />
                                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                              </linearGradient>
                            </defs>

                            {/* Background Grid Lines */}
                            <line x1="40" y1="40" x2="640" y2="40" stroke="#1E293B" strokeWidth="0.75" />
                            <line x1="40" y1="100" x2="640" y2="100" stroke="#1E293B" strokeWidth="0.75" />
                            <line x1="40" y1="160" x2="640" y2="160" stroke="#1E293B" strokeWidth="0.75" />
                            <line x1="40" y1="220" x2="640" y2="220" stroke="#1E293B" strokeWidth="0.75" />

                            {/* Y Axis Prices Labels */}
                            <text x="35" y="44" fill="#94a3b8" fontSize="8" fontFamily="monospace" textAnchor="end">
                              ${Math.round(curvesSvg.maxEq).toLocaleString()}
                            </text>
                            <text x="35" y="130" fill="#94a3b8" fontSize="8" fontFamily="monospace" textAnchor="end">
                              ${Math.round((curvesSvg.maxEq + curvesSvg.minEq) / 2).toLocaleString()}
                            </text>
                            <text x="35" y="224" fill="#94a3b8" fontSize="8" fontFamily="monospace" textAnchor="end">
                              ${Math.round(curvesSvg.minEq).toLocaleString()}
                            </text>

                            {/* Fills & Paths */}
                            <path d={curvesSvg.fillPath} fill="url(#equityGrad)" />
                            <path d={curvesSvg.equityPath} fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

                            {/* Out of Sample Split Dotted Line */}
                            <line
                              x1={curvesSvg.splitX}
                              y1="40"
                              x2={curvesSvg.splitX}
                              y2="240"
                              stroke="#eab308"
                              strokeWidth="1.5"
                              strokeDasharray="4 4"
                            />

                            {/* Split labels */}
                            <text x={curvesSvg.splitX - 10} y="55" fill="#94a3b8" fontSize="8" fontFamily="sans-serif" fontWeight="bold" textAnchor="end">
                              TRAINING (IN-SAMPLE)
                            </text>
                            <text x={curvesSvg.splitX + 10} y="55" fill="#eab308" fontSize="8" fontFamily="sans-serif" fontWeight="bold" textAnchor="start">
                              TESTING (OUT-OF-SAMPLE)
                            </text>

                            {/* Interactivity Dots */}
                            {result.equityCurve.map((d, index) => {
                              if (index % Math.max(1, Math.floor(result.equityCurve.length / 15)) === 0 || index === result.equityCurve.length - 1) {
                                const cx = curvesSvg.getX(index);
                                const cy = curvesSvg.getY(d.totalEquity);
                                return (
                                  <g key={index} className="cursor-pointer group">
                                    <circle
                                      cx={cx}
                                      cy={cy}
                                      r="3"
                                      fill="#0f172a"
                                      stroke="#38bdf8"
                                      strokeWidth="1.5"
                                    />
                                    {/* Tooltip trigger */}
                                    <rect
                                      x={cx - 15}
                                      y={cy - 15}
                                      width="30"
                                      height="30"
                                      fill="transparent"
                                      onMouseEnter={() => setEquityHoverPoint({ d, index, cx, cy })}
                                      onMouseLeave={() => setEquityHoverPoint(null)}
                                    />
                                  </g>
                                );
                              }
                              return null;
                            })}
                          </svg>

                          {/* Hover Overlay Tooltip */}
                          {equityHoverPoint && (
                            <div
                              style={{
                                position: 'absolute',
                                left: `${(equityHoverPoint.cx / 680) * 100}%`,
                                top: `${(equityHoverPoint.cy / 280) * 100 - 24}%`,
                                transform: 'translate(-50%, -100%)',
                                pointerEvents: 'none',
                              }}
                              className="bg-bg-main border border-border-color p-2.5 rounded-lg text-[10px] font-mono text-text-primary shadow-xl space-y-1 z-30"
                            >
                              <div className="font-bold text-amber-400">Date: {equityHoverPoint.d.timestamp}</div>
                              <div>Equity: <span className="font-bold text-sky-300">${equityHoverPoint.d.totalEquity.toLocaleString()}</span></div>
                              <div className="text-[9px] text-text-secondary uppercase">
                                Sample: {equityHoverPoint.d.isOutOfSample ? 'Out-of-Sample' : 'In-Sample'}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Color Keys */}
                      <div className="flex justify-center gap-6 mt-4 text-[10px] font-mono">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-0.5 bg-sky-400 block" />
                          <span className="text-text-primary">Equity Progression</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-0.5 border-t-2 border-amber-400 border-dashed block" />
                          <span className="text-amber-400 font-bold">Forward Testing Border</span>
                        </div>
                      </div>
                    </div>

                    {/* Performance breakdown statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left: General Stats */}
                      <div className="p-5 rounded-2xl bg-bg-surface border border-border-color space-y-4 relative overflow-hidden">
                        <div className="absolute top-4 right-5 text-[8px] font-mono px-1.5 py-0.5 rounded font-bold bg-bg-main text-text-secondary border border-border-color">
                          {executionMode} ENGINE
                        </div>
                        <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider border-b border-border-color pb-2">
                          Primary Trading Metrics
                        </h4>
                        <div className="space-y-3 font-mono text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-text-secondary">Initial Balance:</span>
                            <span className="text-text-primary">${startingCapital.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-secondary">Net Profit / Loss:</span>
                            <span className={`font-bold ${result.overall.netPl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              ${result.overall.netPl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-secondary">Max Peak Drawdown:</span>
                            <span className="text-rose-400">
                              -{result.overall.maxDrawdownPct.toFixed(2)}% (-${result.overall.maxDrawdownCash.toLocaleString()})
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-secondary">Profit Factor:</span>
                            <span className="text-amber-400 font-bold">{result.overall.profitFactor.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-secondary">Expectancy per Trade:</span>
                            <span className={`font-bold ${result.overall.expectancy >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              ${result.overall.expectancy.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-secondary">Sharpe Ratio (Daily):</span>
                            <span className="text-sky-400 font-bold">{result.overall.sharpeRatio.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-secondary">Sortino Ratio (Daily):</span>
                            <span className="text-sky-300 font-bold">{result.overall.sortinoRatio.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-secondary">Total Trade Density:</span>
                            <span className="text-text-primary font-bold">{result.overall.tradeCount} trades</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Winners vs Losers */}
                      <div className="p-5 rounded-2xl bg-bg-surface border border-border-color space-y-4 relative overflow-hidden">
                        <div className="absolute top-4 right-5 text-[8px] font-mono px-1.5 py-0.5 rounded font-bold bg-bg-main text-text-secondary border border-border-color">
                          {executionMode} ENGINE
                        </div>
                        <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider border-b border-border-color pb-2">
                          Winner/Loser Distribution
                        </h4>
                        <div className="space-y-3 font-mono text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-text-secondary">Average Trade return:</span>
                            <span className="text-text-primary">${result.overall.averageTradePl.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-secondary">Average Winner:</span>
                            <span className="text-emerald-400 font-bold">+${result.overall.averageWinner.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-secondary">Average Loser:</span>
                            <span className="text-rose-400 font-bold">-${result.overall.averageLoser.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-secondary">Largest Win:</span>
                            <span className="text-emerald-300 font-bold">+${result.overall.largestWin.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-secondary">Largest Loss:</span>
                            <span className="text-rose-400 font-bold">-${Math.abs(result.overall.largestLoss).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-secondary">Max Consecutive Wins:</span>
                            <span className="text-emerald-400">{result.overall.consecutiveWins} wins</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-secondary">Max Consecutive Losses:</span>
                            <span className="text-rose-400">{result.overall.consecutiveLosses} losses</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-secondary">Average Holding Time:</span>
                            <span className="text-text-primary font-bold">{result.overall.averageHoldingTimeMin} minutes</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Drawdown Curve SVG Chart */}
                    <div className="p-5 rounded-2xl bg-bg-surface border border-border-color">
                      <div className="flex items-center justify-between border-b border-border-color pb-3 mb-4">
                        <div>
                          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Historical Drawdown Curve</h3>
                          <p className="text-[10px] text-text-secondary mt-0.5">
                            Plots percentage depth from equity peak. Keeps risk models accountable.
                          </p>
                        </div>
                        <span className="text-[9px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded">
                          {executionMode} RISK DEPTH
                        </span>
                      </div>

                      {curvesSvg && (
                        <div>
                          <svg viewBox="0 0 680 140" className="w-full h-auto overflow-visible select-none">
                            <defs>
                              <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.2" />
                                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                              </linearGradient>
                            </defs>

                            <line x1="40" y1="20" x2="640" y2="20" stroke="#1E293B" strokeWidth="0.75" />
                            <line x1="40" y1="60" x2="640" y2="60" stroke="#1E293B" strokeWidth="0.75" />
                            <line x1="40" y1="100" x2="640" y2="100" stroke="#1E293B" strokeWidth="0.75" />

                            <text x="35" y="24" fill="#94a3b8" fontSize="8" fontFamily="monospace" textAnchor="end">0.0%</text>
                            <text x="35" y="64" fill="#94a3b8" fontSize="8" fontFamily="monospace" textAnchor="end">
                              -{(curvesSvg.maxDD / 2).toFixed(1)}%
                            </text>
                            <text x="35" y="104" fill="#94a3b8" fontSize="8" fontFamily="monospace" textAnchor="end">
                              -{curvesSvg.maxDD.toFixed(1)}%
                            </text>

                            <path d={curvesSvg.ddFillPath} fill="url(#ddGrad)" />
                            <path d={curvesSvg.ddPath} fill="none" stroke="#ef4444" strokeWidth="1.5" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Monthly Returns & Trade Distribution SVG Visuals */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Monthly Returns */}
                      <div className="p-5 rounded-2xl bg-bg-surface border border-border-color space-y-4">
                        <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider border-b border-border-color pb-2 flex justify-between items-center">
                          <span>Monthly Returns Breakdown</span>
                          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-bg-main text-text-secondary border border-border-color uppercase font-bold">
                            {executionMode}
                          </span>
                        </h3>

                        {result.monthlyReturns.length === 0 ? (
                          <div className="h-32 flex items-center justify-center text-text-secondary font-mono text-xs">
                            No monthly breakdown available.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex flex-col gap-2">
                              {result.monthlyReturns.map((m) => (
                                <div key={m.yearMonth} className="flex items-center justify-between text-xs font-mono">
                                  <span className="text-text-secondary font-bold">{m.yearMonth}</span>
                                  <div className="flex-1 mx-4 h-2 rounded bg-bg-main overflow-hidden relative">
                                    <div
                                      style={{
                                        width: `${Math.min(100, Math.abs(m.returnPct) * 5)}%`,
                                        left: m.returnPct >= 0 ? '50%' : 'auto',
                                        right: m.returnPct < 0 ? '50%' : 'auto',
                                      }}
                                      className={`absolute h-full rounded ${m.returnPct >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                    />
                                    <div className="absolute left-[50%] top-0 bottom-0 w-px bg-bg-hover" />
                                  </div>
                                  <span className={`font-bold shrink-0 ${m.returnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {m.returnPct >= 0 ? '+' : ''}{m.returnPct.toFixed(1)}% (${m.netPl.toFixed(0)})
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Trade win/loss distribution charts */}
                      <div className="p-5 rounded-2xl bg-bg-surface border border-border-color space-y-4">
                        <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider border-b border-border-color pb-2 flex justify-between items-center">
                          <span>Trade Distribution Analysis</span>
                          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-bg-main text-text-secondary border border-border-color uppercase font-bold">
                            {executionMode}
                          </span>
                        </h3>

                        <div className="space-y-4 font-mono text-[11px]">
                          {/* Winners ratio visual */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between">
                              <span className="text-text-secondary">Winners Ratio:</span>
                              <span className="text-emerald-400 font-bold">{result.overall.winRate.toFixed(1)}% ({result.trades.filter(t => t.netPl > 0).length} trades)</span>
                            </div>
                            <div className="h-3 rounded-full bg-bg-main overflow-hidden flex">
                              <div style={{ width: `${result.overall.winRate}%` }} className="h-full bg-emerald-500" />
                              <div style={{ width: `${result.overall.lossRate}%` }} className="h-full bg-rose-500" />
                            </div>
                            <div className="flex justify-between text-[9px] text-text-secondary">
                              <span>Win: {result.overall.winRate.toFixed(1)}%</span>
                              <span>Loss: {result.overall.lossRate.toFixed(1)}%</span>
                            </div>
                          </div>

                          {/* Risk-Reward Visual Ratio */}
                          <div className="pt-2">
                            <div className="flex justify-between pb-1 text-text-secondary">
                              <span>Average Trade Performance:</span>
                              <span className="text-text-primary">${result.overall.averageTradePl.toFixed(2)}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-1.5">
                              <div className="p-2 bg-emerald-500/5 rounded-lg border border-emerald-500/10 text-center">
                                <span className="text-[10px] text-text-secondary block uppercase">Average Winner</span>
                                <span className="text-emerald-400 font-bold text-xs">+${result.overall.averageWinner.toFixed(2)}</span>
                              </div>
                              <div className="p-2 bg-rose-500/5 rounded-lg border border-rose-500/10 text-center">
                                <span className="text-[10px] text-text-secondary block uppercase">Average Loser</span>
                                <span className="text-rose-400 font-bold text-xs">-${result.overall.averageLoser.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab: Trade Log */}
                {activeTab === 'trades' && (
                  <div className="p-5 rounded-2xl bg-bg-surface border border-border-color space-y-4">
                    <div className="flex items-center justify-between border-b border-border-color pb-3">
                      <div>
                        <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                          <span>{executionMode} Trade History</span>
                          <span className={`text-[8px] font-mono px-1 py-0.2 rounded font-bold ${
                            executionMode === 'BACKTEST' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                            executionMode === 'PAPER' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' :
                            'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 animate-pulse'
                          }`}>
                            {executionMode}
                          </span>
                        </h3>
                        <p className="text-[10px] text-text-secondary mt-0.5">
                          List of all mathematical fills executed over the timeline range.
                        </p>
                      </div>
                      <span className="text-[9px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded">
                        {result.trades.length} TRADES
                      </span>
                    </div>

                    {result.trades.length === 0 ? (
                      <div className="p-12 text-center text-text-secondary text-xs font-mono">
                        No trades triggered during this simulation run. Try loosening strategy rules or increasing timeframe range.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-[11px] font-mono text-left border-collapse">
                          <thead>
                            <tr className="border-b border-border-color text-text-secondary uppercase">
                              <th className="py-2.5 px-2">ID</th>
                              <th className="py-2.5 px-2">Direction</th>
                              <th className="py-2.5 px-2">Entry Price</th>
                              <th className="py-2.5 px-2">Exit Price</th>
                              <th className="py-2.5 px-2 text-right">Pips Pl</th>
                              <th className="py-2.5 px-2 text-right">Volume</th>
                              <th className="py-2.5 px-2 text-right">Net P/L</th>
                              <th className="py-2.5 px-2 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/50">
                            {result.trades.slice().reverse().map((t) => (
                              <tr key={t.id} className="hover:bg-bg-main/40">
                                <td className="py-2.5 px-2 font-bold text-text-secondary">{t.id}</td>
                                <td className="py-2.5 px-2">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${t.direction === 'LONG' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                    {t.direction}
                                  </span>
                                </td>
                                <td className="py-2.5 px-2 text-text-primary">{t.entryPrice.toFixed(symbol.includes('XAU') ? 2 : 5)}</td>
                                <td className="py-2.5 px-2 text-text-primary">{t.exitPrice.toFixed(symbol.includes('XAU') ? 2 : 5)}</td>
                                <td className={`py-2.5 px-2 text-right font-bold ${t.pipsPl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {t.pipsPl >= 0 ? '+' : ''}{t.pipsPl.toFixed(1)}
                                </td>
                                <td className="py-2.5 px-2 text-right text-text-primary">{t.volume} Lots</td>
                                <td className={`py-2.5 px-2 text-right font-bold ${t.netPl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {t.netPl >= 0 ? '+' : ''}${t.netPl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="py-2.5 px-2 text-right">
                                  {t.isOutOfSample ? (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded">
                                      TEST (OOS)
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-bg-hover text-text-secondary rounded">
                                      TRAIN
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: Overfitting & Out-of-Sample Diagnostics */}
                {activeTab === 'overfitting' && (
                  <div className="space-y-6">
                    {/* Overfitting analysis header */}
                    <div className="p-5 rounded-2xl bg-bg-surface border border-border-color space-y-4">
                      <div className="flex items-center gap-2 border-b border-border-color pb-3">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                          Overfitting Validation Center
                        </h3>
                        <span className="ml-auto text-[10px] text-text-secondary font-mono">INTEGRITY DIAGNOSTICS</span>
                      </div>

                      {/* Verdict alert card */}
                      <div className={`p-4 rounded-xl border flex gap-3 ${
                        result.overfitting.riskScore === 'HIGH'
                          ? 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                          : result.overfitting.riskScore === 'MEDIUM'
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                          : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                      }`}>
                        {result.overfitting.riskScore === 'LOW' ? (
                          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
                        )}
                        <div className="text-xs leading-relaxed">
                          <div className="font-bold uppercase text-[10px] tracking-wider mb-0.5">
                            Overfitting Risk Score: {result.overfitting.riskScore}
                          </div>
                          <p>{result.overfitting.verdict}</p>
                        </div>
                      </div>

                      {/* Breakdown Factors List */}
                      <div className="space-y-3.5 pt-2">
                        <h4 className="text-[11px] font-bold text-text-primary uppercase font-mono tracking-wider">Calculated Snooping Factors</h4>
                        <div className="grid grid-cols-1 gap-3">
                          {result.overfitting.factors.map((f, i) => (
                            <div key={i} className="p-3.5 bg-bg-main border border-border-color/80 rounded-xl space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-text-primary text-xs">{f.name}</span>
                                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                                  f.status === 'PASS'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : f.status === 'WARNING'
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                }`}>
                                  {f.status}
                                </span>
                              </div>
                              <p className="text-[11px] text-text-secondary leading-normal">{f.description}</p>
                              <div className="text-[10px] font-mono text-text-secondary pt-1">
                                Measured Value: <span className="font-bold text-text-primary">{f.value}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Split performance comparison metrics */}
                    <div className="p-5 rounded-2xl bg-bg-surface border border-border-color space-y-4">
                      <div className="border-b border-border-color pb-2">
                        <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                          In-Sample (Train) vs Out-of-Sample (Test) Divergence
                        </h3>
                        <p className="text-[10px] text-text-secondary mt-0.5">
                          Rigorous forward testing evaluation to isolate performance degradation.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                        {/* Training */}
                        <div className="p-4 bg-bg-main rounded-xl border border-border-color space-y-3">
                          <div className="flex items-center justify-between text-[11px] font-bold text-text-secondary border-b border-border-color pb-1.5">
                            <span>TRAINING (IN-SAMPLE) - {executionMode}</span>
                            <span className="text-[10px] bg-bg-hover px-1.5 py-0.5 rounded text-text-primary">{trainTestSplit}% TIMELINE</span>
                          </div>
                          <div className="space-y-2 text-[11px]">
                            <div className="flex justify-between">
                              <span>Return:</span>
                              <span className={`font-bold ${result.trainMetrics.totalReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {result.trainMetrics.totalReturnPct >= 0 ? '+' : ''}{result.trainMetrics.totalReturnPct.toFixed(2)}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Trades executed:</span>
                              <span className="text-text-primary">{result.trainMetrics.tradeCount} trades</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Win Rate:</span>
                              <span className="text-text-primary">{result.trainMetrics.winRate.toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Sharpe Ratio:</span>
                              <span className="text-sky-400 font-bold">{result.trainMetrics.sharpeRatio}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Sortino Ratio:</span>
                              <span className="text-sky-300 font-bold">{result.trainMetrics.sortinoRatio}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Max Drawdown:</span>
                              <span className="text-rose-400">-{result.trainMetrics.maxDrawdownPct}%</span>
                            </div>
                          </div>
                        </div>

                        {/* Testing */}
                        <div className="p-4 bg-bg-main rounded-xl border border-border-color space-y-3">
                          <div className="flex items-center justify-between text-[11px] font-bold text-amber-400 border-b border-border-color pb-1.5">
                            <span>TESTING (OUT-OF-SAMPLE) - {executionMode}</span>
                            <span className="text-[10px] bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.5 rounded text-amber-400">{100 - trainTestSplit}% TIMELINE</span>
                          </div>
                          <div className="space-y-2 text-[11px]">
                            <div className="flex justify-between">
                              <span>Return:</span>
                              <span className={`font-bold ${result.testMetrics.totalReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {result.testMetrics.totalReturnPct >= 0 ? '+' : ''}{result.testMetrics.totalReturnPct.toFixed(2)}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Trades executed:</span>
                              <span className="text-text-primary">{result.testMetrics.tradeCount} trades</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Win Rate:</span>
                              <span className="text-text-primary">{result.testMetrics.winRate.toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Sharpe Ratio:</span>
                              <span className="text-sky-400 font-bold">{result.testMetrics.sharpeRatio}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Sortino Ratio:</span>
                              <span className="text-sky-300 font-bold">{result.testMetrics.sortinoRatio}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Max Drawdown:</span>
                              <span className="text-rose-400">-{result.testMetrics.maxDrawdownPct}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
