/**
 * Quantis FX - Modular Platform Header & Navigation Bar
 * - Logo: Quantis FX (sub-brands: Quantis FX Academy, Quantis FX Bot Suite)
 * - Navigation: Dynamic, reorderable tabs managed by NavigationManagerModal
 * - Controls:
 *   - Deriv API Token Connection Button
 *   - OAuth Log In / Sign Up Modal Trigger
 *   - Navigation Manager Modal Trigger
 *   - Environment Selector (DEMO / REAL derived from Deriv API)
 *   - Balance & Deriv Cashier triggers
 */

import React, { useState } from 'react';
import { useGlobalState, AppViewRoute } from '../../state/GlobalStateContext.tsx';
import { useQuantis } from '../../state/QuantisContext.tsx';
import { EnvironmentSelector } from '../common/EnvironmentSelector.tsx';
import { CashierModal } from '../cashier/CashierModal.tsx';
import { formatCurrencyValue } from '../../utils/userStatusPresentation.ts';
import {
  SlidersHorizontal,
  KeyRound,
  Shield,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Eye,
  EyeOff,
  User,
  Bot,
  GraduationCap,
  LayoutDashboard,
  ShoppingBag,
  Calculator,
  BarChart2,
  ArrowRightLeft,
  CheckCircle2,
  Menu,
  Zap,
} from 'lucide-react';

interface QuantisHeaderProps {
  onToggleMobileDrawer?: () => void;
}

