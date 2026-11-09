/**
 * AppexQuant Markets Global - Adaptive Header Component
 * Rebuilt for compact mobile responsive layout and user privacy controls.
 */

import React, { useState } from 'react';
import { useGlobalState, AppViewRoute } from '../../state/GlobalStateContext.tsx';
import { useApiFetch } from '../../utils/apiFetch.ts';
import { useMarketData } from '../../state/MarketDataContext.tsx';
import { EnvironmentSelector } from '../common/EnvironmentSelector.tsx';
import { ThemeSelector } from '../common/ThemeSelector.tsx';
import { Menu, User, Eye, EyeOff, Flame, RefreshCw, AlertTriangle, CheckCircle2, Plus, Wallet, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { DerivConnectionModal } from '../auth/DerivConnectionModal.tsx';
import { CashierModal } from '../cashier/CashierModal.tsx';
import { formatCurrencyValue } from '../../utils/userStatusPresentation.ts';

interface HeaderProps {
  onToggleMobileDrawer: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileDrawer }) => {
  const { state, dispatch, selectedAccount, refreshBalances } = useGlobalState();
  const apiFetch = useApiFetch();
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showCashierModal, setShowCashierModal] = useState(false);
  const [cashierDefaultTab, setCashierDefaultTab] = useState<'deposit' | 'withdrawal' | 'transfer' | 'p2p'>('deposit');
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  const handleNavigate = (route: AppViewRoute) => {
    dispatch({ type: 'SET_ROUTE', payload: route });
  };

  const handleManualSync = async () => {
    if (isManualSyncing || !state.session.isAuthenticated) return;
    setIsManualSyncing(true);
    dispatch({ type: 'SET_SYNC_STATUS', payload: 'SYNCING' });

    try {
      await refreshBalances();
      dispatch({ type: 'SET_SYNC_STATUS', payload: 'SYNCED' });
    } catch {
      dispatch({ type: 'SET_SYNC_STATUS', payload: 'SYNC_FAILED' });
    } finally {
      setIsManualSyncing(false);
    }
  };

  const isBalanceHidden = state.isBalanceHidden;
  const balanceValue = (selectedAccount && selectedAccount.balance.balance > 0)
    ? selectedAccount.balance.balance
    : (state.wallets[0]?.balance ?? selectedAccount?.balance.balance ?? 0);

  // Account Connection Badge Logic
  const isAuthenticated = state.session.isAuthenticated;
  const activeAcc = selectedAccount || state.accounts[0];
  const isReal = activeAcc ? activeAcc.type === 'REAL' : false;

  let statusText = 'OFFLINE';
  let badgeClass = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
  let dotClass = 'bg-rose-500';

  if (isAuthenticated && activeAcc) {
    if (isReal) {
      statusText = 'LIVE';
      badgeClass = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      dotClass = 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.7)] animate-pulse';
    } else {
      statusText = 'DEMO';
      badgeClass = 'bg-sky-500/10 text-sky-400 border-sky-500/30';
      dotClass = 'bg-sky-500 shadow-[0_0_8px_rgba(56,189,248,0.7)] animate-pulse';
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
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center font-extrabold text-white text-base sm:text-lg shadow-sm shrink-0">
            Q
          </div>
          <div className="whitespace-nowrap overflow-hidden">
            <h1 className="text-xs sm:text-sm lg:text-base font-extrabold tracking-wider uppercase text-white flex items-center gap-1.5">
              <span>QUANTIS</span>
              <span className="text-cyan-400 font-semibold">FX</span>
            </h1>
          </div>
        </div>
      </div>

      {/* Right Controls: Environment, Balance Privacy, Theme, Profile */}
      <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
        {/* Connection state or sync retry if failed */}
        {isAuthenticated && state.user?.syncStatus === 'SYNC_FAILED' && (
          <button
            onClick={handleManualSync}
            disabled={isManualSyncing}
            className="flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-mono font-bold uppercase transition-all cursor-pointer bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/40"
            title="Account sync issue. Click to retry."
          >
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            <span className="hidden sm:inline">Retry Sync</span>
          </button>
        )}

        {isAuthenticated && (state.user?.syncStatus === 'SYNCING' || isManualSyncing) && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-mono font-bold uppercase bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse">
            <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
            <span className="hidden sm:inline">Syncing</span>
          </div>
        )}

        {/* SINGLE AUTHORITATIVE ENVIRONMENT SELECTOR ([ DEMO ▾ ] or [ REAL ▾ ]) */}
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

        {/* PROMINENT DERIV DEPOSIT & WITHDRAWAL CASHIER ACTION BUTTONS */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => {
              setCashierDefaultTab('deposit');
              setShowCashierModal(true);
            }}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#00a86b] hover:bg-[#00ba77] active:scale-[0.98] text-white font-bold text-xs shadow-sm transition-all cursor-pointer shrink-0"
            title="Deposit funds via Deriv Cashier"
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Deposit</span>
          </button>

          <button
            onClick={() => {
              setCashierDefaultTab('withdrawal');
              setShowCashierModal(true);
            }}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#ff444f]/15 hover:bg-[#ff444f]/25 border border-[#ff444f]/40 text-[#ff444f] hover:text-white font-bold text-xs shadow-sm transition-all cursor-pointer shrink-0"
            title="Withdraw funds via Deriv Cashier"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Withdrawal</span>
          </button>
        </div>

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
            {state.user?.loginid || state.user?.derivAccountId || 'Account'}
          </span>
        </button>
      </div>

      {showAdminModal && (
        <DerivConnectionModal onClose={() => setShowAdminModal(false)} />
      )}

      {showCashierModal && (
        <CashierModal
          isOpen={showCashierModal}
          defaultTab={cashierDefaultTab}
          onClose={() => setShowCashierModal(false)}
        />
      )}

    </header>
  );
};
