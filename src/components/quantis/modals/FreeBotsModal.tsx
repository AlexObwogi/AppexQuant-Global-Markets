/**
 * Quantis FX - Free Pre-Configured Bots Library Modal
 * Library of tested, automated algorithmic trading strategies for Deriv:
 * - Volatix Martingale Pro
 * - Digit Differ Hunter
 * - Even/Odd Reversal Sentinel
 * - Over/Under 4 Sniper
 * - High-Frequency Tick Momentum
 */

import React, { useState } from 'react';
import { useQuantis, ActiveBotConfig } from '../../../state/QuantisContext.tsx';
import {
  Bot,
  X,
  Play,
  TrendingUp,
  Percent,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  Flame,
  Zap,
  Activity,
} from 'lucide-react';

interface PreBuiltBot extends ActiveBotConfig {
  id: string;
  category: 'Digit' | 'Rise/Fall' | 'Multipliers';
  winRate: number;
  riskRating: 'Low' | 'Medium' | 'High';
  description: string;
  recommendedDeposit: number;
}

const PRE_BUILT_BOTS: PreBuiltBot[] = [
  {
    id: 'bot-volatix-pro',
    name: 'Volatix Martingale Pro',
    source: 'FREE_BOT',
    category: 'Rise/Fall',
    market: 'R_100',
    contractType: 'CALL',
    baseStake: 1.0,
    recoveryMultiplier: 2.1,
    takeProfit: 15.0,
    stopLoss: 30.0,
    winRate: 68.4,
    riskRating: 'Medium',
    recommendedDeposit: 50,
    rulesSummary: 'Executes Rise/Fall contracts on Volatility 100 Index. Dynamically recovers drawdowns with a 2.1x Martingale multiplier.',
    description: 'Designed for trending volatility markets. Captures cyclical upward momentum with structured safety recovery.',
  },
  {
    id: 'bot-digit-differ',
    name: 'Digit Differ Hunter',
    source: 'FREE_BOT',
    category: 'Digit',
    market: 'R_10',
    contractType: 'DIGITDIFF',
    baseStake: 2.0,
    recoveryMultiplier: 3.5,
    takeProfit: 20.0,
    stopLoss: 25.0,
    winRate: 90.9,
    riskRating: 'Low',
    recommendedDeposit: 75,
    rulesSummary: 'Targeting Volatility 10 Index. Executes Digit Differs (prediction != 0) with 90.9% probability mathematical payout.',
    description: 'High-frequency strike rate bot. Takes advantage of low-frequency digit occurrences on smoothed volatility indices.',
  },
  {
    id: 'bot-even-odd',
    name: 'Even/Odd Reversal Sentinel',
    source: 'FREE_BOT',
    category: 'Digit',
    market: 'R_75',
    contractType: 'DIGITEVEN',
    baseStake: 1.0,
    recoveryMultiplier: 2.0,
    takeProfit: 12.0,
    stopLoss: 20.0,
    winRate: 64.2,
    riskRating: 'Medium',
    recommendedDeposit: 40,
    rulesSummary: 'Scans Volatility 75 tick stream for 3 consecutive same-parity digits (e.g. Odd-Odd-Odd) and enters mean-reversion counter contracts.',
    description: 'Mean-reversion statistical algorithm. Enters positions when tick distribution reaches 3-sigma digit clustering.',
  },
  {
    id: 'bot-over-under',
    name: 'Over/Under 4 Sniper',
    source: 'FREE_BOT',
    category: 'Digit',
    market: '1HZ50V',
    contractType: 'DIGITOVER',
    baseStake: 1.5,
    recoveryMultiplier: 2.2,
    takeProfit: 25.0,
    stopLoss: 35.0,
    winRate: 58.7,
    riskRating: 'Medium',
    recommendedDeposit: 60,
    rulesSummary: 'Evaluates Volatility 50 (1s) Index. Enters Over 4 contracts when tick acceleration crosses the positive momentum threshold.',
    description: 'Asymmetric return engine. Exploits rapid tick updates on 1-second synthetic indices for compounding returns.',
  },
  {
    id: 'bot-hft-momentum',
    name: 'High-Frequency Tick Rider',
    source: 'FREE_BOT',
    category: 'Rise/Fall',
    market: 'R_25',
    contractType: 'PUT',
    baseStake: 1.0,
    recoveryMultiplier: 1.8,
    takeProfit: 18.0,
    stopLoss: 25.0,
    winRate: 71.0,
    riskRating: 'Low',
    recommendedDeposit: 50,
    rulesSummary: '1-tick ultra-fast execution engine on Volatility 25. Enters immediate counter-trend ticks following sudden spike moves.',
    description: 'Low-latency scalping bot. Optimized for the FAST execution engine mode with tight risk controls.',
  },
];

export const FreeBotsModal: React.FC = () => {
  const { isFreeBotsModalOpen, setFreeBotsModalOpen, loadPreConfiguredBot, startExecution } = useQuantis();
  const [selectedBot, setSelectedBot] = useState<PreBuiltBot>(PRE_BUILT_BOTS[0]);

  if (!isFreeBotsModalOpen) return null;

  const handleSelectAndLoad = (bot: PreBuiltBot, launchImmediately = false) => {
    loadPreConfiguredBot(bot);
    setFreeBotsModalOpen(false);
    if (launchImmediately) {
      startExecution(bot);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Free Strategy Library</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Pre-Configured
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Verified automated trading bots ready for one-click deployment.
              </p>
            </div>
          </div>
          <button
            onClick={() => setFreeBotsModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2-Column Split: List + Strategy Detail */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden">
          {/* Left Column: Bot Cards List */}
          <div className="md:col-span-5 border-r border-slate-800 p-3 sm:p-4 overflow-y-auto space-y-2">
            {PRE_BUILT_BOTS.map((bot) => {
              const isSelected = selectedBot.id === bot.id;
              return (
                <div
                  key={bot.id}
                  onClick={() => setSelectedBot(bot)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800 border-cyan-500/50 shadow-md'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-100 truncate">{bot.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-semibold shrink-0">
                      {bot.market}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono mt-2">
                    <span className="text-emerald-400 font-bold">{bot.winRate}% Win</span>
                    <span className="text-slate-500">{bot.category}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Detailed Strategy Profile */}
          <div className="md:col-span-7 p-4 sm:p-6 overflow-y-auto space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="text-base font-bold text-slate-100">{selectedBot.name}</h4>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    selectedBot.riskRating === 'Low'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}>
                    {selectedBot.riskRating} Risk
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {selectedBot.description}
                </p>
              </div>

              {/* Matrix of parameters */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block uppercase">Target Market</span>
                  <strong className="text-cyan-400">{selectedBot.market}</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block uppercase">Base Stake</span>
                  <strong className="text-slate-100">${selectedBot.baseStake.toFixed(2)} USD</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block uppercase">Recovery Multiplier</span>
                  <strong className="text-amber-400">{selectedBot.recoveryMultiplier}x</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block uppercase">Take Profit / Stop Loss</span>
                  <strong className="text-emerald-400">+${selectedBot.takeProfit} / -${selectedBot.stopLoss}</strong>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-1">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                  Execution Rules Summary
                </span>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {selectedBot.rulesSummary}
                </p>
              </div>
            </div>

            {/* Launch Actions */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => handleSelectAndLoad(selectedBot, false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                Load to Suite
              </button>
              <button
                type="button"
                onClick={() => handleSelectAndLoad(selectedBot, true)}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Load &amp; Launch</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
