/**
 * AppexQuant Markets Global - EA Detail Modal Component
 * Displays comprehensive performance metrics, dataset assumptions, licensing rights, and installation actions.
 */

import React from 'react';
import { motion } from 'motion/react';
import { ExpertAdvisor } from '../../types/ea.js';
import { Bot, ShieldCheck, Download, Star, CheckCircle, AlertTriangle, Cpu, BarChart2, FileText, ExternalLink } from 'lucide-react';

interface EADetailModalProps {
  ea: ExpertAdvisor;
  onClose: () => void;
  onInstall: (ea: ExpertAdvisor) => void;
  onToggleFavorite: (id: string) => void;
}

export const EADetailModal: React.FC<EADetailModalProps> = ({ ea, onClose, onInstall, onToggleFavorite }) => {
  return (
    <div className="fixed inset-0 z-50 bg-bg-main/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-bg-surface border border-border-color rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border-color pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                {ea.category}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                FREE FOREVER
              </span>
              <span className="text-xs text-text-secondary font-mono">v{ea.version}</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white mt-1">{ea.name}</h2>
            <p className="text-xs text-text-secondary mt-0.5">{ea.tagline}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleFavorite(ea.id)}
              className={`p-2 rounded-xl border transition-all ${
                ea.isFavorite
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : 'bg-bg-hover border-border-color text-text-secondary hover:text-white'
              }`}
            >
              <Star className="w-4 h-4 fill-current" />
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-bg-hover text-text-secondary hover:text-white text-xs font-mono"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Description & Specs Grid */}
        <div className="space-y-4">
          <p className="text-xs text-text-primary leading-relaxed">{ea.description}</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-bg-main border border-border-color">
              <span className="text-[10px] text-text-secondary block">Platform</span>
              <span className="text-white font-bold">{ea.supportedPlatform}</span>
            </div>
            <div className="p-3 rounded-xl bg-bg-main border border-border-color">
              <span className="text-[10px] text-text-secondary block">Broker</span>
              <span className="text-cyan-400 font-bold">{ea.broker}</span>
            </div>
            <div className="p-3 rounded-xl bg-bg-main border border-border-color">
              <span className="text-[10px] text-text-secondary block">Risk Profile</span>
              <span className="text-amber-400 font-bold">{ea.riskProfile}</span>
            </div>
            <div className="p-3 rounded-xl bg-bg-main border border-border-color">
              <span className="text-[10px] text-text-secondary block">File Type</span>
              <span className="text-white font-bold">{ea.fileType} ({ea.fileSizeKb} KB)</span>
            </div>
          </div>
        </div>

        {/* Performance Metrics Grid */}
        <div className="space-y-3">
          <h4 className="text-xs font-mono uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4 text-cyan-400" />
            Verified Performance Dataset
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-bg-main border border-border-color text-center">
              <span className="text-[10px] text-text-secondary block font-mono">Net Profit</span>
              <span className="text-emerald-400 font-extrabold text-base font-mono">+${ea.performance.netProfitUsd.toLocaleString()}</span>
            </div>
            <div className="p-3 rounded-xl bg-bg-main border border-border-color text-center">
              <span className="text-[10px] text-text-secondary block font-mono">Win Rate</span>
              <span className="text-white font-extrabold text-base font-mono">{ea.performance.winRatePct}%</span>
            </div>
            <div className="p-3 rounded-xl bg-bg-main border border-border-color text-center">
              <span className="text-[10px] text-text-secondary block font-mono">Profit Factor</span>
              <span className="text-cyan-400 font-extrabold text-base font-mono">{ea.performance.profitFactor}</span>
            </div>
            <div className="p-3 rounded-xl bg-bg-main border border-border-color text-center">
              <span className="text-[10px] text-text-secondary block font-mono">Max Drawdown</span>
              <span className="text-rose-400 font-extrabold text-base font-mono">{ea.performance.maxDrawdownPct}%</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-bg-main/80 border border-border-color/80 space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-text-secondary">Dataset Type & Period:</span>
              <span className="text-white font-medium">{ea.datasetInfo.type} • {ea.datasetInfo.period}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Symbol / Timeframe:</span>
              <span className="text-cyan-300 font-medium">{ea.datasetInfo.symbol} ({ea.datasetInfo.timeframe})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Spread & Commission:</span>
              <span className="text-text-primary font-medium">{ea.datasetInfo.spreadAssumption} | {ea.datasetInfo.commissionAssumption}</span>
            </div>
          </div>
        </div>

        {/* Licensing & Rights */}
        <div className="p-4 rounded-xl bg-bg-main border border-border-color space-y-2 text-xs font-mono">
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>Licensing & Rights: {ea.license}</span>
          </div>
          <p className="text-text-secondary text-[11px]">{ea.terms}</p>
        </div>

        {/* Disclaimer */}
        <div className="flex items-center gap-2 text-[11px] text-text-secondary font-mono">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Past performance and backtest results do not guarantee future results. Trading involves substantial risk.</span>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border-color">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-bg-hover hover:bg-bg-hover text-text-primary text-xs font-bold transition-all"
          >
            Close
          </button>
          <button
            onClick={() => {
              onInstall(ea);
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-bg-main text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20"
          >
            <Download className="w-4 h-4" />
            <span>Install / Configure EA</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
