/**
 * AppexQuant Markets Global - Phase 3 AI Signal Card & Expanded Intelligence Workspace
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Signal } from '../../types/ai.ts';
import { AnimatedCounter } from '../common/AnimatedCounter.tsx';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  ChevronRight,
  Clock,
  Sparkles,
  Zap,
  Info,
  X,
  Layers,
  BarChart3,
  Globe2,
} from 'lucide-react';

interface SignalCardProps {
  signal: Signal;
  onSelectSymbol?: (symbol: string) => void;
}

export const SignalCard: React.FC<SignalCardProps> = ({ signal, onSelectSymbol }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeStepTab, setActiveStepTab] = useState<number>(0);

  const isLong = signal.direction === 'LONG';
  const isShort = signal.direction === 'SHORT';
  const isRejected = signal.status === 'REJECTED';
  const isStale = signal.status === 'STALE';

  const timelineSteps = [
    { title: 'Market Structure Detected', detail: `Structure: ${signal.marketStructure}. ${signal.reasoning.why}` },
    { title: 'Historical Patterns Evaluated', detail: `Pattern: ${signal.patternDetected}. Historical Sample Size: ${signal.historicalMatches?.sampleSize || 0} setups (${signal.historicalMatches?.conditionalFrequencyPct || 50}% positive outcomes).` },
    { title: 'Strategy Compatibility Evaluated', detail: `Strategy: ${signal.strategyName}. Rules & session windows verified.` },
    { title: 'News Sentiment Analyzed', detail: `Sentiment: ${signal.sentiment}. Context: ${signal.newsContext}` },
    { title: 'DXY Context Checked', detail: signal.dxyContext },
    { title: 'Risk/Reward Guardrail Validated', detail: `R:R Ratio 1:${signal.riskRewardRatio}. Verified strictly within 1:2.0 to 1:3.0 bounds.` },
    { title: 'Final AI Decision Generated', detail: signal.status === 'ACTIVE' ? `Active Signal Generated with ${signal.confidence}% Confidence` : `Signal Rejected: ${signal.rejectionReason}` },
  ];

  return (
    <>
      <motion.div
        whileHover={{ translateY: -2 }}
        className={`relative overflow-hidden rounded-xl border p-5 transition-all bg-bg-surface/80 backdrop-blur-md ${
          isRejected
            ? 'border-border-color text-text-secondary'
            : isStale
            ? 'border-amber-500/30 text-amber-200'
            : isLong
            ? 'border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.08)]'
            : 'border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.08)]'
        }`}
      >
        {/* Real Account Safety Indicator Banner */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-border-color/80 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-cyan-500 dark:text-cyan-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AppexQuant Intelligence</span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-bg-hover text-text-primary border border-border-color">
            AI Insight
          </span>
        </div>

        {/* Card Header: Symbol & Direction */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3
                onClick={() => onSelectSymbol && onSelectSymbol(signal.symbol)}
                className="text-lg font-bold text-text-primary tracking-wide cursor-pointer hover:text-cyan-500 transition-colors"
              >
                {signal.symbol}
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-bg-hover text-text-secondary font-medium">
                {signal.timeframe}
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">{signal.symbolName}</p>
          </div>

          <div className="text-right">
            {isRejected ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20">
                <XCircle className="w-3.5 h-3.5" />
                Filtered
              </span>
            ) : isStale ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <AlertTriangle className="w-3.5 h-3.5" />
                Awaiting Data
              </span>
            ) : isLong ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <TrendingUp className="w-3.5 h-3.5" />
                Long Bias
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/30">
                <TrendingDown className="w-3.5 h-3.5" />
                Short Bias
              </span>
            )}
          </div>
        </div>

        {/* Confidence & Key Metrics */}
        <div className="mt-4 grid grid-cols-2 gap-3 p-3 rounded-xl bg-bg-main/60 border border-border-color/60">
          <div>
            <span className="text-xs text-text-secondary font-medium block">Confidence Score</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <AnimatedCounter
                value={signal.confidence}
                suffix="%"
                className={`text-xl font-mono font-bold ${
                  signal.confidence >= 75
                    ? 'text-emerald-500 dark:text-emerald-400'
                    : signal.confidence >= 60
                    ? 'text-cyan-500 dark:text-cyan-400'
                    : 'text-text-secondary'
                }`}
              />
              <span className="text-[10px] text-text-secondary font-medium">
                ({signal.confidenceBreakdown.totalScore}/100)
              </span>
            </div>
          </div>

          <div>
            <span className="text-xs text-text-secondary font-medium block">Risk / Reward</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xl font-mono font-bold text-text-primary">1 : {signal.riskRewardRatio}</span>
              {signal.riskRewardRatio >= 2.0 && signal.riskRewardRatio <= 3.0 ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-medium border border-emerald-500/30">
                  Passed
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-500 dark:text-rose-400 font-medium border border-rose-500/30">
                  Filtered
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Trade Entry & Levels Grid */}
        {!isRejected && (
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs font-mono">
            <div className="p-2 rounded bg-bg-hover/40 border border-border-color/40">
              <span className="text-[10px] text-text-secondary block">Entry Zone</span>
              <span className="text-slate-200 font-medium">
                {signal.entryZone.min.toFixed(4)} - {signal.entryZone.max.toFixed(4)}
              </span>
            </div>

            <div className="p-2 rounded bg-rose-950/20 border border-rose-800/30">
              <span className="text-[10px] text-rose-400/80 block">Invalidation (SL)</span>
              <span className="text-rose-300 font-medium">{signal.stopLoss.toFixed(4)}</span>
            </div>

            <div className="p-2 rounded bg-emerald-950/20 border border-emerald-800/30">
              <span className="text-[10px] text-emerald-400/80 block">Target Zone (TP)</span>
              <span className="text-emerald-300 font-medium">{signal.takeProfit.toFixed(4)}</span>
            </div>
          </div>
        )}

        {/* Context Items */}
        <div className="mt-3 space-y-1.5 text-xs text-text-primary">
          <div className="flex items-center justify-between">
            <span className="text-text-secondary">Market Structure:</span>
            <span className="font-semibold text-slate-200">{signal.marketStructure}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-secondary">Pattern:</span>
            <span className="text-text-primary truncate max-w-[180px]">{signal.patternDetected}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-secondary">Sentiment:</span>
            <span className="text-text-primary">{signal.sentiment}</span>
          </div>
        </div>

        {/* Rejection notice if present */}
        {isRejected && (
          <div className="mt-3 p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
            <p className="font-semibold flex items-center gap-1.5 text-rose-400">
              <Info className="w-3.5 h-3.5 shrink-0" />
              Setup Filtered
            </p>
            <p className="text-[11px] mt-1 text-text-secondary leading-relaxed">{signal.rejectionReason}</p>
          </div>
        )}

        {/* Card Footer Action */}
        <div className="mt-4 pt-3 border-t border-border-color/80 flex items-center justify-between text-xs">
          <span className="text-[11px] text-text-secondary font-mono flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(signal.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
          >
            <span>View Analysis</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>

      {/* Expanded AI Intelligence Workspace Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-main/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-3xl rounded-2xl bg-bg-surface border border-border-color shadow-2xl p-6 text-slate-200 overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-4 border-b border-border-color">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-white tracking-tight">{signal.symbol} AI Analysis</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {signal.modelVersion}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mt-1">{signal.symbolName} — Generated at {new Date(signal.generatedAt).toLocaleString()}</p>
                </div>

                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg bg-bg-hover text-text-secondary hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Safety Banner */}
              <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-200">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold uppercase tracking-wider block text-amber-300">REAL ACCOUNT SAFETY MANDATE</span>
                  <span>AI analysis is strictly informational and does not execute automated trades. All setups require manual user review and permissioned order submission.</span>
                </div>
              </div>

              {/* 7-Step Reveal Timeline */}
              <div className="mt-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-3 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  How This Analysis Was Formed (7-Step AI Reasoning)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-7 gap-1 bg-bg-main/80 p-1 rounded-xl border border-border-color mb-4">
                  {timelineSteps.map((step, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveStepTab(idx)}
                      className={`py-2 px-1 text-center rounded-lg text-[11px] font-semibold transition-all ${
                        activeStepTab === idx
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                          : 'text-text-secondary hover:text-slate-200'
                      }`}
                    >
                      Step {idx + 1}
                    </button>
                  ))}
                </div>

                <div className="p-4 rounded-xl bg-bg-main/60 border border-border-color/80">
                  <h5 className="font-bold text-sm text-cyan-400 mb-1">
                    Step {activeStepTab + 1}: {timelineSteps[activeStepTab].title}
                  </h5>
                  <p className="text-xs text-text-primary leading-relaxed font-mono">
                    {timelineSteps[activeStepTab].detail}
                  </p>
                </div>
              </div>

              {/* Key Intelligence Answers */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-bg-main/40 border border-border-color/80">
                  <h5 className="text-xs font-bold uppercase text-emerald-400 mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Why This Signal Exists
                  </h5>
                  <ul className="space-y-1.5 text-xs text-text-primary">
                    <li className="flex items-start gap-1.5">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>{signal.reasoning.why}</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>Risk/Reward ratio 1:{signal.riskRewardRatio} satisfies the mandatory 1:2.0 to 1:3.0 safety range.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>Macro DXY context: {signal.dxyContext}</span>
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-bg-main/40 border border-border-color/80">
                  <h5 className="text-xs font-bold uppercase text-rose-400 mb-2 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4" />
                    What Would Invalidate It?
                  </h5>
                  <ul className="space-y-1.5 text-xs text-text-primary">
                    <li className="flex items-start gap-1.5">
                      <span className="text-rose-400 font-bold">•</span>
                      <span>Price breach of stop loss level at {signal.stopLoss}</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-rose-400 font-bold">•</span>
                      <span>Market structure shift breaking recent swing boundaries</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-rose-400 font-bold">•</span>
                      <span>High impact news volatility event conflicting with signal direction</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Data Evidence List */}
              <div className="mt-6 p-4 rounded-xl bg-bg-main/80 border border-border-color">
                <h5 className="text-xs font-bold uppercase text-text-secondary mb-2 flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                  Supporting Evidence & Data Timestamps
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono text-text-primary">
                  {signal.reasoning.dataEvidence.map((ev, i) => (
                    <div key={i} className="p-2 rounded bg-bg-surface border border-border-color flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                      <span>{ev}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Disclaimer */}
              <div className="mt-6 pt-4 border-t border-border-color/80 text-[11px] text-text-secondary leading-relaxed">
                <p className="italic">
                  Trading involves substantial risk of loss. AI-generated analysis is informational and is not financial advice. Past patterns do not guarantee future results.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
