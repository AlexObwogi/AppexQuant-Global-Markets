/**
 * AppexQuant Markets Global - Real Deriv Open Positions & Closed Contracts Panel
 * 
 * Subscribes to live proposal_open_contract streams via derivTradingClient:
 * - Real-time contract PnL tracking and spot updates
 * - In-flight Sell button when contract is valid to sell (is_valid_to_sell === 1)
 * - Trade history tab reading past contracts from Deriv profit_table
 * - Zero simulated data; pure Deriv authenticated stream
 */

import React, { useState, useEffect } from 'react';
import { derivTradingClient, DerivOpenPosition, DerivProfitTableItem } from '../../services/deriv/tradingClient.ts';
import { useGlobalState } from '../../state/GlobalStateContext.tsx';
import { TrendingUp, TrendingDown, Clock, ShieldCheck, DollarSign, History, AlertCircle, Loader2 } from 'lucide-react';

export const DerivOpenPositions: React.FC = () => {
  const { state } = useGlobalState();
  const [activeTab, setActiveTab] = useState<'OPEN' | 'HISTORY'>('OPEN');
  const [positions, setPositions] = useState<DerivOpenPosition[]>([]);
  const [history, setHistory] = useState<DerivProfitTableItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [sellingContractId, setSellingContractId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Subscribe to live open positions stream
  useEffect(() => {
    const unsub = derivTradingClient.subscribePositions((posList) => {
      setPositions(posList.filter((p) => p.status === 'open'));
    });
    return () => unsub();
  }, []);

  // Fetch profit table when history tab is activated
  useEffect(() => {
    if (activeTab === 'HISTORY') {
      setIsLoadingHistory(true);
      derivTradingClient.getProfitTable(25)
        .then((items) => setHistory(items))
        .catch(() => {})
        .finally(() => setIsLoadingHistory(false));
    }
  }, [activeTab]);

  const handleSellContract = async (contractId: number) => {
    setSellingContractId(contractId);
    setFeedback(null);
    try {
      const res = await derivTradingClient.sell(contractId, 0);
      setFeedback(`Contract #${contractId} closed at $${res.sold_for || res.sold_for_price || 0}`);
    } catch (err: any) {
      setFeedback(`Failed to sell contract #${contractId}: ${err.message}`);
    } finally {
      setSellingContractId(null);
    }
  };

  const isReal = derivTradingClient.isRealAccount();
  const accountId = derivTradingClient.getCurrentAccountId() || state.user?.derivAccountId || 'Demo';

  return (
    <div className="bg-[#1c1f26] border border-[#2a2e39] rounded-xl p-3 sm:p-4 text-xs font-sans text-[#ffffff] space-y-3 select-none">
      {/* Header with Tabs */}
      <div className="flex items-center justify-between pb-2 border-b border-[#2a2e39]">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setActiveTab('OPEN')}
            className={`font-bold uppercase tracking-wider text-xs pb-1 cursor-pointer transition-colors ${
              activeTab === 'OPEN'
                ? 'text-white border-b-2 border-[#ff444f]'
                : 'text-[#9699a0] hover:text-white'
            }`}
          >
            Open Positions ({positions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('HISTORY')}
            className={`font-bold uppercase tracking-wider text-xs pb-1 cursor-pointer transition-colors ${
              activeTab === 'HISTORY'
                ? 'text-white border-b-2 border-[#ff444f]'
                : 'text-[#9699a0] hover:text-white'
            }`}
          >
            History
          </button>
        </div>
        <span className="font-mono text-[10px] text-[#9699a0]">
          {isReal ? 'Real Options' : 'Virtual Options'}
        </span>
      </div>

      {feedback && (
        <div className="p-2 rounded bg-[#15171e] border border-[#2a2e39] font-mono text-[11px] text-sky-400">
          {feedback}
        </div>
      )}

      {/* Tab: Open Positions */}
      {activeTab === 'OPEN' && (
        <div className="space-y-2">
          {positions.length === 0 ? (
            <div className="py-6 text-center text-[#9699a0] space-y-1">
              <Clock className="w-5 h-5 mx-auto text-[#9699a0]/50" />
              <p className="font-mono text-xs">No active options contracts open</p>
              <p className="text-[10px]">Use the Options Ticket to initiate a trade on {accountId}</p>
            </div>
          ) : (
            positions.map((pos) => {
              const isProfit = pos.profit >= 0;
              return (
                <div
                  key={pos.contract_id}
                  className="bg-[#15171e] border border-[#2a2e39] rounded-lg p-2.5 space-y-2"
                >
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-bold text-white">{pos.symbol}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                        pos.contract_type.includes('CALL') ? 'bg-[#00a86b]/20 text-[#00a86b]' : 'bg-[#ff444f]/20 text-[#ff444f]'
                      }`}>
                        {pos.contract_type.includes('CALL') ? 'RISE' : 'FALL'}
                      </span>
                      <span className="text-[#9699a0]">#{pos.contract_id}</span>
                    </div>

                    <div className="text-right">
                      <span className={`font-bold ${isProfit ? 'text-[#00a86b]' : 'text-[#ff444f]'}`}>
                        {isProfit ? '+' : ''}${pos.profit.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 font-mono text-[10px] text-[#9699a0] pt-1 border-t border-[#2a2e39]/60">
                    <div>
                      <span>Entry: </span>
                      <strong className="text-white">{pos.entry_spot || '--'}</strong>
                    </div>
                    <div>
                      <span>Current: </span>
                      <strong className="text-white">{pos.current_spot || '--'}</strong>
                    </div>
                    <div className="text-right">
                      <span>Buy Price: </span>
                      <strong className="text-white">${pos.buy_price.toFixed(2)}</strong>
                    </div>
                  </div>

                  {pos.is_valid_to_sell === 1 && (
                    <div className="pt-1">
                      <button
                        type="button"
                        disabled={sellingContractId === pos.contract_id}
                        onClick={() => handleSellContract(pos.contract_id)}
                        className="w-full py-1.5 px-3 rounded bg-[#ff444f]/20 hover:bg-[#ff444f]/30 border border-[#ff444f]/40 text-[#ff444f] font-mono font-bold text-xs cursor-pointer transition-colors flex items-center justify-center space-x-1"
                      >
                        {sellingContractId === pos.contract_id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <span>Early Close (Sell at Market)</span>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab: Contract History */}
      {activeTab === 'HISTORY' && (
        <div className="space-y-2">
          {isLoadingHistory ? (
            <div className="py-6 text-center text-[#9699a0] flex flex-col items-center space-y-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#ff444f]" />
              <span className="font-mono text-xs">Loading settlement records from Deriv...</span>
            </div>
          ) : history.length === 0 ? (
            <div className="py-6 text-center text-[#9699a0] font-mono text-xs">
              No recent settled contracts found for {accountId}
            </div>
          ) : (
            history.map((item) => {
              const isProfit = item.profit >= 0;
              return (
                <div
                  key={item.contract_id}
                  className="bg-[#15171e] border border-[#2a2e39] rounded-lg p-2 font-mono text-[11px] flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-bold text-white">{item.symbol}</span>
                      <span className="text-[#9699a0] text-[10px]">#{item.contract_id}</span>
                    </div>
                    <div className="text-[10px] text-[#9699a0]">
                      Buy: ${item.buy_price.toFixed(2)} &bull; Sell: ${item.sell_price.toFixed(2)}
                    </div>
                  </div>
                  <div className={`font-bold text-right ${isProfit ? 'text-[#00a86b]' : 'text-[#ff444f]'}`}>
                    {isProfit ? '+' : ''}${item.profit.toFixed(2)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
