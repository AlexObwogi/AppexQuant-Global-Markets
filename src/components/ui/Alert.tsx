/**
 * AppexQuant Markets Global - Alert, Tooltip, Skeleton Components
 */

import React, { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

export interface AlertProps {
  type?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  children: ReactNode;
  id?: string;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({ type = 'info', title, children, id, className = '' }) => {
  const alertId = id || `alert-${Math.random().toString(36).substring(2, 8)}`;

  const styles = {
    info: {
      border: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
      icon: <Info className="w-5 h-5 text-sky-400 shrink-0" />,
    },
    success: {
      border: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    },
    warning: {
      border: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
    },
    danger: {
      border: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
      icon: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
    },
  };

  return (
    <div
      id={alertId}
      className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${styles[type].border} ${className}`}
    >
      {styles[type].icon}
      <div className="flex-1">
        {title && <h4 className="font-semibold text-slate-100 mb-0.5">{title}</h4>}
        <div className="text-text-primary text-xs sm:text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  );
};

export interface SkeletonProps {
  className?: string;
  id?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', id }) => {
  const skelId = id || `skel-${Math.random().toString(36).substring(2, 8)}`;
  return <div id={skelId} className={`animate-pulse bg-bg-hover/80 rounded-lg ${className}`} />;
};

export interface TooltipProps {
  content: string;
  children: ReactNode;
  id?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, id }) => {
  const tooltipId = id || `tooltip-${Math.random().toString(36).substring(2, 8)}`;
  return (
    <div id={tooltipId} className="group relative inline-block">
      {children}
      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-30 px-2.5 py-1 bg-bg-surface border border-border-color text-slate-200 text-xs rounded-md shadow-xl whitespace-nowrap pointer-events-none">
        {content}
      </div>
    </div>
  );
};
