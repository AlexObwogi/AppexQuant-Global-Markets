/**
 * AppexQuant Markets Global - Active Strategies Table Component
 * Displays active strategies with Strategy, Symbol, Timeframe, Mode, Last Signal,
 * Risk Status, Orders Today, P/L, and Status.
 */

import React from 'react';
import { ActiveStrategy, TradeDecisionChain } from '../../types/automationControl.ts';
import {
  Play,
  Pause,
  Zap,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Bot,
  Sliders,
  Sparkles,
} from 'lucide-react';

interface ActiveStrategiesTableProps {
  strategies: ActiveStrategy[];
  onToggleStrategy: (id: string) => void;
  onTriggerStrategy: (id: string) => void;
  onInspectTradeChain?: (tradeId: string) => void;
}

export const ActiveStrategiesTable: React.FC<ActiveStrategiesTableProps> = ({
  strategies,
  onToggleStrategy,
  onTriggerStrategy,
}) => {
  const getModeBadge = (mode: string) => {
    switch (mode) {
      case 'FULL_AUTO':
        return <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">FULL AUTO</span>;
      case 'SEMI_AUTO':
        return <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">SEMI AUTO</span>;
      case 'SIGNAL_ONLY':
        return <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">SIGNAL ONLY</span>;
      case 'PAPER_TRADING':
      default:
        return <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-bg-hover text-text-primary border border-border-color">PAPER TRADING</span>;
    }
  };

  const getRiskStatusBadge = (status: string, detail: string) => {
    switch (status) {
      case 'PASSED':
        return (
          <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-fit" title={detail}>
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>PASSED</span>
          </span>
        );
      case 'WARNING':
        return (
          <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 w-fit" title={detail}>
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span>WARNING</span>
          </span>
        );
      case 'EXPOSURE_CAP':
        return (
          <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1 w-fit" title={detail}>
            <Sliders className="w-3 h-3 text-sky-400" />
            <span>CAP REACHED</span>
          </span>
        );
      case 'DRAWDOWN_GUARD':
      default:
        return (
          <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1 w-fit" title={detail}>
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            <span>DD GUARD</span>
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />ACTIVE</span>;
      case 'SIGNALING':
        return <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />SIGNALING</span>;
      case 'COOLING_DOWN':
        return <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">COOLING DOWN</span>;
      case 'PAUSED':
        return <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-bg-hover text-text-secondary border border-border-color">PAUSED</span>;
      case 'HALTED':
      default:
        return <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">HALTED</span>;
    }
  };

  return (
    <div className="rounded-2xl bg-[#0D121D] border border-border-color/80 p-5 space-y-4 font-mono shadow-xl">
      {/* Table Header Section */}
      <div className="flex items-center justify-between pb-3 border-b border-border-color">
        <div>
          <h3 className="text-sm font-extrabold text-white tracking-wide uppercase flex items-center gap-2">
            <Bot className="w-4 h-4 text-cyan-400" />
            Active Strategies
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Real-time status, risk metrics, daily orders, and P/L across automated algorithms.
          </p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-md bg-bg-hover text-text-primary border border-border-color font-bold">
          {strategies.filter((s) => s.status === 'ACTIVE' || s.status === 'SIGNALING').length} / {strategies.length} Running
        </span>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-xl border border-border-color bg-[#080B10] overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#111622] text-text-secondary text-[11px] uppercase tracking-wider border-b border-border-color">
            <tr>
              <th className="p-3.5 font-bold">Strategy</th>
              <th className="p-3.5 font-bold">Symbol</th>
              <th className="p-3.5 font-bold">Timeframe</th>
              <th className="p-3.5 font-bold">Mode</th>
              <th className="p-3.5 font-bold">Last Signal</th>
              <th className="p-3.5 font-bold">Risk Status</th>
              <th className="p-3.5 font-bold text-center">Orders Today</th>
              <th className="p-3.5 font-bold text-right">P/L</th>
              <th className="p-3.5 font-bold text-center">Status</th>
              <th className="p-3.5 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 text-[12px]">
            {strategies.map((strat) => (
              <tr key={strat.id} className="hover:bg-[#111726] transition-colors group">
                <td className="p-3.5 font-bold text-white min-w-[200px]">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-300 group-hover:underline cursor-pointer">{strat.strategy}</span>
                    </div>
                    <p className="text-[11px] text-text-secondary font-sans line-clamp-1">{strat.description}</p>
                  </div>
                </td>
                <td className="p-3.5 font-bold text-slate-200 min-w-[120px]">
                  <span className="px-2 py-0.5 rounded bg-bg-surface border border-border-color text-text-primary">
                    {strat.symbol}
                  </span>
                </td>
                <td className="p-3.5 text-text-primary font-bold">{strat.timeframe}</td>
                <td className="p-3.5">{getModeBadge(strat.mode)}</td>
                <td className="p-3.5 min-w-[150px]">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 font-bold">
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded ${
                          strat.lastSignal.type === 'BUY'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : strat.lastSignal.type === 'SELL'
                            ? 'bg-rose-500/20 text-rose-400'
                            : 'bg-bg-hover text-text-secondary'
                        }`}
                      >
                        {strat.lastSignal.type}
                      </span>
                      <span className="text-slate-200">@{strat.lastSignal.price}</span>
                    </div>
                    <span className="text-[10px] text-text-secondary block">{strat.lastSignal.timeAgo}</span>
                  </div>
                </td>
                <td className="p-3.5">{getRiskStatusBadge(strat.riskStatus, strat.riskStatusDetail)}</td>
                <td className="p-3.5 text-center font-bold text-text-primary">{strat.ordersToday}</td>
                <td className="p-3.5 text-right font-bold min-w-[100px]">
                  <span
                    className={`flex items-center justify-end gap-1 ${
                      strat.pnlUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {strat.pnlUsd >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    <span>
                      {strat.pnlUsd >= 0 ? '+' : ''}${strat.pnlUsd.toFixed(2)}
                    </span>
                  </span>
                </td>
                <td className="p-3.5 text-center">{getStatusBadge(strat.status)}</td>
                <td className="p-3.5 text-right shrink-0">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => onTriggerStrategy(strat.id)}
                      className="p-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 transition-colors cursor-pointer border border-cyan-500/20 min-h-[44px] min-w-[44px] flex items-center justify-center"
                      title="Trigger Signal Evaluation"
                    >
                      <Sparkles className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onToggleStrategy(strat.id)}
                      className={`p-2 rounded-lg transition-colors cursor-pointer border min-h-[44px] min-w-[44px] flex items-center justify-center ${
                        strat.status === 'ACTIVE'
                          ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/20'
                          : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                      }`}
                      title={strat.status === 'ACTIVE' ? 'Pause Strategy' : 'Activate Strategy'}
                    >
                      {strat.status === 'ACTIVE' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Touch-Optimized Cards View */}
      <div className="md:hidden space-y-3">
        {strategies.map((strat) => (
          <div
            key={strat.id}
            className="p-3.5 rounded-xl bg-[#080B10] border border-border-color space-y-2.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-bold text-white text-sm">{strat.strategy}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 rounded bg-bg-surface text-text-primary font-bold text-[11px] border border-border-color">
                    {strat.symbol} • {strat.timeframe}
                  </span>
                  {getModeBadge(strat.mode)}
                </div>
              </div>
              <div className="text-right">
                {getStatusBadge(strat.status)}
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-3 gap-2 py-2 px-2.5 rounded-lg bg-[#111622] border border-border-color/80 text-[11px]">
              <div>
                <span className="text-text-secondary block text-[9px] uppercase">P/L Today</span>
                <span className={`font-bold ${strat.pnlUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {strat.pnlUsd >= 0 ? '+' : ''}${strat.pnlUsd.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-text-secondary block text-[9px] uppercase">Orders</span>
                <span className="font-bold text-slate-200">{strat.ordersToday}</span>
              </div>
              <div>
                <span className="text-text-secondary block text-[9px] uppercase">Risk Status</span>
                <div>{getRiskStatusBadge(strat.riskStatus, strat.riskStatusDetail)}</div>
              </div>
            </div>

            {/* Touch-Friendly Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => onTriggerStrategy(strat.id)}
                className="flex-1 py-2.5 px-3 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-bold text-xs border border-cyan-500/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[44px]"
              >
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Test Trigger</span>
              </button>
              <button
                onClick={() => onToggleStrategy(strat.id)}
                className={`flex-1 py-2.5 px-3 rounded-lg font-bold text-xs border flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[44px] ${
                  strat.status === 'ACTIVE'
                    ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                }`}
              >
                {strat.status === 'ACTIVE' ? (
                  <>
                    <Pause className="w-4 h-4" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Activate</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
