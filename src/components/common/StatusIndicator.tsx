import React from 'react';
import { Wifi, RefreshCw, Clock, WifiOff } from 'lucide-react';

export type SystemStatusType = 'LIVE' | 'SYNCING' | 'STALE' | 'OFFLINE';

export interface StatusIndicatorProps {
  status: SystemStatusType;
  showText?: boolean;
  id?: string;
  className?: string;
  label?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  showText = true,
  id,
  className = '',
  label,
}) => {
  const statusId = id || `status-indicator-${Math.random().toString(36).substring(2, 8)}`;

  const config: Record<SystemStatusType, {
    dotColor: string;
    textColor: string;
    bgColor: string;
    borderColor: string;
    text: string;
    icon: React.ReactNode;
  }> = {
    LIVE: {
      dotColor: 'bg-emerald-500 animate-pulse',
      textColor: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      text: 'LIVE',
      icon: <Wifi className="w-3.5 h-3.5 text-emerald-400" />,
    },
    SYNCING: {
      dotColor: 'bg-sky-500 animate-ping',
      textColor: 'text-sky-400',
      bgColor: 'bg-sky-500/10',
      borderColor: 'border-sky-500/20',
      text: 'SYNCING',
      icon: <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin" />,
    },
    STALE: {
      dotColor: 'bg-amber-500',
      textColor: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      text: 'STALE',
      icon: <Clock className="w-3.5 h-3.5 text-amber-400" />,
    },
    OFFLINE: {
      dotColor: 'bg-rose-500',
      textColor: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/20',
      text: 'OFFLINE',
      icon: <WifiOff className="w-3.5 h-3.5 text-rose-400" />,
    },
  };

  const current = config[status] || config.OFFLINE;
  const ariaLabel = label || `System connection status: ${current.text}`;

  return (
    <div
      id={statusId}
      role="status"
      aria-label={ariaLabel}
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-semibold tracking-wider ${current.bgColor} ${current.borderColor} ${current.textColor} ${className}`}
    >
      <span className={`w-2 h-2 rounded-full ${current.dotColor}`} aria-hidden="true" />
      <span aria-hidden="true" className="flex items-center">
        {current.icon}
      </span>
      {showText && <span className="uppercase">{current.text}</span>}
    </div>
  );
};
