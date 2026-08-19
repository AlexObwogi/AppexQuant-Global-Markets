import React, { useState, useEffect } from 'react';
import { derivAuthService } from '../../services/deriv/authService.ts';
import { derivWs } from '../../services/deriv/DerivWebSocketManager.ts';
import { useGlobalState } from '../../state/GlobalStateContext.tsx';

export const ConnectionStatus: React.FC = () => {
  const { state } = useGlobalState();
  const [wsState, setWsState] = useState<string>(derivWs.getConnectionState());

  useEffect(() => {
    const unsub = derivWs.onStatusChange((s) => setWsState(s));
    return unsub;
  }, []);

  const isWsConnected = wsState === 'CONNECTED' || derivWs.getConnectionState() === 'CONNECTED';
  const isActive = state.session.isAuthenticated && isWsConnected;

  return (
    <div
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex items-center justify-center p-2 rounded-full bg-slate-100 dark:bg-[#1C2127]/90 border border-slate-200 dark:border-[#2B3139]/80 shadow-lg backdrop-blur-sm"
      title={isActive ? 'Active Authorized Session (Online)' : 'Offline / Disconnected'}
    >
      <span
        className={`w-3 h-3 rounded-full transition-all duration-300 ${
          isActive
            ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.7)] animate-pulse'
            : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)]'
        }`}
      />
    </div>
  );
};
