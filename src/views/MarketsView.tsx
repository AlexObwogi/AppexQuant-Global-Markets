/**
 * AppexQuant Markets Global - Phase 2 Live Market Analysis Workspace
 * Integrates Deriv live WebSocket tick streaming, active symbols discovery, and interactive charting.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { MarketIntelligencePanel } from '../components/market/MarketIntelligencePanel';
import { useMarketData } from '../state/MarketDataContext';
import { InteractiveCandleChart } from '../components/chart/InteractiveCandleChart';
import { InstrumentCategory } from '../types/market';
import {
  Search,
  Star,
  BarChart2,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ShieldAlert,
  Info,
  Sliders,
  ExternalLink,
  Layers,
  Zap,
} from 'lucide-react';

export const MarketsView: React.FC = () => {
  const {
    instruments,
    selectedSymbol,
    selectedInstrument,
    selectedCategory,
    selectedTimeframe,
    ticks,
    candles,
    watchlist,
    searchQuery,
    connectionState,
    isSimulated,
    dataFreshness,
    contracts,
    isLoadingSymbols,
    setSelectedSymbol,
    setSelectedCategory,
    setSelectedTimeframe,
    setSearchQuery,
    toggleWatchlist,
    fetchCandles,
    fetchContractsFor,
    reconnect,
  } = useMarketData();

  // Mobile View Tab state
  const [mobileTab, setMobileTab] = useState<'LIST' | 'CHART' | 'DETAILS'>('CHART');
  const [activeListTab, setActiveListTab] = useState<'ALL' | 'WATCHLIST'>('ALL');

  const categories: Array<{ id: InstrumentCategory | 'ALL'; label: string }> = [
    { id: 'ALL', label: 'All Markets' },
    { id: 'FOREX', label: 'Forex' },
    { id: 'SYNTHETICS', label: 'Deriv Synthetics' },
    { id: 'CRYPTO', label: 'Cryptocurrency' },
    { id: 'COMMODITIES', label: 'Commodities' },
    { id: 'INDICES', label: 'Stock Indices' },
  ];

  // Fetch candles & contract info whenever selected symbol or timeframe changes
  useEffect(() => {
    if (selectedSymbol) {
      fetchCandles(selectedSymbol, selectedTimeframe);
      fetchContractsFor(selectedSymbol);
    }
  }, [selectedSymbol, selectedTimeframe, fetchCandles, fetchContractsFor]);

  // Filter instruments by category, list tab, and search query
  const filteredInstruments = useMemo(() => {
    return instruments.filter((i) => {
      // List tab filter
      if (activeListTab === 'WATCHLIST' && !watchlist.includes(i.symbol)) {
        return false;
      }
      // Category filter
      if (selectedCategory !== 'ALL' && i.category !== selectedCategory) {
        return false;
      }
      // Search query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        return (
          i.symbol.toLowerCase().includes(q) ||
          i.name.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [instruments, selectedCategory, activeListTab, watchlist, searchQuery]);

  const activeCandles = useMemo(() => candles[`${selectedSymbol}_${selectedTimeframe}`] || [], [candles, selectedSymbol, selectedTimeframe]);
  const currentTick = ticks[selectedSymbol];
  const activeContracts = contracts[selectedSymbol] || [];

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto flex flex-col flex-1 w-full max-w-full overflow-x-hidden min-w-0">
      {/* Workspace Top Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-3 bg-bg-surface border border-border-color dark:border-[#2B3139] rounded-[4px] w-full min-w-0 shadow-xs">
        {/* Left: Title & Live Connection Status Badge */}
        <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
          <div className="w-8 h-8 rounded-[4px] bg-accent-primary/10 border border-accent-primary/25 flex items-center justify-center text-color-warning dark:text-accent-primary shrink-0">
            <BarChart2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold uppercase tracking-tight text-text-primary dark:text-text-primary">
                Deriv Live Markets
              </h2>
              {/* Freshness Badge */}
              <div
                className={`px-1.5 py-0.5 rounded-[2px] text-[9px] font-mono font-bold uppercase tracking-wider flex items-center space-x-1 border ${
                  dataFreshness === 'LIVE' || isSimulated
                    ? 'bg-color-success/10 text-color-success dark:text-color-success border-color-success/20 dark:border-color-success/25'
                    : dataFreshness === 'RECENT'
                    ? 'bg-[#F0B90B]/10 text-accent-hover dark:text-color-warning border-[#F0B90B]/20 dark:border-[#F0B90B]/25'
                    : 'bg-color-danger/10 text-color-danger dark:text-color-danger border-color-danger/20 dark:border-color-danger/25'
                }`}
              >
                <span
                  className={`w-1 h-1 rounded-full ${
                    dataFreshness === 'LIVE' || isSimulated ? 'bg-color-success animate-pulse' : 'bg-color-danger'
                  }`}
                />
                <span>{isSimulated ? 'LIVE' : dataFreshness} DATA</span>
              </div>

              {isSimulated && (
                <div className="px-1.5 py-0.5 rounded-[2px] text-[9px] font-mono font-bold uppercase tracking-wider flex items-center space-x-1 border bg-amber-500/10 text-amber-500 border-amber-500/20">
                  <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
                  <span>PREVIEW SIMULATION ACTIVE</span>
                </div>
              )}
            </div>
            <p className="text-[11px] text-text-secondary mt-0.5 truncate">
              {isSimulated 
                ? "Preview simulation mode active. Generating live high-fidelity simulated tick data feed." 
                : "Live market-data workspace connected to Deriv WebSocket infrastructure."}
            </p>
          </div>
        </div>

        {/* Right: Search Bar & Connection Actions */}
        <div className="flex items-center space-x-2 w-full lg:w-auto">
          <div className="relative w-full lg:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-text-secondary dark:text-text-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search symbol (e.g. EURUSD, R_100)..."
              className="w-full h-8 bg-bg-main border border-border-color dark:border-[#2B3139] focus:border-accent-primary text-xs text-text-primary pl-8 pr-2.5 py-1.5 rounded-[4px] outline-none transition-colors"
            />
          </div>

          <button
            onClick={reconnect}
            className="p-2 bg-bg-main border border-border-color hover:bg-bg-secondary dark:border-[#2B3139] dark:hover:bg-[#2B3139] text-text-secondary hover:text-text-primary dark:hover:text-text-primary rounded-[4px] transition-colors cursor-pointer shrink-0"
            title="Reconnect Deriv Stream"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${connectionState === 'CONNECTING' ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Category Tabs Filter Bar */}
      <div className="w-full overflow-x-auto scrollbar-none pb-1">
        <div className="flex items-center space-x-1.5 min-w-max">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-[4px] text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-[#F0B90B] text-text-primary dark:bg-accent-primary dark:text-bg-secondary'
                  : 'bg-bg-surface text-text-secondary border border-border-color dark:border-[#2B3139] hover:text-text-primary dark:hover:text-text-primary'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Screen Navigation Tabs (Only visible on small screens) */}
      <div className="lg:hidden flex border border-border-color dark:border-[#2B3139] bg-bg-main rounded-[4px] p-0.5">
        <button
          onClick={() => setMobileTab('LIST')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-[3px] transition-colors cursor-pointer ${
            mobileTab === 'LIST' ? 'bg-[#F0B90B] text-text-primary dark:bg-accent-primary dark:text-bg-secondary' : 'text-text-secondary dark:text-text-secondary'
          }`}
        >
          Markets ({filteredInstruments.length})
        </button>
        <button
          onClick={() => setMobileTab('CHART')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-[3px] transition-colors cursor-pointer ${
            mobileTab === 'CHART' ? 'bg-[#F0B90B] text-text-primary dark:bg-accent-primary dark:text-bg-secondary' : 'text-text-secondary dark:text-text-secondary'
          }`}
        >
          Chart ({selectedInstrument?.name || selectedSymbol})
        </button>
        <button
          onClick={() => setMobileTab('DETAILS')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-[3px] transition-colors cursor-pointer ${
            mobileTab === 'DETAILS' ? 'bg-[#F0B90B] text-text-primary dark:bg-accent-primary dark:text-bg-secondary' : 'text-text-secondary dark:text-text-secondary'
          }`}
        >
          Details
        </button>
      </div>

      {/* Main 3-Column Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-start">
        {/* Left Column: Watchlist & Instrument Selector (4 Cols on LG) */}
        <div
          className={`lg:col-span-3 space-y-3 bg-bg-surface border border-border-color dark:border-[#2B3139] p-3 rounded-[4px] h-[650px] flex flex-col ${
            mobileTab !== 'LIST' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Sub-tabs: All vs Watchlist */}
          <div className="flex items-center justify-between pb-2 border-b border-border-color dark:border-[#2B3139] shrink-0">
            <div className="flex space-x-1.5">
              <button
                onClick={() => setActiveListTab('ALL')}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-[2px] transition-colors cursor-pointer ${
                  activeListTab === 'ALL'
                    ? 'bg-bg-secondary dark:bg-[#2B3139] text-color-warning dark:text-accent-primary'
                    : 'text-text-secondary hover:text-text-primary dark:hover:text-text-primary'
                }`}
              >
                All ({instruments.length})
              </button>
              <button
                onClick={() => setActiveListTab('WATCHLIST')}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-[2px] transition-colors cursor-pointer flex items-center space-x-1 ${
                  activeListTab === 'WATCHLIST'
                    ? 'bg-bg-secondary dark:bg-[#2B3139] text-color-warning dark:text-accent-primary'
                    : 'text-text-secondary hover:text-text-primary dark:hover:text-text-primary'
                }`}
              >
                <Star className="w-3 h-3 text-color-warning fill-[#F0B90B]" />
                <span>Favorites ({watchlist.length})</span>
              </button>
            </div>
          </div>

          {/* Instrument List Scrollable Container */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {isLoadingSymbols ? (
              <div className="py-12 text-center text-xs text-text-secondary dark:text-text-secondary">
                Loading active Deriv symbol universe...
              </div>
            ) : filteredInstruments.length === 0 ? (
              <div className="py-12 text-center text-xs text-text-secondary dark:text-text-secondary">
                No matching instruments found.
              </div>
            ) : (
              filteredInstruments.map((inst) => {
                const isSelected = inst.symbol === selectedSymbol;
                const isFav = watchlist.includes(inst.symbol);
                const tick = ticks[inst.symbol];

                const bid = tick ? tick.bid : inst.bid;
                const ask = tick ? tick.ask : inst.ask;
                const pct = tick ? tick.changePct : inst.change24hPercentage;

                return (
                  <div
                    key={inst.symbol}
                    onClick={() => {
                      setSelectedSymbol(inst.symbol);
                      setMobileTab('CHART');
                    }}
                    className={`p-2 rounded-[2px] border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-accent-primary/10 border-accent-primary dark:bg-accent-primary/10 dark:border-accent-primary'
                        : 'bg-bg-main dark:bg-[#0B0E11]/40 border-border-color dark:border-[#2B3139] hover:border-accent-primary/30'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWatchlist(inst.symbol);
                        }}
                        className="p-0.5 text-text-muted dark:text-[#474F59] hover:text-color-warning cursor-pointer"
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            isFav ? 'text-color-warning fill-[#F0B90B]' : ''
                          }`}
                        />
                      </button>
                      <div>
                        <div className="font-bold text-xs text-text-primary flex items-center space-x-1.5">
                          <span>{inst.name}</span>
                        </div>
                        <div className="text-[10px] text-text-secondary font-mono">
                          {inst.symbol}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-text-primary dark:text-text-primary">
                        {bid.toFixed(bid > 100 ? 2 : 5)}
                      </div>
                      <div
                        className={`text-[10px] font-mono font-semibold flex items-center justify-end space-x-0.5 ${
                          pct >= 0 ? 'text-emerald-600 dark:text-[#22C55E]' : 'text-rose-600 dark:text-[#EF4444]'
                        }`}
                      >
                        {pct >= 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        <span>{pct >= 0 ? '+' : ''}{pct.toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Center Column: Selected Symbol Header & Interactive Chart (6 Cols on LG) */}
        <div
          className={`lg:col-span-6 space-y-3 ${
            mobileTab !== 'CHART' ? 'hidden lg:block' : 'block'
          }`}
        >
          {/* Symbol Quick Banner */}
          {selectedInstrument && (
            <div className="p-3 bg-bg-surface border border-border-color dark:border-[#2B3139] rounded-[4px] flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-bold text-text-primary dark:text-text-primary">
                    {selectedInstrument.name}
                  </h3>
                  <span className="text-xs font-mono px-1.5 py-0.5 bg-bg-secondary text-color-warning dark:bg-[#2B3139] dark:text-accent-primary rounded-[2px] font-bold">
                    {selectedInstrument.symbol}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-text-secondary bg-bg-secondary dark:bg-[#2B3139] px-1.5 py-0.5 rounded-[2px]">
                    {selectedInstrument.category}
                  </span>
                </div>
                <div className="flex items-center space-x-4 mt-1.5 text-xs text-text-secondary font-mono">
                  <div>
                    Bid: <span className="text-text-primary font-bold">{selectedInstrument.bid.toFixed(selectedInstrument.bid > 100 ? 2 : 5)}</span>
                  </div>
                  <div>
                    Ask: <span className="text-text-primary font-bold">{selectedInstrument.ask.toFixed(selectedInstrument.ask > 100 ? 2 : 5)}</span>
                  </div>
                  <div>
                    Pip Spread: <span className="text-color-warning dark:text-accent-primary font-bold">{selectedInstrument.spread}</span>
                  </div>
                </div>
              </div>

              {/* Price Callout */}
              <div className="text-right">
                <div className="text-xl font-mono font-bold text-text-primary dark:text-text-primary">
                  {(currentTick ? currentTick.quote : selectedInstrument.bid).toFixed(
                    selectedInstrument.bid > 100 ? 2 : 5
                  )}
                </div>
                <div
                  className={`text-xs font-mono font-bold ${
                    (currentTick ? currentTick.changePct : selectedInstrument.change24hPercentage) >= 0
                      ? 'text-color-success dark:text-color-success'
                      : 'text-color-danger dark:text-color-danger'
                  }`}
                >
                  {(currentTick ? currentTick.changePct : selectedInstrument.change24hPercentage) >= 0 ? '+' : ''}
                  {(currentTick ? currentTick.changePct : selectedInstrument.change24hPercentage).toFixed(2)}%
                </div>
              </div>
            </div>
          )}

          {/* Canvas Interactive Chart */}
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

        {/* Right Column: Instrument Details & Safety Action Box (3 Cols on LG) */}
        <div
          className={`lg:col-span-3 space-y-3 ${
            mobileTab !== 'DETAILS' ? 'hidden lg:block' : 'block'
          }`}
        >
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
