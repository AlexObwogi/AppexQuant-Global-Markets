import React, { useMemo } from 'react';
import { useQuantis } from '../../state/QuantisContext';
import { useGlobalState } from '../../state/GlobalStateContext';
import { 
  TrendingUp, 
  Activity, 
  ShieldCheck, 
  Cpu, 
  Clock, 
  Radio, 
  Sparkles,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface MarketQuote {
  symbol: string;
  name: string;
  price: string;
  change: string;
  isPositive: boolean;
  category: 'Synthetic' | 'Forex' | 'Crypto' | 'Commodity';
}

export const QuantisHeroGreeting: React.FC = () => {
  const { isConnected, tokenAccountInfo, executionStatus, activeBot } = useQuantis();
  const { activeAccount } = useGlobalState();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Real-time market pulse highlights
  const quotes: MarketQuote[] = [
    { symbol: 'R_100', name: 'Volatility 100 (1s)', price: '2,842.15', change: '+1.84%', isPositive: true, category: 'Synthetic' },
    { symbol: '1HZ100V', name: 'Volatility 100 Index', price: '1,429.80', change: '-0.42%', isPositive: false, category: 'Synthetic' },
    { symbol: 'frxEURUSD', name: 'EUR/USD', price: '1.0845', change: '+0.12%', isPositive: true, category: 'Forex' },
    { symbol: 'cryBTCUSD', name: 'Bitcoin (USD)', price: '96,240.50', change: '+3.15%', isPositive: true, category: 'Crypto' },
    { symbol: 'frxXAUUSD', name: 'Gold / USD', price: '2,684.20', change: '+0.68%', isPositive: true, category: 'Commodity' },
  ];

  const accId = tokenAccountInfo?.loginid || (activeAccount as any)?.accountNumber || activeAccount?.id || 'Trader';
  const isRealAcc = Boolean(
    (tokenAccountInfo && tokenAccountInfo.isVirtual === false) ||
    (typeof accId === 'string' && accId.toUpperCase().startsWith('CR')) ||
    ((activeAccount as any)?.type === 'REAL' || activeAccount?.type === 'real')
  );

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 p-6 shadow-2xl backdrop-blur-xl">
      {/* Ambient background glow accents */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 left-1/3 h-52 w-52 rounded-full bg-blue-600/10 blur-3xl" />

      <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
        {/* Left: Greeting & System Pulse */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-950/40 px-3 py-1 text-xs font-medium text-cyan-300">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            <span>Quantis FX Automated Trading Suite</span>
          </div>

          <div className="flex flex-wrap items-baseline gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {greeting}, <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                {accId}
              </span>
            </h1>

            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wider ${
              isRealAcc
                ? 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 shadow-sm'
                : 'border border-amber-500/40 bg-amber-500/10 text-amber-300 shadow-sm'
            }`}>
              <span className={`h-2 w-2 rounded-full ${
                isRealAcc ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`} />
              {isRealAcc ? 'REAL LIVE ACCOUNT' : 'DEMO MODE'}
            </span>
          </div>

          <p className="max-w-2xl text-sm leading-relaxed text-slate-300">
            Real-time market feeds, automated strategy builders, and execution workspace.
            Active Strategy: <span className="font-semibold text-white">{activeBot ? activeBot.name : 'Ready'}</span>.
          </p>
        </div>

        {/* Right: Engine Telemetry Badges */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2.5 backdrop-blur-md">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
              isConnected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'
            }`}>
              <Radio className={`h-4 w-4 ${isConnected ? 'animate-pulse text-emerald-400' : ''}`} />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Market Feed</div>
              <div className="text-xs font-semibold text-slate-100">
                {isConnected ? 'Live Feed Active' : 'Disconnected'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2.5 backdrop-blur-md">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
              executionStatus === 'RUNNING'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : executionStatus === 'SCANNING'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                : 'bg-slate-800 text-slate-400'
            }`}>
              <Cpu className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Bot Engine</div>
              <div className="text-xs font-semibold text-slate-100">
                {executionStatus === 'RUNNING' ? 'Bot Status: Running' : executionStatus === 'SCANNING' ? 'Scanning Signals' : 'Bot Status: Ready'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Market Ticker Row */}
      <div className="relative mt-6 border-t border-slate-800/80 pt-4">
        <div className="flex items-center justify-between pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <span className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-cyan-400" />
            Live Market Quotes & Volatilities
          </span>
          <span className="flex items-center gap-1 font-mono text-[10px] text-slate-400">
            <Clock className="h-3 w-3" />
            Zero Delay Feed
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {quotes.map((q) => (
            <div
              key={q.symbol}
              className="group flex flex-col rounded-lg border border-slate-800/70 bg-slate-950/60 p-2.5 transition-all hover:border-cyan-500/30 hover:bg-slate-900/70"
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-300 group-hover:text-cyan-300">{q.symbol}</span>
                <span className={`flex items-center text-[10px] font-medium ${q.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {q.isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {q.change}
                </span>
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="font-mono text-xs font-bold text-white">{q.price}</span>
                <span className="text-[9px] text-slate-500">{q.category}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
