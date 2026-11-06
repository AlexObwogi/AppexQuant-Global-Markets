/**
 * AppexQuant Markets Global - MarketDetailRow Component
 * Renders an interactive market row with expandable detail view:
 * - Real-time sparkline visualization
 * - Bid/Ask spread and market status metrics
 * - Inline 'Place Trade' WebSocket order execution desk
 */

import React, { useState, useMemo } from 'react';
import { MarketInstrument } from '../../types/market.ts';
import { useMarketData } from '../../state/MarketDataContext.tsx';
import { MarketSparkline } from './MarketSparkline.tsx';
import {
  Star,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Zap,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';

interface MarketDetailRowProps {
  instrument: MarketInstrument;
  isSelected: boolean;
  isFav: boolean;
  onSelect: () => void;
  onToggleWatchlist: () => void;
}

export const MarketDetailRow: React.FC<MarketDetailRowProps> = ({
  instrument,
  isSelected,
  isFav,
  onSelect,
  onToggleWatchlist,
}) => {
  const { ticks, candles, placeTrade, getSymbolFreshness } = useMarketData();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [stakeAmount, setStakeAmount] = useState<number>(10);
  const [duration, setDuration] = useState<number>(5);
  const [durationUnit, setDurationUnit] = useState<'t' | 's' | 'm' | 'h' | 'd'>('t');
  
  const [isExecuting, setIsExecuting] = useState(false);
  const [tradeSuccess, setTradeSuccess] = useState<string | null>(null);
  const [tradeError, setTradeError] = useState<string | null>(null);

  const tick = ticks[instrument.symbol];
  const symbolCandles = candles[`${instrument.symbol}_1h`] || candles[`${instrument.symbol}_1m`] || [];

  const bid = tick ? tick.bid : instrument.bid;
  const ask = tick ? tick.ask : instrument.ask;
  const pct = tick ? tick.changePct : instrument.change24hPercentage;
  const pipSpread = tick && tick.ask && tick.bid
    ? Number((tick.ask - tick.bid).toFixed(instrument.pipSize > 0 ? Math.abs(Math.round(Math.log10(instrument.pipSize))) : 5))
    : instrument.spread || 0.0001;

  const freshness = getSymbolFreshness(instrument.symbol);

  // Sparkline data points from candles or simulated fallback
  const sparklineData = useMemo(() => {
    if (symbolCandles.length >= 5) {
      return symbolCandles.slice(-20).map((c) => c.close);
    }
    // Fallback sparkline around bid/ask
    const base = bid > 0 ? bid : 100;
    const factor = instrument.pipSize || 0.01;
    return [
      base - factor * 3,
      base - factor * 1,
      base + factor * 2,
      base - factor * 0.5,
      base + factor * (pct >= 0 ? 3 : -3),
    ];
  }, [symbolCandles, bid, instrument.pipSize, pct]);

  const handleExecuteTrade = async (contractType: 'CALL' | 'PUT', e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExecuting(true);
    setTradeSuccess(null);
    setTradeError(null);

    try {
      const res = await placeTrade({
        symbol: instrument.symbol,
        contractType,
        amount: stakeAmount,
        duration,
        durationUnit,
      });

      if (res && res.contract_id) {
        setTradeSuccess(`Trade Placed! Contract #${res.contract_id}`);
        setTimeout(() => setTradeSuccess(null), 5000);
      } else {
        setTradeSuccess(`Trade Executed successfully for ${instrument.symbol}`);
        setTimeout(() => setTradeSuccess(null), 5000);
      }
    } catch (err: any) {
      setTradeError(err.message || 'Order execution failed.');
      setTimeout(() => setTradeError(null), 6000);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div
      className={`rounded-[4px] border transition-all ${
        isSelected
          ? 'bg-accent-primary/10 border-accent-primary shadow-xs'
          : 'bg-bg-main dark:bg-[#0B0E11]/40 border-border-color dark:border-[#2B3139] hover:border-accent-primary/40'
      }`}
    >
      {/* Primary Item Row Header */}
      <div
        onClick={onSelect}
        className="p-2.5 flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center space-x-2.5 min-w-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleWatchlist();
            }}
            className="p-0.5 text-text-muted hover:text-color-warning cursor-pointer shrink-0"
            title={isFav ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star
              className={`w-3.5 h-3.5 ${
                isFav ? 'text-color-warning fill-[#F0B90B]' : ''
              }`}
            />
          </button>
          <div className="min-w-0">
            <div className="font-bold text-xs text-text-primary flex items-center space-x-1.5 truncate">
              <span className="truncate">{instrument.name}</span>
            </div>
            <div className="text-[10px] text-text-secondary font-mono">
              {instrument.symbol}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <div className="text-right">
            <div className="text-xs font-mono font-bold text-text-primary">
              {bid > 0 ? bid.toFixed(bid > 100 ? 2 : 5) : '...'}
            </div>
            <div
              className={`text-[10px] font-mono font-semibold flex items-center justify-end space-x-0.5 ${
                pct >= 0 ? 'text-emerald-500' : 'text-rose-500'
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

          {/* Quick Action Buttons */}
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors flex items-center space-x-1 cursor-pointer ${
                isExpanded
                  ? 'bg-accent-primary text-bg-secondary'
                  : 'bg-bg-secondary hover:bg-bg-surface text-text-primary border border-border-color'
              }`}
              title="Expand market detail & place trade"
            >
              <Zap className="w-3 h-3 text-color-warning" />
              <span className="hidden sm:inline">Trade</span>
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>

      {/* Expandable Market Detail Drawer */}
      {isExpanded && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="p-3 bg-bg-surface/80 border-t border-border-color dark:border-[#2B3139] space-y-3 animate-in slide-in-from-top-1 duration-150"
        >
          {/* Top Section: Sparkline & Spread Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            {/* Sparkline Visual */}
            <div className="p-2.5 bg-bg-main border border-border-color rounded-lg flex flex-col items-center justify-center">
              <div className="text-[10px] font-mono font-bold text-text-secondary uppercase mb-1 flex items-center justify-between w-full">
                <span>Recent Price Trend (1H)</span>
                <span className={pct >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                  {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                </span>
              </div>
              <MarketSparkline
                dataPoints={sparklineData}
                width={180}
                height={36}
                isPositive={pct >= 0}
              />
            </div>

            {/* Bid/Ask Spread Detail Box */}
            <div className="p-2.5 bg-bg-main border border-border-color rounded-lg space-y-1.5 text-xs font-mono">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-text-secondary uppercase">Market Status</span>
                <span className={`font-bold px-1.5 py-0.5 rounded text-[9px] ${
                  freshness === 'LIVE' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-500/15 text-slate-400'
                }`}>
                  {freshness}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Bid / Ask:</span>
                <span className="font-bold text-text-primary">
                  {bid > 0 ? bid.toFixed(bid > 100 ? 2 : 5) : '...'} / {ask > 0 ? ask.toFixed(ask > 100 ? 2 : 5) : '...'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Pip Spread:</span>
                <span className="font-bold text-color-warning">
                  {pipSpread > 0 ? pipSpread : '0.0001'}
                </span>
              </div>
            </div>
          </div>

          {/* Place Trade Input & WebSocket Order Execution Desk */}
          <div className="p-3 bg-bg-main border border-border-color rounded-lg space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-primary uppercase font-mono flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-color-warning" />
                Place Trade ({instrument.symbol})
              </span>
              <span className="text-[10px] text-text-secondary font-mono">Direct WebSocket Execution</span>
            </div>

            {/* Stake Amount Input & Quick Presets */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono text-text-secondary">
                <span>Stake Amount ($ USD)</span>
                <div className="flex space-x-1">
                  {[5, 10, 25, 50, 100].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setStakeAmount(amt)}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all ${
                        stakeAmount === amt
                          ? 'bg-accent-primary text-bg-secondary'
                          : 'bg-bg-secondary hover:bg-bg-surface text-text-secondary'
                      }`}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full h-8 bg-bg-surface border border-border-color rounded px-2 text-xs font-mono font-bold text-text-primary outline-none focus:border-accent-primary"
                    placeholder="Stake USD"
                  />
                </div>

                <div className="flex space-x-1">
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={duration}
                    onChange={(e) => setDuration(Math.max(1, Number(e.target.value) || 1))}
                    className="w-1/2 h-8 bg-bg-surface border border-border-color rounded px-2 text-xs font-mono font-bold text-text-primary outline-none focus:border-accent-primary"
                  />
                  <select
                    value={durationUnit}
                    onChange={(e) => setDurationUnit(e.target.value as any)}
                    className="w-1/2 h-8 bg-bg-surface border border-border-color rounded px-1 text-[11px] font-mono font-bold text-text-primary outline-none"
                  >
                    <option value="t">Ticks</option>
                    <option value="m">Mins</option>
                    <option value="h">Hours</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Execution Status Notifications */}
            {tradeSuccess && (
              <div className="p-2 bg-emerald-500/15 border border-emerald-500/30 rounded text-emerald-400 text-xs font-mono flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{tradeSuccess}</span>
              </div>
            )}

            {tradeError && (
              <div className="p-2 bg-rose-500/15 border border-rose-500/30 rounded text-rose-400 text-xs font-mono flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{tradeError}</span>
              </div>
            )}

            {/* Execution Buttons: Rise vs Fall */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                disabled={isExecuting}
                onClick={(e) => handleExecuteTrade('CALL', e)}
                className="py-2 px-3 rounded bg-[#00a86b] hover:bg-[#00925c] disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-sm transition-all cursor-pointer"
              >
                {isExecuting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ArrowUpRight className="w-4 h-4" />
                )}
                <span>BUY RISE (HIGHER)</span>
              </button>

              <button
                type="button"
                disabled={isExecuting}
                onClick={(e) => handleExecuteTrade('PUT', e)}
                className="py-2 px-3 rounded bg-[#ff444f] hover:bg-[#e03b44] disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-sm transition-all cursor-pointer"
              >
                {isExecuting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ArrowDownLeft className="w-4 h-4" />
                )}
                <span>BUY FALL (LOWER)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
