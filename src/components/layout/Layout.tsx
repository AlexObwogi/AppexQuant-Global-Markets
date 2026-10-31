/**
 * AppexQuant Markets Global - Responsive Master Layout Chassis
 * Fully mobile-adaptive, high-density Deriv dark aesthetic.
 * Removes terminal-like technical jargon and delivers seamless mobile & desktop experiences.
 */

import React, { ReactNode, useState, useEffect } from 'react';
import { useGlobalState } from '../../state/GlobalStateContext.tsx';
import { useMarketData } from '../../state/MarketDataContext.tsx';
import { Header } from './Header.tsx';
import { Sidebar } from './Sidebar.tsx';
import { BottomNav } from './BottomNav.tsx';
import { MoreDrawer } from './MoreDrawer.tsx';
import { OfflineBanner } from '../common/OfflineBanner.tsx';
import { SystemFailSafeBanner } from '../common/SystemFailSafeBanner.tsx';
import { PWAInstallBanner } from '../common/PWAInstallBanner.tsx';
import { ConnectionStatus } from '../common/ConnectionStatus.tsx';
import { X } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { state, dispatch, selectedAccount } = useGlobalState();
  const { ticks } = useMarketData();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [utcTime, setUtcTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().split(' ')[4] || '12:00:00');
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Active user / account label
  const activeAccountId = selectedAccount?.id || selectedAccount?.accountNumber || state.user?.derivAccountId || state.user?.loginid;
  const isDemo = state.executionEnvironment === 'DEMO' || activeAccountId?.startsWith('VR');

  // Market quotes from market data or defaults
  const eurUsdQuote = ticks['frxEURUSD']?.quote || 1.08452;
  const btcQuote = ticks['cryBTCUSD']?.quote || 91420.50;
  const vol100Quote = ticks['1HZ100V']?.quote || 4821.10;
  const goldQuote = ticks['frxXAUUSD']?.quote || 2335.80;

  // Auto-dismiss notifications after 5 seconds
  useEffect(() => {
    if (state.notifications.length > 0) {
      const timer = setTimeout(() => {
        const oldestNotification = state.notifications[state.notifications.length - 1];
        if (oldestNotification) {
          dispatch({ type: 'DISMISS_NOTIFICATION', payload: oldestNotification.id });
        }
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [state.notifications, dispatch]);

  const showRightPanelOnRoute = state.currentRoute === 'trade';

  return (
    <div className="min-h-screen lg:h-screen w-screen overflow-x-hidden lg:overflow-hidden select-none bg-[#15171e] text-[#ffffff] flex flex-col font-sans antialiased relative">
      {/* Offline & System Alerts */}
      <OfflineBanner />
      <SystemFailSafeBanner />
      <PWAInstallBanner />

      {/* Main Adaptive Header */}
      <Header onToggleMobileDrawer={() => setIsMoreOpen(true)} />

      {/* Responsive Live Market Ribbon (Single-line, horizontal scroll on mobile, no wrapping) */}
      <div className="h-9 sm:h-10 bg-[#15171e] border-b border-[#2a2e39] px-3 sm:px-4 flex items-center justify-between text-xs shrink-0 z-20 overflow-x-auto no-scrollbar whitespace-nowrap">
        {/* Left: Live Connection & Market Ticker */}
        <div className="flex items-center space-x-4 sm:space-x-6 shrink-0">
          <div className="flex items-center space-x-2 text-[#9699a0]">
            <span className="inline-block w-2 h-2 rounded-full bg-[#00a86b] animate-pulse"></span>
            <span className="font-semibold text-[#ffffff] text-[11px] sm:text-xs">Live Feed</span>
          </div>

          <div className="flex items-center space-x-3 sm:space-x-4 font-mono text-[11px] sm:text-xs text-[#9699a0]">
            <div className="flex items-center space-x-1">
              <span>EUR/USD:</span>
              <strong className="text-[#00a86b]">{eurUsdQuote.toFixed(5)}</strong>
              <span className="text-[#00a86b] text-[10px]">(+0.14%)</span>
            </div>
            <div className="flex items-center space-x-1">
              <span>BTC/USD:</span>
              <strong className="text-[#ff444f]">${btcQuote.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              <span className="text-[#ff444f] text-[10px]">(-0.82%)</span>
            </div>
            <div className="flex items-center space-x-1">
              <span>Volatility 100:</span>
              <strong className="text-[#00a86b]">{vol100Quote.toFixed(2)}</strong>
              <span className="text-[#00a86b] text-[10px]">(+1.25%)</span>
            </div>
            <div className="hidden md:flex items-center space-x-1">
              <span>Gold:</span>
              <strong className="text-[#00a86b]">${goldQuote.toFixed(2)}</strong>
            </div>
          </div>
        </div>

        {/* Right: UTC Time & Account Badge (Clean, friendly formatting) */}
        <div className="hidden sm:flex items-center space-x-3 font-mono text-[11px] sm:text-xs text-[#9699a0] shrink-0 pl-4">
          <span>UTC {utcTime}</span>
          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
            isDemo
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
          }`}>
            {isDemo ? 'Demo Account' : 'Real Account'}{activeAccountId ? `: ${activeAccountId}` : ''}
          </span>
        </div>
      </div>

      {/* Main Responsive Body Chassis */}
      <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden w-full relative min-h-0">
        {/* ZONE 1: Left Navigation Sidebar (Visible only on desktop lg+) */}
        <aside className="hidden lg:flex w-[240px] shrink-0 h-full bg-[#15171e] border-r border-[#2a2e39] flex-col overflow-y-auto no-scrollbar z-10">
          <Sidebar />
        </aside>

        {/* ZONE 2: Center Workspace (Full width on mobile/tablet, expands to fill remaining space on desktop) */}
        <main className="flex-1 w-full min-w-0 h-full overflow-y-auto overflow-x-hidden p-2.5 sm:p-4 md:p-6 pb-24 lg:pb-8 bg-[#15171e] relative">
          <div className="max-w-[1920px] mx-auto w-full min-w-0">
            {children}
          </div>
        </main>
      </div>

      {/* Floating Toast Notifications */}
      {state.notifications.length > 0 && (
        <div className="fixed top-20 right-4 z-50 space-y-2 max-w-[calc(100vw-2rem)] sm:max-w-sm w-full pointer-events-none">
          {state.notifications.map((notif) => (
            <div
              key={notif.id}
              className="pointer-events-auto p-3.5 rounded-xl bg-[#1c1f26] border border-[#2a2e39] shadow-2xl flex items-start justify-between gap-3 text-xs"
            >
              <div className="min-w-0 flex-1">
                <h5 className="font-bold text-[#ffffff] mb-0.5 break-words">{notif.title}</h5>
                <p className="text-[#9699a0] break-words">{notif.message}</p>
              </div>
              <button
                onClick={() => dispatch({ type: 'DISMISS_NOTIFICATION', payload: notif.id })}
                className="text-[#9699a0] hover:text-[#ffffff] p-1 cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Connection Status Pill */}
      <ConnectionStatus />

      {/* Mobile Bottom Navigation Bar (Fixed bottom for screens < lg) */}
      <BottomNav onOpenMore={() => setIsMoreOpen(true)} />

      {/* Mobile Drawer (Accessible via hamburger or 'More' tab) */}
      <MoreDrawer isOpen={isMoreOpen} onClose={() => setIsMoreOpen(false)} />
    </div>
  );
};
