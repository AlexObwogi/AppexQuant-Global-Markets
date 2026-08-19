import React, { useState, useEffect } from 'react';
import { useMarketData } from '../../state/MarketDataContext.tsx';
import { derivAuthService } from '../../services/deriv/authService.ts';

export const DerivConnectionStatus: React.FC = () => {
  const { connectionState } = useMarketData();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(Boolean(derivAuthService.getToken()));

  useEffect(() => {
    // We could listen to auth state changes here if available,
    // or just rely on re-renders, but since authService isn't fully reactive,
    // we'll check it in an interval or rely on local storage / component re-mounts.
    const interval = setInterval(() => {
      const currentAuth = Boolean(derivAuthService.getToken());
      if (currentAuth !== isAuthenticated) {
        setIsAuthenticated(currentAuth);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const isActive = connectionState === 'CONNECTED' && isAuthenticated;

  return (
    <div
      className="flex items-center justify-center p-1.5 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shadow-xs"
      title={isActive ? 'Active' : 'Offline'}
    >
      <span
        className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-all duration-300 ${
          isActive
            ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
            : 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.5)]'
        }`}
      />
    </div>
  );
};

