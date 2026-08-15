/**
 * AppexQuant Markets Global - Reusable Empty State Component
 * Rule 24: Every empty state MUST explain:
 * 1. What is missing
 * 2. Why it matters
 * 3. What the user can do next
 */

import React, { ReactNode } from 'react';
import { Card } from './Card.tsx';
import { Button } from './Button.tsx';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  whatIsMissing: string;
  whyItMatters: string;
  actionText?: string;
  onAction?: () => void;
  id?: string;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  whatIsMissing,
  whyItMatters,
  actionText,
  onAction,
  id,
  className = '',
}) => {
  const emptyId = id || `empty-${Math.random().toString(36).substring(2, 8)}`;

  return (
    <Card id={emptyId} className={`text-center py-8 px-6 border-dashed border-border-color ${className}`}>
      {icon && <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-2xl bg-bg-hover/80 text-sky-400 mb-4">{icon}</div>}
      <h3 className="text-base font-bold text-slate-100 mb-2">{title}</h3>
      <p className="text-xs sm:text-sm text-text-primary max-w-md mx-auto mb-1">
        <span className="font-semibold text-slate-200">Missing: </span>
        {whatIsMissing}
      </p>
      <p className="text-xs text-text-secondary max-w-md mx-auto mb-5 leading-relaxed">
        <span className="font-semibold text-text-primary">Why it matters: </span>
        {whyItMatters}
      </p>
      {actionText && onAction && (
        <Button onClick={onAction} size="sm" variant="primary">
          {actionText}
        </Button>
      )}
    </Card>
  );
};
