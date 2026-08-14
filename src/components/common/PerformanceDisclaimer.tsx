/**
 * AppexQuant Markets Global - Standardized Performance Disclaimer & Environment Identifier
 * Mandated across all analytics, backtesting, strategy cards, dashboard, signals, and execution views.
 */

import React from 'react';
import { PerformanceEnvironmentType } from '../../types/legal.js';
import { ShieldAlert, Info, Activity, Database, Flame, FileText } from 'lucide-react';

interface PerformanceBadgeProps {
  environment: PerformanceEnvironmentType;
  size?: 'sm' | 'md' | 'lg';
  showSubtext?: boolean;
}

export const PerformanceBadge: React.FC<PerformanceBadgeProps> = ({
  environment,
  size = 'md',
  showSubtext = false,
}) => {
  const getEnvironmentConfig = (type: any) => {
    const normalized = String(type || '').toUpperCase();
    switch (normalized) {
      case 'DEMO':
        return {
          label: 'Demo Environment',
          color: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
          dot: 'bg-purple-500 dark:bg-purple-400',
          icon: <Database className="w-3.5 h-3.5" />,
          description: 'Controlled simulated practice environment.',
        };
      case 'SIMULATED':
      case 'SIM':
        return {
          label: 'Simulated Data',
          color: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
          dot: 'bg-amber-500 dark:bg-amber-400',
          icon: <Database className="w-3.5 h-3.5" />,
          description: 'Calculated via synthetic models or historical price replay.',
        };
      case 'BACKTEST':
        return {
          label: 'Backtest Model',
          color: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
          dot: 'bg-purple-500 dark:bg-purple-400',
          icon: <FileText className="w-3.5 h-3.5" />,
          description: 'Historical deterministic simulation. Out-of-sample data may vary.',
        };
      case 'PAPER':
        return {
          label: 'Paper Trading',
          color: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
          dot: 'bg-sky-500 dark:bg-sky-400 animate-pulse',
          icon: <Info className="w-3.5 h-3.5" />,
          description: 'Real-time practice feed. Zero real money at risk.',
        };
      case 'LIVE':
      case 'REAL':
      case 'REAL_MONEY':
        return {
          label: 'Live Account',
          color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
          dot: 'bg-emerald-500 dark:bg-emerald-400 animate-ping',
          icon: <Flame className="w-3.5 h-3.5" />,
          description: 'Connected to live broker liquidity gateway.',
        };
      default:
        return {
          label: 'Practice Mode',
          color: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
          dot: 'bg-amber-500 dark:bg-amber-400',
          icon: <Database className="w-3.5 h-3.5" />,
          description: 'Practice trading environment.',
        };
    }
  };

  const defaultConfig = {
    label: 'Practice Mode',
    color: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
    dot: 'bg-amber-500 dark:bg-amber-400',
    icon: <Database className="w-3.5 h-3.5" />,
    description: 'Practice trading environment.',
  };

  const config = getEnvironmentConfig(environment) || defaultConfig;

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[10px]'
      : size === 'lg'
      ? 'px-3.5 py-1.5 text-xs font-bold'
      : 'px-2.5 py-1 text-xs font-semibold';

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border ${sizeClasses} ${config?.color || defaultConfig.color} font-medium shadow-2xs`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${config?.dot || defaultConfig.dot}`} />
        {config?.icon || defaultConfig.icon}
        <span>{config?.label || defaultConfig.label}</span>
      </span>
      {showSubtext && (
        <span className="text-[10px] text-text-secondary italic">
          {config?.description || defaultConfig.description}
        </span>
      )}
    </div>
  );
};

interface PerformanceDisclaimerBannerProps {
  environment: PerformanceEnvironmentType;
  title?: string;
  compact?: boolean;
  className?: string;
}

export const PerformanceDisclaimerBanner: React.FC<PerformanceDisclaimerBannerProps> = ({
  environment,
  title,
  compact = false,
  className = '',
}) => {
  return (
    <div
      className={`p-3.5 sm:p-4 bg-bg-surface border border-[#D97706]/40 dark:border-amber-500/20 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${className}`}
    >
      <div className="flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-[#D97706] dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-[#D97706] dark:text-amber-300">
              {title || 'Regulatory Performance Disclaimer'}
            </span>
            <PerformanceBadge environment={environment} size="sm" />
          </div>
          <p className="text-text-primary leading-relaxed text-[11px] sm:text-xs">
            <strong>Important Regulatory Notice:</strong> Past performance, historical backtest results, and paper trading simulations are <strong>NOT</strong> indicative of future returns or guaranteed performance. Real-market execution involves financial risk, spreads, slippage, and potential loss of capital.
          </p>
        </div>
      </div>
    </div>
  );
};
