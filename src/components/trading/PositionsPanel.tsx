import React, { useState, useEffect } from 'react';
import { useApiFetch } from '../../utils/apiFetch.ts';
import { useTradeVoiceStatus } from '../../hooks/useTradeVoiceStatus.ts';
import { OpenPosition } from '../../services/ea/positionEngine.ts';
import { TrendingUp, TrendingDown, XCircle, RefreshCw, Layers, ShieldCheck } from 'lucide-react';

export const PositionsPanel: React.FC = () => {
  const apiFetch = useApiFetch();
  const { announcePositionClosed, processPositionsDelta } = useTradeVoiceStatus();
  const [positions, setPositions] = useState<OpenPosition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);

  const fetchPositions = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await apiFetch('/api/positions');
      const data = await res.json();
      if (data.success && data.data?.positions) {
        setPositions(data.data.positions);
        processPositionsDelta(data.data.positions);
      }
    } catch (err) {
      console.warn('[PositionsPanel] Failed to fetch open positions:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPositions();
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchPositions(true);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleClosePosition = async (pos: OpenPosition) => {
    setClosingId(pos.id);
    try {
      const res = await apiFetch('/api/positions/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positionId: pos.id,
          reason: 'Manual Exit via Trading Workspace'
        })
      });
      const data = await res.json();
      if (data.success) {
        // Explicitly announce position closed
        announcePositionClosed({
          symbol: pos.symbol,
          unrealizedPl: pos.unrealizedPl,
          reason: 'Manual Close'
        });
        await fetchPositions(true);
      }
    } catch (err) {
      console.error('[PositionsPanel] Error closing position:', err);
    } finally {
      setClosingId(null);
    }
  };

  const totalUnrealizedPl = positions.reduce((acc, p) => acc + (p.unrealizedPl || 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-accent-primary" />
          <h3 className="font-bold text-xs sm:text-sm text-text-primary uppercase tracking-wider">
            Open Positions ({positions.length})
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          {positions.length > 0 && (
            <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg border ${
              totalUnrealizedPl >= 0 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
            }`}>
              {totalUnrealizedPl >= 0 ? '+' : ''}${totalUnrealizedPl.toFixed(2)}
            </span>
          )}
          <button
            onClick={() => fetchPositions()}
            className="p-1 text-text-secondary hover:text-text-primary rounded-md hover:bg-bg-hover transition-colors cursor-pointer"
            title="Refresh positions"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {positions.length === 0 ? (
        <div className="text-xs text-text-secondary text-center py-6 border border-dashed border-border-color rounded-xl bg-bg-main/50">
          <p className="font-mono">No active market positions</p>
          <span className="text-[10px] text-text-muted mt-1 block">New filled orders will populate here with live P/L updates</span>
        </div>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {positions.map((pos) => {
            const isClosing = closingId === pos.id;
            const isProfit = (pos.unrealizedPl || 0) >= 0;

            return (
              <div
                key={pos.id}
                className="p-2.5 rounded-xl bg-bg-main border border-border-color hover:border-accent-primary/30 transition-all flex items-center justify-between text-xs gap-2"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold font-mono ${
                      pos.side === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      {pos.side}
                    </span>
                    <span className="font-bold font-mono text-text-primary">{pos.symbol}</span>
                    <span className="text-[10px] text-text-secondary font-mono">({pos.quantity}L)</span>
                  </div>
                  <div className="text-[10px] text-text-secondary font-mono">
                    Entry: {pos.avgEntryPrice} &bull; Mark: {pos.currentPrice}
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <div className="text-right">
                    <div className={`font-mono font-bold text-xs flex items-center justify-end gap-0.5 ${
                      isProfit ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {isProfit ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      <span>{isProfit ? '+' : ''}${pos.unrealizedPl.toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleClosePosition(pos)}
                    disabled={isClosing}
                    className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/15 border border-rose-500/30 transition-colors cursor-pointer disabled:opacity-50"
                    title={`Close ${pos.symbol} position`}
                  >
                    <XCircle className={`w-3.5 h-3.5 ${isClosing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
