/**
 * AppexQuant Markets Global - Phase 3 Signal Card Component
 * Displays actionable AI market analysis with Risk-to-Reward verification & confidence scoring.
 */

import React from 'react';
import { SignalObject } from '../../types/aiIntelligence';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, ShieldAlert, ArrowRight, Activity, Clock } from 'lucide-react';

interface SignalCardProps {
  signal: SignalObject;
  onSelect: (signal: SignalObject) => void;
}

export const SignalCard: React.FC<SignalCardProps> = ({ signal, onSelect }) => {
  const isLong = signal.direction === 'LONG';
  const isShort = signal.direction === 'SHORT';
  const isActive = signal.status === 'ACTIVE';
  const isStale = signal.status === 'STALE';
  const isRejected = signal.status === 'REJECTED';

  return (
    <div
      onClick={() => onSelect(signal)}
      className={`group relative rounded-xl border p-5 transition-all duration-300 cursor-pointer bg-[#131822] hover:bg-[#1B2230] ${
        isActive
          ? 'border-[#1E293B] hover:border-[#38BDF8]/40 shadow-lg hover:shadow-[0_0_20px_rgba(56,189,248,0.15)]'
          : isStale
          ? 'border-amber-500/30 bg-amber-950/10'
          : 'border-red-500/30 bg-red-950/10 opacity-80'
      }`}
    >
      {/* Top Banner: Symbol, Direction, Status Badge */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
              isLong
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : isShort
                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                : 'bg-bg-hover text-text-secondary'
            }`}
          >
            {isLong ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-100 text-base group-hover:text-[#38BDF8] transition-colors">
                {signal.symbolName}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-bg-hover text-text-secondary font-mono">
                {signal.timeframe}
              </span>
            </div>
            <p className="text-xs text-text-secondary font-mono">{signal.symbol}</p>
          </div>
        </div>

        {/* Confidence Gauge */}
        <div className="text-right">
          <div className="text-xs text-text-secondary font-medium mb-0.5">Confidence</div>
          <div className="flex items-center space-x-1 justify-end">
            <span
              className={`font-mono text-base font-bold ${
                signal.confidence >= 75
                  ? 'text-emerald-400'
                  : signal.confidence >= 60
                  ? 'text-[#38BDF8]'
                  : 'text-amber-400'
              }`}
            >
              {signal.confidence}%
            </span>
          </div>
        </div>
      </div>

      {/* Entry Zone & Targets Grid */}
      <div className="grid grid-cols-3 gap-2 bg-[#0B0E14] p-3 rounded-lg border border-[#1E293B] mb-4 text-xs font-mono">
        <div>
          <span className="text-text-secondary text-[10px] block">ENTRY ZONE</span>
          <span className="text-slate-200 font-semibold">
            {signal.entryZone.min.toFixed(4)}
          </span>
        </div>
        <div>
          <span className="text-rose-400 text-[10px] block">STOP LOSS</span>
          <span className="text-rose-300 font-semibold">{signal.stopLoss.toFixed(4)}</span>
        </div>
        <div>
          <span className="text-emerald-400 text-[10px] block">TARGET</span>
          <span className="text-emerald-300 font-semibold">{signal.takeProfit.toFixed(4)}</span>
        </div>
      </div>

      {/* R:R Guardrail & Market Context Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-t border-[#1E293B] pt-3">
        <div className="flex items-center space-x-2">
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[11px] border border-emerald-500/20">
            R:R 1:{signal.riskRewardRatio}
          </span>
          <span className="px-2 py-0.5 rounded bg-bg-hover text-text-primary text-[11px]">
            {signal.patternDetected}
          </span>
        </div>

        <div className="flex items-center text-text-secondary text-[11px] space-x-1">
          <Clock className="w-3 h-3 text-text-secondary" />
          <span>{signal.dataFreshness.isStale ? 'STALE' : 'LIVE'}</span>
        </div>
      </div>

      {/* Rejection / Safety Alert Bar */}
      {isRejected && (
        <div className="mt-3 p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
          <span className="truncate">{signal.rejectionReason}</span>
        </div>
      )}

      {/* Action Prompt */}
      <div className="mt-4 flex items-center justify-between text-xs text-[#38BDF8] font-medium group-hover:translate-x-1 transition-transform">
        <span>View Explainable AI Reasoning</span>
        <ArrowRight className="w-4 h-4" />
      </div>
    </div>
  );
};
