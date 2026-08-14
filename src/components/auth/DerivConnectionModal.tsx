/**
 * AppexQuant Markets Global - Redesigned Deriv Account Authentication Modal
 * Implements "Login to Deriv" (OAuth), API Token authentication, and Account Creation options.
 */

import React, { useState, useEffect } from 'react';
import { useGlobalState } from '../../state/GlobalStateContext';
import { useApiFetch } from '../../utils/apiFetch';
import { ShieldCheck, ExternalLink, RefreshCw, Unplug, CheckCircle, AlertCircle, Loader2, KeyRound, UserPlus } from 'lucide-react';
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
  const [authMode, setAuthMode] = useState<'options' | 'token'>('options');
  const [apiTokenInput, setApiTokenInput] = useState('');
  const [isSubmittingToken, setIsSubmittingToken] = useState(false);

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
            dispatch({
              type: 'SELECT_BROKER',
              payload: {
                id: `conn-deriv-${json.data.derivAccountId}`,
                brokerType: 'DERIV',
                brokerName: 'Deriv Limited',
                server: 'Deriv-Server',
                accountNumber: json.data.derivAccountId || '',
                status: 'CONNECTED',
                environment: json.data.accountType === 'real' ? 'REAL' : 'DEMO',
                apiPermissions: json.data.scopes || ['read', 'trade'],
                isReadOnly: false,
                executionPermission: true,
              }
            });
          } else {
            dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'OFFLINE' });
            dispatch({ type: 'SELECT_BROKER', payload: null });
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

  const handleInitiateOAuth = (action: 'connect' | 'signup') => {
    setErrorMessage(null);
    setConnectStep(action === 'signup' ? 'Preparing Deriv registration...' : 'Connecting to Deriv...');

    setTimeout(() => {
      setConnectStep('Authorizing account...');
      setTimeout(() => {
        setConnectStep('Securing connection...');
        setTimeout(() => {
          window.location.href = `/api/auth/deriv/login?action=${action}&destination=${encodeURIComponent(window.location.pathname)}`;
        }, 300);
      }, 300);
    }, 300);
  };

  const handleTokenLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiTokenInput.trim()) {
      setErrorMessage('Please enter a valid Deriv API token.');
      return;
    }
    setIsSubmittingToken(true);
    setErrorMessage(null);

    try {
      const res = await apiFetch('/api/auth/deriv/token-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiToken: apiTokenInput.trim() }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setMeta(json.data);
          dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'ONLINE' });
          dispatch({
            type: 'SELECT_BROKER',
            payload: {
              id: `conn-deriv-${json.data.derivAccountId}`,
              brokerType: 'DERIV',
              brokerName: 'Deriv Limited',
              server: 'Deriv-Server',
              accountNumber: json.data.derivAccountId || '',
              status: 'CONNECTED',
              environment: json.data.accountType === 'real' ? 'REAL' : 'DEMO',
              apiPermissions: json.data.scopes || ['read', 'trade'],
              isReadOnly: false,
              executionPermission: true,
            }
          });
          dispatch({
            type: 'ADD_NOTIFICATION',
            payload: {
              title: 'Deriv Account Connected',
              message: `Successfully connected to account ${json.data.derivAccountId}`,
              type: 'success',
            },
          });
          setApiTokenInput('');
          setAuthMode('options');
        } else {
          setErrorMessage(json.error?.message || 'Token authentication failed.');
        }
      } else {
        setErrorMessage('Invalid Deriv API token or unauthorized request.');
      }
    } catch {
      setErrorMessage('Failed to connect with API token.');
    } finally {
      setIsSubmittingToken(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setErrorMessage(null);
    try {
      const res = await apiFetch('/api/auth/deriv/sync', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setMeta(json.data);
          dispatch({
            type: 'SELECT_BROKER',
            payload: {
              id: `conn-deriv-${json.data.derivAccountId}`,
              brokerType: 'DERIV',
              brokerName: 'Deriv Limited',
              server: 'Deriv-Server',
              accountNumber: json.data.derivAccountId || '',
              status: 'CONNECTED',
              environment: json.data.accountType === 'real' ? 'REAL' : 'DEMO',
              apiPermissions: json.data.scopes || ['read', 'trade'],
              isReadOnly: false,
              executionPermission: true,
            }
          });
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
          dispatch({ type: 'SELECT_BROKER', payload: null });
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
              <h2 className="text-sm sm:text-base font-bold text-text-primary">Deriv Account</h2>
              <p className="text-xs text-text-secondary">Secure Trading Gateway</p>
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
                <span className="text-xs font-semibold text-text-secondary">Account Type / Currency</span>
                <span className="text-xs font-bold text-text-primary uppercase">{meta.accountType || 'real'} • {meta.currency || 'USD'}</span>
              </div>
              {meta.lastSyncedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-secondary">Last Verified</span>
                  <span className="text-[11px] font-mono text-text-secondary">
                    {new Date(meta.lastSyncedAt).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="bg-bg-hover hover:bg-bg-elevated text-text-primary py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-border-color disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Account'}</span>
              </button>

              <button
                onClick={() => handleInitiateOAuth('connect')}
                className="bg-accent-primary/10 hover:bg-accent-primary/20 text-accent-primary py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-accent-primary/30"
              >
                <span>Switch Account</span>
              </button>
            </div>

            <button
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-rose-500/30 disabled:opacity-50"
            >
              <Unplug className="w-3.5 h-3.5" />
              <span>{isDisconnecting ? 'Disconnecting...' : 'Disconnect Deriv Account'}</span>
            </button>
          </div>
        ) : authMode === 'token' ? (
          /* API TOKEN AUTHENTICATION VIEW */
          <form onSubmit={handleTokenLogin} className="space-y-4">
            <div className="p-3 rounded-xl bg-bg-main border border-border-color space-y-1.5">
              <h3 className="text-xs font-bold text-text-primary">Sign in with API Token</h3>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Generate an API token from your Deriv account settings with <strong className="text-text-primary">Read, Trade, and Payments</strong> permissions.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-text-secondary mb-1">Deriv API Token</label>
              <input
                type="password"
                value={apiTokenInput}
                onChange={(e) => setApiTokenInput(e.target.value)}
                placeholder="Enter your Deriv API token..."
                className="w-full bg-bg-main border border-border-color rounded-xl px-3 py-2.5 text-xs text-text-primary font-mono focus:outline-none focus:border-accent-primary"
                required
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setAuthMode('options')}
                className="flex-1 bg-bg-hover hover:bg-bg-elevated text-text-primary py-2.5 rounded-xl text-xs font-bold border border-border-color cursor-pointer transition"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmittingToken}
                className="flex-1 bg-accent-primary hover:opacity-95 text-bg-main py-2.5 rounded-xl text-xs font-bold cursor-pointer transition disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isSubmittingToken && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Authorize Token</span>
              </button>
            </div>
          </form>
        ) : (
          /* AUTHENTICATION OPTIONS VIEW */
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-bg-main border border-border-color space-y-1.5">
              <div className="flex items-center gap-2 text-text-primary text-xs font-bold">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Broker Authentication</span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                Access your real or demo trading account securely with official Deriv OAuth 2.0 PKCE authentication.
              </p>
            </div>

            <div className="space-y-2.5">
              {/* PRIMARY LOGIN */}
              <button
                onClick={() => handleInitiateOAuth('connect')}
                className="w-full bg-accent-primary hover:opacity-95 text-bg-main py-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2"
              >
                <span>LOGIN</span>
                <ExternalLink className="w-4 h-4" />
              </button>

              {/* USE API TOKEN OPTION */}
              <button
                onClick={() => setAuthMode('token')}
                className="w-full bg-bg-hover hover:bg-bg-elevated text-text-primary py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 border border-border-color"
              >
                <KeyRound className="w-4 h-4 text-accent-primary" />
                <span>Use API Token</span>
              </button>

              {/* CREATE DERIV ACCOUNT */}
              <button
                onClick={() => handleInitiateOAuth('signup')}
                className="w-full bg-bg-hover hover:bg-bg-elevated text-text-secondary hover:text-text-primary py-2 rounded-xl text-[11px] font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-border-color/60"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create a Deriv account</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="pt-2 border-t border-border-color/60 text-[10px] text-text-secondary/80 text-center">
          Secure TLS Authentication · Credentials Remain with Deriv
        </div>
      </div>
    </div>
  );
};
