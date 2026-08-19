import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Filter,
  RefreshCw,
  BookOpen,
  PieChart as PieChartIcon,
  Activity,
  User,
  Shield,
  Clock,
  Briefcase,
  AlertTriangle,
  FileText,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  PenTool,
  Cpu,
  Trash2
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  ComposedChart,
  Line,
  ReferenceLine,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  Legend
} from 'recharts';

import { TradeJournalRecord, AnalyticsSummary } from '../types/analytics.ts';
import { useApiFetch } from '../utils/apiFetch.ts';
import { calculatePerformanceMetrics } from '../utils/analyticsCalc.ts';
import { PerformanceBadge, PerformanceDisclaimerBanner } from '../components/common/PerformanceDisclaimer.tsx';

export const AnalyticsView: React.FC = () => {
  const apiFetch = useApiFetch();
  const [trades, setTrades] = useState<TradeJournalRecord[]>([]);
  const [metrics, setMetrics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [dateFilter, setDateFilter] = useState<'ALL' | '7D' | '30D'>('ALL');
  const [symbolFilter, setSymbolFilter] = useState<string>('ALL');
  const [strategyFilter, setStrategyFilter] = useState<string>('ALL');
  const [accountFilter, setAccountFilter] = useState<string>('ALL');
  const [sessionFilter, setSessionFilter] = useState<string>('ALL');
  const [directionFilter, setDirectionFilter] = useState<string>('ALL');
  const [regimeFilter, setRegimeFilter] = useState<string>('ALL');

  // Interactive View States
  const [activeTab, setActiveTab] = useState<'overview' | 'charts' | 'journal'>('overview');
  const [expandedTradeId, setExpandedTradeId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<string>('');
  const [savingNotesId, setSavingNotesId] = useState<string | null>(null);
  const [aiGeneratingId, setAiGeneratingId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Fetch from Server
  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch('/api/analytics/trades');
      if (!res.ok) throw new Error('Server responded with an error loading analytics');
      const data = await res.json();
      if (data.success && data.data) {
        setTrades(data.data.trades);
        setMetrics(data.data.metrics);
      } else {
        throw new Error(data.error?.message || 'Failed to parse analytics records');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to establish persistent websocket and api endpoints.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Sync with broker simulated dispatch
  const handleSyncBroker = async () => {
    try {
      setSyncing(true);
      // Synchronize latest broker actions and then fetch fresh analytics
      const syncRes = await apiFetch('/api/execution/sync', { method: 'POST' });
      if (syncRes.ok) {
        // Also fetch updated positions
        await apiFetch('/api/positions');
        await fetchAnalytics();
      }
    } catch (err) {
      console.error('Failed to sync broker:', err);
    } finally {
      setSyncing(false);
    }
  };

  // Reset database state
  const handleResetDatabase = async () => {
    if (!window.confirm('Are you sure you want to revert all manual journal modifications and restore initial seed trades?')) {
      return;
    }
    try {
      setLoading(true);
      const res = await apiFetch('/api/analytics/reset', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setTrades(data.data.trades);
          setMetrics(data.data.metrics);
          setExpandedTradeId(null);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reset analytics ledger.');
    } finally {
      setLoading(false);
    }
  };

  // Save manual notes for a specific trade
  const handleSaveNotes = async (tradeId: string) => {
    try {
      setSavingNotesId(tradeId);
      const res = await apiFetch(`/api/analytics/trades/${tradeId}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notesDraft })
      });
      if (!res.ok) throw new Error('Failed to update notes on server');
      const data = await res.json();
      if (data.success && data.data) {
        // Update local trade list state
        setTrades(prev => prev.map(t => t.id === tradeId ? { ...t, notes: data.data.notes } : t));
        // Simple success notification visual indicator
        const btn = document.getElementById(`save-btn-${tradeId}`);
        if (btn) {
          const origText = btn.innerHTML;
          btn.innerHTML = 'Saved ✓';
          btn.classList.add('bg-emerald-600', 'text-text-primary');
          setTimeout(() => {
            btn.innerHTML = origText;
            btn.classList.remove('bg-emerald-600', 'text-text-primary');
          }, 1500);
        }
      }
    } catch (err) {
      console.error(err);
      alert('Error updating trade record notes.');
    } finally {
      setSavingNotesId(null);
    }
  };

  // Trigger Gemini AI post-trade summary generation
  const handleTriggerAISummary = async (tradeId: string) => {
    try {
      setAiGeneratingId(tradeId);
      const res = await apiFetch(`/api/analytics/trades/${tradeId}/ai-summary`, { method: 'POST' });
      if (!res.ok) throw new Error('AI summary generation failed');
      const data = await res.json();
      if (data.success && data.data) {
        setTrades(prev => prev.map(t => t.id === tradeId ? { ...t, aiSummary: data.data.aiSummary } : t));
      }
    } catch (err) {
      console.error('AI Summary failed:', err);
      alert('Failed to connect to server-side Gemini gateway. Using expert fallback summary.');
    } finally {
      setAiGeneratingId(null);
    }
  };

  // Multi-dimensional Client Side Filtering
  const filteredTrades = trades.filter(t => {
    // 1. Date filter
    if (dateFilter !== 'ALL') {
      const tradeTime = new Date(t.exitTime).getTime();
      const cutoff = dateFilter === '7D' ? 7 * 24 * 3600 * 1000 : 30 * 24 * 3600 * 1000;
      if (Date.now() - tradeTime > cutoff) return false;
    }
    // 2. Symbol filter
    if (symbolFilter !== 'ALL' && t.symbol !== symbolFilter) return false;
    // 3. Strategy filter
    if (strategyFilter !== 'ALL' && t.strategyId !== strategyFilter) return false;
    // 4. Account filter
    if (accountFilter !== 'ALL' && t.accountId !== accountFilter) return false;
    // 5. Session filter
    if (sessionFilter !== 'ALL' && t.session !== sessionFilter) return false;
    // 6. Direction filter
    if (directionFilter !== 'ALL' && t.side !== directionFilter) return false;
    // 7. Market Regime filter
    if (regimeFilter !== 'ALL' && t.marketRegime !== regimeFilter) return false;

    return true;
  });

  // Calculate live metrics on filtered subset for instant interactive responsiveness
  const activeMetrics = calculatePerformanceMetrics(filteredTrades);

  // Collect unique values for dynamic dropdown population
  const uniqueSymbols = Array.from(new Set(trades.map(t => t.symbol)));
  const uniqueStrategies = Array.from(new Set(trades.map(t => t.strategyId)));
  const uniqueAccounts = Array.from(new Set(trades.map(t => t.accountId)));
  const uniqueSessions = Array.from(new Set(trades.map(t => t.session)));
  const uniqueRegimes = Array.from(new Set(trades.map(t => t.marketRegime)));

  // Generate Cumulative Balance Data for Recharts AreaChart
  const chronologicalFiltered = [...filteredTrades].sort(
    (a, b) => new Date(a.exitTime).getTime() - new Date(b.exitTime).getTime()
  );
  let balanceSum = 100000;
  const equityCurve = chronologicalFiltered.map((t, index) => {
    balanceSum += t.pnlUsd;
    return {
      name: `Trade ${index + 1}`,
      tradeId: t.id,
      pnl: t.pnlUsd,
      balance: balanceSum,
      symbol: t.symbol,
      date: new Date(t.exitTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    };
  });

  const chartData = [
    { name: 'Initial', tradeId: '', pnl: 0, balance: 100000, symbol: '', date: 'Start' },
    ...equityCurve
  ];

  const clearAllFilters = () => {
    setDateFilter('ALL');
    setSymbolFilter('ALL');
    setStrategyFilter('ALL');
    setAccountFilter('ALL');
    setSessionFilter('ALL');
    setDirectionFilter('ALL');
    setRegimeFilter('ALL');
  };

  const hasActiveFilters = 
    dateFilter !== 'ALL' ||
    symbolFilter !== 'ALL' ||
    strategyFilter !== 'ALL' ||
    accountFilter !== 'ALL' ||
    sessionFilter !== 'ALL' ||
    directionFilter !== 'ALL' ||
    regimeFilter !== 'ALL';

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6" id="analytics-root">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-color pb-5" id="analytics-header">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-text-secondary font-display flex items-center gap-2">
              <Activity className="w-6 h-6 text-indigo-600" />
              Advanced Performance Analytics
            </h1>
            <PerformanceBadge environment="SIMULATED" size="sm" />
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Real-time quantitative trade journaling, risk matrix evaluation, and AI-driven post-trade summaries.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSyncBroker}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100 hover:border-indigo-200 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            Sync Broker Sync
          </button>
          
          <button
            onClick={handleResetDatabase}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-text-secondary bg-zinc-50 border border-border-color rounded-lg hover:bg-bg-hover transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-text-secondary" />
            Reset Ledger
          </button>
        </div>
      </div>

      {/* MANDATORY PERFORMANCE DISCLAIMER */}
      <PerformanceDisclaimerBanner environment="SIMULATED" title="Historical Journal & Performance Disclosure" />

      {/* ERROR WARNING STATE */}
      {error && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 flex items-start gap-3" id="error-alert">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-sm">Synchronisation Alert</h3>
            <p className="text-xs text-amber-700 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* FILTERS PANEL */}
      <div className="bg-bg-surface border border-border-color rounded-xl p-4 shadow-sm space-y-4" id="filters-panel">
        <div className="flex items-center justify-between border-b border-zinc-50 pb-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-text-secondary">
            <Filter className="w-3.5 h-3.5" />
            Dimensional Analysis Filters
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {/* Date Picker Range */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Date Range
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="w-full text-xs font-medium text-text-secondary bg-zinc-50 border border-border-color rounded-lg px-2.5 py-2 hover:bg-bg-hover transition-colors focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="ALL">All Time</option>
              <option value="7D">Last 7 Days</option>
              <option value="30D">Last 30 Days</option>
            </select>
          </div>

          {/* Symbol Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1">
              <Briefcase className="w-3 h-3" /> Asset Symbol
            </label>
            <select
              value={symbolFilter}
              onChange={(e) => setSymbolFilter(e.target.value)}
              className="w-full text-xs font-medium text-text-secondary bg-zinc-50 border border-border-color rounded-lg px-2.5 py-2 hover:bg-bg-hover transition-colors focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="ALL">All Symbols</option>
              {uniqueSymbols.map(sym => (
                <option key={sym} value={sym}>{sym}</option>
              ))}
            </select>
          </div>

          {/* Strategy Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1">
              <Cpu className="w-3 h-3" /> Strategy
            </label>
            <select
              value={strategyFilter}
              onChange={(e) => setStrategyFilter(e.target.value)}
              className="w-full text-xs font-medium text-text-secondary bg-zinc-50 border border-border-color rounded-lg px-2.5 py-2 hover:bg-bg-hover transition-colors focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="ALL">All Strategies</option>
              {uniqueStrategies.map(strat => (
                <option key={strat} value={strat}>
                  {strat === 'strat-ai-01' ? 'AI RL Trend-Slayer' : strat === 'strat-01' ? 'Bollinger Mean Reversion' : strat === 'strat-02' ? 'SMA Cross Momentum' : strat}
                </option>
              ))}
            </select>
          </div>

          {/* Account Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1">
              <User className="w-3 h-3" /> Account
            </label>
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="w-full text-xs font-medium text-text-secondary bg-zinc-50 border border-border-color rounded-lg px-2.5 py-2 hover:bg-bg-hover transition-colors focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="ALL">All Accounts</option>
              {uniqueAccounts.map(acc => (
                <option key={acc} value={acc}>{acc === 'acc-demo-001' ? 'Demo Portfolio (1)' : acc}</option>
              ))}
            </select>
          </div>

          {/* Trading Session Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1">
              <Clock className="w-3 h-3" /> Session
            </label>
            <select
              value={sessionFilter}
              onChange={(e) => setSessionFilter(e.target.value)}
              className="w-full text-xs font-medium text-text-secondary bg-zinc-50 border border-border-color rounded-lg px-2.5 py-2 hover:bg-bg-hover transition-colors focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="ALL">All Sessions</option>
              {uniqueSessions.map(sess => (
                <option key={sess} value={sess}>{sess} Open</option>
              ))}
            </select>
          </div>

          {/* Trade Direction Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1">
              <Activity className="w-3 h-3" /> Side Direction
            </label>
            <select
              value={directionFilter}
              onChange={(e) => setDirectionFilter(e.target.value)}
              className="w-full text-xs font-medium text-text-secondary bg-zinc-50 border border-border-color rounded-lg px-2.5 py-2 hover:bg-bg-hover transition-colors focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="ALL">BUY & SHORT</option>
              <option value="BUY">BUY Only</option>
              <option value="SHORT">SHORT Only</option>
            </select>
          </div>

          {/* Market Regime Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1">
              <Shield className="w-3 h-3" /> Regime
            </label>
            <select
              value={regimeFilter}
              onChange={(e) => setRegimeFilter(e.target.value)}
              className="w-full text-xs font-medium text-text-secondary bg-zinc-50 border border-border-color rounded-lg px-2.5 py-2 hover:bg-bg-hover transition-colors focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="ALL">All Regimes</option>
              {uniqueRegimes.map(reg => (
                <option key={reg} value={reg}>{reg}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* SEGMENTED TAB NAV */}
      <div className="flex border-b border-border-color" id="tabs-navigation">
        <button
          onClick={() => { setActiveTab('overview'); setExpandedTradeId(null); }}
          className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'overview'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-text-secondary hover:text-text-secondary'
          }`}
        >
          <Activity className="w-4 h-4" />
          Metrics Matrix
        </button>
        <button
          onClick={() => { setActiveTab('charts'); setExpandedTradeId(null); }}
          className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'charts'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-text-secondary hover:text-text-secondary'
          }`}
        >
          <PieChartIcon className="w-4 h-4" />
          Equity & Contributions
        </button>
        <button
          onClick={() => { setActiveTab('journal'); }}
          className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'journal'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-text-secondary hover:text-text-secondary'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Trade Journal Ledger
          <span className="bg-bg-hover text-text-secondary px-1.5 py-0.5 rounded text-[10px] ml-1">
            {filteredTrades.length}
          </span>
        </button>
      </div>

      {/* MAIN VIEWPORT PANELS */}
      {loading ? (
        <div className="h-96 flex flex-col items-center justify-center gap-2" id="loading-spinner">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm font-medium text-text-secondary">Recalculating algorithmic database indices...</p>
        </div>
      ) : filteredTrades.length === 0 ? (
        <div className="bg-bg-surface border border-border-color rounded-xl p-12 text-center text-text-secondary space-y-3" id="empty-state">
          <FileText className="w-12 h-12 text-text-secondary mx-auto" />
          <h3 className="text-base font-semibold text-text-secondary">No matching trades found</h3>
          <p className="text-xs text-text-secondary max-w-sm mx-auto">
            Your current filter configuration returned zero journal lines. Re-adjust your filters to analyze other ledger records.
          </p>
          <button
            onClick={clearAllFilters}
            className="mt-2 text-xs font-semibold px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="space-y-6"
        >
          {/* TAB 1: OVERVIEW METRICS GRID */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="overview-tab">
              {/* Gross Profit / Loss Metrics */}
              <div className="bg-bg-surface border border-border-color p-4 rounded-xl shadow-sm space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary block">Profit Factor</span>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-2xl font-bold tracking-tight font-display ${activeMetrics.profitFactor >= 2 ? 'text-emerald-700' : activeMetrics.profitFactor >= 1.2 ? 'text-indigo-700' : 'text-amber-700'}`}>
                    {activeMetrics.profitFactor.toFixed(2)}
                  </span>
                </div>
                <div className="text-[10px] text-text-secondary flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  Gross Profit / Gross Loss ratio
                </div>
              </div>

              <div className="bg-bg-surface border border-border-color p-4 rounded-xl shadow-sm space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary block">Sharpe Ratio</span>
                <span className="text-2xl font-bold tracking-tight font-display text-text-secondary">
                  {activeMetrics.sharpeRatio.toFixed(3)}
                </span>
                <div className="text-[10px] text-text-secondary flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-indigo-600" />
                  Vol-adjusted efficiency curve
                </div>
              </div>

              <div className="bg-bg-surface border border-border-color p-4 rounded-xl shadow-sm space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary block">Sortino Ratio</span>
                <span className="text-2xl font-bold tracking-tight font-display text-text-secondary">
                  {activeMetrics.sortinoRatio.toFixed(3)}
                </span>
                <div className="text-[10px] text-text-secondary flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                  Downside-only risk ratio
                </div>
              </div>

              <div className="bg-bg-surface border border-border-color p-4 rounded-xl shadow-sm space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary block">Expectancy</span>
                <span className={`text-2xl font-bold tracking-tight font-display ${activeMetrics.expectancy >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  ${activeMetrics.expectancy.toFixed(2)}
                </span>
                <div className="text-[10px] text-text-secondary flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  Average mathematical trade return
                </div>
              </div>

              {/* Drawdown & Recovery */}
              <div className="bg-bg-surface border border-border-color p-4 rounded-xl shadow-sm space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary block">Max Drawdown</span>
                <span className="text-2xl font-bold tracking-tight font-display text-rose-700">
                  ${activeMetrics.maxDrawdown.toLocaleString()}
                </span>
                <div className="text-[10px] text-text-secondary flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  Peak-to-trough balance drop
                </div>
              </div>

              <div className="bg-bg-surface border border-border-color p-4 rounded-xl shadow-sm space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary block">Recovery Factor</span>
                <span className={`text-2xl font-bold tracking-tight font-display ${activeMetrics.recoveryFactor >= 1.5 ? 'text-emerald-700' : 'text-indigo-700'}`}>
                  {activeMetrics.recoveryFactor.toFixed(2)}
                </span>
                <div className="text-[10px] text-text-secondary flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  Net Profit / Max Drawdown depth
                </div>
              </div>

              {/* Win / Loss Rates */}
              <div className="bg-bg-surface border border-border-color p-4 rounded-xl shadow-sm space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary block">Win Rate</span>
                <span className="text-2xl font-bold tracking-tight font-display text-emerald-700">
                  {(activeMetrics.winRate * 100).toFixed(1)}%
                </span>
                <div className="text-[10px] text-text-secondary flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  {filteredTrades.filter(t => t.pnlUsd > 0).length} of {filteredTrades.length} trades positive
                </div>
              </div>

              <div className="bg-bg-surface border border-border-color p-4 rounded-xl shadow-sm space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary block">Loss Rate</span>
                <span className="text-2xl font-bold tracking-tight font-display text-rose-700">
                  {(activeMetrics.lossRate * 100).toFixed(1)}%
                </span>
                <div className="text-[10px] text-text-secondary flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  {filteredTrades.filter(t => t.pnlUsd < 0).length} of {filteredTrades.length} trades negative
                </div>
              </div>

              {/* Averages */}
              <div className="bg-bg-surface border border-border-color p-4 rounded-xl shadow-sm space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary block">Average R-Multiple</span>
                <span className={`text-2xl font-bold tracking-tight font-display ${activeMetrics.averageR >= 1 ? 'text-emerald-700' : activeMetrics.averageR >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}>
                  {activeMetrics.averageR.toFixed(2)}R
                </span>
                <div className="text-[10px] text-text-secondary flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                  Average R risk reward units
                </div>
              </div>

              <div className="bg-bg-surface border border-border-color p-4 rounded-xl shadow-sm space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary block">Average Winner</span>
                <span className="text-2xl font-bold tracking-tight font-display text-emerald-700">
                  +${activeMetrics.averageWinner.toLocaleString()}
                </span>
                <div className="text-[10px] text-text-secondary flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                  Mean of winning closed lines
                </div>
              </div>

              <div className="bg-bg-surface border border-border-color p-4 rounded-xl shadow-sm space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary block">Average Loser</span>
                <span className="text-2xl font-bold tracking-tight font-display text-rose-700">
                  -${Math.abs(activeMetrics.averageLoser).toLocaleString()}
                </span>
                <div className="text-[10px] text-text-secondary flex items-center gap-1">
                  <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
                  Mean of losing closed lines
                </div>
              </div>

              <div className="bg-bg-surface border border-border-color p-4 rounded-xl shadow-sm space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary block">Average Holding Time</span>
                <span className="text-2xl font-bold tracking-tight font-display text-text-secondary">
                  {activeMetrics.averageHoldingTimeMin >= 60 
                    ? `${Math.floor(activeMetrics.averageHoldingTimeMin / 60)}h ${activeMetrics.averageHoldingTimeMin % 60}m`
                    : `${activeMetrics.averageHoldingTimeMin} min`
                  }
                </span>
                <div className="text-[10px] text-text-secondary flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  Open to execution exit duration
                </div>
              </div>

              {/* Exposure and Frequency */}
              <div className="bg-bg-surface border border-border-color p-4 rounded-xl shadow-sm space-y-1.5 col-span-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary block">Mean Exposure USD</span>
                <span className="text-2xl font-bold tracking-tight font-display text-text-secondary">
                  ${activeMetrics.totalExposureUsd.toLocaleString()}
                </span>
                <div className="text-[10px] text-text-secondary flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-indigo-600" />
                  Leveraged face value under management
                </div>
              </div>

              <div className="bg-bg-surface border border-border-color p-4 rounded-xl shadow-sm space-y-1.5 col-span-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary block">Trade Frequency</span>
                <span className="text-2xl font-bold tracking-tight font-display text-text-secondary">
                  {activeMetrics.tradeFrequency.toFixed(2)} trades / day
                </span>
                <div className="text-[10px] text-text-secondary flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  Average transaction deployment rate
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CHARTS & VISUALIZATION */}
          {activeTab === 'charts' && (
            <div className="space-y-6" id="charts-tab">
              {/* Recharts PnL Performance Trend Line Chart */}
              <div className="bg-bg-surface border border-border-color p-5 rounded-2xl shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-color pb-3">
                  <div>
                    <h3 className="text-base font-bold text-text-primary font-display flex items-center gap-2">
                      <span>PnL Performance & Equity Trend Line</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        LIVE BROKER DATA
                      </span>
                    </h3>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Chronological balance trajectory and individual transaction PnL trend line across {filteredTrades.length} trades
                    </p>
                  </div>

                  <div className="flex items-center space-x-3 font-mono text-xs">
                    <div className="text-right">
                      <span className="text-[10px] text-text-secondary uppercase block">Net Realized PnL</span>
                      <span className={`font-bold ${activeMetrics.netProfitUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {activeMetrics.netProfitUsd >= 0 ? '+' : ''}${activeMetrics.netProfitUsd.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-right border-l border-border-color pl-3">
                      <span className="text-[10px] text-text-secondary uppercase block">Return %</span>
                      <span className={`font-bold ${activeMetrics.netProfitUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {((activeMetrics.netProfitUsd / 100000) * 100).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 15, right: 15, left: -5, bottom: 5 }}>
                      <defs>
                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.5} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <YAxis
                        yAxisId="left"
                        stroke="#94a3b8"
                        fontSize={10}
                        tickLine={false}
                        domain={['dataMin - 1000', 'dataMax + 1000']}
                        tickFormatter={(v) => `$${v.toLocaleString()}`}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#0284c7"
                        fontSize={10}
                        tickLine={false}
                        tickFormatter={(v) => `$${v}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '12px',
                          color: '#f8fafc',
                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                        }}
                        formatter={(value: any, name: any) => {
                          if (name === 'balance') return [`$${Number(value).toLocaleString()}`, 'Account Equity'];
                          if (name === 'pnl') return [`$${Number(value) >= 0 ? '+' : ''}${Number(value).toLocaleString()}`, 'Trade PnL'];
                          return [value, name];
                        }}
                        labelFormatter={(label, items) => {
                          if (items && items[0]) {
                            const p = items[0].payload;
                            return `Trade Ref: ${p.tradeId || 'Baseline'} ${p.symbol ? `(${p.symbol})` : ''} • ${p.date}`;
                          }
                          return label;
                        }}
                      />
                      <ReferenceLine yAxisId="left" y={100000} stroke="#64748b" strokeDasharray="4 4" label={{ value: 'Baseline ($100k)', fill: '#64748b', fontSize: 10, position: 'insideTopLeft' }} />
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="balance"
                        name="balance"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorBalance)"
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="pnl"
                        name="pnl"
                        stroke="#0284c7"
                        strokeWidth={2}
                        dot={{ r: 3, fill: '#0284c7' }}
                        activeDot={{ r: 6, fill: '#38bdf8' }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Strategy & Symbol Contribution side-by-side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Strategy Contribution */}
                <div className="bg-bg-surface border border-border-color p-5 rounded-xl shadow-sm space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-text-secondary">Strategy Contribution</h3>
                    <p className="text-[11px] text-text-secondary mt-0.5">Net P&L performance and distribution of active algorithmic rules.</p>
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={activeMetrics.strategyContribution}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                        <XAxis
                          dataKey="strategyId"
                          stroke="#a1a1aa"
                          fontSize={10}
                          tickLine={false}
                          tickFormatter={(v) => v === 'strat-ai-01' ? 'AI RL Trend' : v === 'strat-01' ? 'Bollinger MR' : v === 'strat-02' ? 'SMA Momentum' : v}
                        />
                        <YAxis stroke="#a1a1aa" fontSize={10} tickLine={false} tickFormatter={(v) => `$${v}`} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e4e4e7', borderRadius: '8px' }}
                          formatter={(v: any) => [`$${v.toLocaleString()}`, 'Net Profit']}
                        />
                        <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                          {activeMetrics.strategyContribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#f43f5e'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Symbol Contribution */}
                <div className="bg-bg-surface border border-border-color p-5 rounded-xl shadow-sm space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-text-secondary">Asset Symbol Contribution</h3>
                    <p className="text-[11px] text-text-secondary mt-0.5">Aggregate performance metrics mapped by individual currency pairs and crypto.</p>
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={activeMetrics.symbolContribution}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                        <XAxis dataKey="symbol" stroke="#a1a1aa" fontSize={10} tickLine={false} />
                        <YAxis stroke="#a1a1aa" fontSize={10} tickLine={false} tickFormatter={(v) => `$${v}`} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e4e4e7', borderRadius: '8px' }}
                          formatter={(v: any) => [`$${v.toLocaleString()}`, 'Net P&L']}
                        />
                        <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                          {activeMetrics.symbolContribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#f43f5e'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Session Contribution */}
                <div className="bg-bg-surface border border-border-color p-5 rounded-xl shadow-sm space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-text-secondary">Trading Session Breakdown</h3>
                    <p className="text-[11px] text-text-secondary mt-0.5">Net P&L generated across different operational global trading sessions.</p>
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={activeMetrics.sessionContribution}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                        <XAxis dataKey="session" stroke="#a1a1aa" fontSize={10} tickLine={false} />
                        <YAxis stroke="#a1a1aa" fontSize={10} tickLine={false} tickFormatter={(v) => `$${v}`} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e4e4e7', borderRadius: '8px' }}
                          formatter={(v: any) => [`$${v.toLocaleString()}`, 'P&L']}
                        />
                        <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                          {activeMetrics.sessionContribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#f43f5e'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Hour of Day Distribution */}
                <div className="bg-bg-surface border border-border-color p-5 rounded-xl shadow-sm space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-text-secondary">Time-of-day Hour Contribution</h3>
                    <p className="text-[11px] text-text-secondary mt-0.5">Net performance breakdown by UTC hour of trade entry execution.</p>
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={activeMetrics.timeOfDayContribution}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                        <XAxis dataKey="hour" stroke="#a1a1aa" fontSize={10} tickLine={false} tickFormatter={(h) => `${h}:00`} />
                        <YAxis stroke="#a1a1aa" fontSize={10} tickLine={false} tickFormatter={(v) => `$${v}`} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e4e4e7', borderRadius: '8px' }}
                          formatter={(v: any) => [`$${v.toLocaleString()}`, 'P&L']}
                        />
                        <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>
                          {activeMetrics.timeOfDayContribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#f43f5e'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TRADE JOURNAL LEDGER */}
          {activeTab === 'journal' && (
            <div className="bg-bg-surface border border-border-color rounded-xl shadow-sm overflow-hidden" id="journal-tab">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-50 text-text-secondary font-bold uppercase tracking-wider border-b border-border-color">
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Symbol</th>
                      <th className="px-4 py-3">Direction</th>
                      <th className="px-4 py-3 text-right">Size</th>
                      <th className="px-4 py-3 text-right">Entry / Exit</th>
                      <th className="px-4 py-3 text-right">PnL USD</th>
                      <th className="px-4 py-3">Strategy</th>
                      <th className="px-4 py-3">Reason</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-medium text-text-secondary">
                    {filteredTrades.map(t => {
                      const isExpanded = expandedTradeId === t.id;
                      return (
                        <React.Fragment key={t.id}>
                          <tr className={`hover:bg-zinc-50/55 transition-colors ${isExpanded ? 'bg-indigo-50/20' : ''}`}>
                            <td className="px-4 py-3 font-mono text-text-secondary">#{t.id.split('-')[1] || t.id}</td>
                            <td className="px-4 py-3 text-text-secondary">
                              {new Date(t.exitTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              <span className="block text-[10px] text-text-secondary">
                                {new Date(t.exitTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-bold text-text-secondary">{t.symbol}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                t.side === 'BUY' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                              }`}>
                                {t.side}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono">{t.quantity.toFixed(2)}</td>
                            <td className="px-4 py-3 text-right font-mono text-text-secondary">
                              <div>{t.entryPrice.toFixed(t.symbol.includes('XAU') ? 2 : 5)}</div>
                              <div className="text-[10px] text-text-secondary">{t.exitPrice.toFixed(t.symbol.includes('XAU') ? 2 : 5)}</div>
                            </td>
                            <td className={`px-4 py-3 text-right font-bold font-mono ${t.pnlUsd >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                              {t.pnlUsd >= 0 ? '+' : ''}${t.pnlUsd.toFixed(2)}
                              <span className="block text-[9px] font-medium text-text-secondary">{(t.pnlUsd / t.initialRiskUsd).toFixed(2)}R</span>
                            </td>
                            <td className="px-4 py-3 text-text-secondary truncate max-w-[120px]">
                              {t.strategyId === 'strat-ai-01' ? 'AI RL Trend-Slayer' : t.strategyId === 'strat-01' ? 'Bollinger MR' : 'SMA Momentum'}
                            </td>
                            <td className="px-4 py-3 text-text-secondary truncate max-w-[120px]">{t.reason}</td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => {
                                  if (isExpanded) {
                                    setExpandedTradeId(null);
                                  } else {
                                    setExpandedTradeId(t.id);
                                    setNotesDraft(t.notes || '');
                                  }
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-bg-hover hover:bg-bg-hover text-text-secondary hover:text-text-secondary transition-colors rounded font-semibold text-[11px] cursor-pointer"
                              >
                                {isExpanded ? 'Hide' : 'Inspect'}
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                            </td>
                          </tr>
                          
                          {/* EXPANDABLE AI ANALYSIS PANEL */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={10} className="bg-zinc-50/40 p-5 border-l-2 border-indigo-500">
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-text-secondary"
                                >
                                  {/* AI Post-Trade Summary (2/3 columns) */}
                                  <div className="lg:col-span-2 space-y-4">
                                    <div className="flex items-center justify-between border-b border-border-color pb-2">
                                      <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                                        <Sparkles className="w-4 h-4" />
                                        AI Quantitative Post-Trade Audit
                                      </h4>
                                      <button
                                        onClick={() => handleTriggerAISummary(t.id)}
                                        disabled={aiGeneratingId === t.id}
                                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 disabled:opacity-50"
                                      >
                                        <RefreshCw className={`w-3 h-3 ${aiGeneratingId === t.id ? 'animate-spin' : ''}`} />
                                        Regenerate Summary
                                      </button>
                                    </div>

                                    {aiGeneratingId === t.id ? (
                                      <div className="h-44 flex flex-col items-center justify-center gap-1">
                                        <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin" />
                                        <p className="text-[11px] font-medium text-text-secondary">Evaluating transaction metrics on Gemini 3.6-flash gateway...</p>
                                      </div>
                                    ) : t.aiSummary ? (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {/* What Happened */}
                                        <div className="p-3.5 bg-bg-surface border border-border-color rounded-lg shadow-sm space-y-1">
                                          <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1">
                                            <FileText className="w-3 h-3 text-indigo-500" /> WHAT HAPPENED?
                                          </div>
                                          <p className="text-[11px] leading-relaxed text-text-secondary">{t.aiSummary.whatHappened}</p>
                                        </div>

                                        {/* Why Happened */}
                                        <div className="p-3.5 bg-bg-surface border border-border-color rounded-lg shadow-sm space-y-1">
                                          <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1">
                                            <Activity className="w-3 h-3 text-emerald-500" /> WHY DID IT HAPPEN?
                                          </div>
                                          <p className="text-[11px] leading-relaxed text-text-secondary">{t.aiSummary.whyDidItHappen}</p>
                                        </div>

                                        {/* What Risk */}
                                        <div className="p-3.5 bg-bg-surface border border-border-color rounded-lg shadow-sm space-y-1">
                                          <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1">
                                            <Shield className="w-3 h-3 text-amber-500" /> WHAT WAS THE RISK?
                                          </div>
                                          <p className="text-[11px] leading-relaxed text-text-secondary">{t.aiSummary.whatWasTheRisk}</p>
                                        </div>

                                        {/* What Execution */}
                                        <div className="p-3.5 bg-bg-surface border border-border-color rounded-lg shadow-sm space-y-1">
                                          <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1">
                                            <Cpu className="w-3 h-3 text-indigo-500" /> EXECUTION QUALITY
                                          </div>
                                          <p className="text-[11px] leading-relaxed text-text-secondary">{t.aiSummary.whatWasTheExecutionQuality}</p>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="p-4 bg-bg-hover/50 rounded-lg text-center space-y-2">
                                        <p className="text-xs text-text-secondary">No AI summary generated for this record yet.</p>
                                        <button
                                          onClick={() => handleTriggerAISummary(t.id)}
                                          className="text-xs font-semibold bg-bg-surface border border-border-color px-3 py-1.5 rounded-lg text-text-secondary hover:bg-zinc-50 transition-colors"
                                        >
                                          Generate AI Summary
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  {/* Manual Trading Journal Notes (1/3 column) */}
                                  <div className="bg-bg-surface border border-border-color rounded-lg p-4 shadow-sm space-y-3 flex flex-col justify-between">
                                    <div className="space-y-1.5">
                                      <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                                        <PenTool className="w-4 h-4 text-indigo-600" />
                                        Manual Journal Entry
                                      </h4>
                                      <p className="text-[10px] text-text-secondary">Add operational comments, trading psychology logs, or re-test observations.</p>
                                    </div>
                                    
                                    <textarea
                                      value={notesDraft}
                                      onChange={(e) => setNotesDraft(e.target.value)}
                                      className="w-full text-xs text-text-secondary bg-zinc-50 border border-border-color rounded-lg p-2.5 h-24 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-bg-surface resize-none transition-colors"
                                      placeholder="Note down market momentum, feelings during trade, compliance failures..."
                                    />

                                    <div className="flex items-center justify-between mt-2">
                                      <span className="text-[9px] font-bold uppercase tracking-wider text-text-secondary">
                                        Historical record locked
                                      </span>
                                      
                                      <button
                                        id={`save-btn-${t.id}`}
                                        onClick={() => handleSaveNotes(t.id)}
                                        disabled={savingNotesId === t.id}
                                        className="text-xs font-semibold px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-text-primary rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                                      >
                                        {savingNotesId === t.id ? 'Saving...' : 'Save Note Changes'}
                                      </button>
                                    </div>
                                  </div>
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};
