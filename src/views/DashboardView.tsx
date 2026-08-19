/**
 * AppexQuant Markets Global - Dashboard View
 * Refactored for clean user experience, mobile-first responsiveness, and balance privacy.
 */

import React from 'react';
import { useGlobalState } from '../state/GlobalStateContext.tsx';
import { useMarketData } from '../state/MarketDataContext.tsx';
import { MetricCard } from '../components/ui/MetricCard.tsx';
import { Card } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import { AICommandCenter } from '../components/ai/AICommandCenter.tsx';
import { PerformanceBadge, PerformanceDisclaimerBanner } from '../components/common/PerformanceDisclaimer.tsx';
import { formatCurrencyValue, formatUserRiskStatus } from '../utils/userStatusPresentation.ts';
import {
  Wallet,
  Activity,
  BarChart2,
  ShieldCheck,
  Settings,
  ArrowRight,
  Eye,
  EyeOff,
  TrendingUp,
  Shield,
  Zap,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { state, dispatch, selectedAccount } = useGlobalState();
  const { instruments, ticks, dataFreshness, setSelectedSymbol } = useMarketData();

  const handleGoToMarkets = (symbol?: string) => {
    if (symbol) setSelectedSymbol(symbol);
    dispatch({ type: 'SET_ROUTE', payload: 'markets' });
  };

  // Top 4 watchlist instruments to preview on Dashboard
  const previewSymbols = ['frxEURUSD', 'R_100', 'cryBTCUSD', 'frxXAUUSD'];

  const currentEnv = state.executionEnvironment;
  const isBalanceHidden = state.isBalanceHidden;

  const balanceNum = selectedAccount ? selectedAccount.balance.balance : 0;
  const equityNum = selectedAccount ? (selectedAccount.balance.equity ?? balanceNum) : balanceNum;
  const marginNum = selectedAccount ? (selectedAccount.balance.margin ?? 0) : 0;
  const marginLevelNum = marginNum > 0 ? (equityNum / marginNum) * 100 : (equityNum > 0 ? 100 : 0);
  const marginLevelSubtext = marginNum > 0 ? `Margin level: ${marginLevelNum.toFixed(0)}%` : 'Margin level: 100% (No open margin)';

  const balanceFormatted = formatCurrencyValue(balanceNum, isBalanceHidden);
  const equityFormatted = formatCurrencyValue(equityNum, isBalanceHidden);

  const riskStatus = formatUserRiskStatus(state.riskState);

  const pnlStatusLabel =
    currentEnv === 'LIVE'
      ? 'Live account'
      : currentEnv === 'PAPER'
      ? 'Paper balance'
      : 'Demo balance';

  return (
    <div className="space-y-4 max-w-7xl mx-auto flex flex-col flex-1 pb-8">
      {/* Overview & Command Console Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-color">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-text-secondary text-xs font-semibold">Overview</p>
            <PerformanceBadge environment={currentEnv} size="sm" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">Trading Dashboard</h2>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => handleGoToMarkets()}
            variant="primary"
            size="sm"
            className="flex items-center gap-1 cursor-pointer"
          >
            <span>Markets Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
          <Button
            onClick={() => dispatch({ type: 'SET_ROUTE', payload: 'account' })}
            variant="secondary"
            size="sm"
            className="flex items-center gap-1.5 cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-text-secondary" />
            <span>Settings</span>
          </Button>
        </div>
      </div>

      {/* Account Balance Metrics Grid Above The Fold */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <div className="relative">
          <MetricCard
            label="Account Balance"
            value={balanceFormatted}
            type="neutral"
            statusLabel={pnlStatusLabel}
            subtext={currentEnv === 'LIVE' ? 'Real broker funds' : 'Virtual practice balance'}
            icon={
              <button
                onClick={() => dispatch({ type: 'TOGGLE_BALANCE_HIDDEN' })}
                className="hover:text-text-primary transition-colors cursor-pointer"
                title={isBalanceHidden ? 'Show Balance' : 'Hide Balance'}
              >
                {isBalanceHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Wallet className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />}
              </button>
            }
          />
        </div>
        <MetricCard
          label="Current Equity"
          value={equityFormatted}
          type="neutral"
          statusLabel={pnlStatusLabel}
          subtext={marginLevelSubtext}
          icon={<Activity className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />}
        />
        <MetricCard
          label="Deriv Market Feed"
          value={dataFreshness === 'LIVE' ? 'Active' : 'Offline'}
          type={dataFreshness === 'LIVE' ? 'profit' : 'neutral'}
          statusLabel={dataFreshness === 'LIVE' ? 'Streaming' : 'Connecting'}
          subtext={`${instruments.length} active markets`}
          icon={<BarChart2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />}
        />
        <MetricCard
          label="Account Protection"
          value={riskStatus.label === 'Optimal Risk' ? 'Protected' : riskStatus.label}
          type={riskStatus.badgeType === 'success' ? 'info' : 'loss'}
          statusLabel="Safeguards active"
          subtext="Risk limits active"
          icon={<ShieldCheck className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />}
        />
      </div>

      {/* Regulatory Disclosure */}
      <PerformanceDisclaimerBanner environment={currentEnv} title="Dashboard Regulatory Disclosure" />

      {/* AI Intelligence Command Center Bar */}
      <AICommandCenter
        onOpenStrategyScanner={() => dispatch({ type: 'SET_ROUTE', payload: 'strategies' })}
        onSelectSymbol={(sym) => handleGoToMarkets(sym)}
      />

      {/* Main 3-Column Widget Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Account Summary Card */}
        <Card variant="surface" className="flex flex-col justify-between min-h-[160px] h-52">
          <div>
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs text-text-secondary font-semibold">
                Account Summary
              </span>
              <button
                onClick={() => dispatch({ type: 'TOGGLE_BALANCE_HIDDEN' })}
                className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
              >
                {isBalanceHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>{isBalanceHidden ? 'Show' : 'Hide'}</span>
              </button>
            </div>
            <p className="text-text-secondary text-xs leading-relaxed">
              Quantitative strategy scanner and news sentiment sentinel are active. Account operations are protected by automated risk limits.
            </p>
          </div>
          <div className="pt-2 border-t border-border-color">
            <div className="text-xs text-text-secondary font-medium">Account Balance</div>
            <div className="text-xl font-mono text-text-primary font-bold">
              {balanceFormatted} <span className="text-xs text-text-secondary font-normal font-sans">({currentEnv.toLowerCase()} mode)</span>
            </div>
          </div>
        </Card>

        {/* Live Watchlist Ticks */}
        <Card variant="surface" className="flex flex-col justify-between min-h-[160px] h-52">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-secondary font-semibold">
              Live Watchlist
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center space-x-1">
              <span className={`w-1.5 h-1.5 rounded-full ${dataFreshness === 'LIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span>{dataFreshness === 'LIVE' ? 'Active' : 'Offline'}</span>
            </span>
          </div>

          <div className="space-y-1.5 flex-1 my-0.5 overflow-y-auto pr-1 max-h-[110px]">
            {previewSymbols.map((sym) => {
              const inst = instruments.find((i) => i.symbol === sym) || { name: sym, bid: 0 };
              const tick = ticks[sym];
              const price = tick ? tick.quote : inst.bid;
              const pct = tick ? tick.changePct : 0;

              return (
                <div
                  key={sym}
                  onClick={() => handleGoToMarkets(sym)}
                  className="p-1.5 bg-bg-main border border-border-color hover:border-cyan-500/50 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors"
                >
                  <span className="font-semibold text-text-primary">{inst.name}</span>
                  <div className="text-right font-mono">
                    <span className="text-text-primary font-bold mr-2">
                      {price.toFixed(price > 100 ? 2 : 5)}
                    </span>
                    <span className={pct >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-rose-600 dark:text-rose-400 font-semibold'}>
                      {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => handleGoToMarkets()}
            className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline pt-1.5 text-center font-medium cursor-pointer"
          >
            Open Market Workspace →
          </button>
        </Card>

        {/* User-Facing Safeguards Card */}
        <Card variant="surface" className="flex flex-col justify-between min-h-[160px] h-52">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-secondary font-semibold">
              Account Safeguards & Status
            </span>
            <Badge variant="success" size="sm">Protected</Badge>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-bg-main border border-border-color">
              <span className="text-text-secondary flex items-center gap-1.5 font-medium">
                <Shield className="w-3.5 h-3.5 text-emerald-500" /> Risk Safeguards
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Active</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-bg-main border border-border-color">
              <span className="text-text-secondary flex items-center gap-1.5 font-medium">
                <Zap className="w-3.5 h-3.5 text-cyan-500" /> Signal Confluence
              </span>
              <span className="text-cyan-600 dark:text-cyan-400 font-semibold">Ready</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-bg-main border border-border-color">
              <span className="text-text-secondary flex items-center gap-1.5 font-medium">
                <TrendingUp className="w-3.5 h-3.5 text-cyan-500" /> Active Strategy
              </span>
              <span className="text-cyan-600 dark:text-cyan-400 font-semibold">Monitoring</span>
            </div>
          </div>
          <div className="text-xs text-text-secondary text-right pt-1 font-medium">
            Daily Drawdown Limit: 5.0%
          </div>
        </Card>
      </div>
    </div>
  );
};
