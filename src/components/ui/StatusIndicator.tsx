/**
 * AppexQuant Markets Global - Connection Status Indicator Component
 * Reusable across broker connections and global network status.
 */

import React from 'react';
import { ConnectionStatus } from '../../types/market.js';
import { Wifi, WifiOff, AlertTriangle, RefreshCw } from 'lucide-react';

export interface StatusIndicatorProps {
  status: ConnectionStatus;
  showText?: boolean;
  id?: string;
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  showText = true,
  id,
  className = '',
}) => {
  const statusId = id || `status-${Math.random().toString(36).substring(2, 8)}`;

  const config = {
    ONLINE: {
      color: 'bg-emerald-500',
      text: 'Broker Connected',
      textShort: 'ONLINE',
      bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      icon: <Wifi className="w-3.5 h-3.5" />,
    },
    DEGRADED: {
      color: 'bg-amber-500',
      text: 'Broker Disconnected (Ready)',
      textShort: 'DEGRADED',
      bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
    },
    OFFLINE: {
      color: 'bg-rose-500',
      text: 'Connection Lost (Offline)',
      textShort: 'OFFLINE',
      bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      icon: <WifiOff className="w-3.5 h-3.5" />,
    },
    RECONNECTING: {
      color: 'bg-sky-500 animate-pulse',
      text: 'Reconnecting...',
      textShort: 'RECONNECTING',
      bg: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
      icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" />,
    },
  };

  const item = config[status] || config.OFFLINE;

  return (
    <div
      id={statusId}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${item.bg} ${className}`}
    >
      <span className={`w-2 h-2 rounded-full ${item.color}`} />
      {item.icon}
      {showText && <span>{item.text}</span>}
    </div>
  );
};
