/**
 * Quantis FX - Auto Pilot (Automated Strategy Rules Engine) Modal
 * Configures automated bot parameters for Volatility Indices:
 * - Base Stake (USD)
 * - Recovery Multiplier (Martingale / D'Alembert parameters)
 * - Take Profit (USD) & hard Stop Loss (USD)
 * - Max Consecutive Loss Circuit Breaker
 */

import React, { useState } from 'react';
import { useQuantis } from '../../../state/QuantisContext.tsx';
import {
  Cpu,
  X,
  Play,
  ShieldAlert,
  Percent,
  SlidersHorizontal,
  DollarSign,
  AlertOctagon,
  TrendingUp,
} from 'lucide-react';

export const AutoPilotModal: React.FC = () => {
  const { isAutoPilotModalOpen, setAutoPilotModalOpen, startExecution } = useQuantis();

  const [market, setMarket] = useState('R_100');
  const [baseStake, setBaseStake] = useState(1.0);
  const [recoveryType, setRecoveryType] = useState<'MARTINGALE' | 'DALEMBERT'>('MARTINGALE');
  const [multiplier, setMultiplier] = useState(2.1);
  const [dalembertStep, setDalembertStep] = useState(1.0);
  const [takeProfit, setTakeProfit] = useState(20.0);
  const [stopLoss, setStopLoss] = useState(35.0);
  const [maxLossStreak, setMaxLossStreak] = useState(5);

  if (!isAutoPilotModalOpen) return null;

  const handleStartAutoPilot = () => {
    const config = {
      name: `Auto Pilot: ${market} (${recoveryType === 'MARTINGALE' ? `${multiplier}x Martingale` : `+$${dalembertStep} D'Alembert`})`,
      source: 'AUTO_PILOT' as const,
      market,
      contractType: 'CALL',
      baseStake,
      recoveryMultiplier: recoveryType === 'MARTINGALE' ? multiplier : 1.5,
      takeProfit,
      stopLoss,
      rulesSummary: `Automated ${recoveryType} rules engine on ${market}. Max loss streak circuit breaker set to ${maxLossStreak}.`,
    };

    startExecution(config);
    setAutoPilotModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Auto Pilot (Automated)</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Rules Engine
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Strategy rules engine for Volatility Indices with recovery modeling.
              </p>
            </div>
          </div>
          <button
            onClick={() => setAutoPilotModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4">
          {/* Target Volatility Index */}
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              Target Synthetic Asset
            </label>
            <select
              value={market}
              onChange={(e) => setMarket(e.target.value)}
              className="w-full h-11 px-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500"
            >
              <option value="R_10">Volatility 10 Index (Smooth)</option>
              <option value="R_25">Volatility 25 Index (Moderate)</option>
              <option value="R_50">Volatility 50 Index (Dynamic)</option>
              <option value="R_75">Volatility 75 Index (Volatile)</option>
              <option value="R_100">Volatility 100 Index (High Volatility)</option>
              <option value="1HZ100V">Volatility 100 (1s) Index (Ultra Fast)</option>
            </select>
          </div>

          {/* Money Management Mode */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Recovery Multiplier Algorithm
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRecoveryType('MARTINGALE')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  recoveryType === 'MARTINGALE'
                    ? 'bg-blue-600/15 border-blue-500 text-blue-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <div className="text-xs font-bold">Martingale Mode</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Exponential stake recovery (e.g. 2.1x)</div>
              </button>

              <button
                type="button"
                onClick={() => setRecoveryType('DALEMBERT')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  recoveryType === 'DALEMBERT'
                    ? 'bg-blue-600/15 border-blue-500 text-blue-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <div className="text-xs font-bold">D'Alembert Mode</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Linear step addition on loss (+$1)</div>
              </button>
            </div>
          </div>

          {/* Numeric Parameters */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-400 mb-1 block">Base Stake (USD)</label>
              <input
                type="number"
                step="0.5"
                min="0.35"
                value={baseStake}
                onChange={(e) => setBaseStake(Number(e.target.value) || 0.5)}
                className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 mb-1 block">
                {recoveryType === 'MARTINGALE' ? 'Multiplier (e.g. 2.1x)' : 'Linear Step ($)'}
              </label>
              {recoveryType === 'MARTINGALE' ? (
                <input
                  type="number"
                  step="0.1"
                  min="1.0"
                  max="4.0"
                  value={multiplier}
                  onChange={(e) => setMultiplier(Number(e.target.value) || 2.0)}
                  className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-100 focus:outline-none focus:border-blue-500"
                />
              ) : (
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={dalembertStep}
                  onChange={(e) => setDalembertStep(Number(e.target.value) || 1.0)}
                  className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-100 focus:outline-none focus:border-blue-500"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-400 mb-1 block">Take Profit (USD)</label>
              <input
                type="number"
                step="5"
                min="5"
                value={takeProfit}
                onChange={(e) => setTakeProfit(Number(e.target.value) || 5)}
                className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 mb-1 block">Hard Stop Loss (USD)</label>
              <input
                type="number"
                step="5"
                min="10"
                value={stopLoss}
                onChange={(e) => setStopLoss(Number(e.target.value) || 10)}
                className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-rose-400 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Circuit Breaker Safeguard */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
                <span>Consecutive Loss Circuit Breaker</span>
              </span>
              <span className="font-mono text-amber-400 font-bold">{maxLossStreak} Losses</span>
            </div>
            <input
              type="range"
              min="3"
              max="10"
              value={maxLossStreak}
              onChange={(e) => setMaxLossStreak(Number(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">
              Bot will automatically disengage if {maxLossStreak} consecutive losses occur to prevent Martingale cascade.
            </p>
          </div>

          {/* Launch Button */}
          <button
            type="button"
            onClick={handleStartAutoPilot}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Engage Auto Pilot Engine</span>
          </button>
        </div>
      </div>
    </div>
  );
};
