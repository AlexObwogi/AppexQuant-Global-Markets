import React, { useState, useEffect, useMemo } from 'react';
import { Brain, Search, Sparkles } from 'lucide-react';
import { useMarketData } from '../state/MarketDataContext.tsx';
import { InteractiveCandleChart } from '../components/chart/InteractiveCandleChart.tsx';
import { MarketIntelligencePanel } from '../components/market/MarketIntelligencePanel.tsx';

export const AIAnalysisView: React.FC = () => {
  const { 
    instruments, 
    selectedSymbol, 
    selectedInstrument, 
    selectedTimeframe, 
    candles, 
    ticks,
    dataFreshness,
    setSelectedSymbol,
    setSelectedTimeframe 
  } = useMarketData();

  const activeCandles = useMemo(() => candles[`${selectedSymbol}_${selectedTimeframe}`] || [], [candles, selectedSymbol, selectedTimeframe]);
  const currentTick = ticks[selectedSymbol];

  return (
    <div className="flex flex-col h-full p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
          <Brain className="w-6 h-6 text-accent-primary" /> AI Market Analysis Workspace
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        {/* Left: Selector (Simplified) */}
        <div className="lg:col-span-2 bg-bg-surface p-3 rounded-[4px] border border-border-color overflow-y-auto max-h-[600px]">
          <h3 className="text-xs font-bold text-text-secondary uppercase mb-3">Market Selector</h3>
          <div className="space-y-1">
            {instruments.slice(0, 10).map(inst => (
              <button
                key={inst.symbol}
                onClick={() => setSelectedSymbol(inst.symbol)}
                className={`w-full p-2 text-xs text-left rounded ${selectedSymbol === inst.symbol ? 'bg-accent-primary/10 text-accent-primary' : 'hover:bg-bg-main text-text-primary'}`}
              >
                {inst.name}
              </button>
            ))}
          </div>
        </div>

        {/* Center: Chart */}
        <div className="lg:col-span-7 bg-bg-surface p-3 rounded-[4px] border border-border-color">
          <InteractiveCandleChart
            symbol={selectedSymbol}
            symbolName={selectedInstrument?.name || selectedSymbol}
            timeframe={selectedTimeframe}
            candles={activeCandles}
            liveTick={currentTick}
            dataFreshness={dataFreshness}
            onTimeframeChange={setSelectedTimeframe}
          />
        </div>

        {/* Right: AI Panel */}
        <div className="lg:col-span-3 bg-bg-surface p-3 rounded-[4px] border border-border-color h-[600px]">
          <MarketIntelligencePanel 
            instrument={selectedInstrument} 
            candles={activeCandles} 
            dataFreshness={dataFreshness} 
          />
        </div>
      </div>
    </div>
  );
};
