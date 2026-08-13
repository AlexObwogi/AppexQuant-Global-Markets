/**
 * AppexQuant Markets Global - Seamless Deriv OAuth 2.0 Connection Modal
 * Zero manual tokens or PATs. High-contrast, mobile-responsive OAuth flow with partner attribution.
 */

import React, { useState, useEffect } from 'react';
import { useGlobalState } from '../../state/GlobalStateContext';
import { useApiFetch } from '../../utils/apiFetch';
import { ShieldCheck, ExternalLink, RefreshCw, Unplug, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { StatusPill } from '../ui/StatusPill';

interface ConnectionMeta {
  connected: boolean;
  derivAccountId?: string;
  accountType?: 'demo' | 'real';
  currency?: string;
  connectionStatus: 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'RECONNECT_REQUIRED' | 'ERROR';
  scopes?: string[];
  lastSyncedAt?: string;
}

export const DerivConnectionModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { dispatch } = useGlobalState();
  const apiFetch = useApiFetch();
  const [meta, setMeta] = useState<ConnectionMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [connectStep, setConnectStep] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch connection status on mount
  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch('/api/auth/deriv/status');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setMeta(json.data);
          if (json.data.connected) {
            dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'ONLINE' });
          }
        }
      }
    } catch {
      setErrorMessage('Unable to communicate with authentication service.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Initiate OAuth login flow (Connect or Create Account)
  const handleInitiateOAuth = (action: 'connect' | 'signup') => {
    setErrorMessage(null);
    setConnectStep('Connecting to Deriv...');

    setTimeout(() => {
      setConnectStep('Authorizing account...');
      setTimeout(() => {
        setConnectStep('Securing connection...');
        setTimeout(() => {
          // Direct browser redirect to backend OAuth endpoint
          window.location.href = `/api/auth/deriv/login?action=${action}&destination=${encodeURIComponent(window.location.pathname)}`;
        }, 300);
      }, 300);
    }, 300);
  };

  // Sync Deriv Connection
  const handleSync = async () => {
    setIsSyncing(true);
    setErrorMessage(null);
    try {
      const res = await apiFetch('/api/auth/deriv/sync', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setMeta(json.data);
          dispatch({
            type: 'ADD_NOTIFICATION',
            payload: {
              title: 'Account Synchronized',
              message: 'Your Deriv account balance and trading permissions are up-to-date.',
              type: 'success',
            },
          });
        }
      }
    } catch {
      setErrorMessage('Failed to sync account state.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Disconnect Deriv Connection
  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    setErrorMessage(null);
    try {
      const res = await apiFetch('/api/auth/deriv/disconnect', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setMeta({
            connected: false,
            connectionStatus: 'DISCONNECTED',
          });
          dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'OFFLINE' });
          dispatch({
            type: 'ADD_NOTIFICATION',
            payload: {
              title: 'Deriv Disconnected',
              message: 'Your Deriv connection has been securely removed.',
              type: 'info',
            },
          });
        }
      }
    } catch {
      setErrorMessage('Failed to disconnect Deriv account.');
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-bg-surface border border-border-color p-5 sm:p-6 rounded-2xl w-full max-w-md shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-color/60 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-accent-primary" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-text-primary">Deriv Account Connection</h2>
              <p className="text-xs text-text-secondary">Official Partner Integration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary p-1 rounded-lg transition-colors cursor-pointer text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Connecting Progress State */}
        {connectStep ? (
          <div className="py-8 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-accent-primary animate-spin mx-auto" />
            <p className="text-sm font-semibold text-text-primary">{connectStep}</p>
            <p className="text-xs text-text-secondary">Redirecting to Deriv secure authentication server...</p>
          </div>
        ) : isLoading ? (
          <div className="py-8 text-center space-y-2">
            <Loader2 className="w-6 h-6 text-accent-primary animate-spin mx-auto" />
            <p className="text-xs text-text-secondary">Checking Deriv connection status...</p>
          </div>
        ) : meta && meta.connected ? (
          /* CONNECTED STATE */
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-bg-main border border-border-color space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-secondary">Connection Status</span>
                <StatusPill label="CONNECTED" type="success" size="sm" pulse={true} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-secondary">Account ID</span>
                <span className="text-xs font-bold font-mono text-text-primary">{meta.derivAccountId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-secondary">Account Currency</span>
                <span className="text-xs font-bold text-text-primary">{meta.currency || 'USD'}</span>
              </div>
              {meta.lastSyncedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-secondary">Last Synchronized</span>
                  <span className="text-[11px] font-mono text-text-secondary">
                    {new Date(meta.lastSyncedAt).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="flex-1 bg-bg-hover hover:bg-bg-elevated text-text-primary py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-border-color disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Account'}</span>
              </button>

              <button
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-rose-500/30 disabled:opacity-50"
              >
                <Unplug className="w-3.5 h-3.5" />
                <span>{isDisconnecting ? 'Disconnecting...' : 'Disconnect Deriv'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* DISCONNECTED / UNCONNECTED STATE */
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-bg-main border border-border-color space-y-2">
              <div className="flex items-center gap-2 text-text-primary text-xs font-bold">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Seamless Account Authorization</span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                Connect your existing Deriv trading account securely without copying tokens or managing passwords.
              </p>
            </div>

            <div className="space-y-2.5">
              {/* PRIMARY CONNECT BUTTON */}
              <button
                onClick={() => handleInitiateOAuth('connect')}
                className="w-full bg-accent-primary hover:opacity-95 text-bg-main py-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2"
              >
                <span>CONNECT DERIV</span>
                <ExternalLink className="w-4 h-4" />
              </button>

              {/* SECONDARY CREATE ACCOUNT BUTTON */}
              <button
                onClick={() => handleInitiateOAuth('signup')}
                className="w-full bg-bg-hover hover:bg-bg-elevated text-text-primary py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 border border-border-color"
              >
                <span>CREATE DERIV ACCOUNT</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="pt-2 border-t border-border-color/60 text-[10px] text-text-secondary/80 text-center">
          Encrypted TLS Protection · Official Partner Integration
        </div>
      </div>
    </div>
  );
};
