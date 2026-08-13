/**
 * AppexQuant Markets Global - Degraded / Offline Network Banner
 * Warns users when data is offline/stale (Rule 18).
 */

import React from 'react';
import { useGlobalState } from '../../state/GlobalStateContext';
import { WifiOff, AlertTriangle } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const { state } = useGlobalState();

  if (state.connectionStatus === 'ONLINE') {
    return null;
  }

  const isOffline = state.connectionStatus === 'OFFLINE';

  return (
    <div
      id="offline-banner"
      className={`w-full py-2 px-4 text-xs font-semibold flex items-center justify-center gap-2 transition-colors z-40 ${
        isOffline ? 'bg-rose-500/20 text-rose-300 border-b border-rose-500/30' : 'bg-amber-500/15 text-amber-300 border-b border-amber-500/30'
      }`}
    >
      {isOffline ? <WifiOff className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
      <span>
        {isOffline
          ? 'Network Disconnected — AppexQuant is operating in offline mode. Live financial data is stale.'
          : 'Broker Disconnected — Connect a trading account to receive real-time market updates.'}
      </span>
    </div>
  );
};
