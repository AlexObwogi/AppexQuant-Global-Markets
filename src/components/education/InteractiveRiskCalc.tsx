/**
 * Interactive Position Sizing & Risk Calculator Component
 * Educational calculator demonstrating risk per trade formula.
 */

import React, { useState } from 'react';
import { ShieldAlert, Calculator, CheckCircle2 } from 'lucide-react';

export const InteractiveRiskCalc: React.FC = () => {
  const [accountBalance, setAccountBalance] = useState<number>(10000);
  const [riskPercent, setRiskPercent] = useState<number>(1.0);
  const [stopLossPips, setStopLossPips] = useState<number>(30);
  const [pipValueUSD, setPipValueUSD] = useState<number>(10); // standard lot pip value

  const riskAmount = (accountBalance * (riskPercent / 100));
  const lotSize = Number((riskAmount / (stopLossPips * pipValueUSD)).toFixed(2));
  const isSafeRisk = riskPercent <= 2.0;

  return (
    <div className="bg-[#131822] border border-border-color rounded-2xl p-6 text-slate-100 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Calculator className="w-4 h-4 text-sky-400" /> Interactive Position Sizing Calculator
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">Calculate exact lot size to adhere to professional risk parameters (≤ 2% per trade).</p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 ${isSafeRisk ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
          {isSafeRisk ? <CheckCircle2 className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
          {isSafeRisk ? 'Professional Risk Policy' : 'High Risk Warning (>2%)'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-text-secondary font-medium block mb-1">Account Balance ($)</label>
            <input
              type="number"
              value={accountBalance}
              onChange={(e) => setAccountBalance(Number(e.target.value))}
              className="w-full bg-[#0B0E14] border border-border-color rounded-xl px-3.5 py-2.5 text-sm text-slate-100 font-mono focus:border-sky-500 outline-none"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-text-secondary">Risk Per Trade (%)</span>
              <span className="font-mono text-sky-400 font-bold">{riskPercent}%</span>
            </div>
            <input
              type="range"
              min="0.25"
              max="5.0"
              step="0.25"
              value={riskPercent}
              onChange={(e) => setRiskPercent(Number(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer"
            />
          </div>

          <div>
            <label className="text-xs text-text-secondary font-medium block mb-1">Stop Loss Distance (Pips)</label>
            <input
              type="number"
              value={stopLossPips}
              onChange={(e) => setStopLossPips(Number(e.target.value))}
              className="w-full bg-[#0B0E14] border border-border-color rounded-xl px-3.5 py-2.5 text-sm text-slate-100 font-mono focus:border-sky-500 outline-none"
            />
          </div>
        </div>

        <div className="bg-bg-surface/80 border border-border-color/80 rounded-xl p-5 flex flex-col justify-between">
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Calculation Results</h4>
            <div className="flex justify-between items-center py-2 border-b border-border-color text-sm">
              <span className="text-text-secondary">Total Capital Risked:</span>
              <span className="font-mono font-bold text-rose-400">${riskAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border-color text-sm">
              <span className="text-text-secondary">Required Lot Size:</span>
              <span className="font-mono font-bold text-sky-400 text-base">{lotSize} Lots</span>
            </div>
            <div className="flex justify-between items-center py-2 text-sm">
              <span className="text-text-secondary">Max Loss Streak (5 Trades):</span>
              <span className="font-mono font-bold text-amber-400">${(riskAmount * 5).toFixed(2)} ({(riskPercent * 5).toFixed(1)}%)</span>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-sky-500/10 border border-sky-500/20 text-xs text-sky-200">
            <strong>Rule:</strong> By risking only {riskPercent}%, even a 10-game losing streak will leave over 90% of your capital intact to recover.
          </div>
        </div>
      </div>
    </div>
  );
};
