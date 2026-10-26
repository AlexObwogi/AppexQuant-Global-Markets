/**
 * AppexQuant Markets Global - Surface Card Component
 * Strictly utilizes CSS variables --bg-elevated, --border-color, and --text-primary.
 */

import React, { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'surface' | 'glass' | 'outline';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'surface',
  padding = 'md',
  className = '',
  id,
  ...props
}) => {
  const cardId = id || `card-${Math.random().toString(36).substring(2, 8)}`;

  const paddings = {
    none: 'p-0',
    sm: 'p-2',
    md: 'p-3',
    lg: 'p-4',
  };

  const variants = {
    surface: 'bg-[var(--bg-elevated)] border-[1px] border-[var(--border-color)] text-[var(--text-primary)] shadow-xs',
    glass: 'bg-[var(--bg-elevated)]/95 backdrop-blur-xs border-[1px] border-[var(--border-color)] text-[var(--text-primary)] shadow-sm',
    outline: 'bg-transparent border-[1px] border-[var(--border-color)] text-[var(--text-primary)]',
  };

  return (
    <div
      id={cardId}
      className={`dashboard-card rounded-lg transition-all ${variants[variant]} ${paddings[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
