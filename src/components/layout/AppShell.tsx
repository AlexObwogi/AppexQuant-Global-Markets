/**
 * AppexQuant Markets Global - Global Application Shell Component
 * Geometric Balance Design Theme
 */

import React, { ReactNode, useState, useEffect } from 'react';
import { useGlobalState } from '../../state/GlobalStateContext.js';
import { Header } from './Header.js';
import { Sidebar } from './Sidebar.js';
import { BottomNav } from './BottomNav.js';
import { MoreDrawer } from './MoreDrawer.js';
import { ProductionFooter } from './ProductionFooter.js';
import { OfflineBanner } from '../common/OfflineBanner.js';
import { SystemFailSafeBanner } from '../common/SystemFailSafeBanner.js';
import { PWAInstallPrompt } from '../common/PWAInstallPrompt.js';
import { PWAInstallBanner } from '../common/PWAInstallBanner.js';
import { CinematicBackground } from '../common/CinematicBackground.js';
import { EnvironmentGlobalBanner } from '../common/EnvironmentSelector.js';
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

      {/* Continue in App / Mobile PWA Banner */}
      <PWAInstallBanner />

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

      {/* Dynamic Production Copyright Footer */}
      <ProductionFooter />

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


