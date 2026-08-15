/**
 * AppexQuant Markets Global - Service Health Status Badge
 */

import React from 'react';
import { HealthStatus } from '../../types/health.ts';
import { CheckCircle2, AlertTriangle, AlertCircle, XCircle, PowerOff } from 'lucide-react';

interface ServiceStatusBadgeProps {
  status: HealthStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  pulse?: boolean;
}

export const ServiceStatusBadge: React.FC<ServiceStatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
  pulse = true,
}) => {
  const getBadgeStyle = () => {
    switch (status) {
      case 'HEALTHY':
        return {
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          dot: 'bg-emerald-400',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
        };
      case 'DEGRADED':
        return {
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          dot: 'bg-amber-400',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
        };
      case 'WARNING':
        return {
          bg: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
          dot: 'bg-orange-400',
          icon: <AlertCircle className="w-3.5 h-3.5 text-orange-400" />,
        };
      case 'CRITICAL':
        return {
          bg: 'bg-rose-500/15 text-rose-400 border-rose-500/40',
          dot: 'bg-rose-500',
          icon: <XCircle className="w-3.5 h-3.5 text-rose-400" />,
        };
      case 'OFFLINE':
      default:
        return {
          bg: 'bg-bg-hover text-text-secondary border-border-color',
          dot: 'bg-slate-500',
          icon: <PowerOff className="w-3.5 h-3.5 text-text-secondary" />,
        };
    }
  };

  const config = getBadgeStyle();

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 font-mono font-bold rounded-md',
    md: 'text-xs px-2.5 py-1 font-mono font-bold rounded-lg',
    lg: 'text-sm px-3.5 py-1.5 font-mono font-extrabold rounded-xl',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 border ${config.bg} ${sizeClasses[size]}`}>
      {pulse && (status === 'HEALTHY' || status === 'CRITICAL') ? (
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.dot} opacity-75`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dot}`} />
        </span>
      ) : showIcon ? (
        config.icon
      ) : null}
      <span>{status}</span>
    </span>
  );
};
