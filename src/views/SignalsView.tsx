/**
 * AppexQuant Markets Global - Phase 3 AI Signals View
 * Production AI Market Intelligence Engine & Workspace
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useGlobalState } from '../state/GlobalStateContext';
import { useMarketData } from '../state/MarketDataContext';
import { generateAISignal } from '../services/ai/signalEngine';
import { fetchLiveNewsSentinel } from '../services/ai/newsSentinelEngine';
import { getDXYContext } from '../services/ai/dxyEngine';
import { DEFAULT_USER_STRATEGIES } from '../services/ai/strategyEngine';
import { Signal, NewsItem } from '../types/ai';
import { SignalCard } from '../components/ai/SignalCard';
import { AICommandCenter } from '../components/ai/AICommandCenter';
import { StrategyScannerModal } from '../components/strategy/StrategyScannerModal';
import { PerformanceBadge, PerformanceDisclaimerBanner } from '../components/common/PerformanceDisclaimer';
import { Sparkles, Zap, ShieldAlert, RefreshCw, Filter, Layers, Info } from 'lucide-react';

export const SignalsView: React.FC = () => {
  const { dispatch } = useGlobalState();
  const { availableInstruments, candleHistory } = useMarketData();

  const [signals, setSignals] = useState<Signal[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'LONG' | 'SHORT' | 'REJECTED' | 'STALE'>('ALL');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Generate live signals across available instruments
  const refreshSignals = async () => {
    setIsGenerating(true);
    const newsData = await fetchLiveNewsSentinel();
    setNews(newsData.news);

    const dxy = getDXYContext();
    const strategy = DEFAULT_USER_STRATEGIES[0];

    const generatedList: Signal[] = availableInstruments.slice(0, 8).map((inst) => {
      const candles = candleHistory[inst.symbol] || [];
      return generateAISignal(inst, candles, strategy, newsData.news, dxy);
    });

    setSignals(generatedList);
    setIsGenerating(false);
  };

  useEffect(() => {
    refreshSignals();
  }, [availableInstruments, candleHistory]);

  const filteredSignals = signals.filter((sig) => {
    if (filter === 'ACTIVE') return sig.status === 'ACTIVE';
    if (filter === 'LONG') return sig.direction === 'LONG' && sig.status === 'ACTIVE';
    if (filter === 'SHORT') return sig.direction === 'SHORT' && sig.status === 'ACTIVE';
    if (filter === 'REJECTED') return sig.status === 'REJECTED';
    if (filter === 'STALE') return sig.status === 'STALE';
    return true;
  });

  const handleSelectSymbol = (symbol: string) => {
    const inst = availableInstruments.find((i) => i.symbol === symbol);
    if (inst) {
      dispatch({
        type: 'SET_ROUTE',
        payload: 'trade',
      });
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6 rounded-xl bg-gradient-to-r from-slate-50 via-slate-100 to-slate-50 border border-border-color dark:from-slate-900 dark:via-[#131822] dark:to-slate-900 dark:border-border-color">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-text-secondary tracking-tight flex items-center gap-2">
              AI Market Signals Workspace
              <span className="text-[10px] px-2.5 py-0.5 rounded-md font-mono font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                ACTIVE INTELLIGENCE
              </span>
            </h1>
            <PerformanceBadge environment="SIMULATED" size="sm" />
          </div>
          <p className="text-xs text-text-secondary mt-1 font-medium">
            Deterministic quantitative intelligence engine with strict 1:2.0 to 1:3.0 Risk/Reward guardrails
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={refreshSignals}
            disabled={isGenerating}
            className="px-4 py-2 rounded-lg bg-bg-surface hover:bg-slate-50 text-text-secondary border border-border-color dark:hover:bg-bg-hover text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin text-cyan-500' : ''}`} />
            <span>Re-Scan Intelligence</span>
          </button>
        </div>
      </div>

      {/* MANDATORY PERFORMANCE DISCLAIMER BANNER */}
      <PerformanceDisclaimerBanner environment="SIMULATED" title="AI Signal Generation & Simulated Model Disclaimer" />

      {/* Safety Banner */}
      <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 dark:bg-bg-main/40 dark:border-emerald-500/30 flex items-center justify-between text-xs text-text-secondary dark:text-text-secondary">
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="font-medium">
            <strong>REAL ACCOUNT SAFETY GUARANTEE:</strong> AI analysis is informational only. No trades are automatically executed. All orders require explicit user confirmation.
          </span>
        </div>
        <span className="font-mono text-[9px] text-emerald-600 dark:text-emerald-400 uppercase font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
          PROTECTED
        </span>
      </div>

      {/* AI Command Center Widget */}
      <AICommandCenter
        onOpenStrategyScanner={() => setIsScannerOpen(true)}
        onSelectSymbol={handleSelectSymbol}
      />

      {/* Signal Filter Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-border-color dark:border-border-color">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold">
          <span className="text-text-secondary flex items-center gap-1 mr-2">
            <Filter className="w-3.5 h-3.5" />
            Filter:
          </span>
          {(['ALL', 'ACTIVE', 'LONG', 'SHORT', 'REJECTED', 'STALE'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
                filter === tab
                  ? 'bg-cyan-500/10 text-cyan-700 border-cyan-500/30 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/40 shadow-xs'
                  : 'text-text-secondary hover:text-text-secondary bg-slate-50 border-border-color/80 dark:hover:text-text-primary dark:border-border-color'
              }`}
            >
              {tab === 'REJECTED' ? 'REJECTED / NO TRADE' : tab}
            </button>
          ))}
        </div>

        <span className="text-xs text-text-secondary font-mono font-semibold">
          Showing {filteredSignals.length} of {signals.length} market evaluations
        </span>
      </div>

      {/* Signals Grid */}
      {filteredSignals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSignals.map((sig) => (
            <SignalCard key={sig.id} signal={sig} onSelectSymbol={handleSelectSymbol} />
          ))}
        </div>
      ) : (
        <div className="p-12 text-center rounded-xl bg-bg-surface border border-border-color dark:bg-bg-hover/60 text-text-secondary space-y-3 shadow-xs">
          <Info className="w-8 h-8 text-cyan-500 dark:text-cyan-400 mx-auto" />
          <h3 className="text-base font-bold text-text-secondary dark:text-text-primary">No Signals Matching Current Filter</h3>
          <p className="text-xs max-w-md mx-auto leading-relaxed">
            The AI engine strictly filters out setups that fail the 1:2.0 - 1:3.0 Risk/Reward boundary or have conflicting news/structure momentum.
          </p>
        </div>
      )}

      {/* Strategy Scanner Modal */}
      <StrategyScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        strategy={DEFAULT_USER_STRATEGIES[0]}
        onSelectSymbol={handleSelectSymbol}
      />
    </div>
  );
};
