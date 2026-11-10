/**
 * Quantis FX - Deriv Account & Environment Switcher
 * Lists Real (LIVE) and Demo accounts with clean color consistency.
 * Emerald Green for REAL / LIVE, Amber Gold for DEMO.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useGlobalState } from '../../state/GlobalStateContext.tsx';
import { useQuantis } from '../../state/QuantisContext.tsx';
import { apiFetch } from '../../utils/apiFetch.ts';
import { derivTradingClient } from '../../services/deriv/tradingClient.ts';
import { walletPollingService } from '../../services/walletPollingService.ts';
import { ChevronDown, ShieldCheck, Check, Loader2, KeyRound, UserCheck } from 'lucide-react';

export const EnvironmentSelector: React.FC = () => {
  const { state, dispatch, selectedAccount } = useGlobalState();
  const { setTokenModalOpen, setOAuthModalOpen } = useQuantis();
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const activeAcc = selectedAccount || state.accounts.find(a => a.id === state.selectedAccountId) || state.accounts[0];
  const currentLoginId = activeAcc?.accountNumber || derivTradingClient.getCurrentAccountId() || state.user?.derivAccountId || state.user?.loginid;
  const isReal = Boolean(
    (currentLoginId && currentLoginId.toUpperCase().startsWith('CR')) ||
    activeAcc?.type === 'REAL' ||
    activeAcc?.isVirtual === false ||
    derivTradingClient.isRealAccount() ||
    state.executionEnvironment === 'LIVE'
  );

  const realAccounts = state.accounts.filter(a => a.type === 'REAL' || a.accountNumber.toUpperCase().startsWith('CR'));
  const demoAccounts = state.accounts.filter(a => a.type === 'DEMO' || a.accountNumber.toUpperCase().startsWith('VR'));

  const handleSwitchAccount = async (accountNumber: string) => {
    if (isSwitching || (activeAcc && activeAcc.accountNumber === accountNumber)) {
      setIsOpen(false);
      return;
    }

    setIsSwitching(true);
    setIsOpen(false);

    try {
      derivTradingClient.disconnect();

      const res = await apiFetch('/api/auth/deriv/switch-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginid: accountNumber }),
      });

      const json = await res.json();
      if (res.ok && json?.data?.derivAccountId) {
        const metadata = json.data;

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

        await derivTradingClient.connect(metadata.derivAccountId);
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
        const targetAcc = state.accounts.find(a => a.accountNumber === accountNumber);
        if (targetAcc) {
          dispatch({ type: 'SELECT_ACCOUNT', payload: targetAcc.id });
          dispatch({ type: 'SET_EXECUTION_ENVIRONMENT', payload: targetAcc.type === 'REAL' ? 'LIVE' : 'DEMO' });
        }
      }
    } catch {
      const targetAcc = state.accounts.find(a => a.accountNumber === accountNumber);
      if (targetAcc) {
        dispatch({ type: 'SELECT_ACCOUNT', payload: targetAcc.id });
        dispatch({ type: 'SET_EXECUTION_ENVIRONMENT', payload: targetAcc.type === 'REAL' ? 'LIVE' : 'DEMO' });
      }
    } finally {
      setIsSwitching(false);
    }
  };

  const handleSelectMode = (mode: 'LIVE' | 'DEMO') => {
    setIsOpen(false);
    if (mode === 'LIVE') {
      const realAcc = realAccounts[0];
      if (realAcc) {
        handleSwitchAccount(realAcc.accountNumber);
      } else {
        dispatch({ type: 'SET_EXECUTION_ENVIRONMENT', payload: 'LIVE' });
        setTokenModalOpen(true);
      }
    } else {
      const demoAcc = demoAccounts[0];
      if (demoAcc) {
        handleSwitchAccount(demoAcc.accountNumber);
      } else {
        dispatch({ type: 'SET_EXECUTION_ENVIRONMENT', payload: 'DEMO' });
      }
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

  const displayAccountLabel = currentLoginId || (isReal ? 'CR-Primary' : 'Demo Account');

  return (
    <div ref={containerRef} className="relative inline-block text-left select-none">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitching}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
          isReal
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
            : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
        }`}
        title={`Active Account: ${displayAccountLabel}`}
      >
        {isSwitching ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : isReal ? (
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <UserCheck className="w-3.5 h-3.5 text-amber-400" />
        )}

        <span className="font-mono uppercase font-extrabold text-[11px] tracking-wider">
          {isReal ? 'REAL LIVE' : 'DEMO'}
        </span>
        <span className="hidden md:inline font-mono text-[10px] text-slate-300">
          ({displayAccountLabel})
        </span>

        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-64 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl z-50 p-2 space-y-2">
          {/* Quick Environment Switcher Tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => handleSelectMode('LIVE')}
              className={`py-1.5 px-2 rounded-md font-mono text-[11px] font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                isReal
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3 h-3" />
              <span>REAL LIVE</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectMode('DEMO')}
              className={`py-1.5 px-2 rounded-md font-mono text-[11px] font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                !isReal
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserCheck className="w-3 h-3" />
              <span>DEMO</span>
            </button>
          </div>

          <div className="text-[9px] uppercase font-mono font-bold text-slate-400 px-2 py-0.5 border-b border-slate-800">
            Your Connected Accounts
          </div>

          <div className="space-y-1 max-h-48 overflow-y-auto pr-1 no-scrollbar">
            {state.accounts.map((acc) => {
              const accIsReal = acc.type === 'REAL' || acc.accountNumber.toUpperCase().startsWith('CR');
              const isSelected = activeAcc?.id === acc.id || activeAcc?.accountNumber === acc.accountNumber;

              return (
                <button
                  key={acc.id}
                  onClick={() => handleSwitchAccount(acc.accountNumber)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold'
                      : 'text-slate-200 hover:bg-slate-800/80 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                      accIsReal
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    }`}>
                      {accIsReal ? 'REAL' : 'DEMO'}
                    </span>
                    <div className="text-left">
                      <span className="block font-mono text-[11px] font-semibold">{acc.accountNumber}</span>
                      <span className="block text-[10px] font-mono text-slate-400">
                        {acc.currency} {acc.balance.balance.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                </button>
              );
            })}

            {state.accounts.length === 0 && (
              <div className="p-2 text-center text-xs text-slate-400 font-mono">
                {isReal ? 'Active: REAL Account' : 'Active: DEMO Account'}
              </div>
            )}
          </div>

          <div className="pt-1.5 border-t border-slate-800 space-y-1">
            <button
              onClick={() => {
                setIsOpen(false);
                setTokenModalOpen(true);
              }}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 font-semibold text-xs transition-colors cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Connect Real / API Token</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                setOAuthModalOpen(true);
              }}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Deriv OAuth Sign In</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const EnvironmentGlobalBanner: React.FC = () => {
  return null;
};
