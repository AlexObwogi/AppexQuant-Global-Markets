/**
 * AppexQuant Markets Global - Responsive Market Selector Modal & Bar
 * Allows searching, category filtering, watchlist toggling, and selecting Deriv instruments.
 */

import React, { useState, useMemo } from 'react';
import { useMarketData } from '../../state/MarketDataContext.tsx';
import { InstrumentCategory, MarketInstrument } from '../../types/market.ts';
import { Search, Star, ChevronDown, Check, TrendingUp, TrendingDown, X, Globe } from 'lucide-react';

interface MarketSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MarketSelectorModal: React.FC<MarketSelectorModalProps> = ({ isOpen, onClose }) => {
  const {
    instruments,
    selectedSymbol,
    setSelectedSymbol,
    selectedCategory,
    setSelectedCategory,
    watchlist,
    toggleWatchlist,
    searchQuery,
    setSearchQuery,
    ticks
  } = useMarketData();

  const [activeTab, setActiveTab] = useState<'ALL' | 'FAV' | InstrumentCategory>('ALL');

  const filteredInstruments = useMemo(() => {
    return instruments.filter((inst) => {
      const matchesSearch = inst.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            inst.symbol.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (activeTab === 'FAV') {
        return watchlist.includes(inst.symbol);
      }
      if (activeTab !== 'ALL' && inst.category !== activeTab) {
        return false;
      }
      return true;
    });
  }, [instruments, searchQuery, activeTab, watchlist]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-in fade-in duration-150">
      <div className="bg-bg-surface border border-border-color rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border-color flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Globe className="w-5 h-5 text-accent-primary" />
            <h2 className="text-sm sm:text-base font-bold text-text-primary">Select Deriv Instrument</h2>
          </div>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary p-1.5 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Tabs */}
        <div className="p-4 border-b border-border-color space-y-3 bg-bg-main/50">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-text-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search symbol (e.g. EURUSD, Boom 1000, BTCUSD)..."
              className="w-full bg-bg-surface border border-border-color rounded-xl pl-10 pr-4 py-2.5 text-xs text-text-primary focus:outline-none focus:border-accent-primary font-mono"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'ALL', label: 'All Markets' },
              { id: 'FAV', label: 'Watchlist' },
              { id: 'FOREX', label: 'Forex' },
              { id: 'SYNTHETICS', label: 'Synthetics' },
              { id: 'CRYPTO', label: 'Crypto' },
              { id: 'INDICES', label: 'Indices' },
              { id: 'COMMODITIES', label: 'Commodities' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-accent-primary text-bg-main shadow-xs font-bold'
                    : 'bg-bg-surface hover:bg-bg-hover text-text-secondary border border-border-color'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Instrument List */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-border-color/40">
          {filteredInstruments.length === 0 ? (
            <div className="py-12 text-center text-xs text-text-secondary">
              No instruments found matching your search.
            </div>
          ) : (
            filteredInstruments.map((inst) => {
              const tick = ticks[inst.symbol];
              const price = tick ? tick.quote : inst.bid || 1.0;
              const changePct = tick ? tick.changePct : inst.change24hPercentage || 0;
              const isFav = watchlist.includes(inst.symbol);
              const isSelected = inst.symbol === selectedSymbol;

              return (
                <div
                  key={inst.symbol}
                  onClick={() => {
                    setSelectedSymbol(inst.symbol);
                    onClose();
                  }}
                  className={`p-3 flex items-center justify-between rounded-xl transition-all cursor-pointer group ${
                    isSelected ? 'bg-accent-primary/10 border border-accent-primary/30' : 'hover:bg-bg-hover'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWatchlist(inst.symbol);
                      }}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        isFav ? 'text-amber-400 bg-amber-400/10' : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <Star className={`w-4 h-4 ${isFav ? 'fill-amber-400' : ''}`} />
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-text-primary font-mono">{inst.symbol}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-bg-main text-text-secondary uppercase">
                          {inst.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-secondary truncate max-w-[200px] sm:max-w-xs">{inst.name}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs sm:text-sm font-bold font-mono text-text-primary">
                      {price.toFixed(inst.pipSize < 0.001 ? 5 : 2)}
                    </div>
                    <div className={`text-[11px] font-mono flex items-center justify-end gap-0.5 ${changePct >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {changePct >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      <span>{changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border-color bg-bg-main/50 text-center text-[10px] text-text-secondary">
          Live Deriv Streaming Feed • {filteredInstruments.length} Available Instruments
        </div>
      </div>
    </div>
  );
};
