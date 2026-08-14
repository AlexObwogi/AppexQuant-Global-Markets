/**
 * AppexQuant Markets Global - Community Post Creation Modal
 * Allows creating Discussions, Educational guides, Strategy sharing, or Performance snapshots
 */

import React, { useState } from 'react';
import { PostCategory, AccountType, VerificationStatus } from '../../types/community.js';
import { X, Send, Play, ShieldAlert, Award } from 'lucide-react';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (postData: any) => void;
  currentUserVerificationStatus: VerificationStatus;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  currentUserVerificationStatus,
}) => {
  const [category, setCategory] = useState<PostCategory>('STRATEGY_DISCUSSION');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsText, setTagsText] = useState('');

  // Strategy Sharing payload state
  const [strategyName, setStrategyName] = useState('');
  const [symbolsText, setSymbolsText] = useState('R_100, frxEURUSD');
  const [timeframe, setTimeframe] = useState('M15');
  const [riskReward, setRiskReward] = useState('1:2.5');
  const [winRate, setWinRate] = useState(65);
  const [strategyRules, setStrategyRules] = useState('');

  // Performance Snapshot payload state
  const [accountType, setAccountType] = useState<AccountType>('LIVE');
  const [dataSource, setDataSource] = useState('Deriv MT5 Live Gateway');
  const [period, setPeriod] = useState('Jan 2026 - Jul 2026');
  const [netProfitUsd, setNetProfitUsd] = useState(5400);
  const [winRatePct, setWinRatePct] = useState(68.5);
  const [profitFactor, setProfitFactor] = useState(2.2);
  const [maxDrawdownPct, setMaxDrawdownPct] = useState(5.4);
  const [totalTrades, setTotalTrades] = useState(120);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const tags = tagsText
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    let sharedStrategy = undefined;
    if (category === 'STRATEGY_DISCUSSION' && strategyName.trim()) {
      sharedStrategy = {
        strategyName,
        symbols: symbolsText.split(',').map((s) => s.trim()),
        timeframe,
        riskRewardRatio: riskReward,
        winRatePct: Number(winRate),
        description: content.slice(0, 150),
        rules: strategyRules.split('\n').filter((r) => r.trim().length > 0),
      };
    }

    let performanceSnapshot = undefined;
    if (category === 'PERFORMANCE_SNAPSHOT' || category === 'SUCCESS_STORY') {
      const isVerified = currentUserVerificationStatus === 'PERFORMANCE_VERIFIED';
      performanceSnapshot = {
        accountType,
        dataSource,
        period,
        winRatePct: Number(winRatePct),
        netProfitUsd: Number(netProfitUsd),
        startingBalanceUsd: 10000,
        endingBalanceUsd: 10000 + Number(netProfitUsd),
        profitFactor: Number(profitFactor),
        maxDrawdownPct: Number(maxDrawdownPct),
        totalTrades: Number(totalTrades),
        verificationStatus: isVerified ? 'PERFORMANCE_VERIFIED' : 'UNVERIFIED',
        verificationSourceNote: isVerified
          ? `Audited via connected live broker account`
          : `Self-Reported / Unverified Feed (${dataSource})`,
      };
    }

    onSubmit({
      category,
      title,
      content,
      tags,
      sharedStrategy,
      performanceSnapshot,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111622] border border-border-color rounded-2xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between border-b border-border-color pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-100">Publish Community Post</h3>
            <p className="text-xs text-text-secondary font-mono mt-0.5">Share strategies, quant insights, or verified performance records</p>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-slate-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
          {/* Post Category Selection */}
          <div>
            <label className="block text-text-primary font-mono uppercase text-[11px] mb-1.5 font-bold">Category</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'STRATEGY_DISCUSSION', label: 'Strategy Share' },
                { id: 'EDUCATIONAL', label: 'Educational Post' },
                { id: 'PERFORMANCE_SNAPSHOT', label: 'Performance Snapshot' },
                { id: 'SUCCESS_STORY', label: 'Success Story' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id as PostCategory)}
                  className={`py-2 px-3 rounded-lg border font-mono text-[11px] font-bold transition-all cursor-pointer ${
                    category === cat.id
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm'
                      : 'bg-[#131822] text-text-secondary border-border-color hover:text-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Post Title */}
          <div>
            <label className="block text-text-primary font-mono uppercase text-[11px] mb-1 font-bold">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Audited 6-Month Liquidity Sweep Performance Log"
              className="w-full bg-[#131822] border border-border-color rounded-lg px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Post Content */}
          <div>
            <label className="block text-text-primary font-mono uppercase text-[11px] mb-1 font-bold">Content</label>
            <textarea
              required
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Provide constructive context, trade methodology, or risk rules..."
              className="w-full bg-[#131822] border border-border-color rounded-lg px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Category-Specific Inputs: Performance Snapshot / Success Story */}
          {(category === 'PERFORMANCE_SNAPSHOT' || category === 'SUCCESS_STORY') && (
            <div className="p-4 rounded-xl bg-[#0B0E14] border border-amber-500/20 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-mono uppercase font-bold text-xs">
                <Award className="w-4 h-4" />
                <span>Performance Record Details</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono">
                <div>
                  <label className="block text-text-secondary text-[10px] uppercase">Account Type</label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value as AccountType)}
                    className="w-full bg-[#131822] border border-border-color rounded px-2.5 py-1.5 text-xs text-slate-200"
                  >
                    <option value="LIVE">LIVE</option>
                    <option value="PAPER">PAPER</option>
                    <option value="BACKTEST">BACKTEST</option>
                    <option value="SIMULATED">SIMULATED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-text-secondary text-[10px] uppercase">Data Source</label>
                  <input
                    type="text"
                    value={dataSource}
                    onChange={(e) => setDataSource(e.target.value)}
                    placeholder="e.g. Deriv MT5 Live Server #1"
                    className="w-full bg-[#131822] border border-border-color rounded px-2.5 py-1.5 text-xs text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-text-secondary text-[10px] uppercase">Period</label>
                  <input
                    type="text"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    placeholder="e.g. Jan 2026 - Jul 2026"
                    className="w-full bg-[#131822] border border-border-color rounded px-2.5 py-1.5 text-xs text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-text-secondary text-[10px] uppercase">Net Result ($)</label>
                  <input
                    type="number"
                    value={netProfitUsd}
                    onChange={(e) => setNetProfitUsd(Number(e.target.value))}
                    className="w-full bg-[#131822] border border-border-color rounded px-2.5 py-1.5 text-xs text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-text-secondary text-[10px] uppercase">Win Rate (%)</label>
                  <input
                    type="number"
                    value={winRatePct}
                    onChange={(e) => setWinRatePct(Number(e.target.value))}
                    className="w-full bg-[#131822] border border-border-color rounded px-2.5 py-1.5 text-xs text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-text-secondary text-[10px] uppercase">Max Drawdown (%)</label>
                  <input
                    type="number"
                    value={maxDrawdownPct}
                    onChange={(e) => setMaxDrawdownPct(Number(e.target.value))}
                    className="w-full bg-[#131822] border border-border-color rounded px-2.5 py-1.5 text-xs text-slate-200"
                  />
                </div>
              </div>

              {currentUserVerificationStatus !== 'PERFORMANCE_VERIFIED' && (
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[11px] text-amber-300 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Your account is currently <strong>UNVERIFIED</strong>. This performance record will be labeled as <strong>Self-Reported</strong> until connected live broker verification is completed.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Strategy Sharing Inputs */}
          {category === 'STRATEGY_DISCUSSION' && (
            <div className="p-4 rounded-xl bg-[#0B0E14] border border-cyan-500/20 space-y-3">
              <div className="flex items-center gap-2 text-cyan-400 font-mono uppercase font-bold text-xs">
                <Play className="w-4 h-4" />
                <span>Share Executable Strategy Parameters</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono">
                <div>
                  <label className="block text-text-secondary text-[10px] uppercase">Strategy Name</label>
                  <input
                    type="text"
                    value={strategyName}
                    onChange={(e) => setStrategyName(e.target.value)}
                    placeholder="e.g. Asian Range Sweep v2"
                    className="w-full bg-[#131822] border border-border-color rounded px-2.5 py-1.5 text-xs text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-text-secondary text-[10px] uppercase">Symbols (comma separated)</label>
                  <input
                    type="text"
                    value={symbolsText}
                    onChange={(e) => setSymbolsText(e.target.value)}
                    className="w-full bg-[#131822] border border-border-color rounded px-2.5 py-1.5 text-xs text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-text-secondary text-[10px] uppercase">Timeframe</label>
                  <input
                    type="text"
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value)}
                    className="w-full bg-[#131822] border border-border-color rounded px-2.5 py-1.5 text-xs text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-text-secondary text-[10px] uppercase font-mono mb-1">Rule Book / Criteria (1 per line)</label>
                <textarea
                  rows={2}
                  value={strategyRules}
                  onChange={(e) => setStrategyRules(e.target.value)}
                  placeholder="Rule 1: Identify Asian High/Low&#10;Rule 2: Wait for sweep confirmation"
                  className="w-full bg-[#131822] border border-border-color rounded px-2.5 py-1.5 text-xs text-slate-200"
                />
              </div>
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="block text-text-primary font-mono uppercase text-[11px] mb-1 font-bold">Tags (Comma Separated)</label>
            <input
              type="text"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="Verified, SMC, SyntheticIndices, Scalping"
              className="w-full bg-[#131822] border border-border-color rounded-lg px-3.5 py-2 text-xs text-slate-200"
            />
          </div>

          <div className="pt-3 border-t border-border-color flex justify-end gap-3 font-mono">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-bg-hover hover:bg-bg-hover text-text-primary font-bold text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-bg-main font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Publish Post</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
