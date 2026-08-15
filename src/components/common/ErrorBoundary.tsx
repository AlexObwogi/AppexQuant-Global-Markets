/**
 * AppexQuant Markets Global - React Error Boundary
 * Catches application render failures safely and displays APX correlation reference.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorState } from '../ui/ErrorState.tsx';
import { createCorrelationId } from '../../types/api.ts';
import { logger } from '../../observability/logger.ts';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  requestId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      requestId: '',
    };
  }

  public static getDerivedStateFromError(): State {
    return {
      hasError: true,
      requestId: createCorrelationId(),
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('React Component Error caught by boundary', {
      error: error.message,
      componentStack: errorInfo.componentStack,
      requestId: this.state.requestId,
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, requestId: '' });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center p-6 text-slate-100">
          <div className="w-full max-w-md">
            <ErrorState
              title="Application Render Exception"
              message="AppexQuant encountered an unexpected visual rendering state. The error details have been safely captured."
              requestId={this.state.requestId}
              onRetry={this.handleReset}
            />
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
