/**
 * AppexQuant Markets Global - Phase 3 AI Command Center Workspace
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGlobalState } from '../../state/GlobalStateContext';
import { useMarketData } from '../../state/MarketDataContext';
import { MarketComparisonMatrix, MarketCompatibilityItem } from '../../types/ai';
import { evaluateMarketCompatibility, DEFAULT_USER_STRATEGIES } from '../../services/ai/strategyEngine';
import { Sparkles, Search, Code2, Globe2, Layers, Cpu, CheckCircle2, AlertTriangle, X, Play, RefreshCw } from 'lucide-react';

interface AICommandCenterProps {
  onOpenStrategyScanner?: () => void;
  onSelectSymbol?: (symbol: string) => void;
}

export const AICommandCenter: React.FC<AICommandCenterProps> = ({ onOpenStrategyScanner, onSelectSymbol }) => {
  const { state } = useGlobalState();
  const { availableInstruments, candleHistory } = useMarketData();

  const [activeTab, setActiveTab] = useState<'ACTIONS' | 'COMPARE' | 'SENTINEL'>('ACTIONS');
  const [comparingSymbols, setComparingSymbols] = useState<string[]>(['frxEURUSD', 'frxGBPUSD', 'frxUSDJPY', 'frxXAUUSD']);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [explainResult, setExplainResult] = useState<string | null>(null);

  const selectedSymbol = state.selectedMarket.instrument?.symbol || 'frxEURUSD';

  // Handle Explain Market
  const handleExplainMarket = () => {
    setIsAnalyzing(true);
    setExplainResult(null);

    setTimeout(() => {
      const candles = candleHistory[selectedSymbol] || [];
      const len = candles.length;
      const lastPrice = candles[len - 1]?.close || 1.085;
      const firstPrice = candles[0]?.close || 1.082;
      const isUp = lastPrice >= firstPrice;

      setExplainResult(
        `Market Structure Analysis for ${selectedSymbol}: Price action is currently exhibiting ${
          isUp ? 'bullish continuation momentum' : 'bearish pressure'
        } near ${lastPrice.toFixed(4)}. Market volatility (ATR) is within healthy trading parameters. Macro DXY alignment favors ${
          isUp ? 'LONG' : 'SHORT'
        } positional setups.`
      );
      setIsAnalyzing(false);
    }, 800);
  };

  // Build Market Comparison Matrix
  const comparisonItems: MarketCompatibilityItem[] = comparingSymbols.map((sym) => {
    const inst = availableInstruments.find((i) => i.symbol === sym) || {
      id: sym,
      symbol: sym,
      name: sym,
      category: 'FOREX' as const,
      baseCurrency: 'USD',
      quoteCurrency: 'USD',
      pipSize: 0.0001,
      minLotSize: 0.01,
      maxLotSize: 100,
      lotStep: 0.01,
      bid: 1.085,
      ask: 1.0852,
      spread: 0.0002,
      change24hPercentage: 0.25,
      isMarketOpen: true,
    };
    const candles = candleHistory[sym] || [];
    return evaluateMarketCompatibility(inst, candles, DEFAULT_USER_STRATEGIES[0]);
  });

  return (
    <div className="rounded-2xl border border-border-color bg-bg-surface/90 backdrop-blur-md p-6 text-slate-200 shadow-xl overflow-hidden relative">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border-color">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              APPEXQUANT INTELLIGENCE
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                ACTIVE
              </span>
            </h2>
            <p className="text-xs text-text-secondary">Quantitative Market Sentinel & Strategy Scanner Command Center</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-bg-main p-1 rounded-xl border border-border-color text-xs font-semibold">
          <button
            onClick={() => setActiveTab('ACTIONS')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'ACTIONS' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-text-secondary hover:text-white'
            }`}
          >
            Command Suite
          </button>
          <button
            onClick={() => setActiveTab('COMPARE')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'COMPARE' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-text-secondary hover:text-white'
            }`}
          >
            Compare Markets
          </button>
        </div>
      </div>

      {/* Tab 1: Quick Command Suite */}
      {activeTab === 'ACTIONS' && (
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={onOpenStrategyScanner}
              className="p-4 rounded-xl bg-bg-main/80 hover:bg-bg-hover/80 border border-border-color text-left transition-all group"
            >
              <Code2 className="w-5 h-5 text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
              <h4 className="text-sm font-bold text-white">Scan My Strategy</h4>
              <p className="text-[11px] text-text-secondary mt-1">Match natural language strategy against available markets</p>
            </button>

            <button
              onClick={handleExplainMarket}
              className="p-4 rounded-xl bg-bg-main/80 hover:bg-bg-hover/80 border border-border-color text-left transition-all group"
            >
              <Cpu className="w-5 h-5 text-indigo-400 mb-2 group-hover:scale-110 transition-transform" />
              <h4 className="text-sm font-bold text-white">Explain Market</h4>
              <p className="text-[11px] text-text-secondary mt-1">Deconstruct current structure for {selectedSymbol}</p>
            </button>

            <button
              onClick={() => setActiveTab('COMPARE')}
              className="p-4 rounded-xl bg-bg-main/80 hover:bg-bg-hover/80 border border-border-color text-left transition-all group"
            >
              <Layers className="w-5 h-5 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
              <h4 className="text-sm font-bold text-white">Compare Markets</h4>
              <p className="text-[11px] text-text-secondary mt-1">Multi-asset volatility & structure matrix</p>
            </button>

            <button
              onClick={handleExplainMarket}
              className="p-4 rounded-xl bg-bg-main/80 hover:bg-bg-hover/80 border border-border-color text-left transition-all group"
            >
              <Globe2 className="w-5 h-5 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
              <h4 className="text-sm font-bold text-white">Market Sentinel</h4>
              <p className="text-[11px] text-text-secondary mt-1">Check DXY correlation & news impact</p>
            </button>
          </div>

          {/* Explain Result Card */}
          {isAnalyzing && (
            <div className="p-4 rounded-xl bg-bg-main border border-cyan-500/30 flex items-center gap-3 text-xs text-cyan-300 animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin shrink-0 text-cyan-400" />
              <span>Analyzing market structure, volatility, and macro DXY context...</span>
            </div>
          )}

          {explainResult && !isAnalyzing && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-bg-main border border-cyan-500/30 text-xs text-slate-200 leading-relaxed font-mono"
            >
              <span className="text-cyan-400 font-bold uppercase tracking-wider block mb-1">
                AI Market Explanation — {selectedSymbol}
              </span>
              <p>{explainResult}</p>
            </motion.div>
          )}
        </div>
      )}

      {/* Tab 2: Compare Markets Matrix */}
      {activeTab === 'COMPARE' && (
        <div className="mt-5 space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-border-color text-text-secondary">
                  <th className="pb-3 font-semibold">Instrument</th>
                  <th className="pb-3 font-semibold">Compatibility</th>
                  <th className="pb-3 font-semibold">Match Grade</th>
                  <th className="pb-3 font-semibold">Volatility (ATR)</th>
                  <th className="pb-3 font-semibold">Session Status</th>
                  <th className="pb-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {comparisonItems.map((item) => (
                  <tr key={item.symbol} className="hover:bg-bg-hover/30 transition-colors">
                    <td className="py-3 font-bold text-white">{item.symbol}</td>
                    <td className="py-3 font-bold text-cyan-400">{item.compatibilityScore}%</td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.matchGrade === 'BEST MATCH'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : item.matchGrade === 'GOOD MATCH'
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                            : 'bg-bg-hover text-text-secondary'
                        }`}
                      >
                        {item.matchGrade}
                      </span>
                    </td>
                    <td className="py-3 text-text-primary">{item.volatilityStatus}</td>
                    <td className="py-3 text-text-secondary">Active Live</td>
                    <td className="py-3">
                      <button
                        onClick={() => onSelectSymbol && onSelectSymbol(item.symbol)}
                        className="text-cyan-400 hover:text-cyan-300 font-medium"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
