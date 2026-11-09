import React, { useState } from 'react';
import { useQuantis } from '../state/QuantisContext';
import { useGlobalState } from '../state/GlobalStateContext';
import { 
  Store, 
  Search, 
  Filter, 
  Star, 
  Download, 
  ShieldCheck, 
  Cpu, 
  Zap, 
  Sparkles, 
  Play, 
  CheckCircle,
  FileCode,
  Sliders,
  DollarSign,
  TrendingUp,
  Tag
} from 'lucide-react';

interface MarketplaceItem {
  id: string;
  name: string;
  category: 'scripts' | 'rotators' | 'tools';
  author: string;
  rating: number;
  reviewsCount: number;
  downloadsCount: number;
  isVerified: boolean;
  price: string;
  description: string;
  tags: string[];
  specs: {
    symbol: string;
    contractType: string;
    recommendedStake: number;
    winRate: string;
  };
}

export const QuantisMarketplaceView: React.FC = () => {
  const { setActiveBot, startExecution } = useQuantis();
  const { setCurrentView } = useGlobalState();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'scripts' | 'rotators' | 'tools'>('all');
  const [installedId, setInstalledId] = useState<string | null>(null);

  const items: MarketplaceItem[] = [
    {
      id: 'item-1',
      name: 'Volatix Trend Sniper Pro',
      category: 'scripts',
      author: 'Quantis Labs',
      rating: 4.9,
      reviewsCount: 342,
      downloadsCount: 12840,
      isVerified: true,
      price: 'Free',
      description: 'High-probability tick momentum script engineered for Volatility 100 (1s) Index with integrated exponential moving averages.',
      tags: ['Synthetic', 'Trend Following', 'EMA Matrix'],
      specs: {
        symbol: 'R_100',
        contractType: 'CALLPUT',
        recommendedStake: 1.0,
        winRate: '86.4%',
      }
    },
    {
      id: 'item-2',
      name: 'Digit Skew 9-Differs Hunter',
      category: 'rotators',
      author: 'AlgoMetrics Team',
      rating: 4.8,
      reviewsCount: 218,
      downloadsCount: 9450,
      isVerified: true,
      price: 'Free',
      description: 'Multi-window statistical skew detector for Matches/Differs. Rotates dynamically between Volatility 10, 50, and 100.',
      tags: ['Digit Differ', 'Statistical Arbitrage', 'Multi-Index'],
      specs: {
        symbol: 'R_100',
        contractType: 'DIGITDIFF',
        recommendedStake: 1.0,
        winRate: '91.8%',
      }
    },
    {
      id: 'item-3',
      name: 'Even / Odd Sequence Rotator',
      category: 'rotators',
      author: 'Quantis FX Community',
      rating: 4.7,
      reviewsCount: 154,
      downloadsCount: 6200,
      isVerified: true,
      price: 'Free',
      description: 'Monitors 4 consecutive identical parity ticks and automatically fires opposite counter-trend trade with linear recovery.',
      tags: ['Parity', 'Mean Reversion', 'Martingale Safe'],
      specs: {
        symbol: '1HZ100V',
        contractType: 'DIGITEVEN',
        recommendedStake: 0.5,
        winRate: '82.5%',
      }
    },
    {
      id: 'item-4',
      name: 'Kelly Criterion Position Sizer',
      category: 'tools',
      author: 'Fintech Systems',
      rating: 4.9,
      reviewsCount: 98,
      downloadsCount: 4320,
      isVerified: true,
      price: 'Free',
      description: 'Mathematical bankroll sizing extension calculating optimal stake fraction based on live Deriv contract odds and account balance.',
      tags: ['Risk Engine', 'Kelly Formula', 'Bankroll Guard'],
      specs: {
        symbol: 'ALL',
        contractType: 'DYNAMIC',
        recommendedStake: 0.35,
        winRate: 'Risk Guard',
      }
    },
    {
      id: 'item-5',
      name: 'Over / Under 4 Skew Sniper',
      category: 'scripts',
      author: 'Quantis Labs',
      rating: 4.8,
      reviewsCount: 187,
      downloadsCount: 7890,
      isVerified: true,
      price: 'Free',
      description: 'Capitalizes on digit cluster imbalances across Over/Under contracts. Includes automatic circuit breaker after 2 consecutive losses.',
      tags: ['Over/Under', 'Automated Guard', 'Deriv XML'],
      specs: {
        symbol: 'R_50',
        contractType: 'DIGITOVER',
        recommendedStake: 1.0,
        winRate: '84.2%',
      }
    },
    {
      id: 'item-6',
      name: 'Multi-Index Tick Arbitrage Monitor',
      category: 'tools',
      author: 'Institutional Algorithmic Desk',
      rating: 4.9,
      reviewsCount: 312,
      downloadsCount: 11400,
      isVerified: true,
      price: 'Free',
      description: 'Scans simultaneous WebSocket tick streams across R_10, R_25, R_50, R_75, R_100 to pinpoint volatility dispersion anomalies.',
      tags: ['Arbitrage', 'Tick Sampling', 'Institutional'],
      specs: {
        symbol: 'MULTI',
        contractType: 'ARBITRAGE',
        recommendedStake: 2.0,
        winRate: '88.1%',
      }
    }
  ];

  const filteredItems = items.filter(item => {
    const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const handleInstallAndLoad = (item: MarketplaceItem) => {
    setActiveBot({
      id: `market-${item.id}`,
      name: item.name,
      strategyType: item.specs.contractType,
      symbol: item.specs.symbol === 'ALL' || item.specs.symbol === 'MULTI' ? 'R_100' : item.specs.symbol,
      stake: item.specs.recommendedStake,
      martingaleMultiplier: 2.0,
      takeProfit: 15,
      stopLoss: 25,
      description: item.description,
      isCustom: true,
    });

    setInstalledId(item.id);
    setTimeout(() => setInstalledId(null), 3000);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-3 py-1 text-xs font-semibold text-cyan-300">
              <Store className="h-3.5 w-3.5 text-cyan-400" />
              Quantis FX Marketplace &amp; Ecosystem
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Algorithmic Scripts, Rotators &amp; Quant Tools
            </h1>
            <p className="mt-1 max-w-2xl text-xs text-slate-400">
              Explore community-vetted Deriv Blockly XML scripts, signal rotation engines, and risk management modules ready for instant execution.
            </p>
          </div>

          <button
            onClick={() => setCurrentView('bot-builder')}
            className="flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-950 hover:text-white transition-all shadow-lg shadow-cyan-500/20"
          >
            <Cpu className="h-4 w-4" />
            Publish Custom Script
          </button>
        </div>
      </div>

      {/* Search & Category Filter Toolbar */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        {/* Category Pill Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Assets' },
            { id: 'scripts', label: 'XML Scripts' },
            { id: 'rotators', label: 'Signal Rotators' },
            { id: 'tools', label: 'Quantitative Tools' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id as any)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'border border-cyan-500/40 bg-cyan-950/50 text-cyan-300 shadow-sm'
                  : 'border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search strategies or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-900/80 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
        </div>
      </div>

      {installedId && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3 text-xs text-emerald-300">
          <CheckCircle className="h-4 w-4 text-emerald-400" />
          <span>Strategy loaded successfully! Navigate to Dashboard to launch execution.</span>
        </div>
      )}

      {/* Items Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="group flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl backdrop-blur-xl transition-all hover:border-cyan-500/30 hover:bg-slate-900/80"
          >
            <div>
              {/* Header Badges */}
              <div className="flex items-start justify-between gap-2">
                <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  item.category === 'scripts' ? 'border border-cyan-500/30 bg-cyan-950/60 text-cyan-400' :
                  item.category === 'rotators' ? 'border border-purple-500/30 bg-purple-950/60 text-purple-400' :
                  'border border-blue-500/30 bg-blue-950/60 text-blue-400'
                }`}>
                  {item.category}
                </span>

                <div className="flex items-center gap-1 text-amber-400 text-xs font-semibold">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <span>{item.rating}</span>
                  <span className="text-[10px] text-slate-500">({item.reviewsCount})</span>
                </div>
              </div>

              {/* Title & Author */}
              <div className="mt-3">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {item.name}
                  </h3>
                  {item.isVerified && (
                    <span title="Verified Quantis Strategy">
                      <ShieldCheck className="h-4 w-4 text-cyan-400" />
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500">
                  By {item.author} • {item.downloadsCount.toLocaleString()} installs
                </div>
              </div>

              {/* Description */}
              <p className="mt-2.5 text-xs text-slate-400 leading-relaxed line-clamp-3">
                {item.description}
              </p>

              {/* Specs Box */}
              <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-slate-800/80 bg-slate-950/60 p-2.5 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">Target Index:</span>
                  <div className="font-semibold text-slate-200">{item.specs.symbol}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">Tested Rate:</span>
                  <div className="font-semibold text-emerald-400">{item.specs.winRate}</div>
                </div>
              </div>

              {/* Tags */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {item.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-md border border-slate-800 bg-slate-950/60 px-2 py-0.5 text-[10px] font-mono text-slate-400"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-5 flex items-center justify-between border-t border-slate-800/80 pt-3">
              <span className="font-mono text-xs font-bold text-emerald-400">
                {item.price}
              </span>

              <button
                onClick={() => handleInstallAndLoad(item)}
                className="flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-950/50 px-3.5 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500 hover:text-slate-950 transition-all"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Load Algo</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
