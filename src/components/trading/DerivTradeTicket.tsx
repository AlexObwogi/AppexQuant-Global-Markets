/**
 * AppexQuant Markets Global - Deriv Options Order Execution Ticket
 * 
 * Direct options trading ticket powered by Deriv Trading WebSocket:
 * - Supports Rise (CALL), Fall (PUT), Multipliers (MULTUP, MULTDOWN)
 * - 400ms debounced live proposal subscribing with single active stream
 * - Strictly enforces Real-money account protection (MAX_STAKE_REAL = 10 USD)
 * - Explicit manual user execution with confirmation modal on Real accounts
 * - Dual-column Deriv Coral Red (#ff444f) & Teal (#00a86b) buttons
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { derivTradingClient, DerivLiveProposal, MAX_STAKE_REAL } from '../../services/deriv/tradingClient.ts';
import { useMarketData } from '../../state/MarketDataContext.tsx';
import { useGlobalState } from '../../state/GlobalStateContext.tsx';
import { TrendingUp, TrendingDown, Shield, AlertTriangle, CheckCircle2, Loader2, Info } from 'lucide-react';

interface DerivTradeTicketProps {
  onOrderExecuted?: (contract: any) => void;
}

export const DerivTradeTicket: React.FC<DerivTradeTicketProps> = ({ onOrderExecuted }) => {
  const { selectedSymbol, selectedInstrument, currency: marketCurrency, dataFreshness } = useMarketData();
  const { state } = useGlobalState();

  const [contractType, setContractType] = useState<'CALL' | 'PUT'>('CALL');
  const [stake, setStake] = useState<number>(5);
  const [duration, setDuration] = useState<number>(5);
  const [durationUnit, setDurationUnit] = useState<'t' | 's' | 'm'>('t');

  const [liveProposal, setLiveProposal] = useState<DerivLiveProposal | null>(null);
  const [isRequestingProposal, setIsRequestingProposal] = useState(false);
  const [isExecutingBuy, setIsExecutingBuy] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<'CALL' | 'PUT' | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isReal = derivTradingClient.isRealAccount();
  const isMarketClosed = dataFreshness === 'CLOSED';
  const currency = derivTradingClient.getCurrency() || marketCurrency || 'USD';
  const accountId = derivTradingClient.getCurrentAccountId() || state.user?.derivAccountId || 'Demo Account';

  // Listen for live proposal stream updates
  useEffect(() => {
    const unsub = derivTradingClient.subscribeProposal((proposal) => {
      setLiveProposal(proposal);
      setIsRequestingProposal(false);
    });
    return () => unsub();
  }, []);

  // Debounced proposal requester
  const fetchProposal = useCallback((type: 'CALL' | 'PUT', amount: number, dur: number, unit: 't' | 's' | 'm') => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (isMarketClosed || !selectedSymbol) {
      setLiveProposal(null);
      return;
    }

    setIsRequestingProposal(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        await derivTradingClient.requestProposal({
          symbol: selectedSymbol,
          contract_type: type,
          currency,
          amount,
          basis: 'stake',
          duration: dur,
          duration_unit: unit,
        });
      } catch (err: any) {
        setIsRequestingProposal(false);
        setStatusMessage({ text: err.message || 'Proposal unavailable for selected parameters', type: 'error' });
      }
    }, 400);
  }, [selectedSymbol, currency, isMarketClosed]);

  // Request proposal whenever parameters shift
  useEffect(() => {
    fetchProposal(contractType, stake, duration, durationUnit);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [fetchProposal, contractType, stake, duration, durationUnit]);

  // Handle Buy Click
  const handleInitiateTrade = (type: 'CALL' | 'PUT') => {
    if (isMarketClosed) {
      setStatusMessage({ text: 'Market is currently closed. Synthetics trade 24/7.', type: 'error' });
      return;
    }

    if (!liveProposal || liveProposal.ask_price <= 0) {
      setStatusMessage({ text: 'Waiting for fresh price proposal from Deriv...', type: 'info' });
      return;
    }

    // Safety constraint: require explicit modal confirmation on Real accounts
    if (isReal) {
      if (stake > MAX_STAKE_REAL) {
        setStatusMessage({ text: `Maximum real stake is capped at $${MAX_STAKE_REAL} USD for safety.`, type: 'error' });
        return;
      }
      setPendingAction(type);
      setShowConfirmModal(true);
      return;
    }

    executeBuy(type);
  };

  const executeBuy = async (type: 'CALL' | 'PUT') => {
    if (!liveProposal) return;
    setIsExecutingBuy(true);
    setStatusMessage(null);

    try {
      const result = await derivTradingClient.buy(
        liveProposal.id,
        liveProposal.ask_price,
        selectedSymbol,
        type
      );

      setStatusMessage({
        text: `Order filled! Contract ID #${result.contract_id || result.transaction_id || 'OPEN'}`,
        type: 'success',
      });

      if (onOrderExecuted) {
        onOrderExecuted(result);
      }

      // Re-fetch next proposal
      fetchProposal(type, stake, duration, durationUnit);
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Execution rejected by Deriv', type: 'error' });
    } finally {
      setIsExecutingBuy(false);
      setShowConfirmModal(false);
      setPendingAction(null);
    }
  };

  const payoutAmount = liveProposal ? liveProposal.payout : 0;
  const netReturn = liveProposal ? liveProposal.payout - liveProposal.ask_price : 0;
  const returnPercentage = liveProposal && liveProposal.ask_price > 0 ? (netReturn / liveProposal.ask_price) * 100 : 0;

  return (
    <div className="bg-[#1c1f26] border border-[#2a2e39] rounded-xl p-3 sm:p-4 text-xs font-sans text-[#ffffff] space-y-3.5 select-none">
      {/* Header Deck */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#2a2e39]">
        <div className="flex items-center space-x-2">
          <span className="font-bold uppercase tracking-wider text-xs">Options Ticket</span>
          <span className="text-[10px] font-mono text-[#9699a0]">({selectedSymbol})</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
            isReal ? 'bg-[#ff444f]/20 text-[#ff444f] border border-[#ff444f]/30' : 'bg-[#00a86b]/20 text-[#00a86b] border border-[#00a86b]/30'
          }`}>
            {isReal ? 'REAL' : 'DEMO'}: {accountId}
          </span>
        </div>
      </div>

      {/* Contract Direction Switcher */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setContractType('CALL')}
          className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
            contractType === 'CALL'
              ? 'bg-[#00a86b] text-white shadow-md'
              : 'bg-[#15171e] text-[#9699a0] hover:text-white border border-[#2a2e39]'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Rise (Higher)</span>
        </button>
        <button
          type="button"
          onClick={() => setContractType('PUT')}
          className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
            contractType === 'PUT'
              ? 'bg-[#ff444f] text-white shadow-md'
              : 'bg-[#15171e] text-[#9699a0] hover:text-white border border-[#2a2e39]'
          }`}
        >
          <TrendingDown className="w-3.5 h-3.5" />
          <span>Fall (Lower)</span>
        </button>
      </div>

      {/* Duration Parameters */}
      <div className="space-y-1">
        <div className="flex justify-between text-[#9699a0] text-[11px]">
          <span>Duration</span>
          <div className="flex space-x-2">
            {(['t', 's', 'm'] as const).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setDurationUnit(u)}
                className={`font-mono text-[10px] uppercase px-1.5 py-0.5 rounded cursor-pointer ${
                  durationUnit === u ? 'bg-[#2a2e39] text-[#ffffff] font-bold' : 'text-[#9699a0] hover:text-[#ffffff]'
                }`}
              >
                {u === 't' ? 'Ticks' : u === 's' ? 'Sec' : 'Min'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center bg-[#15171e] border border-[#2a2e39] rounded-lg px-2.5 py-1.5">
          <input
            type="number"
            min={durationUnit === 't' ? 1 : 15}
            max={durationUnit === 't' ? 10 : 3600}
            value={duration}
            onChange={(e) => setDuration(Math.max(1, Number(e.target.value) || 1))}
            className="w-full bg-transparent font-mono text-xs focus:outline-hidden text-white"
          />
          <span className="text-[#9699a0] text-[11px] font-mono shrink-0 pl-1">
            {durationUnit === 't' ? 'ticks' : durationUnit === 's' ? 'seconds' : 'minutes'}
          </span>
        </div>
      </div>

      {/* Stake Amount */}
      <div className="space-y-1">
        <div className="flex justify-between text-[#9699a0] text-[11px]">
          <span>Stake Capital</span>
          <span className="font-mono text-[10px] text-[#9699a0]">
            {isReal ? `Max Real: $${MAX_STAKE_REAL} USD` : 'Virtual'}
          </span>
        </div>
        <div className="flex items-center bg-[#15171e] border border-[#2a2e39] rounded-lg px-2.5 py-1.5">
          <span className="text-[#9699a0] font-mono mr-1.5">$</span>
          <input
            type="number"
            min={0.35}
            max={isReal ? MAX_STAKE_REAL : 50000}
            step={1}
            value={stake}
            onChange={(e) => {
              const val = Number(e.target.value) || 0;
              setStake(isReal ? Math.min(MAX_STAKE_REAL, val) : val);
            }}
            className="w-full bg-transparent font-mono text-xs focus:outline-hidden text-white font-bold"
          />
          <span className="text-[#9699a0] text-[11px] font-mono shrink-0 pl-1">{currency}</span>
        </div>
      </div>

      {/* Financial Return Summary Matrix */}
      <div className="bg-[#15171e] border border-[#2a2e39] rounded-lg p-2.5 space-y-1.5 font-mono text-[11px]">
        <div className="flex justify-between text-[#9699a0]">
          <span>Ask Price (Stake):</span>
          <span className="text-white font-bold">${(liveProposal?.ask_price || stake).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-[#9699a0]">
          <span>Potential Payout:</span>
          <span className="text-[#00a86b] font-bold">
            {isRequestingProposal ? (
              <span className="text-[#9699a0] animate-pulse">Calculating...</span>
            ) : payoutAmount > 0 ? (
              `$${payoutAmount.toFixed(2)}`
            ) : (
              '--'
            )}
          </span>
        </div>
        <div className="flex justify-between text-[#9699a0] border-t border-[#2a2e39] pt-1">
          <span>Net Profit:</span>
          <span className="text-[#00a86b]">
            {netReturn > 0 ? `+$${netReturn.toFixed(2)} (+${returnPercentage.toFixed(1)}%)` : '--'}
          </span>
        </div>
      </div>

      {/* Status Feedback Notification */}
      {statusMessage && (
        <div className={`p-2 rounded-lg text-[11px] font-mono flex items-center space-x-1.5 ${
          statusMessage.type === 'success'
            ? 'bg-[#00a86b]/15 text-[#00a86b] border border-[#00a86b]/30'
            : statusMessage.type === 'error'
            ? 'bg-[#ff444f]/15 text-[#ff444f] border border-[#ff444f]/30'
            : 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
        }`}>
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          ) : statusMessage.type === 'error' ? (
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <Info className="w-3.5 h-3.5 shrink-0" />
          )}
          <span className="truncate">{statusMessage.text}</span>
        </div>
      )}

      {/* Deriv Style Dual Action Buttons */}
      <div className="pt-1">
        {contractType === 'CALL' ? (
          <button
            type="button"
            disabled={isMarketClosed || isExecutingBuy || !liveProposal}
            onClick={() => handleInitiateTrade('CALL')}
            className="w-full py-2.5 px-4 rounded-lg font-bold text-sm bg-[#ff444f] hover:bg-[#ff555f] active:scale-[0.99] text-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg"
          >
            {isExecutingBuy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <TrendingUp className="w-4 h-4" />
            )}
            <span>BUY RISE (HIGHER) &bull; ${liveProposal?.ask_price.toFixed(2) || stake}</span>
          </button>
        ) : (
          <button
            type="button"
            disabled={isMarketClosed || isExecutingBuy || !liveProposal}
            onClick={() => handleInitiateTrade('PUT')}
            className="w-full py-2.5 px-4 rounded-lg font-bold text-sm bg-[#00a86b] hover:bg-[#00ba77] active:scale-[0.99] text-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg"
          >
            {isExecutingBuy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span>BUY FALL (LOWER) &bull; ${liveProposal?.ask_price.toFixed(2) || stake}</span>
          </button>
        )}
      </div>

      {/* Real Account Safety Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#1c1f26] border border-[#2a2e39] rounded-xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center space-x-2 text-[#ff444f]">
              <Shield className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-sm text-white">Confirm Real Money Trade</h3>
            </div>
            <p className="text-xs text-[#9699a0] leading-relaxed">
              You are placing a REAL contract on account <strong className="text-white">{accountId}</strong>.
            </p>
            <div className="bg-[#15171e] p-3 rounded-lg border border-[#2a2e39] space-y-1 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-[#9699a0]">Symbol:</span>
                <span className="text-white font-bold">{selectedSymbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9699a0]">Contract:</span>
                <span className="text-white font-bold">{pendingAction === 'CALL' ? 'Rise' : 'Fall'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9699a0]">Stake:</span>
                <span className="text-[#ff444f] font-bold">${liveProposal?.ask_price.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9699a0]">Potential Payout:</span>
                <span className="text-[#00a86b] font-bold">${liveProposal?.payout.toFixed(2)} USD</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="py-2 px-3 rounded-lg border border-[#2a2e39] text-[#9699a0] hover:text-white cursor-pointer font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isExecutingBuy}
                onClick={() => pendingAction && executeBuy(pendingAction)}
                className="py-2 px-3 rounded-lg bg-[#ff444f] hover:bg-[#ff555f] text-white cursor-pointer font-bold flex items-center justify-center space-x-1"
              >
                {isExecutingBuy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Confirm Buy</span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
