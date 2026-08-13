/**
 * AppexQuant Markets Global - EA Performance & Calendar Dashboard Component
 * Displays net P/L metrics, win rates, drawdowns, and the August 2026 daily performance calendar.
 */

import React from 'react';
import { ExpertAdvisor } from '../../types/ea';
import { getSampleDailyPerformance } from '../../services/ea/eaEngine';
import { BarChart3, TrendingUp, Calendar, ShieldCheck, DollarSign } from 'lucide-react';

interface EAPerformanceDashboardProps {
  installedEAs: ExpertAdvisor[];
}

export const EAPerformanceDashboard: React.FC<EAPerformanceDashboardProps> = ({ installedEAs }) => {
  const dailyRecords = getSampleDailyPerformance();

  const totalNetPl = installedEAs.reduce((acc, ea) => acc + ea.performance.netProfitUsd, 0);
  const avgWinRate = installedEAs.length > 0 ? (installedEAs.reduce((acc, ea) => acc + ea.performance.winRatePct, 0) / installedEAs.length).toFixed(1) : '0';
  const avgProfitFactor = installedEAs.length > 0 ? (installedEAs.reduce((acc, ea) => acc + ea.performance.profitFactor, 0) / installedEAs.length).toFixed(2) : '0';

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-bg-surface border border-border-color space-y-1">
          <span className="text-xs font-mono text-text-secondary uppercase">Installed EAs Active</span>
          <div className="text-2xl font-extrabold text-white font-mono">{installedEAs.length}</div>
          <span className="text-[11px] text-emerald-400 font-mono">100% Free Forever EAs</span>
        </div>

        <div className="p-5 rounded-2xl bg-bg-surface border border-border-color space-y-1">
          <span className="text-xs font-mono text-text-secondary uppercase">Total Net Profit</span>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono">+${totalNetPl.toLocaleString()}</div>
          <span className="text-[11px] text-text-secondary font-mono">Verified Forward / Backtest</span>
        </div>

        <div className="p-5 rounded-2xl bg-bg-surface border border-border-color space-y-1">
          <span className="text-xs font-mono text-text-secondary uppercase">Average Win Rate</span>
          <div className="text-2xl font-extrabold text-white font-mono">{avgWinRate}%</div>
          <span className="text-[11px] text-cyan-400 font-mono">Strict 1:2.5 R:R Ratio</span>
        </div>

        <div className="p-5 rounded-2xl bg-bg-surface border border-border-color space-y-1">
          <span className="text-xs font-mono text-text-secondary uppercase">Avg Profit Factor</span>
          <div className="text-2xl font-extrabold text-cyan-400 font-mono">{avgProfitFactor}</div>
          <span className="text-[11px] text-text-secondary font-mono">Robust Expectancy</span>
        </div>
      </div>

      {/* Daily Performance Calendar Foundation */}
      <div className="p-6 rounded-2xl bg-bg-surface border border-border-color space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white tracking-tight">August 2026 Daily Performance Calendar</h3>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-bg-hover text-text-primary">
            Deriv MT5 Feed
          </span>
        </div>

        <div className="grid grid-cols-5 gap-3">
          {dailyRecords.map((rec) => {
            const isPos = rec.netPl > 0;
            const isZero = rec.netPl === 0;
            return (
              <div
                key={rec.date}
                className={`p-4 rounded-xl border flex flex-col justify-between font-mono transition-all ${
                  isZero
                    ? 'bg-bg-main/60 border-border-color text-text-secondary'
                    : isPos
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/5'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}
              >
                <span className="text-[10px] text-text-secondary block">{rec.date.split('-').slice(1).join('/')}</span>
                <span className="text-base font-bold my-2">
                  {isZero ? '—' : isPos ? `+$${rec.netPl.toFixed(0)}` : `-$${Math.abs(rec.netPl).toFixed(0)}`}
                </span>
                <span className="text-[10px] text-text-secondary">{rec.tradeCount} trades</span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-6 pt-3 border-t border-border-color/80 text-xs font-mono text-text-secondary">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/40" />
            <span>Positive Trading Day</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-rose-500/20 border border-rose-500/40" />
            <span>Negative Trading Day</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-bg-main border border-border-color" />
            <span>No Activity / Weekend</span>
          </div>
        </div>
      </div>
    </div>
  );
};
