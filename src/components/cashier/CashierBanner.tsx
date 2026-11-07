/**
 * AppexQuant Markets Global - Sticky Cashier Return Banner
 * Listens for active Deriv Cashier handoffs, polls for balance changes,
 * and provides return navigation back to the dashboard.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  getActiveHandoff,
  clearActiveHandoff,
  saveActiveHandoff,
  CashierHandoffState,
} from '../../services/deriv/cashierHandoff.ts';
import { useGlobalState } from '../../state/GlobalStateContext.tsx';
import { apiFetch } from '../../utils/apiFetch.ts';
import { ExternalLink, CheckCircle2, Clock, X, RefreshCw, ArrowRight } from 'lucide-react';

export const CashierBanner: React.FC = () => {
  const { dispatch } = useGlobalState();
  const [handoff, setHandoff] = useState<CashierHandoffState | null>(getActiveHandoff());
  const pollCountRef = useRef(0);

  const checkHandoff = () => {
    const active = getActiveHandoff();
    setHandoff(active);
  };

  useEffect(() => {
    checkHandoff();

    const handleReturnEvent = () => {
      checkHandoff();
    };

    window.addEventListener('visibilitychange', handleReturnEvent);
    window.addEventListener('focus', handleReturnEvent);
    window.addEventListener('pageshow', handleReturnEvent);

    return () => {
      window.removeEventListener('visibilitychange', handleReturnEvent);
      window.removeEventListener('focus', handleReturnEvent);
      window.removeEventListener('pageshow', handleReturnEvent);
    };
  }, []);

  // Auto-refresh balance polling while handoff is live
  useEffect(() => {
    if (!handoff || handoff.status === 'COMPLETED' || handoff.status === 'EXPIRED') return;

    pollCountRef.current = 0;

    const pollInterval = setInterval(async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      if (pollCountRef.current >= 40) {
        clearInterval(pollInterval);
        return;
      }

      pollCountRef.current += 1;

      try {
        const res = await apiFetch('/api/wallet/summary').catch(() => null);
        if (res && res.ok) {
          const json = await res.json().catch(() => null);
          const wallets: any[] = json?.data?.wallets || [];

          if (wallets.length > 0 && handoff.snapshot) {
            let balanceChanged = false;
            let changeMessage = '';

            for (const w of wallets) {
              const cur = w.currency || w.id;
              const newBal = Number(w.balance) || 0;
              const oldBal = Number(handoff.snapshot[cur] ?? handoff.snapshot[w.id]) || 0;
              const diff = newBal - oldBal;

              if (Math.abs(diff) > 0.0001) {
                balanceChanged = true;
                const sign = diff > 0 ? '+' : '';
                changeMessage = `${cur} ${sign}${diff.toFixed(2)}`;
                break;
              }
            }

            if (balanceChanged) {
              const updatedHandoff: CashierHandoffState = {
                ...handoff,
                status: 'UPDATED',
                updatedMessage: changeMessage,
              };
              saveActiveHandoff(updatedHandoff);
              setHandoff(updatedHandoff);

              dispatch({
                type: 'ADD_NOTIFICATION',
                payload: {
                  title: 'Balance Updated',
                  message: `Balance updated: ${changeMessage}`,
                  type: 'success',
                },
              });
            }
          }
        }
      } catch {}
    }, 15000); // 15 seconds poll

    return () => clearInterval(pollInterval);
  }, [handoff?.id]);

  if (!handoff) return null;

  const handleContinueOnDeriv = () => {
    if (handoff.url) {
      window.open(handoff.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDone = () => {
    clearActiveHandoff();
    setHandoff(null);
    dispatch({ type: 'SET_ROUTE', payload: 'dashboard' });
  };

  const isUpdated = handoff.status === 'UPDATED';
  const kindLabel = handoff.kind === 'withdraw' ? 'withdrawal' : handoff.kind;

  return (
    <div className="bg-[#15171e] border-b border-[#00a86b]/40 text-white px-3 sm:px-4 py-2.5 shadow-lg select-none z-40 relative animate-in slide-in-from-top duration-200">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="flex items-center space-x-2.5 text-xs">
          {isUpdated ? (
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 animate-pulse" />
            </div>
          )}

          <div>
            {isUpdated ? (
              <span className="font-bold text-emerald-400">
                {handoff.kind === 'deposit' ? 'Deposit received!' : 'Cashier update completed!'} {handoff.updatedMessage ? `(${handoff.updatedMessage})` : ''}
              </span>
            ) : (
              <span>
                Finishing your <strong className="text-white capitalize">{kindLabel}</strong> on Deriv.{' '}
                {handoff.kind === 'withdraw'
                  ? 'Withdrawals can take time. Check status on Deriv.'
                  : 'We will update your balance when you return.'}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0 text-xs">
          <button
            onClick={handleContinueOnDeriv}
            className="px-2.5 py-1 rounded-lg bg-[#2a2e39] hover:bg-[#3a3f4d] text-[#9699a0] hover:text-white transition-colors cursor-pointer flex items-center space-x-1 font-semibold"
          >
            <span>Continue on Deriv</span>
            <ExternalLink className="w-3 h-3" />
          </button>

          <button
            onClick={handleDone}
            className="px-3 py-1 rounded-lg bg-[#00a86b] hover:bg-[#00ba77] text-white font-bold transition-all cursor-pointer shadow-sm flex items-center space-x-1"
          >
            <span>Done &bull; Back to Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
