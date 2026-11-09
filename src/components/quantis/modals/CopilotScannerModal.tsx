/**
 * Quantis FX - Copilot Scanner Modal
 * Sequence rotators and Over/Under automated engines:
 * - Dynamic asset rotation across Volatility Indices (R_10, R_25, R_50, R_75, R_100)
 * - Digit momentum scanner tracking statistical skew
 * - Automated adaptive execution trigger
 */

import React, { useState } from 'react';
import { useQuantis } from '../../../state/QuantisContext.tsx';
import {
  Compass,
  X,
  Play,
  RotateCw,
  TrendingUp,
  Percent,
  CheckCircle2,
  Sliders,
  Sparkles,
} from 'lucide-react';

export const CopilotScannerModal: React.FC = () => {
  const { isCopilotModalOpen, setCopilotModalOpen, startExecution } = useQuantis();

  const [copilotMode, setCopilotMode] = useState<'SEQUENCE_ROTATOR' | 'OVER_UNDER_ENGINE'>('SEQUENCE_ROTATOR');
  const [rotationTrigger, setRotationTrigger] = useState<'AFTER_LOSS' | 'AFTER_WIN' | 'EVERY_3_TRADES'>('AFTER_LOSS');
  const [stake, setStake] = useState(1.5);
  const [targetDigits, setTargetDigits] = useState<number[]>([2, 7]);
  const [takeProfit, setTakeProfit] = useState(25.0);

  if (!isCopilotModalOpen) return null;

  const handleLaunchCopilot = () => {
    const config = {
      name: `Copilot Scanner: ${copilotMode === 'SEQUENCE_ROTATOR' ? 'Multi-Asset Rotator' : 'Over/Under Digit Momentum'}`,
      source: 'COPILOT' as const,
      market: 'R_100',
      contractType: copilotMode === 'SEQUENCE_ROTATOR' ? 'CALL' : 'DIGITOVER',
      baseStake: stake,
      recoveryMultiplier: 1.8,
      takeProfit,
      stopLoss: 30.0,
      rulesSummary: copilotMode === 'SEQUENCE_ROTATOR'
        ? `Asset sequence rotation trigger: ${rotationTrigger}. Rotates Volatility indices upon condition.`
        : `Over/Under momentum scanner targeting probability cluster digits [${targetDigits.join(', ')}].`,
    };

    startExecution(config);
    setCopilotModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Copilot Scanner</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  Adaptive AI
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Sequence rotators and Over/Under automated engines.
              </p>
            </div>
          </div>
          <button
            onClick={() => setCopilotModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4">
          {/* Mode Selector */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 border border-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setCopilotMode('SEQUENCE_ROTATOR')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                copilotMode === 'SEQUENCE_ROTATOR'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sequence Rotator
            </button>
            <button
              type="button"
              onClick={() => setCopilotMode('OVER_UNDER_ENGINE')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                copilotMode === 'OVER_UNDER_ENGINE'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Over / Under Engine
            </button>
          </div>

          {copilotMode === 'SEQUENCE_ROTATOR' ? (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Rotation Asset Ring
                </span>
                <div className="flex items-center space-x-1.5 text-xs font-mono">
                  {['R_10', 'R_25', 'R_50', 'R_75', 'R_100'].map((sym, i) => (
                    <span key={sym} className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-cyan-400">
                      {sym} {i < 4 ? '→' : '↻'}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500">
                  Shifts active asset sequentially to bypass local volatility clustering.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
                  Rotation Trigger Event
                </label>
                <select
                  value={rotationTrigger}
                  onChange={(e) => setRotationTrigger(e.target.value as any)}
                  className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-purple-500"
                >
                  <option value="AFTER_LOSS">Rotate Market Immediately on Loss</option>
                  <option value="AFTER_WIN">Rotate Market Following Win</option>
                  <option value="EVERY_3_TRADES">Rotate Every 3 Completed Trades</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Over / Under Skew Scanner
                </span>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Monitors the last 15 ticks for digit imbalances. When digits 0-3 exceed 55% of occurrences, the engine enters an <strong>Over 4</strong> position expecting regression to the mean.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block uppercase">Signal Threshold</span>
                  <strong className="text-purple-400">&gt; 55% Imbalance</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block uppercase">Contract Target</span>
                  <strong className="text-slate-100">Digit Over 4</strong>
                </div>
              </div>
            </div>
          )}

          {/* Capital Setup */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
            <div>
              <label className="text-[11px] text-slate-400 mb-1 block">Base Stake (USD)</label>
              <input
                type="number"
                step="0.5"
                min="0.35"
                value={stake}
                onChange={(e) => setStake(Number(e.target.value) || 1.0)}
                className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-100 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 mb-1 block">Take Profit (USD)</label>
              <input
                type="number"
                step="5"
                min="5"
                value={takeProfit}
                onChange={(e) => setTakeProfit(Number(e.target.value) || 10)}
                className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Launch Trigger */}
          <button
            type="button"
            onClick={handleLaunchCopilot}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-purple-600/20 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 fill-current" />
            <span>Engage Copilot Automation</span>
          </button>
        </div>
      </div>
    </div>
  );
};
