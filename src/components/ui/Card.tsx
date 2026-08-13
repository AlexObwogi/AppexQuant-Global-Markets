/**
 * AppexQuant Markets Global - Surface Card Component
 * Adheres to financial One UI / iOS anti-slop principles.
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
    sm: 'p-2 sm:p-3',
    md: 'p-4 sm:p-4',
    lg: 'p-5 sm:p-6',
  };

  const variants = {
    surface: 'bg-white border border-[#EAECEF] text-[#1E2329] dark:bg-[#181A20] dark:border-[#2B3139] dark:text-[#EAECEF]',
    glass: 'bg-[#FFFFFF]/95 dark:bg-[#181A20]/95 border border-[#EAECEF] dark:border-[#2B3139] text-[#1E2329] dark:text-[#EAECEF] shadow-sm',
    outline: 'bg-transparent border border-[#EAECEF] dark:border-[#2B3139] text-[#1E2329] dark:text-[#EAECEF]',
  };

  return (
    <div
      id={cardId}
      className={`rounded-xl transition-all ${variants[variant]} ${paddings[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
