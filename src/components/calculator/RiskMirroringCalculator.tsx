/**
 * AppexQuant Markets Global - Prop Firm Risk-Mirroring & Lot-Sizing Calculator
 * Live interactive calculator for copy-trading proportional risk & drawdown preservation.
 */

import React, { useState, useMemo } from 'react';
import {
  Calculator,
  ShieldCheck,
  ShieldAlert,
  Sliders,
  Scale,
  ArrowRight,
  TrendingDown,
  Info,
  DollarSign,
  Percent,
} from 'lucide-react';
import {
  calculateRiskMirroredLot,
  ASSET_SIZING_RULES,
  PRESET_FOLLOWER_ACCOUNTS,
} from '../../services/riskMirroringEngine.ts';
import { Button } from '../ui/Button.tsx';

export const RiskMirroringCalculator: React.FC = () => {
  const [masterEquity, setMasterEquity] = useState<number>(100000);
  const [masterLot, setMasterLot] = useState<number>(2.0);
  const [masterSlPips, setMasterSlPips] = useState<number>(25);
  const [masterDailyLossPct, setMasterDailyLossPct] = useState<number>(5.0);

  const [followerEquity, setFollowerEquity] = useState<number>(10000);
  const [followerDailyLossPct, setFollowerDailyLossPct] = useState<number>(4.0);
  const [riskMultiplier, setRiskMultiplier] = useState<number>(1.0);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('EURUSD');
  const [enforceHardLimit, setEnforceHardLimit] = useState<boolean>(true);

  const result = useMemo(() => {
    return calculateRiskMirroredLot({
      masterEquity,
      masterLotSize: masterLot,
      masterStopLossPips: masterSlPips,
      followerEquity,
      followerMaxDailyLossPct: followerDailyLossPct,
      masterMaxDailyLossPct: masterDailyLossPct,
      symbol: selectedSymbol,
      riskMultiplier,
      enforceHardLimit,
    });
  }, [
    masterEquity,
    masterLot,
    masterSlPips,
    masterDailyLossPct,
    followerEquity,
    followerDailyLossPct,
    riskMultiplier,
    selectedSymbol,
    enforceHardLimit,
  ]);

  const handleSelectPreset = (equity: number, dailyLossPct: number) => {
    setFollowerEquity(equity);
    setFollowerDailyLossPct(dailyLossPct);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 bg-surface-primary border border-border-subtle rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Scale className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-text-primary">Prop Firm Risk-Mirroring Calculator</h2>
          </div>
          <p className="text-xs text-text-secondary max-w-2xl leading-relaxed">
            Dynamically calculate exact follower lot sizing when copying master signals to strictly avoid daily drawdown limit breaches on evaluation & funded prop firm accounts.
          </p>
        </div>

        {/* Evaluation Presets */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-text-secondary font-mono">Quick Preset:</span>
          <button
            onClick={() => handleSelectPreset(10000, 4.0)}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${followerEquity === 10000 ? 'bg-primary text-black' : 'bg-surface-secondary text-text-secondary border border-border-subtle'}`}
          >
            $10K
          </button>
          <button
            onClick={() => handleSelectPreset(50000, 4.0)}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${followerEquity === 50000 ? 'bg-primary text-black' : 'bg-surface-secondary text-text-secondary border border-border-subtle'}`}
          >
            $50K
          </button>
          <button
            onClick={() => handleSelectPreset(100000, 5.0)}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${followerEquity === 100000 ? 'bg-primary text-black' : 'bg-surface-secondary text-text-secondary border border-border-subtle'}`}
          >
            $100K
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Inputs: Master & Follower Parameters */}
        <div className="lg:col-span-7 space-y-5">
          {/* Master Trader Account Card */}
          <div className="p-5 bg-surface-primary border border-border-subtle rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" /> Master Trader Parameters
              </h3>
              <select
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
                className="px-3 py-1.5 bg-surface-secondary border border-border-subtle rounded-lg text-xs font-mono text-text-primary"
              >
                {Object.keys(ASSET_SIZING_RULES).map((sym) => (
                  <option key={sym} value={sym}>
                    {sym} ({ASSET_SIZING_RULES[sym].category})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-text-secondary font-semibold uppercase">Master Balance ($)</label>
                <input
                  type="number"
                  value={masterEquity}
                  onChange={(e) => setMasterEquity(Math.max(100, parseFloat(e.target.value) || 0))}
                  className="w-full mt-1 p-2 bg-surface-secondary border border-border-subtle rounded-xl text-xs font-mono text-text-primary"
                />
              </div>

              <div>
                <label className="text-[10px] text-text-secondary font-semibold uppercase">Master Order Lot</label>
                <input
                  type="number"
                  step="0.01"
                  value={masterLot}
                  onChange={(e) => setMasterLot(Math.max(0.01, parseFloat(e.target.value) || 0))}
                  className="w-full mt-1 p-2 bg-surface-secondary border border-border-subtle rounded-xl text-xs font-mono text-text-primary"
                />
              </div>

              <div>
                <label className="text-[10px] text-text-secondary font-semibold uppercase">Stop Loss (Pips)</label>
                <input
                  type="number"
                  value={masterSlPips}
                  onChange={(e) => setMasterSlPips(Math.max(1, parseFloat(e.target.value) || 0))}
                  className="w-full mt-1 p-2 bg-surface-secondary border border-border-subtle rounded-xl text-xs font-mono text-text-primary"
                />
              </div>
            </div>
          </div>

          {/* Follower Account Card */}
          <div className="p-5 bg-surface-primary border border-border-subtle rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> Follower Account (Your Prop Evaluation)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-text-secondary font-semibold uppercase">Follower Balance ($)</label>
                <input
                  type="number"
                  value={followerEquity}
                  onChange={(e) => setFollowerEquity(Math.max(100, parseFloat(e.target.value) || 0))}
                  className="w-full mt-1 p-2 bg-surface-secondary border border-border-subtle rounded-xl text-xs font-mono text-text-primary"
                />
              </div>

              <div>
                <label className="text-[10px] text-text-secondary font-semibold uppercase">Daily Max Loss (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={followerDailyLossPct}
                  onChange={(e) => setFollowerDailyLossPct(Math.max(0.5, parseFloat(e.target.value) || 0))}
                  className="w-full mt-1 p-2 bg-surface-secondary border border-border-subtle rounded-xl text-xs font-mono text-text-primary"
                />
              </div>

              <div>
                <label className="text-[10px] text-text-secondary font-semibold uppercase">Risk Multiplier ({riskMultiplier}x)</label>
                <input
                  type="range"
                  min="0.2"
                  max="2.0"
                  step="0.1"
                  value={riskMultiplier}
                  onChange={(e) => setRiskMultiplier(parseFloat(e.target.value))}
                  className="w-full mt-3.5 accent-primary"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                id="hardLimit"
                checked={enforceHardLimit}
                onChange={(e) => setEnforceHardLimit(e.target.checked)}
                className="rounded accent-primary"
              />
              <label htmlFor="hardLimit" className="text-text-secondary select-none cursor-pointer">
                Strict Prop Firm Protection (auto-clamp lot if risk exceeds 50% of daily loss allowance)
              </label>
            </div>
          </div>
        </div>

        {/* Right Output: Calculation Result & Risk Analytics */}
        <div className="lg:col-span-5 space-y-4">
          <div className={`p-6 rounded-2xl border flex flex-col justify-between space-y-6 ${result.isSafeForEvaluation ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-rose-950/20 border-rose-500/30'}`}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-secondary uppercase">Recommended Follower Lot Size</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border flex items-center gap-1 ${result.isSafeForEvaluation ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'}`}>
                  {result.isSafeForEvaluation ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                  {result.isSafeForEvaluation ? 'PROP PASS SAFE' : 'RISK WARNING'}
                </span>
              </div>

              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-mono font-black text-text-primary tracking-tight">
                  {result.roundedFollowerLot}
                </span>
                <span className="text-xs text-text-secondary font-mono">
                  lots (Master: {result.masterLotSize})
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-black/40 rounded-xl border border-border-subtle space-y-0.5">
                  <div className="text-[10px] text-text-secondary uppercase font-semibold">Est. Trade Risk ($)</div>
                  <div className="text-sm font-mono font-bold text-text-primary">${result.estimatedFollowerRiskUsd}</div>
                </div>

                <div className="p-3 bg-black/40 rounded-xl border border-border-subtle space-y-0.5">
                  <div className="text-[10px] text-text-secondary uppercase font-semibold">Risk of Equity (%)</div>
                  <div className={`text-sm font-mono font-bold ${result.estimatedFollowerRiskPct > followerDailyLossPct * 0.5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {result.estimatedFollowerRiskPct}%
                  </div>
                </div>
              </div>

              <div className="p-3 bg-surface-secondary/40 rounded-xl border border-border-subtle space-y-1.5 text-xs">
                <div className="flex justify-between text-text-secondary">
                  <span>Equity Proportional Ratio:</span>
                  <span className="font-mono text-text-primary font-bold">{(result.equityRatio * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-text-secondary">
                  <span>Drawdown Scale Weight:</span>
                  <span className="font-mono text-text-primary font-bold">{result.drawdownRiskRatio}x</span>
                </div>
              </div>

              {result.warnings.length > 0 && (
                <div className="space-y-1">
                  {result.warnings.map((w, i) => (
                    <p key={i} className="text-[11px] text-amber-400 flex items-center gap-1.5 font-medium">
                      <Info className="w-3.5 h-3.5 flex-shrink-0" /> {w}
                    </p>
                  ))}
                </div>
              )}
            </div>

            <p className="text-[11px] text-text-secondary leading-relaxed border-t border-border-subtle pt-3">
              {result.explanation}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
