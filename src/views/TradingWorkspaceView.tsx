import React, { useMemo } from 'react';
import { useMarketData } from '../state/MarketDataContext';
import { InteractiveCandleChart } from '../components/chart/InteractiveCandleChart';
import { MarketIntelligencePanel } from '../components/market/MarketIntelligencePanel';
import { ConfluenceSummary } from '../components/analysis/ConfluenceSummary';
import { ScenarioEngine } from '../components/analysis/ScenarioEngine';
import { AiExplanationPanel } from '../components/analysis/AiExplanationPanel';
import { ExecutionCommandDesk } from '../components/eas/ExecutionCommandDesk';
import { PositionsPanel } from '../components/trading/PositionsPanel';
import { Card } from '../components/ui/Card';

export const TradingWorkspaceView: React.FC = () => {
  const { 
    selectedSymbol, 
    selectedInstrument, 
    selectedTimeframe, 
    candles, 
    ticks,
    dataFreshness,
    setSelectedTimeframe 
  } = useMarketData();

  const activeCandles = useMemo(() => candles[`${selectedSymbol}_${selectedTimeframe}`] || [], [candles, selectedSymbol, selectedTimeframe]);
  const currentTick = ticks[selectedSymbol];

  return (
    <div className="flex flex-col h-full p-2 lg:p-4 space-y-4 container mx-auto max-w-screen-2xl">
      {/* Header with Market Info */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg lg:text-xl font-bold text-text-primary">Workspace: {selectedSymbol}</h2>
        <span className={`px-2 py-1 text-[10px] font-mono rounded ${dataFreshness === 'LIVE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
            {dataFreshness.toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-4 flex-1">
        {/* Left: Chart + Analysis */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="bg-bg-surface p-2 lg:p-3 rounded-[4px] border border-border-color min-h-[400px]">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="bg-bg-surface p-2 lg:p-3 rounded-[4px] border border-border-color">
                <ScenarioEngine instrument={selectedInstrument} />
              </div>
              <div className="bg-bg-surface p-2 lg:p-3 rounded-[4px] border border-border-color">
                <ConfluenceSummary instrument={selectedInstrument} candles={activeCandles} />
              </div>
          </div>
        </div>

        {/* Right: Execution + Intelligence */}
        <div className="lg:col-span-4 space-y-2 lg:space-y-4">
          <div className="bg-bg-surface p-2 lg:p-3 rounded-[4px] border border-border-color">
            <ExecutionCommandDesk />
          </div>
          <div className="bg-bg-surface p-2 lg:p-3 rounded-[4px] border border-border-color">
            <MarketIntelligencePanel 
              instrument={selectedInstrument} 
              candles={activeCandles} 
              dataFreshness={dataFreshness} 
            />
          </div>
          <div className="bg-bg-surface p-2 lg:p-3 rounded-[4px] border border-border-color">
            <PositionsPanel />
          </div>
          <div className="bg-bg-surface p-2 lg:p-3 rounded-[4px] border border-border-color">
            <AiExplanationPanel instrument={selectedInstrument} candles={activeCandles} />
          </div>
        </div>
      </div>
    </div>
  );
};
