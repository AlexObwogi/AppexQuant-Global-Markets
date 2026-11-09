/**
 * Quantis FX - Quick Strategy Setup Template Modal
 * Enables rapid 3-step configuration for automated Deriv trading:
 * - Market & Contract Selection
 * - Money Management & Risk Thresholds
 * - Instant Generation into Active Execution Engine
 */

import React, { useState } from 'react';
import { useQuantis } from '../../../state/QuantisContext.tsx';
import {
  Zap,
  X,
  Play,
  TrendingUp,
  ShieldAlert,
  ArrowRight,
  Sliders,
  DollarSign,
  CheckCircle2,
} from 'lucide-react';

export const QuickStrategyModal: React.FC = () => {
  const { isQuickStrategyModalOpen, setQuickStrategyModalOpen, startExecution } = useQuantis();

  const [market, setMarket] = useState('R_100');
  const [contractType, setContractType] = useState<'CALL' | 'PUT' | 'DIGITEVEN' | 'DIGITODD' | 'DIGITOVER'>('CALL');
  const [baseStake, setBaseStake] = useState(1.0);
  const [multiplier, setMultiplier] = useState(2.0);
  const [takeProfit, setTakeProfit] = useState(10.0);
  const [stopLoss, setStopLoss] = useState(20.0);
  const [digitPrediction, setDigitPrediction] = useState(4);

  if (!isQuickStrategyModalOpen) return null;

  const handleLaunch = () => {
    const config = {
      name: `Quick ${market} (${contractType})`,
      source: 'QUICK_STRAT' as const,
      market,
      contractType,
      baseStake,
      recoveryMultiplier: multiplier,
      takeProfit,
      stopLoss,
      rulesSummary: `Quick setup on ${market}. Initial stake $${baseStake}, ${multiplier}x recovery, TP $${takeProfit}, SL $${stopLoss}.`,
    };

    startExecution(config);
    setQuickStrategyModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Quick Strategy</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Rapid Template
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Deploy an automated trading rule in 30 seconds.
              </p>
            </div>
          </div>
          <button
            onClick={() => setQuickStrategyModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4">
          {/* Step 1: Market & Contract */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              1. Select Asset &amp; Direction
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">Volatility Index</label>
                <select
                  value={market}
                  onChange={(e) => setMarket(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  <option value="R_10">Volatility 10 Index</option>
                  <option value="R_25">Volatility 25 Index</option>
                  <option value="R_50">Volatility 50 Index</option>
                  <option value="R_75">Volatility 75 Index</option>
                  <option value="R_100">Volatility 100 Index</option>
                  <option value="1HZ100V">Volatility 100 (1s) Index</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">Contract Mode</label>
                <select
                  value={contractType}
                  onChange={(e) => setContractType(e.target.value as any)}
                  className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  <option value="CALL">Rise (Higher)</option>
                  <option value="PUT">Fall (Lower)</option>
                  <option value="DIGITEVEN">Digit Even</option>
                  <option value="DIGITODD">Digit Odd</option>
                  <option value="DIGITOVER">Digit Over</option>
                </select>
              </div>
            </div>

            {contractType === 'DIGITOVER' && (
              <div className="pt-1">
                <label className="text-[11px] text-slate-400 mb-1 block">Prediction Digit (Over X):</label>
                <div className="flex space-x-1.5">
                  {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDigitPrediction(d)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors cursor-pointer ${
                        digitPrediction === d
                          ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Capital & Recovery */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              2. Money Management &amp; Risk Guard
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">Base Stake (USD)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.35"
                  max="50"
                  value={baseStake}
                  onChange={(e) => setBaseStake(Number(e.target.value) || 0.5)}
                  className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 font-bold focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">Recovery Multiplier</label>
                <select
                  value={multiplier}
                  onChange={(e) => setMultiplier(Number(e.target.value))}
                  className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  <option value={1.0}>1.0x (Flat / No Martingale)</option>
                  <option value={1.5}>1.5x (Gentle Recovery)</option>
                  <option value={2.0}>2.0x (Standard Martingale)</option>
                  <option value={2.1}>2.1x (Aggressive Edge)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">Take Profit Target ($)</label>
                <input
                  type="number"
                  step="5"
                  min="5"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(Number(e.target.value) || 5)}
                  className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-emerald-400 font-bold focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">Hard Stop Loss ($)</label>
                <input
                  type="number"
                  step="5"
                  min="10"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(Number(e.target.value) || 10)}
                  className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-rose-400 font-bold focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Quick Summary Pill */}
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 text-[11px] text-slate-400 flex items-center justify-between font-mono">
            <span>Risk Ratio: 1 : {(takeProfit / stopLoss).toFixed(2)}</span>
            <span className="text-cyan-400 font-bold">Auto-Halt on TP/SL</span>
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleLaunch}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Generate &amp; Launch Strategy</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
