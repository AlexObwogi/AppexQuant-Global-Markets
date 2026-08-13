import React from 'react';

export type StatusType = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface StatusPillProps {
  label: string;
  type?: StatusType;
  subtext?: string;
  size?: 'sm' | 'md';
  pulse?: boolean;
  className?: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({
  label,
  type = 'neutral',
  subtext,
  size = 'md',
  pulse = false,
  className = '',
}) => {
  const typeStyles: Record<StatusType, { bg: string; dot: string }> = {
    success: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25 dark:border-emerald-500/30',
      dot: 'bg-emerald-500',
    },
    warning: {
      bg: 'bg-amber-500/10 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25 dark:border-amber-500/30',
      dot: 'bg-amber-500',
    },
    danger: {
      bg: 'bg-rose-500/10 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/25 dark:border-rose-500/30',
      dot: 'bg-rose-500',
    },
    info: {
      bg: 'bg-sky-500/10 dark:bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/25 dark:border-sky-500/30',
      dot: 'bg-sky-500',
    },
    neutral: {
      bg: 'bg-slate-500/10 dark:bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/25 dark:border-slate-500/30',
      dot: 'bg-slate-400',
    },
  };

  const style = typeStyles[type];
  const padding = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${padding} ${style.bg} ${className}`}
      title={subtext}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot} ${
          pulse ? 'animate-pulse' : ''
        }`}
      />
      <span>{label}</span>
    </span>
  );
};
