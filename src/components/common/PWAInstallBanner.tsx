/**
 * AppexQuant Markets Global - Continue in App / Mobile PWA Banner
 * Mimics top-tier exchange browser visit prompt ("Trade faster with the AppexQuant PWA").
 */

import React, { useState, useEffect } from 'react';
import { Smartphone, X, Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already running standalone PWA
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsStandalone(isStandaloneMode);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  if (isStandalone || isDismissed) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsDismissed(true);
      }
      setDeferredPrompt(null);
    } else {
      // Fallback instruction for iOS / browsers without direct prompt
      alert('To install AppexQuant on your device, tap the Share button in your browser and select "Add to Home Screen".');
    }
  };

  return (
    <div className="bg-gradient-to-r from-accent-primary/20 via-bg-surface to-accent-primary/10 border-b border-accent-primary/30 px-3 py-2 flex items-center justify-between text-xs text-text-primary z-40 relative">
      <div className="flex items-center gap-2.5 overflow-hidden">
        <div className="p-1.5 rounded-lg bg-accent-primary/20 text-accent-primary shrink-0">
          <Smartphone className="w-4 h-4" />
        </div>
        <div className="truncate">
          <span className="font-bold">Trade faster with the AppexQuant PWA</span>
          <span className="hidden sm:inline text-text-secondary ml-1.5">— Instant offline shell, biometric security & zero browser lag.</span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleInstallClick}
          className="px-3 py-1 bg-accent-primary text-bg-main font-bold rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1 text-[11px] cursor-pointer shadow-sm"
        >
          <Download className="w-3 h-3" />
          <span>Continue in App</span>
        </button>
        <button
          onClick={() => setIsDismissed(true)}
          className="text-text-secondary hover:text-text-primary p-1 rounded transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
