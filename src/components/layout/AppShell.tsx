/**
 * AppexQuant Markets Global - Global Application Shell Component
 * Geometric Balance Design Theme
 */

import React, { ReactNode, useState, useEffect } from 'react';
import { useGlobalState } from '../../state/GlobalStateContext';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { MoreDrawer } from './MoreDrawer';
import { OfflineBanner } from '../common/OfflineBanner';
import { SystemFailSafeBanner } from '../common/SystemFailSafeBanner';
import { PWAInstallPrompt } from '../common/PWAInstallPrompt';
import { CinematicBackground } from '../common/CinematicBackground';
import { EnvironmentGlobalBanner } from '../common/EnvironmentSelector';
import { X } from 'lucide-react';

interface AppShellProps {
  children: ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { state, dispatch } = useGlobalState();
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

  return (
    <div className="relative min-h-screen bg-bg-main text-text-primary flex flex-col font-sans selection:bg-accent-primary/30 selection:text-text-primary w-full overflow-hidden">
      {/* Ambient Visual Background Canvas */}
      <CinematicBackground />

      {/* Offline / Degraded Network Banner */}
      <OfflineBanner />

      {/* Adaptive Header */}
      <Header onToggleMobileDrawer={() => setIsMoreOpen(true)} />

      {/* Global Environment Banner (DEMO | PAPER | LIVE) */}
      <EnvironmentGlobalBanner />

      {/* Global Fail-Safe Status Banner */}
      <SystemFailSafeBanner />

      {/* Main Body Layout */}
      <div className="flex-1 flex w-full max-w-[2560px] mx-auto overflow-hidden relative">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Primary View Area */}
        <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:pb-8 overflow-x-hidden overflow-y-auto flex flex-col bg-bg-main w-full min-w-0 relative">
          <div className="max-w-[2560px] mx-auto w-full min-w-0">
            {children}
          </div>
        </main>
      </div>

      {/* Bottom Status Bar */}
      <footer className="hidden md:flex h-8 bg-bg-nav border-t border-border-color px-4 lg:px-8 items-center justify-between text-[10px] text-text-secondary tracking-widest shrink-0 sticky bottom-0 z-20 w-full">
        <div className="flex space-x-4 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-color-success" />
            <span className="uppercase text-[9px] sm:text-[10px] hidden lg:inline">PWA Service Worker: ACTIVE</span>
            <span className="uppercase text-[9px] lg:hidden">PWA: ACTIVE</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-color-success" />
            <span className="uppercase text-[9px] sm:text-[10px] hidden lg:inline">Environment: PRODUCTION-READY</span>
            <span className="uppercase text-[9px] lg:hidden">ENV: PROD</span>
          </div>
        </div>
        <div className="flex space-x-4 lg:space-x-6 font-mono text-[9px] sm:text-[10px]">
          <span>UTC: {utcTime}</span>
          <span className="text-text-muted">SESS-ID: APX-9941-XJ</span>
        </div>
      </footer>

      {/* Toast Notifications Overlay */}
      {state.notifications.length > 0 && (
        <div className="fixed top-20 right-4 z-50 space-y-2 max-w-[calc(100vw-2rem)] sm:max-w-sm w-full pointer-events-none">
          {state.notifications.map((notif) => (
            <div
              key={notif.id}
              className="pointer-events-auto p-4 rounded-xl bg-bg-elevated border border-border-color shadow-2xl flex items-start justify-between gap-3 text-xs"
            >
              <div className="min-w-0 flex-1">
                <h5 className="font-bold text-text-primary mb-0.5 break-words">{notif.title}</h5>
                <p className="text-text-secondary break-words">{notif.message}</p>
              </div>
              <button
                onClick={() => dispatch({ type: 'DISMISS_NOTIFICATION', payload: notif.id })}
                className="text-text-muted hover:text-text-primary p-1 cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* PWA Installation Prompt Banner */}
      <PWAInstallPrompt />

      {/* Mobile Adaptive Bottom Navigation */}
      <BottomNav onOpenMore={() => setIsMoreOpen(true)} />

      {/* Mobile Drawer */}
      <MoreDrawer isOpen={isMoreOpen} onClose={() => setIsMoreOpen(false)} />
    </div>
  );
};


