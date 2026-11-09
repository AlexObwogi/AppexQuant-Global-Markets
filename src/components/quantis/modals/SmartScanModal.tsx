/**
 * Quantis FX - Smart Scan (Manual Scanner) Modal
 * Setup interface for digit options:
 * - Even / Odd
 * - Over / Under
 * - Differs / Matches
 * - Rise / Fall
 * Features real-time digit frequency heat map and live sequence stream from Deriv tick data.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useQuantis } from '../../../state/QuantisContext.tsx';
import { useMarketData } from '../../../state/MarketDataContext.tsx';
import {
  Search,
  X,
  Play,
  Activity,
  Flame,
  Zap,
  BarChart2,
  TrendingUp,
  Target,
} from 'lucide-react';

export const SmartScanModal: React.FC = () => {
  const { isSmartScanModalOpen, setSmartScanModalOpen, triggerSmartScanManual } = useQuantis();
  const { ticks, selectedSymbol } = useMarketData();

  const [digitMode, setDigitMode] = useState<'EVEN_ODD' | 'OVER_UNDER' | 'DIFFERS' | 'RISE_FALL'>('EVEN_ODD');
  const [selectedSubOption, setSelectedSubOption] = useState<string>('EVEN');
  const [targetDigit, setTargetDigit] = useState<number>(5);
  const [baseStake, setBaseStake] = useState<number>(2.0);

  // Derive last 20 digits from live tick prices
  const currentTick = ticks['R_100'] || ticks[selectedSymbol] || { quote: 1245.83 };
  const rawQuote = currentTick ? currentTick.quote : 1245.83;

  // Generate deterministic recent digits based on tick fluctuations
  const [digitHistory, setDigitHistory] = useState<number[]>([4, 7, 2, 9, 0, 1, 6, 8, 3, 5, 2, 7, 8, 1, 4, 3, 9, 6, 0, 8]);

  useEffect(() => {
    if (rawQuote) {
      const lastDigitStr = rawQuote.toFixed(2).slice(-1);
      const digit = Number(lastDigitStr) || 0;
      setDigitHistory((prev) => [digit, ...prev.slice(0, 19)]);
    }
  }, [rawQuote]);

  // Digit frequency distribution calculation
  const digitCounts = useMemo(() => {
    const counts = Array(10).fill(0);
    digitHistory.forEach((d) => counts[d]++);
    return counts;
  }, [digitHistory]);

  const evenCount = digitHistory.filter((d) => d % 2 === 0).length;
  const oddCount = digitHistory.length - evenCount;
  const evenPct = Math.round((evenCount / digitHistory.length) * 100);

  if (!isSmartScanModalOpen) return null;

  const handleScanAndExecute = () => {
    triggerSmartScanManual(selectedSubOption, digitMode === 'OVER_UNDER' || digitMode === 'DIFFERS' ? targetDigit : undefined);
    setSmartScanModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Smart Scan (Manual)</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Digit Optics
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Setup interface for manual digit and momentum option triggers.
              </p>
            </div>
          </div>
          <button
            onClick={() => setSmartScanModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-xl">
            {(
              [
                { id: 'EVEN_ODD', label: 'Even / Odd' },
                { id: 'OVER_UNDER', label: 'Over / Under' },
                { id: 'DIFFERS', label: 'Differs' },
                { id: 'RISE_FALL', label: 'Rise / Fall' },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setDigitMode(m.id);
                  if (m.id === 'EVEN_ODD') setSelectedSubOption('EVEN');
                  if (m.id === 'OVER_UNDER') setSelectedSubOption('OVER');
                  if (m.id === 'DIFFERS') setSelectedSubOption('DIFFERS');
                  if (m.id === 'RISE_FALL') setSelectedSubOption('CALL');
                }}
                className={`py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer truncate ${
                  digitMode === m.id
                    ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Live Recent Digit Stream & Parity Bar */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>Live Recent Digit Sequence (Last 20)</span>
              </span>
              <span className="font-mono text-cyan-400 font-bold">
                Last: {digitHistory[0]}
              </span>
            </div>

            {/* Sequence Pills */}
            <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-1">
              {digitHistory.map((d, idx) => (
                <span
                  key={idx}
                  className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center font-mono text-xs font-bold border ${
                    idx === 0
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 ring-2 ring-cyan-500/30'
                      : d % 2 === 0
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  {d}
                </span>
              ))}
            </div>

            {/* Even vs Odd Distribution bar */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-[11px] font-mono text-slate-400">
                <span>EVEN: {evenPct}%</span>
                <span>ODD: {100 - evenPct}%</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
                <div
                  className="bg-blue-500 h-full transition-all duration-300"
                  style={{ width: `${evenPct}%` }}
                />
                <div
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${100 - evenPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Digit Frequency Heatmap */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Digit Frequency Matrix (0 - 9)
            </span>
            <div className="grid grid-cols-10 gap-1 text-center font-mono">
              {digitCounts.map((count, d) => (
                <div
                  key={d}
                  onClick={() => setTargetDigit(d)}
                  className={`p-2 rounded-lg border transition-all cursor-pointer ${
                    targetDigit === d
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold">{d}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{count}x</div>
                </div>
              ))}
            </div>
          </div>

          {/* Sub-Option Selector based on Mode */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Target Contract Condition
            </span>
            {digitMode === 'EVEN_ODD' && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSubOption('EVEN')}
                  className={`py-3 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                    selectedSubOption === 'EVEN'
                      ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/20'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  DIGIT EVEN (0, 2, 4, 6, 8)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSubOption('ODD')}
                  className={`py-3 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                    selectedSubOption === 'ODD'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-600/20'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  DIGIT ODD (1, 3, 5, 7, 9)
                </button>
              </div>
            )}

            {digitMode === 'OVER_UNDER' && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSubOption('OVER')}
                    className={`py-2.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                      selectedSubOption === 'OVER'
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-lg'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    OVER {targetDigit}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSubOption('UNDER')}
                    className={`py-2.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                      selectedSubOption === 'UNDER'
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-lg'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    UNDER {targetDigit}
                  </button>
                </div>
              </div>
            )}

            {digitMode === 'DIFFERS' && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono flex items-center justify-between">
                <span>Selected Prediction:</span>
                <span className="font-bold text-cyan-400">Last Digit != {targetDigit} (90.9% Payout)</span>
              </div>
            )}

            {digitMode === 'RISE_FALL' && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSubOption('CALL')}
                  className={`py-3 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                    selectedSubOption === 'CALL'
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-lg'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  RISE (HIGHER)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSubOption('PUT')}
                  className={`py-3 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                    selectedSubOption === 'PUT'
                      ? 'bg-rose-500 text-white border-rose-400 shadow-lg'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  FALL (LOWER)
                </button>
              </div>
            )}
          </div>

          {/* Stake Input */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400">Manual Stake Capital:</span>
            <div className="flex items-center space-x-1.5 font-mono">
              <span className="text-slate-500">$</span>
              <input
                type="number"
                step="0.5"
                min="0.35"
                max="50"
                value={baseStake}
                onChange={(e) => setBaseStake(Number(e.target.value) || 1.0)}
                className="w-20 bg-slate-900 border border-slate-700 px-2 py-1 rounded text-right font-bold text-xs text-white focus:outline-none focus:border-cyan-400"
              />
              <span className="text-xs text-slate-400">USD</span>
            </div>
          </div>

          {/* Launch Trigger */}
          <button
            type="button"
            onClick={handleScanAndExecute}
            className="w-full py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Execute Smart Scan Signal</span>
          </button>
        </div>
      </div>
    </div>
  );
};
