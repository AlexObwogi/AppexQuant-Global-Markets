/**
 * AppexQuant Markets Global - Dashboard & OAuth Error Diagnostic View
 * Gracefully displays authentication errors, invalid_client misconfigurations,
 * state expiration, and connection errors with recovery actions and diagnostic tooling.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useGlobalState } from '../state/GlobalStateContext.tsx';
import { useDerivAuth } from '../utils/auth/useDerivAuth.ts';
import { 
  AlertTriangle, 
  ShieldAlert, 
  RefreshCw, 
  ArrowLeft, 
  ExternalLink, 
  CheckCircle2, 
  Copy, 
  Check, 
  KeyRound, 
  Terminal, 
  HelpCircle,
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';
import { Button } from '../components/ui/Button.tsx';
import { AppexQuantLogo } from '../components/common/AppexQuantLogo.tsx';

interface ErrorInfo {
  code: string;
  title: string;
  description: string;
  technicalDetails: string;
  suggestedAction: string;
  docLink?: string;
  severity: 'error' | 'warning' | 'info';
}

export const DashboardErrorView: React.FC = () => {
  const { state, dispatch } = useGlobalState();
  const { initiateRedirect } = useDerivAuth();

  const [copied, setCopied] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Extract error details from query parameters and window location
  const queryParams = useMemo(() => {
    if (typeof window === 'undefined') return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }, []);

  const rawErrorCode = queryParams.get('error') || queryParams.get('auth_error') || queryParams.get('code') || 'OAUTH_ERROR';
  const rawErrorMessage = queryParams.get('message') || queryParams.get('error_description') || queryParams.get('error_detail') || '';
  const rawState = queryParams.get('state') || '';

  // Classify and diagnose the specific error
  const errorInfo: ErrorInfo = useMemo(() => {
    const codeUpper = rawErrorCode.toUpperCase();
    const msgLower = (rawErrorMessage || '').toLowerCase();

    if (codeUpper === 'INVALID_CLIENT' || msgLower.includes('client does not exist') || msgLower.includes('invalid_client')) {
      return {
        code: 'INVALID_CLIENT',
        title: 'Deriv OAuth: Client Does Not Exist',
        description: 'Deriv rejected the authorization request because the specified OAuth Client ID is not registered or was provided as an empty identifier.',
        technicalDetails: `Deriv API Endpoint returned: invalid_client ("Client does not exist"). Registered OAuth Client ID must be configured in deployment settings.`,
        suggestedAction: 'Ensure DERIV_OAUTH_CLIENT_ID is configured in your deployment environment variables.',
        docLink: 'https://api.deriv.com/apps/',
        severity: 'error',
      };
    }

    if (codeUpper === 'INVALID_STATE' || codeUpper === 'STATE_MISMATCH' || msgLower.includes('state')) {
      return {
        code: 'INVALID_STATE',
        title: 'OAuth PKCE Session Expired',
        description: 'The security verification state expired or was blocked by browser cross-site cookie restrictions.',
        technicalDetails: 'PKCE state parameter mismatch or cookie timeout (>10 minutes). Stored transaction could not be reconciled with the callback request.',
        suggestedAction: 'Click "Try Again" to regenerate fresh high-entropy PKCE credentials and restart authentication.',
        severity: 'warning',
      };
    }

    if (codeUpper === 'ACCESS_DENIED' || msgLower.includes('denied') || msgLower.includes('cancelled')) {
      return {
        code: 'ACCESS_DENIED',
        title: 'Authorization Cancelled',
        description: 'You declined or cancelled the permission request on the Deriv OAuth confirmation screen.',
        technicalDetails: 'Deriv OAuth flow returned error=access_denied with no token granted.',
        suggestedAction: 'Grant the required "trade" and "account_manage" permissions when prompted by Deriv to access quantitative trading tools.',
        severity: 'info',
      };
    }

    if (codeUpper === 'TOKEN_FAILED' || msgLower.includes('token') || msgLower.includes('exchange')) {
      return {
        code: 'TOKEN_EXCHANGE_FAILED',
        title: 'Deriv Token Exchange Failed',
        description: 'The authorization code could not be exchanged with Deriv token servers.',
        technicalDetails: rawErrorMessage || 'Server-side authorization exchange returned non-200 or invalid payload.',
        suggestedAction: 'Verify that your callback URL (e.g. /api/auth/deriv/callback) is registered in your Deriv App settings.',
        docLink: 'https://api.deriv.com/apps/',
        severity: 'error',
      };
    }

    if (codeUpper === 'NETWORK_FAILURE' || msgLower.includes('websocket') || msgLower.includes('network')) {
      return {
        code: 'NETWORK_FAILURE',
        title: 'Broker Connection Unavailable',
        description: 'Unable to establish secure WebSocket handshake with Deriv market streaming endpoints.',
        technicalDetails: rawErrorMessage || 'WebSocket connection timed out or closed during authorize handshake.',
        suggestedAction: 'Check your internet connection and verify that wss://ws.derivws.com is accessible from your network.',
        severity: 'warning',
      };
    }

    return {
      code: rawErrorCode,
      title: 'Authentication & Dashboard Notice',
      description: rawErrorMessage || 'An issue occurred while validating credentials or loading the requested workspace view.',
      technicalDetails: `Error Code: ${rawErrorCode}\nDetail: ${rawErrorMessage || 'No specific description provided by broker.'}\nURL: ${typeof window !== 'undefined' ? window.location.href : ''}`,
      suggestedAction: 'Return to the dashboard or restart authentication with a fresh session.',
      severity: 'error',
    };
  }, [rawErrorCode, rawErrorMessage]);

  const handleCopyDiagnostics = () => {
    const report = JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        error: errorInfo.code,
        title: errorInfo.title,
        message: rawErrorMessage,
        state: rawState,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        url: typeof window !== 'undefined' ? window.location.href : '',
      },
      null,
      2
    );

    navigator.clipboard.writeText(report).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleRetryDefault = () => {
    if (typeof window !== 'undefined') {
      // Clear stale verification tokens and cookies
      try {
        localStorage.removeItem('deriv_pkce_verifier');
        sessionStorage.removeItem('deriv_pkce_verifier');
      } catch {}
      // Trigger login gateway with fallback
      window.location.href = '/api/auth/deriv/login?action=connect&destination=/';
    }
  };

  const handleReturnHome = () => {
    dispatch({ type: 'SET_ROUTE', payload: 'landing' });
    if (typeof window !== 'undefined' && window.history) {
      window.history.pushState({}, '', '/');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Top Breadcrumb & Status */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <button
          onClick={handleReturnHome}
          className="inline-flex items-center gap-2 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Command Center</span>
        </button>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
          <span>Status: {errorInfo.code}</span>
        </div>
      </div>

      {/* Main Error Container Card */}
      <div className="rounded-2xl border border-border-color bg-bg-surface p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        {/* Accent Top Gradient Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-amber-500 to-sky-500" />

        <div className="flex flex-col sm:flex-row items-start gap-5">
          <div className="p-3.5 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
              {errorInfo.title}
            </h1>
            <p className="text-sm text-text-secondary leading-relaxed">
              {errorInfo.description}
            </p>
          </div>
        </div>

        {/* Actionable Resolution Guidance */}
        <div className="mt-6 p-4 rounded-xl bg-bg-elevated/80 border border-border-color/80 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-accent-primary uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Recommended Resolution</span>
          </div>
          <p className="text-xs text-text-primary leading-relaxed font-medium">
            {errorInfo.suggestedAction}
          </p>

          {errorInfo.docLink && (
            <div className="pt-2">
              <a
                href={errorInfo.docLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors"
              >
                <span>Deriv Developer Portal & App Registration</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button
            onClick={handleRetryDefault}
            variant="primary"
            size="md"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reconnect Deriv Account</span>
          </Button>

          <Button
            onClick={handleReturnHome}
            variant="secondary"
            size="md"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return Home</span>
          </Button>

          <Button
            onClick={() => setShowDiagnostics((prev) => !prev)}
            variant="ghost"
            size="md"
            className="flex items-center gap-2 text-xs text-text-secondary"
          >
            <Terminal className="w-4 h-4" />
            <span>{showDiagnostics ? 'Hide Technical Details' : 'View Diagnostics'}</span>
          </Button>
        </div>

        {/* Technical Diagnostics Collapsible Section */}
        {showDiagnostics && (
          <div className="mt-6 pt-6 border-t border-border-color space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-text-secondary uppercase">Technical Diagnostics Log</span>
              <button
                onClick={handleCopyDiagnostics}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-bg-elevated hover:bg-bg-hover text-text-secondary hover:text-text-primary border border-border-color transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied to Clipboard' : 'Copy Log'}</span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-black/50 border border-border-color/50 font-mono text-[11px] text-sky-300 leading-relaxed overflow-x-auto space-y-1.5">
              <div><span className="text-slate-500">Timestamp:</span> {new Date().toISOString()}</div>
              <div><span className="text-slate-500">Error Code:</span> <span className="text-rose-400">{errorInfo.code}</span></div>
              <div><span className="text-slate-500">Raw Message:</span> {rawErrorMessage || '(None)'}</div>
              <div><span className="text-slate-500">Technical Details:</span> {errorInfo.technicalDetails}</div>
              <div><span className="text-slate-500">State Token:</span> {rawState ? `${rawState.slice(0, 8)}...` : '(None)'}</div>
            </div>
          </div>
        )}
      </div>

      {/* Troubleshooting Tips Grid */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-bg-surface border border-border-color space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-text-primary">
            <KeyRound className="w-4 h-4 text-sky-400" />
            <span>Deriv OAuth Client ID</span>
          </div>
          <p className="text-[11px] text-text-secondary leading-relaxed">
            Configure your registered <code className="text-sky-400 font-mono">DERIV_OAUTH_CLIENT_ID</code> in environment variables.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-bg-surface border border-border-color space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-text-primary">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Redirect URI Matching</span>
          </div>
          <p className="text-[11px] text-text-secondary leading-relaxed">
            Ensure your app callback URL <code className="text-emerald-400 font-mono">/api/auth/deriv/callback</code> is listed in your Deriv OAuth application settings.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-bg-surface border border-border-color space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-text-primary">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>Public Market Data</span>
          </div>
          <p className="text-[11px] text-text-secondary leading-relaxed">
            Synthetic indices, volatility indices, and charts stream continuously even if private account login is not yet completed.
          </p>
        </div>
      </div>
    </div>
  );
};
