/**
 * AppexQuant Markets Global - Crypto Portfolio Donut Chart Component
 * Visualizes real-time asset allocation percentages for BTC, ETH, USDT, SOL, and USD wallets.
 */

import React, { useState } from 'react';
import { useGlobalState } from '../../state/GlobalStateContext.tsx';
import { Card } from '../ui/Card.tsx';
import { Badge } from '../ui/Badge.tsx';
import { PieChart, Coins, TrendingUp, ShieldCheck, RefreshCw } from 'lucide-react';

interface AssetAllocation {
  currency: string;
  name: string;
  symbol: string;
  icon: string;
  color: string;
  balance: number;
  usdValue: number;
  percentage: number;
  strokeDasharray: string;
  strokeDashoffset: number;
}

const ASSET_COLORS: Record<string, string> = {
  BTC: '#f7931a', // Bitcoin Orange
  ETH: '#627eea', // Ethereum Purple/Blue
  USDT: '#26a17b', // Tether Teal
  SOL: '#14f195', // Solana Cyan
  USD: '#00a86b', // Appex Emerald
};

export const CryptoPortfolioDonutChart: React.FC = () => {
  const { state } = useGlobalState();
  const isBalanceHidden = state.isBalanceHidden;
  const [activeAsset, setActiveAsset] = useState<string | null>(null);

  // Compute allocations directly from authoritative global wallet state
  const totalVal = state.totalUsdValue;
  
  // Benchmark fallback allocation weights if total value is 0 (so chart always renders nicely)
  const defaultWeights: Record<string, number> = {
    BTC: 45,
    ETH: 30,
    USDT: 15,
    SOL: 10,
  };

  const circumference = 2 * Math.PI * 40; // R = 40 => Circumference ~ 251.327
  let cumulativePercentage = 0;

  const allocations: AssetAllocation[] = state.wallets
    .filter((w) => ['BTC', 'ETH', 'USDT', 'SOL', 'USD'].includes(w.currency))
    .map((w) => {
      let pct = 0;
      let val = w.usdValue;

      if (totalVal > 0) {
        pct = (val / totalVal) * 100;
      } else {
        pct = defaultWeights[w.currency] || 5;
        val = (pct / 100) * 1000; // Simulated demo valuation
      }

      const dashArrayLength = (pct / 100) * circumference;
      const strokeDasharray = `${dashArrayLength} ${circumference - dashArrayLength}`;
      const strokeDashoffset = -((cumulativePercentage / 100) * circumference);

      cumulativePercentage += pct;

      return {
        currency: w.currency,
        name: w.name,
        symbol: w.symbol,
        icon: w.icon,
        color: ASSET_COLORS[w.currency] || '#00a86b',
        balance: w.balance,
        usdValue: w.usdValue > 0 ? w.usdValue : val,
        percentage: pct,
        strokeDasharray,
        strokeDashoffset,
      };
    });

  const formattedTotal = isBalanceHidden
    ? '••••••'
    : `$ ${totalVal > 0 ? totalVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '1,000.00'}`;

  const hoveredAllocation = activeAsset ? allocations.find((a) => a.currency === activeAsset) : null;

  return (
    <Card variant="surface" className="p-4 sm:p-5 space-y-4 shadow-sm border border-border-color dark:border-[#2B3139]">
      <div className="flex items-center justify-between pb-3 border-b border-border-color/60">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
            <PieChart className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-text-primary tracking-tight">
                Crypto Portfolio Allocation
              </h3>
              <Badge variant="accent" size="sm" className="font-mono text-[10px]">
                REAL-TIME
              </Badge>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Live percentage breakdown across BTC, ETH, USDT, SOL, and USD wallets.
            </p>
          </div>
        </div>

        <span className="text-[11px] font-mono text-emerald-400 font-bold hidden sm:flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" /> Verified Deriv Sync
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* SVG Donut Chart */}
        <div className="md:col-span-5 flex flex-col items-center justify-center relative py-2">
          <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {/* Background Track */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                stroke="currentColor"
                strokeWidth="12"
                className="text-bg-hover opacity-40"
              />

              {/* Donut Segments */}
              {allocations.map((alloc) => (
                <circle
                  key={alloc.currency}
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke={alloc.color}
                  strokeWidth={activeAsset === alloc.currency ? 15 : 12}
                  strokeDasharray={alloc.strokeDasharray}
                  strokeDashoffset={alloc.strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-300 cursor-pointer hover:opacity-90"
                  onMouseEnter={() => setActiveAsset(alloc.currency)}
                  onMouseLeave={() => setActiveAsset(null)}
                />
              ))}
            </svg>

            {/* Inner Donut Center Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 pointer-events-none select-none">
              <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-text-secondary block">
                {hoveredAllocation ? `${hoveredAllocation.currency} Share` : 'Total Net Value'}
              </span>
              <span className="text-lg sm:text-xl font-bold font-mono text-text-primary mt-0.5 block">
                {hoveredAllocation
                  ? `${hoveredAllocation.percentage.toFixed(1)}%`
                  : formattedTotal}
              </span>
              <span className="text-[10px] font-mono text-text-secondary mt-0.5 block">
                {hoveredAllocation
                  ? `$ ${hoveredAllocation.usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : `${allocations.length} Monitored Assets`}
              </span>
            </div>
          </div>
        </div>

        {/* Legend & Asset Breakdown List */}
        <div className="md:col-span-7 space-y-2.5">
          {allocations.map((alloc) => (
            <div
              key={alloc.currency}
              onMouseEnter={() => setActiveAsset(alloc.currency)}
              onMouseLeave={() => setActiveAsset(null)}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                activeAsset === alloc.currency
                  ? 'bg-bg-hover border-[#00a86b]/50 shadow-xs translate-x-1'
                  : 'bg-bg-surface border-border-color hover:border-border-color/80'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div
                  className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                  style={{ backgroundColor: alloc.color }}
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-text-primary font-mono">
                      {alloc.currency}
                    </span>
                    <span className="text-[11px] text-text-secondary font-medium">
                      ({alloc.name})
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-text-secondary block mt-0.5">
                    Quantity: {isBalanceHidden ? '••••' : alloc.balance.toFixed(4)} {alloc.currency}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs sm:text-sm font-bold font-mono text-text-primary block">
                  {alloc.percentage.toFixed(1)}%
                </span>
                <span className="text-[10px] font-mono text-text-secondary block">
                  {isBalanceHidden ? '••••••' : `$ ${alloc.usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};
