/**
 * AppexQuant Markets Global - 2-Year Rolling Retention Modal / Drawer
 * Shows 24-Month audited historical metrics, PnL curve, win rate & drawdown retention records
 */

import React, { useState } from 'react';
import { LeaderboardEntry, MonthlyRecord } from '../../types/leaderboard.ts';
import { VerifiedLeaderBadge } from './VerifiedLeaderBadge.tsx';
import {
  X,
  TrendingUp,
  Calendar,
  ShieldCheck,
  BarChart3,
  Award,
  Activity,
  ArrowUpRight,
  Sparkles,
  Layers,
  Clock,
} from 'lucide-react';

interface RetentionModalProps {
  entry: LeaderboardEntry | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RetentionModal: React.FC<RetentionModalProps> = ({ entry, isOpen, onClose }) => {
  if (!isOpen || !entry) return null;

  const logs = entry.historicalRetentionLogs || [];
  const totalMonths = logs.length; // 24 months = 2-year rolling retention
  const totalAuditedPnl = logs.reduce((acc, curr) => acc + curr.pnlUsd, 0);
  const avgWinRate = (logs.reduce((acc, curr) => acc + curr.winRatePct, 0) / (totalMonths || 1)).toFixed(1);
  const totalAuditedTrades = logs.reduce((acc, curr) => acc + curr.tradeCount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[90vh] bg-bg-surface border border-border-color rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-border-color bg-bg-elevated flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-accent-primary/20 border border-accent-primary/40 flex items-center justify-center font-black text-accent-primary text-base shrink-0">
              {entry.avatar || entry.displayName.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base sm:text-lg font-extrabold text-text-primary tracking-tight truncate">
                  {entry.displayName}
                </h3>
                <span className="text-xs font-mono text-text-secondary">@{entry.username}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold uppercase">
                  {entry.country} • AUDITED
                </span>
              </div>

              {/* Verified Badges */}
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                {entry.badges.map((b) => (
                  <VerifiedLeaderBadge key={b.type} badge={b} size="sm" />
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2-Year Retention Summary Metric Cards */}
        <div className="p-4 sm:p-6 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-bg-main/50 border-b border-border-color">
          <div className="p-3 rounded-xl bg-bg-surface border border-border-color">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-text-secondary">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Retention Window</span>
            </div>
            <div className="text-base sm:text-lg font-mono font-extrabold text-text-primary mt-1">
              24 Months (2-Yr)
            </div>
            <div className="text-[10px] text-text-muted mt-0.5">Aug 2024 – Aug 2026</div>
          </div>

          <div className="p-3 rounded-xl bg-bg-surface border border-border-color">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-text-secondary">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>2-Yr Net PnL</span>
            </div>
            <div className="text-base sm:text-lg font-mono font-extrabold text-emerald-400 mt-1">
              +${totalAuditedPnl.toLocaleString()}
            </div>
            <div className="text-[10px] text-emerald-500/80 mt-0.5">Audited Deriv Stream</div>
          </div>

          <div className="p-3 rounded-xl bg-bg-surface border border-border-color">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-text-secondary">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Avg Win Rate</span>
            </div>
            <div className="text-base sm:text-lg font-mono font-extrabold text-cyan-300 mt-1">
              {avgWinRate}%
            </div>
            <div className="text-[10px] text-text-muted mt-0.5">{totalAuditedTrades.toLocaleString()} Executions</div>
          </div>

          <div className="p-3 rounded-xl bg-bg-surface border border-border-color">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-text-secondary">
              <Award className="w-3.5 h-3.5 text-purple-400" />
              <span>#1 Victories</span>
            </div>
            <div className="text-base sm:text-lg font-mono font-extrabold text-purple-300 mt-1">
              {entry.firstPlaceFinishesCount}x Window Titles
            </div>
            <div className="text-[10px] text-purple-400/80 mt-0.5">Triple-Leader Certified</div>
          </div>
        </div>

        {/* 24-Month Rolling Performance Retention Logs Table */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
              <Layers className="w-4 h-4 text-accent-primary" />
              <span>Audited 24-Month Rolling Ledger Logs</span>
            </h4>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
              Live Hash Verified
            </span>
          </div>

          <div className="rounded-xl border border-border-color overflow-hidden bg-bg-surface shadow-inner">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-bg-elevated text-text-secondary uppercase text-[10px] tracking-wider border-b border-border-color font-bold font-mono">
                  <tr>
                    <th className="py-2.5 px-3">Month</th>
                    <th className="py-2.5 px-3 text-right">Audited PnL</th>
                    <th className="py-2.5 px-3 text-right">Win Rate</th>
                    <th className="py-2.5 px-3 text-right">Trades</th>
                    <th className="py-2.5 px-3 text-right">Max DD</th>
                    <th className="py-2.5 px-3 text-center">Window Rank</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-color font-mono text-[11px]">
                  {logs.map((row, idx) => (
                    <tr key={row.month} className="hover:bg-bg-hover/60 transition-colors">
                      <td className="py-2 px-3 font-bold text-text-primary flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-text-muted" />
                        <span>{row.month}</span>
                      </td>
                      <td className="py-2 px-3 text-right font-black text-emerald-400">
                        +${row.pnlUsd.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right text-cyan-300 font-bold">
                        {row.winRatePct}%
                      </td>
                      <td className="py-2 px-3 text-right text-text-secondary">
                        {row.tradeCount}
                      </td>
                      <td className="py-2 px-3 text-right text-rose-400 font-medium">
                        {row.maxDrawdownPct}%
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                          row.rankInWindow === 1
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : row.rankInWindow <= 3
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-bg-elevated text-text-secondary'
                        }`}>
                          #{row.rankInWindow}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border-color bg-bg-elevated flex items-center justify-between text-[10px] text-text-muted font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Telemetry Broker Feed: {entry.brokerFeed}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-bg-hover hover:bg-bg-surface text-text-primary border border-border-color font-bold uppercase transition-colors cursor-pointer"
          >
            Close Retention Ledger
          </button>
        </div>

      </div>
    </div>
  );
};
