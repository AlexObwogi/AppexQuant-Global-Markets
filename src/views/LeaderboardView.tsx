/**
 * AppexQuant Markets Global - Multi-Tier Leaderboard & Hall of Fame View
 * Real-Time Tracking across Weekly, Monthly, Yearly Windows
 * 2-Year Rolling Data Retention, Hall of Fame Permanent Archives & Elite Verified Badges
 */

import React, { useState, useEffect } from 'react';
import { LeaderboardWindow, LeaderboardEntry, HallOfFameInductee } from '../types/leaderboard.ts';
import { leaderboardService } from '../services/leaderboard/leaderboardService.ts';
import { VerifiedLeaderBadge } from '../components/leaderboard/VerifiedLeaderBadge.tsx';
import { RetentionModal } from '../components/leaderboard/RetentionModal.tsx';
import { HallOfFameSection } from '../components/leaderboard/HallOfFameSection.tsx';
import { useGlobalState } from '../state/GlobalStateContext.tsx';
import { useSmartQuery } from '../hooks/useSmartQuery.ts';
import {
  Trophy,
  Crown,
  Award,
  Calendar,
  Layers,
  Search,
  TrendingUp,
  Activity,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  Sparkles,
  Clock,
  History,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

export const LeaderboardView: React.FC = () => {
  const { state, dispatch } = useGlobalState();
  const [activeTab, setActiveTab] = useState<'LEADERBOARD' | 'HALL_OF_FAME'>('LEADERBOARD');
  const [selectedWindow, setSelectedWindow] = useState<LeaderboardWindow>('MONTHLY');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRetentionTrader, setSelectedRetentionTrader] = useState<LeaderboardEntry | null>(null);
  const [isRetentionModalOpen, setIsRetentionModalOpen] = useState(false);

  // Scalable Edge-Optimized Query via useSmartQuery (Stale-While-Revalidate with deduplication)
  const {
    data: fetchedEntries,
    isValidating,
    mutate: refreshLeaderboard
  } = useSmartQuery<LeaderboardEntry[]>(
    `/api/leaderboard?window=${selectedWindow}&search=${encodeURIComponent(searchQuery)}`,
    async () => {
      try {
        const res = await fetch(`/api/leaderboard?window=${selectedWindow}&search=${encodeURIComponent(searchQuery)}`);
        const json = await res.json();
        if (json && json.success && Array.isArray(json.data)) {
          return json.data;
        }
      } catch (e) {
        // Fallback to local service cache if offline
      }
      return leaderboardService.getLeaderboard(selectedWindow, searchQuery);
    },
    {
      dedupingInterval: 20000,
      revalidateOnFocus: false,
      initialData: leaderboardService.getLeaderboard(selectedWindow, searchQuery),
    }
  );

  const { data: hallOfFameInductees = leaderboardService.getHallOfFame() } = useSmartQuery<HallOfFameInductee[]>(
    '/api/leaderboard/hall-of-fame',
    async () => {
      try {
        const res = await fetch('/api/leaderboard/hall-of-fame');
        const json = await res.json();
        if (json && json.success && Array.isArray(json.data)) {
          return json.data;
        }
      } catch (e) {}
      return leaderboardService.getHallOfFame();
    },
    {
      dedupingInterval: 60000,
      revalidateOnFocus: false,
      initialData: leaderboardService.getHallOfFame(),
    }
  );

  const entries = fetchedEntries || leaderboardService.getLeaderboard(selectedWindow, searchQuery);

  const handleOpenRetention = (entry: LeaderboardEntry) => {
    setSelectedRetentionTrader(entry);
    setIsRetentionModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto flex flex-col flex-1 pb-10">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-color">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30 font-extrabold uppercase">
              AUDITED LIVE COMPETITION
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold uppercase flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              2-YR ROLLING RETENTION
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight flex items-center gap-2.5">
            <Trophy className="w-8 h-8 text-amber-400" />
            <span>Leaderboard & Hall of Fame</span>
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1 max-w-2xl">
            Real-time performance rankings across Weekly, Monthly, and Yearly windows with 24-month rolling audited ledger retention and permanent Hall of Fame legacy induction.
          </p>
        </div>

        {/* Primary View Switcher Tabs */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-bg-surface border border-border-color shadow-sm font-mono text-xs shrink-0">
          <button
            onClick={() => setActiveTab('LEADERBOARD')}
            className={`px-4 py-2 rounded-xl font-black flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'LEADERBOARD'
                ? 'bg-accent-primary text-bg-main shadow-md'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Live Leaderboard</span>
          </button>

          <button
            onClick={() => setActiveTab('HALL_OF_FAME')}
            className={`px-4 py-2 rounded-xl font-black flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'HALL_OF_FAME'
                ? 'bg-amber-500 text-black shadow-md'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
            }`}
          >
            <Crown className="w-4 h-4" />
            <span>HALL OF FAME ✔️</span>
          </button>
        </div>
      </div>

      {/* RENDER ACTIVE SECTION */}
      {activeTab === 'HALL_OF_FAME' ? (
        <HallOfFameSection inductees={hallOfFameInductees} />
      ) : (
        <div className="space-y-6">
          {/* Controls Bar: Window Selection (Weekly, Monthly, Yearly, All-Time) + Search */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-bg-surface border border-border-color">
            {/* Multi-Tier Timeframe Windows */}
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs w-full md:w-auto">
              {(
                [
                  { id: 'WEEKLY', label: 'Weekly Window', sub: '7-Day Live' },
                  { id: 'MONTHLY', label: 'Monthly Window', sub: 'Current Cycle' },
                  { id: 'YEARLY', label: 'Yearly Window', sub: '2026 Sovereign' },
                  { id: 'ALL_TIME', label: 'All-Time Record', sub: 'Audited Ledger' },
                ] as const
              ).map((win) => (
                <button
                  key={win.id}
                  onClick={() => setSelectedWindow(win.id)}
                  className={`px-3.5 py-2 rounded-xl font-extrabold transition-all cursor-pointer flex flex-col items-start ${
                    selectedWindow === win.id
                      ? 'bg-accent-primary/15 text-accent-primary border border-accent-primary/40 shadow-xs'
                      : 'bg-bg-elevated text-text-secondary hover:bg-bg-hover hover:text-text-primary border border-border-color'
                  }`}
                >
                  <span>{win.label}</span>
                  <span className="text-[9px] opacity-70 font-normal">{win.sub}</span>
                </button>
              ))}
            </div>

            {/* Search Filter & Manual SWR Revalidate */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-text-secondary absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search ranked trader or strategy..."
                  className="w-full bg-bg-main border border-border-color rounded-xl pl-9 pr-3 py-2.5 text-xs text-text-primary focus:outline-none focus:border-accent-primary font-mono"
                />
              </div>
              <button
                onClick={() => refreshLeaderboard()}
                title="Refresh rankings cache"
                className="p-2.5 rounded-xl bg-bg-elevated border border-border-color hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-all cursor-pointer shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${isValidating ? 'animate-spin text-accent-primary' : ''}`} />
              </button>
            </div>
          </div>

          {/* Top 3 Podium Cards */}
          {entries.length >= 3 && !searchQuery && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* #2 Rank Card */}
              {entries[1] && (
                <div className="p-5 rounded-2xl bg-bg-surface border border-border-color hover:border-border-color/80 transition-all flex flex-col justify-between order-2 md:order-1 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3">
                    <span className="w-8 h-8 rounded-xl bg-slate-400/20 border border-slate-400/40 text-slate-300 font-mono font-black text-sm flex items-center justify-center shadow-xs">
                      #2
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-500/20 border border-slate-500/30 flex items-center justify-center font-black text-slate-300 text-base">
                        {entries[1].avatar}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-text-primary">{entries[1].displayName}</h3>
                        <p className="text-[11px] font-mono text-text-secondary">@{entries[1].username}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mb-3">
                      {entries[1].badges.map((b) => (
                        <VerifiedLeaderBadge key={b.type} badge={b} size="sm" />
                      ))}
                    </div>

                    <div className="space-y-1.5 font-mono text-xs bg-bg-main/60 p-3 rounded-xl border border-border-color">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Audited PnL:</span>
                        <span className="font-black text-emerald-400">+${entries[1].pnlUsd.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Win Rate:</span>
                        <span className="font-bold text-cyan-300">{entries[1].winRatePct}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">ROI:</span>
                        <span className="font-bold text-text-primary">+{entries[1].roiPct}%</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenRetention(entries[1])}
                    className="mt-4 w-full py-2 rounded-xl bg-bg-elevated hover:bg-bg-hover text-text-primary border border-border-color font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5 text-cyan-400" />
                    <span>View 2-Yr Retention Log</span>
                  </button>
                </div>
              )}

              {/* #1 Rank Card (Sovereign Winner / All-Time / Triple Leader) */}
              {entries[0] && (
                <div className="p-6 rounded-2xl bg-gradient-to-b from-amber-500/15 via-bg-surface to-bg-surface border-2 border-amber-500/50 shadow-xl flex flex-col justify-between order-1 md:order-2 relative overflow-hidden -translate-y-1">
                  <div className="absolute top-0 right-0 p-3">
                    <span className="w-9 h-9 rounded-xl bg-amber-500 text-black font-mono font-black text-base flex items-center justify-center shadow-lg">
                      #1
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-3.5 mb-3.5">
                      <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border-2 border-amber-400/60 flex items-center justify-center font-black text-amber-300 text-xl shadow-md">
                        {entries[0].avatar}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Crown className="w-4 h-4 text-amber-400" />
                          <h3 className="font-black text-base text-text-primary">{entries[0].displayName}</h3>
                        </div>
                        <p className="text-xs font-mono text-text-secondary">@{entries[0].username}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {entries[0].badges.map((b) => (
                        <VerifiedLeaderBadge key={b.type} badge={b} size="sm" />
                      ))}
                    </div>

                    <div className="space-y-2 font-mono text-xs bg-bg-main/80 p-3.5 rounded-xl border border-amber-500/30 shadow-inner">
                      <div className="flex justify-between items-center">
                        <span className="text-amber-200/80 font-bold uppercase text-[10px]">Audited PnL:</span>
                        <span className="font-black text-emerald-400 text-base">+${entries[0].pnlUsd.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Win Rate:</span>
                        <span className="font-black text-cyan-300 text-sm">{entries[0].winRatePct}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Profit Factor:</span>
                        <span className="font-bold text-purple-300">{entries[0].profitFactor}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Win Streak:</span>
                        <span className="font-bold text-amber-300">{entries[0].streakWins} Consecutive Wins</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenRetention(entries[0])}
                    className="mt-4 w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <History className="w-4 h-4" />
                    <span>Inspect 2-Yr Rolling History</span>
                  </button>
                </div>
              )}

              {/* #3 Rank Card */}
              {entries[2] && (
                <div className="p-5 rounded-2xl bg-bg-surface border border-border-color hover:border-border-color/80 transition-all flex flex-col justify-between order-3 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3">
                    <span className="w-8 h-8 rounded-xl bg-amber-700/20 border border-amber-700/40 text-amber-500 font-mono font-black text-sm flex items-center justify-center shadow-xs">
                      #3
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-xl bg-amber-800/20 border border-amber-700/30 flex items-center justify-center font-black text-amber-500 text-base">
                        {entries[2].avatar}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-text-primary">{entries[2].displayName}</h3>
                        <p className="text-[11px] font-mono text-text-secondary">@{entries[2].username}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-3">
                      {entries[2].badges.map((b) => (
                        <VerifiedLeaderBadge key={b.type} badge={b} size="sm" />
                      ))}
                    </div>

                    <div className="space-y-1.5 font-mono text-xs bg-bg-main/60 p-3 rounded-xl border border-border-color">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Audited PnL:</span>
                        <span className="font-black text-emerald-400">+${entries[2].pnlUsd.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Win Rate:</span>
                        <span className="font-bold text-cyan-300">{entries[2].winRatePct}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">ROI:</span>
                        <span className="font-bold text-text-primary">+{entries[2].roiPct}%</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenRetention(entries[2])}
                    className="mt-4 w-full py-2 rounded-xl bg-bg-elevated hover:bg-bg-hover text-text-primary border border-border-color font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5 text-cyan-400" />
                    <span>View 2-Yr Retention Log</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Full Ranked Leaderboard Table */}
          <div className="rounded-2xl border border-border-color bg-bg-surface overflow-hidden shadow-lg">
            <div className="p-4 border-b border-border-color bg-bg-elevated flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-text-primary font-mono flex items-center gap-2">
                  <Activity className="w-4 h-4 text-accent-primary" />
                  <span>Ranked Performance Standings ({selectedWindow})</span>
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live Deriv Telemetry Stream</span>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-bg-main text-text-secondary uppercase text-[10px] tracking-wider border-b border-border-color font-bold font-mono">
                  <tr>
                    <th className="py-3 px-4 text-center">Rank</th>
                    <th className="py-3 px-4">Trader & Verified Badging</th>
                    <th className="py-3 px-4 text-right">Audited PnL</th>
                    <th className="py-3 px-4 text-right">ROI %</th>
                    <th className="py-3 px-4 text-right">Win Rate</th>
                    <th className="py-3 px-4 text-right">Profit Factor</th>
                    <th className="py-3 px-4 text-right">Trades</th>
                    <th className="py-3 px-4 text-right">Max DD</th>
                    <th className="py-3 px-4 text-center">2-Yr Ledger</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-color font-mono text-xs">
                  {entries.map((entry) => (
                    <tr key={entry.userId} className="hover:bg-bg-hover/60 transition-colors">
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg font-black text-xs ${
                          entry.rank === 1
                            ? 'bg-amber-500 text-black shadow-md'
                            : entry.rank === 2
                            ? 'bg-slate-400/20 text-slate-300 border border-slate-400/40'
                            : entry.rank === 3
                            ? 'bg-amber-700/20 text-amber-500 border border-amber-700/40'
                            : 'text-text-secondary bg-bg-elevated'
                        }`}>
                          {entry.rank}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-accent-primary/15 border border-accent-primary/30 flex items-center justify-center font-bold text-xs text-accent-primary shrink-0">
                            {entry.avatar}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-text-primary text-xs font-sans">
                                {entry.displayName}
                              </span>
                              <span className="text-[10px] text-text-muted">({entry.country})</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1 mt-1">
                              {entry.badges.map((b) => (
                                <VerifiedLeaderBadge key={b.type} badge={b} size="sm" />
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-black text-emerald-400 text-sm">
                        +${entry.pnlUsd.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold text-text-primary">
                        +{entry.roiPct}%
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold text-cyan-300">
                        {entry.winRatePct}%
                      </td>

                      <td className="py-3.5 px-4 text-right font-medium text-purple-300">
                        {entry.profitFactor}
                      </td>

                      <td className="py-3.5 px-4 text-right text-text-secondary">
                        {entry.totalTrades}
                      </td>

                      <td className="py-3.5 px-4 text-right text-rose-400 font-medium">
                        {entry.maxDrawdownPct}%
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleOpenRetention(entry)}
                          className="px-2.5 py-1.5 rounded-lg bg-bg-elevated hover:bg-bg-hover text-cyan-400 border border-cyan-500/30 hover:border-cyan-400 text-[10px] font-bold uppercase transition-colors cursor-pointer flex items-center gap-1 mx-auto"
                        >
                          <History className="w-3 h-3" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2-Year Rolling Retention Ledger Modal */}
      <RetentionModal
        entry={selectedRetentionTrader}
        isOpen={isRetentionModalOpen}
        onClose={() => setIsRetentionModalOpen(false)}
      />
    </div>
  );
};
