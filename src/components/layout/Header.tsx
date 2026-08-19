/**
 * AppexQuant Markets Global - Adaptive Header Component
 * Rebuilt for compact mobile responsive layout and user privacy controls.
 */

import React, { useState } from 'react';
import { useGlobalState, AppViewRoute } from '../../state/GlobalStateContext.tsx';
import { useMarketData } from '../../state/MarketDataContext.tsx';
import { EnvironmentSelector } from '../common/EnvironmentSelector.tsx';
import { ThemeSelector } from '../common/ThemeSelector.tsx';
import { Menu, User, Eye, EyeOff } from 'lucide-react';
import { DerivConnectionStatus } from '../auth/DerivConnectionStatus.tsx';
import { DerivConnectionModal } from '../auth/DerivConnectionModal.tsx';
import { formatCurrencyValue } from '../../utils/userStatusPresentation.ts';

interface HeaderProps {
  onToggleMobileDrawer: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileDrawer }) => {
  const { state, dispatch, selectedAccount } = useGlobalState();
  const [showDerivModal, setShowDerivModal] = useState(false);

  const handleNavigate = (route: AppViewRoute) => {
    dispatch({ type: 'SET_ROUTE', payload: route });
  };

  const isBalanceHidden = state.isBalanceHidden;
  const balanceValue = selectedAccount ? selectedAccount.balance.balance : 0;

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
          onClick={() => handleNavigate('dashboard')}
          className="flex items-center space-x-2 cursor-pointer shrink-0"
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
        {/* DERIV CONNECTION STATUS */}
        <div onClick={() => setShowDerivModal(true)} className="cursor-pointer shrink-0">
          <DerivConnectionStatus />
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
            {state.user?.displayName || (state.user?.derivAccountId ? `Deriv (${state.user.derivAccountId})` : 'Trader Profile')}
          </span>
        </button>
      </div>

      {showDerivModal && <DerivConnectionModal onClose={() => setShowDerivModal(false)} />}
    </header>
  );
};
