/**
 * AppexQuant Markets Global - Badge & Tag Component
 */

import React, { ReactNode } from 'react';

export interface BadgeProps {
  children: ReactNode;
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'accent';
  size?: 'sm' | 'md';
  id?: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  id,
  className = '',
}) => {
  const badgeId = id || `badge-${Math.random().toString(36).substring(2, 8)}`;

  const variants = {
    success: 'bg-[#0ECB81]/10 text-[#03A66D] border border-[#0ECB81]/20 dark:bg-[#0ECB81]/15 dark:text-[#0ECB81] dark:border-[#0ECB81]/25',
    danger: 'bg-[#F6465D]/10 text-[#CF304A] border border-[#F6465D]/20 dark:bg-[#F6465D]/15 dark:text-[#F6465D] dark:border-[#F6465D]/25',
    warning: 'bg-[#F0B90B]/10 text-[#C99400] border border-[#F0B90B]/20 dark:bg-[#F0B90B]/15 dark:text-[#F0B90B] dark:border-[#F0B90B]/25',
    info: 'bg-[#38BDF8]/10 text-[#0284C7] border border-[#38BDF8]/20 dark:bg-[#38BDF8]/15 dark:text-[#38BDF8] dark:border-[#38BDF8]/25',
    accent: 'bg-[#FCD535]/10 text-[#C99400] border border-[#FCD535]/20 dark:bg-[#FCD535]/15 dark:text-[#FCD535] dark:border-[#FCD535]/25',
    neutral: 'bg-[#F5F5F5] text-[#707A8A] border border-[#EAECEF] dark:bg-[#2B3139] dark:text-[#848E9C] dark:border-[#2B3139]',
  };

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5 font-semibold rounded-full',
    md: 'text-xs px-2.5 py-0.5 font-semibold rounded-full',
  };

  return (
    <span
      id={badgeId}
      className={`inline-flex items-center gap-1 whitespace-nowrap ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </span>
  );
};
