/**
 * AppexQuant Markets Global - Automation Event Stream Component
 * Displays real-time decision chain events (Market Data -> Strategy Evaluated -> Condition Matched ->
 * Signal Generated -> Risk Check -> Order Submitted -> Order Filled -> Position Updated).
 * Every event is clickable to launch the complete trade decision chain inspector.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AutomationStreamEvent, TradeDecisionChain } from '../../types/automationControl.js';
import {
  Activity,
  Cpu,
  Layers,
  Zap,
  ShieldCheck,
  Send,
  CheckCheck,
  Database,
  Search,
  Pause,
  Play,
  Trash2,
  ExternalLink,
  ChevronRight,
  Filter,
  Sparkles,
} from 'lucide-react';

interface AutomationEventStreamProps {
  events: AutomationStreamEvent[];
  onSelectTradeChain: (chain: TradeDecisionChain) => void;
  onTriggerTestTrade: () => void;
  onClearEvents: () => void;
  isSystemRunning: boolean;
}

export const AutomationEventStream: React.FC<AutomationEventStreamProps> = ({
  events,
  onSelectTradeChain,
  onTriggerTestTrade,
  onClearEvents,
  isSystemRunning,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [isStreamPaused, setIsStreamPaused] = useState(false);

  const getStepBadge = (stepType: string) => {
    switch (stepType) {
      case 'MARKET_DATA_RECEIVED':
        return <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">Market feed</span>;
      case 'STRATEGY_EVALUATED':
        return <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">Strategy check</span>;
      case 'CONDITION_MATCHED':
        return <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">Rule match</span>;
      case 'SIGNAL_GENERATED':
        return <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">Signal ready</span>;
      case 'RISK_CHECK_APPROVED':
        return <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">Risk passed</span>;
      case 'ORDER_SUBMITTED':
        return <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">Order submitted</span>;
      case 'ORDER_FILLED':
        return <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">Order filled</span>;
      case 'POSITION_UPDATED':
      default:
        return <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">Position updated</span>;
    }
  };

  const filteredEvents = events.filter((evt) => {
    const matchesSearch =
      evt.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.strategyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.tradeId.includes(searchQuery);

    const matchesFilter =
      selectedFilter === 'ALL' ||
      (selectedFilter === 'SIGNAL' && (evt.stepType === 'SIGNAL_GENERATED' || evt.stepType === 'CONDITION_MATCHED')) ||
      (selectedFilter === 'ORDERS' && (evt.stepType === 'ORDER_SUBMITTED' || evt.stepType === 'ORDER_FILLED')) ||
      (selectedFilter === 'RISK' && evt.stepType === 'RISK_CHECK_APPROVED');

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="rounded-xl bg-bg-surface border border-border-color p-5 space-y-4 shadow-xs">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-border-color">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-500 animate-pulse" />
              Automation Event Stream
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              Live Feed
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Click any event line to open the full 8-step decision chain for that trade.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onTriggerTestTrade}
            disabled={!isSystemRunning}
            className={`px-3 py-2 min-h-[44px] sm:min-h-[36px] rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              isSystemRunning
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-bg-main hover:brightness-110 shadow-md shadow-cyan-500/20'
                : 'bg-bg-hover text-text-secondary cursor-not-allowed'
            }`}
            title="Simulate an instant automated trade signal with a complete 8-step decision chain"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Simulate Trade Trigger</span>
          </button>

          <button
            onClick={() => setIsStreamPaused(!isStreamPaused)}
            className="px-3 py-2 min-h-[44px] sm:min-h-[36px] rounded-lg bg-bg-hover hover:bg-bg-hover text-text-primary text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-border-color"
          >
            {isStreamPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
            <span>{isStreamPaused ? 'Resume Feed' : 'Pause Feed'}</span>
          </button>

          <button
            onClick={onClearEvents}
            className="p-2 min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] rounded-lg bg-bg-hover/80 hover:bg-rose-500/20 text-text-secondary hover:text-rose-400 transition-colors cursor-pointer border border-border-color flex items-center justify-center"
            title="Clear Event Feed"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-text-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stream events (e.g., 'Market data', 'Signal', 'Vol100')..."
            className="w-full bg-[#080B10] border border-border-color rounded-lg pl-9 pr-3 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-text-secondary" />
          {['ALL', 'SIGNAL', 'RISK', 'ORDERS'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedFilter(cat)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                selectedFilter === cat
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-bg-surface/60 text-text-secondary hover:text-slate-200 border border-border-color'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Stream Event Log Box */}
      <div className="rounded-xl bg-[#080B10] border border-border-color/90 overflow-hidden min-h-[320px] max-h-[480px] overflow-y-auto divide-y divide-slate-800/60 text-xs">
        {filteredEvents.length === 0 ? (
          <div className="p-12 text-center text-text-secondary space-y-2">
            <Activity className="w-8 h-8 mx-auto text-slate-600 animate-bounce" />
            <p>No stream events matching current filter or search criteria.</p>
            <p className="text-[11px] text-slate-600">Events will populate automatically as strategy evaluation cycles run.</p>
          </div>
        ) : (
          filteredEvents.map((evt) => (
            <motion.div
              key={evt.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => onSelectTradeChain(evt.tradeChain)}
              className="p-3 hover:bg-[#111726] transition-colors cursor-pointer flex flex-wrap items-center justify-between gap-3 group"
            >
              {/* Event Text & Time */}
              <div className="flex items-center gap-3 min-w-[280px]">
                <span className="text-cyan-400 font-bold shrink-0">{evt.timeString}</span>
                <span className="text-slate-200 font-medium group-hover:text-cyan-300 transition-colors">
                  {evt.text}
                </span>
              </div>

              {/* Event Metadata & Step Badge */}
              <div className="flex items-center gap-3 shrink-0 ml-auto">
                <span className="text-[11px] text-text-secondary font-sans hidden sm:inline">
                  {evt.symbol} ({evt.strategyName.split(' ')[0]})
                </span>
                {getStepBadge(evt.stepType)}
                <span className="text-[10px] text-cyan-400/80 group-hover:text-cyan-300 font-bold flex items-center gap-0.5 underline decoration-cyan-500/40">
                  <span>Audit Chain</span>
                  <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Stream Summary Footer */}
      <div className="flex items-center justify-between text-[11px] text-text-secondary pt-1">
        <span>Showing {filteredEvents.length} events (Live auto-scroll active)</span>
        <span className="text-text-secondary">
          Tip: Click any log line above to inspect full indicators, risk tokens, and order tickets.
        </span>
      </div>
    </div>
  );
};
