/**
 * Interactive Candlestick Explorer Component
 * Teaches OHLC morphology and candle psychology.
 */

import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Info } from 'lucide-react';

export const InteractiveCandleExplorer: React.FC = () => {
  const [candleType, setCandleType] = useState<'bullish' | 'bearish' | 'pinbar'>('bullish');

  const data = {
    bullish: {
      title: 'Strong Bullish Momentum Candle',
      open: 1.0820,
      close: 1.0880,
      high: 1.0890,
      low: 1.0815,
      bodySize: '60 pips',
      psychology: 'Buyers aggressively stepped in at the open, maintained control through the session, and closed near the high. Indicates strong upward momentum.',
      color: 'text-emerald-400 bg-emerald-500',
      borderColor: 'border-emerald-500'
    },
    bearish: {
      title: 'Strong Bearish Momentum Candle',
      open: 1.0880,
      close: 1.0820,
      high: 1.0885,
      low: 1.0810,
      bodySize: '60 pips',
      psychology: 'Sellers dominated from the open, overwhelming bids and pushing price down to close near the session low. Shows strong downward pressure.',
      color: 'text-rose-400 bg-rose-500',
      borderColor: 'border-rose-500'
    },
    pinbar: {
      title: 'Bullish Rejection Pinbar',
      open: 1.0830,
      close: 1.0870,
      high: 1.0875,
      low: 1.0780,
      bodySize: '40 pips body, 50 pips lower wick',
      psychology: 'Sellers pushed price sharply down during the session, but buyers rejected lower prices violently, creating a long lower wick and closing higher.',
      color: 'text-cyan-400 bg-cyan-500',
      borderColor: 'border-cyan-500'
    }
  };

  const current = data[candleType];

  return (
    <div className="bg-[#131822] border border-border-color rounded-2xl p-6 text-slate-100 shadow-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Info className="w-4 h-4 text-sky-400" /> Candlestick Morphology & Psychology Explorer
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">Click different candle types to analyze open, high, low, close and market psychology.</p>
        </div>
        <div className="flex bg-bg-surface p-1 rounded-xl border border-border-color">
          <button
            onClick={() => setCandleType('bullish')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${candleType === 'bullish' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-text-secondary hover:text-slate-200'}`}
          >
            Bullish
          </button>
          <button
            onClick={() => setCandleType('bearish')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${candleType === 'bearish' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'text-text-secondary hover:text-slate-200'}`}
          >
            Bearish
          </button>
          <button
            onClick={() => setCandleType('pinbar')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${candleType === 'pinbar' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-text-secondary hover:text-slate-200'}`}
          >
            Rejection Pinbar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center bg-bg-surface/60 border border-border-color/80 rounded-xl p-6">
        {/* Visual candle representation */}
        <div className="flex flex-col items-center justify-center h-52 bg-[#0B0E14] rounded-xl border border-border-color p-4 relative">
          <div className="absolute top-2 left-3 text-[10px] font-mono text-text-secondary">High: {current.high}</div>
          {/* Wick top */}
          <div className={`w-1 h-12 bg-slate-500`}></div>
          {/* Body */}
          <div className={`w-16 h-24 rounded-sm border ${current.borderColor} ${current.color} bg-opacity-20 flex items-center justify-center font-mono text-xs font-bold`}>
            {candleType === 'bullish' ? <ArrowUpRight className="w-5 h-5 text-emerald-400" /> : candleType === 'bearish' ? <ArrowDownRight className="w-5 h-5 text-rose-400" /> : 'Pin'}
          </div>
          {/* Wick bottom */}
          <div className={`w-1 ${candleType === 'pinbar' ? 'h-16' : 'h-12'} bg-slate-500`}></div>
          <div className="absolute bottom-2 left-3 text-[10px] font-mono text-text-secondary">Low: {current.low}</div>
        </div>

        {/* OHLC data breakdown */}
        <div className="space-y-3 md:col-span-2">
          <h4 className="text-sm font-semibold text-slate-200">{current.title}</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
            <div className="bg-slate-980 bg-bg-surface p-2.5 rounded-lg border border-border-color">
              <span className="text-text-secondary block text-[10px]">OPEN</span>
              <span className="text-slate-200 font-bold">{current.open}</span>
            </div>
            <div className="bg-bg-surface p-2.5 rounded-lg border border-border-color">
              <span className="text-text-secondary block text-[10px]">HIGH</span>
              <span className="text-emerald-400 font-bold">{current.high}</span>
            </div>
            <div className="bg-bg-surface p-2.5 rounded-lg border border-border-color">
              <span className="text-text-secondary block text-[10px]">LOW</span>
              <span className="text-rose-400 font-bold">{current.low}</span>
            </div>
            <div className="bg-bg-surface p-2.5 rounded-lg border border-border-color">
              <span className="text-text-secondary block text-[10px]">CLOSE</span>
              <span className="text-slate-200 font-bold">{current.close}</span>
            </div>
          </div>
          <div className="bg-sky-500/10 border border-sky-500/20 p-3.5 rounded-xl text-xs text-sky-200 leading-relaxed">
            <span className="font-semibold text-sky-400 block mb-1">Market Psychology:</span>
            {current.psychology}
          </div>
        </div>
      </div>
    </div>
  );
};
