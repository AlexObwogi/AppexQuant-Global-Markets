/**
 * AppexQuant Markets Global - Adaptive Header Component
 * Rebuilt for compact mobile responsive layout and user privacy controls.
 */

import React, { useState, useEffect } from 'react';
import { useGlobalState, AppViewRoute } from '../../state/GlobalStateContext.tsx';
import { derivAuthService } from '../../services/deriv/authService.ts';
import { useApiFetch } from '../../utils/apiFetch.ts';
import { useMarketData } from '../../state/MarketDataContext.tsx';
import { EnvironmentSelector } from '../common/EnvironmentSelector.tsx';
import { ThemeSelector } from '../common/ThemeSelector.tsx';
import { Menu, User, Eye, EyeOff, Flame, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { DerivConnectionModal } from '../auth/DerivConnectionModal.tsx';
import { formatCurrencyValue } from '../../utils/userStatusPresentation.ts';

interface HeaderProps {
  onToggleMobileDrawer: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileDrawer }) => {
  const { state, dispatch, selectedAccount } = useGlobalState();
  const apiFetch = useApiFetch();
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  const [authProfile, setAuthProfile] = useState(derivAuthService.getProfile());
  useEffect(() => {
    const interval = setInterval(() => setAuthProfile(derivAuthService.getProfile()), 2000);
    return () => clearInterval(interval);
  }, []);
  const handleNavigate = (route: AppViewRoute) => {
    dispatch({ type: 'SET_ROUTE', payload: route });
  };

  const handleManualSync = async () => {
    if (isManualSyncing || !state.session.isAuthenticated) return;
    const targetAccountId = state.user?.derivAccountId || state.user?.id || state.session.userId;
    if (!targetAccountId) return;

    setIsManualSyncing(true);
    dispatch({ type: 'SET_SYNC_STATUS', payload: 'SYNCING' });

    try {
      const savedToken = localStorage.getItem('deriv_access_token') || localStorage.getItem('deriv_oauth_token') || '';
      const res = await apiFetch('/api/auth/deriv/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: targetAccountId.startsWith('usr-') ? targetAccountId : undefined,
          loginid: targetAccountId.startsWith('CR') || targetAccountId.startsWith('VR') ? targetAccountId : targetAccountId,
          apiToken: savedToken,
          token: savedToken,
        }),
      });

      if (res.ok) {
        const json = await res.json().catch(() => null);
        if (json && json.success && json.data) {
          const metadata = json.data;
          if (typeof metadata.balance === 'number') {
            dispatch({
              type: 'UPDATE_ACCOUNT_BALANCE',
              payload: {
                balance: metadata.balance,
                currency: metadata.currency || 'USD',
                loginid: metadata.derivAccountId || targetAccountId,
              },
            });
          }
          dispatch({ type: 'SET_SYNC_STATUS', payload: 'SYNCED' });
          return;
        }
      }
      dispatch({ type: 'SET_SYNC_STATUS', payload: 'SYNC_FAILED' });
    } catch {
      dispatch({ type: 'SET_SYNC_STATUS', payload: 'SYNC_FAILED' });
    } finally {
      setIsManualSyncing(false);
    }
  };

  const isBalanceHidden = state.isBalanceHidden;
  const balanceValue = selectedAccount ? selectedAccount.balance.balance : 0;

  // Real Connection Status Logic
  const isAuthenticated = state.session.isAuthenticated;
  const env = state.executionEnvironment;
  const derivAcct = state.user?.derivAccountId || state.session.userId;
  const accountType = state.user?.accountType || (derivAcct?.startsWith('VR') ? 'demo' : 'real');

  let statusText = 'OFFLINE';
  let badgeClass = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
  let dotClass = 'bg-rose-500';

  if (isAuthenticated) {
    if (env === 'PAPER') {
      statusText = 'PAPER';
      badgeClass = 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      dotClass = 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.7)] animate-pulse';
    } else if (accountType === 'demo' || env === 'DEMO') {
      statusText = 'DEMO';
      badgeClass = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      dotClass = 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.7)] animate-pulse';
    } else {
      statusText = 'LIVE';
      badgeClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      dotClass = 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.7)] animate-pulse';
    }
  }

  return (
    <header className="h-14 sm:h-16 flex items-center justify-between px-2.5 sm:px-4 lg:px-8 border-b border-border-color bg-bg-nav shrink-0 sticky top-0 z-30 w-full select-none">
      {/* Left: Hamburger + Non-wrapping Brand Logo & Title */}
      <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0 min-w-0">
        <button
          onClick={onToggleMobileDrawer}
          className="lg:hidden p-2 text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors cursor-pointer shrink-0"
          aria-label="Open mobile menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div
          onClick={() => handleNavigate('landing')}
          className="flex items-center space-x-2 cursor-pointer shrink-0"
          title="Return to Landing Page"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-accent-primary rounded-lg flex items-center justify-center font-extrabold text-bg-main text-base sm:text-lg shadow-sm shrink-0">
            A
          </div>
          <div className="whitespace-nowrap overflow-hidden">
            <h1 className="text-xs sm:text-sm lg:text-base font-extrabold tracking-wider uppercase text-text-primary flex items-center gap-1">
              <span>APPEXQUANT</span>
              <span className="hidden sm:inline text-text-secondary font-semibold">MARKETS</span>
              <span className="hidden lg:inline text-text-secondary/70 font-normal">GLOBAL</span>
            </h1>
          </div>
        </div>
      </div>

      {/* Right Controls: Environment, Balance Privacy, Connection, Theme, Profile */}
      <div className="flex items-center space-x-1 sm:space-x-2.5 shrink-0">
        {/* DERIV CONNECTION STATUS: [🔥 admin trigger] [LIVE / DEMO / PAPER / OFFLINE] */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            onClick={() => setShowAdminModal(true)}
            className="p-1 sm:p-1.5 rounded-lg border border-border-color/60 bg-bg-surface hover:bg-bg-hover text-rose-500 transition-colors cursor-pointer shrink-0"
            title="Admin: Open broker connection panel"
          >
            <Flame className="w-4 h-4 text-rose-500 hover:scale-110 active:scale-95 transition-transform" />
          </button>

          <div
            className={`flex items-center gap-1 sm:gap-1.5 px-2 py-1 rounded-lg border text-[10px] sm:text-xs font-mono font-extrabold uppercase tracking-wider shrink-0 select-none ${badgeClass}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
            <span>{statusText}</span>
          </div>

          {/* REACTIVE DERIV HYDRATION SYNC INDICATOR */}
          {isAuthenticated && (
            <button
              onClick={handleManualSync}
              disabled={isManualSyncing || state.user?.syncStatus === 'SYNCING'}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-mono font-bold uppercase transition-all cursor-pointer select-none active:scale-95 ${
                state.user?.syncStatus === 'SYNCING'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
                  : state.user?.syncStatus === 'SYNC_FAILED'
                  ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-xs'
                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              }`}
              title={
                state.user?.syncStatus === 'SYNCING'
                  ? 'Synchronizing authoritative Deriv account snapshot...'
                  : state.user?.syncStatus === 'SYNC_FAILED'
                  ? 'Synchronization incomplete. Click to retry sync now.'
                  : 'Deriv Account Snapshot Synced. Click to re-sync.'
              }
              aria-label="Deriv Sync Status"
            >
              {state.user?.syncStatus === 'SYNCING' || isManualSyncing ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                  <span className="hidden sm:inline">SYNCING</span>
                </>
              ) : state.user?.syncStatus === 'SYNC_FAILED' ? (
                <>
                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                  <span className="hidden sm:inline">SYNC FAILED</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span className="hidden sm:inline">SYNCED</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* SINGLE CONSOLIDATED ENVIRONMENT SELECTOR ([ DEMO ▾ ]) */}
        <div className="shrink-0">
          <EnvironmentSelector />
        </div>

        {/* BALANCE PRIVACY QUICK TOGGLE */}
        {selectedAccount && (
          <button
            onClick={() => dispatch({ type: 'TOGGLE_BALANCE_HIDDEN' })}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-surface border border-border-color hover:bg-bg-hover text-xs transition-colors cursor-pointer shrink-0"
            title={isBalanceHidden ? 'Show Account Balance' : 'Hide Account Balance'}
          >
            {isBalanceHidden ? (
              <EyeOff className="w-3.5 h-3.5 text-text-secondary" />
            ) : (
              <Eye className="w-3.5 h-3.5 text-accent-primary" />
            )}
            <span className="font-mono font-bold text-text-primary text-[11px]">
              {formatCurrencyValue(balanceValue, isBalanceHidden)}
            </span>
          </button>
        )}

        {/* ALWAYS VISIBLE THEME SELECTOR */}
        <div className="shrink-0">
          <ThemeSelector />
        </div>

        {/* PROFILE BUTTON */}
        <button
          onClick={() => handleNavigate('account')}
          className="flex items-center gap-1.5 p-1.5 sm:p-2 text-text-secondary bg-bg-surface border border-border-color hover:bg-bg-hover hover:text-text-primary rounded-lg transition-colors cursor-pointer shrink-0"
          title="User Account & Profile"
          aria-label="User Account"
        >
          <User className="w-4 h-4 shrink-0" />
          <span className="text-[10px] sm:text-xs font-bold text-text-primary whitespace-normal break-words max-w-[120px] sm:max-w-none text-left leading-tight">
            {authProfile?.loginid || state.user?.derivAccountId || 'Account'}
          </span>
        </button>
      </div>

      {showAdminModal && (
        <DerivConnectionModal onClose={() => setShowAdminModal(false)} />
      )}

    </header>
  );
};
