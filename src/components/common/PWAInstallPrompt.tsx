/**
 * AppexQuant Markets Global - Progressive Web App (PWA) Install Banner
 * Captures beforeinstallprompt event and allows 1-click PWA desktop/mobile installation.
 */

import React, { useEffect, useState } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { Card } from '../ui/Card.js';
import { Button } from '../ui/Button.js';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  if (!isVisible) return null;

  return (
    <div id="pwa-install-banner" className="fixed bottom-20 sm:bottom-6 right-4 left-4 sm:left-auto sm:max-w-md z-40">
      <Card variant="glass" className="p-4 border-sky-500/40 shadow-2xl bg-[#131822]/95">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/15 text-sky-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-100">Install AppexQuant PWA</h4>
              <p className="text-xs text-text-primary mt-0.5">
                Add to home screen for direct standalone access and fast offline trading shell performance.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="text-text-secondary hover:text-slate-200 p-1 rounded-lg"
            aria-label="Dismiss PWA install"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-border-color">
          <Button size="sm" variant="ghost" onClick={() => setIsVisible(false)}>
            Later
          </Button>
          <Button size="sm" variant="primary" onClick={handleInstallClick} className="gap-1.5">
            <Download className="w-3.5 h-3.5" />
            Install App
          </Button>
        </div>
      </Card>
    </div>
  );
};
