/**
 * AppexQuant Markets Global - Phase 3 Strategy Market Scanner Modal
 * Evaluates available market instruments against selected strategy rules with step-by-step progress animation.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserStrategy, MarketCompatibilityItem } from '../../types/ai.ts';
import { useMarketData } from '../../state/MarketDataContext.tsx';
import { evaluateMarketCompatibility } from '../../services/ai/strategyEngine.ts';
import { Search, CheckCircle2, AlertTriangle, X, RefreshCw, ChevronRight, Layers, ArrowRight } from 'lucide-react';

interface StrategyScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategy: UserStrategy;
  onSelectSymbol?: (symbol: string) => void;
}

export const StrategyScannerModal: React.FC<StrategyScannerModalProps> = ({
  isOpen,
  onClose,
  strategy,
  onSelectSymbol,
}) => {
  const { availableInstruments, candleHistory, dataFreshness, connectionState } = useMarketData();

  const [scanStatus, setScanStatus] = useState<'IDLE' | 'SCANNING' | 'COMPLETE'>('IDLE');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<MarketCompatibilityItem[]>([]);

  const instrumentsToScan = availableInstruments.slice(0, 8);

  const startScan = () => {
    setScanStatus('SCANNING');
    setCurrentIndex(0);
    setResults([]);
  };

  useEffect(() => {
    if (isOpen && scanStatus === 'IDLE') {
      startScan();
    }
  }, [isOpen]);

  useEffect(() => {
    if (scanStatus !== 'SCANNING') return;

    if (dataFreshness !== "STALE" && dataFreshness !== "DISCONNECTED" && currentIndex < instrumentsToScan.length) {
      const timer = setTimeout(() => {
        const inst = instrumentsToScan[currentIndex];
        const candles = candleHistory[inst.symbol] || [];
        const item = evaluateMarketCompatibility(inst, candles, strategy);

        setResults((prev) => [...prev, item]);
        setCurrentIndex((prev) => prev + 1);
      }, 400); // Step delay to show real progress animation

      return () => clearTimeout(timer);
    } else if (currentIndex >= instrumentsToScan.length) {
      setScanStatus('COMPLETE');
    }
  }, [scanStatus, currentIndex, instrumentsToScan, candleHistory, strategy]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-main/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="relative w-full max-w-3xl rounded-2xl bg-bg-surface border border-border-color shadow-2xl p-6 text-slate-200 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border-color">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Strategy Market Scanner</h3>
              <p className="text-xs text-text-secondary">Evaluating markets against "{strategy.name}"</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-lg bg-bg-hover text-text-secondary hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scan Progress Bar */}
        <div className="mt-4 p-4 rounded-xl bg-bg-main border border-border-color">
          {(dataFreshness === "STALE" || dataFreshness === "DISCONNECTED") && (
            <div className="mb-4 p-3 rounded-lg bg-color-danger/10 border border-color-danger/30 flex items-center gap-2 text-color-danger text-xs font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>LIVE DATA STALE. SCANNING PAUSED. Waiting for data integrity checks to pass...</span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs mb-2 font-mono">
            <span className="text-text-secondary flex items-center gap-2">
              {scanStatus === 'SCANNING' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                  <span>Scanning Markets ({currentIndex} / {instrumentsToScan.length})...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Market Scan Complete</span>
                </>
              )}
            </span>
            <button
              onClick={startScan}
              disabled={scanStatus === 'SCANNING'}
              className="text-cyan-400 hover:text-cyan-300 font-semibold disabled:opacity-50"
            >
              Rescan All
            </button>
          </div>

          <div className="w-full h-1.5 rounded-full bg-bg-hover overflow-hidden">
            <div
              className="h-full bg-cyan-400 transition-all duration-300"
              style={{ width: `${(currentIndex / instrumentsToScan.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Scan Results Grid */}
        <div className="mt-5 space-y-3 max-h-[380px] overflow-y-auto pr-1">
          {results.map((res) => (
            <div key={res.symbol} className="p-4 rounded-xl bg-bg-main/60 border border-border-color/80 hover:border-border-color transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white">{res.symbol}</h4>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        res.matchGrade === 'BEST MATCH'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : res.matchGrade === 'GOOD MATCH'
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                          : 'bg-bg-hover text-text-secondary'
                      }`}
                    >
                      {res.matchGrade}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">{res.symbolName}</p>
                </div>

                <div className="text-right">
                  <span className="text-lg font-mono font-bold text-cyan-400">{res.compatibilityScore}%</span>
                  <span className="text-[10px] text-text-secondary block uppercase">Compatibility</span>
                </div>
              </div>

              {/* Why This Market / Why Not */}
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                {res.pros.length > 0 && (
                  <div className="p-2 rounded bg-emerald-500/5 border border-emerald-500/10 text-emerald-300 space-y-1">
                    <span className="font-bold block text-emerald-400">Why this market?</span>
                    {res.pros.map((p, i) => (
                      <p key={i}>✓ {p}</p>
                    ))}
                  </div>
                )}

                {res.cons.length > 0 && (
                  <div className="p-2 rounded bg-rose-500/5 border border-rose-500/10 text-rose-300 space-y-1">
                    <span className="font-bold block text-rose-400">Why not?</span>
                    {res.cons.map((c, i) => (
                      <p key={i}>✕ {c}</p>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-3 pt-2 border-t border-border-color/60 flex justify-end">
                <button
                  onClick={() => {
                    onSelectSymbol && onSelectSymbol(res.symbol);
                    onClose();
                  }}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
                >
                  <span>Select & Inspect Market</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
