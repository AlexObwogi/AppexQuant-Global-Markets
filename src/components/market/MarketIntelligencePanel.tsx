import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MarketInstrument } from '../../types/market';
import { NormalizedCandle } from '../../services/deriv/derivTypes';
import { DataFreshness } from '../../state/MarketDataContext';
import { UserStrategy, Signal, MarketCompatibilityItem } from '../../types/ai';
import { DEFAULT_USER_STRATEGIES, evaluateMarketCompatibility } from '../../services/ai/strategyEngine';
import { generateAISignal } from '../../services/ai/signalEngine';
import { evaluateConfluenceMatrix, ConfluenceMatrixResult } from '../../services/ai/confluenceEngine';
import { ShieldCheck, ShieldAlert, Zap, AlertTriangle, Play, Brain, Target, Info, CheckCircle2, XCircle, TrendingUp, TrendingDown, Layers, Activity, Sparkles } from 'lucide-react';

interface MarketIntelligencePanelProps {
  instrument: MarketInstrument | null;
  candles: NormalizedCandle[];
  dataFreshness: DataFreshness;
}

export const MarketIntelligencePanel: React.FC<MarketIntelligencePanelProps> = ({
  instrument,
  candles,
  dataFreshness
}) => {
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>(DEFAULT_USER_STRATEGIES[0]?.id || '');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Derive intelligence states
  const strategy = useMemo(() => DEFAULT_USER_STRATEGIES.find(s => s.id === selectedStrategyId) || DEFAULT_USER_STRATEGIES[0], [selectedStrategyId]);
  
  const [compatibility, setCompatibility] = useState<MarketCompatibilityItem | null>(null);
  const [signal, setSignal] = useState<Signal | null>(null);
  const [confluence, setConfluence] = useState<ConfluenceMatrixResult | null>(null);

  useEffect(() => {
    if (!instrument || candles.length === 0) return;
    
    // Simulate thinking process
    setIsAnalyzing(true);
    const timer = setTimeout(() => {
      try {
        const comp = evaluateMarketCompatibility(instrument, candles, strategy);
        setCompatibility(comp);
        
        // HTF candles mockup - in reality you'd pass a higher timeframe array
        const htfCandles = candles; 
        
        const conf = evaluateConfluenceMatrix(instrument, candles, htfCandles, strategy);
        setConfluence(conf);
        
        const sig = generateAISignal(instrument, candles, strategy);
        setSignal(sig);
      } catch(e) {
        console.error(e);
      } finally {
        setIsAnalyzing(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [instrument, candles, strategy]);

  if (!instrument) {
    return <div className="p-4 text-xs text-text-secondary">Select a market to view intelligence.</div>;
  }

  const isStale = dataFreshness === 'STALE' || dataFreshness === 'DISCONNECTED';

  return (
    <div className="flex flex-col h-full overflow-y-auto space-y-4">
      {/* 1. Header & Data Quality */}
      <div className="p-4 bg-bg-surface border border-border-color dark:border-[#2B3139] rounded-[4px] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-accent-primary" />
            <h3 className="text-sm font-bold uppercase tracking-tight text-text-primary">Intelligence Workspace</h3>
          </div>
          <select
            value={selectedStrategyId}
            onChange={(e) => setSelectedStrategyId(e.target.value)}
            className="bg-bg-main border border-border-color dark:border-[#2B3139] rounded px-2 py-1 text-xs text-text-primary outline-none"
          >
            {DEFAULT_USER_STRATEGIES.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {isStale && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400">Awaiting Feed Refresh</h4>
              <p className="text-[11px] text-text-secondary mt-0.5">Analysis using cached snapshot. Live price feed reconnecting...</p>
            </div>
          </div>
        )}
      </div>

      {isAnalyzing ? (
        <div className="p-8 flex flex-col items-center justify-center space-y-4 bg-bg-surface border border-border-color rounded-xl">
          <Activity className="w-8 h-8 text-cyan-500 animate-pulse" />
          <p className="text-xs text-text-secondary font-medium animate-pulse">Running quantitative analysis...</p>
        </div>
      ) : (
        <>
          {/* 2. Strategy Compatibility & Market State */}
          {compatibility && (
            <div className="p-4 bg-bg-surface border border-border-color rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                  <Target className="w-4 h-4" /> Market State & Match
                </h4>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  compatibility.matchGrade === 'BEST MATCH' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' :
                  compatibility.matchGrade === 'GOOD MATCH' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' :
                  compatibility.matchGrade === 'WATCH' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' :
                  'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                }`}>
                  {compatibility.matchGrade === 'BEST MATCH' ? 'Best Match' : compatibility.matchGrade === 'GOOD MATCH' ? 'Good Match' : compatibility.matchGrade} ({compatibility.compatibilityScore}/100)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 bg-bg-main dark:bg-[#0B0E11]/40 border border-border-color dark:border-[#2B3139] rounded space-y-1">
                  <span className="text-[10px] text-text-secondary uppercase">Structure</span>
                  <p className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                    {compatibility.structureMatch ? <TrendingUp className="w-3.5 h-3.5 text-color-success" /> : <TrendingDown className="w-3.5 h-3.5 text-color-danger" />}
                    {compatibility.structureMatch ? 'Aligned' : 'Conflicting'}
                  </p>
                </div>
                <div className="p-2.5 bg-bg-main dark:bg-[#0B0E11]/40 border border-border-color dark:border-[#2B3139] rounded space-y-1">
                  <span className="text-[10px] text-text-secondary uppercase">Volatility</span>
                  <p className="text-xs font-bold text-text-primary">{compatibility.volatilityStatus}</p>
                </div>
              </div>
              
              {compatibility.pros.length > 0 && (
                <div className="space-y-1.5">
                  {compatibility.pros.slice(0, 2).map((pro, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[11px] text-text-primary">
                      <CheckCircle2 className="w-3.5 h-3.5 text-color-success shrink-0 mt-0.5" />
                      <span>{pro}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. Confluence Matrix */}
          {confluence && (
            <div className="p-4 bg-bg-surface border border-border-color dark:border-[#2B3139] rounded-[4px] space-y-4">
              <div className="flex items-center justify-between border-b border-border-color dark:border-[#2B3139] pb-3">
                <h4 className="text-xs font-bold uppercase text-text-secondary flex items-center gap-1.5">
                  <Layers className="w-4 h-4" /> Confluence Matrix
                </h4>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  confluence.grade === 'STRONG CONFLUENCE' ? 'bg-color-success/10 text-color-success' :
                  confluence.grade === 'MODERATE CONFLUENCE' ? 'bg-[#F0B90B]/10 text-color-warning' :
                  'bg-color-danger/10 text-color-danger'
                }`}>
                  {confluence.grade}
                </span>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">Structure:</span>
                  <span className="text-text-primary font-medium">{confluence.evaluations.marketStructure}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">HTF Bias:</span>
                  <span className="text-text-primary font-medium">{confluence.evaluations.htfBias}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">Momentum:</span>
                  <span className="text-text-primary font-medium">{confluence.evaluations.momentum}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">Session:</span>
                  <span className="text-text-primary font-medium">{confluence.evaluations.session}</span>
                </div>
              </div>

              <div className="p-3 bg-bg-main dark:bg-[#0B0E11]/40 border border-border-color dark:border-[#2B3139] rounded text-[11px] text-text-secondary leading-relaxed">
                {confluence.explanation}
              </div>
            </div>
          )}

          {/* 4. Scenario Map & AI Analysis */}
          {signal && (
            <div className="p-4 bg-bg-surface border border-border-color dark:border-[#2B3139] rounded-[4px] space-y-4">
              <h4 className="text-xs font-bold uppercase text-text-secondary flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-accent-primary" /> AI Scenario Analysis
              </h4>
              
              <div className="space-y-3">
                <div>
                  <h5 className="text-[10px] font-bold text-text-primary mb-1 uppercase tracking-wider text-color-success">Primary Scenario</h5>
                  <p className="text-xs text-text-secondary leading-relaxed">{signal.reasoning.what} {signal.reasoning.why}</p>
                </div>
                
                <div>
                  <h5 className="text-[10px] font-bold text-text-primary mb-1 uppercase tracking-wider text-color-danger">Invalidation Condition</h5>
                  <p className="text-xs text-text-secondary leading-relaxed">{signal.reasoning.invalidation}</p>
                </div>

                <div className="pt-3 border-t border-border-color dark:border-[#2B3139]">
                  <h5 className="text-[10px] font-bold text-text-primary mb-2 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-color-warning" /> Risk Context
                  </h5>
                  <div className="grid grid-cols-2 gap-2 font-mono text-[10px]">
                    <div className="bg-bg-main dark:bg-[#0B0E11]/40 p-2 rounded border border-border-color dark:border-[#2B3139]">
                      <span className="text-text-secondary block mb-0.5">Target R:R</span>
                      <span className="text-text-primary font-bold">{signal.riskRewardRatio.toFixed(1)}</span>
                    </div>
                    <div className="bg-bg-main dark:bg-[#0B0E11]/40 p-2 rounded border border-border-color dark:border-[#2B3139]">
                      <span className="text-text-secondary block mb-0.5">Confidence</span>
                      <span className="text-text-primary font-bold">{signal.confidence}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 5. Signal State Action */}
          {signal && (
            <div className="p-4 bg-bg-surface border border-border-color dark:border-[#2B3139] rounded-[4px]">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase text-text-secondary flex items-center gap-1.5">
                  <Play className="w-4 h-4" /> Signal State
                </h4>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                  signal.status === 'ACTIVE' ? 'bg-color-success/10 text-color-success' :
                  signal.status === 'ANALYZING' ? 'bg-[#F0B90B]/10 text-color-warning' :
                  signal.status === 'INVALIDATED' || signal.status === 'REJECTED' ? 'bg-color-danger/10 text-color-danger' :
                  'bg-bg-main text-text-secondary'
                }`}>
                  {isStale ? 'PAUSED' : signal.status}
                </span>
              </div>

              <div className="w-full">
                <button 
                  disabled={isStale || signal.status === 'INVALIDATED' || signal.status === 'REJECTED'}
                  className="w-full py-2.5 rounded-[4px] bg-accent-primary hover:bg-accent-primary/90 text-bg-secondary font-bold text-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  {isStale ? 'DATA STALE - CANNOT EXECUTE' : 'OPEN IN SIGNAL WORKSPACE'}
                </button>
                {signal.status === 'INVALIDATED' && (
                  <p className="text-[10px] text-color-danger mt-2 text-center">Setup invalidated by market structure</p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
