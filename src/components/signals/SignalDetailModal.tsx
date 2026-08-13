/**
 * AppexQuant Markets Global - Phase 3 Signal Detail & Reasoning Modal
 * Complete explainable AI workspace for inspecting signal logic, evidence, invalidation & audit trails.
 */

import React from 'react';
import { SignalObject } from '../../types/aiIntelligence';
import { X, ShieldCheck, AlertCircle, BarChart3, Database, Layers, Check, Clock, Cpu, ExternalLink } from 'lucide-react';

interface SignalDetailModalProps {
  signal: SignalObject | null;
  onClose: () => void;
}

export const SignalDetailModal: React.FC<SignalDetailModalProps> = ({ signal, onClose }) => {
  if (!signal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[#131822] border border-[#1E293B] rounded-2xl shadow-2xl p-6 sm:p-8 text-slate-100">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/20">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-bold text-white">{signal.symbolName}</h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#38BDF8]/15 text-[#38BDF8] font-mono border border-[#38BDF8]/30">
                  {signal.direction} {signal.confidence}%
                </span>
              </div>
              <p className="text-xs text-text-secondary font-mono">{signal.symbol} • {signal.timeframe} Timeframe</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-text-secondary hover:text-white hover:bg-bg-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Real Money Safety & Execution Warning Banner */}
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center space-x-3 mb-6">
          <AlertCircle className="w-5 h-5 shrink-0 text-amber-400" />
          <div>
            <span className="font-bold block">ANALYSIS ONLY — AUTOMATIC REAL-MONEY EXECUTION HALTED</span>
            <span>AI market signals are generated for informational analysis. Real trade execution requires manual confirmation.</span>
          </div>
        </div>

        {/* Risk & Target Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 font-mono text-xs">
          <div className="bg-[#0B0E14] p-3.5 rounded-xl border border-[#1E293B]">
            <span className="text-text-secondary block text-[10px]">ENTRY MIN/MAX</span>
            <span className="text-sm font-bold text-slate-100">{signal.entryZone.min.toFixed(4)}</span>
          </div>
          <div className="bg-[#0B0E14] p-3.5 rounded-xl border border-rose-500/20">
            <span className="text-rose-400 block text-[10px]">INVALIDATION (SL)</span>
            <span className="text-sm font-bold text-rose-300">{signal.stopLoss.toFixed(4)}</span>
          </div>
          <div className="bg-[#0B0E14] p-3.5 rounded-xl border border-emerald-500/20">
            <span className="text-emerald-400 block text-[10px]">TARGET (TP)</span>
            <span className="text-sm font-bold text-emerald-300">{signal.takeProfit.toFixed(4)}</span>
          </div>
          <div className="bg-[#0B0E14] p-3.5 rounded-xl border border-[#38BDF8]/20">
            <span className="text-[#38BDF8] block text-[10px]">RISK : REWARD</span>
            <span className="text-sm font-bold text-[#38BDF8]">1 : {signal.riskRewardRatio}</span>
          </div>
        </div>

        {/* Explainable Timeline: How This Analysis Was Formed */}
        <div className="mb-6">
          <h4 className="text-sm font-bold text-slate-200 mb-3 flex items-center space-x-2">
            <Layers className="w-4 h-4 text-[#38BDF8]" />
            <span>How This Analysis Was Formed (Explainable Intelligence)</span>
          </h4>

          <div className="space-y-3 text-xs">
            <div className="bg-[#0B0E14] p-3.5 rounded-xl border border-[#1E293B]">
              <span className="font-bold text-[#38BDF8] block mb-1">1. Market Structure & Setup</span>
              <p className="text-text-primary">{signal.reasoning.what}</p>
            </div>

            <div className="bg-[#0B0E14] p-3.5 rounded-xl border border-[#1E293B]">
              <span className="font-bold text-emerald-400 block mb-1">2. Core Supporting Evidence</span>
              <p className="text-text-primary">{signal.reasoning.why}</p>
            </div>

            <div className="bg-[#0B0E14] p-3.5 rounded-xl border border-rose-500/20">
              <span className="font-bold text-rose-400 block mb-1">3. Invalidation Rules</span>
              <p className="text-text-primary">{signal.reasoning.invalidation}</p>
            </div>

            <div className="bg-[#0B0E14] p-3.5 rounded-xl border border-[#1E293B]">
              <span className="font-bold text-text-primary block mb-1">4. Historical Similarity Data</span>
              <p className="text-text-primary">{signal.reasoning.dataEvidence}</p>
            </div>
          </div>
        </div>

        {/* Deterministic Confidence Score Breakdown */}
        <div className="bg-[#0B0E14] p-4 rounded-xl border border-[#1E293B] mb-6">
          <h4 className="text-xs font-bold text-text-primary mb-3 flex items-center justify-between">
            <span>Deterministic Evidence Model Breakdown</span>
            <span className="font-mono text-[#38BDF8]">{signal.confidence}% Total</span>
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono">
            <div className="bg-[#131822] p-2 rounded border border-[#1E293B]">
              <span className="text-text-secondary block">Structure</span>
              <span className="text-emerald-400 font-bold">{signal.confidenceBreakdown.marketStructure} pts</span>
            </div>
            <div className="bg-[#131822] p-2 rounded border border-[#1E293B]">
              <span className="text-text-secondary block">Pattern Quality</span>
              <span className="text-emerald-400 font-bold">{signal.confidenceBreakdown.patternSimilarity} pts</span>
            </div>
            <div className="bg-[#131822] p-2 rounded border border-[#1E293B]">
              <span className="text-text-secondary block">News Sentiment</span>
              <span className="text-emerald-400 font-bold">{signal.confidenceBreakdown.sentimentAlignment} pts</span>
            </div>
            <div className="bg-[#131822] p-2 rounded border border-[#1E293B]">
              <span className="text-text-secondary block">DXY Context</span>
              <span className="text-emerald-400 font-bold">{signal.confidenceBreakdown.dxyAlignment} pts</span>
            </div>
            <div className="bg-[#131822] p-2 rounded border border-[#1E293B]">
              <span className="text-text-secondary block">Volatility</span>
              <span className="text-emerald-400 font-bold">{signal.confidenceBreakdown.volatilitySuitability} pts</span>
            </div>
            <div className="bg-[#131822] p-2 rounded border border-[#1E293B]">
              <span className="text-text-secondary block">Data Quality</span>
              <span className="text-emerald-400 font-bold">{signal.confidenceBreakdown.dataQuality} pts</span>
            </div>
          </div>
        </div>

        {/* Audit Trail Metadata */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-text-secondary font-mono border-t border-[#1E293B] pt-4">
          <div>Engine Version: {signal.modelVersion}</div>
          <div>Generated At: {new Date(signal.generatedAt).toLocaleTimeString()}</div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-8 py-2.5 rounded-xl bg-[#38BDF8] text-bg-main font-bold text-xs hover:bg-[#0284C7] transition-colors"
          >
            Close Workspace
          </button>
        </div>
      </div>
    </div>
  );
};
