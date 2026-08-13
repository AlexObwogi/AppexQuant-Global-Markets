/**
 * AppexQuant Markets Global - Safe Error Display Component
 * Displays user-friendly error with APX correlation ID (Rule 26) without leaking stack traces.
 */

import React from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  requestId?: string;
  onRetry?: () => void;
  id?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Application Error',
  message = 'An unexpected error occurred while processing your request.',
  requestId = 'APX-UNKNOWN',
  onRetry,
  id,
}) => {
  const errId = id || `err-${Math.random().toString(36).substring(2, 8)}`;

  return (
    <Card id={errId} className="border-rose-500/30 bg-rose-500/5 p-6 text-center">
      <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 mb-3">
        <AlertOctagon className="w-6 h-6" />
      </div>
      <h3 className="text-base font-bold text-slate-100 mb-1">{title}</h3>
      <p className="text-xs sm:text-sm text-text-primary mb-3 max-w-md mx-auto">{message}</p>
      
      <div className="inline-block bg-bg-surface border border-border-color rounded-lg px-3 py-1 text-xs text-text-secondary font-mono mb-4">
        Reference: <span className="text-sky-400 font-semibold">{requestId}</span>
      </div>

      {onRetry && (
        <div>
          <Button onClick={onRetry} size="sm" variant="secondary" className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            Try Again
          </Button>
        </div>
      )}
    </Card>
  );
};
