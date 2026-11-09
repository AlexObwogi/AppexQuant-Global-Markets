/**
 * AppexQuant Markets Global - Real Deriv Account Switcher
 * Single Source of Truth: lists ONLY authorized accounts existing on Deriv.
 * Red LIVE badge for Real accounts, Blue DEMO badge for Demo accounts.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useGlobalState } from '../../state/GlobalStateContext.tsx';
import { apiFetch } from '../../utils/apiFetch.ts';
import { derivTradingClient } from '../../services/deriv/tradingClient.ts';
import { walletPollingService } from '../../services/walletPollingService.ts';
import { ChevronDown, Database, Flame, Check, Plus, Loader2 } from 'lucide-react';

export const EnvironmentSelector: React.FC = () => {
  const { state, dispatch, selectedAccount } = useGlobalState();
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isCreatingDemo, setIsCreatingDemo] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeAcc = selectedAccount || state.accounts[0];
  const isReal = activeAcc ? activeAcc.type === 'REAL' : false;

  const hasDemoAccount = state.accounts.some((a) => a.type === 'DEMO');

  const handleSwitchAccount = async (accountNumber: string) => {
    if (isSwitching || (activeAcc && activeAcc.accountNumber === accountNumber)) {
      setIsOpen(false);
      return;
    }

    setIsSwitching(true);
    setIsOpen(false);

    try {
      // 1. Close active trading socket
      derivTradingClient.disconnect();

      // 2. Call server switch account endpoint
      const res = await apiFetch('/api/auth/deriv/switch-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginid: accountNumber }),
      });

      const json = await res.json();
      if (res.ok && json?.data?.derivAccountId) {
        const metadata = json.data;

        // 3. Update global state selected account
        dispatch({ type: 'SELECT_ACCOUNT', payload: `acc-${metadata.derivAccountId}` });

        if (typeof metadata.balance === 'number') {
          dispatch({
            type: 'UPDATE_ACCOUNT_BALANCE',
            payload: {
              balance: metadata.balance,
              currency: metadata.currency || 'USD',
              loginid: metadata.derivAccountId,
            },
          });
        }

        // 4. Re-connect trading client to fresh target account OTP
        await derivTradingClient.connect(metadata.derivAccountId);

        // 5. Authoritatively poll wallets so all views immediately reflect the new active account balance
        await walletPollingService.fetchWallets();

        dispatch({
          type: 'ADD_NOTIFICATION',
          payload: {
            title: `Switched to ${metadata.accountType === 'demo' ? 'Demo' : 'Real'} Account`,
            message: `Active trading account set to ${metadata.derivAccountId}`,
            type: 'info',
          },
        });
      } else {
        dispatch({
          type: 'ADD_NOTIFICATION',
          payload: {
            title: 'Account Switch Failed',
            message: json?.error?.message || 'Failed to switch to target account.',
            type: 'error',
          },
        });
      }
    } catch (err: any) {
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          title: 'Account Switch Error',
          message: err?.message || 'Error communicating with Deriv server.',
          type: 'error',
        },
      });
    } finally {
      setIsSwitching(false);
    }
  };

  const handleCreateDemoAccount = async () => {
    setIsCreatingDemo(true);
    setIsOpen(false);

    try {
      const res = await apiFetch('/api/auth/deriv/create-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const json = await res.json();
      if (res.ok) {
        dispatch({
          type: 'ADD_NOTIFICATION',
          payload: {
            title: 'Demo Account Created',
            message: json?.data?.message || 'Demo account created successfully.',
            type: 'success',
          },
        });
        // Sync session to discover new account in list
        const syncRes = await apiFetch('/api/auth/deriv/sync', { method: 'POST' });
        const syncJson = await syncRes.json();
        if (syncJson?.data) {
          dispatch({ type: 'SET_USER_PROFILE', payload: syncJson.data });
        }
      } else {
        const errorMsg = res.status === 403
          ? 'Reconnect to Deriv to enable demo accounts'
          : (json?.error?.message || 'Failed to create demo account.');

        dispatch({
          type: 'ADD_NOTIFICATION',
          payload: {
            title: 'Create Demo Account Failed',
            message: errorMsg,
            type: 'error',
          },
        });
      }
    } catch (err: any) {
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          title: 'Create Demo Error',
          message: err?.message || 'Network error creating demo account.',
          type: 'error',
        },
      });
    } finally {
      setIsCreatingDemo(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!activeAcc) {
    return (
      <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-bg-hover text-text-secondary text-xs font-mono">
        <span>No Account</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitching || isCreatingDemo}
        className={`flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer bg-bg-surface hover:bg-bg-hover ${
          isReal
            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:border-rose-500/50'
            : 'bg-sky-500/10 text-sky-400 border-sky-500/30 hover:border-sky-500/50'
        }`}
        title={`Active Account: ${activeAcc.accountNumber}`}
      >
        {isSwitching || isCreatingDemo ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : isReal ? (
          <Flame className="w-3.5 h-3.5 text-rose-500" />
        ) : (
          <Database className="w-3.5 h-3.5 text-sky-400" />
        )}

        <span className="font-mono uppercase font-bold text-[11px]">
          {isReal ? 'LIVE' : 'DEMO'}
        </span>
        <span className="hidden md:inline font-mono text-[10px] text-text-secondary">
          ({activeAcc.accountNumber})
        </span>

        <ChevronDown className="w-3 h-3 text-text-secondary" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-56 rounded-xl bg-bg-elevated border border-border-color shadow-2xl z-50 p-1.5 space-y-1">
          <div className="text-[9px] uppercase font-mono font-bold text-text-secondary px-2 py-1 border-b border-border-color/60">
            Deriv Accounts List
          </div>

          <div className="space-y-1 max-h-48 overflow-y-auto">
            {state.accounts.map((acc) => {
              const accIsReal = acc.type === 'REAL';
              const isSelected = activeAcc.id === acc.id || activeAcc.accountNumber === acc.accountNumber;

              return (
                <button
                  key={acc.id}
                  onClick={() => handleSwitchAccount(acc.accountNumber)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-accent-primary/10 text-accent-primary font-bold'
                      : 'text-text-primary hover:bg-bg-hover'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                      accIsReal
                        ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        : 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                    }`}>
                      {accIsReal ? 'LIVE' : 'DEMO'}
                    </span>
                    <div className="text-left">
                      <span className="block font-mono text-[11px] font-semibold">{acc.accountNumber}</span>
                      <span className="block text-[10px] font-mono text-text-secondary">
                        {acc.currency} {acc.balance.balance.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {isSelected && <Check className="w-3.5 h-3.5 text-accent-primary shrink-0" />}
                </button>
              );
            })}
          </div>

          {!hasDemoAccount && (
            <div className="pt-1 border-t border-border-color/60">
              <button
                onClick={handleCreateDemoAccount}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 font-bold text-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Demo Account</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const EnvironmentGlobalBanner: React.FC = () => {
  return null;
};
