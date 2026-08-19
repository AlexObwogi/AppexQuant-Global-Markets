/**
 * AppexQuant Markets Global - Connection Status Indicator Component
 * Reusable across broker connections and global network status.
 */

import React from 'react';
import { ConnectionStatus } from '../../types/market.ts';

export interface StatusIndicatorProps {
  status: ConnectionStatus;
  showText?: boolean;
  id?: string;
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  id,
  className = '',
}) => {
  const statusId = id || `status-${Math.random().toString(36).substring(2, 8)}`;
  const isConnected = status === 'ONLINE';
  const isConnecting = status === 'RECONNECTING' || status === 'DEGRADED';

  return (
    <div
      id={statusId}
      className={`inline-flex items-center justify-center p-1.5 rounded-full border bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/60 ${className}`}
      title={isConnected ? 'Active' : isConnecting ? 'Connecting' : 'Offline'}
    >
      <span
        className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
          isConnected
            ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse'
            : isConnecting
            ? 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)] animate-pulse'
            : 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.5)]'
        }`}
      />
    </div>
  );
};

