/**
 * AppexQuant Markets Global - Phase 2 Live Market Analysis Workspace
 * Integrates Deriv live WebSocket tick streaming, active symbols discovery, and interactive charting.
 * Enhanced with expandable market detail views, sparkline visuals, bid/ask spread stats, and place trade execution.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { MarketIntelligencePanel } from '../components/market/MarketIntelligencePanel.tsx';
import { useMarketData } from '../state/MarketDataContext.tsx';
import { InteractiveCandleChart } from '../components/chart/InteractiveCandleChart.tsx';
import { DerivTradeTicket } from '../components/trading/DerivTradeTicket.tsx';
import { MarketDetailRow } from '../components/market/MarketDetailRow.tsx';
import { InstrumentCategory } from '../types/market.ts';
import {
  Search,
  Star,
  BarChart2,
  RefreshCw,
  SlidersHorizontal,
  X,
  Filter,
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
  const [sortOption, setSortOption] = useState<'DEFAULT' | 'CHANGE_DESC' | 'CHANGE_ASC' | 'NAME_ASC' | 'SPREAD_ASC'>('DEFAULT');

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

  // Compute category instrument count lookup
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: instruments.length };
    instruments.forEach((inst) => {
      counts[inst.category] = (counts[inst.category] || 0) + 1;
    });
    return counts;
  }, [instruments]);

  // Filter instruments by category, list tab, and search query, with sort applied
  const filteredInstruments = useMemo(() => {
    let result = instruments.filter((i) => {
      // List tab filter
      if (activeListTab === 'WATCHLIST' && !watchlist.includes(i.symbol)) {
        return false;
      }
      // Category filter
      if (selectedCategory !== 'ALL' && i.category !== selectedCategory) {
        return false;
      }
      // Search query filter
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

    // Apply sorting
    if (sortOption !== 'DEFAULT') {
      result = [...result].sort((a, b) => {
        const tickA = ticks[a.symbol];
        const tickB = ticks[b.symbol];

        const pctA = tickA ? tickA.changePct : a.change24hPercentage;
        const pctB = tickB ? tickB.changePct : b.change24hPercentage;

        const spreadA = tickA && tickA.ask && tickA.bid ? tickA.ask - tickA.bid : a.spread || 0.0001;
        const spreadB = tickB && tickB.ask && tickB.bid ? tickB.ask - tickB.bid : b.spread || 0.0001;

        if (sortOption === 'CHANGE_DESC') return pctB - pctA;
        if (sortOption === 'CHANGE_ASC') return pctA - pctB;
        if (sortOption === 'SPREAD_ASC') return spreadA - spreadB;
        if (sortOption === 'NAME_ASC') return a.name.localeCompare(b.name);
        return 0;
      });
    }

    return result;
  }, [instruments, selectedCategory, activeListTab, watchlist, searchQuery, sortOption, ticks]);

  const activeCandles = useMemo(() => candles[`${selectedSymbol}_${selectedTimeframe}`] || [], [candles, selectedSymbol, selectedTimeframe]);
  const currentTick = ticks[selectedSymbol];

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
                  dataFreshness === 'LIVE'
                    ? 'bg-color-success/10 text-color-success dark:text-color-success border-color-success/20 dark:border-color-success/25'
                    : dataFreshness === 'RECENT'
                    ? 'bg-[#F0B90B]/10 text-accent-hover dark:text-color-warning border-[#F0B90B]/20 dark:border-[#F0B90B]/25'
                    : dataFreshness === 'CLOSED'
                    ? 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                    : 'bg-accent-primary/10 text-accent-primary border-accent-primary/25'
                }`}
              >
                <span
                  className={`w-1 h-1 rounded-full ${
                    dataFreshness === 'LIVE' ? 'bg-color-success animate-pulse' : dataFreshness === 'CLOSED' ? 'bg-slate-400' : 'bg-accent-primary animate-pulse'
                  }`}
                />
                <span>
                  {dataFreshness === 'CLOSED'
                    ? 'MARKET CLOSED'
                    : dataFreshness === 'UNAVAILABLE' || dataFreshness === 'DISCONNECTED'
                    ? 'CONNECTING...'
                    : `${dataFreshness} DATA`}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-text-secondary mt-0.5 truncate">
              Multi-asset real-time trading workspace with live pricing.
            </p>
          </div>
        </div>

        {/* Right: Search Bar, Sort & Connection Actions */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Search Input with Clear Button */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-text-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search symbol (e.g. EURUSD, R_100)..."
              className="w-full h-8 bg-bg-main border border-border-color dark:border-[#2B3139] focus:border-accent-primary text-xs text-text-primary pl-8 pr-7 py-1.5 rounded-[4px] outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-text-secondary hover:text-text-primary"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Selector Dropdown */}
          <div className="flex items-center space-x-1.5 bg-bg-main border border-border-color dark:border-[#2B3139] px-2 h-8 rounded-[4px]">
            <SlidersHorizontal className="w-3.5 h-3.5 text-text-secondary shrink-0" />
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as any)}
              className="bg-transparent text-xs font-mono font-bold text-text-primary outline-none cursor-pointer"
            >
              <option value="DEFAULT">Sort: Default</option>
              <option value="CHANGE_DESC">24h Gainers</option>
              <option value="CHANGE_ASC">24h Losers</option>
              <option value="SPREAD_ASC">Tightest Spread</option>
              <option value="NAME_ASC">Symbol (A-Z)</option>
            </select>
          </div>

          <button
            onClick={reconnect}
            className="p-2 bg-bg-main border border-border-color hover:bg-bg-secondary dark:border-[#2B3139] dark:hover:bg-[#2B3139] text-text-secondary hover:text-text-primary dark:hover:text-text-primary rounded-[4px] transition-colors cursor-pointer shrink-0"
            title="Reconnect Deriv Stream"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${connectionState === 'CONNECTING' || connectionState === 'RECONNECTING' ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Category Tabs Filter Bar with Count Badges */}
      <div className="w-full overflow-x-auto scrollbar-none pb-1">
        <div className="flex items-center space-x-1.5 min-w-max">
          <Filter className="w-3.5 h-3.5 text-text-secondary shrink-0 ml-1" />
          {categories.map((cat) => {
            const count = categoryCounts[cat.id] || 0;
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-[4px] text-xs font-bold whitespace-nowrap transition-colors cursor-pointer flex items-center space-x-1.5 ${
                  isSelected
                    ? 'bg-[#F0B90B] text-text-primary dark:bg-accent-primary dark:text-bg-secondary'
                    : 'bg-bg-surface text-text-secondary border border-border-color dark:border-[#2B3139] hover:text-text-primary'
                }`}
              >
                <span>{cat.label}</span>
                <span className={`px-1.5 py-0.2 text-[9px] font-mono rounded-full ${
                  isSelected ? 'bg-black/20 text-text-primary dark:text-bg-secondary font-extrabold' : 'bg-bg-secondary text-text-secondary'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
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
        {/* Left Column: Watchlist & Expandable Instrument List (4 Cols on LG) */}
        <div
          className={`lg:col-span-4 space-y-3 bg-bg-surface border border-border-color dark:border-[#2B3139] p-3 rounded-[4px] h-[680px] flex flex-col ${
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
            <span className="text-[10px] text-text-secondary font-mono font-bold">
              {filteredInstruments.length} Listed
            </span>
          </div>

          {/* Instrument List Scrollable Container with Expandable MarketDetailRow items */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {isLoadingSymbols ? (
              <div className="py-12 text-center text-xs text-text-secondary">
                Loading active Deriv symbol universe...
              </div>
            ) : filteredInstruments.length === 0 ? (
              <div className="py-12 text-center text-xs text-text-secondary">
                No matching instruments found for query.
              </div>
            ) : (
              filteredInstruments.map((inst) => {
                const isSelected = inst.symbol === selectedSymbol;
                const isFav = watchlist.includes(inst.symbol);

                return (
                  <MarketDetailRow
                    key={inst.symbol}
                    instrument={inst}
                    isSelected={isSelected}
                    isFav={isFav}
                    onSelect={() => {
                      setSelectedSymbol(inst.symbol);
                      setMobileTab('CHART');
                    }}
                    onToggleWatchlist={() => toggleWatchlist(inst.symbol)}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* Center Column: Selected Symbol Header & Interactive Chart (5 Cols on LG) */}
        <div
          className={`lg:col-span-5 space-y-3 ${
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
                    Bid: <span className="text-text-primary font-bold">
                      {selectedInstrument.bid > 0
                        ? selectedInstrument.bid.toFixed(selectedInstrument.bid > 100 ? 2 : 5)
                        : activeCandles.length > 0
                        ? activeCandles[activeCandles.length - 1].close.toFixed(activeCandles[activeCandles.length - 1].close > 100 ? 2 : 5)
                        : '...'}
                    </span>
                  </div>
                  <div>
                    Ask: <span className="text-text-primary font-bold">
                      {selectedInstrument.ask > 0
                        ? selectedInstrument.ask.toFixed(selectedInstrument.ask > 100 ? 2 : 5)
                        : activeCandles.length > 0
                        ? (activeCandles[activeCandles.length - 1].close + (selectedInstrument.pipSize || 0.0001) * 2).toFixed(activeCandles[activeCandles.length - 1].close > 100 ? 2 : 5)
                        : '...'}
                    </span>
                  </div>
                  <div>
                    Pip Spread: <span className="text-color-warning dark:text-accent-primary font-bold">
                      {selectedInstrument.spread > 0 ? selectedInstrument.spread : Number(((selectedInstrument.pipSize || 0.001) * 2).toFixed(5))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Price Callout */}
              <div className="text-right">
                <div className="text-xl font-mono font-bold text-text-primary dark:text-text-primary">
                  {(() => {
                    const price = currentTick?.quote || selectedInstrument.bid || (activeCandles.length > 0 ? activeCandles[activeCandles.length - 1].close : 0);
                    return price > 0 ? price.toFixed(price > 100 ? 2 : 5) : 'Connecting...';
                  })()}
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

          {/* Direct Options Trade Desk underneath Chart */}
          <div className="pt-1">
            <DerivTradeTicket />
          </div>
        </div>

        {/* Right Column: Instrument Details & Intelligence Panel (3 Cols on LG) */}
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
