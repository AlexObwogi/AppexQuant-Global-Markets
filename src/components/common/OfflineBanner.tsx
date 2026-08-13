/**
 * AppexQuant Markets Global - Professional Connection Status Banner
 * Complies with Rule 1 of production hardening (no raw technical/debug errors).
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
        isOffline ? 'bg-amber-500/10 text-amber-500 border-b border-amber-500/20' : 'bg-bg-hover text-text-secondary border-b border-border-color'
      }`}
    >
      {isOffline ? <WifiOff className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
      <span>
        {isOffline
          ? 'Market data is temporarily unavailable.'
          : 'Broker connection required for live order execution.'}
      </span>
    </div>
  );
};
