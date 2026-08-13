import React, { useState, useMemo } from 'react';
import { useMarketData } from '../state/MarketDataContext';
import { InteractiveCandleChart } from '../components/chart/InteractiveCandleChart';
import { MarketIntelligencePanel } from '../components/market/MarketIntelligencePanel';
import { ConfluenceSummary } from '../components/analysis/ConfluenceSummary';
import { ScenarioEngine } from '../components/analysis/ScenarioEngine';
import { AiExplanationPanel } from '../components/analysis/AiExplanationPanel';
import { ExecutionCommandDesk } from '../components/eas/ExecutionCommandDesk';
import { PositionsPanel } from '../components/trading/PositionsPanel';
import { MarketSelectorModal } from '../components/market/MarketSelectorModal';
import { ChevronDown, TrendingUp, TrendingDown, Activity, Globe } from 'lucide-react';

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

  const [isMarketModalOpen, setIsMarketModalOpen] = useState(false);

  const activeCandles = useMemo(() => candles[`${selectedSymbol}_${selectedTimeframe}`] || [], [candles, selectedSymbol, selectedTimeframe]);
  const currentTick = ticks[selectedSymbol];
  const currentPrice = currentTick ? currentTick.quote : selectedInstrument?.bid || 1.0;
  const priceChange = currentTick ? currentTick.changePct : selectedInstrument?.change24hPercentage || 0;

  return (
    <div className="flex flex-col h-full p-2 lg:p-4 space-y-4 container mx-auto max-w-screen-2xl">
      {/* Header with Market Selector & Ticker */}
      <div className="bg-bg-surface border border-border-color p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsMarketModalOpen(true)}
            className="flex items-center space-x-2 bg-bg-main hover:bg-bg-hover border border-border-color px-3.5 py-2 rounded-xl transition-colors cursor-pointer group"
          >
            <Globe className="w-4 h-4 text-accent-primary group-hover:scale-110 transition-transform" />
            <span className="text-xs sm:text-sm font-bold text-text-primary font-mono">{selectedSymbol}</span>
            <span className="text-[10px] text-text-secondary">({selectedInstrument?.name || 'Deriv Asset'})</span>
            <ChevronDown className="w-3.5 h-3.5 text-text-secondary" />
          </button>

          <div className="hidden sm:flex items-center space-x-4 border-l border-border-color pl-4">
            <div>
              <span className="text-[10px] font-semibold text-text-secondary block uppercase">Price</span>
              <span className="text-xs sm:text-sm font-bold font-mono text-text-primary">
                {currentPrice.toFixed(selectedInstrument && selectedInstrument.pipSize < 0.001 ? 5 : 2)}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-text-secondary block uppercase">24h Change</span>
              <span className={`text-xs font-mono font-bold flex items-center gap-0.5 ${priceChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {priceChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>{priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg border ${
            dataFreshness === 'LIVE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}>
            {dataFreshness.toUpperCase()} STREAM
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-4 flex-1">
        {/* Left: Chart + Analysis */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="bg-bg-surface p-2 lg:p-3 rounded-2xl border border-border-color min-h-[420px] shadow-sm">
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
             <div className="bg-bg-surface p-3 rounded-2xl border border-border-color shadow-sm">
                <ScenarioEngine instrument={selectedInstrument} />
              </div>
              <div className="bg-bg-surface p-3 rounded-2xl border border-border-color shadow-sm">
                <ConfluenceSummary instrument={selectedInstrument} candles={activeCandles} />
              </div>
          </div>
        </div>

        {/* Right: Execution + Intelligence */}
        <div className="lg:col-span-4 space-y-3 lg:space-y-4">
          <div className="bg-bg-surface p-3 rounded-2xl border border-border-color shadow-sm">
            <ExecutionCommandDesk />
          </div>
          <div className="bg-bg-surface p-3 rounded-2xl border border-border-color shadow-sm">
            <MarketIntelligencePanel 
              instrument={selectedInstrument} 
              candles={activeCandles} 
              dataFreshness={dataFreshness} 
            />
          </div>
          <div className="bg-bg-surface p-3 rounded-2xl border border-border-color shadow-sm">
            <PositionsPanel />
          </div>
          <div className="bg-bg-surface p-3 rounded-2xl border border-border-color shadow-sm">
            <AiExplanationPanel instrument={selectedInstrument} candles={activeCandles} />
          </div>
        </div>
      </div>

      {/* Market Selector Modal */}
      <MarketSelectorModal isOpen={isMarketModalOpen} onClose={() => setIsMarketModalOpen(false)} />
    </div>
  );
};