export const QuantisHeader: React.FC<QuantisHeaderProps> = ({ onToggleMobileDrawer }) => {
  const { state, dispatch, selectedAccount } = useGlobalState();
  const {
    visibleTabs,
    tokenStatus,
    setTokenModalOpen,
    setOAuthModalOpen,
    setNavManagerOpen,
  } = useQuantis();

  const [showCashierModal, setShowCashierModal] = useState(false);
  const [cashierDefaultTab, setCashierDefaultTab] = useState<'deposit' | 'withdrawal' | 'transfer' | 'p2p'>('deposit');

  const handleNavigate = (route: AppViewRoute) => {
    dispatch({ type: 'SET_ROUTE', payload: route });
  };

  const isBalanceHidden = state.isBalanceHidden;
  const balanceValue = (selectedAccount && selectedAccount.balance.balance > 0)
    ? selectedAccount.balance.balance
    : (state.wallets[0]?.balance ?? selectedAccount?.balance.balance ?? 0);

  const getTabIcon = (iconName: string) => {
    switch (iconName) {
      case 'LayoutDashboard':
        return <LayoutDashboard className="w-3.5 h-3.5" />;
      case 'Bot':
        return <Bot className="w-3.5 h-3.5" />;
      case 'GraduationCap':
        return <GraduationCap className="w-3.5 h-3.5" />;
      case 'ShoppingBag':
        return <ShoppingBag className="w-3.5 h-3.5" />;
      case 'Calculator':
        return <Calculator className="w-3.5 h-3.5" />;
      case 'BarChart2':
        return <BarChart2 className="w-3.5 h-3.5" />;
      case 'ArrowRightLeft':
        return <ArrowRightLeft className="w-3.5 h-3.5" />;
      case 'Zap':
        return <Zap className="w-3.5 h-3.5 text-cyan-400" />;
      default:
        return null;
    }
  };

  return (
    <header className="h-16 flex items-center justify-between px-3 sm:px-6 lg:px-8 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md shrink-0 sticky top-0 z-40 w-full select-none shadow-md">
      {/* Left: Brand Logo & Sub-Brands */}
      <div className="flex items-center space-x-3 sm:space-x-6 shrink-0 min-w-0">
        {onToggleMobileDrawer && (
          <button
            onClick={onToggleMobileDrawer}
            className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            aria-label="Open mobile menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div
          onClick={() => handleNavigate('dashboard')}
          className="flex items-center space-x-2.5 cursor-pointer group shrink-0"
          title="Quantis FX - Next-Gen Trading & Automation"
        >
          {/* Logo Mark */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-extrabold text-slate-950 text-lg shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform shrink-0">
            Q
          </div>
          <div className="flex flex-col">
            <div className="flex items-center space-x-1.5">
              <span className="text-base font-extrabold tracking-tight text-white group-hover:text-cyan-400 transition-colors">
                QUANTIS
              </span>
              <span className="text-base font-bold text-cyan-400">FX</span>
            </div>
            <div className="flex items-center space-x-1.5 text-[9px] font-mono text-slate-400 font-semibold tracking-wider uppercase">
              <span>Bot Suite</span>
              <span className="text-slate-600">&bull;</span>
              <span className="text-blue-400">Academy</span>
            </div>
          </div>
        </div>

        {/* Center: Interactive Custom Navigation Tabs (Customized via Navigation Manager) */}
        <nav className="hidden xl:flex items-center space-x-1 text-xs font-semibold text-slate-400 pl-4 border-l border-slate-800">
          {visibleTabs.map((tab) => {
            const isActive = state.currentRoute === tab.route;
            return (
              <button
                key={tab.id}
                onClick={() => handleNavigate(tab.route)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  isActive
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-xs font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {getTabIcon(tab.iconName)}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Right Controls: Deriv API Token, OAuth, Nav Manager, Environment, Cashier */}
      <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0">
        {/* Navigation Manager Trigger Button */}
        <button
          onClick={() => setNavManagerOpen(true)}
          className="p-1.5 sm:p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-cyan-400 transition-colors cursor-pointer flex items-center space-x-1 text-xs shrink-0"
          title="Manage Tabs (Dashboard, Bot Builder, Quantis Academy, Smart Scan, Risk Calculator)"
          aria-label="Manage Navigation Tabs"
        >
          <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
          <span className="hidden lg:inline text-[11px] font-semibold">Tabs</span>
        </button>

        {/* Deriv API Token Trigger Button */}
        <button
          onClick={() => setTokenModalOpen(true)}
          className={`flex items-center space-x-1 px-2 sm:px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shrink-0 ${
            tokenStatus === 'VALID'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
              : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:border-cyan-500/50 hover:text-white'
          }`}
          title="Configure Deriv API Token Connection"
        >
          <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[11px] font-medium">
            {tokenStatus === 'VALID' ? 'Active' : 'API Token'}
          </span>
          {tokenStatus === 'VALID' && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </button>

        {/* OAuth Log In / Sign Up Trigger */}
        <button
          onClick={() => setOAuthModalOpen(true)}
          className="flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer shrink-0"
          title="Deriv OAuth Log In / Sign Up"
        >
          <Shield className="w-3.5 h-3.5 text-cyan-200" />
          <span className="text-[11px]">Log In</span>
        </button>

        {/* Environment Selector (DEMO / REAL strictly derived from Deriv API) */}
        <div className="shrink-0">
          <EnvironmentSelector />
        </div>

        {/* Balance Privacy Quick Toggle */}
        {selectedAccount && (
          <button
            onClick={() => dispatch({ type: 'TOGGLE_BALANCE_HIDDEN' })}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:bg-slate-900 text-xs transition-colors cursor-pointer shrink-0"
            title={isBalanceHidden ? 'Show Account Balance' : 'Hide Account Balance'}
          >
            {isBalanceHidden ? (
              <EyeOff className="w-3.5 h-3.5 text-slate-500" />
            ) : (
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
            )}
            <span className="font-mono font-bold text-slate-100 text-xs">
              {formatCurrencyValue(balanceValue, isBalanceHidden)}
            </span>
          </button>
        )}

        {/* Deriv Cashier Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => {
              setCashierDefaultTab('deposit');
              setShowCashierModal(true);
            }}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer shrink-0"
            title="Deposit funds via Deriv Cashier"
          >
            <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">Deposit</span>
          </button>

          <button
            onClick={() => {
              setCashierDefaultTab('withdrawal');
              setShowCashierModal(true);
            }}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 hover:text-white font-bold text-xs transition-all cursor-pointer shrink-0"
            title="Withdraw funds via Deriv Cashier"
          >
            <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">Withdraw</span>
          </button>
        </div>

        {/* Profile Button */}
        <button
          onClick={() => handleNavigate('account')}
          className="flex items-center gap-1.5 p-1.5 sm:p-2 text-slate-400 bg-slate-950/80 border border-slate-800 hover:bg-slate-900 hover:text-white rounded-xl transition-colors cursor-pointer shrink-0"
          title="Account Profile & Settings"
          aria-label="User Account"
        >
          <User className="w-4 h-4 shrink-0" />
          <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-200 hidden lg:inline max-w-[100px] truncate">
            {state.user?.loginid || state.user?.derivAccountId || 'Account'}
          </span>
        </button>
      </div>

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
