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
    success: 'bg-color-success/15 text-color-success border border-color-success/25',
    danger: 'bg-color-danger/15 text-color-danger border border-color-danger/25',
    warning: 'bg-color-warning/15 text-color-warning border border-color-warning/25',
    info: 'bg-color-info/15 text-color-info border border-color-info/25',
    accent: 'bg-accent-primary/15 text-accent-primary border border-accent-primary/25',
    neutral: 'bg-bg-secondary text-text-secondary border border-border-color',
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
