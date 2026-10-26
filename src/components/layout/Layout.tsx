/**
 * AppexQuant Markets Global - Master Frame Chassis (Phase 1)
 * Enforces h-screen w-screen overflow-hidden select-none bg-[#15171e] text-[#ffffff]
 * and 3-Zone High-Density Grid Structure (grid-cols-[240px_1fr_340px] h-full)
 */

import React, { ReactNode, useState, useEffect } from 'react';
import { useGlobalState } from '../../state/GlobalStateContext.tsx';
import { Sidebar } from './Sidebar.tsx';
import { X, Activity, ShieldCheck, TrendingUp, DollarSign } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { state, dispatch } = useGlobalState();
  const [utcTime, setUtcTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().split(' ')[4] || '12:00:00');
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden select-none bg-[#15171e] text-[#ffffff] flex flex-col font-sans antialiased">
      {/* Absolute Continuous Market Ticker Tape across absolute top layout layer (Zone 2 header / top strip) */}
      <div className="h-10 bg-[#15171e] border-b border-[#2a2e39] px-4 flex items-center justify-between text-xs shrink-0 z-20">
        <div className="flex items-center space-x-6 overflow-hidden no-scrollbar">
          <div className="flex items-center space-x-2 text-[#9699a0]">
            <span className="inline-block w-2 h-2 rounded-full bg-[#00a86b] animate-pulse"></span>
            <span className="font-mono text-[#ffffff] font-bold">WS SYNC: ACTIVE</span>
          </div>
          <div className="flex items-center space-x-4 font-mono text-[#9699a0]">
            <span>EUR/USD: <strong className="text-[#00a86b]">1.08452</strong> (+0.14%)</span>
            <span>BTC/USD: <strong className="text-[#ff444f]">91,420.50</strong> (-0.82%)</span>
            <span>VOL-100: <strong className="text-[#00a86b]">4,821.10</strong> (+1.25%)</span>
            <span>GOLD: <strong className="text-[#00a86b]">2,335.80</strong> (+0.43%)</span>
          </div>
        </div>
        <div className="flex items-center space-x-4 font-mono text-[#9699a0] shrink-0">
          <span>UTC: {utcTime}</span>
          <span className="px-2 py-0.5 rounded bg-[#1c1f26] border border-[#2a2e39] text-[#ffffff] font-bold">
            ACC ID: DOT94330131
          </span>
        </div>
      </div>

      {/* Main 3-Zone High-Density Structural Grid Layout Container */}
      <div className="flex-1 grid grid-cols-[240px_1fr_340px] h-full overflow-hidden w-full">
        {/* ZONE 1: Left Nav Hub (Fixed 240px) */}
        <aside className="h-full bg-[#15171e] border-r border-[#2a2e39] flex flex-col overflow-hidden z-10">
          <Sidebar />
        </aside>

        {/* ZONE 2: Center Workspace Engine (flex-1) */}
        <main className="h-full bg-[#15171e] flex flex-col overflow-hidden relative min-w-0">
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-4 space-y-3 no-scrollbar">
            {children}
          </div>
        </main>

        {/* ZONE 3: Right Parameter Deck (Fixed 340px) */}
        <aside className="h-full bg-[#1c1f26] border-l border-[#2a2e39] flex flex-col overflow-hidden p-3.5 z-10 space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-[#2a2e39]">
            <span className="text-xs font-bold text-[#ffffff] uppercase tracking-wider">Parameter Control Deck</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#15171e] text-[#00a86b] rounded border border-[#2a2e39]">SECURE</span>
          </div>

          <div className="space-y-2.5 flex-1 overflow-y-auto no-scrollbar text-xs">
            <div className="p-2.5 rounded bg-[#15171e] border border-[#2a2e39] space-y-1.5">
              <div className="flex justify-between text-[#9699a0]">
                <span>Asset Instrument</span>
                <strong className="text-[#ffffff]">Volatility 100 Index</strong>
              </div>
              <div className="flex justify-between text-[#9699a0]">
                <span>Contract Type</span>
                <strong className="text-[#00a86b]">Rise / Fall (High-Frequency)</strong>
              </div>
              <div className="flex justify-between text-[#9699a0]">
                <span>Duration</span>
                <strong className="text-[#ffffff]">5 Ticks</strong>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-[#9699a0] block font-bold">Stake Capital (USD)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-[#9699a0]">$</span>
                <input
                  type="number"
                  defaultValue={100}
                  className="w-full bg-[#15171e] border border-[#2a2e39] rounded px-3 py-2 pl-7 text-[#ffffff] font-mono font-bold text-sm focus:outline-none focus:border-[#ff444f]"
                />
              </div>
            </div>

            <div className="p-2.5 rounded bg-[#15171e] border border-[#2a2e39] space-y-1.5">
              <div className="flex justify-between text-[#9699a0]">
                <span>Payout Potential</span>
                <strong className="text-[#00a86b] font-mono">+$195.50 (95.5%)</strong>
              </div>
              <div className="flex justify-between text-[#9699a0]">
                <span>Risk Exposure</span>
                <strong className="text-[#ff444f] font-mono">-$100.00</strong>
              </div>
            </div>
          </div>

          {/* High-Contrast Buy and Sell Action Terminus Buttons */}
          <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-[#2a2e39] shrink-0">
            <button
              onClick={() => dispatch({ type: 'ADD_NOTIFICATION', payload: { title: 'BUY ORDER PLACED', message: 'Rise order submitted successfully @ $100.00', type: 'success' } })}
              className="py-3 px-3 rounded bg-[#ff444f] hover:bg-[#e03b44] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-1.5 cursor-pointer transition-colors shadow-lg"
            >
              <TrendingUp className="w-4 h-4" />
              <span>BUY (RISE)</span>
            </button>
            <button
              onClick={() => dispatch({ type: 'ADD_NOTIFICATION', payload: { title: 'SELL ORDER PLACED', message: 'Fall order submitted successfully @ $100.00', type: 'success' } })}
              className="py-3 px-3 rounded bg-[#00a86b] hover:bg-[#00925c] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-1.5 cursor-pointer transition-colors shadow-lg"
            >
              <DollarSign className="w-4 h-4" />
              <span>SELL (FALL)</span>
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};
