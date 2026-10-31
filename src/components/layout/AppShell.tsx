/**
 * AppexQuant Markets Global - Main Application Shell Component
 * Dynamically detects mobile viewports to switch to a mobile-optimized 'bottom-tab' navigation system,
 * completely removes sidebars on mobile, and expands all content panels to full width for touch ergonomics.
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

interface AppShellProps {
  children: ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { state, dispatch, selectedAccount } = useGlobalState();
  const { ticks } = useMarketData();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [utcTime, setUtcTime] = useState('');

  // Mobile viewport detection hook (< 1024px represents mobile & tablet viewports)
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update clock every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().split(' ')[4] || '12:00:00');
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

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

  // Active user / account label
  const activeAccountId = selectedAccount?.id || selectedAccount?.accountNumber || state.user?.derivAccountId || state.user?.loginid;
  const isDemo = state.executionEnvironment === 'DEMO' || activeAccountId?.startsWith('VR');

  // Real-time market data quotes
  const eurUsdQuote = ticks['frxEURUSD']?.quote || 1.08452;
  const btcQuote = ticks['cryBTCUSD']?.quote || 91420.50;
  const vol100Quote = ticks['1HZ100V']?.quote || 4821.10;
  const goldQuote = ticks['frxXAUUSD']?.quote || 2335.80;

  return (
    <div className="min-h-screen lg:h-screen w-screen max-w-full overflow-x-hidden lg:overflow-hidden select-none bg-[#15171e] text-[#ffffff] flex flex-col font-sans antialiased relative">
      {/* Network & System Status Banners */}
      <OfflineBanner />
      <SystemFailSafeBanner />
      <PWAInstallBanner />

      {/* Adaptive Header (Houses brand, environment selector, balance toggle, theme & profile) */}
      <Header onToggleMobileDrawer={() => setIsMoreOpen(true)} />

      {/* Responsive Live Market Ribbon (Single-line touch scroll on mobile, no layout distortion) */}
      <div className="h-9 sm:h-10 bg-[#15171e] border-b border-[#2a2e39] px-3 sm:px-4 flex items-center justify-between text-xs shrink-0 z-20 overflow-x-auto no-scrollbar whitespace-nowrap">
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

      {/* Main Chassis: Switches seamlessly between Desktop Multi-Pane and Mobile Full-Width */}
      <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden w-full relative min-h-0">
        {/* DESKTOP SIDEBAR: Completely removed from DOM when on mobile viewports */}
        {!isMobile && (
          <aside className="w-[240px] shrink-0 h-full bg-[#15171e] border-r border-[#2a2e39] flex flex-col overflow-y-auto no-scrollbar z-10">
            <Sidebar />
          </aside>
        )}

        {/* WORKSPACE CONTENT PANEL: Expands to 100% full width on mobile viewports for optimal touch ergonomics */}
        <main
          className={`flex-1 w-full min-w-0 h-full overflow-y-auto overflow-x-hidden bg-[#15171e] relative ${
            isMobile
              ? 'p-2.5 sm:p-4 pb-24 touch-manipulation'
              : 'p-4 lg:p-6 pb-12 no-scrollbar'
          }`}
        >
          <div className="max-w-[1920px] mx-auto w-full min-w-0">
            {children}
          </div>
        </main>
      </div>

      {/* MOBILE-OPTIMIZED BOTTOM-TAB NAVIGATION: Rendered strictly on mobile/tablet viewports */}
      {isMobile && (
        <BottomNav onOpenMore={() => setIsMoreOpen(true)} />
      )}

      {/* Slide-Up Navigation Menu Drawer (Connected via bottom bar 'Menu' tab or header hamburger) */}
      <MoreDrawer isOpen={isMoreOpen} onClose={() => setIsMoreOpen(false)} />

      {/* Floating Toast Notification Stack */}
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

      {/* System Connection Status Pill */}
      <ConnectionStatus />
    </div>
  );
};
